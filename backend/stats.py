import math
from typing import Tuple
import scipy.stats as stats_lib

def calculate_qber(alice_sample: list, bob_sample: list) -> float:
    """Calculates Quantum Bit Error Rate (QBER) as raw error fraction."""
    if not alice_sample or len(alice_sample) == 0:
        return 0.0
    mismatches = sum(1 for a, b in zip(alice_sample, bob_sample) if a != b)
    return mismatches / len(alice_sample)

def hoeffding_upper_bound(qber_hat: float, sample_size: int, epsilon: float = 1e-6) -> float:
    """
    Computes finite-key upper confidence bound using Hoeffding's Inequality:
    UB = QBER_hat + sqrt( ln(1/epsilon) / (2 * n_sample) )
    """
    if sample_size <= 0:
        return 1.0
    margin = math.sqrt(math.log(1.0 / epsilon) / (2.0 * sample_size))
    return min(1.0, qber_hat + margin)

def clopper_pearson_upper_bound(qber_hat: float, sample_size: int, alpha: float = 1e-6) -> float:
    """
    Computes Clopper-Pearson exact binomial upper confidence bound for QBER.
    """
    if sample_size <= 0:
        return 1.0
    errors = int(round(qber_hat * sample_size))
    if errors >= sample_size:
        return 1.0
    ub = stats_lib.beta.ppf(1.0 - alpha, errors + 1, sample_size - errors)
    return float(ub)

def compute_detection_probability(sample_size: int, intercept_fraction: float = 1.0) -> float:
    """
    Theoretical Eve detection probability: P_detect = 1 - (1 - 0.25 * intercept_fraction)^sample_size
    When intercept_fraction = 1.0 (100% intercept), P_detect = 1 - (3/4)^n
    """
    if sample_size <= 0:
        return 0.0
    return 1.0 - math.pow(1.0 - 0.25 * intercept_fraction, sample_size)

def compute_false_alarm_rate(noise_level: float, sample_size: int, threshold: float = 0.11) -> float:
    """
    Calculates the probability that channel noise alone triggers false alarm (QBER > threshold).
    Using cumulative binomial distribution.
    """
    if sample_size <= 0:
        return 0.0
    # P(errors > threshold * sample_size) under Binomial(n=sample_size, p=noise_level)
    max_clean_errors = int(math.floor(threshold * sample_size))
    p_normal = stats_lib.binom.cdf(max_clean_errors, sample_size, noise_level)
    return 1.0 - float(p_normal)
