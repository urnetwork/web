// Placeholder for the day a page's content last changed. A page writes it
// where it states that date (the docs pages' TechArticle dateModified); the
// build replaces it once scripts/page-dates.mjs has fingerprinted the page, so
// the page and the sitemap's <lastmod> give the same day. It is only in the
// <head>, which the fingerprint does not read.
export const LASTMOD_TOKEN = '__UR_PAGE_LASTMOD__';
