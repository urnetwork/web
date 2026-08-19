import React from 'react';
import './App.css';

import Disclaimer, { useDisclaimerVisible } from './components/Disclaimer';
import Nav from './components/Nav';
import Hero from './components/Hero';
import HomepageIntro from './components/HomepageIntro';
import StatsPanel from './components/StatsPanel';
import Footer from './components/Footer';
import LaunchVideo from './components/LaunchVideo';
import { useBlockClock, useNetworkTotals } from './lib/network';

import LandingOverview from './components/LandingOverview';
import Research from './components/sections/Research';
import Operators from './components/sections/Operators';
import Miners from './components/sections/Miners';
import Validators from './components/sections/Validators';
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
 * The landing page: simulation hero, protocol ledger stats panel, overview,
 * and role cards. The StatsPanel detaches from the hero, docks at the
 * homepage introduction, then expands
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
                anchorId="stats-anchor"
                disclaimerVisible={disclaimerVisible}
            />

            <main className="landing-main">
                <HomepageIntro />
                <LandingOverview />
            </main>

            <Footer />
            <LaunchVideo />
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
