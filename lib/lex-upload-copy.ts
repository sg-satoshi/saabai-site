/**
 * Client-safe privacy copy for large Lex uploads. Shown on /privacy and in Draft Documents ONLY while
 * LEX_BLOB_UPLOADS is on. Wording needs Shane's OK when he turns the flag on.
 */
export const LEX_BLOB_PRIVACY_COPY = "Large files are held briefly in secure temporary storage while being read, then deleted automatically within an hour.";
export const LEX_PRIVACY_S5_DEFAULT = "We do not store uploaded files on our servers.";

/** Lex matters, research chats and redaction logs, as the code stores them. */
export const LEX_MATTERS_PRIVACY_COPY = "If you work inside a matter, some of your work is kept on our servers with that matter, where everyone in your firm can see it. Research chats in a matter are saved to it automatically. A finished draft or a document review (including the document's text) is only saved to a matter if you choose Save to matter. Items saved to a matter are kept until someone in your firm removes them, or until 30 days after your firm's Lex plan ends, when we delete them along with your research chats (you can email hello@saabai.ai for a copy before then). Your research chats are also kept on our servers for 90 days after your last change, so you can return to them. Names and identifiers in documents you attach to a research chat are masked before the chat is saved, in your research history and in a matter (if a document cannot be masked, its text is not saved), but the questions you type and the drafts and reviews you save to a matter keep real names. Lex's answers can repeat names from your document. Each time Lex masks text we keep a log of the types and number of items masked (for example two names and one email), never the text itself.";
