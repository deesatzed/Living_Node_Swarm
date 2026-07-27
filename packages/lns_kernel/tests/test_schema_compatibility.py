from lns_kernel.models import Graph


def test_legacy_graph_json_loads_with_general_workspace_defaults():
    legacy_graph = {
        "id": "gas-legacy",
        "name": "Legacy gas graph",
        "nodes": {
            "henry_hub": {
                "id": "henry_hub",
                "name": "Henry Hub price",
                "distribution_family": "Normal",
                "parameters": {"mu": 3.0, "sigma": 0.4},
            }
        },
        "graph_version": 3,
    }

    graph = Graph.model_validate(legacy_graph)
    node = graph.nodes["henry_hub"]

    assert graph.schema_version == 1
    assert graph.target_contract_id is None
    assert graph.active_approval_id is None
    assert node.schema_version == 1
    assert node.distribution_spec_id is None
    assert node.evidence_claim_ids == []
    assert node.relationship_ids == []
    assert node.parameters == {"mu": 3.0, "sigma": 0.4}
