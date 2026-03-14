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

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from usecases.usecase1.coa import run_coa
from usecases.usecase1.schemas import UseCase1Input, FinalResponse

from usecases.usecase2.coa import run_uc2
from usecases.usecase2.schemas import PolicyIntent, UC2FinalResponse

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
    version="2.0.0",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
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
        "version": "2.0.0",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "use_cases": [
            {"id": 1, "name": "Policy Workforce Impact Assessment", "endpoint": "/usecase1/run"},
            {"id": 2, "name": "Policy Scenario Comparison",        "endpoint": "/usecase2/run"},
        ]
    }

@app.get("/health", tags=["System"])
async def health():
    return {"status": "ok"}

# ── Use Case 1 ────────────────────────────────────────────────────────────────
@app.post(
    "/usecase1/run",
    tags=["Use Case 1 — Policy Workforce Impact Assessment"],
    summary="Evaluate a single policy against workforce constraints",
)
async def run_risk_assessment(user_input: UseCase1Input):
    simulation_id = str(uuid.uuid4())[:8].upper()
    logger.info(f"[{simulation_id}] UC1 started — sector={user_input.sector}, policy='{user_input.policy_title}'")

    start = time.perf_counter()
    result = run_coa(user_input)
    elapsed = round(time.perf_counter() - start, 2)

    logger.info(f"[{simulation_id}] UC1 complete — path={result.recommendation.decision_path}, elapsed={elapsed}s")

    result_dict = result.model_dump()
    result_dict["simulation_id"] = simulation_id
    result_dict["elapsed_seconds"] = elapsed
    return JSONResponse(content=result_dict)

# ── Use Case 2 ────────────────────────────────────────────────────────────────
@app.post(
    "/usecase2/run",
    tags=["Use Case 2 — Policy Scenario Comparison"],
    summary="Generate and compare multiple policy implementation scenarios",
)
async def run_scenario_comparison(intent: PolicyIntent):
    logger.info(f"UC2 started — sector={intent.sector}, goal='{intent.policy_goal}'")

    result = run_uc2(intent)

    logger.info(
        f"UC2 complete — best=Scenario {result.recommended_scenario_id}, "
        f"elapsed={result.elapsed_seconds}s"
    )

    return JSONResponse(content=result.model_dump())

# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    reload = os.getenv("ENV", "production").lower() == "development"
    logger.info(f"Starting AgentNation on port {port}")
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=reload)


# import sys
# import os
# import uuid
# import logging
# import time
# from pathlib import Path
# from datetime import datetime
# from dotenv import load_dotenv

# load_dotenv()

# # ── Path setup ────────────────────────────────────────────────────────────────
# current_dir = os.path.dirname(os.path.abspath(__file__))
# app_dir = os.path.join(current_dir, "app")
# if current_dir not in sys.path:
#     sys.path.append(current_dir)
# if app_dir not in sys.path:
#     sys.path.append(app_dir)

# # ── Imports ───────────────────────────────────────────────────────────────────
# from fastapi import FastAPI, HTTPException, Request
# from fastapi.middleware.cors import CORSMiddleware
# from fastapi.responses import JSONResponse
# from app.usecases.usecase1.coa import run_coa
# from app.usecases.usecase1.schemas import UseCase1Input, FinalResponse
# import uvicorn

# # ── Logging ───────────────────────────────────────────────────────────────────
# logging.basicConfig(
#     level=logging.INFO,
#     format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
#     datefmt="%Y-%m-%d %H:%M:%S",
# )
# logger = logging.getLogger("agentnation")

# # ── App ───────────────────────────────────────────────────────────────────────
# app = FastAPI(
#     title="AgentNation AI Backend",
#     description="Multi-agent policy risk assessment engine.",
#     version="1.0.0",
# )

# # ── CORS ──────────────────────────────────────────────────────────────────────
# ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=ALLOWED_ORIGINS,
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# # ── Request logging middleware ────────────────────────────────────────────────
# @app.middleware("http")
# async def log_requests(request: Request, call_next):
#     start = time.perf_counter()
#     response = await call_next(request)
#     duration_ms = (time.perf_counter() - start) * 1000
#     logger.info(
#         f"{request.method} {request.url.path} → {response.status_code} "
#         f"({duration_ms:.0f}ms)"
#     )
#     return response

# # ── Global exception handler ──────────────────────────────────────────────────
# @app.exception_handler(Exception)
# async def global_exception_handler(request: Request, exc: Exception):
#     logger.error(f"Unhandled exception on {request.url.path}: {exc}", exc_info=True)
#     return JSONResponse(
#         status_code=500,
#         content={"detail": "Internal server error. Check server logs."},
#     )

# # ── Routes ─────────────────────────────────────────────────────────────────────

# @app.get("/", tags=["System"])
# async def root():
#     return {
#         "status": "AgentNation Engine Online",
#         "timestamp": datetime.utcnow().isoformat() + "Z",
#         "version": "1.0.0",
#     }


# @app.get("/health", tags=["System"])
# async def health():
#     """Lightweight health check for uptime monitoring / frontend polling."""
#     return {"status": "ok"}


# @app.post(
#     "/usecase1/run",
#     response_model=FinalResponse,
#     tags=["Use Case 1 — Policy Risk Assessment"],
#     summary="Run the full multi-agent pipeline",
#     description=(
#         "Accepts a policy description and constraints, then orchestrates "
#         "PAA → WIA → MAA → COA → ORA and returns the full structured result."
#     ),
# )
# async def run_risk_assessment(user_input: UseCase1Input, request: Request):
#     simulation_id = str(uuid.uuid4())[:8].upper()
#     logger.info(
#         f"[{simulation_id}] Simulation started — sector={user_input.sector}, "
#         f"policy='{user_input.policy_title}'"
#     )

#     start = time.perf_counter()
#     result = run_coa(user_input)
#     elapsed = time.perf_counter() - start

#     logger.info(
#         f"[{simulation_id}] Simulation complete — path={result.recommendation.decision_path}, "
#         f"severity={result.maa_output.severity_score}, elapsed={elapsed:.2f}s"
#     )

#     # Attach simulation metadata so the frontend can display it
#     result_dict = result.model_dump()
#     result_dict["simulation_id"] = simulation_id
#     result_dict["elapsed_seconds"] = round(elapsed, 2)

#     return JSONResponse(content=result_dict)


# # ── Entry point ───────────────────────────────────────────────────────────────
# if __name__ == "__main__":
#     port = int(os.getenv("PORT", 8000))
#     reload = os.getenv("ENV", "production").lower() == "development"
#     logger.info(f"Starting AgentNation server on port {port} (reload={reload})")
#     uvicorn.run(
#         "server:app",
#         host="0.0.0.0",
#         port=port,
#         reload=reload,
#     )