import os
import json
import time
import asyncio
from typing import Dict, List, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from backend.qcs import qcs_service
from backend.bb84 import run_bb84_protocol
from backend.policy import policy_engine
from backend.stats import calculate_qber, hoeffding_upper_bound
from backend.crypto_qgs import qgs_crypto
from backend.crypto_classical import classical_crypto, run_shor_n15_aer_demo
from backend.router import frame_router
from backend.advisor import security_advisor
from backend.experiments import run_all_benchmark_experiments, get_cached_experiment_results
from backend.bob import bob_sim
from backend.eve import eve_sim

app = FastAPI(
    title="QGridShield Hub (Laptop 1)",
    description="Hub, Alice, Security Brain & Quantum Channel Service",
    version="1.0.0"
)

# CORS middleware for React Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Connection Manager for Multi-Laptop WebSockets
class ConnectionManager:
    def __init__(self):
        self.active_sender_connections: List[WebSocket] = []
        self.active_receiver_connections: List[WebSocket] = []
        self.active_attacker_connections: List[WebSocket] = []

    async def connect_sender(self, websocket: WebSocket):
        await websocket.accept()
        self.active_sender_connections.append(websocket)

    def disconnect_sender(self, websocket: WebSocket):
        if websocket in self.active_sender_connections:
            self.active_sender_connections.remove(websocket)

    async def connect_receiver(self, websocket: WebSocket):
        await websocket.accept()
        self.active_receiver_connections.append(websocket)

    def disconnect_receiver(self, websocket: WebSocket):
        if websocket in self.active_receiver_connections:
            self.active_receiver_connections.remove(websocket)

    async def connect_attacker(self, websocket: WebSocket):
        await websocket.accept()
        self.active_attacker_connections.append(websocket)

    def disconnect_attacker(self, websocket: WebSocket):
        if websocket in self.active_attacker_connections:
            self.active_attacker_connections.remove(websocket)

    async def broadcast_event(self, event_type: str, payload: dict):
        event_packet = {
            "type": event_type,
            "hub_time": time.time(),
            "payload": payload
        }
        all_conns = (
            self.active_sender_connections +
            self.active_receiver_connections +
            self.active_attacker_connections
        )
        for conn in list(all_conns):
            try:
                await conn.send_json(event_packet)
            except Exception:
                pass

manager = ConnectionManager()

# Global Session State
active_session = {
    "session_id": "sess_qgs_2026_init",
    "scenario": "grid",
    "lane": "qgs", # "qgs" or "classical"
    "learn_mode": False,
    "qubit_batch": 2048,
    "eve_intercept_ratio": 0.0,
    "eve_era_mode": "quantum-era",
    "start_time": time.time()
}

# --- Pydantic API Models ---
class SessionStartRequest(BaseModel):
    scenario: str = "grid" # "grid", "rail", "av"
    lane: str = "qgs" # "qgs", "classical"
    learn_mode: bool = False
    eve_intercept_ratio: float = 0.0
    eve_era_mode: str = "quantum-era"

class BB84RunRequest(BaseModel):
    n_qubits: int = 2048
    learn_mode: bool = False
    eve_intercept_ratio: float = 0.0
    seed: int = 42

class CommandSendRequest(BaseModel):
    scenario: str
    command_type: str
    criticality: str
    second_approved: bool = False
    lane: Optional[str] = None

class AdvisorConfirmRequest(BaseModel):
    alert_id: str
    action_id: str
    operator_id: str = "Alice_Operator"

# --- REST ENDPOINTS ---

@app.get("/api/session")
def get_session():
    """Returns current active session state and policy link state."""
    return {
        "session": active_session,
        "policy": {
            "link_state": policy_engine.link_state,
            "qber_bound": policy_engine.qber_bound,
            "pqc_fallback": policy_engine.pqc_fallback_active
        },
        "hub_time": time.time()
    }

@app.post("/api/session/start")
async def start_session(req: SessionStartRequest):
    """Starts or re-initializes a demonstration session."""
    active_session["scenario"] = req.scenario
    active_session["lane"] = req.lane
    active_session["learn_mode"] = req.learn_mode
    active_session["qubit_batch"] = 16 if req.learn_mode else 2048
    active_session["eve_intercept_ratio"] = req.eve_intercept_ratio
    active_session["eve_era_mode"] = req.eve_era_mode
    active_session["session_id"] = f"sess_{req.scenario}_{int(time.time())}"
    active_session["start_time"] = time.time()

    eve_sim.intercept_ratio = req.eve_intercept_ratio
    eve_sim.era_mode = req.eve_era_mode

    # Broadcast session start event across all screens
    await manager.broadcast_event("session_start", active_session)
    return {"status": "SUCCESS", "session": active_session}

@app.get("/api/scenarios")
def get_scenarios():
    """Returns scenario configuration definitions from shared/scenarios.json."""
    scenarios_path = os.path.join(os.path.dirname(__file__), "..", "shared", "scenarios.json")
    if os.path.exists(scenarios_path):
        with open(scenarios_path, "r") as f:
            return json.load(f)
    raise HTTPException(status_code=404, detail="scenarios.json not found")

@app.post("/api/bb84/run")
async def execute_bb84_round(req: BB84RunRequest):
    """Executes a full BB84 protocol round using Qiskit Aer simulator."""
    n_qubits = 16 if (req.learn_mode or active_session["learn_mode"]) else req.n_qubits
    eve_ratio = req.eve_intercept_ratio if req.eve_intercept_ratio > 0 else active_session["eve_intercept_ratio"]

    res = run_bb84_protocol(
        n_qubits=n_qubits,
        learn_mode=req.learn_mode or active_session["learn_mode"],
        eve_intercept_ratio=eve_ratio,
        seed=req.seed
    )

    # Update policy link state machine
    auth_ok = True
    new_state = policy_engine.update_link_state(res["qber_bound"], auth_success=auth_ok)

    # Derive new hybrid key if key generated
    if res["final_key_bits"]:
        qgs_crypto.derive_hybrid_key(res["final_key_bits"], active_session["session_id"])

    # If high QBER detected, trigger Security Advisor alert
    if new_state == "COMPROMISED" and res["qber_bound"] > 0.11:
        alert = security_advisor.evaluate_threat("HIGH_QBER", {"qber_bound": res["qber_bound"], "eve_intercept": eve_ratio})
        await manager.broadcast_event("tips_issued", alert)

    # Broadcast qber_update and link_state events
    await manager.broadcast_event("qber_update", {"qber_bound": res["qber_bound"], "raw_qber": res["raw_qber"]})
    await manager.broadcast_event("link_state", {"link_state": new_state, "qber_bound": res["qber_bound"]})

    return {"status": "SUCCESS", "bb84_result": res, "link_state": new_state}

@app.post("/api/frame/send")
async def send_command_frame(req: CommandSendRequest):
    """
    Sends infrastructure command frame from Alice (Sender).
    Evaluates policy, routes frame through Eve's /tap, verifies at Bob (Receiver),
    and broadcasts cross-screen animation sync events.
    """
    lane = req.lane or active_session["lane"]
    scenario = req.scenario
    cmd_type = req.command_type
    criticality = req.criticality

    # 1. Evaluate Policy Engine
    policy_res = policy_engine.evaluate_command(
        scenario=scenario,
        command_type=cmd_type,
        criticality=criticality,
        second_approved=req.second_approved
    )

    if policy_res["verdict"] == "HELD_FOR_APPROVAL":
        await manager.broadcast_event("command_held", policy_res)
        return {"status": "HELD", "policy": policy_res, "message": "Command held for second operator approval."}

    if policy_res["verdict"] == "DEFERRED":
        await manager.broadcast_event("command_held", policy_res)
        return {"status": "DEFERRED", "policy": policy_res, "message": "Command deferred due to COMPROMISED link state."}

    # 2. Build Frame
    frame_id = f"frm_{int(time.time()*1000)}"
    raw_frame = {
        "id": frame_id,
        "seq": 0,
        "ts": time.time(),
        "session": active_session["session_id"],
        "scenario": scenario,
        "lane": lane,
        "channel": "data",
        "src": "Alice_Sender",
        "dst": "Bob_Receiver",
        "type": cmd_type,
        "payload": {
            "action": cmd_type,
            "criticality": criticality,
            "timestamp": time.time()
        },
        "tag": "UNENCRYPTED"
    }

    # Encrypt according to selected lane
    if lane == "qgs":
        pqc_only = policy_engine.pqc_fallback_active
        encrypted_frame = qgs_crypto.encrypt_command_frame(raw_frame, pqc_only=pqc_only)
    else: # classical RSA lane
        sig = classical_crypto.sign(json.dumps(raw_frame["payload"]))
        encrypted_frame = dict(raw_frame)
        encrypted_frame["tag"] = sig

    # Broadcast frame launch event
    await manager.broadcast_event("frame_launch", {"frame_id": frame_id, "frame": encrypted_frame})

    # 3. Route frame through Eve's /tap socket (700ms timeout)
    verdict, delivered_frame, route_reason = await frame_router.route_frame(encrypted_frame)

    await manager.broadcast_event("frame_tapped", {"frame_id": frame_id, "verdict": verdict, "reason": route_reason})

    if verdict == "DROP":
        # Missing reply within timeout counts as COMPROMISED in policy!
        policy_engine.update_link_state(policy_engine.qber_bound, timeout=True)
        alert = security_advisor.evaluate_threat("FRAME_TIMEOUT", {"frame_id": frame_id})
        await manager.broadcast_event("frame_dropped", {"frame_id": frame_id})
        await manager.broadcast_event("tips_issued", alert)
        return {"status": "DROPPED", "verdict": verdict, "reason": "Frame dropped by attacker tap."}

    if verdict == "MODIFY":
        await manager.broadcast_event("frame_modified", {"frame_id": frame_id, "delivered_frame": delivered_frame})

    # 4. Process delivered frame at Bob (Receiver)
    success, ack_payload, ack_msg = bob_sim.process_incoming_frame(delivered_frame)

    if success:
        await manager.broadcast_event("frame_delivered", {"frame_id": frame_id, "ack": ack_payload})
        await manager.broadcast_event("command_executed", {"frame_id": frame_id, "command": cmd_type})
        return {
            "status": "SUCCESS",
            "verdict": verdict,
            "delivered_frame": delivered_frame,
            "ack": ack_payload
        }
    else:
        # Auth failure at Bob
        policy_engine.update_link_state(policy_engine.qber_bound, auth_success=False)
        alert = security_advisor.evaluate_threat("AUTH_FAIL", {"frame_id": frame_id, "reason": ack_msg})
        await manager.broadcast_event("auth_fail", {"frame_id": frame_id, "reason": ack_msg})
        await manager.broadcast_event("tips_issued", alert)
        return {
            "status": "AUTH_FAILURE",
            "verdict": verdict,
            "reason": ack_msg,
            "policy": policy_engine.decision_log[-1]
        }

@app.post("/api/advisor/confirm")
async def confirm_advisor_action(req: AdvisorConfirmRequest):
    """Executes selected diegetic advisor recommendation."""
    res = security_advisor.confirm_action(req.alert_id, req.action_id, req.operator_id)

    # Perform physical backend action
    if req.action_id == "DISCARD_KEY":
        qgs_crypto.current_qkd_key = None
        qgs_crypto.current_hybrid_key = None
        policy_engine.pqc_fallback_active = True

    elif req.action_id == "REKEY_LARGER_SAMPLE":
        # Run clean BB84 with larger sample
        bb84_res = run_bb84_protocol(n_qubits=2048, eve_intercept_ratio=0.0, seed=101)
        policy_engine.update_link_state(bb84_res["qber_bound"])

    elif req.action_id == "PQC_ONLY_FALLBACK":
        policy_engine.pqc_fallback_active = True

    await manager.broadcast_event("link_state", {
        "link_state": policy_engine.link_state,
        "action_taken": req.action_id
    })
    return {"status": "SUCCESS", "result": res}

@app.post("/api/experiments/run")
def run_experiments(seed: int = 42):
    """Runs seeded batch simulation benchmark suite."""
    res = run_all_benchmark_experiments(seed=seed)
    return {"status": "SUCCESS", "results": res}

@app.get("/api/results")
def get_experiment_results():
    """Returns cached experiment benchmark results for Recharts analysis views."""
    return get_cached_experiment_results()

@app.get("/api/shor/run")
def run_shor_demo(a: int = 7):
    """Runs Shor's algorithm for N = 15 on Qiskit Aer simulator."""
    return run_shor_n15_aer_demo(a=a)

# --- WEBSOCKET ENDPOINTS ---

@app.websocket("/ws/sender")
async def websocket_sender(websocket: WebSocket):
    await manager.connect_sender(websocket)
    try:
        while True:
            data = await websocket.receive_json()
            # Clock sync ping-pong handler
            if data.get("type") == "PING":
                await websocket.send_json({
                    "type": "PONG",
                    "client_ts": data.get("client_ts"),
                    "hub_time": time.time()
                })
    except WebSocketDisconnect:
        manager.disconnect_sender(websocket)

@app.websocket("/ws/receiver")
async def websocket_receiver(websocket: WebSocket):
    await manager.connect_receiver(websocket)
    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "PING":
                await websocket.send_json({
                    "type": "PONG",
                    "client_ts": data.get("client_ts"),
                    "hub_time": time.time()
                })
    except WebSocketDisconnect:
        manager.disconnect_receiver(websocket)

@app.websocket("/ws/attacker")
async def websocket_attacker(websocket: WebSocket):
    await manager.connect_attacker(websocket)
    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "PING":
                await websocket.send_json({
                    "type": "PONG",
                    "client_ts": data.get("client_ts"),
                    "hub_time": time.time()
                })
    except WebSocketDisconnect:
        manager.disconnect_attacker(websocket)

@app.websocket("/tap")
async def websocket_tap(websocket: WebSocket):
    await websocket.accept()
    frame_router.register_eve_tap(websocket)
    try:
        while True:
            data = await websocket.receive_json()
            # Eve sends tap verdict response
            frame_router.handle_eve_tap_verdict(data)
    except WebSocketDisconnect:
        frame_router.unregister_eve_tap()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.hub:app", host="0.0.0.0", port=8000, reload=True)
