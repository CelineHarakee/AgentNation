import sys
import os
import uuid
import logging
import time
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# ── Path setup ────────────────────────────────────────────────────────────────
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

app_dir = os.path.join(current_dir, "app")
if app_dir not in sys.path:
    sys.path.append(app_dir)

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from usecases.usecase1.coa import run_coa
from usecases.usecase1.schemas import UseCase1Input

from usecases.usecase2.coa import run_uc2
from usecases.usecase2.ora import generate_hybrid
from usecases.usecase2.schemas import PolicyIntent, HybridRequest

from usecases.usecase3.coa import run_uc3
from usecases.usecase3.schemas import UC3Input

import uvicorn

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("agentnation")

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="AgentNation AI Backend",
    description="Multi-agent policy intelligence engine.",
    version="3.0.0",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Request logging ───────────────────────────────────────────────────────────
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    ms = (time.perf_counter() - start) * 1000
    logger.info(f"{request.method} {request.url.path} → {response.status_code} ({ms:.0f}ms)")
    return response

# ── System routes ─────────────────────────────────────────────────────────────
@app.get("/", tags=["System"])
async def root():
    return {
        "status": "AgentNation Engine Online",
        "version": "3.0.0",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "use_cases": [
            {"id": 1, "name": "Policy Workforce Impact Assessment",  "endpoint": "/usecase1/run"},
            {"id": 2, "name": "Policy Scenario Comparison",          "endpoints": {
                "run":    "/usecase2/run",
                "hybrid": "/usecase2/hybrid",
            }},
            {"id": 3, "name": "Workforce Portfolio Risk Monitor",    "endpoint": "/usecase3/run"},
        ]
    }

@app.get("/health", tags=["System"])
async def health():
    return {"status": "ok"}


# ── System routes ─────────────────────────────────────────────────────────────
@app.delete(
    "/api/history/clear",
    tags=["History"],
    summary="Permanently delete all simulation history",
)
async def clear_history():
    """
    Wipes simulation_log.json completely.
    Called by the Settings page 'Clear Simulation Log' button.
    This is irreversible — UC3 historical mode will lose all selectable policies.
    """
    from memory.history_manager import _save_log
    _save_log([])   # overwrite with empty list
    logger.warning("[History] Simulation log cleared via Settings page.")
    return {"status": "cleared", "message": "All simulation history has been deleted."}
 

# ── Use Case 1 ────────────────────────────────────────────────────────────────
@app.post(
    "/usecase1/run",
    tags=["Use Case 1 — Policy Workforce Impact Assessment"],
    summary="Evaluate a single policy against workforce constraints",
)
async def run_risk_assessment(user_input: UseCase1Input):
    simulation_id = str(uuid.uuid4())[:8].upper()
    logger.info(
        f"[{simulation_id}] UC1 started — "
        f"sector={user_input.sector}, policy='{user_input.policy_title}'"
    )
    start  = time.perf_counter()
    result = run_coa(user_input)
    elapsed= round(time.perf_counter() - start, 2)



    logger.info(
        f"[{simulation_id}] UC1 complete — "
        f"path={result.recommendation.decision_path}, elapsed={elapsed}s"
    )
    result_dict = result.model_dump()
    result_dict["simulation_id"]   = simulation_id
    result_dict["elapsed_seconds"] = elapsed
    return JSONResponse(content=result_dict)


# ── Use Case 2 — Main simulation ──────────────────────────────────────────────
@app.post(
    "/usecase2/run",
    tags=["Use Case 2 — Policy Scenario Comparison"],
    summary="Generate and compare 3 policy implementation scenarios",
)
async def run_scenario_comparison(intent: PolicyIntent):
    logger.info(f"UC2 started — sector={intent.sector}, goal='{intent.policy_goal}'")
    result = run_uc2(intent)



    logger.info(
        f"UC2 complete — best=Scenario {result.recommended_scenario_id}, "
        f"elapsed={result.elapsed_seconds}s"
    )
    return JSONResponse(content=result.model_dump())


# ── Use Case 2 — On-demand hybrid ────────────────────────────────────────────
@app.post(
    "/usecase2/hybrid",
    tags=["Use Case 2 — Policy Scenario Comparison"],
    summary="Generate hybrid scenario on user request",
)
async def generate_hybrid_scenario(request: HybridRequest):
    logger.info(f"UC2 hybrid requested — sector={request.sector}")
    start  = time.perf_counter()
    result = generate_hybrid(
        scenario_results = request.scenario_results,
        caa_output       = request.caa_output,
        sector           = request.sector,
        policy_goal      = request.policy_goal,
    )
    elapsed = round(time.perf_counter() - start, 2)
    logger.info(f"UC2 hybrid complete — '{result.hybrid_scenario.name}', elapsed={elapsed}s")
    return JSONResponse(content=result.model_dump())


# ── Use Case 3 ────────────────────────────────────────────────────────────────
@app.post(
    "/usecase3/run",
    tags=["Use Case 3 — Workforce Portfolio Risk Monitor"],
    summary="Analyze a portfolio of active policies for cross-policy conflicts",
    description=(
        "Accepts 3–10 policies (historical or direct), runs WIA+MAA per policy, "
        "detects conflicts via Knowledge Graph, scores portfolio risk, "
        "and generates portfolio-level recommendations. Always saves to history."
    ),
)
async def run_portfolio_analysis(uc3_input: UC3Input):
    logger.info(
        f"UC3 started — mode={uc3_input.input_mode.value}, "
        f"n_policies={len(uc3_input.selected_policy_ids) + len(uc3_input.policies)}"
    )
    result = run_uc3(uc3_input)
    logger.info(
        f"UC3 complete — score={result.portfolio_risk_score:.1f}, "
        f"clusters={len(result.risk_clusters)}, elapsed={result.elapsed_seconds}s"
    )
    return JSONResponse(content=result.model_dump())


# ── History / Dashboard routes ────────────────────────────────────────────────

@app.get(
    "/api/history/selectable",
    tags=["History"],
    summary="Get all UC1 and UC2 simulations available for UC3 Option A selection",
)
async def get_selectable_policies():
    from memory.history_manager import load_selectable_policies
    return load_selectable_policies()


@app.get(
    "/api/history/all",
    tags=["History"],
    summary="Get all simulation history (UC1 + UC2 + UC3)",
)
async def get_all_history():
    from memory.history_manager import load_all_simulations
    return load_all_simulations()


@app.get(
    "/api/dashboard/stats",
    tags=["History"],
    summary="Pre-computed stats for the AgentNation dashboard homepage",
)
async def get_dashboard_stats():
    from memory.history_manager import get_dashboard_stats
    return get_dashboard_stats()


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    port   = int(os.getenv("PORT", 8000))
    reload = os.getenv("ENV", "production").lower() == "development"
    logger.info(f"Starting AgentNation on port {port}")
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=reload)
