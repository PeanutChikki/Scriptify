"""Root wrapper for doc_to_txt module."""
from LLM.doc_to_txt import *

if __name__ == "__main__":
    import sys
    inp = "input.docx" if len(sys.argv) < 2 else sys.argv[1]
    out = "placeholders.txt" if len(sys.argv) < 3 else sys.argv[2]
    extract_placeholders(inp, out)

