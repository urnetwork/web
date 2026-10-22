/**
 * The SN25 mainnet launch timeline (/mainnet): the box at its top that tells
 * miners what to do, and the payout epochs the page groups its milestones by.
 * The milestones themselves, and the explorers their
 * sources link to, are data/mainnet-timeline.json; edit that file when a
 * milestone happens, moves, or gains a transaction. A milestone's status is
 * done, in_progress, scheduled (set for a fixed time, shown at that time) or
 * planned (a plan, its time shown as approximate, ≈). A key milestone
 * (`key: true`) is also marked on the summary timeline under the page's title
 * (components/pages/mainnet/summary.js), which draws these epochs as its bands.
 *
 * These are UR settlement epochs, not the chain's 72-minute tempo: epoch 0 was
 * a 7,200-block bootstrap, and each later epoch is 50,400 blocks (7 days at 12
 * seconds a block). Each boundary is the coordinator's epochStartBlock /
 * epochEndBlock, as recorded in the sn repo (mainnet/LAUNCH.md); its time is
 * that block's timestamp once the block exists, and until then a projection
 * from the block number (`projected`), which the page marks with ≈.
 * `settlement` is what pays the epoch: 'v1' (version 1) or 'v2' (settlement
 * v2, from epoch 3).
 *
 * Plain data with no imports: the page, the SPA and the node test
 * (tests/mainnet-timeline.test.mjs) all read it.
 */

export const mainnetEpochs = [
    {
        number: 0,
        settlement: 'v1',
        summary: 'Bootstrap, no payout root',
        start: { block: 9240028, time: '2026-10-08T18:08:12Z' },
        end: { block: 9247228, time: '2026-10-09T18:09:00Z' },
    },
    {
        number: 1,
        settlement: 'v1',
        summary: 'The first payout epoch',
        start: { block: 9247228, time: '2026-10-09T18:09:00Z' },
        end: { block: 9297628, time: '2026-10-16T18:09:00Z', projected: true },
    },
    {
        number: 2,
        settlement: 'v1',
        summary: 'The last version 1 epoch',
        start: { block: 9297628, time: '2026-10-16T18:09:00Z', projected: true },
        end: { block: 9348028, time: '2026-10-23T18:09:00Z', projected: true },
    },
    {
        number: 3,
        settlement: 'v2',
        summary: 'The first settlement v2 epoch',
        start: { block: 9348028, time: '2026-10-23T18:09:00Z', projected: true },
        end: { block: 9398428, time: '2026-10-30T18:09:00Z', projected: true },
    },
];

// the milestones before the first epoch listed above, and after the last
// (the page names that group after the last epoch's number)
export const mainnetBeforeEpochs = { title: 'Before launch' };
export const mainnetAfterEpochs = { summary: 'The first settlement v2 cycle' };

export const SECONDS_PER_BLOCK = 12;

// The box at the top of the page: what miners need to do now. Its dates are
// the milestones' (tests/mainnet-timeline.test.mjs holds them together): the
// modern provider gate at 00:00 UTC on October 21, epoch 2 from October 16 to
// 23, and epoch 3, where settlement v2 starts, at about 18:09 UTC on October
// 23. A link goes only to a page the site has: the miner guide's install and
// wallet sections, and the operators' apps on /operators.
export const mainnetActions = {
    headline: 'Mainnet is live!',
    title: 'What miners need to do',
    steps: [
        {
            title: 'Install the new miner before October 21, 2026.',
            detail: 'From 00:00 UTC on October 21, the old miner will be deprioritized.',
            link: { label: 'Miner guide: Install', href: '/docs/miner#1-install' },
        },
        {
            title: 'Register your Bittensor wallet in the new miner.',
            detail: 'Your rewards are associated with the wallet you register.',
            link: { label: 'Miner guide: Run setup', href: '/docs/miner#2-run-setup' },
        },
        {
            title: 'Until settlement v2 starts, at most 1,500 miners are paid each epoch.',
            detail: 'Epoch 2 (October 16 to 23) is a ramp-up week. Full payments start with epoch 3, about October 23, 18:09 UTC.',
        },
    ],
    // the closing paragraph, in runs; a run with an href is a link
    closing: [
        { text: 'After epoch 3, the subnet is set up to run itself and scale to millions of miners. New miners can participate in Bittensor from ' },
        { text: 'the apps', href: '/operators' },
        { text: ' with zero Bittensor experience.' },
    ],
};
