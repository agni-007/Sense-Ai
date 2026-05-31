import { Worker } from 'bullmq';
import { redis } from '../lib/redis.js';
import { prisma } from '../lib/prisma.js';
import { emitToAll } from '../lib/socket.js';
import { classifyRequest } from '../ai/classifier.js';

const workerName = 'classification';

export const startWorker = () => {
  const worker = new Worker(
    workerName,
    async (job) => {
      const { requestId } = job.data;
      console.log(`🤖 [Worker] Processing classification job ${job.id} for request ${requestId}`);

      try {
        // 1. Fetch request details
        const request = await prisma.customerRequest.findUnique({
          where: { id: requestId }
        });

        if (!request) {
          throw new Error(`CustomerRequest with ID ${requestId} not found`);
        }

        // 2. Update status -> CLASSIFYING
        await prisma.customerRequest.update({
          where: { id: requestId },
          data: { status: 'CLASSIFYING' }
        });

        // Log event
        await prisma.requestEvent.create({
          data: {
            requestId,
            eventType: 'status_changed',
            oldValue: request.status,
            newValue: 'CLASSIFYING'
          }
        });

        // Emit socket event
        emitToAll('request:updated', {
          id: requestId,
          status: 'CLASSIFYING'
        });

        // 3. Call AI Classifier
        const classification = await classifyRequest(request.message, request.sourceChannel);

        // 4. Save AIClassification record in DB
        const aiClassification = await prisma.aIClassification.create({
          data: {
            requestId,
            provider: classification.provider || 'mock',
            category: classification.category,
            priority: classification.priority,
            summary: classification.summary,
            confidence: classification.confidence,
            reason: classification.reason,
            rawOutput: classification,
            retryCount: job.attemptsMade
          }
        });

        // 5. Update request status -> CLASSIFIED and store snapshots
        await prisma.customerRequest.update({
          where: { id: requestId },
          data: {
            status: 'CLASSIFIED',
            categorySnapshot: classification.category,
            prioritySnapshot: classification.priority
          }
        });

        // 6. Log event: classified
        await prisma.requestEvent.create({
          data: {
            requestId,
            eventType: 'classified',
            newValue: `${classification.category}/${classification.priority}`,
            metadata: { classificationId: aiClassification.id }
          }
        });

        // 7. Emit socket request:classified event
        emitToAll('request:classified', {
          id: requestId,
          status: 'CLASSIFIED',
          category: classification.category,
          priority: classification.priority,
          summary: classification.summary,
          provider: classification.provider || 'mock'
        });

        console.log(`✅ [Worker] Successfully classified request ${requestId} as ${classification.category}/${classification.priority}`);
      } catch (error) {
        console.error(`❌ [Worker] Error processing job ${job.id}:`, error);

        // 8. Handle Failures gracefully in DB
        try {
          await prisma.aIClassification.create({
            data: {
              requestId,
              provider: process.env.CLAUDE_API_KEY ? 'claude' : 'mock',
              errorState: error.message || 'Unknown classification error',
              retryCount: job.attemptsMade
            }
          });

          await prisma.customerRequest.update({
            where: { id: requestId },
            data: { status: 'FAILED' }
          });

          await prisma.requestEvent.create({
            data: {
              requestId,
              eventType: 'classification_failed',
              newValue: 'FAILED',
              metadata: { error: error.message }
            }
          });

          emitToAll('request:updated', {
            id: requestId,
            status: 'FAILED'
          });
        } catch (innerError) {
          console.error('CRITICAL: Failed to write error state to database:', innerError);
        }

        // Re-throw to let BullMQ know the job failed
        throw error;
      }
    },
    {
      connection: redis,
      concurrency: 5
    }
  );

  worker.on('active', (job) => {
    console.log(`🏃 [Worker] Job ${job.id} became active`);
  });

  worker.on('completed', (job) => {
    console.log(`🎉 [Worker] Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job, err) => {
    console.error(`🚨 [Worker] Job ${job ? job.id : 'unknown'} failed: ${err.message}`);
  });

  console.log(`🤖 [Worker] BullMQ worker listening on queue '${workerName}' with concurrency 5`);
  return worker;
};

// Auto-start worker if run directly
if (process.argv[1]?.includes('classificationWorker')) {
  startWorker();
}
