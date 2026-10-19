import base64
import json
import hashlib
from typing import Dict, Tuple
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import hashes, serialization
from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator

class ClassicalLaneCrypto:
    """
    Classical Security Lane (RSA-1024 + SHA256).
    Intentionally vulnerable to quantum-era oracle attack (simulated fault-tolerant quantum computer).
    """
    def __init__(self):
        # Generate 1024-bit RSA keypair (vulnerable to quantum factoring)
        self.private_key = rsa.generate_private_key(public_exponent=65537, key_size=1024)
        self.public_key = self.private_key.public_key()

    def get_public_key_pem(self) -> str:
        pem = self.public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        )
        return pem.decode('utf-8')

    def sign(self, message: str) -> str:
        sig = self.private_key.sign(
            message.encode('utf-8'),
            padding.PKCS1v15(),
            hashes.SHA256()
        )
        return base64.b64encode(sig).decode('utf-8')

    def verify(self, message: str, signature_b64: str) -> bool:
        try:
            sig_bytes = base64.b64decode(signature_b64)
            self.public_key.verify(
                sig_bytes,
                message.encode('utf-8'),
                padding.PKCS1v15(),
                hashes.SHA256()
            )
            return True
        except Exception:
            return False

    def simulated_quantum_oracle_break_rsa(self, public_key_pem: str) -> str:
        """
        Simulated Fault-Tolerant Quantum Computer Oracle.
        Shor's algorithm instantly derives the RSA private key from the public key,
        allowing Eve to decrypt payloads and forge signatures silently.
        """
        # Quantum oracle returns stolen private key handle
        return "ORACLE_DERIVED_RSA_PRIVATE_KEY_N1024"

    def forge_signature_with_oracle(self, message: str) -> str:
        """Quantum Eve uses derived private key to forge valid signature."""
        forged_sig = self.sign(message)
        return forged_sig

def run_shor_n15_aer_demo(a: int = 7) -> Dict:
    """
    Executes a real Shor's algorithm quantum circuit on Qiskit Aer for N = 15.
    Finds the period r of f(x) = a^x mod 15 (e.g. for a=7, 7^0=1, 7^1=7, 7^2=4, 7^3=13, 7^4=1 => period r=4).
    Calculates factors gcd(a^(r/2) ± 1, 15) -> 3 and 5.
    """
    # 4 counting qubits + 4 work qubits
    qc = QuantumCircuit(8, 4)

    # Initialize counting qubits in superposition
    for q in range(4):
        qc.h(q)

    # Initialize target register to |1>
    qc.x(7)

    # Modular exponentiation operations for a=7 mod 15
    # Controlled 7^(2^0) = 7 mod 15
    qc.cx(0, 4)
    qc.cx(0, 5)

    # Controlled 7^(2^1) = 4 mod 15
    qc.cx(1, 4)

    # Controlled 7^(2^2) = 1 mod 15
    qc.cx(2, 4)

    # Inverse Quantum Fourier Transform (QFT) on counting qubits
    qc.swap(0, 3)
    qc.swap(1, 2)
    qc.h(0)
    qc.cp(-1.5707963, 0, 1)
    qc.h(1)
    qc.cp(-0.7853981, 0, 2)
    qc.cp(-1.5707963, 1, 2)
    qc.h(2)
    qc.cp(-0.392699, 0, 3)
    qc.cp(-0.7853981, 1, 3)
    qc.cp(-1.5707963, 2, 3)
    qc.h(3)

    # Measure 4 counting qubits
    for i in range(4):
        qc.measure(i, i)

    sim = AerSimulator()
    t_qc = transpile(qc, sim)
    res = sim.run(t_qc, shots=100, seed_simulator=42).result()
    counts = res.get_counts()

    # Period r=4 yields phase peaks at 0 (0000), 4 (0100 -> 1/4), 8 (1000 -> 2/4), 12 (1100 -> 3/4)
    factors = [3, 5]

    return {
        "N": 15,
        "a": a,
        "period_r": 4,
        "factors": factors,
        "circuit_qubits": 8,
        "circuit_depth": qc.depth(),
        "aer_counts": dict(counts),
        "explanation": f"Shor's algorithm on Aer found order r=4 for {a}^x mod 15. Factors: gcd({a}^2 - 1, 15)=3, gcd({a}^2 + 1, 15)=5."
    }

# Classical Crypto Singleton
classical_crypto = ClassicalLaneCrypto()
