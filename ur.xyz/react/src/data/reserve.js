/**
 * The Network Capacity Reserve (/reserve): the on-chain account the page
 * reads, the launch policy it explains, and the editorial content around the
 * live figures. Like data/investors.js, this is the file to edit when the
 * reserve's facts change (a published multisig, an approved
 * program); the page itself only renders what is here and what the chain says.
 *
 * The reserve is not a fixed share of the miner emissions. Momentum is the
 * share used now to power the network, as rewards to providers; the reserve
 * receives the rest:
 *
 *     reserve = miner emissions × (1 − momentum)
 *
 * Sources: the launch policy and the receive-only destination are documented
 * in the sn repo (mainnet/TREASURY-EMISSIONS.md, validator/TREASURY-PRODUCTION.md)
 * and the miner guide (/docs/miner): at launch, 10% of the native miner
 * allocation for providers and the rest received by `ur-reserve`, which only
 * receives funds and never sends. The 2-of-3 multisig is the optional sending
 * custody for later.
 */

export const reserve = {
    name: 'Network Capacity Reserve',
    netuid: 25,
    // the receive-only destination, SS58 (prefix 42) and its raw AccountId32
    address: '5CcHGEqKK3RXeEA2sVycHQAQGrqsyhWaYu9FjGtDVN6nwMwR',
    accountId: '0x1815103f41a8d1e24c55d380c6f843fb36d715b4322a4e4f02bff36dfe74a410',
    // the day the launch policy starts routing emission to the reserve, and
    // how far the pre-launch projection runs
    launch: '2026-10-12',
    projectThrough: '2026-12-31',
    // momentum at launch, in basis points of the native miner allocation: the
    // share paid to providers. The reserve receives the rest, (1 − momentum).
    // Once the reserve is live the page reads momentum from the chain instead.
    launchMomentumBps: 1000,

    explorerUrl: 'https://taostats.io/account/5CcHGEqKK3RXeEA2sVycHQAQGrqsyhWaYu9FjGtDVN6nwMwR',
    policyUrl: 'https://github.com/urfoundation/sn/blob/main/mainnet/TREASURY-EMISSIONS.md',
    minerGuideUrl: '/docs/miner',
    contactUrl: 'https://t.me/ursn25',

    custody: {
        mode: 'Receive-only',
        modeNote: 'The account receives native emission and makes no outgoing transfers.',
        threshold: '2 of 3',
        thresholdNote: 'Multisig for spending, to be published',
        multisig: null, // the published spending multisig address, when there is one
        // Signer identities are redacted in the public custody section.
        signers: [
            { label: 'Signer 1' },
            { label: 'Signer 2' },
            { label: 'Signer 3' },
        ],
    },

    // 02 / Program types
    programTypes: [
        {
            tag: 'Type 01',
            title: 'Network coverage',
            summary: "Adds capacity where an operator's demand outruns supply: more exit locations and routes in the places customers need them.",
            verifiedBy: 'Independent verifiers from multiple vantage points, with overlap and routing checks',
            paidAs: 'Weekly, per verified unit of coverage',
        },
        {
            tag: 'Type 02',
            title: 'Route reliability',
            summary: 'Raises success rates and lowers latency on routes operators already use, so customers see fewer failed sessions.',
            verifiedBy: 'Randomized probes against agreed availability and latency thresholds',
            paidAs: 'Bonuses to providers who meet the thresholds over the service window',
        },
        {
            tag: 'Type 03',
            title: 'Operator onboarding',
            summary: 'Funds provider capacity for a new Network Operator, so a second product can launch on shared supply.',
            verifiedBy: 'Independent sign-off on working routes and sustained availability',
            paidAs: 'Milestones to service providers, never a registration grant to the operator',
        },
    ],

    // 03 / First programs: what is being prepared. `status` is 'indicative'
    // until a program's terms are published; a published program carries its
    // ceiling, and a paid one its payments (α and the transaction), which the
    // page then shows against the ceiling.
    firstPrograms: [
        {
            id: 'coverage-1',
            title: 'Additional exit coverage for an existing operator',
            summary: 'New qualifying exit locations maintained over a fixed service window.',
            type: 'Network coverage',
            payRule: 'paid per verified exit-day',
            status: 'indicative',
            ceilingAlpha: null,
            payments: [],
        },
        {
            id: 'reliability-1',
            title: 'Reliability on existing operator routes',
            summary: 'Higher route success across a fixed cohort of comparable probes.',
            type: 'Route reliability',
            payRule: 'threshold bonuses',
            status: 'indicative',
            ceilingAlpha: null,
            payments: [],
        },
        {
            id: 'onboarding-1',
            title: 'Provider capacity for a second operator',
            summary: 'Working, verified provider connections for an operator new to the network.',
            type: 'Operator onboarding',
            payRule: 'milestone payments',
            status: 'indicative',
            ceilingAlpha: null,
            payments: [],
        },
    ],

    // 04 / How a program goes live
    steps: [
        { title: 'Terms published', detail: 'Gap, eligibility, payment rule, verifier.' },
        { title: 'Providers accept', detail: 'Budget is reserved only after acceptance.' },
        { title: 'Weekly measurement', detail: 'Verifiers sign observations.' },
        { title: 'Public manifest', detail: 'Recipients, amounts and evidence.' },
        { title: '48-hour review', detail: 'Published for review before signing.' },
        { title: '2 of 3 signatures', detail: 'Checked against the encoded transaction.' },
    ],
};

/** The programs with a published ceiling: the ones the use bars and the spent total describe. */
export const publishedPrograms = reserve.firstPrograms.filter((p) => p.ceilingAlpha != null);
