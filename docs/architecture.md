# SYSTEM ARCHITECTURE DOCUMENTATION

## 1. High-Level System Topology

```
┌─────────────────────────────────────────────────────────────┐
│                 MetaTrader 5 Terminal (MT5)                 │
│  SmartTraderEA.mq5                                          │
│  - Multi-Timeframe Analysis (H4, M15, M5)                   │
│  - Market Structure, FVG, OB, Liquidity                     │
│  - Chart Info Overlay Panel                                 │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS WebRequest
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Express Backend Gateway (Port 3000)         │
│  - POST /api/v1/ea/market-snapshot                          │
│  - Deterministic Strategy Engine (0-100 Score)              │
│  - Deterministic Risk & Discipline Engine                   │
│  - Key Pool Manager (Slot 1..30 Rotation & Cooldown)        │
│  - Audit Logger & Event Ingestion                           │
└──────────────────────┬──────────────────────┬───────────────┘
                       │                      │ SSE Event Stream
        @google/genai  │                      │
                       ▼                      ▼
┌──────────────────────────────┐    ┌──────────────────────────┐
│        Gemini AI API         │    │  Persian RTL Dashboard   │
│  - Model: gemini-3.6-flash   │    │  & Windows Electron App  │
│  - Schema-Constrained Output │    │  - Area A (Analysis)     │
│  - Prompt Version: v1.0      │    │  - Area B (AutoTrader)   │
└──────────────────────────────┘    └──────────────────────────┘
```

## 2. Core Security & Architectural Principles

1. **Server-Side API Key Management**:
   Gemini API keys are maintained strictly on the server in environment variables (`GEMINI_API_KEY_01` .. `30`). They are never exposed to browser bundles, MQL5 binaries, or Electron renderers.

2. **Deterministic Risk Protection**:
   Gemini provides contextual recommendations, but cannot bypass risk parameters (max lot size, max drawdown, minimum stop loss, news block window, or max open positions).

3. **Event-Driven AI Analysis**:
   AI requests occur only when a setup achieves a score >= 80 or when a major market structure shift is detected.
