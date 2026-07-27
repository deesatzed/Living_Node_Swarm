import numpy as np
import pytest

from lns_kernel.scoring import crps_empirical, interval_coverage


def test_empirical_crps_matches_small_exact_example():
    assert crps_empirical(np.array([0.0, 1.0]), observation=0.0) == pytest.approx(0.25)


def test_interval_coverage_reports_rate_and_rejects_invalid_intervals():
    assert interval_coverage([(0, 2), (0, 2), (0, 2)], [0.5, 3.0, 1.5]) == pytest.approx(2 / 3)

    with pytest.raises(ValueError, match="lower bound"):
        interval_coverage([(2, 1)], [1.5])
