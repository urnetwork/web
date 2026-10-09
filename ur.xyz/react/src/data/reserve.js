/**
 * The Network Capacity Reserve (/reserve): the on-chain account the page
 * reads, the launch policy it explains, and the editorial content around the
 * live figures. Like data/investors.js, this is the file to edit when the
 * reserve's facts change (a signer, an approved program, a published ceiling);
 * the page itself only renders what is here and what the chain says.
 *
 * The reserve is not a fixed share of the miner emissions. Momentum is the
 * share used now to power the network, as rewards to providers; the reserve
 * receives the rest:
 *
 *     reserve = miner emissions × (1 − momentum)
 *
 * Sources: the launch policy and the reserve's custody are documented in the
 * sn repo (mainnet/TREASURY-EMISSIONS.md, mainnet/TREASURY-RECEIVE-SETUP.md,
 * mainnet/LAUNCH.md) and the miner guide (/docs/miner): at launch, 10% of the
 * native miner allocation for providers and the rest received by `ur-reserve`.
 * `ur-reserve` is itself a native 2-of-3 multisig over the three signer keys
 * below (tests/reserve-multisig.test.mjs derives the account from them); it
 * signs only to register its own recipients, and the same multisig signs any
 * program payment.
 */

export const reserve = {
    name: 'Network Capacity Reserve',
    tagline: 'Reserve for ongoing capacity optimisations.',
    netuid: 25,
    // the reserve account, SS58 (prefix 42) and its raw AccountId32: the
    // 2-of-3 multisig of the signers in `custody`
    address: '5CcHGEqKK3RXeEA2sVycHQAQGrqsyhWaYu9FjGtDVN6nwMwR',
    accountId: '0x1815103f41a8d1e24c55d380c6f843fb36d715b4322a4e4f02bff36dfe74a410',
    // the day the launch policy starts routing emission to the reserve (its
    // recipients were registered earlier, so the chain decides when history
    // starts), and how far the projection runs: a year from launch
    launch: '2026-10-12',
    projectThrough: '2027-10-12',
    // momentum at launch, in basis points of the native miner allocation: the
    // share paid to providers. The reserve receives the rest, (1 − momentum).
    // The page follows the chain's momentum once the chain shows one.
    launchMomentumBps: 1000,

    explorerUrl: 'https://taostats.io/account/5CcHGEqKK3RXeEA2sVycHQAQGrqsyhWaYu9FjGtDVN6nwMwR',
    policyUrl: 'https://github.com/urfoundation/sn/blob/main/mainnet/TREASURY-EMISSIONS.md',
    minerGuideUrl: '/docs/miner',
    contactUrl: 'https://t.me/ursn25',

    custody: {
        mode: '2-of-3 multisig',
        modeNote: 'The reserve account is a native 2-of-3 multisig. It signs only to register its own recipients, paying their SN25 registration burns from its own balance.',
        threshold: '2 of 3',
        thresholdNote: 'Program payments are signed by the same multisig: any 2 of the 3 signers.',
        // the spending multisig is the reserve account itself
        multisig: '5CcHGEqKK3RXeEA2sVycHQAQGrqsyhWaYu9FjGtDVN6nwMwR',
        multisigThreshold: 2,
        // The signer keys, as the sn repo publishes them. Identities, names
        // and device paths are not published; only the addresses are.
        signers: [
            { label: 'Signer 1', address: '5FYohgZfJQqHgPDQzF8SZ2jxn8dveW5JEXoTYugjrTuHDKGW' },
            { label: 'Signer 2', address: '5GeoGiGEvUEQqTfTaUsvXqMQD4zVMNeYtYqMN8JLaMfiDp4J' },
            { label: 'Signer 3', address: '5DFCNQmzRedo6hbZci4PTFMRuQJQ5PX6f6WrJBxDCDU3yBzS' },
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

    // 03 / Current programs. A program's `status` is what the page may say
    // about it: 'preparing' (being prepared with partners), 'indicative'
    // (an expected program whose terms are not yet published), 'active'
    // (terms published and accepted; it carries its ceiling, and its payments
    // as they are made: α and the transaction) or 'complete'. Only an active
    // or complete program has figures; the table shows sizes and payments
    // only when one does.
    programStatus: {
        preparing: 'In preparation',
        indicative: 'Indicative',
        active: 'Active',
        complete: 'Complete',
    },
    programs: [
        {
            id: 'regional-pre-install',
            title: 'Regional Pre-Install',
            summary: "Partners who will increase the network's presence in certain regions.",
            type: 'Network coverage',
            payRule: null, // terms to be published
            status: 'preparing',
            ceilingAlpha: null,
            payments: [],
        },
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

/** The programs with a published ceiling: the ones the use bars and the committed total describe. */
export const publishedPrograms = reserve.programs.filter((p) => p.ceilingAlpha != null);

/** The programs that are running or finished: the only ones the page may call active. */
export const activePrograms = reserve.programs.filter((p) => p.status === 'active' || p.status === 'complete');
