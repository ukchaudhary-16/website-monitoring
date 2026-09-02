# DePIN Monitor — Frontend (Phase 4)

Next.js 14 (App Router) customer platform.

## Setup

```bash
cd frontend
npm install
cp .env.example .env.local   # NEXT_PUBLIC_API_URL -> backend
npm run dev                  # http://localhost:3000
```

Backend (Phase 2) must be running. Seed it (`cd backend && npm run seed`) for a
populated world map; log in as `demo@example.com` / `password123`.

## Pages

| Route | Purpose |
|---|---|
| `/` | Landing — live **world map** (`react-simple-maps`) of node density per region, network stats, auto-refresh every 15s (`/api/public/network`) |
| `/nodes` | How to run a validator node |
| `/register`, `/login` | Auth — JWT stored in `localStorage` |
| `/dashboard` | Site list, add-site flow (plan-gated regions/interval/count), **mock plan selection** |
| `/dashboard/[id]` | Uptime %, response-time chart (Recharts), per-region breakdown, incident timeline |

## Notes

- World-map topology is fetched at runtime from the `world-atlas` CDN.
- Wallet connect (RainbowKit/wagmi) for node operators is out of scope here — node
  staking is done from the `node-agent` CLI. The `/register` form takes an optional
  wallet address for the customer record.
