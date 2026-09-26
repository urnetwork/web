// English — canonical source for the site copy. Other language files
// mirror this structure key-for-key; if you add a key here, add it
// everywhere else too.
export default {
    nav: {
        whitepaper: 'Litepaper',
        operators:  'Operators',
        miners:     'Miners',
        validators: 'Validators',
        research:   'Research',
        community:  'Community',
        price:      'Usage Cost',
        docs:       'Docs',
        roadmap:    'Roadmap',
        network:    'Network',
        tagline:    'Own ur privacy. Own the network.',
        languageMenu: 'Language',
        menu:         'Menu',
        closeMenu:    'Close menu',
        primaryNav:   'Primary navigation',
        mobileNav:    'Mobile navigation',
        siteMenu:     'Site menu',
        browseDocs:   'Browse docs',
        apiReference: 'API reference',
        search:       'Search',
        ctaAria:    'Usage cost — the current network price',
        denomAria:  'Price denomination'
    },

    footer: {
        github:     'GitHub',
        contact:    'Contact',
        license:    'MPLv2',
        disclaimer: 'This site is an open source utility protocol powered by a community of participants, run separately from the network operator that sells access to the network.',
        languagesAria: 'Languages',
        terms:      'Terms of Use',
        privacy:    'Privacy Policy',
        vdp:        'VDP',
        protocol:   'Protocol',
        community:  'Community',
        legal:      'Legal',
        learn:      'Learn',
        resources:  'Resources',
        connect:    'Connect',
        bittensorDiscord: 'Bittensor Discord',
        brandKit:   'Brand kit',
        launchVideo: 'Launch video',
        // accessible names of the social icon links
        socialAria:     'Community and social links',
        socialX:        'URnetwork on X',
        socialTelegram: 'UR subnet on Telegram',
        socialDiscord:  'URnetwork Discord',
        socialGithub:   'UR subnet on GitHub',
        productsAria:   'URnetwork products at ur.io'
    },

    disclaimer: {
        protocol: 'UR is an open source protocol powering network infrastructure, maintained by its community.',
        products: 'For URnetwork products (eg. VPN), go to ur.io',
        before: 'UR is an open source protocol powering network infrastructure, maintained by its community. For URnetwork products (eg: VPN), go to'
    },

    launchVideo: {
        aria:  'UR launch video',
        close: 'Close video',
        sound: 'Tap for sound',
        play:  'Play video',
        fullscreen: 'Fullscreen',
        exitFullscreen: 'Exit fullscreen'
    },

    homepage: {
        intro: 'UR subnet is a privacy network built on Bittensor. The subnet pays the people who use and contribute to it. Operators run servers and deposit alpha to route traffic. Miners carry encrypted traffic and earn emissions. Validators re-measure the network, verify accuracy, and earn emissions.',
        diagramAria: 'How the UR network works',
        rolesEyebrow: 'Participate in the network',
        rolesTitle: 'Three roles. One measured network.',
        roles: {
            operators: {
                name: 'Operators',
                body: "Operators run the privacy servers and the verification endpoint. They deposit against expected traffic, co-sign each measured path, and commit the payout list that splits rewards among their miners. Deposits go into a reserve, and operators never hold anyone else's funds.",
                explore: 'Explore Operators'
            },
            miners: {
                name: 'Miners',
                body: 'Miners carry the traffic. They run nodes that route encrypted traffic for one or more operators, and they are paid from subnet emissions based on the capacity they contribute.',
                explore: 'Explore Miners'
            },
            validators: {
                name: 'Validators',
                body: 'Validators re-measure the network. They run the routing-verification protocol and score each operator pool on demand and measured quality. They earn subnet emissions for accurate scoring.',
                explore: 'Explore Validators'
            }
        },
        whitepaperCta: 'For more detail, read the litepaper',
        // what a search result shows for the page (<title>, meta description)
        metaTitle: 'UR | The decentralized privacy network on Bittensor SN25',
        metaDescription: 'UR is an open-source, decentralized privacy network on Bittensor SN25: miners carry encrypted traffic, validators measure it, and operators bring the demand.'
    },

    // The network diagram (home + role pages). Its vertex labels are
    // nav.operators / nav.miners / nav.validators and `subnet`; {active} is
    // the highlighted vertex's label.
    diagram: {
        subnet: 'Subnet',
        aria:   'The UR network — {subnet}, {operators}, {miners} and {validators} — with {active} highlighted',
        goTo:   'Go to {label}'
    },

    // Stat labels are rendered verbatim (no CSS text-transform) so the α
    // glyph and the GiB unit keep their casing — write them display-ready.
    stats: {
        protocolLedger:  'Subnet Ledger',
        refresh:         'Refresh stats',
        blockNumber:     'BLOCK NUMBER',
        dataPerBlock:    'TOTAL DATA / BLOCK (GiB)',
        usersPerBlock:   'TOTAL USERS / BLOCK',
        totalNetworks:   'TOTAL NETWORKS',
        stakedInContract:'STAKED IN CONTRACT (α)',
        demandDeposits:  'DEMAND DEPOSITS / BLOCK (α)',
        minerEmissions:  'MINER EMISSIONS / BLOCK (α)',
        networkOperators:'NETWORK OPERATORS',
        testnet:         'Status: TESTNET. Data shows testnet values only.'
    },

    sim: {
        block: 'BLOCK',
        prevBlock: 'PREV BLOCK',
        blockProgressAria: 'Current block progress',
        endsAt: 'Ends at 00:00 UTC {date}. {d}d {h}h {m}m {s}s until block end',
        heroAria: 'Network simulation',
        // the two hubs labelled on the hero canvas
        ops:      'OPS',
        protocol: 'PROTOCOL'
    },

    price: {
        eyebrow: 'Usage Cost',
        title:   'The published price of the network.',
        intro:   'Operators fund the network with demand deposits: α deposited each block (7 days) for the data and users they serve. The sheet below is the published rate: an operator pays the best tier whose staked-α threshold it meets, and the 0 tier applies to everyone, with or without staked α.',
        colTier:    'Tier',
        colStake:   'Staked α threshold',
        colGib:     'α / GiB',
        colUser:    'α / user',
        colGibUsd:  'USD / GiB',
        colUserUsd: 'USD / user',
        tierEveryone: 'Everyone',
        usdNote:  'USD equivalents use the live SN{sn} α price from CoinGecko\'s public GeckoTerminal feed.',
        usdNoteOperators: 'USD equivalents use the mean α price reported by the network operators.',
        alphaNow: '1 α = {usd}',
        usdUnavailable: 'Live α price unavailable, so USD equivalents are hidden.',
        subscribe: 'Subscribe to price changes (RSS)',
        rawFile:   'Raw price sheet (price.yml)',
        initialPeriod: 'Initial period: the published rate is 0 α. No operator demand deposits are collected while the network is being hardened; every operator pool is given equal demand, so measured quality alone steers the pool channel.'
    },

    roadmap: {
        eyebrow: 'Roadmap',
        title:   'Where the network is going.',
        intro:   'Three phases, each built on the one before it: open the ingress network, make UR the substrate businesses build on, and rebuild the front door to the internet. The timeframes are targets measured from today: a direction, not a promise.',
        phaseLabel: 'Phase',
        phases: [
            {
                no: '01',
                date: '1–2 months',
                flag: 'Launching soon',
                title: 'Ingress network access',
                body: 'Miners become both egress and ingress. Each miner auto-detects its environment and configures itself to do everything it can, carrying entry traffic as well as exit. The ingress network reuses the extenders\' N-layer encryption design, with new client-side work to iteratively discover extenders that time-unlock, so fresh entry points keep rotating into reach.'
            },
            {
                no: '02',
                date: '3–4 months',
                title: 'Enterprise roles & authorization',
                body: 'Role-based access, integrated with OAuth and Workload Identity Federation. RBAC is baked into the network so business networks can be built directly on top of the protocol. This is the layer powering the developer and VPN use cases of VPN.dev. The draw for those businesses: a network that stays accessible and performant anywhere in the world, so participants in decentralized projects can take part from anywhere.'
            },
            {
                no: '03',
                date: '8–12 months',
                title: 'A new internet homepage — WW.dev',
                body: 'A new front door to the internet. We focus on indexing (both push and pull), an agentic search index, and small, dense local models. Humans can set a new private homepage; agents can use an open search index that gives them private, real-time access to information, settled with Privacy Pass and x402.'
            }
        ]
    },

    legal: {
        eyebrow: 'Legal',
        terms: {
            title: 'Terms of Use',
            body:  'The Terms of Service for ur.xyz, the UR protocol information site hosted by UR Foundation.'
        },
        privacy: {
            title: 'Privacy Policy',
            body:  'How UR Foundation collects, uses and protects information about visitors to ur.xyz, including wallet addresses, and how to exercise your privacy rights.'
        },
        vdp: {
            title: 'Vulnerability Disclosure Policy',
            body:  'How to report security vulnerabilities in UR Foundation assets, and the safe harbor extended to good-faith research.'
        }
    },

operators: {
        eyebrow: 'Operators',
        title:   'The operators who run the network.',
        intro:   'Network operators run the privacy servers and the verification endpoint. An operator deposits into the subnet as a revenue-backed signal of real demand, runs the routing-verification protocol that co-signs each measured path, and commits the payout list that splits its rewards among the miners attached to it. Operators direct where rewards go but never hold anyone else\'s funds.',
        cta: 'Become a network operator',
        metaTitle: 'Network Operators: Run UR privacy servers on SN25 — UR',
        metaDescription: 'Network operators run UR privacy servers and the /verify endpoint, deposit alpha as a revenue-backed demand signal, and direct payouts to their miners.',
        roles: [
            { tag: '01', title: 'Run the servers',    body: 'Operators run the privacy servers and the /verify endpoint that co-signs each measured path, the coordination layer between users and the miners that carry the traffic.' },
            { tag: '02', title: 'Signal real demand',  body: 'Operators are billed in alpha sized to their real usage. Every deposit goes into a reserve as a revenue-backed signal that validators weight when they score the pools.' },
            { tag: '03', title: 'Direct the payouts',  body: 'Each settlement period an operator commits a Merkle payout list that splits its pool among its miners. It directs the split but never takes custody. Every miner claims its share directly from the contract.' },
            { tag: '04', title: 'Get started',         body: 'Register a network-operator key, run the /verify server, and deposit to begin. Operator admission is owner-gated during the launch phase.', href: '/docs/operator', linkLabel: 'Operator guide' }
        ],
        directoryTitle: 'Network operators',
        directoryNote:  'Ranked by total networks. Stats are read live from each operator\'s public feed; the icons link to the operator\'s app on each store.',
        dashboard: 'Dashboard',
        colOperator: 'OPERATOR',
        colStores:   'GET THE APP'
    },

    miners: {
        eyebrow: 'Miners',
        title:   'The miners who convert IP subnets into the dual internet.',
        intro:   'Miners compete to make the most IPv4 /29 and IPv6 /48 subnets available on the network, each kept routable at any moment for ingress or egress traffic. In other words, miners convert the public internet into an anonymous private network for everyone to use. Every miner carries both ingress and egress traffic, runs a safe-by-default security model, routes only encrypted traffic, and is paid from subnet emission for the routable capacity it contributes. The fleets with the broadest distinct, routable coverage are promoted to top-level miners and earn more, all in user space, on hardware you already own.',
        both:    'A miner is both an extender and a provider: every miner takes the ingress and the egress role at once. It configures itself automatically for the system it runs on.',
        goal:    'The goal is a dual shadow network: for every public IPv4 and IPv6 subnet, a private, anonymous counterpart is also available. UR is building that private anonymous network.',
        globeAlt: 'A globe of miners: providers drawn as dots, extenders as rings, each in the color of its country.',
        globeLabels: { provider: 'provider', extender: 'extender', miner: 'miner' },
        simCaption: 'Miners compete for the most unique IPs reliably available on the network. Top miners get promoted to their own UID slot.',
        cta: 'Become a miner',
        metaTitle: 'Miners: Carry encrypted traffic, earn SN25 emissions — UR',
        metaDescription: 'UR miners keep IPv4 /29 and IPv6 /48 subnets routable for encrypted ingress and egress on Bittensor SN25, and earn emissions for distinct, measured coverage.',
        roles: [
            { tag: '01', title: 'Egress',              body: 'As egress, a miner is an exit IP of the shared network. It rejects traffic that conflicts with common regulation directions like CFAA and DMCA, blocks known-malicious IPs, and routes only encrypted traffic, protecting both miners and users.' },
            { tag: '02', title: 'Ingress',             body: 'As ingress (an extender), a miner creates entry points that improve reachability worldwide, using N-layer TLS, SNI spoofing, and trusted forwarding. A rotating subset is exposed each cycle, and clients automatically retry the entry points that worked before.' },
            { tag: '03', title: 'Measured and matched',body: 'Independent validators walk chains of miners to prove real-time transit and measure liveness and quality. Miners are ranked by that measurement and by speed, and each operator runs its own matchmaking between users and miners.' },
            { tag: '04', title: 'Earn from emission',  body: 'Miners are paid from the subnet\'s emission. Inside an operator\'s pool you claim your share each settlement by proof: a low-barrier baseline reward, with no slot to win and nothing to burn.', href: '/docs/miner', linkLabel: 'Miner guide' },
            { tag: '05', title: 'Compete for the top',  body: 'Miners compete on reach. The network ranks fleets by how many distinct, routable exit IPs they actually serve rather than by traffic volume, and the roughly 200 with the broadest coverage are promoted to top-level miners: their own on-chain slot, paid natively, earning more. Shared IPs are split among the fleets that claim them, so unique coverage is what wins. Grow your distinct-IP breadth to climb, and if your reach slips you fall back to the pool.' }
        ]
    },

    validators: {
        eyebrow: 'Validators',
        title:   'The validators who measure the network.',
        intro:   'Validators are independent. Each stakes its own UR and runs the routing-verification protocol, continuously walking operator-assigned chains of miners to prove real-time transit and measure which miners are the weakest links. That measurement is the core signal the network pays for, and validators earn native dividends for producing it accurately.',
        simCaption: 'Validators probe the available IP surface area and rank miners by reliability.',
        cta: 'Become a validator',
        metaTitle: 'Validators: Measure the UR network, earn SN25 dividends — UR',
        metaDescription: 'UR validators stake their own UR, walk operator-assigned chains of miners to prove real-time transit, and earn Bittensor dividends for accurate scoring.',
        roles: [
            { tag: '01', title: 'Walk the routes',        body: 'Validators walk operator-assigned chains of miners and collect a signed, self-proving record of each completed hop: cryptographic proof of real-time transit that anyone can check.' },
            { tag: '02', title: 'Score the network',      body: 'Each cycle a validator scores every operator\'s pool by demand and measured quality, and ranks the top fleets by routable-IP breadth, all under commit-reveal. Bittensor\'s Yuma Consensus turns those independent scores into miner emission.' },
            { tag: '03', title: 'Earn native dividends',  body: 'Validators earn Bittensor-native dividends for accurate, consensus-aligned scoring, their only reward. No operator owns a validator, and the set is permissionless.', href: '/docs/validator', linkLabel: 'Validator guide' },
            { tag: '04', title: 'Independent by design',  body: 'Because commit-reveal hides each validator\'s scores until they are stale, copying earns nothing. A validator has to run real trails. The measurement stays honest, and no single party controls it.' }
        ]
    },

    research: {
        eyebrow: 'Research',
        title:   'Open algorithms, open data.',
        metaTitle: 'Research: Open algorithms, data and audits — UR',
        metaDescription: 'UR research in the open: routing, matching, transfer and reward algorithms with source and anonymized data, the Apex SN1 latency competition, and audits.',
        intro:   'The protocol is a decentralized-native, multi-IP, multi-transport system designed to scale to millions of miners per network operator. Each algorithm area below is published with its source and, where applicable, anonymized data sets for independent analysis.',
        // the algorithm areas: each renders as an expandable block (closed: tag,
        // title, body; open: approach, links, directions). The anchor ids are in
        // components/research-areas.js, keyed by tag.
        areaLabels: {
            approach: 'Current approach',
            implementation: 'Implementation',
            directions: 'Research directions'
        },
        papers: [
            { tag: 'URTRANSPORT1', title: 'Performance',
              body: 'Multi-hop routing via TCP transports focused on global accessibility. UDP and peer-to-peer stream upgrades are supported with integration of WebRTC, XRay, and WireGuard planned.',
              approach: 'The transport is built for accessibility first, so that every person in the world can connect. Multi-hop routing runs over TCP transports through a central hop. UDP transports such as H3 and DNS are implemented but disabled: in real-world use they underperformed the TCP path in this setup. A multi-miner hop with a peer-to-peer stream upgrade is implemented and currently disabled as well. Transport selection and the stream upgrade path live in transport.go and transfer_stream_manager.go.',
              links: [
                  { href: 'https://github.com/urnetwork/connect/blob/main/transport.go', label: 'transport.go' },
                  { href: 'https://github.com/urnetwork/connect/blob/main/transfer_stream_manager.go', label: 'transfer_stream_manager.go' }
              ],
              directions: 'Integrate established protocols such as WebRTC, XRay and WireGuard as stream upgrades on the multi-miner hop, and re-enable UDP transports where measurements show they help. The matching algorithm may also start to distinguish hops that have a public IP and port from hops that do not, to balance speed against connection quality. Each of these can be trialled on an experimental network operator before it becomes the default.' },
            { tag: 'UREXTENDER1', title: 'Accessibility',
              body: 'N-layer TLS encryption (N≥2) where each outer layer uses a self-signed cert with SNI spoofing to an intermediary IP, forwarding to another hop or an end-to-end TLS connection. Anyone can host an extender on any domain.',
              approach: 'The core network stack supports N-layer TLS encryption, with N at least two. Each outer layer can use a self-signed certificate for a chosen host name to reach an intermediary IP, which forwards the traffic to another hop or to an end-to-end TLS connection with the network operator\'s domain, so the connection looks like ordinary traffic to that host name. Anyone can host an extender on a domain they control. The users of one extender share a common rate limit, adjustable case by case.',
              links: [
                  { href: 'https://github.com/urnetwork/connect/blob/main/net_extender.go', label: 'net_extender.go' }
              ],
              directions: 'Extenders can be added to a protocol grant list that allocates a share of incentives across the participating extenders; the onboarding details will be published when the list opens. Every miner already takes the extender role alongside egress. The open questions are how to measure an extender\'s reach where it matters most without exposing its users, and how the outer layers should rotate host names and certificates as blocking adapts.' },
            { tag: 'UR-FP2', title: 'Client–Miner Matching',
              body: 'Sampling algorithm that loads a 10× random sample of potential miners and shuffles proportional to reliability × client score. Sybil resistance is guaranteed by the constraint that reliability sums to at most 1 per IP subnet.',
              approach: 'The matching system loads a random sample of candidate miners from memory, about ten times the number it needs, and shuffles it in proportion to reliability × client score to produce the finalists. Its protection against miner aliasing (Sybil attacks) is a cap per IP subnet: the reliability scores of all miners in one subnet sum to at most 1, so splitting one connection into many identities does not raise its share of matches. The entry point is FindProviders2.',
              links: [
                  { href: 'https://github.com/urnetwork/server/blob/main/model/network_client_location_model.go', label: 'network_client_location_model.go' }
              ],
              directions: 'Distinguish hops with a public IP and port from hops without one when matching, to trade speed against connection quality explicitly rather than through reliability alone. The reliability and client-score weights and the size of the sample are the natural inputs for an experimental operator to vary against the anonymized block exports described below, with the per-subnet cap kept fixed as the Sybil bound.' },
            { tag: 'UR-MULTI', title: 'Multi Client',
              body: 'Heuristic sweep algorithm managing a window of miners. Locks traffic into the top available tier based on transfer thresholds rather than protocol analysis.',
              approach: 'A heuristic sweep manages a window of miners and locks traffic into the miners of the highest available tier. Decisions are made on transfer thresholds, how much a miner has actually moved, rather than on inspecting the protocol inside the tunnel, so the router never needs to look at application traffic. The window is what lets one client keep several miners in play at once and move traffic between them as their measured transfer changes.',
              links: [
                  { href: 'https://github.com/urnetwork/connect/blob/main/ip_remote_multi_client.go', label: 'ip_remote_multi_client.go' }
              ],
              directions: 'The thresholds and tier boundaries are hand-set today. Open questions for an experimental operator: whether they should be derived from measured transfer distributions instead, and whether the window should also take in the per-miner liveness and latency statistics that validators now produce (see Routing Verification), so a client can avoid a weak link before paying for it with its own traffic.' },
            { tag: 'UR-TRANSFER', title: 'Transfer',
              body: 'Reliable delivery window tuned for high-latency environments. Protocol retransmits are disabled since the window provides reliable delivery. Distributes traffic across transports by ranked performance.',
              approach: 'A reliable transfer window is tuned for high-latency environments. Because the window itself provides reliable delivery, protocol retransmits into the transfer layer are disabled: a TCP stream carried through the tunnel is not retransmitted on top of it. Traffic is distributed among the available transports according to their ranked performance and availability, so a slow or failing transport loses share rather than stalling the stream.',
              links: [
                  { href: 'https://github.com/urnetwork/connect/blob/main/transfer.go', label: 'transfer.go' }
              ],
              directions: 'Open questions: how the window should size itself across the spread of real-world latencies rather than for one fixed profile, how transports should be re-ranked as their performance changes mid-stream, and how the transfer layer should cooperate with the stream upgrades planned for the transport (see Performance) when one hop is peer-to-peer and the next is not.' },
            { tag: 'UR-IP', title: 'IP Egress',
              body: 'Minimal-memory IP stack implementation. Assumes reliable peer communication via the transfer layer, so retransmits are optimized accordingly.',
              approach: 'The IP stack is designed to run with minimal memory, so a miner can serve as egress on a phone or a small device. It assumes reliable communication with the peer through the transfer layer, which lets its own retransmit handling be optimized away rather than duplicated. The safety layer (see Safety) sits in the same path, so every packet is checked before it leaves the miner.',
              links: [
                  { href: 'https://github.com/urnetwork/connect/blob/main/ip.go', label: 'ip.go' }
              ],
              directions: 'Open questions: how much further the memory footprint can fall on the smallest devices, and how the egress stack keeps its guarantees once the transfer layer\'s reliability assumptions are relaxed for the peer-to-peer stream upgrades planned for the transport. As with the transport, changes are trialled on an experimental operator before they become the default.' },
            { tag: 'UR-PSUB2', title: 'Reward Allocation',
              body: 'Independent validators score every operator pool by demand and measured quality; Bittensor\'s Yuma Consensus turns those scores into emission. Within a pool, an operator ranks its miners by contracts served and reliability, commits a Merkle payout root each cycle, and every miner claims its share directly from the settlement contract.',
              approach: 'Rewards are the UR subnet\'s emission on SN25. Each operator\'s miners form one pool with one miner UID. Every tempo, independent validators score each pool by implied usage × measured quality (the operator\'s epoch deposit divided by the published rate for its conviction tier, times the pool\'s miner quality from the validator\'s own trails) under commit-reveal, and Yuma Consensus turns the median into emission. Inside the pool the operator ranks miners by contracts served × reliability, commits a Merkle payout root each epoch, and each miner claims its share directly from the settlement contract. The top fleets by routable-IP breadth hold their own UIDs and are paid natively. While the published price is 0, no deposits are collected and every pool carries the same implied demand, so measured quality alone steers the pool channel.',
              links: [
                  { href: 'https://github.com/urnetwork/server/blob/main/model/account_payment_model_plan.go', label: 'account_payment_model_plan.go' },
                  { href: 'https://github.com/urfoundation/sn/blob/main/WHITEPAPER.md', label: 'WHITEPAPER.md §7–§10' },
                  { href: 'https://github.com/urfoundation/sn/tree/main/validator', label: 'sn/validator' }
              ],
              directions: 'θ is a published governance parameter: start tail-weighted (θ ≈ 0.3), instrument the realized pay per tier, and widen it as the top-miner set and the independent-validator quality consensus mature, under the constraint that the lowest-paid top-level miner still earns at least the highest-paid pool miner. The swing that quality has on pool weight is capped at bootstrap and ramped. A validator effort bounty is designed but parked, to be built only if the live network shows independent coverage needs it. Decentralizing the validator set beyond the owner majority is a deliberate later governance step.' },
            { tag: 'UR-CONTRACT', title: 'Permission',
              body: 'Transfer between parties requires an encrypted contract with escrowed balance and a permission set. Both sides must close with acknowledged byte counts; disagreements trigger a forced resolution process.',
              approach: 'Transfer between an initiator and a companion requires a contract encrypted with the destination client\'s secret key. The contract holds a fixed transfer balance in escrow and defines the permissions between both parties. The companion can create paired contracts for return traffic, and multi-hop paths send stream-open and stream-close events to the intermediaries. After use, both parties close the contract with an acknowledged byte count. If either side does not close, or the totals disagree, contract resolution determines the outcome; if either side reports abuse, future transfer between those parties is blocked.',
              links: [
                  { href: 'https://github.com/urnetwork/server/blob/main/model/subscription_model.go', label: 'subscription_model.go' }
              ],
              directions: 'Contracts served × reliability is also the operator\'s default basis for its pool payout list, so the accuracy of the closed byte counts feeds rewards. Open questions: how to settle a disagreement between two closing counts without a trusted third total, how paired return contracts should be sized for asymmetric traffic, and how an abuse report should be weighed when the two parties\' counts have disagreed before.' },
            { tag: 'UR-SEC1', title: 'Safety',
              body: 'Port block list and IP block list protecting the miner network. Does not perform protocol inspection. Miners route only encrypted traffic.',
              approach: 'The safety layer uses port and IP block lists. It does not inspect application protocols: miners route only encrypted traffic, so there is nothing to inspect, and the block lists are what let a miner reject traffic that conflicts with common regulation directions such as CFAA and DMCA and drop known-malicious destinations. The lists apply on the miner, so a user\'s traffic meets the same rules on every exit.',
              links: [
                  { href: 'https://github.com/urnetwork/connect/blob/main/ip_security.go', label: 'ip_security.go' }
              ],
              directions: 'Open questions: how block lists should be distributed and updated across a fleet without a central point that can see traffic, whether the safety layer should learn per-destination reputation from anonymized egress data rather than static lists, and what a miner should be able to add to its own lists without splitting the network\'s behavior across exits.' },
            { tag: 'UR-VERIFY1', title: 'Routing Verification',
              body: 'Validators walk server-assigned chains of miners, proving live egress from each hop with four Ed25519 signatures. Per-step completion and latency statistics find the weakest link and become the quality signal that steers pool emission.',
              approach: 'A validator seeds a trail through a miner of its choice and calls /verify; the server derives the hop from the request\'s source IP, never from a claim. Each next hop is drawn uniformly at random, without replacement, and revealed only after the current hop confirms, so a path cannot be precomputed. Four Ed25519 signatures bind the trail: SEED and EXTEND by the validator, ASSIGN and FINAL by the server, which also stamps every hop time. A failure is attributed to the one hop that was never reached, latency is recorded per step at confirmation, the validator-chosen seed hop is excluded, and each miner is reported by a Wilson-score completion interval and latency percentiles once it has enough exposure.',
              links: [
                  { href: 'https://github.com/urnetwork/server/blob/main/controller/verify_controller.go', label: 'verify_controller.go' },
                  { href: 'https://github.com/urfoundation/sn/tree/main/validator', label: 'sn/validator' },
                  { href: 'https://github.com/urfoundation/sn/blob/main/VALIDATOR.md', label: 'VALIDATOR.md' }
              ],
              directions: 'A completed trail proves live sequential transit to one known destination, not honest relay of user traffic, and per-hop self-dealing is bounded only statistically, by an independent validator population. The roadmap to payout-grade measurement: proof-of-routing through neighbor attestation, destination diversity so a miner cannot optimize the single measured path, validator Sybil resistance through stake, and a hierarchical hazard model for attribution. Until then the statistics are liveness and latency monitoring and provisional scoring.' }
        ],
        competition: {
            title: 'Sim Latency Algo Competition',
            eyebrow: 'Powered by Apex (SN1)',
            // {code} renders as a link (to the urnetwork GitHub) worded codeLabel
            body: 'Optimize the UR protocol. Submissions evaluate against a branch of {code} and the winner becomes the next baseline and earns SN1α. Spanning six rounds, one week each, starting 2026-09-28. Let\'s go!',
            codeLabel: 'the code',
            cta: 'Join the Competition',
            // the card's status pill; {date} is the start date
            statusUpcoming: 'Starts {date}',
            statusLive: 'Live',
            statusEnded: 'Ended',
            imageAlt: 'Two nodes joined by routes through a barrier: the Apex sim-latency competition'
        },
        anonymization: {
            title: 'Anonymization',
            body: 'The network\'s payout block is 7 days, and the exports of each algorithm\'s inputs and outputs are anonymized per block. Every client id and IP-subnet hash is replaced with a simple integer counter, so an identity is consistent inside one block but carries nothing across blocks and nothing back to a production id. City metadata is not included. The block exports are prepared for publication but not published yet; this page will link them when they are.'
        },
        researchers: {
            title: 'For researchers and builders',
            // {vdp} renders as the link to /vdp worded vdpLabel
            body: 'UR wants users to be able to opt into experimental algorithms through federated network operators. A new operator joins the same incentive system that pays today\'s miners, and a miner can serve as many operators as it likes. The app will offer every user the option to enter an alternate operator domain. Access details for experimental operators will be published when the program opens, and this page tracks the current default algorithm and the experimental directions. For security research, follow the {vdp}.',
            vdpLabel: 'Vulnerability Disclosure Policy'
        },
        audits: {
            title: 'Audits',
            intro: 'Peer audits of the protocol and its implementations.',
            tag: 'Peer audit',
            items: [
                { id: 'cure53-2026', pending: true, name: 'Encryption audit 2026', firm: 'Cure53',
                  tag: 'Scheduled', status: 'Scheduled for November – December 2026',
                  scope: 'Scope: encryption design and implementation correctness.',
                  note: 'Results will be published by UR and Cure53.' },
                { id: 'masa-l2-2025', name: 'MASA L2 2025', firm: 'Leviathan Security Group',
                  status: 'Completed May 2025' }
            ]
        },
        publications: {
            title: 'Papers',
            comingSoon: 'arXiv — coming soon',
            items: [
                { title: 'Whole Internet Encryption for the whole world' }
            ]
        }
    },

    community: {
        eyebrow: 'Community',
        title:   'The people behind the network.',
        intro:   'The protocol is open. The community that builds and operates it is growing. Here is where to find them.',
        items: [
            { tag: '01', title: 'Discord',              body: 'General discussion about the project: protocol development, miner support, and community.', href: 'https://discord.gg/urnetwork', linkLabel: 'Join Discord' },
            { tag: '02', title: 'Bittensor SN Discord', body: 'Bittensor-specific discussion: the subnet, emission, validators, and staking.', soon: 'Coming soon' },
            { tag: '03', title: 'Brand Kit',           body: 'URnetwork and the connector logo are registered US trademarks. Permission is granted for users of the protocol to use the brand kit as "powered by UR" or "with URnetwork" or similar component messaging.', button: { label: 'Download brand kit' } }
        ],
        supportersTitle: 'Supporters',
        partnersTitle:   'Partners'
    }
};
