// The investor deck. Slides and the PDF are both produced from the Google
// Slides export by `make deck-slides`: images land in astro/public/investors/
// deck/ numbered 01..slideCount, and the PDF is the download for people who
// want the file to keep or forward. slideCount must match what that script
// prints, or the viewer will ask for a slide that is not there.
//
// One object, referenced from three places on the page, so the slide count and
// the date cannot drift apart between the featured card and the viewer.
const deck = {
    kind: 'Deck',
    title: 'Introduction to UR (SN25)',
    summary:
        'How UR works, what is live today, the projects in research, and the opportunity for network operators to build on the subnet to compound demand.',
    date: '21 August 2026',
    dateIso: '2026-08-21',
    readTime: '11 slides',
    cta: 'View the deck',
    href: '/investors/deck',
    pdfHref: '/investors/ur-investor-deck.pdf',
    slideBase: '/investors/deck',
    slideExt: 'webp',
    slideCount: 11,
};

const letter = {
    kind: 'Letter',
    title: 'Our Letter to Bittensor',
    summary:
        'A letter from Jack and Brien on launching UR (SN25), growing a global network of residential operators, and building a free and open internet together.',
    date: '18 August 2026',
    dateIso: '2026-08-18',
    readTime: '6 min read',
    cta: 'Read the letter',
    href: '/investors/our-letter-to-bittensor',
    // Reprinted from the letter page itself by `make letter-pdf`.
    pdfHref: '/investors/our-letter-to-bittensor.pdf',
};

export const investorCentre = {
    updated: '21 August 2026',
    updatedIso: '2026-08-21',
    about: [
        'Our mission is to make privacy the default for every user by providing the encryption layer for the open internet. We are building a user-powered network and a privacy product suite designed to serve people, not surveil them.',
        'Anyone, anywhere should be able to access the internet freely.',
    ],
    // `featured` is whichever document leads the Investor Centre and will
    // change again. Anything that means one specific document must name it:
    // a page that reads `featured` gets retitled and re-pointed the next time
    // the card changes, which is how the letter page briefly offered the deck
    // PDF as its own download.
    featured: deck,
    deck,
    letter,

    updates: [
        {
            title: letter.title,
            date: letter.date,
            format: 'Written',
            readTime: letter.readTime,
            href: letter.href,
            pdfHref: letter.pdfHref,
            external: false,
        },
    ],
    materials: [
        {
            title: deck.title,
            detail: null,
            readTime: deck.readTime,
            href: deck.href,
            pdfHref: deck.pdfHref,
        },
        {
            title: 'UR Litepaper',
            detail: null,
            readTime: '12 min read',
            href: '/docs/litepaper',
        },
    ],
    metrics: [
        {
            label: 'Total conviction',
            value: '1.42',
            suffix: 'M α',
            usd: '$3.12M',
            context: 'Owner key conviction: 640K α ($1.41M)',
            change: '+11.7% over 30 days',
            decimals: 2,
        },
        {
            label: 'Network traffic',
            value: '39.6',
            suffix: 'TB',
            usd: null,
            context: 'Last 30 days',
            change: '+12.4% from prior period',
            decimals: 1,
        },
        {
            label: 'Monthly active users',
            value: '354218',
            suffix: '',
            usd: null,
            context: 'Last 30 days',
            change: '+6.8% from prior period',
            decimals: 0,
        },
    ],
};

export const investorResearchPrompt = `Produce an investor-grade diligence brief on UR using the most current information available.

Begin with UR's published sources:

- Machine-readable protocol source: https://ur.xyz/llms-full.txt
- Investor Centre: https://ur.xyz/investors
- Latest investment letter: https://ur.xyz/investors/our-letter-to-bittensor

Treat these as the project's own published claims, then verify material claims against primary or independently observable sources:

- Subnet code: https://github.com/urfoundation/sn
- Network software and applications: https://github.com/urnetwork
- On-chain explorers: https://taostats.io and https://taomarketcap.com

Assess:

1. What UR is, the problem it addresses and why its architecture matters.
2. How ur.io and related products create demand for the subnet.
3. The alpha economics, including emissions, issuance or supply constraints, conviction deposits, reserve mechanics, settlement cadence and the composition of conviction.
4. What is live and independently observable, what UR reports as live, what remains planned, and what cannot currently be verified.
5. The strongest evidence supporting the investment case, material technical and economic risks, dependencies, concentration risks and unresolved questions.

Use α and τ correctly. Timestamp every USD conversion and identify the price source.

Clearly distinguish verified facts, project-reported claims and your own inferences. Cite the exact source and publication date for every material claim. If sources conflict, explain the conflict and prioritize the newest primary evidence. Do not infer that something is live merely because it appears in code, a litepaper or a roadmap.

Structure the response as:

- Executive summary
- Product and network architecture
- Demand and economic model
- Current launch state
- Evidence table
- Material risks
- Questions investors still need answered

Do not provide a price prediction or buy/sell recommendation.`;

export const externalResources = {
    dashboard: 'https://grafana.bringyour.com/stats',
    taoMarketCap: 'https://taomarketcap.com/subnets/25',
    taostats: 'https://taostats.io/subnets/25',
    chatgpt: `https://chatgpt.com/?q=${encodeURIComponent(investorResearchPrompt)}`,
    claude: `https://claude.ai/new?q=${encodeURIComponent(investorResearchPrompt)}`,
};
