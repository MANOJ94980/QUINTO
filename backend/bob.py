import time
import json
import asyncio
from typing import Dict, Tuple
from backend.crypto_qgs import qgs_crypto
from backend.crypto_classical import classical_crypto

class BobReceiverSimulation:
    """
    Simulated Bob Receiver (Laptop 2 logic).
    Validates received frames from Alice or Hub, performs cryptographic verification,
    and returns status execution ACKs.
    """
    def __init__(self):
        self.received_log = []

    def process_incoming_frame(self, frame: dict) -> Tuple[bool, dict, str]:
        """
        Receives frame, verifies signature / MAC, decrypts payload, and returns ACK packet.
        """
        lane = frame.get("lane", "qgs")
        scenario = frame.get("scenario", "grid")
        cmd_type = frame.get("type", "COMMAND")
        
        if lane == "qgs":
            # Decrypt & verify QGS frame
            success, payload, msg = qgs_crypto.decrypt_command_frame(frame)
            if not success:
                record = {"ts": time.time(), "frame_id": frame["id"], "status": "AUTH_FAILED", "reason": msg}
                self.received_log.append(record)
                return False, {}, msg
            
            ack_payload = {
                "command_id": frame["id"],
                "status": "COMMAND_EXECUTED",
                "executed_at": time.time(),
                "details": f"Command {cmd_type} verified and executed safely under QGS."
            }
            record = {"ts": time.time(), "frame_id": frame["id"], "status": "SUCCESS", "payload": payload}
            self.received_log.append(record)
            return True, ack_payload, "QGS Command Executed"

        else: # classical lane
            payload = frame.get("payload", {})
            sig = frame.get("tag", "")
            
            # Classical verification
            is_valid = classical_crypto.verify(json.dumps(payload), sig) if sig else True
            
            if "EVE_TAMPERED" in sig or not is_valid:
                # Under classical RSA, Eve with quantum oracle can forge valid signatures silently!
                # If Eve forged it, classical Bob STILL ACCEPTS IT as valid!
                pass

            ack_payload = {
                "command_id": frame["id"],
                "status": "COMMAND_EXECUTED",
                "executed_at": time.time(),
                "details": f"Command {cmd_type} executed under Classical RSA."
            }
            record = {"ts": time.time(), "frame_id": frame["id"], "status": "CLASSICAL_SUCCESS", "payload": payload}
            self.received_log.append(record)
            return True, ack_payload, "Classical Command Executed"

bob_sim = BobReceiverSimulation()
