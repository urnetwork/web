import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BUILD_ARCH, BUILD_V12 } from '../../data/buildContent';
import {
    COLORS,
    ChassisScene, SpineScene, TowerScene, FoundationScene, TerminalScene, Terminal3Scene,
} from './BuildScenes';
import { ArchitectureReadout, BriefPanel, Readout } from './BuildBrief';
import './Build.css';

/**
 * BuildPage — /build, "Build on UR | Network Operator opportunities".
 *
 * Renders only what goes inside <main class="section-page">: the SPA's
 * SectionPage and astro/src/pages/build.astro both wrap it in the shared
 * Disclaimer / Nav / Footer shell. Ported from the standalone
 * astro/public/build.html, whose inline scripts became the state below.
 *
 * The page has one live design — version 12, the "native ur.xyz shell" around
 * the three-plane terminal model — and keeps the earlier editions reachable
 * through the query string, as the standalone page did:
 *
 *   ?model=terminal5 (default)  version 12, model terminal3
 *   ?model=terminal4            version 11 ("builder edition"), model terminal3
 *   ?model=chassis|spine|tower|foundation|terminal|terminal3   version 10
 *   ?op=1..6                    the initially selected opportunity
 *   ?brief=1                    open the opportunity brief
 *
 * The attributes the scripts set on <html> (data-model, data-version,
 * data-content-view, data-brief-mode, data-brief-open, data-op and the accent
 * variables) live on the page wrapper, and Build.css keys off it. Astro renders
 * the component on the server, so the default is rendered first and the query
 * string is read in an effect; nothing touches window/document during render.
 */

const OPS = BUILD_ARCH.opportunities;
const MODELS = ['chassis', 'spine', 'tower', 'foundation', 'terminal', 'terminal3'];

/** ?model= → { model, version, isV11, isV12, builder } (the script's isBuilderEdition). */
function resolveVariant(modelParam) {
    const param = modelParam || 'terminal5';
    const isV11 = param === 'terminal4';
    const isV12 = param === 'terminal5';
    const builder = isV11 || isV12;
    const model = builder ? 'terminal3' : MODELS.includes(param) ? param : 'terminal';
    return { model, version: isV12 ? '12' : isV11 ? '11' : '10', isV11, isV12, builder };
}
const DEFAULT_VARIANT = resolveVariant(null);
const isTerminalModel = (model) => model === 'terminal' || model === 'terminal3';
const initialView = (model) => (isTerminalModel(model) ? 'scrub' : 'open');
const initialBriefMode = (model) => (model === 'terminal3' ? 'editorial' : 'structured');

/* ---------- copy ---------- */

const MODEL_COPY = {
    chassis: { number: '05 / Exchange chassis', title: 'Open the network operator.', copy: 'The chassis turns the architecture into one coherent machine. Open it to separate the customer product from the operator, subnet access, validation, miner market and residential supply.', meta: 'UR / NETWORK OPERATOR EXCHANGE' },
    spine: { number: '06 / Transit spine', title: 'Follow demand through the subnet.', copy: 'The transit spine reads left to right: customer demand enters an operator, crosses SN25 and its validation bridge, resolves through miner UIDs and exits through residential supply.', meta: 'UR / DEMAND TRANSIT SPINE' },
    tower: { number: '07 / Subnet tower', title: 'Build upward from SN25.', copy: 'The tower makes the hierarchy literal. Residential supply and the miner market support SN25; validators measure it; the operator and customer product occupy the floors above.', meta: 'UR / SUBNET FOUNDATION TOWER' },
    foundation: { number: '08 / Operator gateway', title: 'Change the product. Keep the foundation.', copy: 'The gateway is one coherent system: the selected opportunity becomes the product module, the Network Operator remains the control plane, and SN25 stays underneath as the shared foundation for routing, measurement and incentives.', meta: 'UR / NETWORK OPERATOR GATEWAY' },
    terminal: { number: '09 / Operator terminal', title: 'See the product. Then open the system.', copy: 'The terminal begins as the customer-facing product a Network Operator brings to market. Drag it apart to see how operator services and the shared SN25 architecture power that product underneath.', meta: 'UR / NETWORK OPERATOR TERMINAL' },
    terminal3: { number: '10 / Three-plane terminal', title: 'One operator product. Two shared planes underneath.', copy: 'The product and Network Operator now form one changing module. Open the terminal to reveal the shared provider-and-validator network seated on the SN25 protocol and economic foundation.', meta: 'UR / THREE-PLANE OPERATOR TERMINAL' },
};
const SECTION_HEAD_V11 = { number: 'Six starting points', title: 'What could run on UR?', copy: 'Choose an example to see an illustrative product surface above the same provider network and SN25 foundation. The six are prompts for builders, not a limit on what the infrastructure can support.', meta: 'UR / BUILD ON SHARED INFRASTRUCTURE' };
const SECTION_HEAD_V12 = { number: 'Network Operator model', title: 'See the network beneath the product.', copy: 'Select one of six example products, then reveal the provider network and subnet foundation beneath its interface. Each shows one way builders could use the same shared infrastructure.', meta: 'UR / ONE PRODUCT · TWO SHARED PLANES' };

const HERO_V10 = { eyebrow: 'The opportunity', h2: ['Bring the product.', 'Build on the subnet.'], p: 'A Network Operator turns customer demand into a product powered by UR. The operator owns the experience and commercial relationship; SN25 supplies measured residential routing and the incentive market beneath it.' };
const HERO_V11 = { eyebrow: 'For builders', h2: ['Bring the product.', 'Build on the network.'], p: 'Build a customer product on top of UR’s shared residential network. You own the experience, users and commercial model; SN25 coordinates access, service measurement and incentives underneath.' };
const HERO_V12 = { eyebrow: 'Build', p: 'Launch or migrate existing products onto UR’s residential privacy network. Network Operators own the customer experience and bring demand; UR provides the infrastructure. UR (SN25) is extending network coordination and incentives to Bittensor.' };

const CTA_V11 = { eyebrow: 'Bring the next opportunity', title: 'What should run on UR?', copy: 'Bring an existing product or an idea these examples do not cover. Start a conversation about network fit, available infrastructure and what it could take to operate on SN25.' };
const CTA = { eyebrow: 'The next operator', title: 'Become a Network Operator', copy: 'Bring an existing product or explore launching a new one on top of our fleet of network providers. Read the documentation and speak with the UR team about network fit.' };

/** The three planes of the terminal3 model, worded per edition. */
const TERMINAL3_COMPONENTS = [
    { key: 'operatorproduct', n: '01', verb: 'CHANGES', name: 'Network Operator product', short: 'The product, audience and commercial relationship change.', detail: 'The Network Operator brings the customer-facing product, app or API, brand, users, policy, billing and product logic. Selecting another opportunity changes this entire top module.' },
    { key: 'network', n: '02', verb: 'ROUTES + MEASURES', name: 'Miner UID + provider network', short: 'Provider supply attaches to miner UIDs; validators check it separately.', detail: 'Every miner is represented by a UID, with residential providers attached to those UIDs. Some miners participate through a pooled arrangement. Customer traffic traverses selected miner UIDs and provider routes; validators independently test the service but are not traffic hops.' },
    { key: 'subnetbase', n: '03', verb: 'COORDINATES', name: 'SN25 protocol + economic backplane', short: 'Coordinates access, UIDs, measurement, reserve and settlement.', detail: 'SN25 is the shared substrate beneath every Network Operator. It coordinates network access and the UID registry, accepts independent measurement, and keeps operator demand into the reserve separate from chain emission paid to measured miners and validators.' },
];
const TERMINAL3_COMPONENTS_V11 = [
    { key: 'operatorproduct', n: '01', verb: 'CHANGES', name: 'Illustrative operator product', short: 'The product and customer relationship change.', detail: 'The Network Operator brings the customer-facing product, audience, brand, policy, billing and product logic. Selecting another example changes this top plane.' },
    { key: 'network', n: '02', verb: 'CONNECTS', name: 'Provider network + validation', short: 'Shared routes beneath every product.', detail: 'Residential providers connect through miner UIDs to form distributed supply. Validators check service quality separately; they are not traffic hops.' },
    { key: 'subnetbase', n: '03', verb: 'COORDINATES', name: 'SN25 shared foundation', short: 'The common coordination and incentive layer.', detail: 'SN25 coordinates access to the provider network, service measurement and the incentive system supporting useful supply.' },
];
const TERMINAL3_COMPONENTS_V12 = [
    { key: 'operatorproduct', n: '01', verb: 'CHANGES', name: 'Network Operator product', short: 'The product, audience and customer relationship change.', mobileDetail: 'Owns the product experience, users, policy, billing and support. This plane changes with each opportunity.', detail: 'The operator owns the customer experience, users, identity, policy, billing, support and the reason for network demand to exist. This plane changes with every opportunity.' },
    { key: 'network', n: '02', verb: 'ROUTES + MEASURES', name: 'Residential routing network', short: 'Miner UIDs organise supply; validators measure separately.', mobileDetail: 'Miner UIDs organise residential routes while validators measure uptime, transfer and proof-of-transit separately.', detail: 'Residential providers participate as miners, directly or through pools, supplying routable capacity under miner UIDs. Encrypted traffic moves through those paths while validators measure uptime, transfer and proof-of-transit separately.' },
    { key: 'subnetbase', n: '03', verb: 'COORDINATES', name: 'UR Subnet (SN25)', short: 'Access, measurement, incentives and settlement.', mobileDetail: 'Coordinates operator demand, measurement, miner incentives and settlement beneath every operator product.', detail: 'SN25 coordinates operator demand, validator measurement, miner incentives and settlement. It is shared infrastructure beneath every Network Operator, not the customer product above it.' },
];

/* ---------- the terminal models' scrub (assembled → revealed) ---------- */

const TERMINAL_LAYERS = [
    { cls: 'terminal-display', range: [.02, .46], from: [0, 0, 36], to: [-20, -18, 245] },
    { cls: 'terminal-validator', range: [.16, .6], from: [0, 0, 28], to: [62, 0, 190] },
    { cls: 'terminal-operator', range: [.29, .74], from: [0, 0, 22], to: [-18, 18, 145] },
    { cls: 'terminal-economics', range: [.43, .86], from: [0, 0, 16], to: [0, 68, 105] },
    { cls: 'terminal-providers', range: [.56, .96], from: [0, 0, 12], to: [-44, 55, 80] },
    { cls: 'terminal-miners', range: [.56, .96], from: [0, 0, 14], to: [44, 55, 88] },
    { cls: 'terminal-shell', range: [.68, 1], from: [0, 0, 0], to: [0, 35, 0] },
];
const TERMINAL3_LAYERS = [
    { cls: 'terminal3-product', range: [.02, .68], from: [0, 0, 36], to: [-88, -118, 176], fromR: 0, toR: -2.6, fromS: 1, toS: .94 },
    { cls: 'terminal3-network', range: [.2, .86], from: [0, 0, 20], to: [82, 72, 88], fromR: 0, toR: 2.8, fromS: 1, toS: .98 },
    { cls: 'terminal3-base', range: [.48, 1], from: [0, 0, 0], to: [-8, 300, 0], fromR: 0, toR: .5, fromS: 1, toS: .9 },
];
const TERMINAL3_LAYERS_V11 = [
    { cls: 'terminal3-product', range: [.02, .66], from: [0, 0, 36], to: [-108, -116, 188], fromR: 0, toR: -2.2, fromS: 1, toS: .96 },
    { cls: 'terminal3-network', range: [.2, .84], from: [0, 0, 20], to: [90, 82, 96], fromR: 0, toR: 2.2, fromS: 1, toS: 1 },
    { cls: 'terminal3-base', range: [.46, 1], from: [0, 0, 0], to: [-4, 250, 0], fromR: 0, toR: .2, fromS: 1, toS: .94 },
];
const TERMINAL3_LAYERS_V11_MOBILE = [
    { cls: 'terminal3-product', range: [.02, .66], from: [0, 0, 36], to: [-10, -116, 188], fromR: 0, toR: -1.2, fromS: 1, toS: .96 },
    { cls: 'terminal3-network', range: [.2, .84], from: [0, 0, 20], to: [8, 82, 96], fromR: 0, toR: 1.2, fromS: 1, toS: .98 },
    { cls: 'terminal3-base', range: [.46, 1], from: [0, 0, 0], to: [0, 250, 0], fromR: 0, toR: 0, fromS: 1, toS: .92 },
];
const CALLOUT_THRESHOLDS = {
    terminal: { product: .12, validators: .28, operator: .4, emission: .58, providers: .67, miners: .67, subnet: .8 },
    terminal3: { operatorproduct: .18, network: .42, subnetbase: .68 },
};
const NO_LAYERS = {};

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const lerp = (a, b, t) => a + (b - a) * t;
const subProgress = (p, a, b) => clamp01((p - a) / (b - a));
const easeLayer = (t) => 1 + 1.35 * Math.pow(t - 1, 3) + .35 * Math.pow(t - 1, 2);
const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const viewportFlags = () => ({
    mobile: window.matchMedia('(max-width:700px)').matches,
    compact: window.matchMedia('(max-width:1080px)').matches,
});

function layerTransforms(model, builder, mobile, p) {
    const table = model === 'terminal3'
        ? (builder ? (mobile ? TERMINAL3_LAYERS_V11_MOBILE : TERMINAL3_LAYERS_V11) : TERMINAL3_LAYERS)
        : TERMINAL_LAYERS;
    const out = {};
    for (const L of table) {
        const sp = easeLayer(subProgress(p, L.range[0], L.range[1]));
        const x = lerp(L.from[0], L.to[0], sp), y = lerp(L.from[1], L.to[1], sp), z = lerp(L.from[2], L.to[2], sp);
        const rot = lerp(L.fromR || 0, L.toR || 0, sp), scale = lerp(L.fromS || 1, L.toS || 1, sp);
        out[L.cls] = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,${z.toFixed(1)}px) rotateZ(${rot.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
    }
    return out;
}

/** The tilt of the terminal world: it flattens as the model opens, plus pointer parallax. */
function worldTransform(model, builder, p, parX = 0, parZ = 0) {
    const t3 = model === 'terminal3';
    const rx = lerp(t3 ? (builder ? 24 : 28) : 42, t3 ? (builder ? 14 : 19) : 38, p) + parX;
    const rz = lerp(t3 ? (builder ? -7 : -9) : -16, t3 ? (builder ? -2.5 : -4) : -12, p) + parZ;
    return `translate(-50%,-50%) rotateX(${rx.toFixed(2)}deg) rotateZ(${rz.toFixed(2)}deg)`;
}

/** Builder editions size the stage to the reveal: taller once the planes separate. */
function stageHeightFor(p, { mobile, compact }) {
    const minH = mobile ? 560 : compact ? 760 : 800;
    const maxH = mobile ? 720 : compact ? 980 : 1040;
    return Math.round(lerp(minH, maxH, p));
}

/* ---------- the "trace one session" simulation (terminal3) ---------- */

const TRACE_MODE_BY_VISUAL = { vpn: 'point', comms: 'point', agent: 'roundtrip', search: 'roundtrip', visibility: 'fanout', verification: 'fanout' };
const TRACE_MODE_COPY = {
    point: { idle: 'POINT-TO-POINT · TRACE ONE SESSION', start: '01A / SESSION ENTERS THE NETWORK', messages: [['01B / BLUE INGRESS PROVIDER CONNECTED', 850], ['01C / MINER UIDS ROUTE THE SESSION', 1500], ['01D / BLUE EGRESS PROVIDER REACHED', 2600], ['01E / DESTINATION ENDPOINT REACHED', 3350]] },
    roundtrip: { idle: 'REQUEST + RESPONSE · TRACE ONE SESSION', start: '01A / PRODUCT REQUEST ENTERS THE NETWORK', messages: [['01B / BLUE INGRESS PROVIDER CONNECTED', 850], ['01C / MINER UIDS ROUTE THE REQUEST', 1500], ['01D / BLUE EGRESS PROVIDER REACHES THE TARGET', 2600], ['01E / RESPONSE RETURNS TO THE PRODUCT', 3350]] },
    fanout: { idle: 'FAN-OUT + COLLECT · TRACE ONE RUN', start: '01A / PRODUCT REQUEST ENTERS THE NETWORK', messages: [['01B / BLUE INGRESS PROVIDER CONNECTED', 850], ['01C / REQUEST FANS ACROSS MINER UIDS', 1450], ['01D / RESIDENTIAL OBSERVATIONS COLLECTED', 2450], ['01E / EVIDENCE RETURNS TO THE PRODUCT', 3400]] },
};
const SIM_PHASES = [['traffic', 4100], ['quality', 2600]];
const SIM_IDLE = { running: false, phase: null, complete: false, glyph: 'play', label: 'TRACE ONE SESSION', status: null };
const GLYPHS = { play: '▶', stop: '■', replay: '↻' };
const traceCopyFor = (mode) => TRACE_MODE_COPY[mode] || TRACE_MODE_COPY.roundtrip;
const idleStatus = (model, traceMode) => (model === 'terminal3' ? traceCopyFor(traceMode).idle : 'WATCH ONE PRODUCT SESSION ROUTE + VALIDATE');

/** Keep ?op= (and ?model=) in the address so a selected example can be shared. */
function syncOpParam(index) {
    const current = new URLSearchParams(window.location.search);
    const next = new URLSearchParams();
    if (current.get('model')) next.set('model', current.get('model'));
    if (index) next.set('op', String(index + 1));
    const qs = next.toString();
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
}

export default function BuildPage() {
    const [variant, setVariant] = useState(DEFAULT_VARIANT);
    const { model, version, isV11, isV12, builder } = variant;
    const isTerminal = isTerminalModel(model);

    const [opIndex, setOpIndex] = useState(0);
    const [focus, setFocus] = useState('');
    const [view, setView] = useState(initialView(DEFAULT_VARIANT.model));
    const [contentView, setContentView] = useState('architecture');
    const [briefMode, setBriefMode] = useState(initialBriefMode(DEFAULT_VARIANT.model));
    // The brief panel's open state, null until first toggled (the wrapper's
    // data-brief-open attribute, version 12, only appears once it has been).
    // The two buttons that open it keep their own labels, as the script did:
    // the readout's trigger follows setInlineBrief (terminal3, ?brief=1, close),
    // the version-10 toggle follows its own clicks.
    const [briefOpen, setBriefOpen] = useState(null);
    const [triggerOpen, setTriggerOpen] = useState(false);
    const [toggleOpen, setToggleOpen] = useState(false);
    const [progress, setProgress] = useState(0);
    const [stageHeight, setStageHeight] = useState(null);
    const [viewport, setViewport] = useState({ mobile: false, compact: false });
    const [sim, setSim] = useState(SIM_IDLE);

    const variantRef = useRef(DEFAULT_VARIANT);
    const progressRef = useRef(0);
    const draggingRef = useRef(false);
    const parallaxRef = useRef({ x: 0, z: 0, tx: 0, tz: 0 });
    const traceModeRef = useRef('point');
    const simRef = useRef({ running: false, phase: null, step: -1, timer: 0, subTimers: [] });
    const stageRef = useRef(null);
    const bridgeRef = useRef(null);
    const scrubRef = useRef(null);
    const tabsRef = useRef(null);
    const briefPanelRef = useRef(null);
    const worldRef = useRef(null);
    const world3Ref = useRef(null);

    const op = OPS[opIndex];
    const briefIsOpen = briefOpen === true;
    const traceMode = TRACE_MODE_BY_VISUAL[op.visual] || 'roundtrip';
    useEffect(() => { variantRef.current = variant; }, [variant]);
    useEffect(() => { traceModeRef.current = traceMode; }, [traceMode]);

    /* --- simulation --- */

    const resetSimulation = useCallback((silent = false) => {
        const s = simRef.current;
        clearTimeout(s.timer);
        s.subTimers.forEach(clearTimeout);
        s.subTimers = [];
        s.running = false;
        s.phase = null;
        s.step = -1;
        setSim((prev) => {
            const status = silent ? prev.status : null;
            if (!prev.running && !prev.phase && !prev.complete && prev.glyph === 'play' && prev.status === status) return prev;
            return { ...SIM_IDLE, status };
        });
    }, []);

    const applyProgress = useCallback((value) => {
        const { model, builder } = variantRef.current;
        if (!isTerminalModel(model)) return;
        const p = clamp01(value);
        progressRef.current = p;
        setProgress(p);
        if (model === 'terminal3' && p < .34) resetSimulation(true);
        if (builder && !draggingRef.current) setStageHeight(stageHeightFor(p, viewportFlags()));
    }, [resetSimulation]);

    /** Draw the two curves that join the product screen to the mesh's entry and exit providers. */
    const updateRouteBridge = useCallback(() => {
        const stage = stageRef.current, bridge = bridgeRef.current;
        if (!stage || !bridge) return;
        const entry = stage.querySelector('.scene-terminal3 .route-provider-in');
        const exitProvider = stage.querySelector('.scene-terminal3 .route-provider-out');
        const appVisual = stage.querySelector('.scene-terminal3 .app-visual');
        if (!entry || !exitProvider || !appVisual) return;
        const stageRect = stage.getBoundingClientRect();
        const point = (el, x = .5, y = .5) => {
            const r = el.getBoundingClientRect();
            return { x: r.left + r.width * x - stageRect.left, y: r.top + r.height * y - stageRect.top };
        };
        const routeStart = stage.querySelector('.scene-terminal3 .route-start');
        const routeEnd = stage.querySelector('.scene-terminal3 .route-end');
        const start = routeStart ? point(routeStart) : point(appVisual, .08, .72);
        const end = routeEnd ? point(routeEnd) : point(appVisual, .9, .28);
        const networkIn = point(entry), networkOut = point(exitProvider);
        bridge.setAttribute('viewBox', `0 0 ${stageRect.width} ${stageRect.height}`);
        bridge.querySelector('.route-bridge-in').setAttribute('d', `M${start.x} ${start.y} C${start.x - 18} ${start.y + 48},${networkIn.x - 42} ${networkIn.y - 46},${networkIn.x} ${networkIn.y}`);
        bridge.querySelector('.route-bridge-out').setAttribute('d', `M${networkOut.x} ${networkOut.y} C${networkOut.x + 52} ${networkOut.y - 22},${end.x + 28} ${end.y + 52},${end.x} ${end.y}`);
    }, []);

    const advanceSimulation = useCallback(() => {
        const s = simRef.current;
        if (!s.running) return;
        s.step += 1;
        if (s.step >= SIM_PHASES.length) {
            s.running = false;
            s.phase = null;
            setSim((prev) => ({ ...prev, running: false, phase: null, complete: true, glyph: 'replay', label: 'REPLAY TRACE', status: 'SESSION ROUTED + VALIDATED' }));
            return;
        }
        const [phase, phaseDuration] = SIM_PHASES[s.step];
        const copy = traceCopyFor(traceModeRef.current);
        s.phase = phase;
        setSim((prev) => ({ ...prev, phase, complete: false, status: phase === 'traffic' ? copy.start : '02 / VALIDATORS CHECK UPTIME, TRANSFER + TRANSIT' }));
        const reduced = prefersReducedMotion();
        if (phase === 'traffic' && !reduced) {
            copy.messages.forEach(([message, delay]) => s.subTimers.push(setTimeout(() => {
                if (s.running && s.phase === 'traffic') setSim((prev) => (prev.phase === 'traffic' ? { ...prev, status: message } : prev));
            }, delay)));
        }
        s.timer = setTimeout(advanceSimulation, reduced ? 900 : phaseDuration);
    }, []);

    const runSimulation = () => {
        const s = simRef.current;
        if (s.running) { resetSimulation(); return; }
        resetSimulation(true);
        s.running = true;
        setSim((prev) => ({ ...prev, running: true, complete: false, glyph: 'stop', label: 'STOP TRACE' }));
        const launch = () => { if (s.running) { updateRouteBridge(); advanceSimulation(); } };
        if (progressRef.current < .84) {
            setSim((prev) => ({ ...prev, status: 'OPENING THE THREE PLANES…' }));
            applyProgress(1);
            s.timer = setTimeout(launch, prefersReducedMotion() ? 0 : 900);
        } else {
            launch();
        }
    };

    /* --- mount: the query string, the viewport, the stage height --- */

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const next = resolveVariant(params.get('model'));
        if (next.model !== DEFAULT_VARIANT.model || next.version !== DEFAULT_VARIANT.version) {
            variantRef.current = next;
            setVariant(next);
            setView(initialView(next.model));
            setBriefMode(initialBriefMode(next.model));
        }
        const initialOp = Math.max(0, Math.min(OPS.length - 1, (Number(params.get('op')) || 1) - 1));
        if (initialOp) setOpIndex(initialOp);
        if (params.get('brief') === '1') { setBriefOpen(true); setTriggerOpen(true); }
        setViewport(viewportFlags());
        applyProgress(0);
        return () => resetSimulation(true);
    }, [applyProgress, resetSimulation]);

    useEffect(() => {
        const onResize = () => {
            setViewport(viewportFlags());
            const { model, builder } = variantRef.current;
            if (model === 'terminal3') updateRouteBridge();
            if (builder) applyProgress(progressRef.current);
        };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [applyProgress, updateRouteBridge]);

    // Pointer parallax on the terminal world: eased toward the pointer every
    // frame, written straight to the element so the scrub's render is not redone.
    useEffect(() => {
        if (!isTerminal || prefersReducedMotion()) return undefined;
        let raf = 0;
        const tick = () => {
            const par = parallaxRef.current;
            par.x = lerp(par.x, par.tx, .075);
            par.z = lerp(par.z, par.tz, .075);
            const world = (model === 'terminal3' ? world3Ref : worldRef).current;
            if (world) world.style.transform = worldTransform(model, builder, progressRef.current, par.x, par.z);
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [isTerminal, model, builder]);

    /* --- handlers --- */

    const selectOpportunity = (index, fromUser) => {
        if (variantRef.current.model === 'terminal3') resetSimulation();
        setOpIndex(index);
        if (fromUser) syncOpParam(index);
    };
    const stepOpportunity = (direction) => {
        selectOpportunity((opIndex + direction + OPS.length) % OPS.length, true);
        briefPanelRef.current?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
    };
    const onTabKeyDown = (i) => (e) => {
        if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
        e.preventDefault();
        const next = (i + (e.key === 'ArrowRight' ? 1 : -1) + OPS.length) % OPS.length;
        tabsRef.current?.querySelectorAll('button')[next]?.focus();
        selectOpportunity(next, true);
    };

    const onPieceFocus = (key) => setFocus(builder && focus === key ? '' : key);
    const closeLayer = () => {
        const stage = stageRef.current;
        const selected = stage
            ? [...stage.querySelectorAll('.scene.is-active .piece[aria-pressed="true"],.scene.is-active .callout[aria-pressed="true"]')].find((el) => el.offsetParent !== null)
            : null;
        setFocus('');
        selected?.focus();
    };

    const setInlineBrief = (open) => { setBriefOpen(open); setTriggerOpen(open); };
    const onOpenBrief = () => (model === 'terminal3' ? setInlineBrief(!briefIsOpen) : setContentView('brief'));
    const onCloseBrief = () => setInlineBrief(false);
    const onToggleBrief = () => {
        if (isTerminal) { setContentView('brief'); return; }
        setBriefOpen(!briefIsOpen);
        setToggleOpen(!briefIsOpen);
    };

    const setScrubFromPointer = (e) => {
        const r = scrubRef.current.getBoundingClientRect();
        applyProgress(clamp01((e.clientX - r.left) / r.width));
    };
    const onScrubPointerDown = (e) => {
        draggingRef.current = true;
        scrubRef.current.setPointerCapture?.(e.pointerId);
        setScrubFromPointer(e);
        e.preventDefault();
    };
    const onScrubPointerMove = (e) => { if (draggingRef.current) setScrubFromPointer(e); };
    const finishScrub = (e) => {
        if (!draggingRef.current) return;
        setScrubFromPointer(e);
        draggingRef.current = false;
        try { scrubRef.current.releasePointerCapture?.(e.pointerId); } catch { /* not captured */ }
        applyProgress(progressRef.current);
    };
    const onStagePointerMove = (e) => {
        if (prefersReducedMotion()) return;
        const r = stageRef.current.getBoundingClientRect();
        const par = parallaxRef.current;
        par.tz = ((e.clientX - r.left) / r.width - .5) * 3.2;
        par.tx = ((e.clientY - r.top) / r.height - .5) * -2.2;
    };
    const onStagePointerLeave = () => { parallaxRef.current.tx = 0; parallaxRef.current.tz = 0; };
    const onStageClick = (e) => { if (!e.target.closest('[data-component],.system-rail-v11')) setFocus(''); };

    /* --- derived --- */

    const activeComponents = model === 'terminal3'
        ? (isV12 ? TERMINAL3_COMPONENTS_V12 : isV11 ? TERMINAL3_COMPONENTS_V11 : TERMINAL3_COMPONENTS)
        : BUILD_ARCH.components;
    const component = activeComponents.find((c) => c.key === focus);
    const layer = {
        name: component ? component.name : model === 'terminal3' ? (builder ? 'Product above shared infrastructure' : 'Complete three-plane system') : 'Complete operator system',
        detail: component
            ? (viewport.mobile && component.mobileDetail ? component.mobileDetail : component.detail)
            : model === 'terminal3'
                ? (builder
                    ? 'The selected operator product sits above the shared provider network and SN25 foundation. Move the reveal slider to separate the system, then select a plane to understand its role.'
                    : 'The terminal has three planes: the changing Network Operator product, the shared provider-and-validator network, and the shared SN25 protocol and economic foundation. Drag the reveal control to separate them.')
                : model === 'terminal'
                    ? 'The terminal starts as the complete customer-facing product. Drag the reveal control to separate its product screen, operator services and shared SN25 architecture, then select a labelled layer to inspect its role.'
                    : 'Open the gateway to see the product module above the operator control plane and shared SN25 foundation. Select any labelled layer to isolate its role.',
        short: component
            ? `${component.n} / ${component.verb} · ${component.short}`
            : model === 'terminal3' ? 'ONE OPERATOR PRODUCT · TWO SHARED PLANES' : model === 'terminal' ? 'ONE RECOGNISABLE PRODUCT · ONE SHARED FOUNDATION' : 'ONE PRODUCT MODULE · ONE SHARED FOUNDATION',
        color: component ? COLORS[component.key] : '#d6e6f4',
        onClose: closeLayer,
    };

    const head = isV12 ? SECTION_HEAD_V12 : isV11 ? SECTION_HEAD_V11 : MODEL_COPY[model];
    const hero = isV12 ? HERO_V12 : isV11 ? HERO_V11 : HERO_V10;
    const cta = isV11 ? CTA_V11 : CTA;
    // what the readout shows for opportunity i (version 12 words it from BUILD_V12)
    const readoutFor = (i) => {
        const o = OPS[i];
        const w = isV12 ? BUILD_V12[i] : null;
        return w
            ? { category: w.category, title: w.displayTitle || w.title, teaser: w.summary }
            : { category: o.category, title: o.title, teaser: o.teaser };
    };
    const briefLabel = isV12
        ? (triggerOpen ? 'HIDE EXAMPLE BRIEF ' : 'OPEN EXAMPLE BRIEF ')
        : (triggerOpen ? 'CLOSE THIS OPPORTUNITY ' : 'EXPLORE THIS OPPORTUNITY ');

    const layers = isTerminal ? layerTransforms(model, builder, viewport.mobile, progress) : NO_LAYERS;
    const revealed = (key) => progress >= (CALLOUT_THRESHOLDS[model]?.[key] ?? Infinity);
    const worldStyle = isTerminal ? { transform: worldTransform(model, builder, progress) } : undefined;
    const traceReady = model === 'terminal3' && progress >= .34;
    const scrubLabels = model === 'terminal3' ? (builder ? ['ASSEMBLED', 'REVEALED'] : ['ASSEMBLED', 'EXPLODED']) : ['PRODUCT', 'NETWORK'];
    const pct = Math.round(progress * 100);
    const valueText = progress < .04 ? 'Network Operator product assembled' : progress > .96 ? 'Three network planes fully revealed' : `${pct} percent exploded`;
    const status = sim.status ?? idleStatus(model, traceMode);

    const scrub = (
        <div className="stage-scrub">
            <label htmlFor="terminal-scrub">{scrubLabels[0]}</label>
            <input
                id="terminal-scrub"
                ref={scrubRef}
                type="range"
                min="0"
                max="1000"
                step={isV11 ? 10 : 1}
                value={Math.round(progress * 1000)}
                aria-label="Reveal the network architecture inside the operator terminal"
                aria-valuetext={isTerminal ? valueText : undefined}
                style={isTerminal ? { '--scrub-p': progress.toFixed(3) } : undefined}
                onChange={(e) => applyProgress(Number(e.target.value) / 1000)}
                onPointerDown={onScrubPointerDown}
                onPointerMove={onScrubPointerMove}
                onPointerUp={finishScrub}
                onPointerCancel={finishScrub}
            />
            <label htmlFor="terminal-scrub">{scrubLabels[1]}</label>
            <output htmlFor="terminal-scrub">{`${pct}%`}</output>
        </div>
    );
    const playButton = (
        <button type="button" className={builder ? 'system-play' : undefined} aria-pressed={sim.running} onClick={runSimulation}>
            <i aria-hidden="true" data-glyph={sim.glyph}>{GLYPHS[sim.glyph]}</i><span>{sim.label}</span>
        </button>
    );
    const simulationReadout = (
        <div className="simulation-readout">
            <output>{status}</output>
            <ol aria-label="System trace steps">
                <li data-sim-step="traffic" aria-current={sim.phase ? sim.phase === 'traffic' : undefined}><b>01</b> ROUTE</li>
                <li data-sim-step="quality" aria-current={sim.phase ? sim.phase === 'quality' : undefined}><b>02</b> VALIDATE</li>
            </ol>
        </div>
    );
    const opTabs = (
        <nav className="op-tabs" role="tablist" aria-label="Six example opportunities" ref={tabsRef}>
            {OPS.map((o, i) => (
                <button
                    key={o.slug}
                    type="button"
                    role="tab"
                    id={`op-tab-${o.slug}`}
                    tabIndex={i === opIndex ? 0 : -1}
                    aria-controls={`opportunity-readout-${o.slug}`}
                    aria-selected={i === opIndex}
                    style={{ '--dot': o.accent }}
                    onClick={() => selectOpportunity(i, true)}
                    onKeyDown={onTabKeyDown(i)}
                >
                    <b>{o.n}</b><span>{o.short}</span><i aria-hidden="true" />
                </button>
            ))}
        </nav>
    );
    const sceneProps = { op, focus, onFocus: onPieceFocus };

    return (
        <div
            className="build-page"
            data-model={model}
            data-version={version}
            data-content-view={contentView}
            data-brief-mode={briefMode}
            data-brief-open={isV12 && briefOpen !== null ? String(briefIsOpen) : undefined}
            data-op={op.slug}
            style={{ '--accent': op.accent, '--accent-rgb': op.rgb }}
        >
            <header className="build-hero shell">
                {isV12 ? (
                    <div className="hero-title"><span className="eyebrow">{hero.eyebrow}</span><h1>Build on UR</h1></div>
                ) : (
                    <div className="hero-title"><h1>Build on UR</h1><span className="hero-kicker"><i />Network Operator opportunities</span></div>
                )}
                <div className="hero-intro">
                    {!isV12 && <span className="eyebrow">{hero.eyebrow}</span>}
                    <div>
                        {!isV12 && <h2>{hero.h2[0]}<br />{hero.h2[1]}</h2>}
                        <p>{hero.p}</p>
                    </div>
                </div>
                <div className="proof-strip v11-only" aria-label="UR network reach">
                    {isV12 ? (
                        <><span><b>100K+</b> providers</span><span><b>100+</b> countries</span><span><b>350K+</b> monthly users on URnetwork</span></>
                    ) : (
                        <><span><b>100K+</b> NETWORK PROVIDERS</span><span><b>100+</b> COUNTRIES</span><span><b>LIVE</b> NETWORK INFRASTRUCTURE</span></>
                    )}
                </div>
                <p className="hero-quiet v12-only">The network is live. Its next product may not exist yet.</p>
                <div className="boundary">
                    <article><b>YOU BRING</b><h2>Product, customers and distribution</h2><p>Brand, interface, identity, billing, policy, support and a useful reason for network demand.</p></article>
                    <article><b>THE SUBNET PROVIDES</b><h2>Supply, measurement and incentives</h2><p>100K+ residential providers across 100+ countries, validators, miner UIDs and SN25 settlement.</p></article>
                </div>
            </header>

            <section className="theatre" aria-labelledby="model-title"><div className="shell">
                <header className="section-head">
                    <span className="eyebrow">{head.number}</span>
                    <div>
                        <h2 id="model-title">{head.title}</h2>
                        <p>{head.copy}</p>
                        <span className="model-note">Functional teaching model · architecture grounded in the SN25 deck</span>
                    </div>
                </header>
                <div className="opportunity-intro">
                    <div><small>SELECT ONE OF SIX EXAMPLES</small><strong>The product changes. The network foundation does not.</strong></div>
                    <p>These are inspiration points rather than a catalogue of what can be built. Choose an example to see its customer proposition and demand profile placed on the same SN25 architecture.</p>
                </div>
                {!isV12 && opTabs}
                <div className="content-switch" role="tablist" aria-label="Choose live model or detailed opportunity brief">
                    <button type="button" role="tab" aria-selected={contentView === 'architecture'} onClick={() => setContentView('architecture')}>LIVE PRODUCT + NETWORK MODEL</button>
                    <button type="button" role="tab" aria-selected={contentView === 'brief'} onClick={() => setContentView('brief')}>PRODUCT BRIEF — FULL EXPLAINER</button>
                </div>
                <div className="architecture-panel">
                    <div className="model-grid">
                        <div
                            className={`model-stage${traceReady ? ' trace-ready' : ''}`}
                            ref={stageRef}
                            data-view={view}
                            data-focus={focus || undefined}
                            data-progress={isTerminal ? progress.toFixed(3) : undefined}
                            data-trace-mode={model === 'terminal3' ? traceMode : undefined}
                            data-sim-running={sim.running ? 'true' : undefined}
                            data-sim-phase={sim.phase || undefined}
                            data-sim-complete={sim.complete ? 'true' : undefined}
                            style={stageHeight != null ? { '--stage-height': `${stageHeight}px` } : undefined}
                            onClick={builder ? onStageClick : undefined}
                            onPointerMove={isTerminal ? onStagePointerMove : undefined}
                            onPointerLeave={isTerminal ? onStagePointerLeave : undefined}
                        >
                            <div className="stage-meta"><span>{head.meta}</span><span>TRAFFIC, QUALITY + ECONOMICS SHOWN SEPARATELY</span></div>

                            <ChassisScene active={model === 'chassis'} {...sceneProps} />
                            <SpineScene active={model === 'spine'} {...sceneProps} />
                            <TowerScene active={model === 'tower'} {...sceneProps} />
                            <FoundationScene active={model === 'foundation'} {...sceneProps} />
                            <TerminalScene
                                active={model === 'terminal'}
                                {...sceneProps}
                                layers={model === 'terminal' ? layers : NO_LAYERS}
                                revealed={model === 'terminal' ? revealed : undefined}
                                flowOpacity={model === 'terminal' ? subProgress(progress, .08, .48) : undefined}
                                worldRef={worldRef}
                                worldStyle={model === 'terminal' ? worldStyle : undefined}
                            />
                            <Terminal3Scene
                                active={model === 'terminal3'}
                                {...sceneProps}
                                layers={model === 'terminal3' ? layers : NO_LAYERS}
                                revealed={model === 'terminal3' ? revealed : undefined}
                                worldRef={world3Ref}
                                worldStyle={model === 'terminal3' ? worldStyle : undefined}
                            />

                            <svg className="terminal3-route-bridge" aria-hidden="true" ref={bridgeRef}><path className="route-bridge-in" pathLength="1" /><path className="route-bridge-out" pathLength="1" /></svg>

                            <div className="stage-controls" aria-label="Architecture view">
                                <button type="button" data-show-all="" aria-pressed={!focus} onClick={() => setFocus('')}>SHOW ALL</button>
                                <button type="button" data-view="assembled" aria-pressed={view === 'assembled'} onClick={() => setView('assembled')}>ASSEMBLED</button>
                                <button type="button" data-view="open" aria-pressed={view === 'open'} onClick={() => setView('open')}>OPEN ARCHITECTURE</button>
                                {!builder && scrub}
                            </div>
                            <div className="flow-key">
                                <span style={{ '--c': 'var(--accent)' }}><i />TRAFFIC</span>
                                <span style={{ '--c': '#eff7bb' }}><i />VERIFICATION</span>
                                <span style={{ '--c': '#ed8fff' }}><i />ECONOMICS</span>
                            </div>
                            {builder ? (
                                <div className="system-rail-v11" aria-label="Reveal and trace the network system">
                                    {playButton}{scrub}{simulationReadout}
                                </div>
                            ) : (
                                <div className="simulation-control" aria-live="polite">{playButton}{simulationReadout}</div>
                            )}
                            {builder && <ArchitectureReadout className="architecture-readout layer-caption-v11" headingLevel="h3" {...layer} />}
                        </div>
                        {isV12 && opTabs}
                        {isV12 && <p className="selector-frame-v12"><span>SIX PLACES TO BEGIN</span><b>Illustrative opportunities for builders.</b></p>}
                        {/* Every opportunity's readout is in the page (the six
                            examples are the page's substance, and a reader or a
                            crawler without the tabs should find them all); the
                            tabs show one and hide the rest. */}
                        {OPS.map((o, i) => (
                            <Readout
                                key={o.slug}
                                id={`opportunity-readout-${o.slug}`}
                                labelledBy={`op-tab-${o.slug}`}
                                briefId={`architecture-brief-${o.slug}`}
                                hidden={i !== opIndex}
                                op={o}
                                readout={readoutFor(i)}
                                isV11={isV11}
                                builder={builder}
                                layer={layer}
                                triggerOpen={triggerOpen}
                                toggleOpen={toggleOpen}
                                briefLabel={briefLabel}
                                onOpenBrief={onOpenBrief}
                                onToggleBrief={onToggleBrief}
                            />
                        ))}
                    </div>
                    <nav className="component-key" aria-label="Inspect architecture components">
                        <button type="button" data-component="" aria-pressed={!focus} style={{ '--cc': '#d6e6f4' }} onClick={() => setFocus('')}>
                            <b>00 / ALL</b><strong>{model === 'terminal3' ? 'Complete three-plane system' : 'Complete system'}</strong><span>Show all architecture functions.</span>
                        </button>
                        {activeComponents.map((c) => (
                            <button key={c.key} type="button" data-component={c.key} aria-pressed={focus === c.key} style={{ '--cc': COLORS[c.key] }} onClick={() => onPieceFocus(c.key)}>
                                <b>{`${c.n} / ${c.verb}`}</b><strong>{c.name}</strong><span>{c.short}</span>
                            </button>
                        ))}
                    </nav>
                </div>
                {OPS.map((o, i) => (
                    <BriefPanel
                        key={o.slug}
                        id={`architecture-brief-${o.slug}`}
                        hidden={i !== opIndex}
                        panelRef={i === opIndex ? briefPanelRef : undefined}
                        op={o}
                        v12={isV12 ? BUILD_V12[i] : null}
                        opportunities={OPS}
                        builder={builder}
                        open={i === opIndex && briefIsOpen}
                        briefMode={briefMode}
                        onBriefMode={setBriefMode}
                        onPrev={() => stepOpportunity(-1)}
                        onNext={() => stepOpportunity(1)}
                        onClose={onCloseBrief}
                    />
                ))}
            </div></section>

            <section className="proof-v12 v12-only"><div className="shell proof-v12-grid">
                <header><span className="eyebrow">LIVE TODAY / BRINGYOUR</span><h2>BringYour is the first Network Operator.</h2></header>
                <div className="proof-v12-copy">
                    <p>Its first product, URnetwork, is a consumer VPN available across mobile, desktop and browser. BringYour owns the product experience and customer relationship; UR provides the network that powers it.</p>
                    <p>URnetwork has more than 350K monthly active users. This shows the model working at consumer scale: operator demand routed across shared provider capacity.</p>
                    <div className="proof-chain-v12">
                        <span><b>CUSTOMER PRODUCT</b>URnetwork VPN</span>
                        <span><b>NETWORK DEMAND</b>Active users + data moved</span>
                        <span><b>SHARED SUPPLY</b>100K+ providers across 100+ countries</span>
                    </div>
                    <a href="https://ur.io/products" target="_blank" rel="noopener noreferrer">EXPLORE THE URNETWORK VPN ↗</a>
                </div>
            </div></section>

            <section className="flows shell">
                <div className="v10-flow">
                    <header className="flows-head"><span className="eyebrow">The shared foundation in three paths</span><div><h2>One demand signal. Three network responses.</h2></div></header>
                    <div className="flow-grid">
                        <article className="flow-card" style={{ '--fc': 'var(--green)' }}><b>01 / TRAFFIC</b><h3>Customer demand becomes routed service</h3><p>The operator authenticates and applies product policy. SN25 coordinates a measured path through miner capacity and residential ingress or egress.</p><em>Product → operator → miner path → provider exit</em></article>
                        <article className="flow-card" style={{ '--fc': 'var(--pale)' }}><b>02 / QUALITY</b><h3>Validators test the path independently</h3><p>Validators walk operator-assigned chains and measure uptime, transfer and proof-of-transit. That quality signal informs consensus.</p><em>Validator probes → measured quality → UID scoring</em></article>
                        <article className="flow-card" style={{ '--fc': 'var(--pink)' }}><b>03 / ECONOMICS</b><h3>Demand and rewards remain separate flows</h3><p>Operator deposits enter the subnet reserve. Bittensor emission rewards miners and validators for measured useful service; deposits are not passed through as miner payouts.</p><em>Operator deposit → reserve · emission → measured supply</em></article>
                    </div>
                </div>
                <div className="responsibility-v11 v11-only">
                    <header>
                        <span className="eyebrow">{isV12 ? 'Shared infrastructure / independent products' : 'A shared foundation, not a finished business'}</span>
                        <h2>You build the reason to use the network.</h2>
                        <p>SN25 is UR’s Bittensor subnet: the coordination and incentive layer beneath the provider network. It gives builders infrastructure to draw on without deciding what the customer product should be.</p>
                    </header>
                    <div className="responsibility-grid">
                        <article>
                            <b>THE NETWORK OPERATOR BRINGS</b>
                            <h3>The product and customer relationship</h3>
                            <p>{isV12
                                ? 'Product experience, brand, users, identity, billing, policy, support, compliance and the commercial reason for network demand.'
                                : 'Product experience, brand, users, identity, billing, policy, support and the commercial reason for network demand.'}</p>
                        </article>
                        <article>
                            <b>{isV12 ? 'UR (SN25) PROVIDES' : 'UR / SN25 COORDINATES'}</b>
                            <h3>{isV12 ? 'Access to network infrastructure' : 'Access to shared network infrastructure'}</h3>
                            <p>{isV12
                                ? 'Distributed residential network providers, encrypted bandwidth, and an incentive system supporting reliable supply.'
                                : 'Residential provider reach, miner UIDs, independent service measurement and the incentive system supporting useful supply.'}</p>
                        </article>
                    </div>
                </div>
            </section>

            <section className="cta"><div className="shell cta-grid">
                <div><span className="eyebrow">{cta.eyebrow}</span><h2>{cta.title}</h2><p>{cta.copy}</p></div>
                <div className="cta-actions-v12">
                    <a href="https://t.me/ursn25" target="_blank" rel="noopener noreferrer">TALK TO UR TEAM ↗</a>
                    <a className="cta-secondary-v12 v12-only" href="/docs">EXPLORE SN25 DOCUMENTATION →</a>
                </div>
            </div></section>
        </div>
    );
}
