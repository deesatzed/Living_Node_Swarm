from lns_kernel.models import NodeStatus
from lns_server.proposal_normalize import proposal_to_node, strip_json_fences


def test_strip_fences():
    raw = '```json\n{"id": "x"}\n```'
    assert strip_json_fences(raw) == '{"id": "x"}'


def test_beta_alpha_alias_and_linear_transform():
    node = proposal_to_node(
        {
            "id": "loss",
            "name": "Loss",
            "distribution_family": "Beta",
            "parameters": {"alpha": 3.0, "beta": 2.0},
            "depends_on": ["input_signal"],
            "transform": "linear",
            "transform_params": {},
            "discovery_rationale": "test",
        },
        existing_ids={"input_signal", "process_stage", "outcome"},
        status=NodeStatus.PROPOSED,
        created_by="test",
        model_tag="test-model",
    )
    assert node.parameters["a"] == 3.0
    assert node.parameters["b"] == 2.0
    assert node.transform.value == "affine"
    assert "a0" in node.transform_params


def test_id_collision_renamed():
    node = proposal_to_node(
        {
            "id": "process_stage",
            "name": "Dup",
            "distribution_family": "Normal",
            "parameters": {"mu": 0, "sigma": 1},
            "depends_on": [],
            "transform": "none",
        },
        existing_ids={"process_stage"},
        status=NodeStatus.PROPOSED,
        created_by="test",
        model_tag=None,
    )
    assert node.id == "process_stage_2"
