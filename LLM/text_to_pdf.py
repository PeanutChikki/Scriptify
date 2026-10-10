"""LLM alias for text_to_pdf module."""
from LLM.txt_to_pdf import *

if __name__ == "__main__":
    import sys
    inp = "output.txt" if len(sys.argv) < 2 else sys.argv[1]
    out = "output.pdf" if len(sys.argv) < 3 else sys.argv[2]
    txt_to_pdf(inp, out)

