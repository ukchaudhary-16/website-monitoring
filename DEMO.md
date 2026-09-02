# Live Demo Walkthrough (for the examiner)

~8–10 minutes. Two strong beats: **(A)** real distributed checks landing live on the
dashboard, and **(B)** peer consensus catching a dishonest node and slashing its stake.

## Before the examiner arrives

```bash
npm run install:all                 # once
```

Terminal 1 — local chain:
```bash
npm run node                        # keep running; note account #0 private key
```

Terminal 2 — deploy + fund 3 node wallets:
```bash
npm run demo:setup                  # NODES=3; prints paste-ready .env blocks
```
Copy the `backend/.env` block into `backend/.env` (add `SETTLEMENT_PRIVATE_KEY` =
account #0 key from Terminal 1). Copy each `node-agent #N` block into a separate
checkout/copy of `node-agent/` (or the same folder with different `WALLET_FILE` /
`DASHBOARD_PORT`).

Terminal 3 — backend (needs `MONGODB_URI`):
```bash
cd backend && npm run seed && npm run dev
```

Terminal 4 — frontend:
```bash
cd frontend && npm run dev          # http://localhost:3000
```

Terminals 5–7 — the three nodes:
```bash
cd node-agent && node src/index.js register && node src/index.js start --dashboard
```

## Script

1. **The network is real** — open http://localhost:3000. World map shows nodes in 3
   regions. Open each node dashboard (`:5055`, `:5056`, `:5057`) — stake, region,
   heartbeat, empty job log.

2. **Add a site** — sign up (or log in `demo@example.com` / `password123`), add
   `https://example.com`, region matching your nodes, interval 60s.

3. **Watch checks flow** — within a minute the scheduler creates jobs; node
   dashboards show `example.com -> UP`, then the site page shows a response-time
   point and `up` status. Refresh a couple of times to build the graph.

4. **On-chain proof** — in a Hardhat console (or the node logs with
   `SUBMIT_ONCHAIN=true`) show `submitResult` / `settleConsensus` txs and a node's
   MON balance going up:
   ```bash
   npx hardhat console --network localhost
   > const t = await ethers.getContractAt("MonitorToken", "<token addr>")
   > await t.balanceOf("<node addr>")     // grew by rewardPerSubmission per honest job
   ```

5. **Catch a bad node** (the money shot) — stop node #3, set `FORCE_STATUS=down` in
   its `.env`, restart it. It now reports the site DOWN while #1 and #2 report UP.
   After the next settlement:
   - site stays **up** (majority wins — a single bad node can't move it),
   - node #3's `stakedAmount` drops 10% (`NodeSlashed` event / its dashboard),
   - nodes #1 and #2 are rewarded.
   This is consensus doing its job.

6. **Alerting** — on the site page click **Send test alert** (or actually take the
   monitored URL down). With no email provider configured the alert prints in the
   backend console; the site's alert-history table records it. Show the flap
   protection note (needs 2 consecutive settlements to flip).

7. **Recap** — contracts (`npm test` → 32 passing, incl. the E2E slof/reward test),
   the four moving parts, and why "real nodes in real places" beats cloud pingers.

## Fallbacks

- Only 1 node available → set `CONSENSUS_MIN_SUBMISSIONS=1` in `backend/.env`; skip beat 5.
- No MongoDB → run `npm test` and walk through `test/E2E.integration.test.js` instead.
- Puppeteer won't launch → set `HEADLESS=true` and ensure system libs (SETUP §0);
  the HTTP check still works, render just reports skipped.
