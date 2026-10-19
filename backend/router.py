import time
import asyncio
from typing import Dict, List, Optional, Callable, Tuple

class FrameRouter:
    """
    QGridShield Frame Router with Eve's Interception Tap (/tap).
    Routes frames between Alice (Sender) and Bob (Receiver).
    Every frame is routed to Eve's tap socket for inspection/tampering.
    If Eve returns pass/drop/modify/inject/delay within 700ms, verdict is applied.
    Otherwise (timeout or disconnected), frame passes untouched.
    """
    def __init__(self):
        self.eve_tap_ws = None
        self.pending_tap_responses: Dict[str, asyncio.Future] = {}
        self.frame_log: List[Dict] = []
        self.delivered_frames: List[Dict] = []

    def register_eve_tap(self, websocket):
        self.eve_tap_ws = websocket

    def unregister_eve_tap(self):
        self.eve_tap_ws = None

    async def route_frame(self, original_frame: dict) -> Tuple[str, dict, str]:
        """
        Routes frame through Eve's tap socket.
        Returns tuple of (verdict, delivered_frame, reason).
        Verdict can be: PASS, DROP, MODIFY, INJECT, DELAY.
        """
        frame_id = original_frame["id"]
        ts_start = time.time()

        # Default outcome if Eve is absent
        if not self.eve_tap_ws:
            delivered_frame = dict(original_frame)
            self._log_route("PASS", original_frame, delivered_frame, "Eve tap disconnected; auto-pass.")
            return "PASS", delivered_frame, "Eve tap disconnected"

        loop = asyncio.get_event_loop()
        future = loop.create_future()
        self.pending_tap_responses[frame_id] = future

        # Send frame to Eve's tap socket
        tap_message = {
            "type": "FRAME_TAPPED",
            "frame_id": frame_id,
            "ts": ts_start,
            "frame": original_frame
        }
        try:
            await self.eve_tap_ws.send_json(tap_message)
        except Exception as e:
            self.unregister_eve_tap()
            delivered_frame = dict(original_frame)
            self._log_route("PASS", original_frame, delivered_frame, f"Eve send failed: {e}")
            return "PASS", delivered_frame, "Eve socket send error"

        # Wait up to 700ms (0.7s) for Eve's verdict
        try:
            verdict_payload = await asyncio.wait_for(future, timeout=0.7)
            verdict = verdict_payload.get("verdict", "PASS").upper()
            
            if verdict == "DROP":
                self._log_route("DROP", original_frame, {}, "Eve dropped frame.")
                return "DROP", {}, "Eve dropped frame"

            elif verdict == "MODIFY":
                modified_payload = verdict_payload.get("modified_payload", original_frame.get("payload"))
                delivered_frame = dict(original_frame)
                delivered_frame["payload"] = modified_payload
                delivered_frame["tag"] = verdict_payload.get("modified_tag", original_frame.get("tag", "")) + "|EVE_TAMPERED"
                self._log_route("MODIFY", original_frame, delivered_frame, "Eve modified frame payload.")
                return "MODIFY", delivered_frame, "Eve modified frame payload"

            elif verdict == "DELAY":
                delay_ms = verdict_payload.get("delay_ms", 300)
                await asyncio.sleep(delay_ms / 1000.0)
                delivered_frame = dict(original_frame)
                self._log_route("DELAY", original_frame, delivered_frame, f"Eve delayed frame by {delay_ms}ms.")
                return "DELAY", delivered_frame, f"Eve delayed frame by {delay_ms}ms"

            elif verdict == "INJECT":
                injected_frame = verdict_payload.get("injected_frame", original_frame)
                self._log_route("INJECT", original_frame, injected_frame, "Eve injected malicious frame.")
                return "INJECT", injected_frame, "Eve injected malicious frame"

            else: # PASS
                delivered_frame = dict(original_frame)
                self._log_route("PASS", original_frame, delivered_frame, "Eve passed frame.")
                return "PASS", delivered_frame, "Eve passed frame"

        except asyncio.TimeoutError:
            # 700 ms Timeout rule: Frame passes automatically
            delivered_frame = dict(original_frame)
            self._log_route("PASS", original_frame, delivered_frame, "Eve 700ms tap timeout elapsed; auto-pass.")
            return "PASS", delivered_frame, "Eve 700ms tap timeout elapsed"

        finally:
            self.pending_tap_responses.pop(frame_id, None)

    def handle_eve_tap_verdict(self, verdict_message: dict):
        """Called when Eve sends verdict on /tap WebSocket."""
        frame_id = verdict_message.get("frame_id")
        if frame_id in self.pending_tap_responses:
            fut = self.pending_tap_responses[frame_id]
            if not fut.done():
                fut.set_result(verdict_message)

    def _log_route(self, verdict: str, original: dict, delivered: dict, reason: str):
        record = {
            "ts": time.time(),
            "verdict": verdict,
            "original_frame": original,
            "delivered_frame": delivered,
            "reason": reason
        }
        self.frame_log.append(record)
        if delivered:
            self.delivered_frames.append(delivered)

# Global Frame Router Instance
frame_router = FrameRouter()
