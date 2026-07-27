"""Small dimensional algebra used to reject invalid graph relationships."""

from __future__ import annotations

from collections import defaultdict
from typing import Mapping


def parse_unit(expression: str) -> dict[str, int]:
    """Parse multiplicative/divisive unit expressions such as ``USD*year/(kg*vehicles)``."""

    source = expression.replace(" ", "")
    if not source or source == "1":
        return {}
    dimensions: defaultdict[str, int] = defaultdict(int)

    def parse_segment(index: int, inherited_sign: int = 1) -> int:
        operation_sign = 1
        while index < len(source):
            char = source[index]
            if char == ")":
                return index + 1
            if char == "*":
                operation_sign = 1
                index += 1
                continue
            if char == "/":
                operation_sign = -1
                index += 1
                continue
            if char == "(":
                index = parse_segment(index + 1, inherited_sign * operation_sign)
                operation_sign = 1
                continue
            start = index
            while index < len(source) and (source[index].isalnum() or source[index] in "_-"):
                index += 1
            if start == index:
                raise ValueError(f"invalid unit syntax near {source[index:]!r}")
            symbol = source[start:index].lower()
            exponent = 1
            if index < len(source) and source[index] == "^":
                index += 1
                exponent_start = index
                if index < len(source) and source[index] == "-":
                    index += 1
                while index < len(source) and source[index].isdigit():
                    index += 1
                if exponent_start == index or source[exponent_start:index] == "-":
                    raise ValueError("unit exponent must be an integer")
                exponent = int(source[exponent_start:index])
            dimensions[symbol] += inherited_sign * operation_sign * exponent
            operation_sign = 1
        return index

    end = parse_segment(0)
    if end != len(source):
        raise ValueError("unbalanced unit parentheses")
    return {dimension: exponent for dimension, exponent in dimensions.items() if exponent}


def divide_units(numerator: Mapping[str, int], denominator: Mapping[str, int]) -> dict[str, int]:
    dimensions: defaultdict[str, int] = defaultdict(int, numerator)
    for dimension, exponent in denominator.items():
        dimensions[dimension] -= exponent
    return {dimension: exponent for dimension, exponent in dimensions.items() if exponent}


def assert_relationship_units(
    *, transform: str, source_unit: str, target_unit: str, coefficient_units: str | None
) -> None:
    """Raise an actionable error when a relationship cannot produce its child unit."""

    source = parse_unit(source_unit)
    target = parse_unit(target_unit)
    if transform in {"sum_parents", "mean_parents"}:
        if source != target:
            raise ValueError("aggregate relationships require matching source and target units")
        return
    if transform == "affine":
        if coefficient_units is None:
            return
        coefficient = parse_unit(coefficient_units)
        expected = divide_units(target, source)
        if coefficient != expected:
            raise ValueError("coefficient units must equal target units divided by source units")
