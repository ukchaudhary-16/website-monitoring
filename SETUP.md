# Setup & Credentials Checklist

Everything you need to fill in to run the project, in one place. Work top to bottom.

---

## 0. Prerequisites (install once)

| Tool | Version | Notes |
|---|---|---|
| Node.js | ≥ 18.18 (20 LTS recommended) | `node -v` |
| npm | ≥ 9 | ships with Node |
| Git | any | |
| MongoDB | Atlas free cluster **or** local `mongod` | see §2 |
| Chromium libs (Linux only) | — | Puppeteer downloads its own Chromium on `npm install`; on bare Linux also `sudo apt-get install -y libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2` |
| MetaMask (or any wallet) | — | only for the **testnet** path (§4), not local |

Install all package deps:

```bash
npm install                    # root — Hardhat / contracts
cd backend    && npm install && cd ..
cd node-agent && npm install && cd ..     # this one pulls Chromium (~150 MB)
cd frontend   && npm install && cd ..
```

---

## 1. Secrets & env vars — the full list

Legend: **[REQ]** required · **[OPT]** optional / has a working default · **[LOCAL]** needed only for the local-chain path · **[TESTNET]** needed only for the Polygon testnet path

### 1a. `/.env`  (contracts — copy from `.env.example`)

| Var | Status | What to put | Where to get it |
|---|---|---|---|
| `POLYGON_RPC_URL` | [TESTNET] | Polygon Amoy RPC URL | Alchemy / Infura / Ankr free key, or public `https://rpc-amoy.polygon.technology` |
| `POLYGON_CHAIN_ID` | [OPT] | `80002` (Amoy) — leave default | — |
| `PRIVATE_KEY` | [TESTNET] | Deployer wallet private key, **no `0x`**, testnet-only | MetaMask → Account details → Show private key |
| `POLYGONSCAN_API_KEY` | [OPT] | Only for `verify` on PolygonScan | https://polygonscan.com/myapikey (free) |

> **Local path needs none of these** — Hardhat's built-in node provides funded accounts.

### 1b. `/backend/.env`  (copy from `backend/.env.example`)

| Var | Status | What to put | Where to get it |
|---|---|---|---|
| `PORT` | [OPT] | `4000` | — |
| `NODE_ENV` | [OPT] | `development` | — |
| `CORS_ORIGIN` | [OPT] | `http://localhost:3000` | your frontend URL |
| `MONGODB_URI` | **[REQ]** | **← you are providing this** | Atlas connection string (§2) or `mongodb://127.0.0.1:27017/depin_monitor` |
| `JWT_SECRET` | **[REQ]** | any long random string | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `JWT_EXPIRES_IN` | [OPT] | `7d` | — |
| `CHAIN_RPC_URL` | [OPT] | `http://127.0.0.1:8545` local, or Amoy RPC | same as `POLYGON_RPC_URL` for testnet |
| `SETTLEMENT_PRIVATE_KEY` | [OPT] | Key of the **MonitorRegistry owner** (the deployer). Needed only if you want the backend to push jobs/settlement on-chain. | deployer wallet |
| `MONITOR_REGISTRY_ADDRESS` | [OPT] | From `deployments/<network>.json` after §3 | deploy output |
| `MONITOR_TOKEN_ADDRESS` | [OPT] | From `deployments/<network>.json` | deploy output |
| `ENABLE_SCHEDULER` | [OPT] | `true` | — |
| `ENABLE_SETTLEMENT_WORKER` | [OPT] | `true` | — |
| `JOB_SCHEDULER_CRON` | [OPT] | `*/1 * * * *` | — |
| `SETTLEMENT_CRON` | [OPT] | `*/2 * * * *` | — |
| `CONSENSUS_MIN_SUBMISSIONS` | [OPT] | `3` | lower to `1` for a solo-node demo |
| `ALERT_CONFIRM_THRESHOLD` | [OPT] | `2` — consecutive settlements before a flip alerts (flap protection) | — |
| `APP_BASE_URL` | [OPT] | `http://localhost:3000` — used for links in alert emails | frontend URL |
| `ALERT_FROM` | [OPT] | `DePIN Monitor <alerts@depin.local>` | your verified sender for Resend/SMTP |
| `RESEND_API_KEY` | [OPT] | email alerts (preferred if set) | https://resend.com/api-keys (free tier) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASS` | [OPT] | used when `RESEND_API_KEY` is blank | Gmail app password, Mailtrap, Brevo, etc. |

> Email is fully optional: with neither Resend nor SMTP configured, alerts print to
> the backend console — enough for the demo. Slack / generic-webhook URLs are set
> per-user in the dashboard UI, not in `.env`.

### 1c. `/node-agent/.env`  (copy from `node-agent/.env.example`) — one per node instance

| Var | Status | What to put | Where to get it |
|---|---|---|---|
| `PRIVATE_KEY` | [OPT] | Node wallet key. Leave blank → `register` generates `node-wallet.json` for you | — |
| `WALLET_FILE` | [OPT] | `./node-wallet.json` (change per instance if running several on one box) | — |
| `NODE_REGION` | **[REQ]** | e.g. `us-east`, `eu-west`, `ap-south` | pick from the region list |
| `BACKEND_URL` | **[REQ]** | `http://localhost:4000` (or deployed backend URL) | — |
| `CHAIN_RPC_URL` | [LOCAL/TESTNET] | `http://127.0.0.1:8545` or Amoy RPC | — |
| `MONITOR_REGISTRY_ADDRESS` | [OPT] | from `deployments/*.json` — enables real staking | deploy output |
| `MONITOR_TOKEN_ADDRESS` | [OPT] | from `deployments/*.json` | deploy output |
| `SUBMIT_ONCHAIN` | [OPT] | `false` (set `true` to also post each result on-chain) | — |
| `POLL_INTERVAL_SECONDS` | [OPT] | `15` | — |
| `HEADLESS` | [OPT] | `true` | set `false` to watch the browser |
| `RENDER_TIMEOUT_MS` | [OPT] | `20000` | — |
| `DASHBOARD_PORT` | [OPT] | `5055` (unique per instance) | — |

### 1d. `/frontend/.env.local`  (copy from `frontend/.env.example`)

| Var | Status | What to put |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | **[REQ]** | `http://localhost:4000` (or deployed backend URL) |

---

## 2. MongoDB Atlas (your step)

1. https://cloud.mongodb.com → sign up → **Create** → **M0 free** cluster.
2. **Database Access** → Add New Database User → username + password (save it).
3. **Network Access** → Add IP Address → `0.0.0.0/0` (demo) or your IP.
4. **Clusters** → **Connect** → **Drivers** → copy the URI, looks like:
   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/depin_monitor?retryWrites=true&w=majority
   ```
   - Replace `<user>` / `<password>`.
   - Add the DB name `depin_monitor` before the `?` (as shown).
5. Paste into `backend/.env` as `MONGODB_URI`.
6. Verify: `cd backend && npm run seed` — should print `Seeded: 1 user ...`.

---

## 3. Deploy the contracts

**Local (no keys, recommended for dev/demo):**
```bash
# terminal A
npm run node                       # Hardhat chain on :8545, prints 20 funded accounts

# terminal B
npm run deploy:local               # writes deployments/localhost.json
```
Copy `MonitorToken` / `MonitorRegistry` addresses from `deployments/localhost.json`
into `backend/.env` and each `node-agent/.env`. Use one of the printed Hardhat
private keys as `SETTLEMENT_PRIVATE_KEY` (account #0 = the deployer/owner) and as
node `PRIVATE_KEY`s (accounts #1, #2, #3…) so nodes have MON to stake.

**Polygon Amoy testnet:**
```bash
# fill /.env: POLYGON_RPC_URL, PRIVATE_KEY
# fund the deployer with test POL: https://faucet.polygon.technology (select Amoy)
npm run deploy:mumbai              # despite the name, targets Amoy 80002 by default
npx hardhat verify --network mumbai <address>   # optional, needs POLYGONSCAN_API_KEY
```

---

## 4. Fund node wallets with MON (only if staking on-chain)

The deployer holds the full 1,000,000 MON supply. Send each node ≥ 100 MON
(the `minimumStake`). Quick way with Hardhat console:
```bash
npx hardhat console --network localhost
> const t = await ethers.getContractAt("MonitorToken", "<token addr>")
> await t.transfer("<node wallet>", ethers.parseEther("200"))
```
(Or lower the bar once: `registry.setMinimumStake(ethers.parseEther("10"))` as owner.)

---

## 5. Run order (full local demo)

| # | Terminal | Command | Needs |
|---|---|---|---|
| 1 | A | `npm run node` | — |
| 2 | B | `npm run deploy:local` | step 1 |
| 3 | — | put addresses in `backend/.env` + `node-agent/.env` | step 2 |
| 4 | C | `cd backend && npm run seed && npm run dev` | `MONGODB_URI` |
| 5 | D | `cd frontend && npm run dev` | step 4 |
| 6 | E,F,G | `cd node-agent && node src/index.js register` then `node src/index.js start --dashboard` (×3, different `WALLET_FILE`/`DASHBOARD_PORT`/`NODE_REGION`) | steps 1–4 |
| 7 | browser | http://localhost:3000 — sign up, add a site, watch the dashboard | all |

For a **1-node demo**, set `CONSENSUS_MIN_SUBMISSIONS=1` in `backend/.env`.

---

## 6. Deployment (Phase 6, later)

| Service | Hosts | Env to set there |
|---|---|---|
| Railway / Render | `backend/` | all of §1b |
| Vercel | `frontend/` | `NEXT_PUBLIC_API_URL` = deployed backend URL |
| Polygon Amoy | contracts | via §3 testnet |
| A cloud VM or two | `node-agent/` | §1c, pointing `BACKEND_URL` at the deployed backend |

---

## Quick "what do I actually need" answer

- **Minimum to see it run locally:** just `MONGODB_URI` + a generated `JWT_SECRET`.
  Everything else has a default or is only for on-chain rewards.
- **To show real on-chain staking/slashing:** also do §3 local deploy + §4 funding.
- **To show it on a public testnet:** add `POLYGON_RPC_URL` + `PRIVATE_KEY` + faucet POL.
- **API keys that cost nothing and are all optional:** PolygonScan (verify),
  Alchemy/Infura (nicer RPC), Resend (email alerts, Phase 5).
