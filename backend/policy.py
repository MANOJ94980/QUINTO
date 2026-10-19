import time
from typing import Dict, List, Optional

class PolicyEngine:
    """
    QGridShield Policy Engine.
    Evaluates command criticality against quantum security link state (HEALTHY, DEGRADED, COMPROMISED)
    and handles authentication failures, timeouts, and second approvals.
    """
    def __init__(self):
        self.link_state: str = "HEALTHY"
        self.qber_bound: float = 0.02
        self.pqc_fallback_active: bool = False
        self.pending_second_approvals: Dict[str, Dict] = {}
        self.decision_log: List[Dict] = []

    def update_link_state(self, qber_bound: float, auth_success: bool = True, timeout: bool = False) -> str:
        """
        Updates link state machine based on QBER confidence bound and channel telemetry.
        """
        prev_state = self.link_state

        if timeout or not auth_success:
            self.link_state = "COMPROMISED"
            self.pqc_fallback_active = True
            reason = "Channel frame timeout (Eve drop) or authentication failure detected"
        elif qber_bound > 0.11:
            self.link_state = "COMPROMISED"
            self.pqc_fallback_active = True
            reason = f"QBER upper bound {qber_bound:.4f} exceeded threshold 0.11 (Eve eavesdropping)"
        elif qber_bound > 0.05:
            self.link_state = "DEGRADED"
            self.pqc_fallback_active = False
            reason = f"QBER upper bound {qber_bound:.4f} in degraded band (0.05 - 0.11)"
        else:
            self.link_state = "HEALTHY"
            self.pqc_fallback_active = False
            reason = f"QBER upper bound {qber_bound:.4f} within healthy range (<= 0.05)"

        self.qber_bound = qber_bound
        
        log_entry = {
            "ts": time.time(),
            "prev_state": prev_state,
            "new_state": self.link_state,
            "qber_bound": qber_bound,
            "reason": reason
        }
        self.decision_log.append(log_entry)
        return self.link_state

    def evaluate_command(self, scenario: str, command_type: str, criticality: str, second_approved: bool = False) -> Dict:
        """
        Evaluates command execution attempt under active policy state.
        Returns outcome verdict: EXECUTED, HELD_FOR_APPROVAL, DEFERRED, or REJECTED.
        """
        ts = time.time()
        
        # Policy rules per link state
        if self.link_state == "HEALTHY":
            verdict = "EXECUTED"
            reason = "Link is HEALTHY; hybrid QKD+PQC key active. All commands authorized."
        
        elif self.link_state == "DEGRADED":
            if criticality == "critical":
                if second_approved:
                    verdict = "EXECUTED"
                    reason = "Link DEGRADED; critical command executed after dual-operator second approval."
                else:
                    verdict = "HELD_FOR_APPROVAL"
                    reason = "Link DEGRADED; critical command requires second operator confirmation."
            else:
                verdict = "EXECUTED"
                reason = "Link DEGRADED; non-critical command authorized under hybrid encryption."

        elif self.link_state == "COMPROMISED":
            if criticality == "routine":
                verdict = "EXECUTED"
                reason = "Link COMPROMISED; routine command permitted over PQC-fallback lane."
            elif criticality in ["high", "critical"]:
                if second_approved:
                    verdict = "EXECUTED"
                    reason = f"Link COMPROMISED; {criticality} command executed under manual override second approval."
                else:
                    verdict = "DEFERRED"
                    reason = f"Link COMPROMISED; {criticality} command deferred until clean BB84 re-key or second approval."
            else:
                verdict = "DEFERRED"
                reason = "Link COMPROMISED; command held."
        else:
            verdict = "REJECTED"
            reason = f"Unknown link state {self.link_state}"

        record = {
            "ts": ts,
            "scenario": scenario,
            "command_type": command_type,
            "criticality": criticality,
            "link_state": self.link_state,
            "qber_bound": self.qber_bound,
            "verdict": verdict,
            "reason": reason,
            "pqc_fallback": self.pqc_fallback_active
        }
        self.decision_log.append(record)
        return record

# Global Policy Instance
policy_engine = PolicyEngine()
