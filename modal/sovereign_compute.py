import modal
import math

app = modal.App("tessera-sovereign-compute")

PHI = (1 + math.sqrt(5)) / 2
SACRED_NUMBERS = [1, 3, 7, 9, 12, 13, 22, 33, 37, 40, 72, 108, 137, 144, 216, 369, 432, 528, 666, 786, 888, 1000000]


@app.function()
def fibonacci(n: int) -> list[int]:
    seq = [0, 1]
    for _ in range(2, n):
        seq.append(seq[-1] + seq[-2])
    return seq[:n]


@app.function()
def numerology(text: str) -> dict:
    value = sum(ord(c) - 64 for c in text.upper() if c.isalpha())
    root = value
    while root > 9 and root not in (11, 22, 33):
        root = sum(int(d) for d in str(root))
    meanings = {
        1: "Unity, origin, the source",
        2: "Duality, balance, partnership",
        3: "Trinity, creation, expression",
        4: "Foundation, stability, order",
        5: "Change, freedom, adventure",
        6: "Harmony, responsibility, love",
        7: "Wisdom, spirituality, analysis",
        8: "Power, abundance, infinity",
        9: "Completion, universal, enlightenment",
        11: "Master illuminator, intuition",
        22: "Master builder, manifestation",
        33: "Master teacher, compassion",
    }
    return {
        "input": text,
        "value": value,
        "root": root,
        "master_number": root in (11, 22, 33),
        "meaning": meanings.get(root, "Unknown"),
        "phi_ratio": round(value / PHI, 6) if value > 0 else 0,
    }


@app.function()
def sacred_alignment(day_of_year: int) -> dict:
    fib_set = set(fibonacci.local(30))
    is_prime = day_of_year > 1 and all(day_of_year % i != 0 for i in range(2, int(math.sqrt(day_of_year)) + 1))
    root = day_of_year
    while root > 9:
        root = sum(int(d) for d in str(root))
    golden_angle = 360 / (PHI * PHI)
    alignment_parts = []
    if day_of_year in fib_set:
        alignment_parts.append("Fibonacci Resonance")
    if is_prime:
        alignment_parts.append("Prime Harmonic")
    if day_of_year in SACRED_NUMBERS:
        alignment_parts.append("Sacred Number Alignment")
    if not alignment_parts:
        alignment_parts.append("Standard Sovereign Cycle")
    return {
        "day": day_of_year,
        "root": root,
        "prime": is_prime,
        "fibonacci": day_of_year in fib_set,
        "sacred": day_of_year in SACRED_NUMBERS,
        "golden_angle": round(golden_angle, 6),
        "alignment": " + ".join(alignment_parts),
    }


@app.local_entrypoint()
def main():
    print("Tessera Sovereign Compute — Sacred Mathematics Engine")
    print("=" * 55)

    fib = fibonacci.remote(21)
    print(f"\nFibonacci(21): {fib}")

    tess = numerology.remote("TESSERA")
    print(f"\nNumerology('TESSERA'): root={tess['root']}, value={tess['value']}, meaning={tess['meaning']}")

    alignment = sacred_alignment.remote(104)
    print(f"\nDay 104 alignment: {alignment['alignment']} (root {alignment['root']})")

    print("\nSovereign compute verified — Omnia in Numero.")
