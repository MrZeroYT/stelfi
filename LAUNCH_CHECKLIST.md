# Stelfi Launch Checklist

## Contracts (Arc Testnet) ✅
- [x] StelfiSwap deployed: `0x30392f8967CCdB6445B8378b1c733E9D72dDD426`
- [x] StelfiPredict deployed: `0x633ea9a9dCa134349de7D1F941Ea5981Bc7b45fC`
- [x] 3 prediction markets seeded
- [x] USDC ↔ EURC swap pairs registered (rates: 0.923 / 1.083)
- [x] 47 contract tests passing

## Frontend ✅
- [x] Production build passes (`npm run build`) — zero errors
- [x] Swap page: live rate from contract + mock fallback
- [x] Predict page: live markets from contract + mock fallback
- [x] RainbowKit wallet connect (Arc Testnet only)
- [x] 2-step tx flow: approve → swap / approve → bet
- [x] ArcScan tx links on success

## Security ✅
- [x] No private keys hardcoded in source
- [x] `.env.local` excluded by `.gitignore`
- [x] `contracts/.env` excluded by `contracts/.gitignore`
- [x] Only `NEXT_PUBLIC_*` vars committed / added to Vercel
- [x] `.env.example` committed as safe reference template

## Git & GitHub ✅
- [x] Repo initialized with clean history
- [x] Pushed to https://github.com/MrZeroYT/stelfi
- [x] Branch: `main`

## Vercel Deployment
- [ ] Import repo at vercel.com
- [ ] Set 5x NEXT_PUBLIC_* environment variables
- [ ] Deploy and confirm live URL works
- [ ] Test wallet connect on deployed URL
- [ ] Test swap flow end-to-end on Arc Testnet
- [ ] Test predict / bet flow end-to-end on Arc Testnet

## Post-Launch (optional)
- [ ] Replace placeholder TOKEN_ADDRESSES (BRLA, MXNB, PHPC, JPYC, KRW1) with real Arc addresses once available
- [ ] Add more prediction markets via `seedData.ts`
- [ ] Show real-time wallet USDC balance in swap UI
- [ ] Add transaction history page
