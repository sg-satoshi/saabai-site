# Lex Assist knowledge

One file per topic. Edit the text, then run `node scripts/build-lex-help.mjs` (CI fails if the generated file is stale).

Front matter:
- `title`: section heading.
- `routes`: comma-separated Lex paths; the section is boosted when the user is on that screen.
- `keywords`: extra words for retrieval.

The placeholder `{{LEX_MATTERS_PRIVACY_COPY}}` is filled from the live privacy copy. Never put a price figure in these files: price questions always get "Pricing is set after the trial, and you'll see the full price, GST and terms before you pay anything." (tests fail on any $ figure).
Product help only, never legal advice. Write from the real UI labels.
