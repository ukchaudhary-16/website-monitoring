# Build Progress Tracker

> Resume-from-here checklist. If context is lost, read this + `SETUP.md` + `CLAUDE.md`
> and continue from the first unchecked item. Update this file at the end of every
> work session.

**Last updated:** 2026-09-02
**Current phase:** ALL PHASES CODE-COMPLETE. Remaining work = run against live infra +
push the three cloud deploys (needs your accounts). See unchecked boxes in Phase 6 / §"live runs".
**Toolchain note:** Hardhat 2 + OpenZeppelin v5, CommonJS (not the original HH3 scaffold).

---

## Phase 1 — Smart Contracts ✅ DONE

- [x] `MonitorToken.sol` — ERC-20 `MON`, mint restricted to registry, burn for slashing
- [x] `MonitorRegistry.sol` — register/stake, submitResult, settleConsensus (majority, ≥3),
      deactivate + withdrawStake (7-day unbonding), owner setters
- [x] Hardhat test suite — **28 passing** (`npm test`)
- [x] Deploy script `scripts/deploy.js` → writes `deployments/<network>.json`
- [x] npm scripts: `compile` / `test` / `node` / `deploy:local` / `deploy:mumbai` / `demo:setup`
- [x] `test/E2E.integration.test.js` added in Phase 6 — 32 tests total
- [x] Config targets Polygon Amoy (80002) by default (Mumbai deprecated)

## Phase 2 — Backend Core ✅ DONE  (`backend/`)

- [x] Express scaffold + Mongoose models: User, Website, Node, Job, Result, Subscription
- [x] JWT auth (`/api/auth` register/login/me), bcrypt hashing
- [x] Mock plan selection + feature gating (free 1 / pro 5 / enterprise 100 sites)
- [x] Website CRUD + `/api/websites/:id/stats` (uptime %, series, incidents, per-region)
- [x] Cron job scheduler (`services/scheduler.js`) — job per site/region/interval, on-chain mirror
- [x] Node endpoints: `/api/nodes/register|heartbeat|jobs|:wallet`
- [x] Result ingestion `/api/results` with EIP-191 signature verification
- [x] Settlement worker (`services/settlementWorker.js`) — off-chain majority, site status,
      outlier flagging, best-effort on-chain `settleConsensus`
- [x] `/api/public/network` — world-map data (node density per region)
- [x] Seed script `src/scripts/seed.js` (demo@example.com / password123)
- [ ] ⚠️ Not yet run against a live MongoDB — do this once `MONGODB_URI` is set

## Phase 3 — Node Software ✅ DONE  (`node-agent/`)

- [x] Commander CLI: `register` / `start [--dashboard]` / `dashboard` / `status`
- [x] Wallet: env key → `node-wallet.json` → auto-generate
- [x] HTTP check module (`checks/http.js`)
- [x] Headless render check (`checks/render.js`, Puppeteer) — detects blank/broken SPA
- [x] Verdict combiner (`checks/runner.js`) — UP = HTTP ok AND render ok
- [x] Result signing (`signer.js`) — scheme verified to match backend `verify.js`
- [x] Poll loop + on-chain stake + optional on-chain submitResult
- [x] Local dashboard (`dashboard.js`) on :5055 — earnings, stake, job history
- [ ] Not yet run end-to-end against a live backend

## Phase 4 — Customer Frontend ✅ DONE  (`frontend/`)

- [x] Next.js 14 App Router (plain JS), `next build` passes (8 routes)
- [x] Landing `/` — world map (react-simple-maps, CDN topojson), live stats, 15s refresh
- [x] `/nodes` — run-a-node instructions
- [x] `/register` + `/login` — JWT in localStorage, Nav reacts to auth
- [x] `/dashboard` — site list, plan-gated add-site, delete, mock PlanCards
- [x] `/dashboard/[id]` — Recharts response chart, per-region table, incident timeline
- [x] `useAuth` route guard, `lib/api.js` fetch wrapper
- [ ] Not yet run against a live backend
- [ ] (deferred / out of scope) RainbowKit wallet connect — node staking is CLI-only

## Phase 5 — Alerting ✅ DONE

- [x] Downtime detection from **consensus** transitions — flap protection in
      `settlementWorker` (`ALERT_CONFIRM_THRESHOLD` consecutive settlements, default 2)
- [x] `services/alerts.js` real sender: `sendStatusAlert({site, from, to, region})`
- [x] Email — Resend (HTTP, if `RESEND_API_KEY`) → SMTP (nodemailer) → console fallback
- [x] Slack incoming-webhook channel + generic JSON webhook channel
- [x] `Alert` model logs every dispatch + per-channel ok/fail
- [x] Alert-preference API: `GET/PUT /api/auth/alert-settings`
- [x] Per-site toggle: `Website.alertsEnabled` (PATCH allowed), `GET /api/websites/:id/alerts`,
      `POST /api/websites/:id/test-alert`
- [x] Frontend: `AlertSettings` component on `/dashboard`, per-site toggle + test button +
      alert history table on `/dashboard/[id]`
- [x] Env vars added to `backend/.env.example` + `SETUP.md` §1b
- [ ] Not yet run live (needs MongoDB + a real down→up transition, or use test-alert button)

## Phase 6 — Integration, Testing, Deployment ✅ CODE-COMPLETE (cloud pushes = your accounts)

- [x] E2E test `test/E2E.integration.test.js` — register → job → results → settle → reward/slash
      → deactivate (32 tests pass total)
- [x] "Catch a bad node" path — `FORCE_STATUS=up|down` in node-agent + covered in E2E test + `DEMO.md`
- [x] `scripts/demo-setup.js` — deploy + generate/fund N node wallets + print paste-ready `.env` blocks
      (`npm run demo:setup`)
- [x] `seed.js` already spreads ~20 nodes across 7 regions for the map
- [x] Backend deploy config — `backend/Dockerfile`, `backend/.dockerignore`, `render.yaml` blueprint
- [x] Frontend deploy config — `frontend/vercel.json`
- [x] `DEPLOY.md` — contracts→Amoy, backend→Render/Railway, frontend→Vercel, nodes→VMs, env tables
- [x] `DEMO.md` — full examiner walkthrough + fallbacks
- [x] Root orchestration — `npm run install:all`, `npm run dev` (concurrently: chain+backend+frontend)
- [ ] **YOU:** actually deploy — contracts to Amoy (`npm run deploy:mumbai`), backend to Render,
      frontend to Vercel, per `DEPLOY.md`
- [ ] **YOU:** verify contracts on PolygonScan (`npx hardhat verify --network mumbai …`)

## First live runs still pending (need MongoDB URI + the deploys above)

- [ ] `cd backend && npm run seed` succeeds against Atlas
- [ ] backend `npm run dev` boots, `/health` + `/api/public/network` respond
- [ ] node-agent `register` + `start` completes a real job against the backend
- [ ] frontend `npm run dev` — sign up, add site, see a check land
- [ ] full local demo dry-run per `DEMO.md` (all 7 beats)

---

## Known follow-ups / tech debt

- Backend, node-agent, frontend have **not been run against real infra yet** — first
  live run (after MongoDB URI) may surface small bugs; check each ⚠️ above.
- `submitResult` signature is stored on-chain but not `ecrecover`-verified on-chain
  (backend verifies it). Fine for the demo; note if hardening.
- On-chain job id vs Mongo `_id`: backend job `_id` is used in the signed hash;
  `onChainJobId` (uint) is a separate mirror field. Consistent, just be aware.
- `deployments/*.json` is gitignored except `.gitkeep` — share addresses via `SETUP.md`
  or unignore if you want them committed for the demo.
