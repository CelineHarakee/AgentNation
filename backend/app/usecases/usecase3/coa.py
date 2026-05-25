# app/usecases/usecase3/coa.py

import uuid
import time
import logging
from typing import List

from usecases.usecase1.schemas import PAAOutput, Constraints
from usecases.usecase1.wia import run_wia
from usecases.usecase1.maa import run_maa

from usecases.usecase3.schemas import (
    UC3Input,
    UC3FinalResponse,
    PolicyEvaluation,
)
from usecases.usecase3.input_resolver import resolve_input, ResolvedPolicy
from usecases.usecase3.pra import run_pra
from usecases.usecase3.ora import run_uc3_ora
from memory.history_manager import save_uc3_simulation

logger = logging.getLogger("agentnation.uc3.coa")

def run_uc3(uc3_input: UC3Input) -> UC3FinalResponse:
    start_time = time.perf_counter()
    simulation_id = f"UC3_{time.strftime('%Y%m%d_%H%M%S')}_{str(uuid.uuid4())[:6].upper()}"
    
    logger.info(f"[{simulation_id}] UC3 COA started")

    # 1. Resolve input
    resolved_policies = resolve_input(uc3_input)
    if not resolved_policies:
        raise ValueError("No policies could be resolved from input.")

    evaluations: List[PolicyEvaluation] = []
    sectors_covered = set()

    # 2. WIA and MAA loop for all resolved policies
    for rp in resolved_policies:
        # PAA mock to feed WIA
        paa_out = PAAOutput(
            policy_objectives=[],
            affected_domains=[],
            sector=rp.sector,
            constraints=Constraints(
                budget_limit=rp.budget_limit,
                workforce_capacity=rp.workforce_capacity,
            ),
            assumptions=[],
            complexity_level="medium",
            explanation=f"Input generated for UC3 from {rp.source}."
        )
        
        wia_out = run_wia(paa_out)
        maa_out = run_maa(wia_out)
        
        evaluations.append(PolicyEvaluation(
            policy_id=rp.policy_id,
            display_name=rp.display_name,
            sector=rp.sector,
            source=rp.source,
            wia_output=wia_out,
            maa_output=maa_out
        ))
        sectors_covered.add(rp.sector)

    # 3. PRA - Portfolio Risk Agent
    pra_out = run_pra(evaluations)
    
    # 4. ORA - Options Review Agent
    ora_out = run_uc3_ora(pra_out, evaluations, list(sectors_covered))
    
    elapsed = round(time.perf_counter() - start_time, 2)
    
    # Build executive summary
    exec_summary = (
        f"Portfolio of {len(evaluations)} policies analyzed across {len(sectors_covered)} sectors. "
        f"Overall risk score: {pra_out.portfolio_risk_score:.1f}/100 ({pra_out.risk_classification}). "
        f"Identified {pra_out.conflict_count} cross-policy conflicts."
    )

    # Compile final response
    result = UC3FinalResponse(
        use_case="Workforce Portfolio Risk Monitor",
        input_mode=uc3_input.input_mode.value,
        policy_ids_analyzed=[e.policy_id for e in evaluations],
        sectors_covered=list(sectors_covered),
        agents_activated=["Resolver", "WIA", "MAA", "PRA", "ORA"],
        policy_evaluations=evaluations,
        portfolio_risk_score=pra_out.portfolio_risk_score,
        risk_classification=pra_out.risk_classification,
        risk_clusters=pra_out.risk_clusters,
        sector_pressure_map=pra_out.sector_pressure_map,
        policy_contributions=pra_out.policy_contributions,
        ora_output=ora_out,
        portfolio_briefing=ora_out.explanation,
        executive_summary=exec_summary,
        simulation_id=simulation_id,
        elapsed_seconds=elapsed,
    )
    
    save_uc3_simulation(result)
    
    logger.info(f"[{simulation_id}] UC3 COA complete in {elapsed}s")
    return result