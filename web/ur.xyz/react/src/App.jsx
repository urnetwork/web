import React, { useCallback, useState } from 'react';
import './App.css';

import Nav from './components/Nav';
import Hero from './components/Hero';
import StatsPanel from './components/StatsPanel';
import Footer from './components/Footer';

import Whitepaper from './components/sections/Whitepaper';
import Research from './components/sections/Research';
import Providers from './components/sections/Providers';
import Extenders from './components/sections/Extenders';
import Exchanges from './components/sections/Exchanges';
import Usage from './components/sections/Usage';

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

/**
 * App
 *
 * Top-level router. The site has three views:
 *
 *   • home  — the simulation landing page
 *   • docs  — the docs explorer at /docs and /docs/<slug>
 *   • api   — the OpenAPI explorer at /api
 *
 * The route is read from the URL by `useRoute`. Anything that isn't
 * /docs or /api falls through to the landing composition.
 */
export default function App() {
    const route = useRoute();

    if (route.name === 'docs') return <DocsExplorer />;
    if (route.name === 'api')  return <ApiExplorer />;

    return <HomePage />;
}

/**
 * HomePage
 *
 * Composes the landing site:
 *
 *   <Nav>             — fixed top navigation
 *   <Hero>            — full-bleed simulation under the nav
 *   <StatsPanel>      — fixed; detaches from the simulation as you scroll,
 *                       docks at the top of the whitepaper section, then
 *                       expands into a sticky ticker bar pinned under the nav
 *   <Whitepaper>      — landing section, declarative facts about the token
 *   <Research>
 *   <Providers>
 *   <Extenders>
 *   <Exchanges>
 *   <Usage>           — primary action; pricing / cost / how to use the network
 *   <Footer>
 *
 * The simulation pushes its derived stats up via `onStats` so the StatsPanel
 * can render them without being parented inside the canvas.
 */
function HomePage() {
    const [stats, setStats] = useState(INITIAL_STATS);

    // Stable callback so URSimulation does not see a new prop each render.
    const handleStats = useCallback((next) => {
        setStats(next);
    }, []);

    return (
        <div className="app">
            <Nav stats={stats} />
            <Hero onStats={handleStats} />
            <StatsPanel stats={stats} anchorId="whitepaper" />

            <main>
                <Whitepaper />
                <Research />
                <Providers />
                <Extenders />
                <Exchanges />
                <Usage />
            </main>

            <Footer />
        </div>
    );
}
