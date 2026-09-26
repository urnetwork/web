// The Investor Centre's data: the documents it lists, the card it leads with,
// the research prompt and the external links. One module for both renders:
// the SPA's components (components/pages/investors/*) and the Astro build,
// whose thin pages read it for their <head> and whose astro.config.mjs reads
// it for the sitemap's per-document lastmod.

// The investor deck. Slides and the PDF are both produced from the Google
// Slides export by `make deck-slides`: images land in react/public/investors/
// deck/ numbered 01..slideCount (mirrored into astro/public by `make
// sync-public` at build time), and the PDF is the download for people who
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
    // NN.webp is slideWidth wide, NN-<slideSmallWidth>.webp the smaller srcset
    // candidate; both come from `make deck-slides`
    slideWidth: 2560,
    slideHeight: 1440,
    slideSmallWidth: 1280,
    // What each slide says, transcribed from the deck: the label it prints top
    // left (`title`), its headline, the alt text of its image and a summary for
    // the page's outline, which is the deck's text for readers who do not see
    // the images and for search. Update these with the slides.
    slides: [
        {
            title: 'Introduction to SN25',
            headline: 'Introduction to SN25',
            alt: 'Cover slide: the UR wordmark over a surreal painting of a room opening onto a city under a vast sky, titled Introduction to SN25, August 2026.',
            summary: 'An introduction to UR, Bittensor subnet 25, dated August 2026.',
        },
        {
            title: 'Current State',
            headline: 'UR enters Bittensor with a P2P privacy network that already exists today with mass distribution',
            alt: 'Current State: 350K+ monthly active users, 100K+ network providers, 100+ countries and $0 customer acquisition cost.',
            summary: 'The network already has demand (350K+ monthly active users), supply (100K+ network providers), coverage (100+ countries) and distribution ($0 CAC): live consumer apps on iOS, Android, macOS and the browser, with Windows and Linux coming soon. It pays contributors for bandwidth, and the subnet turns routing capacity into a market scored by reliability, geography, uptime and real traffic served.',
        },
        {
            title: 'The Mission',
            headline: 'Big Internet centralises the path; open networks distribute it',
            alt: 'The Mission: a table comparing Big Internet with the UR internet on supply, control, failure surface and economics.',
            summary: 'Big Internet runs on finite data-centre fleets, one company controls the path, known infrastructure can be enumerated or blocked, and the margin accrues to the platform. The UR internet draws residential capacity from independent operators, distributes routes across a broader supply base, has no single fixed fleet that defines the target, and measures and rewards useful reachability.',
        },
        {
            title: 'Product & Research Pipeline',
            headline: 'P2P encryption network is unlocking new research paths',
            alt: 'Product and research pipeline: ur.io live with 350K+ monthly actives, and Projects Bastion, Stargate and Meridian in research, all on the UR subnet.',
            summary: 'ur.io is the live product: 350K+ monthly actives whose usage creates network demand. Three research programmes build on the same subnet: Project Bastion (how do we unlock enterprise network connectivity?), Project Stargate (can one open index support model training and live retrieval?) and Project Meridian (how do we create dedicated identity for agents?). The subnet is the shared provider and validation layer, 100K+ residential providers in 100+ countries, and supports them all through quality scoring and an incentive market.',
        },
        {
            title: 'Subnet Design',
            headline: 'Validators measure performance before emissions reach miner UIDs',
            alt: 'Subnet design: users, a network operator such as ur.io paying in SN25, validators testing miners, top miners with their own UIDs, long-tail miners in pools, and chain emissions.',
            summary: 'Users use the app and the network operator (ur.io, for example) pays in SN25. Validators test uptime, transfer and proof-of-transit before emissions reach miner UIDs: about 200 top miners own UIDs, and about 100K long-tail miners, the residential IP providers, take part through pools. Chain emissions, in alpha net of burn, pay the miner UIDs.',
        },
        {
            title: 'Demand expansion',
            headline: 'UR will create an ecosystem of network operators',
            alt: 'Demand expansion: ur.io live today, three research projects and open areas of interest, all settling through UR (SN25).',
            summary: 'Live today: ur.io, a consumer VPN with 350K+ MAU. In the research pipeline: Project Bastion (enterprise access), Project Stargate (an open web index) and Project Meridian (a corporate mesh). Areas of interest: a competing VPN, an agent-infrastructure startup, a data business, or something not yet imagined. UR (SN25) is one settlement layer, billed on MAU × GB/day and paid in alpha: operators acquire SN25 to use the network, miners are paid SN25 on real usage, and a denser network attracts the next operator.',
        },
        {
            title: 'Value Accrual',
            headline: 'The same UR miner fleet can scale network operators asymmetrically',
            alt: 'Value accrual: one, three and N network operators on the same 100K-node miner fleet, with SN25 bought scaling from 1× to 3× to N×.',
            summary: 'One operator (ur.io today), three (with Projects Meridian and Stargate) or N (with third parties and new companies) all run on an identical 100K-node miner fleet, so SN25 bought scales 1× → 3× → N×. The more users and data network operators drive, the more valuable the network, and the same fleet monetises idle supply.',
        },
        {
            title: 'Request for Operators',
            headline: 'Multiple businesses ready to be built on UR',
            alt: 'Request for Operators: six example businesses plotted by users served against data moved per customer, each with a Web2 comparable.',
            summary: 'Six example starting briefs, placed by users served and data moved per customer, each with a Web2 comparable: a white-label VPN (Mozilla VPN, 2M subscribers), encrypted business mail (Proton, $134M revenue), the agent access layer (Browserbase, $300M valuation), AI answer visibility (Profound, $1B valuation), ad verification (DoubleVerify, ~$1.7B public) and private LLM search (DuckDuckGo, $200M revenue). The network fee is MAU × price per user plus GB × price per GB.',
        },
        {
            title: 'Our Goal',
            headline: 'Bittensor can scale UR from regional depth to global density, targeting 1B+ users',
            alt: 'Our Goal: from deep coverage in the US and Southeast Asia, capped near 1M monthly actives, to that depth everywhere and an addressable population near 1B.',
            summary: 'Open competition creates an incentive to deepen the provider supply market. Before: real density in the US and Southeast Asia, funded entirely by UR, with a practical ceiling of about 1M monthly actives before capacity per country runs out. After: that depth in every market, the subnet paying for coverage so density compounds market by market, and an addressable population of about 1B once density is no longer the binding constraint.',
        },
        {
            title: 'Why Bittensor',
            headline: 'Bandwidth is Bittensor’s next major commodity',
            alt: 'Why Bittensor: compute (Lium, SN51), storage (Hippius, SN75) and inference (Engy, SN53) are live markets; bandwidth (UR Subnet, SN25) is next.',
            summary: 'Bittensor already runs commodity markets for compute (Lium, SN51), storage (Hippius, SN75) and inference (Engy, SN53, verified frontier open models). Bandwidth is the supply gap, and the UR Subnet (SN25), a peer-to-peer encryption network, is next.',
        },
        {
            title: 'Web2 Comparables',
            headline: 'Enterprise and consumer privacy are multi-billion dollar markets',
            alt: 'Web2 Comparables: Proton VPN, NordVPN and DuckDuckGo in consumer privacy; Zscaler, Cloudflare and Tailscale in enterprise privacy.',
            summary: 'Consumer privacy: Proton VPN ($134M revenue), NordVPN ($3B valuation) and DuckDuckGo ($200M revenue), which grew from encrypted email, VPN-led distribution and private search. Enterprise privacy: Zscaler ($3.36B ARR, 25% YoY growth), Cloudflare ($2.81B revenue, 30% YoY growth) and Tailscale ($1.5B valuation), which replaced perimeter VPNs with zero trust, extended network infrastructure into private access, and turned developer-led mesh networking into enterprise demand.',
        },
    ],
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

const convictionAnnouncement = {
    kind: 'Announcement',
    title: 'UR team locks 550,000 alpha in perpetuity',
    summary:
        'Approximately US$1.44 million locked in perpetual conviction, taking total locked alpha behind SN25 to 27.1 per cent of circulating supply.',
    // One headline for the announcement page's <title>, its <h1> and its
    // structured data, so the three cannot drift apart. The Investor Centre
    // card carries its own shorter phrasing (`title` above) — the wording
    // difference is editorial and is left alone.
    headline: 'UR team locks 550,000 alpha in perpetual conviction',
    description:
        "UR's management team has locked 550,000 alpha under perpetual conviction, taking total locked alpha behind SN25 to 27.1 per cent of circulating supply.",
    date: '9 September 2026',
    dateIso: '2026-09-09',
    readTime: '3 min read',
    cta: 'Read the announcement',
    href: '/investors/conviction-lock',
    pdfHref: '/investors/ur-conviction-lock-announcement.pdf',
};

// The September 2026 letter to tokenholders, signed by Brien and Jack. The
// PDF is the letter as sent; the page reproduces it.
const tokenholderLetter = {
    kind: 'Announcement',
    title: 'September Letter to Tokenholders',
    summary:
        'Brien and Jack outline UR\'s mainnet launch, the next phase of SN25, Project Meridien, and the mission to make privacy an expected property of the internet.',
    date: '25 September 2026',
    dateIso: '2026-09-25',
    readTime: '6 min read',
    cta: 'Read the update',
    href: '/investors/letter-to-tokenholders-september-2026',
    pdfHref: '/investors/ur-letter-to-tokenholders-september-2026.pdf',
};

export const investorCentre = {
    updated: '25 September 2026',
    updatedIso: '2026-09-25',
    about: [
        'Our mission is to make privacy the default for every user by providing the encryption layer for the open internet. We are building a user-powered network and a privacy product suite designed to serve people, not surveil them.',
        'Anyone, anywhere should be able to access the internet freely and privately.',
    ],
    // `featured` is whichever document leads the Investor Centre and will
    // change again. Anything that means one specific document must name it:
    // a page that reads `featured` gets retitled and re-pointed the next time
    // the card changes, which is how the letter page briefly offered the deck
    // PDF as its own download.
    featured: tokenholderLetter,
    deck,
    letter,
    convictionAnnouncement,
    tokenholderLetter,

    updates: [
        {
            title: tokenholderLetter.title,
            date: tokenholderLetter.date,
            dateIso: tokenholderLetter.dateIso,
            kind: tokenholderLetter.kind,
            format: 'Written',
            readTime: tokenholderLetter.readTime,
            href: tokenholderLetter.href,
            pdfHref: tokenholderLetter.pdfHref,
            external: false,
        },
        {
            title: convictionAnnouncement.title,
            date: convictionAnnouncement.date,
            dateIso: convictionAnnouncement.dateIso,
            kind: convictionAnnouncement.kind,
            format: 'Written',
            readTime: convictionAnnouncement.readTime,
            href: convictionAnnouncement.href,
            pdfHref: convictionAnnouncement.pdfHref,
            external: false,
        },
        {
            title: letter.title,
            date: letter.date,
            dateIso: letter.dateIso,
            kind: letter.kind,
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
            date: '18 August 2026',
            dateIso: '2026-08-18',
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
- Latest investment letter: https://ur.xyz/investors/letter-to-tokenholders-september-2026

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
