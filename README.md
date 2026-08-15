# SMART TRADING SYSTEM — MT5 EA + GEMINI AI GATEWAY + PERSIAN RTL DASHBOARD

An intelligent trading assistant and automated trading platform for MetaTrader 5 (MT5), integrating multi-timeframe Market Structure, Fair Value Gap (FVG), Order Block, Liquidity, Support/Resistance analysis with server-side Gemini AI context validation, a Persian RTL dashboard, and an Electron Windows desktop companion.

---

## 🌟 CORE ARCHITECTURE PRINCIPLE

```
MetaTrader 5 (MQL5 EA)
        │
  (HTTPS WebRequest)
        ▼
Express Backend Gateway (Port 3000)
  ├── Key Pool Manager (Slot 1..30 Rotation)
  ├── Strategy & Scoring Engine (0-100 Score)
  ├── Risk & Discipline Engine (12 Deterministic Checks)
  └── Audit Logger & Realtime Stream (SSE)
        │
  (@google/genai SDK)
        ▼
   Gemini AI API
```

> **CRITICAL SECURITY RULE**: Gemini API keys exist **ONLY** on the server side in environment variables (`GEMINI_API_KEY_01` .. `30` or `GEMINI_API_KEY`). They are **NEVER** embedded in MQL5 source code, EX5 binaries, React client code, or Electron renderer.

---

## 🚀 MODES OF OPERATION

1. **MODE A — ANALYSIS / ASSISTANT MODE (`AutoTrading = false` in EA)**
   - The system analyzes market structure, MTF alignment, FVG, OB, Liquidity, and News.
   - Calculates a 0–100 Setup Score.
   - Requests Gemini AI context analysis when Score >= 80.
   - Displays recommendations, warnings, and invalidation rules in the Persian RTL dashboard.
   - **NO automatic order is placed.**

2. **MODE B — AUTOMATIC TRADING MODE (`AutoTrading = true` in EA)**
   - Performs full analysis and Gemini AI evaluation.
   - Passes through 12 deterministic Risk Engine checks.
   - EA executes broker orders through MT5.
   - Continuous trade management: 50% partial close at 1.5R + protected stop loss movement + runner position.

---

## 📁 REPOSITORY STRUCTURE

```
/
├── server.ts                   # Express Backend Entrypoint with Vite Middleware
├── server/
│   ├── geminiGateway.ts        # Server-side Gemini AI Gateway & Fallback
│   ├── geminiKeyPool.ts        # Key Pool Manager (1..30 Keys, Cooldowns, Rotation)
│   ├── strategyEngine.ts      # Deterministic 0-100 Setup Scoring Engine
│   ├── riskEngine.ts          # 12-Check Deterministic Risk Engine
│   ├── newsProvider.ts        # Macro Economic News Calendar & Filters
│   ├── auditLogger.ts         # Event Ingestion & Traceability Matrix
│   ├── db.ts                  # Persistent Events & Performance Database
│   └── realtimeStream.ts      # Server-Sent Events (SSE) Broadcast Manager
├── shared/
│   ├── schemas.ts             # Zod Validation Schemas
│   ├── types.ts               # Shared TypeScript Types
│   └── constants.ts           # Strategy Weights & Risk Parameters
├── mt5/
│   ├── SmartTraderEA.mq5      # Production MQL5 EA Source Code
│   └── include/               # Modular MQH Include Headers
├── src/                        # Persian RTL React Web Dashboard
│   ├── components/            # Area A, Area B, Live Console, Reports, Debug, Health
│   ├── App.tsx                # Main App Shell & SSE Stream Hook
│   └── index.css              # Tailwind CSS & Vazirmatn RTL Styling
├── desktop/                    # Windows Electron Companion Console
├── tests/                      # Automated Strategy & Risk Unit Tests
├── docs/                       # Complete Architecture & API Documentation
└── TECHNICAL_REPORT.md         # Mandatory 55-Point Technical Implementation Report
```

---

## ⚙️ ENVIRONMENT VARIABLES (`.env.example`)

```env
# Gemini API Key Pool Configuration
GEMINI_API_KEY="YOUR_PRIMARY_GEMINI_KEY"
GEMINI_API_KEY_01="YOUR_KEY_01"
GEMINI_API_KEY_02="YOUR_KEY_02"
GEMINI_API_KEY_03="YOUR_KEY_03"

# Model Selection
GEMINI_MODEL="gemini-3.6-flash"

# Application URL
APP_URL="https://ais-dev-ddcrbo4v27f3taylopdsfp-177761109571.europe-west2.run.app"
```

---

## 🛠️ QUICKSTART & DEVELOPMENT

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start Full-Stack Development Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in browser.

3. **Run Unit Tests**:
   ```bash
   npx tsx tests/strategyEngine.test.ts
   npx tsx tests/riskEngine.test.ts
   ```

4. **Build Production Bundle**:
   ```bash
   npm run build
   ```

---

## 📌 MT5 EA INSTALLATION

1. Copy `mt5/SmartTraderEA.mq5` and `mt5/include/` into your MetaTrader 5 `MQL5/Experts/` folder.
2. In MT5, go to **Tools -> Options -> Expert Advisors** and enable:
   - `Allow Algo Trading`
   - `Allow WebRequest for listed URL:` Add `https://ais-dev-ddcrbo4v27f3taylopdsfp-177761109571.europe-west2.run.app`
3. Attach `SmartTraderEA` to a chart (e.g. XAUUSD M5).
4. Configure `InpBackendUrl` to your backend URL.
