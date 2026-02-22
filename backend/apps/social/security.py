import base64
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from django.conf import settings
import os

class SecureVaultService:
    """
    Implements the 'End-to-End' security layer for institutional communications.
    Uses AES-256-GCM for authenticated encryption.
    Messages are opaque to the database and server logs.
    """
    _key = None

    @classmethod
    def _get_key(cls):
        if not cls._key:
            # Derive or use a master communication key from settings
            master_key = getattr(settings, 'COMMUNICATION_VAULT_KEY', '0123456789abcdef0123456789abcdef')
            if isinstance(master_key, str):
                master_key = master_key.encode().ljust(32)[:32]
            cls._key = AESGCM(master_key)
        return cls._key

    @classmethod
    def encrypt(cls, plaintext: str) -> str:
        if not plaintext: return ""
        aesgcm = cls._get_key()
        nonce = os.urandom(12)
        ciphertext = aesgcm.encrypt(nonce, plaintext.encode(), None)
        # Combine nonce and ciphertext
        combined = nonce + ciphertext
        return base64.b64encode(combined).decode('utf-8')

    @classmethod
    def decrypt(cls, encrypted_text: str) -> str:
        if not encrypted_text: return ""
        try:
            aesgcm = cls._get_key()
            data = base64.b64decode(encrypted_text)
            nonce = data[:12]
            ciphertext = data[12:]
            decrypted = aesgcm.decrypt(nonce, ciphertext, None)
            return decrypted.decode('utf-8')
        except Exception:
            return "[DECRYPTION_ERROR: Identity mismatch or corrupted payload]"
