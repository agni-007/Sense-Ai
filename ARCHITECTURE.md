# System Architecture - Sense AI Workflow Ops

The system is designed with an asynchronous processing model to ensure immediate client responses, offloading heavy processing (AI classification) to a background queue, and notifying the client via real-time WebSocket connections when completion occurs.

## System Architecture Diagram

```mermaid
flowchart TD
    Customer([Customer / Inbound Webhook]) -->|POST /requests or /webhooks/inbound| API[Express API Server]
    API -->|1. Save immediately status: NEW| DB[(PostgreSQL\nSupabase)]
    API -->|2. Enqueue job status: QUEUED| Queue[BullMQ Queue\nUpstash Redis]
    API -->|3. 201 Created Response| Customer
    
    Queue -->|Process background job| Worker[Classification Worker]
    Worker -->|4. Update status: CLASSIFYING| DB
    Worker -->|Broadcast status: CLASSIFYING| Socket[Socket.io Server]
    Worker -->|5. Trigger analysis| AI[Gemini 3.5 / Mock Classifier]
    
    AI -->|Return JSON classification| Worker
    Worker -->|6. Save AIClassification + status: CLASSIFIED| DB
    Worker -->|7. Log RequestEvent| DB
    Worker -->|8. Emit classification details| Socket
    
    Socket -->|Realtime broadcast request:classified| AdminUI[React Admin Dashboard]
    AdminUI -->|GET/PATCH/POST| API
    API -->|Auth + Data query| AdminUI
```

## Architectural Decoupling & Benefits

1. **Immediate response time:** The customer or inbound Webhook (like WhatsApp) never blocks on heavy third-party AI execution. The API responds with `201 Created` within milliseconds, ensuring we don't encounter connection timeouts under load.
2. **Robust background worker queue:** BullMQ manages background processes using Upstash Redis. If the Gemini API key is exhausted or has service disruptions, jobs fail and trigger automatic exponential backoff retries without blocking active dashboard sessions.
3. **Database singleton models:** Prisma client is instantiated once across routes, ensuring connection pooling is managed properly when connecting to cloud-hosted databases (Supabase).
4. **Realtime Socket.io state synchronization:** When the background worker successfully classifies a request, it updates the database and immediately broadcasts the result via Socket.io. The React dashboard updates the card and detail page in-place, eliminating manual screen refreshes.
