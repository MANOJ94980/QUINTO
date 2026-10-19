import math
import numpy as np
from qiskit_aer.noise import NoiseModel, depolarizing_error, ReadoutError

def build_channel_noise_model(
    fiber_length_km: float = 30.0,
    attenuation_db_km: float = 0.2,
    base_depolarizing_rate: float = 0.015,
    readout_error_rate: float = 0.01,
    seed: int = 42
) -> NoiseModel:
    """
    Builds a Qiskit Aer NoiseModel simulating optical fiber transmission loss,
    depolarization due to polarization mode dispersion, and detector readout errors.
    """
    noise_model = NoiseModel()

    # Calculate fiber transmission probability: T = 10^(-attenuation * L / 10)
    loss_db = attenuation_db_km * fiber_length_km
    transmission_prob = math.pow(10.0, -loss_db / 10.0)
    
    # Effective depolarizing error scales with fiber distance and base rate
    effective_depol = min(0.49, base_depolarizing_rate + (1.0 - transmission_prob) * 0.03)

    if effective_depol > 0:
        # 1-qubit depolarizing error for single qubit gates (X, H)
        error_1q = depolarizing_error(effective_depol, 1)
        noise_model.add_all_qubit_quantum_error(error_1q, ['x', 'h', 'id'])

    if readout_error_rate > 0:
        # Readout error matrix: P(meas m | state s)
        p01 = readout_error_rate
        p10 = readout_error_rate
        readout_err = ReadoutError([[1.0 - p01, p01], [p10, 1.0 - p10]])
        noise_model.add_all_qubit_readout_error(readout_err)

    return noise_model

def simulate_optical_loss_mask(n_qubits: int, fiber_length_km: float, attenuation_db_km: float, rng: np.random.Generator) -> np.ndarray:
    """
    Returns boolean array indicating which photons survived fiber transmission.
    """
    loss_db = attenuation_db_km * fiber_length_km
    transmission_prob = math.pow(10.0, -loss_db / 10.0)
    survived = rng.random(n_qubits) < transmission_prob
    return survived
