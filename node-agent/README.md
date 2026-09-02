# DePIN Monitor — Node Agent (Phase 3)

The software a validator runs on their own machine. It polls the backend for
check jobs in its region, performs an **HTTP reachability check** *and* a
**headless-browser render check** (Puppeteer — catches SPA blank-page / broken
mount that a 200 response hides), signs the result with its wallet key, and
submits it to the backend (and optionally on-chain to `MonitorRegistry`).

## Setup

```bash
cd node-agent
npm install                 # installs Puppeteer + a bundled Chromium
cp .env.example .env        # set NODE_REGION, BACKEND_URL, and (optional) chain vars
node src/index.js register  # generates ./node-wallet.json, stakes, registers
node src/index.js start --dashboard
```

Local dashboard: http://localhost:5055 (earnings, stake, job history, node liveness).

## Commands

| Command | What it does |
|---|---|
| `register [-r region]` | create/load wallet, approve + `registerNode` on-chain (if contract addrs set), register with backend |
| `start [--dashboard]` | main loop: heartbeat → poll jobs → HTTP + render check → sign → submit |
| `dashboard` | serve the local dashboard only |
| `status` | print backend + wallet info |

## On-chain staking

Set `MONITOR_REGISTRY_ADDRESS` / `MONITOR_TOKEN_ADDRESS` (from
`../deployments/<network>.json`) and fund the node wallet with ≥ `minimumStake`
MON from the token treasury. `register` then approves and stakes automatically.
Set `SUBMIT_ONCHAIN=true` to also push each result to `submitResult` on-chain so
`settleConsensus` can reward/slash.

## Result signature

`solidityPackedKeccak256(["string","uint8","uint16","uint32","bool"],
[jobId, status(1|0), httpStatus, responseTimeMs, renderOk])`, signed as an EIP-191
personal message over the raw 32 bytes — matches `backend/src/utils/verify.js`.

## Running several nodes for the demo

Use a separate directory (or `WALLET_FILE` + `DASHBOARD_PORT`) per instance, ideally
on different machines / networks so the examiner sees genuine geographic spread.
