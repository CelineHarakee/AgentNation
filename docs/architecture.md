# Architecture Deep Dive

## Request Lifecycle

Every API call follows the same pattern:

```
Client → FastAPI Route → COA Orchestrator → Agent Chain → History Save → JSON Response
```

### 1. FastAPI Route (`server.py`)

- Validates the request body against a Pydantic schema
- Generates a `simulation_id`
- Delegates to the use case's `run_coa()` function
- Returns a `JSONResponse` with the full result + metadata

### 2. COA Orchestrator (`coa.py`)

Each use case has its own COA that encodes the business logic:
- Which agents to call and in what order
- Branching conditions (e.g., Path A/B/C for UC1)
- Aggregating outputs into the final response schema
- Calling `history_manager.save_*()` before returning

### 3. Agent Execution

Agents are pure functions: they take validated inputs, call Gemini + optionally ChromaDB, and return a Pydantic model. They have no side effects other than logging.

### 4. LLM Calls (`llm.py`)

All Gemini calls go through the centralized `generate_text()` helper which:
- Configures the API key once (lazy singleton)
- Sets a 5-second `SIGALRM` timeout to prevent hung requests
- Returns `None` on failure so agents can fall back gracefully

### 5. RAG Retrieval (`retriever.py`)

RAG calls are always optional. Agents check `is_available()` first and skip retrieval if ChromaDB isn't ready. Retrieved chunks are injected into prompts as a `RETRIEVED CONTEXT` section — this grounds LLM answers in actual Saudi policy documents.

## Branching Logic (UC1)

```
PAA → WIA
         ↓
    _wia_is_clean()?
         │
    YES  │  NO
         │
    ┌────▼─────┐    ┌──────────────┐
    │  Path A  │    │     MAA      │
    │ no risk  │    │  score 0-100 │
    └────┬─────┘    └──────┬───────┘
         │                 │
         │         score < 30?  → Path A (no action)
         │         30-60?       → Path B (monitor)
         │         > 60?        → ORA → Path C (escalate)
         │                 │
         └────────►COA◄────┘
```

## Memory Architecture

`simulation_log.json` is a flat JSON array. Each entry is a self-contained dict with all data UC3 needs for conflict detection:
- `id`, `usecase`, `timestamp`
- `sector`, `risk_flags`, `severity_score`
- `wia_metrics` (pressure_index, budget_stress, training_ratio)
- `policy_objectives`, `affected_domains`
- For UC2: `scenario_results` array with per-scenario metrics

UC3 `input_resolver.py` reads these entries by `simulation_id`, reconstructs `ResolvedPolicy` objects, and feeds them into the WIA/MAA pipeline.

## Knowledge Graph Structure

```
Sector Node ──REQUIRES──► WorkforceType Node ──HAS_CAPACITY──► Capacity Node
                                    │
                                    └──TRAINED_BY──► TrainingInstitution Node

(runtime, added by PRA)
Policy Node ──TARGETS──► Sector Node
```

PRA queries the graph to find policies that share sector nodes (`TARGETS` edges), then checks whether their combined `workforce_capacity` demand exceeds the capacity node's `total_available`.
