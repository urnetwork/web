/**
 * Copying for the site's Copy buttons: the docs' code blocks (markdown.jsx)
 * and the reserve's wallet address (pages/Reserve.jsx).
 */

/**
 * Put `text` on the clipboard. Where the page has no clipboard access, `el`'s
 * text is selected and the browser's own copy command tried instead. True
 * when it was copied; otherwise the text is left selected to copy by hand.
 */
export async function copyText(text, el) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        return selectAndCopy(el);
    }
}

/** Select an element's text and copy it with the browser's own command. True when it was copied. */
function selectAndCopy(el) {
    if (!el || typeof window === 'undefined' || !window.getSelection) return false;
    const range = document.createRange();
    range.selectNodeContents(el);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    try {
        return document.execCommand('copy');
    } catch {
        return false;
    }
}
