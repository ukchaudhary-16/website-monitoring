# Blockchain: how it works & how to deploy it

Covers (1) what the contracts do and how the app talks to them, (2) running it all
on a **local** chain, and (3) deploying to the **Polygon Amoy** public testnet.

---

## Part 1 — How the chain integration works

### The two contracts

| Contract | Role |
|---|---|
| `MonitorToken` (`MON`) | ERC-20. 1,000,000 minted to the deployer (treasury). The registry can `mint` (rewards) and `burnFrom` (slashing). |
| `MonitorRegistry` | Node staking, job records, and `settleConsensus` — the reward/slash engine. Owned by the backend's wallet. |

`scripts/deploy.js` deploys both and calls `token.setMonitorRegistry(registry)` so
the token knows who's allowed to mint/burn. Addresses are written to
`deployments/<network>.json`.

### Who holds which key

| Actor | Wallet | Used for |
|---|---|---|
| **Deployer / owner** | `PRIVATE_KEY` in `/.env` | deploying; becomes `owner` of both contracts. Also used by the backend as `SETTLEMENT_PRIVATE_KEY` to call `createJob` and `settleConsensus`. |
| **Each node** | `PRIVATE_KEY` in that node's `node-agent/.env` (or an auto-generated `node-wallet.json`) | `approve` + `registerNode` (staking), and `submitResult` when `SUBMIT_ONCHAIN=true`. |

### The on-chain lifecycle of one check

```
backend scheduler ──createJob(url, region)──────────►  MonitorRegistry
                                                       emits JobCreated(jobId)
                                                              │
node agent ──approve(stake)──►  once, at registration          │
node agent ──registerNode(region)──►  stake moves on-chain     │
                                                              │
node agent ──submitResult(jobId, up/down, hash, sig)──────────►│  (×N nodes)
                                                              │
backend settlement worker ──settleConsensus(jobId)───────────►│
                                                       majority wins:
                                                       • agree  → token.mint(node, 1 MON)
                                                       • outlier → stake −10%, burnFrom(registry)
                                                       emits ConsensusSettled / NodeRewarded / NodeSlashed
```

### Where the code lives

| Concern | File |
|---|---|
| RPC provider, owner signer, contract handles | `backend/src/config/chain.js` |
| Mirroring `createJob` on-chain | `backend/src/services/scheduler.js` |
| Calling `settleConsensus` on-chain | `backend/src/services/settlementWorker.js` |
| Node staking / `submitResult` | `node-agent/src/chain.js` |
| Result hash + signature scheme (shared) | `backend/src/utils/verify.js` ↔ `node-agent/src/signer.js` |
| Network config (RPC, chainId, accounts) | `hardhat.config.js` |

### Important: the app works **without** the chain

If contract addresses aren't set, the backend still runs full off-chain consensus
and the dashboard works normally — the chain calls are simply skipped. The chain
adds the **token incentive layer** (real staking, rewards, slashing) on top.

---

## Part 2 — Run it on a local chain (no keys, no faucet)

Best for development and the day-to-day demo.

```bash
# terminal A — a local blockchain with 20 pre-funded accounts
npm run node

# terminal B — deploy + generate & fund 3 node wallets + print .env blocks
npm run demo:setup
```

`demo:setup` prints ready-to-paste blocks. Put the backend block in `backend/.env`
(add `SETTLEMENT_PRIVATE_KEY` = Hardhat "Account #0" private key shown in terminal
A), and each node block in a copy of `node-agent/.env`. Then:

```bash
cd backend && npm run dev
cd node-agent && node src/index.js register && node src/index.js start --dashboard
```

Watch rewards land:

```bash
npx hardhat console --network localhost
> const t = await ethers.getContractAt("MonitorToken", "<token address>")
> ethers.formatEther(await t.balanceOf("<a node address>"))   // grows per honest job
```

---

## Part 3 — Deploy to Polygon Amoy testnet

This is the "real blockchain" version the examiner can verify on a public explorer.

### 3.1 One-time wallet setup

1. Install **MetaMask** (browser extension).
2. Create (or use) an account. Copy its **private key**:
   MetaMask → ⋮ → Account details → Show private key. **Use a throwaway account** —
   never a wallet with real funds.
3. Add the Amoy network to MetaMask (Settings → Networks → Add, or via
   [chainlist.org](https://chainlist.org) → search "Amoy"):
   - Network name: `Polygon Amoy`
   - RPC URL: `https://rpc-amoy.polygon.technology`
   - Chain ID: `80002`
   - Currency symbol: `POL`
   - Explorer: `https://amoy.polygonscan.com`

### 3.2 Get free test POL (gas)

Go to **https://faucet.polygon.technology**, choose **Amoy**, paste your address,
request tokens. You need maybe 0.5 POL total. (Alchemy also has an Amoy faucet if
that one is dry.)

### 3.3 Configure `/.env` (repo root)

```
POLYGON_RPC_URL=https://rpc-amoy.polygon.technology
POLYGON_CHAIN_ID=80002
PRIVATE_KEY=<your throwaway account private key, NO 0x prefix>
POLYGONSCAN_API_KEY=<optional — from https://polygonscan.com/myapikey>
```

> A dedicated RPC from [Alchemy](https://alchemy.com) or [Infura](https://infura.io)
> (free tier) is more reliable than the public URL for repeated calls — create an
> "Polygon Amoy" app and use its HTTPS URL as `POLYGON_RPC_URL`.

### 3.4 Deploy

```bash
npm run compile
npm run deploy:mumbai        # the network is named "mumbai" in config but targets Amoy 80002
```

Output (also saved to `deployments/mumbai.json`):

```
MonitorToken: 0x....
MonitorRegistry: 0x....
Linked registry -> token
```

### 3.5 (Optional) Verify the source on PolygonScan

Makes the contract code publicly readable on the explorer.

```bash
npx hardhat verify --network mumbai <MonitorToken address> "1000000000000000000000000"
npx hardhat verify --network mumbai <MonitorRegistry address> <MonitorToken address>
```

(`1000000000000000000000000` = 1,000,000 × 10^18, the constructor's `initialSupply`.)

### 3.6 Point the backend at the deployed contracts

In `backend/.env`:

```
CHAIN_RPC_URL=https://rpc-amoy.polygon.technology
MONITOR_TOKEN_ADDRESS=<from deployments/mumbai.json>
MONITOR_REGISTRY_ADDRESS=<from deployments/mumbai.json>
SETTLEMENT_PRIVATE_KEY=<same throwaway key you deployed with — it's the owner>
CONSENSUS_MIN_SUBMISSIONS=3
```

Restart the backend. It will now mirror `createJob` and call `settleConsensus`
on Amoy.

### 3.7 Fund and connect nodes

Each node needs **MON to stake** and **a little POL for gas**.

1. Send POL to each node wallet (from the faucet, or split from your deployer).
2. Send MON to each node wallet from the treasury:
   ```bash
   npx hardhat console --network mumbai
   > const t = await ethers.getContractAt("MonitorToken", "<token address>")
   > await t.transfer("<node wallet>", ethers.parseEther("200"))
   ```
3. In each `node-agent/.env`:
   ```
   CHAIN_RPC_URL=https://rpc-amoy.polygon.technology
   MONITOR_TOKEN_ADDRESS=<...>
   MONITOR_REGISTRY_ADDRESS=<...>
   PRIVATE_KEY=<that node's wallet key>
   SUBMIT_ONCHAIN=true
   ```
4. `node src/index.js register` → you'll see the `approve` and `registerNode`
   transactions confirm. `node src/index.js start`.

### 3.8 Show the examiner

On **https://amoy.polygonscan.com**, search the `MonitorRegistry` address →
**Transactions** / **Events** tab. They can see, on a public chain they don't
control:

- `NodeRegistered` events (real stakes locked)
- `ResultSubmitted` events (nodes voting)
- `ConsensusSettled` + `NodeRewarded` / `NodeSlashed` events
- a node's growing `MON` balance under the **Token** holdings

That's the whole pitch: the uptime data is backed by verifiable on-chain economics.

---

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `insufficient funds for gas` on deploy | deployer wallet has no POL — use the faucet |
| `could not detect network` | bad `POLYGON_RPC_URL`; try an Alchemy/Infura URL |
| deploy hangs | public RPC is congested; switch RPC or retry |
| node `register` reverts on `registerNode` | node wallet has < `minimumStake` MON, or already registered |
| backend logs `on-chain createJob failed` | `SETTLEMENT_PRIVATE_KEY` unset/not the owner, or no POL for gas |
| `settleConsensus` reverts `Insufficient submissions` | fewer than 3 nodes submitted **on-chain** for that job (need `SUBMIT_ONCHAIN=true` on ≥ 3 nodes) |
| want a smaller demo | as owner: `registry.setMinimumStake(ethers.parseEther("10"))` and set `CONSENSUS_MIN_SUBMISSIONS` lower |

> **Mumbai vs Amoy:** the old Polygon Mumbai testnet was shut down in 2024. The
> npm script is still called `deploy:mumbai` for continuity, but `hardhat.config.js`
> defaults that network to **Amoy (chain 80002)**. Override with `POLYGON_RPC_URL`
> / `POLYGON_CHAIN_ID` if you ever need a different network.
