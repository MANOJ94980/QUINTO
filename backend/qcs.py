import uuid
import numpy as np
from typing import Dict, List, Tuple, Optional
from qiskit import QuantumCircuit
from qiskit_aer import AerSimulator
from backend.noise import build_channel_noise_model, simulate_optical_loss_mask

CHUNK_SIZE = 16

class QuantumChannelService:
    """
    Quantum Channel Service (Hub).
    Manages qubit preparation and measurement handles server-side using Qiskit and Qiskit Aer.
    Processes large qubit batches (e.g. 2,048 qubits) in 16-qubit independent circuit chunks
    to stay well within AerSimulator memory and statevector bounds.
    Enforces quantum no-cloning: measuring a handle consumes and destroys it.
    """
    def __init__(self):
        self._handles: Dict[str, Dict] = {}
        self.simulator = AerSimulator(method='stabilizer')

    def prepare(self, alice_bits: List[int], alice_bases: List[int], seed: Optional[int] = None) -> str:
        """
        Alice prepares a batch of qubits.
        alice_bits: list of 0s and 1s
        alice_bases: list of 0s (Z-basis {|0>,|1>}) and 1s (X-basis {|+>,|->})
        Returns opaque handle string.
        """
        handle_id = f"qhandle_{uuid.uuid4().hex[:12]}"
        n_qubits = len(alice_bits)
        
        circuit_chunks = []
        for start_idx in range(0, n_qubits, CHUNK_SIZE):
            chunk_bits = alice_bits[start_idx:start_idx + CHUNK_SIZE]
            chunk_bases = alice_bases[start_idx:start_idx + CHUNK_SIZE]
            chunk_len = len(chunk_bits)
            
            qc = QuantumCircuit(chunk_len, chunk_len)
            for i in range(chunk_len):
                if chunk_bits[i] == 1:
                    qc.x(i)
                if chunk_bases[i] == 1: # X-basis Hadamard
                    qc.h(i)
            circuit_chunks.append(qc)

        self._handles[handle_id] = {
            "circuit_chunks": circuit_chunks,
            "n_qubits": n_qubits,
            "alice_bits": list(alice_bits),
            "alice_bases": list(alice_bases),
            "seed": seed or 42
        }
        return handle_id

    def measure(
        self,
        handle_id: str,
        caller_bases: List[int],
        caller: str = "bob",
        fiber_length_km: float = 30.0,
        attenuation_db_km: float = 0.2,
        noise_level: float = 0.015,
        readout_error: float = 0.01,
        seed: Optional[int] = None
    ) -> Dict:
        """
        Caller (Bob or Eve) measures the qubit batch handle.
        Consumes and removes the handle (NO-CLONING THEOREM).
        """
        if handle_id not in self._handles:
            raise KeyError(f"Invalid or already consumed handle_id: {handle_id}")

        handle_data = self._handles.pop(handle_id) # CONSUME HANDLE
        circuit_chunks: List[QuantumCircuit] = handle_data["circuit_chunks"]
        n_qubits = handle_data["n_qubits"]

        noise_model = build_channel_noise_model(
            fiber_length_km=fiber_length_km,
            attenuation_db_km=attenuation_db_km,
            base_depolarizing_rate=noise_level,
            readout_error_rate=readout_error
        )

        sim_seed = seed or handle_data["seed"]
        measured_bits = []

        chunk_idx = 0
        batch_circuits = []
        chunk_lens = []

        for start_idx in range(0, n_qubits, CHUNK_SIZE):
            chunk_bases = caller_bases[start_idx:start_idx + CHUNK_SIZE]
            chunk_len = len(chunk_bases)
            chunk_lens.append(chunk_len)
            
            qc = circuit_chunks[chunk_idx].copy()
            for i in range(chunk_len):
                if chunk_bases[i] == 1: # X-basis Hadamard before measurement
                    qc.h(i)
                qc.measure(i, i)

            batch_circuits.append(qc)
            chunk_idx += 1

        # Run all chunk circuits in batch on AerSimulator for high performance
        result = self.simulator.run(
            batch_circuits,
            noise_model=noise_model,
            shots=1,
            seed_simulator=sim_seed
        ).result()

        for idx, chunk_len in enumerate(chunk_lens):
            counts = result.get_counts(idx)
            bitstring = list(counts.keys())[0] if isinstance(counts, dict) else "0"*chunk_len
            bitstring = bitstring.zfill(chunk_len)
            chunk_bits = [int(b) for b in reversed(bitstring)]
            measured_bits.extend(chunk_bits[:chunk_len])

        # Simulate optical fiber loss (photon loss mask)
        rng = np.random.default_rng(sim_seed)
        survived = simulate_optical_loss_mask(n_qubits, fiber_length_km, attenuation_db_km, rng)
        
        return {
            "handle_id": handle_id,
            "caller": caller,
            "n_qubits": n_qubits,
            "measured_bits": measured_bits,
            "survived": survived.tolist()
        }

    def intercept_and_resend(
        self,
        handle_id: str,
        eve_bases: List[int],
        fiber_length_km: float = 30.0,
        attenuation_db_km: float = 0.2,
        noise_level: float = 0.015,
        seed: Optional[int] = None
    ) -> Tuple[str, List[int]]:
        """
        Eve intercept-resend attack:
        1. Eve measures handle in her bases.
        2. Eve prepares a fresh batch handle with her results and sends it on to Bob.
        """
        meas_res = self.measure(
            handle_id=handle_id,
            caller_bases=eve_bases,
            caller="eve",
            fiber_length_km=fiber_length_km,
            attenuation_db_km=attenuation_db_km,
            noise_level=noise_level,
            seed=seed
        )
        eve_measured_bits = meas_res["measured_bits"]
        new_handle_id = self.prepare(alice_bits=eve_measured_bits, alice_bases=eve_bases, seed=seed)
        return new_handle_id, eve_measured_bits

# Global QCS Singleton instance
qcs_service = QuantumChannelService()
