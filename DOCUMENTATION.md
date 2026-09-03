# DePIN Website Uptime Monitoring Platform — Project Documentation

> A complete walkthrough of what the system is, why it's built this way, and how
> every part works together. Read top to bottom to explain the project to an
> examiner. For the on-chain deployment specifically, see [BLOCKCHAIN.md](BLOCKCHAIN.md).

---

## 1. The problem

Traditional uptime monitors (UptimeRobot, Pingdom, StatusCake) ping your website
from a **handful of cloud data centres**. That has two blind spots:

1. **Geography.** A site can be perfectly reachable from AWS `us-east-1` but broken
   for real users in another region because of ISP routing, a failing CDN edge
   node, or regional DNS problems. A cloud pinger in Virginia never sees it.
2. **Rendering.** Modern sites are Single Page Applications. The server returns
   `HTTP 200` with an almost-empty HTML shell, and JavaScript builds the page in
   the browser. If that JavaScript fails, the user sees a **blank white screen** —
   but a simple HTTP check sees `200 OK` and reports "up".

## 2. The idea — DePIN

**DePIN** = *Decentralized Physical Infrastructure Network*. Instead of a few
company-owned probes, anyone can run **node software** on their own machine, in
their own city, on their own internet connection. These nodes:

- actually **load and render** the monitored page in a real headless browser,
- report what they saw,
- and are **paid in tokens** for reporting honestly.

Honesty is enforced by **consensus**: several nodes in the same region check the
same site, and their answers are compared. Nodes that agree with the majority are
rewarded; nodes that disagree (lying, misconfigured, or broken) are **slashed** —
they lose part of a security deposit they had to put up to join.

The result: uptime data that is **geographically real** and **render-aware**, with
a crypto-economic guarantee that a single bad actor can't fake it.

## 3. Who uses it

| User type | What they do |
|---|---|
| **Customer** | Signs up, adds website(s) to monitor, picks a plan, gets a dashboard (uptime %, response-time graph, incident history, per-region status) and email alerts when a site goes down. |
| **Node operator** | Downloads the node agent, stakes tokens, runs it. Earns tokens for honest checks. Has a local dashboard showing earnings, stake, and job history. |

## 4. System architecture

```
                    ┌──────────────────────────────┐
                    │   Customer browser            │
                    │   Next.js frontend (Vercel)   │
                    └───────────────┬──────────────┘
                                    │ REST + JWT
                                    ▼
┌──────────────────────────────────────────────────────────────┐
│  Backend API + workers  (Express, Node.js — Render/Railway)    │
│                                                               │
│   • Auth, websites, plans          • Job scheduler (cron)      │
│   • Result ingestion (sig-verified)• Settlement worker (cron)  │
│   • Alerting (email/Slack/webhook)  • Public network stats     │
└───────┬───────────────────────────────────┬──────────────────┘
        │ MongoDB (Atlas)                    │ ethers.js
        ▼                                    ▼
┌───────────────┐              ┌──────────────────────────────────┐
│   MongoDB     │              │  Polygon Amoy testnet             │
│  users, sites │              │   MonitorToken  (ERC-20)          │
│  nodes, jobs, │              │   MonitorRegistry (stake/         │
│  results,     │              │      consensus/reward/slash)      │
│  alerts       │              └───────────────▲──────────────────┘
└───────────────┘                              │ stake, submitResult
                                               │
        ┌──────────────────────────────────────┴───────────────┐
        │  Node agent  (runs on operators' machines)             │
        │   poll jobs → HTTP check + headless render check       │
        │   → sign result → POST to backend (+ optional on-chain)│
        │   local dashboard on :5055                             │
        └───────────────────────────────────────────────────────┘
```

There are **four codebases** in this repo:

| Folder | What it is | Runtime |
|---|---|---|
| `contracts/` + `scripts/` + `test/` | Solidity smart contracts + Hardhat tests + deploy scripts | Polygon (EVM) |
| `backend/` | REST API, MongoDB models, cron workers | Node.js server |
| `node-agent/` | The validator node software (CLI) | Node.js on operator machines |
| `frontend/` | Customer web app | Next.js (browser + edge) |

## 5. The blockchain layer

Two contracts, both in `contracts/`.

### 5.1 `MonitorToken.sol` — the reward currency

A standard **ERC-20** token, symbol `MON`.

- Constructor mints an initial supply (1,000,000 MON) to the deployer — this is
  the **treasury** that funds node rewards and lets operators buy in.
- `setMonitorRegistry(addr)` — the owner links the token to the registry contract.
- `mint(to, amount)` — **only the registry** can call this. New MON is created when
  honest nodes are rewarded.
- `burnFrom(from, amount)` — the registry (or a holder burning their own) can call
  this. Used to destroy slashed stake.

So the token supply **grows** with honest work and **shrinks** with slashing.

### 5.2 `MonitorRegistry.sol` — staking, jobs, consensus

Holds all the network logic. Key parameters (owner-adjustable):

| Parameter | Default | Meaning |
|---|---|---|
| `minimumStake` | 100 MON | deposit required to register a node |
| `rewardPerSubmission` | 1 MON | minted to each node that agrees with consensus |
| `slashPercentage` | 10% | fraction of stake burned from an outlier node |
| `unbondingPeriod` | 7 days | wait between leaving and withdrawing your stake |

**Functions:**

| Function | Who | What happens |
|---|---|---|
| `registerNode(region)` | operator | pulls `minimumStake` MON from the caller into the contract, records the node + its region |
| `deactivateNode()` | operator | marks the node inactive, starts the 7-day unbonding clock |
| `withdrawStake()` | operator | after unbonding, returns the remaining (post-slash) stake |
| `createJob(url, region)` | owner (backend) | records a check job on-chain, emits `JobCreated(jobId, …)` |
| `submitResult(jobId, result, resultHash, signature)` | node | stores the node's up/down vote + its signature for that job |
| `settleConsensus(jobId)` | owner (backend) | **the core** — see below |

**`settleConsensus(jobId)`** requires **≥ 3 submissions**, then:

1. Counts `up` votes vs `down` votes.
2. Majority wins (`upVotes > downVotes` → up, otherwise down).
3. Marks the job settled with that result.
4. For each submission:
   - **agrees with majority** → `token.mint(node, rewardPerSubmission)`, bump the
     node's `totalEarnings`, emit `NodeRewarded`.
   - **disagrees** → `slashAmount = stakedAmount * slashPercentage / 100`, reduce
     the node's on-chain `stakedAmount`, `token.burnFrom(thisContract, slashAmount)`,
     emit `NodeSlashed`.
5. Emit `ConsensusSettled(jobId, majorityResult, rewardedCount, slashedCount)`.

`withdrawStake()` uses OpenZeppelin's `ReentrancyGuard`. Only the `owner` (the
backend's settlement wallet) can create jobs and settle them.

### 5.3 Why a testnet

Deployed to **Polygon Amoy** (an Ethereum-compatible test network): free "gas"
from a faucet, ~2-second blocks (good for frequent settlement), and a public block
explorer (PolygonScan) where the examiner can independently verify that node
registrations, rewards, and slashes really happened on a public chain.

## 6. The backend

`backend/` — Express + MongoDB. Started with `npm run dev`; two background workers
run on cron schedules.

### 6.1 Data models (`src/models/`)

| Model | Purpose |
|---|---|
| `User` | email + bcrypt password, chosen plan, alert channel preferences |
| `Website` | a monitored site: URL, expected DOM selector, regions, interval, current status, flap-protection counters |
| `Node` | mirror of an on-chain node: wallet, region, stake, last-seen, jobs completed |
| `Job` | one check to perform: site, URL, region, status (`open`→`collecting`→`settled`), on-chain job id |
| `Result` | one node's answer to one job: up/down, HTTP status, response time, render ok, `resultHash`, signature, `agreedWithConsensus` |
| `Subscription` | mocked billing record (plan choice log) |
| `Alert` | log of every notification dispatched, with per-channel success/failure |

### 6.2 API surface (`src/routes/`)

| Route | Auth | Purpose |
|---|---|---|
| `POST /api/auth/register`, `/login` | – | account + JWT |
| `GET /api/auth/me`, `/plans` | user / – | profile + plan catalogue |
| `POST /api/auth/subscribe` | user | **mock** plan change (DB flag only, no payment) |
| `GET/PUT /api/auth/alert-settings` | user | email/Slack/webhook channel prefs |
| `GET/POST /api/websites`, `PATCH/DELETE /api/websites/:id` | user | manage sites (plan-gated) |
| `GET /api/websites/:id/stats` | user | uptime %, response series, per-region, incidents |
| `GET /api/websites/:id/alerts`, `POST …/test-alert` | user | alert history + manual test |
| `POST /api/nodes/register`, `/heartbeat` | – | node announces itself / liveness |
| `GET /api/nodes/jobs?walletAddress=` | – | node polls for jobs in **its region** |
| `POST /api/results` | – | node submits a **signed** result |
| `GET /api/public/network` | – | homepage world-map data (node density per region) |

### 6.3 The job scheduler (`src/services/scheduler.js`)

Every minute:

- For each active website, for each of its regions: if the last job for that
  site+region is older than the site's `intervalSeconds`, create a new `Job`
  (status `open`, `expiresAt` = now + 2 min).
- If an on-chain signer is configured, also call `MonitorRegistry.createJob()` and
  store the returned `onChainJobId` on the Job.

### 6.4 Result ingestion & signature verification (`src/routes/results.js`)

A node submits `{ jobId, walletAddress, status, httpStatus, responseTimeMs,
renderOk, signature }`. The backend:

1. Recomputes the deterministic hash
   `keccak256(abi.encodePacked(jobId, status, httpStatus, responseTimeMs, renderOk))`
   (`src/utils/verify.js` — must match the node's `signer.js` exactly).
2. Recovers the signer address from the signature (`ethers.verifyMessage`).
3. Rejects unless the recovered address **equals** the claimed `walletAddress`.
4. Rejects if the node isn't registered/active, or is in the wrong region.
5. Stores the `Result` (unique per job+node).

This means a node can't submit results "as" another node, and every stored answer
is cryptographically attributable.

### 6.5 The settlement worker (`src/services/settlementWorker.js`)

Every 2 minutes, for each job that has enough results (or whose 2-minute window
closed):

1. Count `up` vs `down` among the results → **majority** = consensus result.
2. Mark each result `agreedWithConsensus = true/false`.
3. Update the website's status **with flap protection**: a *new* status must be
   confirmed by `ALERT_CONFIRM_THRESHOLD` (default 2) consecutive settlements
   before the site officially flips. This stops a single flaky check from paging
   anyone. (A first-ever reading of "down" alerts immediately; a first reading of
   "up" is silent.)
4. On a confirmed flip, fire `sendStatusAlert()`.
5. If the job was mirrored on-chain and has ≥ 3 on-chain submissions, call
   `MonitorRegistry.settleConsensus(onChainJobId)` so rewards/slashes execute on
   the blockchain.

**Off-chain consensus is the source of truth for the dashboard; on-chain
settlement is what moves the tokens.** They use the same majority rule.

### 6.6 Alerting (`src/services/alerts.js`)

`sendStatusAlert({ site, from, to, region })` sends across the owner's enabled
channels:

- **Email** — Resend HTTP API if `RESEND_API_KEY` is set, otherwise SMTP via
  Nodemailer (e.g. a Gmail app password), otherwise printed to the server console.
- **Slack** — incoming-webhook POST.
- **Generic webhook** — a structured `status_change` JSON POST.

Every attempt is written to the `Alert` collection with per-channel success/failure
and shown in the site's alert-history table.

## 7. The node agent

`node-agent/` — a CLI the operator runs. Commands: `register`, `start`,
`dashboard`, `status`.

### 7.1 What one check cycle does (`src/runner.js`)

1. `POST /api/nodes/heartbeat` — stay "live".
2. `GET /api/nodes/jobs` — get open jobs for this node's region.
3. For each job (`src/checks/runner.js`):
   - **HTTP check** (`checks/http.js`) — GET the URL, follow redirects, measure
     latency, capture the status code.
   - **Render check** (`checks/render.js`) — launch headless Chrome (Puppeteer),
     navigate, wait for the page's expected DOM selector (or fall back to "does
     the body have real text"). This is what catches a blank SPA: HTTP 200 but the
     selector never appears → `renderOk = false`.
   - **Verdict**: `up` only if HTTP is reachable **and** the render check passed.
4. Sign the result hash with the node's wallet key (`src/signer.js`).
5. `POST /api/results`. If `SUBMIT_ONCHAIN=true`, also call
   `MonitorRegistry.submitResult()` directly.
6. Update the local dashboard (`:5055`).

### 7.2 Registration (`src/chain.js`)

`node src/index.js register`:

1. Load or generate the node wallet (`node-wallet.json`).
2. If contract addresses are configured: `approve()` the registry for
   `minimumStake` MON, then `registerNode(region)` — the stake moves on-chain.
3. `POST /api/nodes/register` so the backend knows the node exists and which
   region it serves. The backend cross-checks the on-chain stake.

## 8. The frontend

`frontend/` — Next.js 14 (App Router). Talks to the backend over REST; JWT kept in
`localStorage`.

| Page | Content |
|---|---|
| `/` | Hero + **live world map** (`react-simple-maps`) of node density per region, network stats, "how it works". Refreshes every 15s. |
| `/nodes` | How to run a validator node. |
| `/register`, `/login` | Auth. |
| `/dashboard` | Site list with status, add-site (plan-gated), **mock plan selection**, alert-channel settings. |
| `/dashboard/[id]` | Uptime %, response-time area chart (Recharts), per-region breakdown, incident timeline, per-site alert toggle + test button + history. |

## 9. Incentive design (why nodes behave)

1. **Skin in the game.** You must stake `minimumStake` MON to register. Sybil
   attacks (spinning up 100 fake nodes) cost 100× the stake.
2. **Consensus reward.** Agree with your region's majority → you're minted
   `rewardPerSubmission` MON. Honest work is profitable.
3. **Slashing.** Disagree with the majority → you lose `slashPercentage` of your
   stake, burned forever. Lying or running broken software is expensive.
4. **Geographic diversity** (design intent). Rewards can carry a multiplier for
   under-represented regions, so the network spreads out instead of clustering
   where nodes are cheapest to run.

A single malicious node **cannot** move a site's status — it's outvoted and
slashed. To actually falsify uptime, an attacker would need to out-stake and
out-number the honest nodes in a region simultaneously.

## 10. What is real vs mocked

| Real | Mocked / simplified |
|---|---|
| Smart contracts, staking, consensus, rewards, slashing (on a public testnet) | **Payments** — plans are a DB flag, no gateway, no money. Pure UI + feature gating. |
| HTTP + headless-render checks against real websites | IP-geolocation region cross-check is declared design, self-reported region is trusted in code |
| Cryptographic signing + verification of every result | On-chain signature is stored, not `ecrecover`-verified on-chain (the backend verifies it) |
| Email / Slack / webhook alerts | — |
| Multi-node consensus, flap protection | Consensus tie-break differs slightly on-chain (tie → down) vs off-chain worker (tie → up) |

## 11. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Contracts | Solidity 0.8.24, Hardhat 2, OpenZeppelin v5 | industry standard, best tooling/docs, audited primitives |
| Chain | Polygon Amoy testnet | free gas, ~2s blocks, EVM, public explorer |
| Backend | Node.js, Express, MongoDB (Mongoose), node-cron, ethers v6 | one language across the stack; Mongo fits the flexible document shapes; ethers for chain calls |
| Node agent | Node.js, Puppeteer, Commander, ethers v6 | Puppeteer = real Chrome rendering; easy for operators to run |
| Frontend | Next.js 14, React 18, Recharts, react-simple-maps | App Router, good DX, lightweight charts + map without an API key |
| Auth | JWT + bcrypt | stateless, simple |
| Email | Nodemailer (SMTP) / Resend | works with a free Gmail app password or a proper API |

## 12. Security notes

- Result submissions are signature-verified against the claimed wallet — no
  spoofing another node.
- Stake is custodied by the registry contract; slashing burns from the contract's
  own balance, not by clawing back from a wallet.
- `withdrawStake` is `nonReentrant` and gated by the unbonding period.
- Only the backend's owner wallet can create jobs / settle consensus on-chain.
- JWT secret, DB URI, private keys, and SMTP creds all live in gitignored `.env`
  files; `.env.example` templates are committed instead.
- Frontend stores only a JWT in `localStorage`; no secrets client-side.

## 13. Limitations & future work

- On-chain `ecrecover` verification of result signatures (currently backend-only).
- Real IP-geolocation cross-check to stop region spoofing.
- Batched on-chain settlement (one tx per N jobs) to cut gas.
- Electron GUI for the node agent; SMS alert channel.
- Weighted consensus (stake-weighted or reputation-weighted voting).
- Real payment integration if this were ever productionised.

## 14. Repository map

```
contracts/            MonitorToken.sol, MonitorRegistry.sol
scripts/              deploy.js, demo-setup.js
test/                 *.test.js  (32 passing, incl. E2E)
backend/src/
  models/             User, Website, Node, Job, Result, Subscription, Alert
  routes/             auth, websites, nodes, results, public
  services/           scheduler, settlementWorker, alerts
  config/             db (with DNS fix), chain, plans
  utils/verify.js     signature scheme (mirrors node-agent/src/signer.js)
node-agent/src/
  checks/             http.js, render.js, runner.js
  chain.js signer.js runner.js dashboard.js index.js
frontend/app/         page, login, register, nodes, dashboard, dashboard/[id]
frontend/components/  Nav, WorldMap, PlanCards, AlertSettings
```

Docs: [README.md](README.md) · [SETUP.md](SETUP.md) · [BLOCKCHAIN.md](BLOCKCHAIN.md) ·
[DEPLOY.md](DEPLOY.md) · [DEMO.md](DEMO.md) · `PROGRESS.md` (local)
