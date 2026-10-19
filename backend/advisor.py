import time
from typing import Dict, List, Optional

class SecurityAdvisorEngine:
    """
    QGridShield Diegetic Security Advisor.
    Analyzes physical/quantum channel threats and emits actionable mitigation advice.
    Carries out actions upon operator confirmation.
    """
    def __init__(self):
        self.active_alerts: List[Dict] = []
        self.action_history: List[Dict] = []

    def evaluate_threat(self, cause_type: str, details: dict) -> Dict:
        """
        Analyzes threat cause and returns alert object with recommended tips.
        cause_type: 'HIGH_QBER', 'AUTH_FAIL', 'REPLAY_ATTACK', 'FRAME_TIMEOUT'
        """
        alert_id = f"alert_{int(time.time()*1000)}"
        ts = time.time()

        if cause_type == "HIGH_QBER":
            qber_val = details.get("qber_bound", 0.25)
            title = "THIRD PARTY DETECTED BETWEEN SENDER AND RECEIVER"
            description = f"QBER upper bound reached {qber_val:.2%}, exceeding maximum threshold (11.0%). Active intercept-resend eavesdropping detected on optical link."
            tips = [
                {
                    "action_id": "DISCARD_KEY",
                    "title": "Discard Compromised QKD Key",
                    "explanation": "Purge compromised secret key batch from key manager memory immediately.",
                    "severity": "CRITICAL"
                },
                {
                    "action_id": "REKEY_LARGER_SAMPLE",
                    "title": "Re-Key with Doubled Sample Size",
                    "explanation": "Initiate fresh BB84 round using 50% sample ratio for heightened statistical confidence.",
                    "severity": "HIGH"
                },
                {
                    "action_id": "PQC_ONLY_FALLBACK",
                    "title": "Switch to PQC-Only for Non-Critical Data",
                    "explanation": "Fall back to ML-KEM-768/ML-DSA-65 post-quantum encryption for telemetry.",
                    "severity": "MEDIUM"
                }
            ]

        elif cause_type == "AUTH_FAIL":
            title = "WEGMAN-CARTER MAC / ML-DSA SIGNATURE FAILURE"
            description = "Frame authentication failed or payload modified in transit. Payload tampering or injection attempt."
            tips = [
                {
                    "action_id": "HOLD_FOR_APPROVAL",
                    "title": "Hold Critical Command for Second Approval",
                    "explanation": "Block automatic execution of critical commands and require dual-operator authorization.",
                    "severity": "CRITICAL"
                },
                {
                    "action_id": "RETRY_ALTERNATE_PATH",
                    "title": "Retry on Alternate Fiber Path",
                    "explanation": "Route subsequent commands over secondary redundant dark fiber loop.",
                    "severity": "HIGH"
                }
            ]

        elif cause_type == "FRAME_TIMEOUT":
            title = "OPTICAL CHANNEL TIMEOUT (FRAME DROPPED)"
            description = "Frame transmission timed out (700ms limit). Signal drop or selective Eve denial-of-service."
            tips = [
                {
                    "action_id": "RESEND_CLEAN_ROUND",
                    "title": "Resend After Clean BB84 Round",
                    "explanation": "Execute full quantum channel re-sync before re-transmitting dropped frame.",
                    "severity": "HIGH"
                },
                {
                    "action_id": "PQC_ONLY_FALLBACK",
                    "title": "Activate PQC Fail-Closed Mode",
                    "explanation": "Isolate high-risk commands and defer execution until channel stability restored.",
                    "severity": "HIGH"
                }
            ]

        else: # REPLAY_ATTACK
            title = "MONOTONIC SEQUENCE REPLAY DETECTED"
            description = "Duplicate or stale sequence number received. Man-in-the-middle replay attack attempt."
            tips = [
                {
                    "action_id": "DISCARD_KEY",
                    "title": "Rotate Session Credentials & Counter",
                    "explanation": "Reset session counters and re-seed Wegman-Carter one-time MAC sequence.",
                    "severity": "HIGH"
                }
            ]

        alert = {
            "alert_id": alert_id,
            "ts": ts,
            "cause_type": cause_type,
            "title": title,
            "description": description,
            "details": details,
            "tips": tips,
            "status": "UNRESOLVED"
        }
        self.active_alerts.append(alert)
        return alert

    def confirm_action(self, alert_id: str, action_id: str, operator_id: str = "Alice_Operator") -> Dict:
        """Executes selected advisor recommendation on confirmation."""
        ts = time.time()
        execution_result = {
            "alert_id": alert_id,
            "action_id": action_id,
            "operator_id": operator_id,
            "ts": ts,
            "status": "EXECUTED",
            "message": f"Action {action_id} confirmed and applied by {operator_id}."
        }
        
        # Update alert status
        for alert in self.active_alerts:
            if alert["alert_id"] == alert_id:
                alert["status"] = "RESOLVED"
                alert["resolution"] = execution_result

        self.action_history.append(execution_result)
        return execution_result

# Global Advisor Singleton
security_advisor = SecurityAdvisorEngine()
