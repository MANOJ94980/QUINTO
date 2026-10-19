import pytest
import os
import json
from backend.qcs import qcs_service
from backend.bb84 import run_bb84_protocol
from backend.stats import calculate_qber, hoeffding_upper_bound, compute_detection_probability
from backend.policy import policy_engine
from backend.crypto_classical import classical_crypto, run_shor_n15_aer_demo
from backend.crypto_qgs import qgs_crypto
from backend.advisor import security_advisor
from backend.experiments import run_all_benchmark_experiments

def test_qcs_prepare_measure():
    alice_bits = [1, 0, 1, 1, 0]
    alice_bases = [0, 1, 0, 1, 0]
    handle = qcs_service.prepare(alice_bits, alice_bases, seed=42)
    assert handle.startswith("qhandle_")
    
    # Measuring handle consumes it
    bob_bases = [0, 1, 0, 1, 0]
    res = qcs_service.measure(handle, bob_bases, caller="bob", noise_level=0.0, fiber_length_km=0.0, seed=42)
    assert len(res["measured_bits"]) == 5
    assert res["measured_bits"] == alice_bits

    # Trying to measure consumed handle raises KeyError (No-Cloning)
    with pytest.raises(KeyError):
        qcs_service.measure(handle, bob_bases, caller="bob")

def test_bb84_clean_channel():
    res = run_bb84_protocol(n_qubits=2048, eve_intercept_ratio=0.0, noise_level=0.0, fiber_length_km=0.0, seed=42)
    assert res["raw_qber"] <= 0.05
    assert res["qber_bound"] <= 0.05
    assert res["link_state"] == "HEALTHY"
    assert len(res["final_key_bits"]) > 0

def test_bb84_intercept_attack():
    res = run_bb84_protocol(n_qubits=2048, eve_intercept_ratio=1.0, noise_level=0.0, seed=42)
    # At 100% intercept, QBER should be ~25%
    assert res["raw_qber"] >= 0.18
    assert res["qber_bound"] > 0.11
    assert res["link_state"] == "COMPROMISED"

def test_stats_bounds():
    qber = calculate_qber([0, 1, 0, 1], [0, 1, 1, 1])
    assert qber == 0.25
    ub = hoeffding_upper_bound(qber, sample_size=400)
    assert ub > qber
    
    p_detect = compute_detection_probability(sample_size=400, intercept_fraction=1.0)
    assert p_detect > 0.9999

def test_policy_engine_eval():
    policy_engine.update_link_state(0.02)
    res_healthy = policy_engine.evaluate_command("grid", "TRIP_BREAKER", "critical")
    assert res_healthy["verdict"] == "EXECUTED"

    policy_engine.update_link_state(0.08)
    res_degraded = policy_engine.evaluate_command("grid", "TRIP_BREAKER", "critical", second_approved=False)
    assert res_degraded["verdict"] == "HELD_FOR_APPROVAL"

    policy_engine.update_link_state(0.15)
    res_compromised = policy_engine.evaluate_command("grid", "TRIP_BREAKER", "critical", second_approved=False)
    assert res_compromised["verdict"] == "DEFERRED"

def test_crypto_qgs_encryption_decryption():
    key = qgs_crypto.derive_hybrid_key([1]*32, "test_session_123")
    assert len(key) == 32

    frame = {
        "id": "frm_test_1",
        "seq": 0,
        "ts": 1234567.8,
        "session": "test_session_123",
        "scenario": "grid",
        "lane": "qgs",
        "channel": "data",
        "src": "Alice",
        "dst": "Bob",
        "type": "TRIP_BREAKER",
        "payload": {"status": "OPEN"},
        "tag": "UNENCRYPTED"
    }

    encrypted = qgs_crypto.encrypt_command_frame(frame)
    assert "ciphertext_b64" in encrypted["payload"]

    success, dec_payload, msg = qgs_crypto.decrypt_command_frame(encrypted)
    assert success is True
    assert dec_payload["status"] == "OPEN"

def test_shor_n15_demo():
    shor_res = run_shor_n15_aer_demo(a=7)
    assert shor_res["N"] == 15
    assert shor_res["factors"] == [3, 5]

def test_experiments_suite():
    exp_res = run_all_benchmark_experiments(seed=42)
    assert "qber_vs_intercept" in exp_res
    assert len(exp_res["qber_vs_intercept"]) == 11
