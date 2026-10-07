// Placeholder for the day a page's content last changed. A page writes it
// where it states that date (the docs pages' TechArticle dateModified and the
// "Updated" line under their title); the build replaces it once
// scripts/page-dates.mjs has fingerprinted the page, so the page and the
// sitemap's <lastmod> give the same day. The fingerprint reads neither the
// token nor the day that replaces it.
export const LASTMOD_TOKEN = '__UR_PAGE_LASTMOD__';
