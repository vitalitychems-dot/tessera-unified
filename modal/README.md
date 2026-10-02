# Modal Remote Compute — Tessera Sovereign System

Python-based remote compute functions that run on Modal cloud workers.

## Setup

1. Get a Modal token from https://modal.com/settings#tokens
2. Set `MODAL_TOKEN_ID` and `MODAL_TOKEN_SECRET` as Replit secrets
3. Authenticate:
   ```bash
   modal token set --token-id "$MODAL_TOKEN_ID" --token-secret "$MODAL_TOKEN_SECRET"
   ```
4. Verify:
   ```bash
   modal run modal/get_started.py
   ```

## Tesseract Secret Setup

Create the "Tesseract" secret in Modal's dashboard or CLI:

```bash
modal secret create Tesseract TESSERACT_KEY=your-value-here
```

Or create it at https://modal.com/secrets — name it "Tesseract" and add your key-value pairs.

Then verify access:
```bash
modal run modal/tesseract_secret.py
```

## Files

- `get_started.py` — Basic square/cube functions to verify Modal connectivity
- `tesseract_secret.py` — Verifies the "Tesseract" secret is accessible from Modal workers
- `sovereign_compute.py` — Sacred mathematics engine (Fibonacci, numerology, sacred alignment)

## Usage

```bash
modal run modal/get_started.py
modal run modal/tesseract_secret.py
modal run modal/sovereign_compute.py
```

## Adding New Functions

Create a new `.py` file in this directory:

```python
import modal

app = modal.App("tessera-your-function-name")

@app.function()
def your_function(args):
    return result

@app.local_entrypoint()
def main():
    result = your_function.remote(args)
    print(result)
```
