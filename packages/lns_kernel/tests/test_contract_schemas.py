from lns_kernel.schemas import contract_json_schemas


def test_contract_schemas_expose_all_gate_zero_models():
    schemas = contract_json_schemas()

    assert set(schemas) == {
        "TargetContract",
        "SourceReceipt",
        "EvidenceClaim",
        "DistributionSpec",
        "RelationshipContract",
        "GraphProposal",
        "ApprovalReceipt",
        "SimulationRun",
    }
    assert schemas["TargetContract"]["properties"]["oracle_url"]["type"] == "string"
    assert schemas["DistributionSpec"]["properties"]["parameters"]["type"] == "array"
