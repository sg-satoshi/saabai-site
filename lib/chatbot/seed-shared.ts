/** Pure helpers shared by the server and the admin editor (no Redis imports). */
export const WIDGET_SRC = "https://www.saabai.ai/embed/chat.v1.js";
export const installSnippet = (slug: string, src = WIDGET_SRC) => `<script id="saabai-chat-v2" src="${src}" data-site="${slug}" async></script>`;
