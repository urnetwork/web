// Meta-description helpers. A SERP snippet is often the only sentence of a
// page anyone reads; these keep it whole-sentence, markdown-free, and inside
// the display budget (the section intros ran to 739 chars, and the docs
// descriptions leaked "> " blockquote markers and cut mid-word).

export function sentenceClamp(text, max = 158) {
  const s = String(text || "").replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  const head = s.slice(0, max);
  const lastStop = Math.max(head.lastIndexOf(". "), head.lastIndexOf("! "), head.lastIndexOf("? "));
  if (lastStop >= 60) return head.slice(0, lastStop + 1);
  if (/[.!?]$/.test(head)) return head;
  return `${head.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
}

// crude markdown → prose for description derivation
export function mdToText(md) {
  return String(md || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^#{1,6}\s+.*$/gm, " ") // headings (incl. the H1 that repeated the title)
    .replace(/^>\s?/gm, "") // blockquote markers
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_`~]/g, "")
    .replace(/->/g, "→")
    .replace(/&#34;|&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export function docDescription(content, title, max = 158) {
  let text = mdToText(content);
  // don't open by repeating the title the <title> already carries
  if (title && text.toLowerCase().startsWith(String(title).toLowerCase())) {
    text = text.slice(String(title).length).replace(/^[\s—:–-]+/, "");
  }
  return sentenceClamp(text, max);
}
