import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { MiaReplyText, splitReplyBlocks } from "../lib/mia-reply-format";

const html = (text: string) => renderToStaticMarkup(createElement(MiaReplyText, { text }));

test("a single sentence stays inline", () => {
  const out = html("Hey, I'm Mia, Saabai's AI assistant. What brings you to Saabai today?");
  assert.equal(out.includes("<p"), false);
  assert.equal(out.includes("<br"), false);
  assert.match(out, /What brings you to Saabai today\?/);
});

test("blank lines render as separate paragraphs", () => {
  const text = "Saabai helps with websites and the Blueprint.\n\nStarter is $497 (GST not applicable). It maps what to automate first.";
  assert.equal(splitReplyBlocks(text).length, 2);
  const out = html(text);
  assert.equal((out.match(/<p/g) ?? []).length, 2);
  assert.ok(out.indexOf("</p>") < out.lastIndexOf("<p"), "paragraphs are not collapsed into one block");
  assert.doesNotMatch(out, /Blueprint\.\s*Starter/);
});

test("a single newline is a line break, not a space", () => {
  const out = html("First sentence here.\nSecond sentence here.");
  assert.match(out, /<br\/>/);
  assert.equal((out.match(/<p/g) ?? []).length, 1);
});

test("a short markdown list renders as a list", () => {
  const text = "Two plans fit.\n\n- Starter is $497 (GST not applicable).\n- Pro includes a call with Shane.";
  const out = html(text);
  assert.match(out, /<ul/);
  assert.equal((out.match(/<li/g) ?? []).length, 2);
  assert.equal(out.includes("- Starter"), false);
});

test("links inside a paragraph stay links", () => {
  const out = html("The free score is here.\n\nhttps://www.saabai.ai/score");
  assert.match(out, /href="https:\/\/www\.saabai\.ai\/score"/);
  assert.equal((out.match(/<p/g) ?? []).length, 2);
});

test("Mia's widget uses the paragraph renderer", () => {
  const src = readFileSync("app/components/ChatWidget.tsx", "utf8");
  assert.match(src, /<MiaReplyText text=\{item\.text\} \/>/);
  assert.equal(src.includes("renderMessageText"), false);
});
