import React from 'react';

/**
 * BuildScenes — the six architecture models of the "Build on UR" page
 * (chassis, spine, tower, foundation, terminal, terminal3), the six product
 * screens and the six illustrative terminal apps.
 *
 * Ported from astro/public/build.html: the scene markup is the original's,
 * with the parts the standalone page's script filled in at load time (provider
 * dots, UID slots, console controls, the selected product's copy and screen,
 * the terminal app) rendered from props. Only one scene is active at a time —
 * the others stay in the DOM hidden (`.scene` is display:none), as they did.
 *
 * Every scene takes `op` (the selected opportunity), `focus` (the selected
 * component key or "") and `onFocus(key)`. The terminal and terminal3 scenes
 * also take the scrub-driven layer transforms and callout reveals; the world
 * elements expose a ref so the page can add pointer parallax without a render.
 */

/** Component accent colours, keyed by architecture component. */
export const COLORS = {
    product: 'var(--accent)',
    operator: '#ed8fff',
    subnet: '#eff7bb',
    validators: '#8cc9ff',
    miners: '#74ff61',
    providers: '#638bfc',
    emission: '#ed8fff',
    operatorproduct: 'var(--accent)',
    network: '#8cc9ff',
    subnetbase: '#eff7bb',
};

const dots = (n) => Array.from({ length: n }, (_, i) => <i key={i} />);

/** The flow-line overlays sit above every piece of a 3D world. */
const flowSvgStyle = (z, opacity) => ({
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    overflow: 'visible',
    transform: `translateZ(${z}px)`,
    pointerEvents: 'none',
    ...(opacity === undefined ? {} : { opacity }),
});

function Piece({ cls, k, label, focus, onFocus, style, children, ...rest }) {
    return (
        <button
            type="button"
            className={`piece ${cls}`}
            data-component={k}
            aria-label={label}
            aria-pressed={focus === k}
            onClick={() => onFocus(k)}
            style={style}
            {...rest}
        >
            {children}
        </button>
    );
}

/** [key, eyebrow, name] triples become the labelled callouts around a model. */
function Callouts({ items, focus, onFocus, revealed }) {
    return (
        <div className="callouts">
            {items.map(([k, eyebrow, name]) => (
                <button
                    key={k}
                    type="button"
                    className={`callout c-${k}${revealed && revealed(k) ? ' is-revealed' : ''}`}
                    data-component={k}
                    style={{ '--cc': COLORS[k] }}
                    aria-pressed={focus === k}
                    onClick={() => onFocus(k)}
                >
                    <span><b>{eyebrow}</b><span>{name}</span></span>
                </button>
            ))}
        </div>
    );
}

function OpProductCopy({ op }) {
    return (
        <div className="op-product-copy">
            <small>{op.category.toUpperCase()}</small>
            <strong>{op.title.toUpperCase()}</strong>
            <span>{op.networkUse.toUpperCase()}</span>
        </div>
    );
}

/* ---------- product screens (one per opportunity `visual`) ---------- */

const VISUALS = {
    vpn: (
        <svg viewBox="0 0 145 64"><rect className="v-dim" x="9" y="13" width="27" height="38" /><circle className="v-fill" cx="22.5" cy="32" r="8" /><path className="v-line" d="M36 32h35" /><rect className="v-fill" x="71" y="19" width="29" height="26" /><path className="v-line" d="M100 32h29" /><circle className="v-dot" cx="132" cy="32" r="4" /></svg>
    ),
    comms: (
        <svg viewBox="0 0 145 64"><path className="v-dim" d="M8 13h51v38H8zM86 13h51v38H86z" /><path className="v-line" d="M18 23h30M18 31h23M18 39h27M96 23h28M96 31h20M96 39h29M59 32h27" /><circle className="v-dot" cx="72" cy="32" r="4" /></svg>
    ),
    agent: (
        <svg viewBox="0 0 145 64"><rect className="v-dim" x="8" y="9" width="58" height="46" /><path className="v-line" d="M18 20h30M18 30h38M18 40h25M66 32h27M87 26l7 6-7 6" /><rect className="v-fill" x="97" y="15" width="39" height="34" /></svg>
    ),
    visibility: (
        <svg viewBox="0 0 145 64"><path className="v-dim" d="M8 9h129v46H8zM18 20h28M18 30h38M18 40h31" /><rect className="v-fill" x="72" y="18" width="14" height="28" /><rect className="v-fill" x="92" y="26" width="14" height="20" /><rect className="v-fill" x="112" y="13" width="14" height="33" /></svg>
    ),
    verification: (
        <svg viewBox="0 0 145 64"><rect className="v-dim" x="9" y="10" width="83" height="44" /><path className="v-line" d="M17 43l17-14 16 7 20-18 14 9" /><circle className="v-dot" cx="34" cy="29" r="3" /><circle className="v-dot" cx="70" cy="18" r="3" /><path className="v-fill" d="M108 16l22 8v15l-22 9-9-16z" /></svg>
    ),
    search: (
        <svg viewBox="0 0 145 64"><rect className="v-dim" x="9" y="14" width="127" height="24" /><circle className="v-fill" cx="25" cy="26" r="7" /><path className="v-line" d="M31 32l7 7M49 26h70M17 49h28M52 49h28M87 49h30" /></svg>
    ),
};

export function ProductScreen({ visual }) {
    return <div className="product-screen">{VISUALS[visual]}</div>;
}

/* ---------- illustrative terminal apps (one per opportunity `visual`) ---------- */

const APPS = {
    vpn: (
        <>
            <div className="app-topbar"><span>PRIVACY PRODUCT / OPERATOR TERMINAL</span><span className="app-live">NETWORK READY</span></div>
            <div className="app-layout">
                <div className="app-copy"><small>WHITE-LABEL VPN</small><h3>Private access.<br />Your product.</h3><p>A branded connection experience drawing on measured residential routes.</p><span className="app-action">CONNECTED · US</span></div>
                <div className="app-visual vpn-route">
                    <svg viewBox="0 0 220 132" aria-hidden="true"><path className="vpn-grid" d="M22 27H198M22 53H198M22 79H198M22 105H198M46 16V116M86 16V116M126 16V116M166 16V116" /><path className="vpn-path" d="M36 92C71 86 73 45 112 50S158 83 190 35" /><circle className="vpn-end vpn-you route-start" cx="36" cy="92" r="6" /><circle className="vpn-hop" cx="112" cy="50" r="7" /><circle className="vpn-end vpn-exit route-end" cx="190" cy="35" r="6" /><text x="24" y="112">YOU</text><text x="94" y="40">UID 081</text><text x="145" y="24">UNITED STATES</text></svg>
                    <div className="viz-status"><b>2-HOP ROUTE</b><span>RESIDENTIAL EXIT</span></div>
                </div>
            </div>
        </>
    ),
    comms: (
        <>
            <div className="app-topbar"><span>COMMUNICATIONS / OPERATOR TERMINAL</span><span className="app-live">ENCRYPTED SESSION</span></div>
            <div className="app-layout comms-layout">
                <div className="app-copy"><small>BUSINESS COMMS</small><h3>Private content.<br />Distributed transport.</h3><p>Your product owns identity and keys. UR carries the encrypted payload.</p><span className="app-action">24 SECURE SESSIONS</span></div>
                <div className="app-visual comms-transport">
                    <div className="comms-endpoint route-start"><i>A</i><span>ALICE</span><small>SENDER</small></div>
                    <div className="sealed-payload"><i></i><b>CIPHERTEXT</b><small>VIA UR</small></div>
                    <div className="comms-endpoint route-end"><i>B</i><span>TEAM</span><small>RECIPIENT</small></div>
                    <div className="transport-label">APPLICATION ENCRYPTION</div>
                    <div className="transport-rail">MEASURED NETWORK TRANSPORT</div>
                </div>
            </div>
        </>
    ),
    agent: (
        <>
            <div className="app-topbar"><span>AGENT INFRASTRUCTURE / OPERATOR TERMINAL</span><span className="app-live">API ONLINE</span></div>
            <div className="app-layout">
                <div className="app-copy"><small>AGENT ACCESS</small><h3>Policy-aware<br />public web access.</h3><p>Assign approved geography, route policy and an audit record to every workload.</p><span className="app-action">182 ACTIVE SESSIONS</span></div>
                <div className="app-visual agent-session">
                    <div className="agent-request route-start"><small>SESSION REQUEST</small><b>research-agent-07</b><span>{'REGION  DE'}</span><span>{'INTENT  PUBLIC RESEARCH'}</span></div>
                    <i className="agent-arrow">→</i>
                    <div className="agent-decision route-end"><small>NETWORK RESPONSE</small><b>APPROVED</b><span>UID 081 · MEASURED</span><span>AUDIT LOG 84F2</span></div>
                </div>
            </div>
        </>
    ),
    visibility: (
        <>
            <div className="app-topbar"><span>RESEARCH + INTELLIGENCE / OPERATOR TERMINAL</span><span className="app-live">36 MARKETS</span></div>
            <div className="app-layout">
                <div className="app-copy"><small>AI VISIBILITY</small><h3>Answers across<br />place and time.</h3><p>Compare the same public prompt through residential vantage points in each market.</p><span className="app-action">1,248 OBSERVATIONS</span></div>
                <div className="app-visual market-compare">
                    <div className="market-head"><span className="route-start">SAME PROMPT</span><b className="route-end">ANSWER VARIATION</b></div>
                    <div className="market-card"><b>LONDON</b><i style={{ '--w': '82%' }} /><i style={{ '--w': '54%' }} /><small>SOURCE 01</small></div>
                    <div className="market-card"><b>BERLIN</b><i style={{ '--w': '61%' }} /><i style={{ '--w': '76%' }} /><small>SOURCE 03</small></div>
                    <div className="market-card"><b>SINGAPORE</b><i style={{ '--w': '92%' }} /><i style={{ '--w': '43%' }} /><small>SOURCE 02</small></div>
                </div>
            </div>
        </>
    ),
    verification: (
        <>
            <div className="app-topbar"><span>MEDIA INTELLIGENCE / OPERATOR TERMINAL</span><span className="app-live">EVIDENCE CAPTURE</span></div>
            <div className="app-layout">
                <div className="app-copy"><small>AD VERIFICATION</small><h3>Sample what a<br />market saw.</h3><p>Capture a regional observation with the context needed to assess the result.</p><span className="app-action">98.6% SAMPLE MATCH</span></div>
                <div className="app-visual evidence-capture">
                    <div className="evidence-preview"><small>PLACEMENT 04</small><strong className="route-start">AD</strong><span>TEST IMPRESSION</span></div>
                    <div className="evidence-meta"><small>EVIDENCE RECORD</small><div><b>REGION</b><span>BERLIN, DE</span></div><div><b>ORIGIN</b><span>RESIDENTIAL</span></div><div><b>TIME</b><span>14:32:08</span></div><em className="route-end">✓ SAMPLE RETURNED</em></div>
                </div>
            </div>
        </>
    ),
    search: (
        <>
            <div className="app-topbar"><span>RETRIEVAL PRODUCT / OPERATOR TERMINAL</span><span className="app-live">DISTRIBUTED ROUTE</span></div>
            <div className="app-layout">
                <div className="app-copy"><small>PRIVATE SEARCH</small><h3>Retrieve with<br />less exposure.</h3><p>Distribute the retrieval path while your product controls query handling and logs.</p><span className="app-action">LOGGING MINIMISED</span></div>
                <div className="app-visual private-query">
                    <div className="query-box route-start"><span>How does private retrieval work?</span><b>ROUTE DISTRIBUTED</b></div>
                    <div className="source-result"><i>01</i><span><b>Private transport</b><small>SOURCE MATCH · 94%</small></span></div>
                    <div className="source-result route-end"><i>02</i><span><b>Distributed retrieval</b><small>RESULTS RETURNED · 87%</small></span></div>
                    <div className="privacy-note">QUERY LOGGING · MINIMISED</div>
                </div>
            </div>
        </>
    ),
};

export function TerminalApp({ visual }) {
    return <div className="terminal-app">{APPS[visual]}</div>;
}

/* ---------- 05 — exchange chassis ---------- */

export function ChassisScene({ active, op, focus, onFocus }) {
    return (
        <div className={`scene scene-chassis${active ? ' is-active' : ''}`}>
            <div className="chassis-asset"><div className="chassis-world">
                <div className="chassis-shadow" />
                <Piece cls="chassis-base" k="subnet" label="SN25 shared foundation" focus={focus} onFocus={onFocus}>
                    <span className="piece-label">03 / UR SUBNET · SN25 FOUNDATION</span>
                    <span className="foundation-rate">OPERATOR DEMAND · MAU × RATE + GB/DAY × RATE</span>
                    <span className="piece-name">ACCESS · RESERVE · SETTLEMENT</span>
                </Piece>
                <Piece cls="uid-switch" k="miners" label="Miner UID market" focus={focus} onFocus={onFocus}>
                    <span className="piece-label">05 / MINER UID SWITCH</span>
                    <div className="uid-slots">{dots(10)}</div>
                    <span className="piece-name">~200 top UIDs + pools</span>
                </Piece>
                <Piece cls="subnet-core" k="providers" label="Residential provider fleet" focus={focus} onFocus={onFocus}>
                    <span className="piece-label">06 / RESIDENTIAL SUPPLY</span>
                    <span className="core-copy">100K+ PROVIDERS<br />100+ COUNTRIES</span>
                    <div className="mini-provider-grid">{dots(20)}</div>
                    <span className="piece-name">Shared provider dock</span>
                </Piece>
                <Piece cls="operator-console" k="operator" label="Network Operator" focus={focus} onFocus={onFocus}>
                    <span className="piece-label">02 / NETWORK OPERATOR</span>
                    <div className="console-controls">{dots(8)}</div>
                    <span className="piece-name">Product · users · billing · policy</span>
                </Piece>
                <Piece cls="validator-gantry" k="validators" label="Independent validators" focus={focus} onFocus={onFocus}>
                    <span className="gantry-beam" /><i className="probe p1" /><i className="probe p2" /><i className="probe p3" />
                </Piece>
                <Piece cls="product-deck" k="product" label="Selected opportunity product" focus={focus} onFocus={onFocus}>
                    <OpProductCopy op={op} /><ProductScreen visual={op.visual} />
                </Piece>
                <Piece cls="emission-bus" k="emission" label="Emission and settlement" focus={focus} onFocus={onFocus}>
                    <span className="piece-name">EMISSION BUS · PAID ON MEASURED SERVICE</span>
                </Piece>
                <svg viewBox="0 0 570 320" style={flowSvgStyle(420)}><path className="traffic-line" d="M22 72H168C215 72 228 136 278 136H542" /><path className="verify-line" d="M366 20V245" /><path className="token-line" d="M70 298H510" /></svg>
            </div></div>
            <Callouts focus={focus} onFocus={onFocus} items={[
                ['product', '01 / CHANGES', 'Product + demand'],
                ['operator', '02 / OWNS', 'Network Operator'],
                ['subnet', '03 / ACCESSES', 'SN25 + reserve'],
                ['validators', '04 / MEASURES', 'Validators'],
                ['miners', '05 / ORGANISES', 'Miner UIDs + pools'],
                ['providers', '06 / ROUTES', 'Residential fleet'],
                ['emission', '07 / REWARDS', 'Emission + settlement'],
            ]} />
        </div>
    );
}

/* ---------- 06 — transit spine ---------- */

export function SpineScene({ active, op, focus, onFocus }) {
    return (
        <div className={`scene scene-spine${active ? ' is-active' : ''}`}>
            <div className="spine-asset"><div className="spine-world">
                <div className="spine-shadow" /><div className="spine-rail" /><i className="packet" />
                <Piece cls="station station-product" k="product" focus={focus} onFocus={onFocus}>
                    <span className="piece-label">01 / DEMAND</span><i className="station-core" /><span className="piece-name">{op.short}</span>
                </Piece>
                <Piece cls="station station-operator" k="operator" focus={focus} onFocus={onFocus}>
                    <span className="piece-label">02 / OPERATOR</span><i className="station-core" /><span className="piece-name">Policy + billing</span>
                </Piece>
                <Piece cls="station station-subnet" k="subnet" focus={focus} onFocus={onFocus}>
                    <span className="piece-label">03 / SN25 MARKET</span><i className="station-core" /><span className="piece-name">Access + reserve</span>
                </Piece>
                <Piece cls="validator-bridge" k="validators" focus={focus} onFocus={onFocus}>
                    <span className="bridge-top">04 / VALIDATOR BRIDGE</span><i className="bridge-probe p1" /><i className="bridge-probe p2" /><i className="bridge-probe p3" />
                </Piece>
                <Piece cls="station station-miners" k="miners" focus={focus} onFocus={onFocus}>
                    <span className="piece-label">05 / UIDs</span><i className="station-core">{dots(6)}</i><span className="piece-name">Top + pools</span>
                </Piece>
                <Piece cls="station station-providers" k="providers" focus={focus} onFocus={onFocus}>
                    <span className="piece-label">06 / SUPPLY</span><i className="station-core">{dots(8)}</i><span className="piece-name">Provider exits</span>
                </Piece>
                <Piece cls="spine-emission" k="emission" focus={focus} onFocus={onFocus}>
                    <span className="piece-name">07 / EMISSION REWARDS MEASURED SERVICE</span>
                </Piece>
            </div></div>
            <Callouts focus={focus} onFocus={onFocus} items={[
                ['product', '01 / INTAKE', 'Customer demand'],
                ['operator', '02 / CONTROL', 'Operator policy'],
                ['subnet', '03 / MARKET', 'SN25 access'],
                ['validators', '04 / PROBE', 'Verify transit'],
                ['miners', '05 / SWITCH', 'Miner UIDs'],
                ['providers', '06 / EXIT', 'Residential supply'],
                ['emission', '07 / REWARD', 'Separate token rail'],
            ]} />
        </div>
    );
}

/* ---------- 07 — subnet tower ---------- */

export function TowerScene({ active, op, focus, onFocus }) {
    return (
        <div className={`scene scene-tower${active ? ' is-active' : ''}`}>
            <div className="tower-asset"><div className="tower-world">
                <div className="tower-shadow" />
                <Piece cls="tower-slab tower-providers" k="providers" focus={focus} onFocus={onFocus}>
                    <span className="piece-label">06 / SUPPLY DOCK</span><div className="tower-provider-dots">{dots(70)}</div><span className="piece-name">100K+ providers · 100+ countries</span>
                </Piece>
                <Piece cls="tower-slab tower-miners" k="miners" focus={focus} onFocus={onFocus}>
                    <span className="piece-label">05 / MINER MARKET</span><div className="miner-ring" />
                </Piece>
                <Piece cls="tower-slab tower-subnet" k="subnet" focus={focus} onFocus={onFocus}>
                    <span className="piece-label">03 / SHARED FOUNDATION</span><div className="foundation-title">UR / SN25<small>ACCESS · RESERVE · SETTLEMENT</small></div>
                </Piece>
                <Piece cls="tower-validators" k="validators" focus={focus} onFocus={onFocus}>
                    <span className="piece-label">04 / VALIDATOR FRAME</span><i className="v-probe v1" /><i className="v-probe v2" /><i className="v-probe v3" />
                </Piece>
                <Piece cls="tower-slab tower-operator" k="operator" focus={focus} onFocus={onFocus}>
                    <span className="piece-label">02 / OPERATOR STUDIO</span><div className="operator-studio"><div>PRODUCT</div><div>USERS</div><div>BILLING</div><div>POLICY</div></div>
                </Piece>
                <Piece cls="tower-slab tower-product" k="product" focus={focus} onFocus={onFocus}>
                    <OpProductCopy op={op} /><ProductScreen visual={op.visual} />
                </Piece>
                <Piece cls="tower-emission" k="emission" focus={focus} onFocus={onFocus}>
                    <span className="piece-name">EMISSION + SETTLEMENT</span>
                </Piece>
                <i className="tower-traffic" />
            </div></div>
            <Callouts focus={focus} onFocus={onFocus} items={[
                ['product', '01 / TOP FLOOR', 'Product changes'],
                ['operator', '02 / BUSINESS', 'Operator owns'],
                ['subnet', '03 / FOUNDATION', 'SN25 shared layer'],
                ['validators', '04 / FRAME', 'Validators measure'],
                ['miners', '05 / MARKET', 'UIDs + pools'],
                ['providers', '06 / SUPPLY DOCK', 'Provider fleet'],
                ['emission', '07 / POWER', 'Reward rail'],
            ]} />
        </div>
    );
}

/* ---------- 08 — operator gateway ---------- */

export function FoundationScene({ active, op, focus, onFocus }) {
    return (
        <div className={`scene scene-foundation${active ? ' is-active' : ''}`}>
            <div className="gateway-asset"><div className="gateway-world">
                <div className="gateway-shadow" />
                <Piece cls="gateway-piece gateway-foundation" k="subnet" label="SN25 shared foundation" focus={focus} onFocus={onFocus}>
                    <span className="piece-label">03 / UR SUBNET · ACCESS + RESERVE + SETTLEMENT</span><span className="stays-shared">STAYS SHARED ACROSS EVERY EXAMPLE</span><i className="foundation-route" />
                </Piece>
                <Piece cls="gateway-piece gateway-providers" k="providers" label="Residential provider fleet" focus={focus} onFocus={onFocus}>
                    <span className="piece-label">06 / RESIDENTIAL SUPPLY</span><div className="gateway-provider-dots">{dots(48)}</div><span className="piece-name">100K+ providers · 100+ countries</span>
                </Piece>
                <Piece cls="gateway-piece gateway-miners" k="miners" label="Miner UID market" focus={focus} onFocus={onFocus}>
                    <span className="piece-label">05 / MINER UID ROUTER</span><div className="gateway-uid-bank">{dots(10)}</div><span className="piece-name">~200 top UIDs + operator pools</span>
                </Piece>
                <Piece cls="gateway-piece gateway-settlement" k="emission" label="Emission and settlement" focus={focus} onFocus={onFocus}>
                    <span className="piece-name">07 / EMISSION REWARDS MEASURED SERVICE · OPERATOR DEPOSITS STAY IN RESERVE</span>
                </Piece>
                <Piece cls="gateway-piece gateway-operator" k="operator" label="Network Operator control plane" focus={focus} onFocus={onFocus}>
                    <span className="piece-label">02 / NETWORK OPERATOR CONTROL PLANE</span><div className="operator-ports">{dots(8)}</div><span className="operator-owns">BRAND · USERS · BILLING · POLICY · SUPPORT</span><span className="piece-name">The business layer you own</span>
                </Piece>
                <Piece cls="gateway-validator" k="validators" label="Independent validator frame" focus={focus} onFocus={onFocus}>
                    <span className="validator-header">04 / INDEPENDENT VALIDATION FRAME</span><i className="validator-ray r1" /><i className="validator-ray r2" /><i className="validator-ray r3" />
                </Piece>
                <Piece cls="gateway-piece gateway-product" k="product" label="Selected opportunity product" focus={focus} onFocus={onFocus} data-op={op.slug}>
                    <OpProductCopy op={op} /><ProductScreen visual={op.visual} />
                </Piece>
                <svg viewBox="0 0 590 330" style={flowSvgStyle(500)}><path className="traffic-line" d="M32 86H184C244 86 244 144 305 144H560" /><path className="verify-line" d="M430 28V255" /><path className="token-line" d="M56 306H532" /></svg>
            </div></div>
            <Callouts focus={focus} onFocus={onFocus} items={[
                ['product', '01 / CHANGES', 'Opportunity product'],
                ['operator', '02 / YOU OWN', 'Operator control plane'],
                ['subnet', '03 / FOUNDATION', 'SN25 remains shared'],
                ['validators', '04 / MEASURES', 'Validators test paths'],
                ['miners', '05 / ORGANISES', 'Miner UIDs + pools'],
                ['providers', '06 / ROUTES', 'Residential fleet'],
                ['emission', '07 / REWARDS', 'Separate economics rail'],
            ]} />
        </div>
    );
}

/* ---------- 09 — operator terminal ---------- */

/**
 * `layers` maps a piece class to its inline transform (from the scrub);
 * `revealed(key)` says whether a callout has been revealed; `flowOpacity`
 * fades the flow lines in as the terminal opens; `worldRef`/`worldStyle`
 * belong to the tilted world (the page adds pointer parallax through the ref).
 */
export function TerminalScene({ active, op, focus, onFocus, layers, revealed, flowOpacity, worldRef, worldStyle }) {
    const t = (cls) => ({ transform: layers[cls] });
    return (
        <div className={`scene scene-terminal${active ? ' is-active' : ''}`}>
            <div className="terminal-asset"><div className="terminal-world" ref={worldRef} style={worldStyle}>
                <div className="terminal-shadow" />
                <Piece cls="terminal-piece terminal-shell" k="subnet" label="SN25 shared terminal foundation" focus={focus} onFocus={onFocus} style={t('terminal-shell')}>
                    <span className="piece-label">03 / UR SUBNET · ACCESS + RESERVE + SETTLEMENT</span><span className="shell-status">SAME FOUNDATION · EVERY PRODUCT</span>
                </Piece>
                <Piece cls="terminal-piece terminal-providers" k="providers" label="Residential provider network interface" focus={focus} onFocus={onFocus} style={t('terminal-providers')}>
                    <span className="piece-label">06 / RESIDENTIAL NETWORK INTERFACE</span><div className="terminal-provider-dots">{dots(48)}</div><span className="piece-name">100K+ providers · 100+ countries</span>
                </Piece>
                <Piece cls="terminal-piece terminal-miners" k="miners" label="Miner UID switching fabric" focus={focus} onFocus={onFocus} style={t('terminal-miners')}>
                    <span className="piece-label">05 / MINER UID SWITCHING FABRIC</span><div className="terminal-uid-bank">{dots(10)}</div><span className="piece-name">~200 top UIDs + operator pools</span>
                </Piece>
                <Piece cls="terminal-economics" k="emission" label="Emission and settlement rail" focus={focus} onFocus={onFocus} style={t('terminal-economics')}>
                    <span className="piece-name">07 / EMISSION REWARDS MEASURED SERVICE · OPERATOR DEPOSITS REMAIN IN RESERVE</span>
                </Piece>
                <Piece cls="terminal-piece terminal-operator" k="operator" label="Network Operator services" focus={focus} onFocus={onFocus} style={t('terminal-operator')}>
                    <span className="piece-label">02 / NETWORK OPERATOR SERVICES</span><div className="terminal-operator-grid">{dots(8)}</div><span className="terminal-owns">IDENTITY · BILLING · POLICY · SUPPORT · PRODUCT SERVERS</span><span className="piece-name">The business logic you own</span>
                </Piece>
                <Piece cls="terminal-piece terminal-validator" k="validators" label="Independent validator scan plane" focus={focus} onFocus={onFocus} style={t('terminal-validator')}>
                    <div className="terminal-scan-lines" />
                </Piece>
                <Piece cls="terminal-display" k="product" label="Selected customer-facing product" focus={focus} onFocus={onFocus} style={t('terminal-display')}>
                    <TerminalApp visual={op.visual} />
                </Piece>
                <svg viewBox="0 0 590 350" style={flowSvgStyle(500, flowOpacity)}><path className="traffic-line" d="M30 82H186C246 82 246 150 306 150H558" /><path className="verify-line" d="M430 30V266" /><path className="token-line" d="M54 326H534" /></svg>
            </div></div>
            <Callouts focus={focus} onFocus={onFocus} revealed={revealed} items={[
                ['product', '01 / CUSTOMER VIEW', 'Selected product'],
                ['operator', '02 / YOU OWN', 'Operator services'],
                ['subnet', '03 / FOUNDATION', 'SN25 remains shared'],
                ['validators', '04 / MEASURES', 'Validators test paths'],
                ['miners', '05 / ORGANISES', 'Miner UIDs + pools'],
                ['providers', '06 / ROUTES', 'Residential fleet'],
                ['emission', '07 / REWARDS', 'Separate economics rail'],
            ]} />
        </div>
    );
}

/* ---------- 10 — three-plane terminal (the live model) ---------- */

export function Terminal3Scene({ active, op, focus, onFocus, layers, revealed, worldRef, worldStyle }) {
    const t = (cls) => ({ transform: layers[cls] });
    return (
        <div className={`scene scene-terminal3${active ? ' is-active' : ''}`}>
            <div className="terminal3-asset"><div className="terminal3-world" ref={worldRef} style={worldStyle}>
                <div className="terminal3-shadow" />
                <Piece cls="terminal3-piece terminal3-base" k="subnetbase" label="SN25 protocol and economic foundation" focus={focus} onFocus={onFocus} style={t('terminal3-base')}>
                    <span className="piece-label">03 / SN25 SHARED FOUNDATION</span>
                    <div className="sn25-simple">
                        <div className="sn25-core"><small>UR SUBNET</small><strong>SN25</strong><span>SHARED COORDINATION</span></div>
                        <div className="sn25-definition"><small>ONE PROTOCOL BENEATH EVERY OPERATOR</small><strong>Coordinates access, service measurement and network economics.</strong><div className="foundation-rail"><span>DEMAND</span><i></i><span>SUPPLY</span></div></div>
                        <div className="sn25-functions"><span><b>01</b><strong>ACCESS NETWORK</strong><small>operators use SN25</small></span><span><b>02</b><strong>MEASURE PERFORMANCE</strong><small>uptime + transfer + proof-of-transit</small></span><span><b>03</b><strong>REWARD SUPPLY</strong><small>emissions → miner UIDs</small></span></div>
                        <div className="economics-split"><span><b>NETWORK DEMAND</b>OPERATORS → SN25 USAGE</span><i>SEPARATE<br />FLOWS</i><span><b>CHAIN EMISSION</b>ALPHA → MINER UIDs</span></div>
                    </div>
                    <span className="piece-name">UR / SN25 · SHARED FOUNDATION</span><span className="terminal3-base-status">SAME FOUNDATION · EVERY OPERATOR</span>
                </Piece>
                <Piece cls="terminal3-piece terminal3-network" k="network" label="Distributed miner UID mesh with attached residential providers and a separate validation checker" focus={focus} onFocus={onFocus} style={t('terminal3-network')}>
                    <span className="piece-label">02 / MINER UID + PROVIDER MESH</span>
                    <svg className="terminal3-mesh" viewBox="0 0 550 270" aria-hidden="true">
                        <g className="pool-zone"><rect x="164" y="42" width="128" height="186" rx="20" /><text x="179" y="61">POOL</text></g>
                        <g className="uid-links"><path d="M90 130L210 82L226 185L350 125M90 130L226 185M210 82L350 125M226 185L350 125" /></g>
                        <g className="provider-links"><path d="M90 130L48 104M90 130L45 153M90 130L74 184M90 130L126 108M210 82L181 94M210 82L239 65M210 82L247 102M226 185L189 205M226 185L258 216M226 185L264 166M350 125L316 99M350 125L387 91M350 125L393 140M350 125L369 177" /></g>
                        <g className="provider-nodes"><circle className="route-provider-in" cx="48" cy="104" r="5" /><circle cx="45" cy="153" r="5" /><circle cx="74" cy="184" r="5" /><circle cx="126" cy="108" r="5" /><circle cx="181" cy="94" r="5" /><circle cx="239" cy="65" r="5" /><circle cx="247" cy="102" r="5" /><circle cx="189" cy="205" r="5" /><circle cx="258" cy="216" r="5" /><circle cx="264" cy="166" r="5" /><circle cx="316" cy="99" r="5" /><circle cx="387" cy="91" r="5" /><circle className="route-provider-out" cx="393" cy="140" r="5" /><circle cx="369" cy="177" r="5" /></g>
                        <g className="uid-nodes"><circle className="route-uid-a" cx="90" cy="130" r="18" /><circle className="route-uid-b" cx="210" cy="82" r="18" /><circle className="route-uid-d" cx="226" cy="185" r="18" /><circle className="route-uid-c" cx="350" cy="125" r="18" /><text x="90" y="134">018</text><text x="210" y="86">071</text><text x="226" y="189">109</text><text x="350" y="129">081</text></g>
                        <g className="checker"><rect x="425" y="48" width="105" height="172" rx="13" /><text x="442" y="72">VALIDATION</text><circle cx="449" cy="103" r="10" /><path d="M444 103l4 4 7-9" /><text x="469" y="107">UPTIME</text><circle cx="449" cy="139" r="10" /><path d="M444 139l4 4 7-9" /><text x="469" y="143">TRANSFER</text><circle cx="449" cy="175" r="10" /><path d="M444 175l4 4 7-9" /><text x="469" y="179">TRANSIT</text></g>
                        <g className="trace-layer trace-traffic"><path className="trace-serial" data-trace-path="serial" pathLength="1" d="M48 104L90 130L210 82L350 125L393 140" /><path className="trace-fanout-out" data-trace-path="fanout" pathLength="1" d="M48 104L90 130M90 130L210 82L239 65M90 130L226 185L258 216M90 130L350 125L387 91" /><path className="trace-fanout-return" data-trace-path="fanout" pathLength="1" d="M239 65L210 82L350 125M258 216L226 185L350 125M387 91L350 125L393 140" /></g>
                        <g className="trace-layer trace-quality"><path pathLength="1" d="M425 103L350 125M425 139L226 185M425 175L90 130" /></g>
                    </svg>
                    <div className="mesh-caption"><span><i className="pool-key" />MINER UID</span><span><i className="provider-key" />RESIDENTIAL PROVIDER</span><span><i className="validator-key" />VALIDATION CHECKER</span></div>
                </Piece>
                <Piece cls="terminal3-product" k="operatorproduct" label="Illustrative Network Operator product UI" focus={focus} onFocus={onFocus} style={t('terminal3-product')}>
                    <TerminalApp visual={op.visual} />
                    <div className="terminal3-operator-band"><b>01 / ILLUSTRATIVE PRODUCT UI</b><span>BRAND · USERS · POLICY · BILLING · PRODUCT LOGIC</span></div>
                </Piece>
            </div></div>
            <Callouts focus={focus} onFocus={onFocus} revealed={revealed} items={[
                ['operatorproduct', '01 / CHANGES', 'Network Operator product'],
                ['network', '02 / SERVES + MEASURES', 'Provider pools + validators'],
                ['subnetbase', '03 / COORDINATES', 'SN25 shared foundation'],
            ]} />
        </div>
    );
}
