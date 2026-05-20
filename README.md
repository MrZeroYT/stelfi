# Stelfi — Stellar Finance. Simplified.

A Web3 dApp on [Arc Testnet](https://testnet.arcscan.app) (Circle's USDC-native L1) with two features:

- **Stelfi Swap** — instant stablecoin FX exchange (USDC ↔ EURC and more)
- **Stelfi Predict** — binary prediction markets backed by USDC

## Live Contracts (Arc Testnet)

| Contract | Address |
|----------|---------|
| StelfiSwap | [`0x30392f8967CCdB6445B8378b1c733E9D72dDD426`](https://testnet.arcscan.app/address/0x30392f8967CCdB6445B8378b1c733E9D72dDD426) |
| StelfiPredict | [`0x633ea9a9dCa134349de7D1F941Ea5981Bc7b45fC`](https://testnet.arcscan.app/address/0x633ea9a9dCa134349de7D1F941Ea5981Bc7b45fC) |

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Web3**: wagmi v2, viem, RainbowKit
- **Contracts**: Solidity 0.8.20, Hardhat 2.x, OpenZeppelin
- **Network**: Arc Testnet (Chain ID 5042002, USDC as native gas)

## Getting Started

### 1. Clone and install

```bash
git clone <your-repo-url>
cd stelfi
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
# Edit .env.local and fill in your contract addresses
```

### 3. Run development server

```bash
npm run dev
# Open http://localhost:3000
```

### 4. Get testnet USDC

Fund your wallet from the [Circle Faucet](https://faucet.circle.com) before making transactions.

## Smart Contracts

The contracts live in `contracts/` and use Hardhat 2.x.

```bash
cd contracts
npm install
npx hardhat test          # run all tests (47 pass)
npx hardhat compile       # compile contracts
```

To deploy your own instance:

```bash
cp contracts/.env.example contracts/.env
# Fill in PRIVATE_KEY and ARC_RPC_URL — never commit this file
npx hardhat run scripts/deployStelfiSwap.ts --network arcTestnet
npx hardhat run scripts/deployStelfiPredict.ts --network arcTestnet
npx hardhat run scripts/seedData.ts --network arcTestnet
```

## Deploying to Vercel

1. Push this repo to GitHub
2. Import on [vercel.com](https://vercel.com) — select the `stelfi/` root
3. Add **only** `NEXT_PUBLIC_*` variables in Vercel's Environment Variables UI
4. **Never** add `PRIVATE_KEY` to Vercel — contracts are already deployed

## Security Notes

- Private keys stay in `contracts/.env` on your local machine only
- `.env.local` and `contracts/.env` are both in `.gitignore`
- No secrets are hardcoded anywhere in the source
