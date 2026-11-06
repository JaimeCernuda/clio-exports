"""Tokenizer study for the Polaris Chain B attention demo.

Explains what the attention heat display shows by comparing how Granite 4.2 and
other open-weight tokenizers split the demo prompt: word splits, punctuation,
pre-tokenizer rules, and whether recorded heat runs sit on real token boundaries.

Run it with ``uv run python tools/run_tokenizer_study.py --help``. Findings are in
``polaris-2026-10/tokenizer-study/README.md``.
"""
