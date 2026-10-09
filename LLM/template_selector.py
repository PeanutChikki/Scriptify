import json
import re
import subprocess
import sys

MODEL = "hf.co/AtomicChat/Qwen3.5-4B-GGUF:Q4_K_M"
TABLE_FILE = "/home/suyash-naik/All/Scriptify/Database/temp_index.json"


def load_table(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def strip_thinking(text):
    """Remove any thinking text so only the final answer remains."""
    # Remove complete <think>...</think> blocks
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL | re.IGNORECASE)
    # Remove an unclosed <think> block (keep nothing after it)
    text = re.sub(r"<think>.*", "", text, flags=re.DOTALL | re.IGNORECASE)
    # Remove stray closing tag and everything before it
    if "</think>" in text.lower():
        text = re.split(r"</think>", text, flags=re.IGNORECASE)[-1]
    # Remove "Thinking... ...done thinking." blocks printed by the Ollama CLI
    text = re.sub(r"Thinking\.\.\..*?\.\.\.done thinking\.", "", text,
                  flags=re.DOTALL | re.IGNORECASE)
    # Remove ANSI escape codes (spinners, colors)
    text = re.sub(r"\x1b\[[0-9;?]*[A-Za-z]", "", text)
    return text.strip()


def ask_model(prompt):
    result = subprocess.run(
        ["ollama", "run", MODEL, "--hidethinking"],
        input=prompt,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="ignore",
    )
    if result.returncode != 0:
        sys.exit(f"Ollama error: {result.stderr.strip()}")
    return result.stdout


def detect_template(user_prompt):
    table = load_table(TABLE_FILE)
    table_text = json.dumps(table, indent=2, ensure_ascii=False)

    #user_prompt = input("Enter your prompt: ").strip()

    full_prompt = (
        "You are given an index table in JSON format:\n"
        f"{table_text}\n\n"
        f'User request: "{user_prompt}"\n\n'
        "Choose the single most suitable index from the table for this request. "
        "Reply with ONLY the index number and nothing else. No explanation."
    )

    raw_output = ask_model(full_prompt)
    final_answer = strip_thinking(raw_output)  # thinking ignored, final output stored here

    numbers = re.findall(r"\d+", final_answer)
    if not numbers:
        sys.exit("No index number found in the model's response.")

    return numbers[-1]