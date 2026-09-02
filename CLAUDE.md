# DePIN Website Uptime Monitoring Platform — Project Spec

> This document is written for Claude Code. It defines the full product, architecture, and phased task breakdown. Follow phases in order — smart contracts are the dependency-critical foundation.

---

## 1. Product Overview

A **DePIN (Decentralized Physical Infrastructure Network)** platform that monitors website uptime using a **global network of independent validator nodes** instead of centralized cloud probes.

**Why this matters (the core pitch):** Traditional uptime monitors (UptimeRobot, Pingdom) ping from a handful of cloud data centers. This misses real-world issues — a site can be reachable from AWS us-east-1 but broken for actual users in a specific region due to ISP routing, CDN edge failures, or **SPA (Single Page Application) rendering issues** that a simple HTTP ping can't detect (page returns 200 but the JS never mounts, so the user sees a blank screen).

Our platform solves this by having **real nodes, run by real people, on real hardware, in real geographic locations** actually load and render the page — and get paid in tokens for doing it honestly.

### Core User Types
1. **End Users (Customers)** — subscribe to a plan to monitor their website(s) and get notified when down.
2. **Node Operators (Validators)** — download node software, run it on their machine, earn tokens for submitting honest uptime data.

> **Note on scope:** This is a college major project. The goal is a **working, demo-able system** for the external examiner — real nodes actually running and submitting real data, visible live. Payment/billing is a **conceptual feature only** (mocked UI, no real gateway integration, no real money). Don't build actual payment processing — see section 2.1.

---

## 2. Feature Set

### 2.1 Customer-Facing Platform
- Signup/login (email + wallet-optional)
- Add website(s) to monitor, choose check frequency and target regions
- Subscription plans (tiered: number of sites, check frequency, regions, alert channels) — **UI only, mocked.** Show plan cards, let user "select" a plan, store the choice in DB to gate features (e.g. free = 1 site, pro = 5 sites) — no real payment gateway, no real transaction. This still demonstrates the product model to an examiner without needing real money or a merchant account.
- Alerting: email (MVP), SMS/Slack/webhook (stretch)
- Dashboard: uptime %, response time graphs (Recharts), incident history, per-region status
- **Homepage: interactive world map** showing live node locations/density per region (this is the "wow" visual — proves the network is real and distributed)

### 2.2 Node Operator Platform
- Downloadable node software (Node.js CLI/agent to start; Electron GUI is stretch)
- Node registers itself on-chain (stakes MonitorToken via MonitorRegistry)
- Node receives monitoring jobs (which URLs to check) based on its declared region
- Node performs the check:
  - HTTP status check (basic reachability)
  - **Headless browser render check** (Puppeteer/Playwright) — this is what catches SPA issues cloud pingers miss. Node confirms actual DOM content/expected element appears, not just a 200 response.
- Node submits result (hash + signed payload) — off-chain aggregation, periodic on-chain settlement
- Node earns token rewards proportional to honest, consistent participation
- Node dashboard: earnings, uptime of node itself, jobs completed, stake status

### 2.3 Blockchain / Incentive Layer
- **MonitorToken.sol** — ERC-20 reward token
- **MonitorRegistry.sol** — node registration, staking, consensus, and slashing
  - Nodes stake tokens to register (skin in the game — prevents Sybil spam)
  - **Consensus mechanism**: multiple nodes in the same region check the same site; results are compared. Majority-agreeing nodes get rewarded; outlier/dishonest nodes get slashed (stake penalty).
  - This is what guarantees **accurate data** — a single malicious or broken node can't lie about uptime without being caught by peer consensus.
- Deployment target: Polygon Mumbai testnet (cheap gas, fast blocks — good for frequent consensus settlement)

### 2.4 Real-World Node Distribution
- Nodes are just software any machine can run — no special hardware required
- Node declares its region on registration (self-reported + IP-geolocation cross-check to prevent region-spoofing)
- Incentive design should reward **geographic diversity** — e.g., bonus multiplier for registering in under-represented regions, so the network naturally spreads out instead of clustering wherever nodes are cheapest to run
- World map UI pulls live node count/region data to visually prove decentralization

---

## 3. Tech Stack (confirmed)

| Layer | Stack |
|---|---|
| Frontend | Next.js 14 (App Router), RainbowKit + wagmi (wallet connect for node operators), Recharts (graphs), map library (e.g. react-simple-maps or Mapbox GL) |
| Backend | Node.js + Express, MongoDB, ethers.js, node-cron for job scheduling |
| Node Software | Node.js agent, Puppeteer/Playwright for render checks, ethers.js for signing/submitting results |
| Smart Contracts | Solidity + Hardhat — MonitorToken (ERC-20), MonitorRegistry (staking/consensus/slashing) |
| Payments | None — plan selection is mocked (DB flag), no real gateway |
| Chain | Polygon Mumbai testnet |
| Deployment | Vercel (frontend), Railway (backend) |
| Local dev | Hardhat + Ganache |

---

## 4. System Architecture (high level)

```
[Customer] → [Next.js Frontend] → [Express Backend API] → [MongoDB]
                                          │
                                          ├─→ [Job Scheduler (cron)] → assigns check jobs to nodes by region
                                          │
[Node Operator's Machine] ← [Node Software polls for jobs] ─┘
        │
        ├─→ performs HTTP + headless render check
        ├─→ signs result with node's wallet key
        └─→ submits result → Backend aggregates → periodic batch → MonitorRegistry.sol (on-chain settlement)
                                                          │
                                                          └─→ consensus check → reward/slash → MonitorToken transfer
```

---

## 5. Build Phases (for Claude Code — execute in order)

### Phase 1 — Smart Contracts (foundation, do first)
- [ ] `MonitorToken.sol` — standard ERC-20, mintable by MonitorRegistry only
- [ ] `MonitorRegistry.sol`:
  - `registerNode(region)` — requires stake
  - `submitResult(jobId, resultHash, signature)`
  - `settleConsensus(jobId)` — compares submissions, rewards agreeing nodes, slashes outliers
  - `withdrawStake()` — with unbonding period
- [ ] Hardhat test suite for all above
- [ ] Deploy scripts targeting Polygon Mumbai

### Phase 2 — Backend Core
- [ ] Express API scaffold + MongoDB models (User, Website, Node, Job, Result, Subscription)
- [ ] Auth (JWT)
- [ ] Website CRUD (add/remove monitored sites, set region + frequency)
- [ ] Job scheduler (cron) — generates check jobs per website per region per interval
- [ ] Node job-assignment endpoint (nodes poll this)
- [ ] Result ingestion endpoint (signature verification)
- [ ] On-chain settlement worker (batches results → calls MonitorRegistry periodically)

### Phase 3 — Node Software
- [ ] CLI agent: register (stake via wallet), poll for jobs, execute checks
- [ ] HTTP check module
- [ ] Headless browser render-check module (Puppeteer) — detect SPA blank-page/broken-render cases
- [ ] Result signing + submission
- [ ] Local node dashboard (CLI output or simple local web UI): earnings, job history

### Phase 4 — Customer Frontend
- [ ] Landing page with **world map** (live node density by region)
- [ ] Auth pages
- [ ] Add-website flow + plan selection (mocked — no real payment, just DB flag + feature gating)
- [ ] Customer dashboard: uptime %, response time charts, incident timeline, per-region breakdown
- [ ] Alert preference settings (email first)

### Phase 5 — Alerting
- [ ] Downtime detection logic (based on consensus result, not single node)
- [ ] Email alerts (Resend/Nodemailer)
- [ ] (Stretch) Slack/webhook alerts

### Phase 6 — Integration, Testing, Deployment
- [ ] End-to-end test: register node → job assigned → check performed → result submitted → consensus settled → reward paid → customer dashboard reflects status
- [ ] Deploy backend to Railway, frontend to Vercel
- [ ] Deploy contracts to Polygon Mumbai, verify on PolygonScan
- [ ] Seed a few test nodes across simulated regions for demo

---

## 6. Open Questions / Decisions Needed Before/During Build
1. Map library — react-simple-maps (free, simpler) vs Mapbox GL (prettier, needs API key)? *(default: react-simple-maps for MVP, no API key friction)*
2. How many real nodes for the examiner demo? *(suggest: run 3-5 node instances yourself — laptop, friend's laptop, a cheap cloud VM or two — genuinely in different networks/locations if possible, so the examiner sees real distributed behavior, not just localhost copies)*
3. Consensus threshold — how many node agreements needed to settle a job? *(suggest: minimum 3 nodes per region per check, majority rule)*
4. Demo script — plan a short live walkthrough: start 3+ nodes → add a website to monitor → watch jobs get assigned and results come in on the dashboard in real time → show a node earning tokens on-chain (PolygonScan) → optionally kill one node or feed it a bad result to show slashing/consensus catching it. This "catching a bad node" moment is a strong demo beat for an examiner.

---