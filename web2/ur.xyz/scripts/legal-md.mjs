/**
 * Markdown → HTML for the legal documents. Shared by the ur.io and ur.xyz
 * legal-page generators.
 *
 * A real CommonMark parser is deliberately NOT used: the documents are
 * pandoc-flavored contracts. Their nested clause lists ("1." / "a." / "i."
 * with four-space hanging indents) would parse as code blocks under
 * CommonMark, silently mangling legal text. This converter handles exactly
 * the constructs these documents use, and nothing else:
 *
 *   #/##/### headings; "-" bullet lists; "> " blockquotes; contract clauses
 *   at 0/4/8-space indents; **bold**; [text](url); <email@host>; pandoc's
 *   backslash escapes (\" \' \. etc.).
 */

const escapeHtml = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function inline(text) {
  let s = text;
  // pandoc backslash escapes first, so \" never reaches the html attr stage
  s = s.replace(/\\([^\w\s])/g, "$1");
  s = escapeHtml(s);
  // autolinked emails were escaped to &lt;a@b&gt;
  s = s.replace(/&lt;([^\s@&]+@[^\s@&]+\.[^\s@&]+)&gt;/g, '<a href="mailto:$1">$1</a>');
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|mailto:[^)\s]+)\)/g, '<a href="$2">$1</a>');
  // [text](bare.domain) links used by the ur.xyz doc
  s = s.replace(/\[([^\]]+)\]\((?!https?:|mailto:)([^)\s]+)\)/g, '<a href="https://$2">$1</a>');
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  return s;
}

// A clause marker: "12.", "a.", "iv." — the shapes these contracts use.
const CLAUSE = /^(\d+|[a-z]|[ivxl]+)\.\s+/;

export function legalMdToHtml(md) {
  const blocks = md.replace(/\r\n/g, "\n").split(/\n{2,}/);
  const out = [];

  for (const raw of blocks) {
    if (!raw.trim()) continue;
    const lines = raw.split("\n");
    const first = lines[0];

    const heading = first.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      out.push(`<h${level}>${inline(heading[2].trim())}</h${level}>`);
      // a heading block may carry following paragraph lines
      const rest = lines.slice(1).join(" ").trim();
      if (rest) out.push(`<p>${inline(rest.replace(/\s+/g, " "))}</p>`);
      continue;
    }

    if (lines.some((l) => /^\s*-\s+/.test(l)) && lines.every((l) => /^\s*-\s+/.test(l) || /^\s{2,}\S/.test(l))) {
      // bullet list; continuation lines are indented
      const items = [];
      for (const l of lines) {
        const m = l.match(/^\s*-\s+(.*)$/);
        if (m) items.push(m[1]);
        else if (items.length) items[items.length - 1] += ` ${l.trim()}`;
      }
      out.push(`<ul>${items.map((i) => `<li>${inline(i)}</li>`).join("")}</ul>`);
      continue;
    }

    if (lines.every((l) => /^>\s?/.test(l) || !l.trim())) {
      const text = lines.map((l) => l.replace(/^>\s?/, "")).join(" ").trim();
      out.push(`<blockquote><p>${inline(text.replace(/\s+/g, " "))}</p></blockquote>`);
      continue;
    }

    // contract clause: indent depth (0/4/8 spaces) sets the nesting class
    const indent = (first.match(/^\s*/) || [""])[0].length;
    const stripped = first.trim();
    if (CLAUSE.test(stripped)) {
      const depth = indent >= 8 ? 2 : indent >= 4 ? 1 : 0;
      const text = lines.map((l) => l.trim()).join(" ").replace(/\s+/g, " ");
      out.push(`<p class="clause clause-${depth}">${inline(text)}</p>`);
      continue;
    }

    const text = lines.map((l) => l.trim()).join(" ").replace(/\s+/g, " ");
    out.push(`<p>${inline(text)}</p>`);
  }

  return out.join("\n");
}

/** First h1/h2 text, for the page title. */
export function legalTitle(md) {
  const m = md.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : "Legal";
}

/** "Last modified"/"Last Revised" line, when the document carries one. */
export function legalUpdated(md) {
  const m = md.match(/^\**Last (?:modified|Revised):?\s*([^*\n]+?)\**\s*$/im);
  return m ? m[1].trim() : null;
}
