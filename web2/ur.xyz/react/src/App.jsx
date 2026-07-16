import React from 'react';
import './App.css';

import Disclaimer, { useDisclaimerVisible } from './components/Disclaimer';
import Nav from './components/Nav';
import Hero from './components/Hero';
import StatsPanel from './components/StatsPanel';
import Footer from './components/Footer';
import { useBlockClock, useNetworkTotals } from './lib/network';

import Whitepaper from './components/sections/Whitepaper';
import Research from './components/sections/Research';
import Operators from './components/sections/Operators';
import Miners from './components/sections/Miners';
import Validators from './components/sections/Validators';
import Community from './components/sections/Community';
import Roadmap from './components/sections/Roadmap';
import PriceSection from './components/PriceSection';
import LegalSection from './components/LegalSection';

import DocsExplorer from './components/DocsExplorer';
import ApiExplorer from './components/ApiExplorer';
import { useRoute } from './router';

const Terms = () => <LegalSection doc="terms" />;
const Privacy = () => <LegalSection doc="privacy" />;
const Vdp = () => <LegalSection doc="vdp" />;

/** Map route names to their section component. */
const SECTION_COMPONENTS = {
    operators:  Operators,
    miners:     Miners,
    validators: Validators,
    research:   Research,
    community:  Community,
    roadmap:    Roadmap,
    price:      PriceSection,
    terms:      Terms,
    privacy:    Privacy,
    vdp:        Vdp,
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
    const block = useBlockClock();
    const network = useNetworkTotals();
    const disclaimerVisible = useDisclaimerVisible();

    return (
        <div className="app">
            <Disclaimer visible={disclaimerVisible} />
            <Nav disclaimerVisible={disclaimerVisible} />
            <Hero block={block} network={network} />
            <StatsPanel
                block={block}
                network={network}
                anchorId="whitepaper"
                disclaimerVisible={disclaimerVisible}
            />

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
