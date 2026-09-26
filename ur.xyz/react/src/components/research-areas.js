/**
 * The research page's algorithm areas — what the React SPA and the two Astro
 * shells share besides the components themselves (ResearchExtras.jsx):
 *
 *   - the anchor id of each area, keyed by its tag (the ids are the public
 *     deep links, /research#transport, so they live in code, not in the six
 *     dictionaries);
 *   - the deep-link opener: a /research#<id> visit opens that area's
 *     <details>. The SPA runs it from a mount effect (ResearchAreas); the
 *     static pages inline it as RESEARCH_DEEP_LINK_SCRIPT, so the areas
 *     themselves are plain HTML and hydrate nothing;
 *   - the structured data of the page: a CollectionPage whose ItemList names
 *     each area with its fragment URL (Base.astro merges it into the graph).
 *
 * No React in here: the Astro frontmatter imports it at build time.
 */

export const RESEARCH_AREA_IDS = Object.freeze({
    URTRANSPORT1: 'transport',
    UREXTENDER1: 'extender',
    'UR-FP2': 'matching',
    'UR-MULTI': 'multi-client',
    'UR-TRANSFER': 'transfer',
    'UR-IP': 'ip-egress',
    'UR-PSUB2': 'reward-allocation',
    'UR-CONTRACT': 'permissions',
    'UR-SEC1': 'safety',
    'UR-VERIFY1': 'routing-verification',
});

/** The anchor id of an area by its tag; an unlisted tag gets a slug of itself. */
export function researchAreaId(tag) {
    return RESEARCH_AREA_IDS[tag] || String(tag).toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

/**
 * Open the area a location hash names (and mark it, for the CSS highlight,
 * since a target set before the SPA rendered the element never matches
 * :target). Self-contained on purpose: its source is inlined verbatim into
 * the static pages (RESEARCH_DEEP_LINK_SCRIPT), so it may use nothing from
 * this module's scope. scrollIntoView is instant (no smooth behavior), so it
 * respects a reduced-motion preference by construction.
 */
export function openResearchArea(hash) {
    var id = String(hash || '').replace(/^#/, '');
    if (!id) return;
    var el = document.getElementById(id);
    if (!el || el.tagName !== 'DETAILS' || !el.classList.contains('research-area')) return;
    var linked = document.querySelectorAll('.research-area.is-linked');
    for (var i = 0; i < linked.length; i++) linked[i].classList.remove('is-linked');
    el.classList.add('is-linked');
    if (!el.open) el.open = true;
    el.scrollIntoView({ block: 'start' });
}

/**
 * The inline script of the static research pages: the opener above, run
 * once (the script sits after the areas in the HTML) and on every hash
 * change. Built from the function's own source so there is one copy of the
 * logic; the function keeps to ES5 and its own scope for that reason.
 */
export const RESEARCH_DEEP_LINK_SCRIPT =
    `(function(){var open=${openResearchArea.toString()};open(location.hash);` +
    `addEventListener('hashchange',function(){open(location.hash);});})();`;

const SITE_ORIGIN = 'https://ur.xyz';

/**
 * schema.org nodes for a research page: a CollectionPage (the page itself,
 * part of the site's WebSite node) whose main entity is the ItemList of the
 * algorithm areas, each named and linked by its fragment.
 */
export function researchCollectionJsonLd(t, { canonical, lang, description }) {
    const r = t.research;
    return [{
        '@type': 'CollectionPage',
        '@id': `${canonical}#collection`,
        url: canonical,
        name: r.title,
        description,
        inLanguage: lang,
        isPartOf: { '@id': `${SITE_ORIGIN}/#website` },
        mainEntity: {
            '@type': 'ItemList',
            numberOfItems: r.papers.length,
            itemListOrder: 'https://schema.org/ItemListOrderAscending',
            itemListElement: r.papers.map((p, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                name: `${p.title} (${p.tag})`,
                url: `${canonical}#${researchAreaId(p.tag)}`,
            })),
        },
    }];
}
