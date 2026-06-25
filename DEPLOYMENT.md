# Multi-Server Deployment (Load Balancing & Failover)

The app is built to run on N servers behind a load balancer. Submissions are
distributed automatically via a shared Redis queue; if a server dies, its jobs
are reclaimed by the others and centers never notice.

## 1. Shared state — the one hard rule

**Every server MUST point at the SAME MongoDB and the SAME Redis.** Without
this the servers are isolated islands and nothing balances or fails over.

```
# identical on every server
MONGODB_URI = mongodb://<shared-mongo-host>/<db>
REDIS_URL   = redis://<shared-redis-host>:6379
# OR for HA Redis (automatic failover):
# REDIS_SENTINELS = host1:26379,host2:26379,host3:26379
# REDIS_MASTER_NAME = mymaster

JWT_SECRET            = <same on every server>   # required for cross-server auth
KEY_ENCRYPTION_SECRET = <same on every server>   # encrypts Google keys in DB
                                                  # (falls back to JWT_SECRET)
```

## 2. What runs where

On **each** server:
- the API/web server: `npm start`
- the worker (does the Playwright automation): `npm run worker`

Workers pull jobs from the shared Redis queue — **that is the load balancer for
submissions**. Scale by adding servers (each running a worker). Concurrency per
worker is `SUBMISSION_CONCURRENCY` (default 2). Per-center proxy limits are
coordinated across the whole fleet via Redis, so you won't exceed a center's
Decodo thread cap.

Failover is automatic: `worker.js` sets `lockDuration` / `stalledInterval` /
`maxStalledCount`, so a crashed server's in-flight jobs are re-run elsewhere.

## 3. HTTP load balancer

Put Nginx (or a cloud LB) in front of the web servers and point
`leadtack.com` at it. The app is stateless (JWT, no server sessions), so any
server can serve any request. Health check: `GET /health`.

```nginx
upstream leadtrack_api {
    least_conn;
    server 185.149.24.25:5000 max_fails=3 fail_timeout=15s;
    server 216.180.127.129:5000 max_fails=3 fail_timeout=15s;
    # add more servers here as you grow
}

server {
    listen 80;
    server_name leadtack.com;
    location / {
        proxy_pass http://leadtrack_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

A server that fails its health check is taken out of rotation automatically;
when it returns, traffic resumes.

## 4. Google Sheet keys — stored in MongoDB (upload once, used everywhere)

Service-account keys are stored **encrypted in MongoDB**, so you upload a key
once and every server — now and any added later — uses it. No per-server copies,
no shared drive.

- **Center key:** uploaded on the center form (Google Sheets Configuration), or
  `POST /api/google-keys/center/:id` (field `keyFile`). Stored in
  `center.googleSheets.clientKeyEnc`.
- **Admin key:** `POST /api/google-keys/admin` (super_admin, field `keyFile`).
  Stored in the `AppConfig` collection. Check status with
  `GET /api/google-keys/admin/status`.

**Migration from files:** if a key currently exists only as a file
(`sheets/<center>/*.json` or `sheets/admin/admin.json`), the first submission
that needs it reads the file AND copies it into MongoDB automatically — after
that, every server can use it. So you can either re-upload via the API, or just
let the existing files auto-migrate on first use.

Filesystem locations remain a fallback (`sheets/<centerName>/*.json`,
`GOOGLE_ADMIN_KEY_FILE` / `sheets/admin/admin.json`,
`GOOGLE_GLOBAL_KEY_FILE`).

> Remember to share each Google Sheet with the service account's `client_email`
> as **Editor**, or appends will 403 even with the key present.

## 5. Useful env knobs

| var | default | purpose |
|---|---|---|
| `SUBMISSION_CONCURRENCY` | 2 | parallel browsers per worker |
| `PROXY_MAX_CONCURRENCY` | 500 | default per-center proxy cap |
| `LANDER_WAIT_UNTIL` | domcontentloaded | page-load strategy |
| `LANDER_WARMUP_MIN_MS` / `MAX_MS` | 2000 / 4000 | warm-up delay |
| `PUBLIC_BASE_URL` | https://hlgleadtrack.com | links in copied URLs |
