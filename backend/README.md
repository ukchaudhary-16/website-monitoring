# DePIN Monitor — Backend (Phase 2)

Express + MongoDB API, cron job scheduler, and on-chain settlement worker.

## Setup

```bash
cd backend
npm install
cp .env.example .env   # fill in MONGODB_URI, JWT_SECRET, chain vars
npm run seed           # optional demo data (demo@example.com / password123)
npm run dev
```

Requires a local MongoDB (`mongodb://127.0.0.1:27017`) and, for on-chain mirroring,
a running Hardhat node with contracts deployed (`../scripts/deploy.js`).

## API

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | – | create account (defaults to free plan) |
| POST | `/api/auth/login` | – | get JWT |
| GET  | `/api/auth/me` | user | current user + plan limits |
| GET  | `/api/auth/plans` | – | plan catalog (mocked pricing) |
| POST | `/api/auth/subscribe` | user | **mock** plan change, no payment |
| GET/POST | `/api/websites` | user | list / add monitored site (plan-gated) |
| GET/PATCH/DELETE | `/api/websites/:id` | user | manage a site |
| GET | `/api/websites/:id/stats` | user | uptime %, response series, incidents, per-region |
| POST | `/api/nodes/register` | – | node mirrors itself (checks on-chain stake) |
| POST | `/api/nodes/heartbeat` | – | node liveness ping |
| GET | `/api/nodes/jobs?walletAddress=` | – | poll assigned jobs for node's region |
| GET | `/api/nodes/:wallet` | – | node dashboard data |
| POST | `/api/results` | – | submit signed check result (sig verified) |
| GET | `/api/public/network` | – | world-map data: node density per region |

## Models

`User`, `Website`, `Node`, `Job`, `Result`, `Subscription` — see `src/models/`.

## Workers

- **scheduler** (`src/services/scheduler.js`) — every minute, creates a `Job` per
  website per region when the last one is older than `intervalSeconds`. Mirrors to
  `MonitorRegistry.createJob` when a signer is configured.
- **settlementWorker** (`src/services/settlementWorker.js`) — every 2 min, settles
  jobs with ≥ `CONSENSUS_MIN_SUBMISSIONS` results (or an expired window). Computes
  majority off-chain, updates site status, flags outlier results, and calls
  `settleConsensus` on-chain when the job was mirrored.

Disable either with `ENABLE_SCHEDULER=false` / `ENABLE_SETTLEMENT_WORKER=false`.

## Result signature scheme

Node signs `solidityPackedKeccak256(["string","uint8","uint16","uint32","bool"],
[jobId, status(1|0), httpStatus, responseTimeMs, renderOk])` as an EIP-191
personal-message over the raw 32 bytes. Backend recovers the signer and requires
it to equal `walletAddress`.
