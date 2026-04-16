// English — canonical source for the site copy. Other language files
// mirror this structure key-for-key; if you add a key here, add it
// everywhere else too.
export default {
    nav: {
        whitepaper: 'Whitepaper',
        research:   'Research',
        providers:  'Providers',
        extenders:  'Extenders',
        community:  'Community',
        usage:      'Usage',
        docs:       'Docs',
        tagline:    'Own your privacy. Own your network.',
        languageMenu: 'Language',
        ctaAria:    'Usage — current network costs'
    },

    footer: {
        github:     'GitHub',
        contact:    'Contact',
        copyright:  '© 2026 BringYour, Inc.',
        disclaimer: 'This site is an open source utility protocol powered by a community of participants, run separately from the network operator that sells access to the network.',
        languagesAria: 'Languages'
    },

    stats: {
        protocolLedger:  'Protocol Ledger',
        block:           'Block',
        totalFees:       'Total Fees ($UR)',
        totalData:       'Total Data',
        totalUsers:      'Total Users',
        totalSupply:     'Total $UR Supply',
        totalDistributed:'Total Distributed',
        urAbsorbed:      '$UR Absorbed',
        statusHeld:      'Status Held ($UR)'
    },

    whitepaper: {
        eyebrow: 'Whitepaper',
        title:   'A token for the open network.',
        clauses: [
            {
                numeral: 'I.',
                title:   'General Description of URnetwork',
                body: [
                    'URnetwork is a decentralized privacy infrastructure protocol designed to enable "whole internet encryption" by mitigating exposure of metadata inherent in the TCP/IP protocol suite. While most internet traffic is encrypted at the content layer, metadata such as source and destination IP addresses remain visible to intermediaries. The protocol distributes user traffic across a global network of independent providers using multi-hop routing and layered encryption, such that no single provider has access to both the user\'s identity and the content of communications. The protocol incorporates techniques including N-layer TLS encryption, SNI spoofing, and traffic indistinguishability to resemble standard HTTPS traffic.',
                    'The protocol architecture separates transport, routing, matching, and settlement into distinct components. Users connect through client software that dynamically routes traffic across multiple providers based on performance and reliability metrics. Data transfer occurs through encrypted contracts between users and providers, with escrowed balances, defined permissions, and post-transfer settlement based on acknowledged usage. Contracts include dispute resolution mechanisms and are deleted after a defined period. The protocol is open source and has been operational since approximately April 2025.',
                    'Users and providers can interact directly with the protocol without reliance on any network operator. Network operators are sophisticated protocol operators capable of coordinating and deploying significant volumes of smart contracts. They may resell that volume to consumers or use it for their own purposes. In many cases, network operators deploy protocol contracts acting as a bridge between everyday users and the protocol.',
                    'The protocol is a self-operating permissionless system which operates independently of network operators. The protocol\'s economics operate via two rates: a per-gigabyte transfer rate and a per-user transfer rate. These two rates capture all of the use cases that the network is usable for. Anyone can utilize the protocol provided they pay one of these two rates.'
                ]
            },
            {
                numeral: 'II.',
                title:   'Separation of Roles',
                body: [
                    'The protocol operates wholly independently and would remain functional if the company that deployed it ceased maintaining it. The operation and utility of the protocol do not depend on the ongoing managerial or entrepreneurial efforts of any single entity.',
                    'Users and providers do not need to use software or hardware provided by any particular company to participate. They can directly interact with the protocol via their own code deployments. The company that deployed the protocol intends to clearly delineate and identify the difference between its role as deployer of the protocol, as a network operator who uses the protocol to operate services, and as the present steward of the protocol.'
                ]
            },
            {
                numeral: 'III.',
                title:   'Introduction of $UR Token',
                body: [
                    'Within the protocol, the token is intended to function as a payment and settlement instrument. Tokens are utilized in connection with discrete network operations and are consumed or allocated as part of those operations. The token is not designed to represent or provide any right to profits, income, or returns, and is intended to function solely as a means of accessing and participating in the protocol.',
                    'Users utilize tokens by depositing them into programmatic contracts prior to network usage, with pricing based on data transfer and user activity. Deposited tokens fund contract-based bandwidth transactions between users and providers, with portions held in escrow during execution. Upon settlement, tokens are distributed into a reward pool and allocated to providers based on performance metrics.',
                    'Upon completion of every block (one week), 97.5% of tokens used are distributed to providers, and 2.5% are removed from circulation via absorption. Tokens directed to absorption are not redistributed and are excluded from protocol-level accounting for future contract settlement. This mechanism is designed to balance network usage and resource allocation.',
                    'The total supply is fixed at 1,000,000,000 tokens, all minted at genesis, with no ongoing inflation. At token generation, the allocation is as follows:',
                    { type: 'table', head: ['Category', '%', 'Tokens', 'Vesting'], rows: [
                        ['Contributor Rewards', '20%', '200,000,000', '1 year vest, 2 year linear unlock'],
                        ['Team & Advisors',     '23%', '230,000,000', '1 year vest, up to 2 year linear unlock'],
                        ['Equity Investors',    '15%', '150,000,000', '1 year vest, 2 year linear unlock'],
                        ['Treasury',            '2%',  '20,000,000',  'Linear unlock over 1 year'],
                        ['Strategic Reserve',   '40%', '450,000,000', 'Reserved for future protocol use (0 inflation)']
                    ]},
                    'Approximately 2% of supply (20 million tokens) is expected to be in initial circulation for liquidity purposes.'
                ]
            },
            {
                numeral: 'IV.',
                title:   'Distribution and Circulation',
                body: [
                    'Tokens can be obtained in two ways: direct acquisition on secondary markets, or receipt as provider rewards for bandwidth contributed to the network.',
                    'Network operators may acquire tokens on a non-exclusive, market-driven basis to support their use of the protocol. Such activity is undertaken solely for consumptive purposes and not for investment or market support. The protocol does not depend on any network operator to acquire tokens in order to function, and token demand is not designed to be driven by any single participant or class of participants.',
                    'Network operators can sell access to the protocol in token, fiat, or token-denominated terms as they wish. Network operators may structure service tiers that incorporate token-based participation signals or payment methods to customize access to features within their applications.',
                    'To summarize the interaction between entities:',
                    { type: 'list', items: [
                        'A user may purchase tokens on the open market and use them to interact with the protocol directly (including to become a network operator), or they may rely on a network operator to access the protocol without touching tokens.',
                        'A provider will receive tokens for provision of bandwidth to the protocol.',
                        'Network operators will acquire, retain, and spend tokens to make their services available to their customers, who may or may not be users depending on the nature of those services.'
                    ]}
                ]
            },
            {
                numeral: 'V.',
                title:   'Staking and Integrity Mechanisms',
                body: [
                    'The protocol does not provide passive returns or yield on tokens. Any differences in outcomes across participants are solely a function of differences in activity, reliability, and usage within the network. The protocol has a form of operational qualification and prioritization built in — integrity mechanisms — that signal commitment, reliability, and quality of participation, which the protocol uses to prioritize resource allocation and contract selection.',
                    { type: 'list', items: [
                        'Consumer staking: Network operators may offer service tiers that integrate token-based authentication or participation signals to customize access to features within their applications.',
                        'Developer staking: Developers that maintain token balances are eligible for reduced network rates as part of a usage-based pricing structure hard-wired into the protocol, designed to encourage sustained integration and long-term network participation.',
                        'Provider staking: Providers that lock tokens are prioritized for contract assignment based on demonstrated commitment and reliability. Providers who lock $UR receive larger reward shares during the block-end reward cycle based on an allocation weighting multiplier (1.0x, 1.25x, 1.5x, or 2.0x). These adjusted multipliers do not create inflation — the total epoch reward pool is fixed. Unstaked providers still earn rewards at smaller proportional shares.'
                    ]},
                    'These integrity mechanisms support reliable operation, performance, and availability of the protocol by aligning network access and resource allocation with demonstrable participation and service quality. Across each category of participant, these mechanisms operate to facilitate effective use of the network rather than to provide economic benefit based on passive token ownership.'
                ]
            }
        ]
    },

    research: {
        eyebrow: 'Research',
        title:   'Open algorithms, open data.',
        intro:   'The protocol is a decentralized-native, multi-IP, multi-transport system designed to scale to millions of providers per network operator. Each algorithm area below is published with its source and, where applicable, anonymized data sets for independent analysis.',
        papers: [
            { tag: 'URTRANSPORT1', title: 'Performance',
              body: 'Multi-hop routing via TCP transports focused on global accessibility. UDP and peer-to-peer stream upgrades are supported with integration of WebRTC, XRay, and WireGuard planned.',
              href: 'https://github.com/urnetwork/connect/blob/main/transport.go', linkLabel: 'transport.go' },
            { tag: 'UREXTENDER1', title: 'Accessibility',
              body: 'N-layer TLS encryption (N\u22652) where each outer layer uses a self-signed cert with SNI spoofing to an intermediary IP, forwarding to another hop or an end-to-end TLS connection. Anyone can host an extender on any domain.',
              href: 'https://github.com/urnetwork/connect/blob/main/net_extender.go', linkLabel: 'net_extender.go' },
            { tag: 'UR-FP2', title: 'Client\u2013Provider Matching',
              body: 'Sampling algorithm that loads a 10\u00d7 random sample of potential providers and shuffles proportional to reliability \u00d7 client score. Sybil resistance is guaranteed by the constraint that reliability sums to at most 1 per IP subnet.',
              href: 'https://github.com/urnetwork/server/blob/main/model/network_client_location_model.go', linkLabel: 'network_client_location_model.go' },
            { tag: 'UR-MULTI', title: 'Multi Client',
              body: 'Heuristic sweep algorithm managing a window of providers. Locks traffic into the top available tier based on transfer thresholds rather than protocol analysis.',
              href: 'https://github.com/urnetwork/connect/blob/main/ip_remote_multi_client.go', linkLabel: 'ip_remote_multi_client.go' },
            { tag: 'UR-TRANSFER', title: 'Transfer',
              body: 'Reliable delivery window tuned for high-latency environments. Protocol retransmits are disabled since the window provides reliable delivery. Distributes traffic across transports by ranked performance.',
              href: 'https://github.com/urnetwork/connect/blob/main/transfer.go', linkLabel: 'transfer.go' },
            { tag: 'UR-IP', title: 'IP Egress',
              body: 'Minimal-memory IP stack implementation. Assumes reliable peer communication via the transfer layer, so retransmits are optimized accordingly.',
              href: 'https://github.com/urnetwork/connect/blob/main/ip.go', linkLabel: 'ip.go' },
            { tag: 'UR-PSUB2', title: 'Token Allocation',
              body: 'Block rewards distributed every 7 days proportional to data transfer votes, reliability scores, and referrals. Paid-subscriber traffic is prioritized to counteract gaming. Multiplier bonuses apply for reliability and community incentives.',
              href: 'https://github.com/urnetwork/server/blob/main/model/account_payment_model_plan.go', linkLabel: 'account_payment_model_plan.go' },
            { tag: 'UR-CONTRACT', title: 'Permission',
              body: 'Transfer between parties requires an encrypted contract with escrowed balance and a permission set. Both sides must close with acknowledged byte counts; disagreements trigger a forced resolution process.',
              href: 'https://github.com/urnetwork/server/blob/main/model/subscription_model.go', linkLabel: 'subscription_model.go' },
            { tag: 'UR-SEC1', title: 'Safety',
              body: 'Port block list and IP block list protecting the provider network. Does not perform protocol inspection — providers route only encrypted traffic.',
              href: 'https://github.com/urnetwork/connect/blob/main/ip_security.go', linkLabel: 'ip_security.go' }
        ]
    },

    providers: {
        eyebrow: 'Providers',
        title:   'The egress of the shared network.',
        intro:   'Providers are the egress IPs of the shared network. They run a default safe security model, block known malicious IPs, and route only encrypted traffic. Providers are ranked by speed and reliability, register with one or more network operators, and earn a share of the contract value they route. Providers run entirely in user space and do not require root privileges.',
        roles: [
            { tag: '01', title: 'Safe by default',     body: 'Providers reject traffic that conflicts with common regulation directions like CFAA and DMCA. Known botnets and malicious IPs are blocked. Only encrypted traffic is routed, protecting both providers and users.' },
            { tag: '02', title: 'Ranked and matched',   body: 'Providers are ranked by speed and reliability and register with one or more network operators. Each network operator runs its own matchmaking algorithm between users and providers.' },
            { tag: '03', title: 'Earn a share',         body: 'Providers earn a share of the contract value they route. Run a provider on hardware you already own — no root privileges required, everything runs in user space.' },
            { tag: '04', title: 'Get started',          body: 'Set up a provider node and start contributing bandwidth to the network.', href: 'https://docs.ur.io/provider', linkLabel: 'Provider docs' }
        ]
    },

    extenders: {
        eyebrow: 'Extenders',
        title:   'The ingress that carries the network further.',
        intro:   'Extenders create a private or shared network of ingress IPs that use a variety of techniques to improve connectivity worldwide. Extenders can forward to known trusted network operators, to other extenders, and to trusted partner IPs using the network operator trust signing.',
        roles: [
            { tag: '01', title: 'Private extenders',         body: 'Not registered with network operators — act as a client of the system. Users manually enter the extender IP in the client to connect via the extender.' },
            { tag: '02', title: 'Public extenders',           body: 'Register with network operators and receive a portion of the protocol contract value they route. Public extenders choose which network operators they forward to, and can also forward to other extender IPs or IPs signed by forwarded network operators.' },
            { tag: '03', title: 'Rotating exposure',          body: 'A random subset of public extenders is chosen to be exposed each block (1 week). Exposure depends on calling region and time. Clients maintain a local cache of extenders so that previously working extenders are automatically retried.' },
            { tag: '04', title: 'Trusted forwarding',         body: 'Network operators can associate a trusted IP with a password so extenders can forward to any IP that passes the trust test. The network stores the IP as a salted hash following the general IP storage guidelines.' }
        ]
    },

    community: {
        eyebrow: 'Community',
        title:   'The people behind the network.',
        intro:   'The protocol is open. The community that builds and operates it is growing. Here is where to find them.',
        items: [
            { tag: '01', title: 'Network Operators',  body: 'Network operators build products on the protocol and sell access to the network.', href: 'https://ur.io', linkLabel: 'BringYour, Inc. — ur.io' },
            { tag: '02', title: 'Discord',             body: 'Join the conversation — protocol development, provider support, and community discussion.', href: 'https://discord.gg/urnetwork', linkLabel: 'Join Discord' },
            { tag: '03', title: 'Brand Kit',           body: 'URnetwork and the connector logo are registered US trademarks. Permission is granted for users of the protocol to use the brand kit as "powered by URnetwork" or similar component messaging.' }
        ]
    },

    usage: {
        eyebrow: 'Usage',
        title:   'The people who package the network.',
        intro:   'Network operators turn the open marketplace of providers and extenders into products that consumers and businesses can buy. They are the public face of the network, and the protocol holds them to the same standards as anyone else.',
        roles: [
            { tag: '01', title: 'Aggregate demand',  body: 'Operators bundle providers and extenders into networks that customers can buy from with predictable performance.' },
            { tag: '02', title: 'Underwrite quality',body: 'Operators stake their status on the bandwidth they sell. Bad service is reflected in the ledger and the discount curve.' },
            { tag: '03', title: 'Settle on-protocol',body: 'All settlement happens through $UR. Operators are accountable to the same rules as everyone else on the network.' }
        ]
    }
};
