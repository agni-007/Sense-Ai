import express from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { validateBody } from '../middleware/validate.js';
import { classificationQueue } from '../queues/classificationQueue.js';
import { emitToAll } from '../lib/socket.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

const webhookSchema = z.object({
  source: z.enum(['whatsapp', 'email', 'form']),
  from: z.string().min(3, 'From field is too short'),
  name: z.string().min(2, 'Name is too short'),
  message: z.string().min(5, 'Message is too short'),
  email: z.string().email('Invalid email address').optional().nullable()
});

// Middleware to verify webhook signature/secret
const verifyWebhookSecret = (req, res, next) => {
  const secretHeader = req.headers['x-webhook-secret'];
  const configuredSecret = process.env.WEBHOOK_SECRET || 'webhook-secret-key-123';

  if (!secretHeader || secretHeader !== configuredSecret) {
    return res.status(401).json({ error: 'Unauthorized. Invalid webhook secret.' });
  }
  next();
};

// POST /webhooks/inbound — Simulates WhatsApp or Email incoming webhook
router.post('/inbound', verifyWebhookSecret, validateBody(webhookSchema), async (req, res) => {
  const { source, from, name, message, email } = req.validatedBody;

  // Map incoming source to Channel enum in database
  let sourceChannel = 'API';
  let customerEmail = email || null;
  let customerPhone = null;

  if (source === 'whatsapp') {
    sourceChannel = 'WEBHOOK_WHATSAPP';
    customerPhone = from;
  } else if (source === 'email') {
    sourceChannel = 'WEBHOOK_EMAIL';
    customerEmail = from; // 'from' holds email address for email webhooks
  } else if (source === 'form') {
    sourceChannel = 'WEBSITE_FORM';
  }

  try {
    // 1. Save Request to DB as NEW
    const request = await prisma.customerRequest.create({
      data: {
        customerName: name,
        customerEmail,
        customerPhone,
        message,
        sourceChannel,
        status: 'NEW'
      }
    });

    // Create Initial Event
    await prisma.requestEvent.create({
      data: {
        requestId: request.id,
        eventType: 'created',
        newValue: 'NEW'
      }
    });

    // Broadcast new request event via Socket.io
    emitToAll('request:created', {
      id: request.id,
      status: request.status,
      customerName: request.customerName,
      createdAt: request.createdAt
    });

    // 2. Enqueue BullMQ job
    let jobId = null;
    try {
      const job = await classificationQueue.add(
        'classify-request',
        { requestId: request.id },
        { removeOnComplete: true, removeOnFail: false }
      );
      jobId = job.id;

      // 3. Update request status to QUEUED
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
      console.error('[Webhook] Queue insertion failed, request stays as NEW:', queueError);
    }

    return res.status(201).json({
      id: request.id,
      status: jobId ? 'QUEUED' : 'NEW',
      createdAt: request.createdAt,
      jobId
    });
  } catch (error) {
    console.error('[Webhook] Processing error:', error);
    return res.status(500).json({ error: 'Failed to process inbound webhook request' });
  }
});

export default router;
