/** Client-safe Lex upload limits. */
export const LEX_MAX_FILE_BYTES = 25 * 1024 * 1024;
export const LEX_MAX_TOTAL_BYTES = 50 * 1024 * 1024;
/** Files at or under this go in the form body. Leaves headroom under Vercel's 4.5 MB limit. */
export const LEX_DIRECT_MAX_BYTES = 4 * 1024 * 1024;
