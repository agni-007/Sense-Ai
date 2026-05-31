import express from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { verifyJWT } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { classificationQueue } from '../queues/classificationQueue.js';
import { emitToAll } from '../lib/socket.js';

const router = express.Router();

// Apply JWT verification middleware to all routes in this router
router.use(verifyJWT);

// Zod schemas for input validation
const createRequestSchema = z.object({
  customerName: z.string().min(2, 'Customer name is required'),
  customerEmail: z.string().email('Invalid email address').optional().nullable(),
  customerPhone: z.string().min(5, 'Phone number is too short').optional().nullable(),
  message: z.string().min(10, 'Message must be at least 10 characters'),
  sourceChannel: z.enum(['API', 'WEBHOOK_WHATSAPP', 'WEBHOOK_EMAIL', 'WEBSITE_FORM']).default('API'),
  idempotencyKey: z.string().optional().nullable()
});

const updateStatusSchema = z.object({
  status: z.enum([
    'NEW',
    'QUEUED',
    'CLASSIFYING',
    'CLASSIFIED',
    'IN_PROGRESS',
    'RESOLVED',
    'SPAM',
    'FAILED'
  ])
});

const createNoteSchema = z.object({
  body: z.string().min(2, 'Note content must be at least 2 characters')
});

// POST /requests — Create a new customer request (Sync) and enqueue it (Async)
router.post('/', validateBody(createRequestSchema), async (req, res) => {
  const { customerName, customerEmail, customerPhone, message, sourceChannel, idempotencyKey } = req.validatedBody;

  try {
    // 1. Idempotency Check
    if (idempotencyKey) {
      const existingRequest = await prisma.customerRequest.findUnique({
        where: { idempotencyKey }
      });
      if (existingRequest) {
        return res.status(200).json({
          id: existingRequest.id,
          status: existingRequest.status,
          createdAt: existingRequest.createdAt,
          message: 'Duplicate request prevented via idempotency key'
        });
      }
    }

    // 2. Save Request to DB as NEW
    const request = await prisma.customerRequest.create({
      data: {
        customerName,
        customerEmail,
        customerPhone,
        message,
        sourceChannel,
        idempotencyKey,
        status: 'NEW'
      }
    });

    // Create Initial Event
    await prisma.requestEvent.create({
      data: {
        requestId: request.id,
        eventType: 'created',
        newValue: 'NEW',
        actorId: req.user.id
      }
    });

    // Broadcast new request event via Socket.io
    emitToAll('request:created', {
      id: request.id,
      status: request.status,
      customerName: request.customerName,
      createdAt: request.createdAt
    });

    // 3. Enqueue BullMQ job
    let jobId = null;
    try {
      const job = await classificationQueue.add(
        'classify-request',
        { requestId: request.id },
        { removeOnComplete: true, removeOnFail: false }
      );
      jobId = job.id;

      // 4. Update request status to QUEUED
      await prisma.customerRequest.update({
        where: { id: request.id },
        data: { status: 'QUEUED' }
      });

      // Update Event
      await prisma.requestEvent.create({
        data: {
          requestId: request.id,
          eventType: 'status_changed',
          oldValue: 'NEW',
          newValue: 'QUEUED'
        }
      });

      // Emit status updated event
      emitToAll('request:updated', {
        id: request.id,
        status: 'QUEUED'
      });
    } catch (queueError) {
      console.error('Queue insertion failed, request stays as NEW:', queueError);
    }

    return res.status(201).json({
      id: request.id,
      status: jobId ? 'QUEUED' : 'NEW',
      createdAt: request.createdAt,
      jobId
    });
  } catch (error) {
    console.error('Create request error:', error);
    return res.status(500).json({ error: 'Failed to create customer request' });
  }
});

// GET /requests — Paginated list with filters and search query
router.get('/', async (req, res) => {
  const status = req.query.status;
  const priority = req.query.priority;
  const category = req.query.category;
  const search = req.query.q;
  
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  try {
    const where = {};

    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (priority && priority !== 'ALL') {
      where.prioritySnapshot = priority;
    }
    if (category && category !== 'ALL') {
      where.categorySnapshot = category;
    }

    if (search) {
      where.OR = [
        { customerName: { contains: search, mode: 'insensitive' } },
        { message: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [total, requests] = await prisma.$transaction([
      prisma.customerRequest.count({ where }),
      prisma.customerRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return res.status(200).json({
      data: requests,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Fetch requests error:', error);
    return res.status(500).json({ error: 'Failed to fetch customer requests' });
  }
});

// GET /requests/:id — Full detail with classifications, notes, and event timelines
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const request = await prisma.customerRequest.findUnique({
      where: { id },
      include: {
        classifications: {
          orderBy: { createdAt: 'desc' }
        },
        notes: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        events: {
          include: {
            actor: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!request) {
      return res.status(404).json({ error: 'Customer request not found' });
    }

    return res.status(200).json(request);
  } catch (error) {
    console.error('Fetch request details error:', error);
    return res.status(500).json({ error: 'Failed to fetch request details' });
  }
});

// PATCH /requests/:id/status — Update request status manually by agent
router.patch('/:id/status', validateBody(updateStatusSchema), async (req, res) => {
  const { id } = req.params;
  const { status } = req.validatedBody;

  try {
    const request = await prisma.customerRequest.findUnique({
      where: { id }
    });

    if (!request) {
      return res.status(404).json({ error: 'Customer request not found' });
    }

    const updatedRequest = await prisma.customerRequest.update({
      where: { id },
      data: { status }
    });

    // Log the event
    await prisma.requestEvent.create({
      data: {
        requestId: id,
        eventType: 'status_changed',
        oldValue: request.status,
        newValue: status,
        actorId: req.user.id
      }
    });

    // Broadcast update via Socket.io
    emitToAll('request:updated', {
      id,
      status
    });

    return res.status(200).json(updatedRequest);
  } catch (error) {
    console.error('Update status error:', error);
    return res.status(500).json({ error: 'Failed to update request status' });
  }
});

// POST /requests/:id/notes — Add internal note to a customer request
router.post('/:id/notes', validateBody(createNoteSchema), async (req, res) => {
  const { id } = req.params;
  const { body } = req.validatedBody;

  try {
    const request = await prisma.customerRequest.findUnique({
      where: { id }
    });

    if (!request) {
      return res.status(404).json({ error: 'Customer request not found' });
    }

    const note = await prisma.internalNote.create({
      data: {
        requestId: id,
        authorId: req.user.id,
        body
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    // Log the event
    await prisma.requestEvent.create({
      data: {
        requestId: id,
        eventType: 'note_added',
        actorId: req.user.id
      }
    });

    // Broadcast event via Socket.io
    emitToAll('note:added', {
      requestId: id,
      note
    });

    return res.status(201).json(note);
  } catch (error) {
    console.error('Add note error:', error);
    return res.status(500).json({ error: 'Failed to add internal note' });
  }
});

// POST /requests/:id/retry-classification — Enqueue job to retry AI classification manually
router.post('/:id/retry-classification', async (req, res) => {
  const { id } = req.params;

  try {
    const request = await prisma.customerRequest.findUnique({
      where: { id }
    });

    if (!request) {
      return res.status(404).json({ error: 'Customer request not found' });
    }

    // Set request status back to QUEUED
    await prisma.customerRequest.update({
      where: { id },
      data: { status: 'QUEUED' }
    });

    // Add job to classification queue
    const job = await classificationQueue.add(
      'classify-request',
      { requestId: id },
      { removeOnComplete: true, removeOnFail: false }
    );

    // Log the event
    await prisma.requestEvent.create({
      data: {
        requestId: id,
        eventType: 'retry',
        newValue: 'QUEUED',
        actorId: req.user.id
      }
    });

    // Broadcast status change
    emitToAll('request:updated', {
      id,
      status: 'QUEUED'
    });

    return res.status(202).json({
      jobId: job.id,
      message: 'Retry queued'
    });
  } catch (error) {
    console.error('Retry classification error:', error);
    return res.status(500).json({ error: 'Failed to retry classification' });
  }
});

// DELETE /requests — Clear all customer requests, classifications, notes, and events (Admin Only)
router.delete('/', async (req, res) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden. Only administrators can clear the pipeline.' });
  }

  try {
    await prisma.$transaction([
      prisma.internalNote.deleteMany({}),
      prisma.requestEvent.deleteMany({}),
      prisma.aIClassification.deleteMany({}),
      prisma.customerRequest.deleteMany({})
    ]);

    // Broadcast live to all connected WebSocket clients
    emitToAll('requests:cleared', { clearedAt: new Date().toISOString() });

    return res.status(200).json({ message: 'All customer requests cleared successfully' });
  } catch (error) {
    console.error('Clear all requests error:', error);
    return res.status(500).json({ error: 'Failed to clear customer requests' });
  }
});

export default router;
