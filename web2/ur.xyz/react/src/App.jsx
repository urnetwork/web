import React, { useCallback, useState } from 'react';
import './App.css';

import Disclaimer, { useDisclaimerVisible } from './components/Disclaimer';
import Nav from './components/Nav';
import Hero from './components/Hero';
import StatsPanel from './components/StatsPanel';
import Footer from './components/Footer';

import Whitepaper from './components/sections/Whitepaper';
import Research from './components/sections/Research';
import Providers from './components/sections/Providers';
import Extenders from './components/sections/Extenders';
import Community from './components/sections/Community';

import DocsExplorer from './components/DocsExplorer';
import ApiExplorer from './components/ApiExplorer';
import { useRoute } from './router';

const INITIAL_STATS = {
    totalFeesUr: 0,
    dataPB: 0,
    displayedNetworks: 250000,
    blockHeight: 0,
    totalSupply: 10000000,
    urDistributed: 0,
    urAbsorbed: 0,
    totalHeldUr: 0
};

/** Map route names to their section component. */
const SECTION_COMPONENTS = {
    research:   Research,
    providers:  Providers,
    extenders:  Extenders,
    community:  Community,
};

/**
 * App
 *
 * Top-level router. Each content section lives at its own path.
 * The docs and API explorers have their own views. Everything else
 * falls through to the simulation landing page.
 */
export default function App() {
    const route = useRoute();

    if (route.name === 'docs') return <DocsExplorer />;
    if (route.name === 'api')  return <ApiExplorer />;

    const SectionComponent = SECTION_COMPONENTS[route.name];
    if (SectionComponent) return <SectionPage Component={SectionComponent} />;

    return <HomePage />;
}

/**
 * HomePage
 *
 * The landing page: simulation hero, protocol ledger stats panel that
 * morphs as you scroll, and the whitepaper section. The scroll transition
 * between the simulation and whitepaper is preserved — the StatsPanel
 * detaches from the hero, docks at the whitepaper section, then expands
 * into a sticky ticker bar.
 */
function HomePage() {
    const [stats, setStats] = useState(INITIAL_STATS);
    const disclaimerVisible = useDisclaimerVisible();

    const handleStats = useCallback((next) => {
        setStats(next);
    }, []);

    return (
        <div className="app">
            <Disclaimer visible={disclaimerVisible} />
            <Nav stats={stats} disclaimerVisible={disclaimerVisible} />
            <Hero onStats={handleStats} />
            <StatsPanel stats={stats} anchorId="whitepaper" />

            <main>
                <Whitepaper />
            </main>

            <Footer />
        </div>
    );
}

/**
 * SectionPage
 *
 * Wraps a single section component in the shared site chrome:
 * Disclaimer, Nav, section content, Footer.
 */
function SectionPage({ Component }) {
    const disclaimerVisible = useDisclaimerVisible();

    return (
        <div className="app">
            <Disclaimer visible={disclaimerVisible} />
            <Nav disclaimerVisible={disclaimerVisible} />

            <main className="section-page">
                <Component />
            </main>

            <Footer />
        </div>
    );
}
