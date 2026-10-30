# Lex help assistant knowledge

One file per topic. Edit the text, then run `node scripts/build-lex-help.mjs` (CI fails if the generated file is stale).

Front matter:
- `title`: section heading.
- `routes`: comma-separated Lex paths; the section is boosted when the user is on that screen.
- `keywords`: extra words for retrieval.

Placeholders `{{LEX_TERMS}}`, `{{LEX_TERMS_SUMMARY}}` and `{{LEX_MATTERS_PRIVACY_COPY}}` are filled from the live code copy so terms and privacy never drift.
Product help only, never legal advice. Write from the real UI labels.
