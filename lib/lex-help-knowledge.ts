/**
 * Lex help assistant knowledge. Written from the actual Lex UI (app/lex/_components) and the live
 * terms and privacy copy, which are imported (not retyped) so the assistant never drifts from them.
 * Update this file when a Lex screen changes. Product help only: never legal advice.
 */
import { LEX_TERMS, LEX_TERMS_SUMMARY } from "./lex-terms";
import { LEX_MATTERS_PRIVACY_COPY } from "./lex-upload-copy";

export const LEX_HELP_SECTIONS: { id: string; title: string; body: string }[] = [
  { id: "overview", title: "What Lex is", body: "Lex is Saabai's AI workspace for Australian law firms. The left sidebar switches between Dashboard, Research, Draft, Review and Matters, and holds your recent research threads and projects. Your firm name and login are at the bottom of the sidebar, which opens Account. Lex helps lawyers work faster, but a lawyer must check everything it produces before relying on it." },
  { id: "research", title: "Research", body: "Ask a legal research question in the composer and Lex searches, reads sources and writes an answer with Conclusions and Sources. Each answer has Copy and Export to Word, and Draft to start a document from it. Use New research to start a fresh thread. Threads can be renamed, moved into a project by dragging, or opened from the sidebar. Email research thread sends all questions and answers, with citations. If an answer looks wrong, use Flag an issue with this answer under it." },
  { id: "draft", title: "Draft documents", body: "Draft walks you through Setup questions, then writes the document. It is jurisdiction aware. Before use, the QA check runs (Checking every citation and clause) and lists References in this draft, each with Show in draft, Research this and Find on AustLII. Every draft is marked Must review before use. You can Edit answers to regenerate, Export to Word, or Send to client. Uploaded files are read to fill the draft and then discarded, and draft progress is saved only in your browser for 30 days." },
  { id: "review", title: "Review and compare documents", body: "Review a document checks an uploaded document and lists issues for a lawyer to consider. Compare shows the differences between two versions. Your firm has a daily cap on reviews and compares; when it is reached Lex says so and the limit resets at midnight Brisbane time. A review can be sent to a supervisor and saved to a matter." },
  { id: "matters", title: "Matters", body: "Matters keep a client's research, drafts and reviews together for your firm. Use New matter and fill in Matter name, Client name, Matter type, Area, Brief description, Other parties and aliases, Notes and deadlines. Open matters shows Next deadline and Overdue items. Inside a matter, New research in this matter, Draft a document and Review a document all save there. Leave matter (Stop working in this matter) returns to general work. Adding other parties and aliases helps Lex mask those names before anything goes to the AI model." },
  { id: "privacy", title: "Privacy and masking", body: `Before any text reaches an AI model, Lex masks names, emails, phone numbers and other identifiers, then puts the real names back in the reply you see. If masking fails, nothing is sent. ${LEX_MATTERS_PRIVACY_COPY}` },
  { id: "account", title: "Account, team and billing", body: "Account has Details (Your login, Firm, Email), Change password, Firm settings, Firm workspace, Billing (Manage billing opens your secure billing page), Billing history and Invoices, and Sign out. The firm owner can invite lawyers up to the plan's seats from the firm plan panel. For questions, more users or more capacity, use Contact Saabai or email hello@saabai.ai." },
  { id: "terms", title: "Plan and terms", body: `${LEX_TERMS_SUMMARY} ${LEX_TERMS.map((t) => `${t.heading}: ${t.body}`).join(" ")} The full terms are at saabai.ai/terms (section 10) and the privacy policy at saabai.ai/privacy.` },
  { id: "feedback", title: "Reporting problems and ideas", body: "The Report an issue / Suggest a feature button on every Lex screen sends a bug, idea or question to the Saabai team, with an optional screenshot. Please don't include client names or identifying details. This assistant can also log a problem or a feature idea for you if you confirm." },
];

export function helpKnowledgeText(): string {
  return LEX_HELP_SECTIONS.map((s) => `## ${s.title}\n${s.body}`).join("\n\n");
}
