"""Root wrapper for template_selector module."""
from LLM.template_selector import *

if __name__ == "__main__":
    import sys
    prompt = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else "Leave application"
    print(detect_template(prompt))

