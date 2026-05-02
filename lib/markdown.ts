/**
 * Server-only markdown rendering for project descriptions and READMEs.
 *
 * Pipeline: marked (GFM, no breaks) -> isomorphic-dompurify (strict allow-list).
 * We strip script/iframe/onclick/etc and explicitly drop event-handler attributes.
 * Images, code blocks, links, tables, and lists are all preserved.
 */

import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";

// Configure marked once at module load — no async extensions, sync mode.
marked.setOptions({
  gfm: true,
  breaks: false,
  // We sanitize downstream, so don't let marked silently mangle anything.
  pedantic: false,
});

const ALLOWED_TAGS = [
  "a",
  "blockquote",
  "br",
  "code",
  "del",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "img",
  "li",
  "ol",
  "p",
  "pre",
  "s",
  "span",
  "strong",
  "sub",
  "sup",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "ul",
];

const ALLOWED_ATTR = [
  "href",
  "title",
  "alt",
  "src",
  "class",
  "id",
  "name",
  "target",
  "rel",
  "align",
  "width",
  "height",
];

/**
 * Render a markdown string into sanitized HTML safe for `dangerouslySetInnerHTML`.
 * Returns an empty string for nullish/blank input.
 */
export function renderMarkdown(md: string): string {
  if (!md || typeof md !== "string") return "";

  // marked() can return Promise<string> when async extensions are registered.
  // We register none, so the synchronous overload (string input, no `async`) returns string.
  const rawHtml = marked.parse(md, { async: false }) as string;

  return DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // Belt-and-suspenders: even if a tag slipped through, kill JS protocols.
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel|ftp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    FORBID_TAGS: ["script", "iframe", "object", "embed", "style", "form", "input", "button"],
    FORBID_ATTR: [
      "onerror",
      "onload",
      "onclick",
      "onmouseover",
      "onfocus",
      "onblur",
      "onsubmit",
      "onchange",
      "style",
    ],
  });
}
