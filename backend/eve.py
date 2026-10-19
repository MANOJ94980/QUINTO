import time
from typing import Dict, Tuple

class EveAttackerSimulation:
    """
    Eve Attacker Simulation (Laptop 3 logic).
    Supports Classical-era (no quantum oracle) and Quantum-era (oracle ON).
    """
    def __init__(self):
        self.era_mode: str = "quantum-era" # "classical-era" or "quantum-era"
        self.intercept_ratio: float = 0.5 # 50% intercept default
        self.tamper_active: bool = False
        self.drop_active: bool = False
        self.intercepted_log = []

    def evaluate_interception(self, frame: dict) -> Tuple[str, dict]:
        """
        Determines Eve's action on intercepted frame:
        Returns (verdict, modified_or_injected_frame).
        Verdicts: PASS, DROP, MODIFY, INJECT, DELAY.
        """
        self.intercepted_log.append({"ts": time.time(), "frame": frame})

        if self.drop_active:
            return "DROP", {}

        if self.tamper_active:
            lane = frame.get("lane", "qgs")
            if lane == "classical" and self.era_mode == "quantum-era":
                # Quantum-era Eve uses simulated fault-tolerant quantum computer oracle
                # to decrypt classical payload and forge valid RSA signature!
                tampered_frame = dict(frame)
                tampered_payload = dict(frame.get("payload", {}))
                tampered_payload["action"] = "FORGED_UNSAFE_COMMAND"
                tampered_payload["malicious_flag"] = True
                tampered_frame["payload"] = tampered_payload
                tampered_frame["tag"] = "FORGED_RSA_SIG_VIA_QUANTUM_ORACLE"
                return "MODIFY", tampered_frame

            elif lane == "qgs":
                # Eve tampers with QGS ciphertext or MAC tag -> results in QGS MAC auth failure
                tampered_frame = dict(frame)
                tampered_payload = dict(frame.get("payload", {}))
                tampered_payload["ciphertext_b64"] = "INVALID_CORRUPTED_CIPHERTEXT_EVE"
                tampered_frame["payload"] = tampered_payload
                tampered_frame["tag"] = "MAC=EVE_TAMPERED_MAC_INVALID"
                return "MODIFY", tampered_frame

        return "PASS", frame

eve_sim = EveAttackerSimulation()
