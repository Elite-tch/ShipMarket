# ShipQuest Implementation Plan

**Overview:** ShipQuest is a gamified Web3 platform where users complete micro-tasks to earn SHIP-based rewards (or a Devnet Test token for now).
**Blockchain:** Solana
**Backend/DB:** Firebase
**Brand Color:** `#5dcd90` (Green)
**UI Style:** Clean, simple, and modern

---

## 🟢 Phase 1: Project Setup & Foundation
- [x] Initialize Next.js project with App Router.
- [x] Set up Tailwind CSS for styling (incorporating brand color `#5dcd90`).
- [x] Install and configure Solana Wallet Adapter (Phantom, Solflare, etc.).
- [x] Initialize Firebase project and integrate Firebase Admin & Client SDKs.
- [x] Create basic global layout (Navbar, Footer, Wallet Connect button).

## 🟢 Phase 2: Firebase Database & Auth
- [x] Design Firebase Firestore database schema:
  - `Users` (wallet address, level, xp, connected socials).
  - `Campaigns` (title, description, reward pool).
  - `Tasks` (campaign_id, type, points/tokens, requirements).
  - `UserTasks` (status: pending/completed, proofs).
- [x] Implement Sign-In with Solana (SIWS) to authenticate users securely.
- [x] Create User Profile page (displaying XP, Level, and Task history).

## 🟢 Phase 3: Smart Contract (Anchor Program)
- [x] Setup local Solana development environment (Rust, Anchor, Solana CLI).
- [x] Mint a custom SPL token on Devnet (TestSHIP) for testing.
- [x] Write Anchor Smart Contract:
  - `Initialize Campaign Vault`: Deposit Devnet tokens into a PDA.
  - `Claim Reward`: Allowing authorized wallets or valid signatures to claim Devnet tokens.
- [x] Deploy Smart Contract to Solana Devnet.
- [/] Integrate Smart Contract with Frontend using `anchor-client`.

## 🟢 Phase 4: Core Platform Features (The Quest Engine)
- [x] Build the "Quest Hub" UI (Dashboard showing available tasks).
- [x] Implement Task detail pages (Show instructions, requirements, rewards).
- [x] Implement off-chain task verification flow:
  - User submits proof (URL, screenshot, or click to verify).
  - Firebase updates status to "Pending" or "Completed".
- [x] Build an Admin Dashboard UI (to manually approve tasks and fund campaigns).

## 🟢 Phase 5: On-Chain Settlement & Polish
- [x] Connect Firebase completion status to the Smart Contract `Claim Reward` function.
- [x] Add gamification UI elements (Level up notifications, XP progress bars).
- [x] Implement responsive design checks (Mobile friendly).
- [x] Final testing on Solana Devnet.
- [x] Launch the MVP (Platform ready for user onboarding).
