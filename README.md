# DePIN Website Uptime Monitoring Platform

Decentralized uptime monitoring: a global network of independent validator nodes
load and render websites (not just ping them), reach consensus on up/down, and are
rewarded or slashed on-chain for honesty. See [CLAUDE.md](CLAUDE.md) for the full spec.

**▶ [SETUP.md](SETUP.md) — every env var, API key, and run step in one checklist.**
**▶ [PROGRESS.md](PROGRESS.md) — done vs remaining, task by task. Resume from here.**
**▶ [DEMO.md](DEMO.md) — examiner walkthrough · [DEPLOY.md](DEPLOY.md) — cloud deploy steps.**

## Build status

| Phase | Scope | Status |
|---|---|---|
| 1 | Smart contracts (MonitorToken, MonitorRegistry) + tests + deploy | ✅ done — 32 tests passing |
| 2 | Express + MongoDB backend, job scheduler, settlement worker | ✅ done — `backend/` |
| 3 | Node CLI agent (HTTP + headless render check, signing) | ✅ done — `node-agent/` |
| 4 | Next.js customer frontend + world map | ✅ done — `frontend/` |
| 5 | Alerting — consensus-driven, email/Slack/webhook, flap protection | ✅ done |
| 6 | Integration test, demo tooling, deploy configs | ✅ code-complete — cloud pushes pending (your accounts) |

## Phase 1 — contracts

```bash
npm install
npm run compile
npm test                 # 32 passing (incl. E2E)
npm run node             # terminal A: local chain
npm run deploy:local     # terminal B: deploy + write deployments/localhost.json
```

Contracts:
- `contracts/MonitorToken.sol` — ERC-20 (`MON`), mint restricted to the registry, burn used for slashing.
- `contracts/MonitorRegistry.sol` — `registerNode`, `submitResult`, `settleConsensus`
  (majority rule, ≥3 submissions), `deactivateNode` + `withdrawStake` with a 7-day unbonding period,
  owner setters for stake/slash/reward params.

Deploy to Polygon testnet: fill `.env` (`PRIVATE_KEY`, `POLYGON_RPC_URL`) then
`npm run deploy:mumbai`. Note: Mumbai is deprecated — config defaults to Polygon
Amoy (chainId 80002); override with `POLYGON_RPC_URL` / `POLYGON_CHAIN_ID`.

## Phase 2 — backend

See [backend/README.md](backend/README.md). Needs local MongoDB.

```bash
cd backend && npm install && cp .env.example .env
npm run seed && npm run dev
```

## Phase 3 — node agent

See [node-agent/README.md](node-agent/README.md). HTTP + Puppeteer render check,
wallet-signed result submission, local dashboard on :5055.

```bash
cd node-agent && npm install && cp .env.example .env
node src/index.js register
node src/index.js start --dashboard
```

## Phase 4 — frontend

See [frontend/README.md](frontend/README.md). Next.js 14, world map + Recharts dashboard.

```bash
cd frontend && npm install && cp .env.example .env.local
npm run dev   # http://localhost:3000
```
