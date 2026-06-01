# Backend REST API Specification

This document provides detailed information on all authentication, customer requests, internal notes, and webhook endpoints available in the Sense AI Backend.

---

## 1. Authentication Endpoints

### POST /auth/register
Register a new system operator user (Admin or Agent).
> [!NOTE]
> In production environments (`NODE_ENV === 'production'`), registration is locked after the first user is created. Subsequent registrations require an Admin token passed in the Authorization header.

* **URL:** `/auth/register`
* **Method:** `POST`
* **Headers:** `Content-Type: application/json`
* **Request Body:**
```json
{
  "email": "agent@senseai.co",
  "password": "Password123!",
  "name": "Agent User",
  "role": "AGENT" // ADMIN or AGENT (Defaults to AGENT)
}
```
* **Success Response (201 Created):**
```json
{
  "id": "clxyz123",
  "email": "agent@senseai.co",
  "name": "Agent User",
  "role": "AGENT",
  "createdAt": "2026-05-31T08:00:00.000Z"
}
```

### POST /auth/login
Log in to receive a JWT authentication token.
* **URL:** `/auth/login`
* **Method:** `POST`
* **Headers:** `Content-Type: application/json`
* **Request Body:**
```json
{
  "email": "admin@123.com",
  "password": "admin123"
}
```
* **Success Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "clxyz456",
    "email": "admin@123.com",
    "name": "Admin User",
    "role": "ADMIN",
    "createdAt": "2026-05-31T08:00:00.000Z"
  }
}
```

---

## 2. Customer Requests (Pipeline) Endpoints
> [!IMPORTANT]
> All endpoints below require the `Authorization` header containing a valid JWT token:
> `Authorization: Bearer <JWT_TOKEN>`

### POST /requests
Create a new customer request ticket manually and enqueue it for AI classification.
* **URL:** `/requests`
* **Method:** `POST`
* **Request Body:**
```json
{
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "customerPhone": "+15550199",
  "message": "I was charged twice for my subscription this month. Please issue a refund.",
  "sourceChannel": "WEBSITE_FORM", // API, WEBHOOK_WHATSAPP, WEBHOOK_EMAIL, WEBSITE_FORM
  "idempotencyKey": "unique-idempotency-uuid" // Optional: prevents duplicates
}
```
* **Success Response (201 Created):**
```json
{
  "id": "clxyz789",
  "status": "QUEUED",
  "createdAt": "2026-05-31T08:05:00.000Z",
  "jobId": "1" // BullMQ background job ID
}
```

### GET /requests
Fetch a paginated list of requests with active search and snapshot filters.
* **URL:** `/requests`
* **Method:** `GET`
* **Query Parameters:**
  * `status`: Filters by request status (`ALL`, `NEW`, `QUEUED`, `CLASSIFYING`, `CLASSIFIED`, `IN_PROGRESS`, `RESOLVED`, `SPAM`, `FAILED`)
  * `priority`: Filters by classification priority snapshot (`ALL`, `HIGH`, `MEDIUM`, `LOW`)
  * `category`: Filters by classification category snapshot (`ALL`, `support`, `sales`, `urgent`, `spam`, `other`)
  * `q`: Text query matching customer name or message keywords (case-insensitive)
  * `page`: Page index (default: `1`)
  * `limit`: Page count size (default: `20` in backend, `12` in frontend grid)
* **Success Response (200 OK):**
```json
{
  "data": [
    {
      "id": "clxyz789",
      "customerName": "John Doe",
      "customerEmail": "john@example.com",
      "message": "I was charged twice...",
      "status": "CLASSIFIED",
      "categorySnapshot": "support",
      "prioritySnapshot": "HIGH",
      "createdAt": "2026-05-31T08:05:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "pages": 1
}
```

### GET /requests/:id
Fetch a deep-dive details card for a specific customer request including classifications, internal operator notes, and chronological logs.
* **URL:** `/requests/:id`
* **Method:** `GET`
* **Success Response (200 OK):**
```json
{
  "id": "clxyz789",
  "customerName": "John Doe",
  "message": "I was charged twice...",
  "status": "CLASSIFIED",
  "classifications": [
    {
      "id": "cai123",
      "provider": "mock",
      "category": "support",
      "priority": "HIGH",
      "summary": "Double charge on subscription.",
      "confidence": 0.94,
      "reason": "Charged twice keyword indicators found.",
      "createdAt": "2026-05-31T08:05:10.000Z"
    }
  ],
  "notes": [
    {
      "id": "cn123",
      "body": "Spoke to customer. Issued stripe refund.",
      "author": { "name": "Agent User", "role": "AGENT" },
      "createdAt": "2026-05-31T08:15:00.000Z"
    }
  ],
  "events": [
    {
      "id": "ev123",
      "eventType": "status_changed",
      "oldValue": "CLASSIFIED",
      "newValue": "IN_PROGRESS",
      "actor": { "name": "Agent User" },
      "createdAt": "2026-05-31T08:14:00.000Z"
    }
  ]
}
```

### PATCH /requests/:id/status
Manually triage and update request pipeline status.
* **URL:** `/requests/:id/status`
* **Method:** `PATCH`
* **Request Body:**
```json
{
  "status": "IN_PROGRESS"
}
```
* **Success Response (200 OK):**
```json
{
  "id": "clxyz789",
  "status": "IN_PROGRESS"
}
```

### POST /requests/:id/notes
Post an internal operator note to a customer request.
* **URL:** `/requests/:id/notes`
* **Method:** `POST`
* **Request Body:**
```json
{
  "body": "Customer billing refund verified on Stripe Dashboard."
}
```
* **Success Response (201 Created):**
```json
{
  "id": "cn456",
  "requestId": "clxyz789",
  "authorId": "clxyz456",
  "body": "Customer billing refund verified on Stripe Dashboard.",
  "createdAt": "2026-05-31T08:20:00.000Z",
  "author": {
    "id": "clxyz456",
    "name": "Admin User",
    "role": "ADMIN"
  }
}
```

### POST /requests/:id/retry-classification
Manually trigger a retry classification job if the background worker has previously transitioned status to `FAILED`.
* **URL:** `/requests/:id/retry-classification`
* **Method:** `POST`
* **Success Response (202 Accepted):**
```json
{
  "jobId": "12",
  "message": "Retry queued"
}
```

---

## 3. Webhook Endpoints

### POST /webhooks/inbound
Process raw incoming webhooks (simulating external integrations like WhatsApp or Email triggers).
* **URL:** `/webhooks/inbound`
* **Method:** `POST`
* **Headers:**
  * `x-webhook-secret`: Must match the configured `WEBHOOK_SECRET` environment variable.
* **Request Body (WhatsApp simulation example):**
```json
{
  "source": "whatsapp",
  "from": "+919876543210",
  "name": "Priya Sharma",
  "message": "Hi, I need help with my billing order #1234"
}
```
* **Success Response (201 Created):**
```json
{
  "id": "clxyz999",
  "status": "QUEUED",
  "createdAt": "2026-05-31T08:25:00.000Z",
  "jobId": "3"
}
```
