// English — canonical source for the site copy. Other language files
// mirror this structure key-for-key; if you add a key here, add it
// everywhere else too.
export default {
    nav: {
        whitepaper: 'Whitepaper',
        research:   'Research',
        providers:  'Providers',
        extenders:  'Extenders',
        exchanges:  'Exchanges',
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
                title:   'The Protocol',
                body: [
                    'The $UR protocol coordinates a global market for bandwidth between people, providers, and the networks that connect them.',
                    'Settlement is denominated in $UR. Each block records the fees collected, the volume served, and the share returned to participants.'
                ]
            },
            {
                numeral: 'II.',
                title:   'The Token',
                body: [
                    '$UR has a fixed supply at genesis. A portion of every block is absorbed by the protocol, reducing supply over time as the network grows.',
                    'Tokens distributed to participants represent a claim on future bandwidth and the standing they hold in the network.'
                ]
            },
            {
                numeral: 'III.',
                title:   'The Network',
                body: [
                    'The network is composed of independent providers, extenders, and operators. None of them, individually, holds custody of user traffic or identity.',
                    'Coordination is permissionless. Participation is open. Status is earned by service rendered, not by capital staked.'
                ]
            },
            {
                numeral: 'IV.',
                title:   'The Discount',
                body: [
                    'Holders of $UR receive a discount on data purchased through the network. The discount scales with status held over time.',
                    'This binds the value of the token to its use, and the use of the network to the people who depend on it.'
                ]
            }
        ]
    },

    research: {
        eyebrow: 'Research',
        title:   'Open work, in the open.',
        intro:   'Research underwriting the protocol is published as it is written. Each paper is a working draft of a piece of the network.',
        papers: [
            { tag: 'R-001', title: 'Bandwidth as a settlement layer',           body: 'A model for pricing data movement as a unit of account on a permissionless network.' },
            { tag: 'R-002', title: 'Status without stake',                      body: 'How participation history can substitute for capital lockup in coordinating an open marketplace.' },
            { tag: 'R-003', title: 'Sybil resistance via traffic attestation',  body: 'Identifying genuine providers from observable behavior across millions of independent flows.' },
            { tag: 'R-004', title: 'A deflationary curve for the open network', body: 'Designing token absorption to track real network growth instead of speculative cycles.' }
        ]
    },

    providers: {
        eyebrow: 'Providers',
        title:   'The people who serve the network.',
        intro:   'Providers are the basis of the network. They contribute the bandwidth that everyone else depends on, and they are rewarded directly by the protocol for doing so.',
        roles: [
            { tag: '01', title: 'Serve traffic',    body: 'Run a provider on hardware you already own. Earn $UR for the bandwidth you contribute to the network.' },
            { tag: '02', title: 'Stay independent', body: 'No custody, no contract, no centralized clearing. Providers operate at arm’s length from any single party.' },
            { tag: '03', title: 'Earn a share',     body: 'Every block returns a share of fees to active providers. Status grows with consistent service.' }
        ]
    },

    extenders: {
        eyebrow: 'Extenders',
        title:   'The people who carry the network further.',
        intro:   'Extenders make the network reach places providers alone cannot. They are the second tier of the open network, and they keep the protocol resilient against isolation.',
        roles: [
            { tag: '01', title: 'Reach further',     body: 'Extenders relay traffic into networks providers cannot reach on their own — across borders, around blocks, into the open.' },
            { tag: '02', title: 'Carry no payload',  body: 'Extenders see flows, never content. The protocol is designed so the relay layer cannot become a surveillance layer.' },
            { tag: '03', title: 'Earn for distance', body: 'Compensation tracks the difficulty of the path served, not just the volume — the harder the route, the larger the share.' }
        ]
    },

    exchanges: {
        eyebrow: 'Exchanges',
        title:   'Where the network meets the market.',
        intro:   '$UR is freely tradable. Exchanges connect the open network to the wider economy without becoming the network themselves.',
        roles: [
            { tag: '01', title: 'On / off ramps',    body: 'Exchanges convert local currency to $UR and back. They are the gateway for everyone who is not yet on the protocol.' },
            { tag: '02', title: 'Settlement venue',  body: 'Block-by-block settlement is recorded on the protocol. Exchanges read it directly — no privileged feeds, no opaque clearing.' },
            { tag: '03', title: 'Open listings',     body: 'Listing the token is permissionless. Any exchange can integrate; the protocol does not pick winners.' }
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
