import numpy as np
from typing import Dict, List, Optional, Tuple
from backend.qcs import qcs_service
from backend.stats import calculate_qber, hoeffding_upper_bound, clopper_pearson_upper_bound

def toeplitz_privacy_amplification(sifted_key: List[int], target_length: int, seed: int = 42) -> List[int]:
    """
    Toeplitz matrix universal hash function for privacy amplification.
    Compresses sifted key of size N down to target_length M bits.
    """
    n = len(sifted_key)
    if n == 0 or target_length <= 0:
        return []
    if target_length >= n:
        return list(sifted_key[:target_length])

    rng = np.random.default_rng(seed)
    # Generate Toeplitz random matrix elements (N + M - 1)
    col = rng.integers(0, 2, size=target_length)
    row = rng.integers(0, 2, size=n)
    row[0] = col[0]

    # Build M x N Toeplitz matrix
    # T[i, j] = vector[i - j + N - 1]
    matrix = np.zeros((target_length, n), dtype=int)
    for i in range(target_length):
        for j in range(n):
            if i >= j:
                matrix[i, j] = col[i - j]
            else:
                matrix[i, j] = row[j - i]

    key_vec = np.array(sifted_key, dtype=int)
    amplified = (matrix @ key_vec) % 2
    return amplified.tolist()

def run_bb84_protocol(
    n_qubits: int = 2048,
    learn_mode: bool = False,
    eve_intercept_ratio: float = 0.0,
    fiber_length_km: float = 30.0,
    attenuation_db_km: float = 0.2,
    noise_level: float = 0.015,
    seed: int = 42
) -> Dict:
    """
    Executes complete BB84 protocol round.
    Exposes intermediate list outputs for learn mode visualization.
    """
    rng = np.random.default_rng(seed)

    if learn_mode:
        n_qubits = min(max(n_qubits, 8), 16)
        sample_ratio = 0.25
        min_sample = 2
    else:
        sample_ratio = 0.25
        min_sample = 400

    # 1. Alice generates random bits and bases
    alice_bits = rng.integers(0, 2, size=n_qubits).tolist()
    alice_bases = rng.integers(0, 2, size=n_qubits).tolist()

    # 2. Alice prepares qubits in QCS
    handle_id = qcs_service.prepare(alice_bits, alice_bases, seed=seed)

    # 3. Eve optional intercept-resend attack
    eve_bases = []
    eve_measured_bits = []
    if eve_intercept_ratio > 0.0:
        n_intercept = int(round(n_qubits * eve_intercept_ratio))
        intercept_indices = set(rng.choice(n_qubits, size=n_intercept, replace=False))
        
        eve_bases = rng.integers(0, 2, size=n_qubits).tolist()
        # Full intercept-resend on intercepted subset
        handle_id, eve_measured_bits = qcs_service.intercept_and_resend(
            handle_id=handle_id,
            eve_bases=eve_bases,
            fiber_length_km=fiber_length_km,
            attenuation_db_km=attenuation_db_km,
            noise_level=noise_level,
            seed=seed
        )

    # 4. Bob generates random bases and measures
    bob_bases = rng.integers(0, 2, size=n_qubits).tolist()
    meas_res = qcs_service.measure(
        handle_id=handle_id,
        caller_bases=bob_bases,
        caller="bob",
        fiber_length_km=fiber_length_km,
        attenuation_db_km=attenuation_db_km,
        noise_level=noise_level,
        seed=seed + 1
    )
    bob_measured_bits = meas_res["measured_bits"]

    # 5. Sifting (keep indices where Alice & Bob bases match)
    sifted_indices = [i for i in range(n_qubits) if alice_bases[i] == bob_bases[i]]
    alice_sifted = [alice_bits[i] for i in sifted_indices]
    bob_sifted = [bob_measured_bits[i] for i in sifted_indices]

    sifted_len = len(sifted_indices)

    # 6. Sample for QBER calculation
    if learn_mode:
        sample_size = max(min_sample, int(round(sifted_len * sample_ratio)))
    else:
        sample_size = max(min_sample, int(round(sifted_len * sample_ratio)))
    sample_size = min(sample_size, sifted_len)

    if sample_size > 0:
        sample_indices_relative = rng.choice(sifted_len, size=sample_size, replace=False)
        sample_indices_relative.sort()
        
        alice_sample = [alice_sifted[idx] for idx in sample_indices_relative]
        bob_sample = [bob_sifted[idx] for idx in sample_indices_relative]

        # Remaining secret bits after publishing sample
        key_indices_relative = [i for i in range(sifted_len) if i not in sample_indices_relative]
        alice_raw_key = [alice_sifted[idx] for idx in key_indices_relative]
        bob_raw_key = [bob_sifted[idx] for idx in key_indices_relative]
    else:
        alice_sample, bob_sample = [], []
        alice_raw_key, bob_raw_key = alice_sifted, bob_sifted

    # 7. QBER & Confidence Bound Calculation (Clopper-Pearson 95% Confidence Upper Bound)
    raw_qber = calculate_qber(alice_sample, bob_sample)
    qber_bound = clopper_pearson_upper_bound(raw_qber, len(alice_sample), alpha=0.05)

    # 8. Link State Decision based on QBER bound
    if qber_bound <= 0.05:
        link_state = "HEALTHY"
    elif qber_bound <= 0.11:
        link_state = "DEGRADED"
    else:
        link_state = "COMPROMISED"

    # 9. Error Correction & Privacy Amplification
    # Size target final key from security bound
    if link_state in ["HEALTHY", "DEGRADED"] and len(alice_raw_key) > 0:
        # Simple Parity Error Correction simulation
        corrected_key = list(alice_raw_key) # Idealized error correction
        # Toeplitz Privacy Amplification shrink factor = (1 - 2 * qber_bound)
        shrink_ratio = max(0.1, 1.0 - 2.0 * qber_bound)
        final_key_len = int(len(corrected_key) * shrink_ratio)
        final_key_len = max(16, min(final_key_len, len(corrected_key)))

        final_key = toeplitz_privacy_amplification(corrected_key, final_key_len, seed=seed)
        hex_key = "".join([f"{b}" for b in final_key])
    else:
        final_key = []
        hex_key = ""

    return {
        "n_qubits": n_qubits,
        "learn_mode": learn_mode,
        "eve_intercept_ratio": eve_intercept_ratio,
        "alice_bits": alice_bits if learn_mode else alice_bits[:16],
        "alice_bases": alice_bases if learn_mode else alice_bases[:16],
        "bob_bases": bob_bases if learn_mode else bob_bases[:16],
        "bob_measured_bits": bob_measured_bits if learn_mode else bob_measured_bits[:16],
        "sifted_count": sifted_len,
        "sample_size": len(alice_sample),
        "raw_qber": round(raw_qber, 4),
        "qber_bound": round(qber_bound, 4),
        "link_state": link_state,
        "final_key_bits": final_key,
        "final_key_hex": hex_key,
        "final_key_length": len(final_key)
    }
