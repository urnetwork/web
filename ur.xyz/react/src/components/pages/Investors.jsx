import React from 'react';
import InvestorCentre from './investors/InvestorCentre';
import DeckViewer from './investors/DeckViewer';
import InvestorAnnouncement from './investors/InvestorAnnouncement';
import InvestorLetter from './investors/InvestorLetter';
import TokenholderLetter from './investors/TokenholderLetter';

/**
 * The Investor Centre and its documents, one component per slug.
 *
 * Rendered by the SPA (App.jsx, inside SectionPage) and server-rendered by
 * the Astro build's thin pages (astro/src/pages/investors*.astro), which own
 * the <head> and the shell. This returns only what goes inside
 * <main class="section-page">; each document brings its own wrapper and
 * stylesheet.
 */
const DOCUMENTS = new Map([
    ['deck', DeckViewer],
    ['conviction-lock', InvestorAnnouncement],
    ['our-letter-to-bittensor', InvestorLetter],
    ['letter-to-tokenholders-september-2026', TokenholderLetter],
    // The letter's former address: the Astro page redirects there, the SPA
    // simply renders the letter.
    ['august-investment-letter', InvestorLetter],
]);

export default function InvestorsPage({ route }) {
    const Document = DOCUMENTS.get(route?.slug) || InvestorCentre;
    return <Document />;
}
