# AgentNation — Multi-Agent Policy Intelligence Engine

> A multi-agent AI system that evaluates, compares, and monitors Saudi Vision 2030 workforce policies using LLM-powered specialist agents, RAG-grounded retrieval, and a Knowledge Graph for cross-policy conflict detection.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Use Cases](#use-cases)
  - [UC1 — Policy Workforce Impact Assessment](#uc1--policy-workforce-impact-assessment)
  - [UC2 — Policy Scenario Comparison](#uc2--policy-scenario-comparison)
  - [UC3 — Workforce Portfolio Risk Monitor](#uc3--workforce-portfolio-risk-monitor)
- [Agent Roster](#agent-roster)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [RAG Ingestion](#rag-ingestion)
  - [Frontend Setup](#frontend-setup)
  - [Running with Docker](#running-with-docker)
- [API Reference](#api-reference)
- [Data & Memory](#data--memory)
- [RAG & Knowledge Graph](#rag--knowledge-graph)
- [Frontend Pages](#frontend-pages)
- [Configuration](#configuration)
- [Testing](#testing)
- [Contributing](#contributing)

---

## Overview

**AgentNation** is a policy intelligence platform built for Saudi Arabian workforce planning. It exposes three fully-automated agent pipelines that help policy teams answer three core questions:

1. **Is this policy safe to deploy?** — UC1 runs a single policy through a multi-step risk assessment pipeline.
2. **Which implementation strategy is best?** — UC2 generates and compares three policy scenarios side-by-side.
3. **Are our active policies conflicting with each other?** — UC3 analyzes a portfolio of policies for structural tensions and cross-policy risk.

Every pipeline is powered by **Google Gemini** for LLM reasoning, a **ChromaDB** vector store with 40+ grounding documents for RAG retrieval, and a **NetworkX** Knowledge Graph encoding Saudi sector–workforce relationships.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        React Frontend                           │
│   Dashboard · UC1 Simulation · UC2 Scenarios · UC3 Portfolio    │
└───────────────────────────┬─────────────────────────────────────┘
                            │ REST/JSON
┌───────────────────────────▼─────────────────────────────────────┐
│                    FastAPI Backend (server.py)                  │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐     │
│  │   Use Case 1 │  │   Use Case 2 │  │    Use Case 3      │     │
│  │  PAA→WIA→MAA │  │  SGA→WIA→MAA │  │  WIA→MAA per-      │     │
│  │  →[ORA]→COA  │  │  →CAA→[ORA]  │  │  policy → PRA→ORA  │     │
│  └──────┬───────┘  └──────┬───────┘  └────────┬───────────┘     │
│         │                 │                   │                 │
│  ┌──────▼─────────────────▼────────────────────▼───────────┐    │
│  │               Shared Infrastructure                     │    │
│  │  ┌──────────────┐  ┌───────────────┐  ┌──────────────┐  │    │
│  │  │  Gemini LLM  │  │  ChromaDB RAG │  │ NetworkX KG  │  │    │
│  │  │  (llm.py)    │  │  (retriever)  │  │ (knowledge_  │  │    │
│  │  │              │  │               │  │  graph.py)   │  │    │
│  │  └──────────────┘  └───────────────┘  └──────────────┘  │    │
│  │  ┌────────────────────────────────────────────────────┐ │    │
│  │  │          Memory / History (simulation_log.json)    | │    │
│  │  └────────────────────────────────────────────────────┘ │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Use Cases

### UC1 — Policy Workforce Impact Assessment

**Endpoint:** `POST /usecase1/run`

Evaluates a single policy against current workforce capacity and budget constraints. The pipeline branches into one of three paths based on risk severity:

| Path | Trigger | Agents Activated |
|------|---------|-----------------|
| **Path A** — Early Exit | WIA metrics all clean | PAA → WIA → COA |
| **Path B** — Monitor | Severity score 30–60 | PAA → WIA → MAA → COA |
| **Path C** — Escalate | Severity score > 60 | PAA → WIA → MAA → ORA → COA |

**Input:**
```json
{
  "policy_title": "Healthcare Saudization Initiative",
  "policy_description": "Mandate 40% Saudi nationals in all clinical roles by 2027",
  "sector": "healthcare",
  "time_horizon": "medium",
  "constraints": {
    "budget_limit": 0.15,
    "workforce_capacity": 0.10
  }
}
```

**Output:** Full pipeline result including PAA analysis, WIA metrics, MAA risk scores, optional ORA alternatives, and COA recommendation with `decision_path`.

---

### UC2 — Policy Scenario Comparison

**Endpoints:**
- `POST /usecase2/run` — Generate and compare 3 implementation scenarios
- `POST /usecase2/hybrid` — On-demand synthesis of a hybrid scenario (user-triggered)

Given a policy goal and sector, **SGA** (Scenario Generation Agent) creates three contrasting scenarios (e.g., aggressive/phased/gradual), each gets a full WIA+MAA evaluation, and **CAA** (Comparative Assessment Agent) ranks them. The user can then optionally trigger **ORA** to synthesize a hybrid strategy.

**Input:**
```json
{
  "sector": "technology",
  "policy_goal": "Grow Saudi software engineers by 35%",
  "target_growth_pct": 35,
  "priority": "balanced"
}
```

---

### UC3 — Workforce Portfolio Risk Monitor

**Endpoint:** `POST /usecase3/run`

Accepts 3–10 policies (from simulation history or direct input) and detects cross-policy conflicts: workforce overlap, capacity overload, training bottlenecks, budget concentration. The **Knowledge Graph** is used to find shared sector/workforce dependencies. **PRA** scores portfolio-level risk; **ORA** generates resolution recommendations.

**Two input modes:**

- **Option A (Historical):** Select from previous UC1/UC2 simulations stored in `simulation_log.json`
- **Option B (Direct):** Submit simplified policy specs without running UC1 first

```json
{
  "input_mode": "direct",
  "policies": [
    { "policy_id": "p1", "sector": "healthcare", "target_growth_pct": 20, "budget_limit": 0.15 },
    { "policy_id": "p2", "sector": "healthcare", "target_growth_pct": 15, "budget_limit": 0.12 }
  ]
}
```

---

## Agent Roster

| Agent | Code | Role | Use Cases |
|-------|------|------|-----------|
| **COA** | `coa.py` | Coordination & Oversight — orchestrates pipeline, applies branching logic, saves to history | UC1, UC2, UC3 |
| **PAA** | `paa.py` | Policy Analysis — extracts objectives, domains, complexity via LLM + RAG | UC1, UC2 (via SGA) |
| **WIA** | `wia.py` | Workforce Intelligence — computes pressure index, budget stress, training capacity ratio | UC1, UC2, UC3 |
| **MAA** | `maa.py` | Monitoring & Assessment — scores severity (0–100), classifies risk, triggers recommendation | UC1, UC2, UC3 |
| **ORA** | `ora.py` | Options & Recommendations — generates policy alternatives or hybrid strategies via LLM + RAG | UC1 (Path C), UC2 (hybrid), UC3 |
| **SGA** | `sga.py` | Scenario Generation — creates 3 contrasting implementation scenarios using LLM + RAG | UC2 |
| **CAA** | `caa.py` | Comparative Assessment — ranks scenarios, identifies best fit, recommends hybrid | UC2 |
| **PRA** | `pra.py` | Portfolio Risk — detects conflict clusters, scores portfolio risk, maps sector pressure | UC3 |

---

## Tech Stack

**Backend**
- Python 3.12
- FastAPI + Uvicorn
- Pydantic v2 (validation & serialization)
- Google Gemini (`gemini-2.5-flash`) via `google-generativeai`
- ChromaDB (persistent vector store)
- LangChain + `langchain-google-genai` (document ingestion & embeddings)
- NetworkX (Knowledge Graph)
- python-dotenv

**Frontend**
- React 18 + TypeScript
- Vite (build tool)
- React Router v6
- TanStack Query v5
- Tailwind CSS v3 + shadcn/ui
- Framer Motion (pipeline animations)
- Recharts (data visualizations)
- React Hook Form + Zod

**Infrastructure**
- Docker + Docker Compose
- GitHub Actions (CI)

---

## Project Structure

```
agentnation/
├── backend/
│   ├── server.py                        # FastAPI app entry point, all routes
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── .env.example
│   ├── app/
│   │   ├── core/
│   │   │   └── config.py               # Centralized settings (env vars)
│   │   └── usecases/
│   │       ├── usecase1/               # UC1 — Policy Workforce Impact Assessment
│   │       │   ├── schemas.py          # Pydantic models: UseCase1Input → FinalResponse
│   │       │   ├── llm.py              # Gemini wrapper with timeout & caching
│   │       │   ├── coa.py              # Orchestrator — branching logic (Path A/B/C)
│   │       │   ├── paa.py              # Policy Analysis Agent (LLM + RAG)
│   │       │   ├── wia.py              # Workforce Intelligence Agent (numeric + LLM)
│   │       │   ├── maa.py              # Monitoring & Assessment Agent
│   │       │   ├── ora.py              # Options & Recommendations Agent (LLM + RAG)
│   │       │   └── workforce_db.json   # Saudi sector workforce baseline data
│   │       ├── usecase2/               # UC2 — Policy Scenario Comparison
│   │       │   ├── schemas.py          # PolicyIntent → UC2FinalResponse
│   │       │   ├── coa.py              # Orchestrator — runs 3 scenarios in parallel
│   │       │   ├── sga.py              # Scenario Generation Agent
│   │       │   ├── caa.py              # Comparative Assessment Agent
│   │       │   └── ora.py              # Hybrid synthesis ORA
│   │       └── usecase3/               # UC3 — Portfolio Risk Monitor
│   │           ├── schemas.py          # UC3Input → UC3FinalResponse
│   │           ├── coa.py              # Orchestrator — per-policy WIA/MAA loop
│   │           ├── input_resolver.py   # Unifies historical + direct input modes
│   │           ├── pra.py              # Portfolio Risk Agent (KG + conflict detection)
│   │           └── ora.py              # Portfolio-level recommendations
│   ├── memory/
│   │   ├── history_manager.py          # Read/write simulation_log.json
│   │   └── simulation_log.json         # Persistent simulation history (gitignored)
│   └── rag/
│       ├── ingest.py                   # One-time ingestion: PDFs → ChromaDB
│       ├── retriever.py                # ChromaDB query interface (lazy-loaded)
│       ├── knowledge_graph.py          # NetworkX KG builder and query helpers
│       ├── kg_data.py                  # Static KG data (sectors, workforce types)
│       ├── chroma_db/                  # Vector store (gitignored — run ingest.py)
│       └── documents/                  # Source PDFs (gitignored — add your own)
│           ├── paa/                    # Documents for PAA agent retrieval
│           ├── ora/                    # Documents for ORA agent retrieval
│           ├── caa/                    # Documents for CAA agent retrieval
│           └── sga/                    # Documents for SGA agent retrieval
│
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── public/
│   │   └── logo.png
│   └── src/
│       ├── App.tsx                     # Router + providers
│       ├── main.tsx
│       ├── index.css                   # Tailwind base + CSS vars
│       ├── services/
│       │   ├── api.ts                  # UC1 + dashboard API calls
│       │   ├── uc2api.ts               # UC2 API calls
│       │   └── uc3api.ts               # UC3 API calls
│       ├── types/
│       │   ├── agentTypes.ts           # UC1 TypeScript types
│       │   ├── uc2Types.ts             # UC2 TypeScript types
│       │   └── uc3Types.ts             # UC3 TypeScript types
│       ├── pages/
│       │   ├── Dashboard.tsx           # Home — stats, recent simulations
│       │   ├── PolicySimulation.tsx    # UC1 — form + animated pipeline
│       │   ├── UC2Dashboard.tsx        # UC2 — scenario comparison
│       │   ├── UC3Dashboard.tsx        # UC3 — portfolio risk analysis
│       │   ├── Reports.tsx             # All simulation history
│       │   └── Settings.tsx            # API key config + log management
│       ├── components/
│       │   ├── DashboardLayout.tsx     # Sidebar + top bar shell
│       │   ├── TopBar.tsx
│       │   ├── NavLink.tsx
│       │   ├── PipelineFlow.tsx        # UC1 animated agent pipeline
│       │   ├── AgentNode.tsx           # Single animated agent node
│       │   ├── ConnectorLine.tsx       # Animated edge between nodes
│       │   ├── PolicyForm.tsx          # UC1 input form
│       │   ├── FinalDecisionPanel.tsx  # UC1 final result
│       │   ├── AgentOutputs/           # UC1 per-agent output panels
│       │   ├── uc2/                    # UC2 components
│       │   └── uc3/                    # UC3 components
│       ├── hooks/
│       │   ├── use-mobile.tsx
│       │   └── use-toast.ts
│       └── lib/
│           ├── utils.ts                # clsx/tailwind-merge helpers
│           └── settings.ts            # Frontend settings (API base URL, etc.)
│
├── docs/
│   ├── architecture.md
│   ├── agents.md
│   └── rag-setup.md
├── docker-compose.yml
├── .gitignore
└── README.md
```

---

## Getting Started

### Prerequisites

- Python 3.12+
- Node.js 20+ (or Bun)
- A **Google Gemini API key** — [get one here](https://aistudio.google.com/app/apikey)

---

### Backend Setup

```bash
cd backend

# 1. Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env
# Edit .env and paste your Gemini API key

# 4. Start the server
python server.py
# → API running at http://localhost:8000
# → Docs at http://localhost:8000/docs
```

---

### RAG Ingestion

The RAG system requires running a one-time ingestion script to embed your documents into ChromaDB. The `rag/documents/` directory contains subdirectories for each agent (`paa/`, `ora/`, `caa/`, `sga/`) — place relevant PDFs there before ingesting.

```bash
# From the backend/ directory, with .venv active
python rag/ingest.py
```

This will:
1. Walk all `rag/documents/**/*.pdf` files
2. Split them into chunks using LangChain's `RecursiveCharacterTextSplitter`
3. Embed each chunk with `gemini-embedding-001`
4. Persist to `rag/chroma_db/`

> **Note:** If you skip this step, the system will still work — agents fall back gracefully to LLM-only mode without RAG grounding. You will see a `[RAG] ChromaDB not available` log line.

**Recommended documents per agent folder:**

| Folder | What to put there |
|--------|------------------|
| `paa/` | Saudi labor market reports, HRSD publications, sector workforce statistics |
| `ora/` | Global workforce reskilling white papers, ILO reports, WEF reports |
| `caa/` | OECD employment outlooks, digital transformation strategy reports |
| `sga/` | HCDP delivery plans, HRDF annual reports, healthcare workforce stats |

---

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
# → App running at http://localhost:5173
```

The frontend expects the backend at `http://localhost:8000`. To change this, edit `frontend/src/lib/settings.ts`.

---

### Running with Docker

```bash
# From the repo root
cp backend/.env.example backend/.env
# Edit backend/.env with your API key

docker-compose up --build
# Backend: http://localhost:8000
# Frontend: http://localhost:3000
```

---

## API Reference

Full interactive documentation is auto-generated by FastAPI at **`http://localhost:8000/docs`**.

### System

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Engine status, version, available use cases |
| `GET` | `/health` | Health check |

### Use Case 1

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/usecase1/run` | Run policy workforce impact assessment |

### Use Case 2

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/usecase2/run` | Generate and compare 3 implementation scenarios |
| `POST` | `/usecase2/hybrid` | Generate hybrid scenario from existing results |

### Use Case 3

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/usecase3/run` | Analyze portfolio of policies for cross-policy risk |

### History & Dashboard

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/history/all` | All simulation history (UC1 + UC2 + UC3) |
| `GET` | `/api/history/selectable` | UC1 + UC2 simulations available for UC3 Option A |
| `GET` | `/api/dashboard/stats` | Pre-computed stats for dashboard homepage |
| `DELETE` | `/api/history/clear` | Permanently wipe simulation log |

---

## Data & Memory

All simulation results are automatically saved to `backend/memory/simulation_log.json` after each run. This file is the persistent memory of the system and serves two purposes:

1. **UC3 Option A input** — the history selector reads from it to let users pick past simulations as portfolio inputs.
2. **Dashboard stats** — `get_dashboard_stats()` aggregates counts, sector distribution, risk levels, and recent activity from it.

The file is gitignored (runtime data) but preserved across Docker restarts via a volume mount in `docker-compose.yml`.

To clear all history: call `DELETE /api/history/clear` or click "Clear Simulation Log" in the Settings page.

---

## RAG & Knowledge Graph

### RAG

The retrieval system (`rag/retriever.py`) connects to a persistent ChromaDB instance. Each query is routed to the correct agent's document subset using a metadata filter on the `agent_target` field set during ingestion. Chunks with a cosine distance > 0.85 are filtered out as irrelevant.

Agents that use RAG: **PAA**, **ORA**, **SGA**, **CAA**

### Knowledge Graph

`rag/knowledge_graph.py` builds a directed `networkx.DiGraph` encoding:
- **Sectors** → require → **Workforce Types**
- **Workforce Types** → have → **Capacity nodes**
- **Workforce Types** → trained by → **Training Institutions**
- **Policies** → target → **Sectors** (added at runtime by UC3 PRA)

UC3's **PRA** agent queries this graph to detect when multiple policies compete for the same workforce pool, training institution, or sector budget — surfacing conflicts that no single-policy analysis would catch.

---

## Frontend Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Dashboard | Overview stats, risk distribution chart, recent simulations |
| `/simulation` | Policy Simulation (UC1) | Input form → animated pipeline → per-agent output panels |
| `/workforce` | UC2 Dashboard | Policy intent form → 3 scenario cards → comparison table → optional hybrid |
| `/risk` | UC3 Portfolio | Input mode selector → portfolio results → risk clusters → radar chart |
| `/reports` | Reports | Full simulation history table with filters |
| `/settings` | Settings | API base URL config, clear history button |

---

## Configuration

All backend configuration is done via environment variables. Copy `backend/.env.example` to `backend/.env` and fill in your values.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GEMINI_API_KEY` | ✅ | — | Google Gemini API key |
| `GOOGLE_API_KEY` | ✅ | — | Alias for `GEMINI_API_KEY` (can be same key) |
| `ALLOWED_ORIGINS` | ❌ | `http://localhost:5173,...` | CORS allowed origins (comma-separated) |
| `PORT` | ❌ | `8000` | Backend server port |
| `ENV` | ❌ | `production` | Set to `development` to enable auto-reload |

Frontend API base URL is configured in `frontend/src/lib/settings.ts`.

---

## Testing

### Backend

```bash
cd backend
# Unit tests (add pytest tests under backend/tests/)
pytest

# Manual smoke test against live server
python backend/rag/test_rag.py
python backend/rag/test_kg.py
```

### Frontend

```bash
cd frontend
npm test           # Run once
npm run test:watch # Watch mode
```

Tests live in `frontend/src/test/` and use Vitest + Testing Library.

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Make your changes and commit: `git commit -m "feat: describe your change"`
4. Push to your branch: `git push origin feat/your-feature`
5. Open a pull request against `main`

**Branch naming convention:**
- `feat/` — new features
- `fix/` — bug fixes
- `docs/` — documentation only
- `refactor/` — code restructuring without behavior change
- `chore/` — dependency updates, CI changes

---

## License

This project was developed as part of a senior capstone project. All rights reserved.
