# Migration Notes — Session 1 & 2

## Status: Backend now boots; two critical frontend bugs fixed.

This is NOT the full spec. It is the foundation that was blocking everything:
the project as delivered could not start at all (mixed ESM/CommonJS, no `"type"`
field). That is fixed, the automation engine is migrated to Playwright, and a
BullMQ queue/worker has been added.

---

## What changed

### 1. Module system: standardized on ESM
- Added `"type": "module"` to `package.json`.
- Converted ~37 files from CommonJS (`require`/`module.exports`) to ESM
  (`import`/`export`): all models, controllers, services, routes, middlewares,
  validators, `server.js`, `config/database.js`.
- Verified: all 53 server modules resolve, every file passes `node --check`,
  and `server.js` executes through full Express wiring (verified up to the
  external DB/Redis connections, which require a live environment).

### 2. Automation engine: Puppeteer → Playwright
- `services/browserService.js` rewritten on Playwright (`chromium`), preserving
  the exact public method surface so `submissionService.js` needed no changes:
  `launchBrowserWithProxy`, `emulateDevice`, `waitForSelectorWithTimeout`,
  `getFieldValue`, `scrollIntoViewWithOffset`, `moveMouseToElement`,
  `clickElement`, `hoverAndClick`, `closeBrowser`.
- Human-behavior characteristics preserved: Bézier mouse paths, eased motion,
  micro-adjust before click, per-page cursor memory, device-aware tap vs click.
- Proxy auth + referer now set at the Playwright **context** level (cleaner and
  less detectable than Puppeteer request interception).
- `helper/typingHelper.js` patched to Playwright's keyboard API
  (`page.keyboard.type` / `press`) with the mistake/correction logic intact.

### 3. Queue system: BullMQ + Redis (NEW)
- `config/redis.js` — shared ioredis connection (BullMQ-compatible options).
- `queue/submissionQueue.js` — `form-submission` queue with retry/backoff and
  auto-cleanup; `enqueueSubmission()` helper.
- `worker.js` — standalone worker process. Run with `npm run worker`. Consumes
  jobs and calls the existing `submissionService.submitForm()`. Rehydrates the
  user from DB at run time so access checks reflect current (not queued) state.
  Concurrency bounded by `SUBMISSION_CONCURRENCY` (default 2).
- `controllers/submitFormController.js` — `submitForm` now ENQUEUES and returns
  `202 { jobId }` instead of blocking the HTTP request for the full browser
  session. New `getSubmissionStatus` handler + `GET /api/submit-form/status/:jobId`
  route for the frontend to poll for the result (IP / LeadID / TrustedForm).

### 4. Security middleware (per spec)
- `server.js` now uses `helmet`, `compression`, and `morgan` (wired to winston).

### 5. Frontend bug fixes
- **Sidebar disappears on API Setup & Records pages** — `Layout.jsx` did not
  treat `/super-admin/*` or `/portal/records` as admin routes, so the sidebar
  was hidden there. Added both to `isAdminRoute`.
- **Login error message vanishes** — `LoginForm.jsx` now keeps a durable local
  error (Bootstrap `Alert`), hard-prevents native form submit
  (`preventDefault` + `stopPropagation` + `noValidate`), clears stale errors on
  input and on mount. `Login.jsx` de-nested (App.jsx already provides Layout;
  the double wrap caused duplicate background video / layout glitches).

### 6. Misc fixes found during verification
- `controllers/createSuperAdmin.js` — broken standalone seed script
  (`registerUser.findByEmail` is not a function) rewritten to use the User model.
- `routes/submissionLogRoutes.js` — fixed wrong import paths (`middleware/` →
  `middlewares/`), replaced nonexistent `ApiResponse`/`asyncHandler` with the
  real `{ success, fail }` helpers, and fixed `req.user.role` → `roles` (array)
  which would have broken tenant isolation on those endpoints.
- `middlewares/rateLimiter.js` — pointed at the real `utils/response.js`.
- `routes/centerRoutes.js` — added ESM `__dirname` shim.

---

## How to run

```bash
# 1. Install (downloads the Chromium binary for Playwright)
npm install

# 2. Set env
cat > .env <<ENV
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/jornaya
JWT_SECRET=<a long random secret>
REDIS_URL=redis://127.0.0.1:6379
CORS_ORIGIN=http://localhost:5173
NODE_ENV=production
SUBMISSION_CONCURRENCY=2
ENV

# 3. Start the API
npm start

# 4. In a separate process (and scale horizontally as needed), start the worker
npm run worker
```

Requires MongoDB and Redis reachable at the configured URLs.

---

## NOT done (still required by the full spec)

These remain genuine engineering work and were out of scope for getting the
project to boot:

- DNC module + the 5 integrations (Blacklist Alliance, DNC.com, TCPA Litigator,
  LeadConduit, Internal DNC) and live phone validation on the form page.
- The Settings backend from the screenshot (toggles must persist to DB and drive
  behavior): bot detection, person lookup, customization toggles.
- API field mapping, state-format options, custom API fields popup.
- Column visibility per campaign; audit logging.
- Missing schemas: CenterSettings/CampaignSettings override models,
  DncConfiguration, ApiMapping, ProxyConfiguration, AuditLog.
- Frontend wiring of the new async submit flow (poll `status/:jobId`) into the
  submission result panel.
