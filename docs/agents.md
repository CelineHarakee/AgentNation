# Agent Reference

Each agent is a Python module under `backend/app/usecases/usecase*/`. Agents are stateless functions — they receive validated Pydantic inputs and return Pydantic outputs.

---

## PAA — Policy Analysis Agent
**File:** `usecase1/paa.py`  
**LLM:** Yes  **RAG:** Yes (`agent_target = "PAA"`)

Parses a policy description into structured analytical components. Uses a two-pass approach: first retrieves grounding documents from ChromaDB, then calls Gemini with the full policy text and retrieved context. Outputs structured JSON which is parsed with a three-strategy extractor (`_extract_json`).

**Output:** `PAAOutput` — policy objectives, affected domains, sector, constraints, complexity level, explanation.

---

## WIA — Workforce Intelligence Agent
**File:** `usecase1/wia.py`  
**LLM:** Yes (explanation only)  **RAG:** No

Performs deterministic numeric calculations against `workforce_db.json`, then calls Gemini to generate a human-readable narrative. The numeric logic is transparent and auditable — no hallucination risk on the core metrics.

**Key metrics computed:**
- `workforce_pressure_index` = required workers / current workforce
- `budget_stress_ratio` = estimated policy cost / sector budget
- `training_capacity_ratio` = required workers / annual training output
- `saudization_risk` = True if current saudization < target × 0.7

**Output:** `WIAOutput` — all metrics plus risk flags and explanation.

---

## MAA — Monitoring & Assessment Agent
**File:** `usecase1/maa.py`  
**LLM:** Yes (explanation only)  **RAG:** No

Computes a severity score (0–100) as a weighted sum of WIA components, then classifies it into `Low/Moderate/High/Critical`. Also determines `RecommendationTrigger` which COA uses for branching.

**Scoring formula:**
```
severity = (workforce_component × 35) + (budget_component × 30)
         + (training_risk_component × 25) + (saudization_component × 10)
```

---

## ORA — Options & Recommendations Agent
**File:** `usecase1/ora.py` (UC1), `usecase2/ora.py` (UC2), `usecase3/ora.py` (UC3)  
**LLM:** Yes  **RAG:** Yes (`agent_target = "ORA"`)

Generates policy alternatives (UC1/UC3) or a hybrid scenario (UC2). Each version is tuned differently but all follow the same pattern: build a RAG query from risk flags, retrieve grounding context, then prompt Gemini to generate structured alternatives.

---

## SGA — Scenario Generation Agent
**File:** `usecase2/sga.py`  
**LLM:** Yes  **RAG:** Yes (`agent_target = "SGA"`)

Generates exactly 3 contrasting `ScenarioSpec` objects representing short/medium/long time horizons with varying budget and workforce capacity constraints. Uses RAG to ground scenarios in real-world precedents.

---

## CAA — Comparative Assessment Agent
**File:** `usecase2/caa.py`  
**LLM:** Yes  **RAG:** Yes (`agent_target = "CAA"`)

Receives all three scenario results (spec + WIA + MAA) and produces a ranked comparison. Identifies the best scenario, flags weaknesses, and recommends whether a hybrid would improve outcomes.

---

## PRA — Portfolio Risk Agent
**File:** `usecase3/pra.py`  
**LLM:** No  **RAG:** No (uses Knowledge Graph)

The only fully deterministic agent. Queries the NetworkX Knowledge Graph to identify structural conflicts between policies, computes a portfolio risk score, and builds a `SectorPressureMap`. No LLM is involved — all outputs are reproducible.

---

## COA — Coordination & Oversight Agent
**Files:** `usecase1/coa.py`, `usecase2/coa.py`, `usecase3/coa.py`  
**LLM:** No  **RAG:** No

Pure orchestration logic. Calls agents in sequence, applies branching conditions, assembles the final response, and saves to history. Keeps agent logic isolated and testable.
