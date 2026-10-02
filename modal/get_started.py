import modal

app = modal.App("tessera-get-started")


@app.function()
def square(x):
    print(f"Computing square of {x} on Modal remote worker")
    return x ** 2


@app.function()
def cube(x):
    print(f"Computing cube of {x} on Modal remote worker")
    return x ** 3


@app.local_entrypoint()
def main():
    print("Tessera Sovereign System — Modal Remote Compute")
    print("=" * 50)

    print("\n[Square function]")
    result = square.remote(42)
    print(f"  square(42) = {result}")

    results = list(square.map(range(1, 11)))
    print(f"  square.map(1..10) = {results}")

    print("\n[Cube function]")
    result = cube.remote(7)
    print(f"  cube(7) = {result}")

    print("\nModal remote compute verified — sovereign infrastructure online.")
