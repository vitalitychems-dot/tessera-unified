import os
import modal

app = modal.App("tessera-tesseract")


@app.function(secrets=[modal.Secret.from_name("Tesseract")])
def read_tesseract_secret():
    secret_keys = [k for k in os.environ.keys() if k.startswith(("TESSERACT", "SECRET"))]
    if not secret_keys:
        return {"status": "no_keys_found", "keys_found": [], "message": "No Tesseract secret keys found in environment"}
    return {
        "status": "active",
        "keys_found": secret_keys,
        "count": len(secret_keys),
        "message": "Tesseract secret accessible from Modal remote worker"
    }


@app.local_entrypoint()
def main():
    print("Tessera Sovereign System — Tesseract Secret Verification")
    print("=" * 55)
    result = read_tesseract_secret.remote()
    print(f"  Status: {result['status']}")
    print(f"  Keys found: {result.get('keys_found', 'none')}")
    print(f"  Message: {result['message']}")
