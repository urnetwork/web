export const investorCentre = {
    updated: '13 August 2026',
    updatedIso: '2026-08-13',
    about:
        'Our mission is to make privacy the default for every user by providing the encryption layer for the open internet. We are building a user-powered network and a privacy product suite designed to serve people, not surveil them. Anyone, anywhere should be able to access the internet freely.',
    featured: {
        date: '13 August 2026',
        dateIso: '2026-08-13',
        kind: 'Letter',
        readTime: '4 min read',
        title: 'August Investment Letter',
        summary:
            'Why UR built product demand before the subnet, how usage becomes conviction, and what we will report from here.',
        href: '/investors/august-investment-letter',
    },
    updates: [
        {
            title: 'August Livestream',
            date: '28 August 2026',
            format: 'Video',
            href: 'https://www.youtube.com/',
            external: true,
        },
        {
            title: 'August Investment Letter',
            date: '13 August 2026',
            format: 'Written',
            href: '/investors/august-investment-letter',
            external: false,
        },
    ],
    materials: [
        {
            title: 'Investor Deck',
            detail: 'Coming soon',
            readTime: null,
            href: null,
        },
        {
            title: 'UR Subnet Whitepaper',
            detail: null,
            readTime: '12 min read',
            href: '/whitepaper.md',
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
- Latest investment letter: https://ur.xyz/investors/august-investment-letter

Treat these as the project's own published claims, then verify material claims against primary or independently observable sources:

- Subnet code and whitepaper: https://github.com/urfoundation/sn
- Network software and applications: https://github.com/urnetwork
- On-chain explorers: https://taostats.io and https://taomarketcap.com

Assess:

1. What UR is, the problem it addresses and why its architecture matters.
2. How ur.io and related products create demand for the subnet.
3. The alpha economics, including emissions, issuance or supply constraints, conviction deposits, reserve mechanics, settlement cadence and the composition of conviction.
4. What is live and independently observable, what UR reports as live, what remains planned, and what cannot currently be verified.
5. The strongest evidence supporting the investment case, material technical and economic risks, dependencies, concentration risks and unresolved questions.

Use α and τ correctly. Timestamp every USD conversion and identify the price source.

Clearly distinguish verified facts, project-reported claims and your own inferences. Cite the exact source and publication date for every material claim. If sources conflict, explain the conflict and prioritize the newest primary evidence. Do not infer that something is live merely because it appears in code, a whitepaper or a roadmap.

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
    taoMarketCap: 'https://taomarketcap.com/',
    taostats: 'https://taostats.io/subnets',
    chatgpt: `https://chatgpt.com/?q=${encodeURIComponent(investorResearchPrompt)}`,
    claude: `https://claude.ai/new?q=${encodeURIComponent(investorResearchPrompt)}`,
};
