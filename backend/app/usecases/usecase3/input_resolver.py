# usecases/usecase3/input_resolver.py

import logging
from typing import List
from usecases.usecase3.schemas import UC3Input, DirectPolicySpec, ResolvedPolicy, InputMode

logger = logging.getLogger("agentnation.uc3.resolver")


# Default budget limit used when a historical simulation
# didn't store one (e.g. UC1 doesn't expose budget_limit in output)
_DEFAULT_BUDGET_LIMIT = 0.15

# Default time horizon for UC1 simulations (UC1 doesn't store time_horizon)
_DEFAULT_TIME_HORIZON = "medium"


def _normalize_sector(sector: str) -> str:
    """Normalize sector string to match workforce_db.json keys."""
    return sector.lower().strip().replace(" ", "_").replace("&", "and").replace("-", "_")


def _resolve_historical(selected_ids: List[str]) -> List[ResolvedPolicy]:
    """
    Option A — Load stored simulation data from history.

    For each selected simulation ID:
    - UC1: use stored WIA metrics directly (workforce_capacity derived from
      workforce_pressure_index since UC1 doesn't store the original input constraint)
    - UC2: use best scenario's metrics

    We do NOT re-run WIA for historical policies — the metrics are already computed.
    Instead we store them on ResolvedPolicy and COA will use them directly
    without calling WIA again.
    """
    from memory.history_manager import load_selectable_policies

    all_selectable = load_selectable_policies()

    # Build lookup by id
    lookup = {p["id"]: p for p in all_selectable}

    resolved = []
    for sim_id in selected_ids:
        if sim_id not in lookup:
            logger.warning(f"[Resolver] Simulation ID '{sim_id}' not found in history. Skipping.")
            continue

        stored = lookup[sim_id]
        sector = _normalize_sector(stored.get("sector", "unknown"))

        # workforce_capacity: stored directly for UC2, estimated for UC1
        # UC1 doesn't store the original workforce_capacity constraint,
        # but workforce_pressure_index ≈ workforce_capacity for a clean policy
        # We use a safe estimate from the stored pressure index
        wc = stored.get("workforce_pressure_index")
        if wc is None or wc <= 0:
            wc = 0.10   # safe default if missing

        # time_horizon: UC1 stores null, UC2 stores it on best scenario
        time_horizon = stored.get("time_horizon") or _DEFAULT_TIME_HORIZON

        resolved.append(ResolvedPolicy(
            policy_id           = stored["id"],
            display_name        = stored.get("display_name", stored["id"]),
            sector              = sector,
            workforce_capacity  = min(round(wc, 3), 1.0),
            budget_limit        = min(stored.get("budget_stress_ratio") or _DEFAULT_BUDGET_LIMIT, 1.0),
            time_horizon        = time_horizon,
            source              = f"historical_{stored.get('usecase', 'uc1').lower()}",
            original_sim_id     = stored["id"],
        ))

    logger.info(f"[Resolver] Option A resolved {len(resolved)}/{len(selected_ids)} historical policies.")
    return resolved


def _resolve_direct(policies: List[DirectPolicySpec]) -> List[ResolvedPolicy]:
    """
    Option B — Normalize user-submitted policy specs.
    WIA will run fresh on these.
    """
    resolved = []
    for spec in policies:
        sector = _normalize_sector(spec.sector)
        display = spec.display_name or f"{spec.sector} — {spec.target_growth_pct}% growth"

        resolved.append(ResolvedPolicy(
            policy_id           = spec.policy_id,
            display_name        = display,
            sector              = sector,
            workforce_capacity  = round(spec.target_growth_pct / 100, 3),
            budget_limit        = spec.budget_limit,
            time_horizon        = spec.time_horizon,
            source              = "direct",
            original_sim_id     = None,
        ))

    logger.info(f"[Resolver] Option B resolved {len(resolved)} direct policies.")
    return resolved


def resolve_input(uc3_input: UC3Input) -> List[ResolvedPolicy]:
    """
    Main entry point — resolve UC3 input into a normalized list of policies
    ready for the WIA evaluation loop.

    Returns an empty list if nothing could be resolved (caller should handle).
    """
    if uc3_input.input_mode == InputMode.HISTORICAL:
        if not uc3_input.selected_policy_ids:
            logger.error("[Resolver] Historical mode selected but no IDs provided.")
            return []
        return _resolve_historical(uc3_input.selected_policy_ids)

    elif uc3_input.input_mode == InputMode.DIRECT:
        if not uc3_input.policies:
            logger.error("[Resolver] Direct mode selected but no policies provided.")
            return []
        return _resolve_direct(uc3_input.policies)

    else:
        logger.error(f"[Resolver] Unknown input mode: {uc3_input.input_mode}")
        return []