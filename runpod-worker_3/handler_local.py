import json
import argparse
import os
import traceback
from predict import Predictor

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--input",
        type=str,
        required=True,
        help="Path to JSON file with input data"
    )
    args = parser.parse_args()

    # Загружаем JSON
    try:
        with open(args.input, "r") as f:
            payload = json.load(f)
    except Exception as e:
        print(f"Failed to read JSON: {e}")
        return

    if "input" not in payload:
        print("JSON must contain root key: 'input'")
        return

    request = payload["input"]

    print("\n=== LOCAL TEST MODE ===")
    print("Input payload:")
    print(json.dumps(request, indent=2))
    print("========================\n")

    # Загружаем пайплайн
    predictor = Predictor()

    try:
        print("Setting up predictor...")
        predictor.setup()
    except Exception as e:
        print("ERROR during setup:")
        traceback.print_exc()
        return

    # Генерация
    try:
        print("Generating image...")
        output_path = predictor.predict(**request)
    except Exception as e:
        print("ERROR during predict:")
        traceback.print_exc()
        return

    # Итог
    print("\n=== GENERATION COMPLETE ===")
    print(f"Image saved to: {output_path}")
    print("============================\n")

if __name__ == "__main__":
    main()
