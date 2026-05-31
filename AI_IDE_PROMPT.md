# 🤖 AI IDE PROMPT — READ THIS FIRST
## Project: Cognifyr AI Workflow Ops Backend
### Instructions for Antigravity / AI-Driven IDE

---

You are building a production-quality full-stack web application from scratch.

**A file called `SRS.md` is in this directory. Read it completely before writing any code.** It contains the full tech stack, database schema, API spec, UI spec, component structure, environment variables, and implementation order. Follow it precisely.

---

## YOUR PRIME DIRECTIVES

1. **Read SRS.md first** — every architectural decision is there. Do not deviate without reason.
2. **Build in the exact order listed in Section 15 of SRS.md.** Do not skip ahead.
3. **Ask for permission only before:** switching major technologies, changing the database schema after migration, adding paid services, or changing the deployment target.
4. **Do NOT ask permission for:** file/folder creation, naming conventions, writing tests, adding comments, creating seed data, choosing variable names, adding helper functions, or any other minor code decision.
5. **Use mock AI first.** Implement `mockClassifier.js` before touching the Claude API. The mock must return the same JSON shape as the real classifier.
6. **Never commit secrets.** Always use `.env` files. Always add `.env` to `.gitignore`. Always create `.env.example` with placeholder values.
7. **Push to GitHub** at the end of each major section (after auth, after queue, after frontend, after deployment). Repo: `https://github.com/agni-007/ai-workflow.git`

---

## TECH STACK SUMMARY (from SRS.md)

| Layer | Tool |
|-------|------|
| Backend | Node.js 20 + Express.js |
| Database | PostgreSQL via Supabase + Prisma ORM |
| Queue | BullMQ + Upstash Redis |
| Auth | JWT + bcrypt |
| Realtime | Socket.io |
| AI | Claude API (`claude-sonnet-4-20250514`) + mock fallback |
| Validation | Zod |
| Frontend | React 18 + Vite + Tailwind CSS |
| State/Data | TanStack Query (React Query) |
| Deploy | Render (backend) + Vercel (frontend) |

---

## STEP-BY-STEP EXECUTION PLAN

Work through these steps in order. Complete each fully before moving to the next.

### STEP 1 — Repo & Monorepo Scaffold
- Init git repo, connect to `https://github.com/agni-007/ai-workflow.git`
- Create `backend/` and `frontend/` folders
- Create root `.gitignore` covering `node_modules`, `.env`, `dist`, `.DS_Store`
- Create root `README.md` placeholder

### STEP 2 — Backend: Base Setup
- `cd backend && npm init -y`
- Install: `express cors dotenv helmet morgan`
- Install: `prisma @prisma/client`
- Install: `jsonwebtoken bcrypt zod express-rate-limit`
- Install: `bullmq ioredis`
- Install: `socket.io`
- Install: `@anthropic-ai/sdk`
- Create `src/server.js` with Express app, CORS (allow frontend URL), JSON body parser, `/health` endpoint
- Set up `prisma/schema.prisma` with EXACT schema from SRS.md Section 4
- Create `src/lib/prisma.js` singleton
- Create `.env.example` and `.env` (to be filled by user)

### STEP 3 — Database Migration
- Run `npx prisma migrate dev --name init`
- Run `npx prisma generate`

### STEP 4 — Auth Routes
- Create `src/middleware/auth.js` — verifyJWT middleware
- Create `src/routes/auth.js`:
  - `POST /auth/login` — find user, compare bcrypt, return JWT
  - `POST /auth/register` — hash password, create user (admin-only in prod)
- Mount in server.js

### STEP 5 — Request Routes (CRUD)
- Create `src/routes/requests.js`:
  - `POST /requests` — validate body (Zod), save to DB, enqueue to BullMQ, return 201
  - `GET /requests` — paginated list with filters (status, priority, category)
  - `GET /requests/:id` — full detail with classifications, notes, events
  - `PATCH /requests/:id/status` — update status, log event, emit socket
  - `POST /requests/:id/notes` — add note, log event, emit socket
  - `POST /requests/:id/retry-classification` — re-enqueue job

### STEP 6 — Redis + BullMQ Queue
- Create `src/lib/redis.js` — ioredis connection from REDIS_URL env
- Create `src/queues/classificationQueue.js` — BullMQ Queue named 'classification'
- Update `POST /requests` to add job to queue after saving

### STEP 7 — Mock AI Classifier
- Create `src/ai/mockClassifier.js`:
  - Keyword matching: if message contains "payment|billing|charge" → category=support, priority=HIGH
  - if contains "buy|pricing|demo|trial" → category=sales, priority=MEDIUM
  - if contains "urgent|asap|emergency|broken" → category=urgent, priority=HIGH
  - if contains "http|click here|win|prize" → category=spam, priority=LOW
  - default → category=other, priority=MEDIUM
  - Always returns: `{ category, priority, summary, confidence, reason }`
  - Add 500ms artificial delay to simulate async processing

### STEP 8 — BullMQ Classification Worker
- Create `src/workers/classificationWorker.js`:
  1. Pick up job with `requestId`
  2. Update request status → CLASSIFYING, emit `request:updated` socket event
  3. Call `mockClassifier(request)` (or real Claude if key exists)
  4. Create `AIClassification` record in DB
  5. Update request: `status=CLASSIFIED`, `categorySnapshot`, `prioritySnapshot`
  6. Create `RequestEvent` record: `eventType='classified'`
  7. Emit `request:classified` socket event with classification data
  8. On error: save error to AIClassification, set status=FAILED, emit event

### STEP 9 — Socket.io Server
- Create `src/lib/socket.js` — Socket.io server attached to HTTP server
- Add JWT auth middleware on Socket.io connection
- Export `emitToAll(event, data)` helper
- Use in worker and routes

### STEP 10 — Real Claude AI Integration
- Create `src/ai/classifier.js`:
  - Check if `CLAUDE_API_KEY` env var exists; if not, fall back to mockClassifier
  - Call `anthropic.messages.create()` with the system prompt from SRS.md Section 6
  - Parse JSON from response.content[0].text
  - Wrap in try/catch; on parse error fall back to mockClassifier

### STEP 11 — Webhook Endpoint
- Create `src/routes/webhooks.js`:
  - `POST /webhooks/inbound`
  - Validate `x-webhook-secret` header against env var
  - Map webhook body to CustomerRequest fields
  - Reuse the same create+enqueue logic as POST /requests

### STEP 12 — Rate Limiting & Validation
- Add `express-rate-limit` middleware:
  - 100 req/15min on `/auth` routes
  - 500 req/15min on all other routes
- Add Zod validation schemas for all route inputs

### STEP 13 — Seed Data
- Create `prisma/seed.js`:
  - Create admin user: email=`admin@123.com`, password=`admin123`, role=ADMIN
  - Create agent user: email=`agent@cognifyr.co`, password=`Agent123!`, role=AGENT
  - Create 10 sample requests with varied statuses, classifications, and notes
- Add to package.json: `"prisma": { "seed": "node prisma/seed.js" }`
- Run: `npx prisma db seed`

### STEP 14 — Frontend Scaffold
- `cd frontend && npm create vite@latest . -- --template react`
- Install: `tailwindcss postcss autoprefixer`
- Install: `axios @tanstack/react-query react-router-dom socket.io-client`
- Configure Tailwind
- Create `src/lib/api.js` — Axios instance with baseURL and auth interceptor

### STEP 15 — Login Page
- Create `src/pages/Login.jsx`:
  - Email + password form
  - On submit: POST `/auth/login`, store token in localStorage, redirect to `/`
  - Show error message on failed login

### STEP 16 — Request List Page (Dashboard)
- Create `src/pages/RequestList.jsx`:
  - Fetch GET `/requests` with filters using React Query
  - FilterBar component: status, priority, category dropdowns
  - Map to RequestCard components
  - Pagination controls

- Create `src/components/RequestCard.jsx`:
  - Customer name, message preview, status/priority/category badges, time ago
  - Color coding: HIGH=red border, MEDIUM=orange, LOW=grey; FAILED=red bg

- Create `src/components/StatusBadge.jsx` — colored pill badges

- Create `src/components/FilterBar.jsx`

### STEP 17 — Socket.io Client + Realtime
- Create `src/hooks/useSocket.js`:
  - Connect to backend Socket.io with JWT token
  - Return socket instance
  - Handle disconnect/reconnect
- In RequestList: listen for `request:created` → prepend to list
- In RequestList: listen for `request:updated` / `request:classified` → update matching card in-place
- Create `src/components/LiveIndicator.jsx` — pulsing green dot when connected, grey when not

### STEP 18 — Request Detail Page
- Create `src/pages/RequestDetail.jsx`:
  - Fetch GET `/requests/:id`
  - Show all sections from SRS.md Section 9
  - Status update dropdown + button → PATCH `/requests/:id/status`
  - Add note form → POST `/requests/:id/notes`
  - Retry button → POST `/requests/:id/retry-classification`
  - Listen for `request:classified` on this requestId → update AI card live

- Create `src/components/EventTimeline.jsx`:
  - Vertical list of events, newest first
  - Icons: ⬆️ for status change, 🤖 for classified, 📝 for note added

- Create `src/components/NotesList.jsx`

### STEP 19 — Deploy Backend to Render
- Create `backend/render.yaml` or use Render web dashboard settings
- Ensure `npm run start` script runs the server
- Set all environment variables in Render dashboard
- Verify `/health` endpoint returns 200

### STEP 20 — Deploy Frontend to Vercel
- Push frontend to same GitHub repo
- Connect repo to Vercel
- Set `VITE_API_URL` and `VITE_SOCKET_URL` to Render backend URL
- Verify login and realtime work

### STEP 21 — Documentation
- Fill in `README.md` with all sections from SRS.md Section 13
- Create `ARCHITECTURE.md` with Mermaid diagram from SRS.md Section 14
- Create `API.md` with full endpoint documentation

### STEP 22 — Final GitHub Push
- Clean up any debug logs
- Verify `.env` is NOT committed
- Verify `.env.example` IS committed with placeholder values
- Push all changes to `https://github.com/agni-007/ai-workflow.git`

---

## IMPORTANT RULES FOR CODE QUALITY

- Use `async/await` everywhere, no raw `.then()` chains
- All route handlers wrapped in try/catch with proper error responses: `{ error: "message" }`
- HTTP status codes must be correct: 200, 201, 400, 401, 403, 404, 422, 500
- Prisma client is a singleton (import from `lib/prisma.js`)
- Redis client is a singleton (import from `lib/redis.js`)
- Socket.io server is a singleton (import from `lib/socket.js`)
- Worker runs in a separate process or at least separate file from main server
- Never expose passwordHash in any API response (use Prisma `select` to exclude it)
- All environment variables accessed via `process.env.VAR_NAME` with fallback or validation at startup

---

## WHAT "DONE" LOOKS LIKE

- [ ] Admin can log in and see the dashboard
- [ ] Submit a new request via POST /requests and it appears on dashboard immediately
- [ ] AI classification happens in background (visible status: QUEUED → CLASSIFYING → CLASSIFIED)
- [ ] Dashboard updates in realtime without page refresh
- [ ] Admin can filter by status, priority, category
- [ ] Admin can click a request to see full detail, AI output, notes, timeline
- [ ] Admin can add notes and update status
- [ ] Webhook endpoint accepts simulated WhatsApp messages
- [ ] App is deployed and accessible via public URLs
- [ ] README explains setup, architecture, and tradeoffs
- [ ] GitHub repo has clean commit history with meaningful messages

---

## GIT COMMIT CONVENTION

Use this format: `feat(scope): description`

Examples:
- `feat(backend): add Express server and Prisma setup`
- `feat(auth): implement JWT login and middleware`
- `feat(queue): add BullMQ classification queue and worker`
- `feat(ai): integrate Claude API with mock fallback`
- `feat(socket): add Socket.io realtime events`
- `feat(frontend): add login page and request list dashboard`
- `feat(frontend): add realtime Socket.io client`
- `feat(deploy): configure Render and Vercel deployment`
- `docs: add README, ARCHITECTURE, and API documentation`

---

*This prompt was generated from SRS.md. If there is a conflict, SRS.md is the source of truth.*
