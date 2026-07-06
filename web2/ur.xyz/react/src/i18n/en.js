// English — canonical source for the site copy. Other language files
// mirror this structure key-for-key; if you add a key here, add it
// everywhere else too.
export default {
    nav: {
        whitepaper: 'Whitepaper',
        operators:  'Operators',
        miners:     'Miners',
        validators: 'Validators',
        research:   'Research',
        community:  'Community',
        usage:      'Usage',
        docs:       'Docs',
        tagline:    'Own your privacy. Own your network.',
        languageMenu: 'Language',
        ctaAria:    'Usage — current network activity'
    },

    footer: {
        github:     'GitHub',
        contact:    'Contact',
        copyright:  '© 2026 BringYour, Inc.',
        disclaimer: 'This site is an open source utility protocol powered by a community of participants, run separately from the network operator that sells access to the network.',
        languagesAria: 'Languages'
    },

    stats: {
        protocolLedger:  'Subnet Ledger',
        block:           'Epoch',
        totalFees:       'Deposits ($UR)',
        totalData:       'Total Data',
        totalUsers:      'Total Users',
        totalSupply:     'Total $UR Supply',
        totalDistributed:'Emission Distributed',
        urAbsorbed:      'Buyback Reserve ($UR)',
        statusHeld:      'Held in Contract ($UR)'
    },

    whitepaper: {
        eyebrow: 'Whitepaper',
        title:   'A privacy network, coordinated on Bittensor.',
        clauses: [
            {
                numeral: 'I.',
                title:   'A decentralized privacy network',
                body: [
                    'UR is a decentralized privacy network. It distributes user traffic across a global network of independent miners using multi-hop routing and layered encryption, so that no single miner sees both who a user is and what they are doing. The transport is designed to resemble ordinary HTTPS — N-layer TLS encryption, SNI spoofing, and traffic indistinguishability — so the network stays reachable almost everywhere.',
                    'The UR Subnet coordinates this network through on-chain incentives on Bittensor. Network operators run the servers; independent miners carry the ingress and egress traffic; and independent validators continuously walk operator-assigned chains of miners to prove real-time transit and measure which miners are the weakest links. That measurement is the core signal the network pays for.',
                    'Bittensor\'s Yuma Consensus turns the validators\' measurements into token emission, and a smart contract on the Subtensor EVM settles the payouts. The protocol is open source, and running a miner or a validator is permissionless.'
                ]
            },
            {
                numeral: 'II.',
                title:   'Roles',
                body: [
                    'Network operators run the privacy servers and the verification endpoint. An operator deposits into the subnet, co-signs each measured path, and commits a payout list that splits its rewards among the miners attached to it. An operator directs where its rewards go but never holds anyone else\'s funds.',
                    'Miners are the ingress and egress of the network. They run a safe-by-default security model, block known-malicious IPs, and route only encrypted traffic. A miner carries traffic for one or more operators and is paid for the routable capacity it contributes.',
                    'Validators are independent. Each stakes its own $UR, runs the routing-verification protocol, and scores every operator\'s pool by demand and measured quality. Validators earn the network\'s native dividends for accurate, consensus-aligned scoring — no operator owns a validator, and the set is permissionless.',
                    'The subnet owner — BringYour, Inc. — governs the settlement contract and operates the network\'s reserve. That role is transitional: control begins centralized-but-bounded and progressively decentralizes (clause V).'
                ]
            },
            {
                numeral: 'III.',
                title:   'The $UR token',
                body: [
                    '$UR is the subnet\'s native token — the unit of account for deposits, emission, and settlement. It is a utility token for coordinating and paying for network resources; it is not designed to represent or provide any right to profits, income, or returns.',
                    'New $UR is emitted by Bittensor\'s coinbase each cycle and split three ways:',
                    { type: 'table', head: ['Stream', 'Share', 'Recipients'], rows: [
                        ['Owner',      '18%', 'BringYour, Inc. — subnet owner and network reserve'],
                        ['Miners',     '41%', 'Miners — through operator pools and top-level miner slots'],
                        ['Validators', '41%', 'Independent validators — native dividends for accurate scoring']
                    ]},
                    'Operators fund the network by depositing $UR sized to their real usage, at a published reference rate. A deposit is a costly, revenue-backed signal of real demand — and it is conviction stake: the contract moves every deposit into a locked reserve where it compounds and is never redistributed, permanently removing $UR from liquid supply in proportion to real usage. An operator\'s cumulative locked stake lowers the rate it must post, so committed operators can onboard with less up-front capital.',
                    'Miners are paid from emission, not from deposits. Because deposits are locked rather than recycled, real usage becomes a standing, growing bid under the token instead of sell pressure, while emission follows a fixed schedule with halvings.'
                ]
            },
            {
                numeral: 'IV.',
                title:   'Two ways to earn',
                body: [
                    'A single operator can serve well over 100,000 miners — far more than a subnet\'s roughly 256 on-chain slots — so the network pays miners through two tiers that run in parallel.',
                    'The pool is the on-ramp. Every operator holds one on-chain slot for all of its miners; validators weight that pool by the operator\'s demand and its measured quality, and each miner claims its share directly from the settlement contract with a cryptographic proof. There is no slot to win and nothing to burn — it is where a miner starts and earns a baseline reward.',
                    'Top-level miners are the supply apex. The roughly 200 largest fleets — ranked by how many distinct, routable exit IPs they actually serve, not by traffic volume — each claim their own on-chain slot and are paid directly by the network, with no operator in the payout path. A shared IP is split among the fleets that claim it, so breadth cannot be double-counted.',
                    'The two tiers are one tournament: a miner starts in a pool, graduates to a top slot as its routable-IP breadth grows, and falls back to the pool if it slips. A governance-set share divides emission between the head and the tail.',
                    { type: 'list', items: [
                        'Pool tier — the on-ramp: join an operator with no slot and no registration cost; validators weight the pool by demand and quality; each miner claims its share by proof every settlement period.',
                        'Top-level miners — the apex: the ~200 fleets with the broadest routable-IP coverage claim their own slot and are paid directly by the network, with no operator, no pool, and no intermediary.'
                    ]}
                ]
            },
            {
                numeral: 'V.',
                title:   'Custody, settlement, and decentralization',
                body: [
                    'Settlement runs on a seven-day cycle. The contract accrues each pool\'s emission over the period, then opens claims: miners pull their $UR directly from the contract against their operator\'s committed payout list. Top-level miners need no settlement step — the chain pays their slot natively every cycle.',
                    'No one holds anyone else\'s funds. The settlement contract is the sole custodian of in-transit $UR, every pool payout is a direct on-chain claim, and top-level miners are paid natively to their own keys. Operators and the owner never take custody of miners\' rewards.',
                    'Earned claims are final. Once a settlement period is finalized, the tokens backing its claims are committed — no upgrade, pause, or administrative action can block or reverse them. The locked reserve is one-way by the same standard: no function can move funds out of it.',
                    'Control decentralizes over time. The network launches with the contract upgradeable behind an owner multisig — deliberate, bounded central control for early bug-fixes — and hardens in stages: a public timelock on every change, a pause-only guardian that can stop an exploit but can never move funds or block finalized claims, and, in time, on-chain governance and an immutable settlement core.'
                ]
            }
        ],
        source: { label: 'Read the full whitepaper', href: 'https://github.com/urfoundation/sn/' }
    },

    operators: {
        eyebrow: 'Operators',
        title:   'The operators who run the network.',
        intro:   'Network operators run the privacy servers and the verification endpoint. An operator deposits into the subnet as a costly, revenue-backed signal of real demand, runs the routing-verification protocol that co-signs each measured path, and commits the payout list that splits its rewards among the miners attached to it. Operators direct where rewards go but never hold anyone else\'s funds.',
        roles: [
            { tag: '01', title: 'Run the servers',    body: 'Operators run the privacy servers and the /verify endpoint that co-signs each measured path — the coordination layer between users and the miners that carry the traffic.' },
            { tag: '02', title: 'Signal real demand',  body: 'Operators deposit $UR sized to their real usage. Every deposit is conviction stake locked in the buyback reserve — never redistributed — so it is a costly, revenue-backed signal that validators weight when they score the pools.' },
            { tag: '03', title: 'Direct the payouts',  body: 'Each settlement period an operator commits a Merkle payout list that splits its pool among its miners. It directs the split but never takes custody — every miner claims its share directly from the contract.' },
            { tag: '04', title: 'Get started',         body: 'Register a network-operator key, run the /verify server, and deposit to begin. Operator admission is owner-gated during the launch phase.', href: 'https://ur.xyz', linkLabel: 'Operator docs' }
        ]
    },

    miners: {
        eyebrow: 'Miners',
        title:   'The miners who carry the traffic.',
        intro:   'Miners are the supply of the network — they carry both the ingress and the egress traffic. They run a safe-by-default security model, route only encrypted traffic, register with one or more operators, and are paid from subnet emission for the routable capacity they contribute. Miners compete on reach: the fleets serving the most distinct, routable IP subnets are promoted to top-level miners and earn more. Everything runs in user space, on hardware you already own.',
        roles: [
            { tag: '01', title: 'Egress',              body: 'Egress miners are the exit IPs of the shared network. They reject traffic that conflicts with common regulation directions like CFAA and DMCA, block known-malicious IPs, and route only encrypted traffic — protecting both miners and users.' },
            { tag: '02', title: 'Ingress',             body: 'Ingress miners (extenders) create entry points that improve reachability worldwide — using N-layer TLS, SNI spoofing, and trusted forwarding. A rotating subset is exposed each cycle, and clients automatically retry the entry points that worked before.' },
            { tag: '03', title: 'Measured and matched',body: 'Independent validators walk chains of miners to prove real-time transit and measure liveness and quality. Miners are ranked by that measurement and by speed, and each operator runs its own matchmaking between users and miners.' },
            { tag: '04', title: 'Earn from emission',  body: 'Miners are paid from the subnet\'s emission. Inside an operator\'s pool you claim your share each settlement by proof — a low-barrier baseline reward, with no slot to win and nothing to burn.', href: 'https://docs.ur.io/provider', linkLabel: 'Miner docs' },
            { tag: '05', title: 'Compete for the top',  body: 'Miners compete on reach. The network ranks fleets by how many distinct, routable exit IPs they actually serve — not by traffic volume — and the roughly 200 with the broadest coverage are promoted to top-level miners: their own on-chain slot, paid natively, earning more. Shared IPs are split among the fleets that claim them, so unique coverage is what wins — grow your distinct-IP breadth to climb, and if your reach slips you fall back to the pool.' }
        ]
    },

    validators: {
        eyebrow: 'Validators',
        title:   'The validators who measure the network.',
        intro:   'Validators are independent. Each stakes its own $UR and runs the routing-verification protocol — continuously walking operator-assigned chains of miners to prove real-time transit and measure which miners are the weakest links. That measurement is the core signal the network pays for, and validators earn native dividends for producing it accurately.',
        roles: [
            { tag: '01', title: 'Walk the routes',        body: 'Validators walk operator-assigned chains of miners and collect a signed, self-proving record of each completed hop — cryptographic proof of real-time transit that anyone can check.' },
            { tag: '02', title: 'Score the network',      body: 'Each cycle a validator scores every operator\'s pool by demand and measured quality, and ranks the top fleets by routable-IP breadth — all under commit-reveal. Bittensor\'s Yuma Consensus turns those independent scores into miner emission.' },
            { tag: '03', title: 'Earn native dividends',  body: 'Validators earn Bittensor-native dividends for accurate, consensus-aligned scoring — their only reward. No operator owns a validator, and the set is permissionless.' },
            { tag: '04', title: 'Independent by design',  body: 'Because commit-reveal hides each validator\'s scores until they are stale, copying earns nothing — a validator has to run real trails. The measurement stays honest, and no single party controls it.' }
        ]
    },

    research: {
        eyebrow: 'Research',
        title:   'Open algorithms, open data.',
        intro:   'The protocol is a decentralized-native, multi-IP, multi-transport system designed to scale to millions of miners per network operator. Each algorithm area below is published with its source and, where applicable, anonymized data sets for independent analysis.',
        papers: [
            { tag: 'URTRANSPORT1', title: 'Performance',
              body: 'Multi-hop routing via TCP transports focused on global accessibility. UDP and peer-to-peer stream upgrades are supported with integration of WebRTC, XRay, and WireGuard planned.',
              href: 'https://github.com/urnetwork/connect/blob/main/transport.go', linkLabel: 'transport.go' },
            { tag: 'UREXTENDER1', title: 'Accessibility',
              body: 'N-layer TLS encryption (N≥2) where each outer layer uses a self-signed cert with SNI spoofing to an intermediary IP, forwarding to another hop or an end-to-end TLS connection. Anyone can host an extender on any domain.',
              href: 'https://github.com/urnetwork/connect/blob/main/net_extender.go', linkLabel: 'net_extender.go' },
            { tag: 'UR-FP2', title: 'Client–Miner Matching',
              body: 'Sampling algorithm that loads a 10× random sample of potential miners and shuffles proportional to reliability × client score. Sybil resistance is guaranteed by the constraint that reliability sums to at most 1 per IP subnet.',
              href: 'https://github.com/urnetwork/server/blob/main/model/network_client_location_model.go', linkLabel: 'network_client_location_model.go' },
            { tag: 'UR-MULTI', title: 'Multi Client',
              body: 'Heuristic sweep algorithm managing a window of miners. Locks traffic into the top available tier based on transfer thresholds rather than protocol analysis.',
              href: 'https://github.com/urnetwork/connect/blob/main/ip_remote_multi_client.go', linkLabel: 'ip_remote_multi_client.go' },
            { tag: 'UR-TRANSFER', title: 'Transfer',
              body: 'Reliable delivery window tuned for high-latency environments. Protocol retransmits are disabled since the window provides reliable delivery. Distributes traffic across transports by ranked performance.',
              href: 'https://github.com/urnetwork/connect/blob/main/transfer.go', linkLabel: 'transfer.go' },
            { tag: 'UR-IP', title: 'IP Egress',
              body: 'Minimal-memory IP stack implementation. Assumes reliable peer communication via the transfer layer, so retransmits are optimized accordingly.',
              href: 'https://github.com/urnetwork/connect/blob/main/ip.go', linkLabel: 'ip.go' },
            { tag: 'UR-PSUB2', title: 'Reward Allocation',
              body: 'Independent validators score every operator pool by demand and measured quality; Bittensor\'s Yuma Consensus turns those scores into emission. Within a pool, an operator ranks its miners by contracts served and reliability, commits a Merkle payout root each cycle, and every miner claims its share directly from the settlement contract.',
              href: 'https://github.com/urnetwork/server/blob/main/model/account_payment_model_plan.go', linkLabel: 'account_payment_model_plan.go' },
            { tag: 'UR-CONTRACT', title: 'Permission',
              body: 'Transfer between parties requires an encrypted contract with escrowed balance and a permission set. Both sides must close with acknowledged byte counts; disagreements trigger a forced resolution process.',
              href: 'https://github.com/urnetwork/server/blob/main/model/subscription_model.go', linkLabel: 'subscription_model.go' },
            { tag: 'UR-SEC1', title: 'Safety',
              body: 'Port block list and IP block list protecting the miner network. Does not perform protocol inspection — miners route only encrypted traffic.',
              href: 'https://github.com/urnetwork/connect/blob/main/ip_security.go', linkLabel: 'ip_security.go' }
        ]
    },

    community: {
        eyebrow: 'Community',
        title:   'The people behind the network.',
        intro:   'The protocol is open. The community that builds and operates it is growing. Here is where to find them.',
        items: [
            { tag: '01', title: 'Network Operators',  body: 'Network operators run servers, deposit into the subnet, and sell access to the network.', href: 'https://ur.io', linkLabel: 'BringYour, Inc. — ur.io' },
            { tag: '02', title: 'Discord',             body: 'Join the conversation — protocol development, miner support, and community discussion.', href: 'https://discord.gg/urnetwork', linkLabel: 'Join Discord' },
            { tag: '03', title: 'Brand Kit',           body: 'URnetwork and the connector logo are registered US trademarks. Permission is granted for users of the protocol to use the brand kit as "powered by URnetwork" or similar component messaging.' }
        ]
    }
};
