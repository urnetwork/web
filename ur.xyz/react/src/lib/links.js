// Which links open a new tab. The section cards opened every link in a new
// tab, which is right for GitHub and the operators' stores and wrong for a
// guide on this site (/docs/miner): an internal link opens in place, and the
// static pages (astro/src/components/CardGrid.astro) apply the same rule.

/** An absolute http(s) URL, i.e. a link that leaves the site. */
export function isExternal(href) {
    return /^https?:\/\//i.test(String(href || ''));
}

/** The attributes an external link gets. */
export const EXTERNAL = Object.freeze({ target: '_blank', rel: 'noopener noreferrer' });
