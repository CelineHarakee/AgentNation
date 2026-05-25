# rag/knowledge_graph.py

import networkx as nx
import logging
from typing import List, Dict, Any
from rag.kg_data import KG_SECTORS, KG_WORKFORCE_TYPES, KG_TRAINING_INSTITUTIONS

logger = logging.getLogger("agentnation.kg")


def build_base_graph() -> nx.DiGraph:
    """
    Build the static base knowledge graph.

    Five node types:
        sector, workforce_type, capacity, training_institution, policy (added at runtime)

    Five edge types:
        REQUIRES      sector → workforce_type
        HAS_CAPACITY  workforce_type → capacity
        TRAINED_BY    workforce_type → training_institution
        TARGETS       policy → sector  (added at runtime)
    """
    G = nx.DiGraph()

    # ── Step 1: Add sector nodes ──────────────────────────────────────────────
    for sector in KG_SECTORS:
        G.add_node(sector, node_type="sector")

    # ── Step 2: Add workforce type nodes + REQUIRES edges ─────────────────────
    for sector, data in KG_SECTORS.items():
        for wf_type in data["workforce_types"]:
            wf_data = KG_WORKFORCE_TYPES.get(wf_type, {})

            if wf_type not in G:
                G.add_node(
                    wf_type,
                    node_type="workforce_type",
                    capacity=wf_data.get("capacity", 0),
                    annual_training_output=wf_data.get("annual_training_output", 0),
                )

            # Sector → WorkforceType
            G.add_edge(sector, wf_type, edge_type="REQUIRES")

    # ── Step 3: Add capacity nodes + HAS_CAPACITY edges ───────────────────────
    # Each workforce type gets its own capacity node so PRA can query it
    # directly as a graph node rather than just reading an attribute.
    for wf_type, wf_data in KG_WORKFORCE_TYPES.items():
        if wf_type not in G:
            continue  # skip types not referenced by any sector

        cap_node_id = f"capacity_{wf_type}"
        G.add_node(
            cap_node_id,
            node_type="capacity",
            workforce_type=wf_type,
            total_available=wf_data.get("capacity", 0),
            annual_training_output=wf_data.get("annual_training_output", 0),
        )

        # WorkforceType → Capacity
        G.add_edge(
            wf_type,
            cap_node_id,
            edge_type="HAS_CAPACITY",
            total_available=wf_data.get("capacity", 0),
            annual_training_output=wf_data.get("annual_training_output", 0),
        )

    # ── Step 4: Add training institution nodes + TRAINED_BY edges ─────────────
    for institution, data in KG_TRAINING_INSTITUTIONS.items():
        G.add_node(
            institution,
            node_type="training_institution",
            annual_output=data["annual_output"],
        )
        for wf_type in data.get("trains_workforce_types", []):
            if wf_type in G:
                # WorkforceType → TrainingInstitution
                G.add_edge(wf_type, institution, edge_type="TRAINED_BY")

    logger.info(
        f"[KG] Base graph built — "
        f"{G.number_of_nodes()} nodes, {G.number_of_edges()} edges"
    )
    return G


# Module-level singleton — built once, reused across all UC3 calls
_BASE_GRAPH: nx.DiGraph = build_base_graph()


def build_portfolio_graph(policies: List[Dict[str, Any]]) -> nx.DiGraph:
    """
    Create a portfolio-specific graph by adding policy nodes to the base graph.

    Args:
        policies: List of dicts with:
                  policy_id, sector, target_growth_pct, time_horizon

    Returns:
        Copy of the base graph with policy nodes and TARGETS edges added.
    """
    G = _BASE_GRAPH.copy()

    for policy in policies:
        pid    = policy["policy_id"]
        sector = policy["sector"].lower().replace(" ", "_").replace("&", "and")

        G.add_node(
            pid,
            node_type="policy",
            sector=sector,
            target_growth_pct=policy.get("target_growth_pct", 0),
            time_horizon=policy.get("time_horizon", "medium"),
        )

        if sector in G:
            G.add_edge(pid, sector, edge_type="TARGETS")
        else:
            logger.warning(
                f"[KG] Sector '{sector}' not found in graph for policy {pid}"
            )

    return G


# ── Query methods used by PRA ─────────────────────────────────────────────────

def get_workforce_types_for_sector(G: nx.DiGraph, sector: str) -> List[str]:
    """Return all workforce types required by a sector."""
    sector = sector.lower().replace(" ", "_").replace("&", "and")
    return [
        n for n in G.successors(sector)
        if G.nodes[n].get("node_type") == "workforce_type"
    ]


def get_capacity_for_workforce_type(G: nx.DiGraph, wf_type: str) -> Dict:
    """
    Return capacity data for a workforce type by following the HAS_CAPACITY edge.

    Returns:
        {"total_available": int, "annual_training_output": int}
        or empty dict if not found.
    """
    cap_node_id = f"capacity_{wf_type}"
    if cap_node_id in G:
        data = G.nodes[cap_node_id]
        return {
            "total_available":        data.get("total_available", 0),
            "annual_training_output": data.get("annual_training_output", 0),
        }
    return {}


def get_policies_targeting_sector(G: nx.DiGraph, sector: str) -> List[str]:
    """Return all policy IDs that target a given sector."""
    sector = sector.lower().replace(" ", "_").replace("&", "and")
    return [
        n for n in G.predecessors(sector)
        if G.nodes[n].get("node_type") == "policy"
    ]


def get_training_institutions_for_workforce(
    G: nx.DiGraph, wf_type: str
) -> List[str]:
    """Return all training institutions that produce a given workforce type."""
    if wf_type not in G:
        return []
    return [
        n for n in G.successors(wf_type)
        if G.nodes[n].get("node_type") == "training_institution"
    ]


def detect_shared_workforce_pools(G: nx.DiGraph) -> List[Dict]:
    """
    Find workforce types demanded by multiple policies — Workforce Overlap conflicts.
    Uses the HAS_CAPACITY edge to pull capacity data from capacity nodes.

    Returns:
        List of {workforce_type, policies, sectors, total_capacity, annual_training_output}
    """
    overlaps = []

    wf_nodes = [
        n for n, d in G.nodes(data=True)
        if d.get("node_type") == "workforce_type"
    ]

    for wf_type in wf_nodes:
        requiring_sectors = [
            pred for pred in G.predecessors(wf_type)
            if G.nodes[pred].get("node_type") == "sector"
        ]

        competing_policies = []
        for sector in requiring_sectors:
            competing_policies.extend(get_policies_targeting_sector(G, sector))

        if len(competing_policies) >= 2:
            # Pull capacity from the capacity node via HAS_CAPACITY edge
            capacity_data = get_capacity_for_workforce_type(G, wf_type)

            overlaps.append({
                "workforce_type":         wf_type,
                "policies":               list(set(competing_policies)),
                "sectors":                requiring_sectors,
                "total_capacity":         capacity_data.get("total_available", 0),
                "annual_training_output": capacity_data.get("annual_training_output", 0),
            })

    return overlaps


def detect_shared_training_institutions(G: nx.DiGraph) -> List[Dict]:
    """
    Find training institutions serving workforce types demanded by multiple policies.
    Training Bottleneck conflict detection.

    Returns:
        List of {institution, workforce_types, competing_policies, annual_output}
    """
    bottlenecks = []

    inst_nodes = [
        n for n, d in G.nodes(data=True)
        if d.get("node_type") == "training_institution"
    ]

    for institution in inst_nodes:
        wf_types_trained = [
            pred for pred in G.predecessors(institution)
            if G.nodes[pred].get("node_type") == "workforce_type"
        ]

        competing_policies = set()
        for wf_type in wf_types_trained:
            requiring_sectors = [
                pred for pred in G.predecessors(wf_type)
                if G.nodes[pred].get("node_type") == "sector"
            ]
            for sector in requiring_sectors:
                for policy in get_policies_targeting_sector(G, sector):
                    competing_policies.add(policy)

        if len(competing_policies) >= 2:
            inst_data = G.nodes[institution]
            bottlenecks.append({
                "institution":        institution,
                "workforce_types":    wf_types_trained,
                "competing_policies": list(competing_policies),
                "annual_output":      inst_data.get("annual_output", 0),
            })

    return bottlenecks


def get_graph_summary(G: nx.DiGraph) -> Dict:
    """Return a summary of the portfolio graph for logging/debugging."""
    by_type: Dict[str, List[str]] = {}
    for n, d in G.nodes(data=True):
        t = d.get("node_type", "unknown")
        by_type.setdefault(t, []).append(n)

    return {
        "total_nodes":          G.number_of_nodes(),
        "total_edges":          G.number_of_edges(),
        "policy_nodes":         by_type.get("policy", []),
        "sector_nodes":         by_type.get("sector", []),
        "workforce_type_nodes": by_type.get("workforce_type", []),
        "capacity_nodes":       by_type.get("capacity", []),
        "institution_nodes":    by_type.get("training_institution", []),
    }