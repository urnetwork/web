// Meta-description helpers. A SERP snippet is often the only sentence of a
// page anyone reads; these keep it whole-sentence, markdown-free, and inside
// the display budget (the section intros ran to 739 chars, and the docs
// descriptions leaked "> " blockquote markers and cut mid-word).

// Chinese, Japanese and Korean text. A CJK character takes about two Latin
// characters of snippet width, so it gets its own budget, ends sentences with
// full-width 。！？ (no space follows them), and has no spaces to cut at.
const CJK = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af]/;
const CJK_STOPS = new Set(["。", "！", "？"]);

export function sentenceClamp(text, max = 158, cjkMax = 80) {
  const s = String(text || "").replace(/\s+/g, " ").trim();
  if (CJK.test(s)) return cjkClamp(s, cjkMax);
  if (s.length <= max) return s;
  const head = s.slice(0, max);
  const lastStop = Math.max(head.lastIndexOf(". "), head.lastIndexOf("! "), head.lastIndexOf("? "));
  if (lastStop >= 60) return head.slice(0, lastStop + 1);
  if (/[.!?]$/.test(head)) return head;
  return `${head.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
}

function cjkClamp(s, max) {
  // code points, so a cut never splits a surrogate pair
  const chars = Array.from(s);
  if (chars.length <= max) return s;
  const head = chars.slice(0, max);
  // the last whole sentence in budget: after a full-width stop, or after
  // ". " / "! " / "? " in embedded Latin text
  let lastStop = -1;
  head.forEach((c, i) => {
    if (CJK_STOPS.has(c) || (/[.!?]/.test(c) && head[i + 1] === " ")) lastStop = i;
  });
  if (lastStop >= Math.floor(max * 0.4)) return head.slice(0, lastStop + 1).join("");
  if (CJK_STOPS.has(head[max - 1])) return head.join("");
  // no sentence fits: cut on a character boundary, backing out of an
  // embedded Latin word rather than splitting it
  let cut = head.slice(0, max - 1).join("");
  if (/[A-Za-z0-9]/.test(chars[max - 1]) && /[A-Za-z0-9]$/.test(cut)) cut = cut.replace(/[A-Za-z0-9]+$/, "");
  return `${cut.trimEnd()}…`;
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
