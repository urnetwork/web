// buildContent.js — content for the "Build on UR" page (components/pages/Build.jsx).
//
// The two objects the standalone astro/public/build.html loaded as
// window.UR_BUILD_ARCH (ur-build-architecture-content.js) and window.UR_BUILD_V12
// (ur-build-option-12-content.js), unchanged apart from becoming named exports.
//
// BUILD_ARCH: the architecture components and the six example opportunities that
// drive the 3D model, the readout, the structured brief and the editorial brief.
// BUILD_V12: the version-12 (the live "native ur.xyz shell" edition) copy for the
// readout and the editorial brief, indexed like BUILD_ARCH.opportunities.

export const BUILD_ARCH = {
  components: [
    {
      key: 'product',
      n: '01',
      verb: 'CHANGES',
      name: 'Product + demand',
      short: 'The customer-facing business changes with every opportunity.',
      detail: 'The operator brings the audience, product experience and reason for traffic to exist. The selected opportunity changes this part of the model.'
    },
    {
      key: 'operator',
      n: '02',
      verb: 'OWNS',
      name: 'Network Operator',
      short: 'Owns the product, users, brand, billing, policy and support.',
      detail: 'The operator runs the product-facing servers and verification endpoint, turns customer demand into network demand and decides how the service behaves.'
    },
    {
      key: 'subnet',
      n: '03',
      verb: 'ACCESSES',
      name: 'UR Subnet (SN25) foundation',
      short: 'Coordinates access, reserve and settlement for every operator.',
      detail: 'The subnet is the shared foundation. Operators acquire and deposit UR against real usage; deposits enter the reserve as a demand signal and are not recycled into miner payouts.'
    },
    {
      key: 'validators',
      n: '04',
      verb: 'MEASURES',
      name: 'Independent validators',
      short: 'Test uptime, transfer and proof-of-transit.',
      detail: 'Validators walk operator-assigned miner chains, measure real-time transit and score demand and quality before emission reaches miner UIDs.'
    },
    {
      key: 'miners',
      n: '05',
      verb: 'ORGANISES',
      name: 'Miner UID market',
      short: '~200 top miners plus long-tail miners participating in pools.',
      detail: 'Top fleets can hold their own on-chain UIDs. The long tail joins operator pools, letting a provider participate without first winning a scarce subnet slot.'
    },
    {
      key: 'providers',
      n: '06',
      verb: 'ROUTES',
      name: 'Residential provider fleet',
      short: '100K+ providers across 100+ countries carry encrypted traffic.',
      detail: 'Independent phones, computers and nodes contribute routable residential ingress and egress. The operator draws on this shared supply rather than building an isolated fleet.'
    },
    {
      key: 'emission',
      n: '07',
      verb: 'REWARDS',
      name: 'Emission + settlement',
      short: 'Measured useful service is rewarded separately from operator deposits.',
      detail: 'Bittensor emission rewards miners and validators. Pool miners claim through the settlement contract on a seven-day cycle; top-level miner slots are paid natively.'
    }
  ],

  opportunities: [
    {
      n: '01', slug: 'white-label-vpn', short: 'White-label VPN', title: 'White-label VPN',
      category: 'Privacy product', accent: '#74ff61', rgb: '116,255,97', visual: 'vpn',
      teaser: 'A privacy brand keeps the customer relationship and changes the network carrying the traffic underneath.',
      customer: 'A security, telecoms or privacy brand with an audience it already serves.',
      problem: 'Offering private, region-selectable internet access normally requires building and operating a geographically distributed exit fleet.',
      proposition: 'A branded VPN or privacy feature powered by UR’s measured residential routing layer.',
      editorialOpportunityTitle: 'Launch privacy without first building a global fleet',
      editorialProblemLabel: 'THE INFRASTRUCTURE PROBLEM',
      editorialProblemTitle: 'A polished client is only as credible as the network behind it',
      editorialSn25Title: 'Measured residential capacity becomes shared infrastructure',
      editorialThesis: 'A company with an audience should be able to launch a serious privacy product without first becoming a global network infrastructure company.',
      editorialWhy: 'The hard part is no longer drawing a connect button. It is supplying dependable regional capacity, measuring whether it works and maintaining enough geographic depth for the product promise to hold up. That infrastructure burden keeps otherwise credible brands from offering privacy access of their own.',
      editorialUnlock: 'SN25 gives a Network Operator a measured market of residential routes rather than a fixed fleet it must assemble alone. The operator can concentrate on trust, product quality and the customer relationship while the subnet coordinates the supply underneath each session.',
      editorialOpen: 'This could be a complete VPN, an embedded privacy mode, a telecom add-on or something narrower. The network is the starting advantage; the audience and product position remain yours to define.',
      scenario: 'A customer chooses a region in the operator’s app. The operator authenticates the user and applies policy; SN25 matches a measured miner path to a residential exit and returns the encrypted session.',
      traffic: 'Customer → operator identity + policy → miner chain → residential exit → public destination. The response returns through the same contracted path.',
      owns: 'Brand, client or SDK integration, accounts, billing, support, traffic policy, abuse controls and the service promise.',
      inherits: 'Multi-hop encrypted routing, 100K+ provider supply, 100+ country reach, measured transfer and the subnet incentive market.',
      value: 'Customer demand can be subscription- or service-led. The operator’s network charge reflects active usage and GB/day; that real usage adds demand to SN25.',
      constraints: ['Regional capacity and latency', 'Abuse prevention and destination policy', 'Platform integration', 'Consumer and privacy compliance'],
      demandProfile: 'User-led · sustained data', reliance: 'Critical', networkUse: 'Active users + GB/day'
    },
    {
      n: '02', slug: 'encrypted-comms', short: 'Encrypted comms', title: 'Encrypted business communications',
      category: 'Communications', accent: '#ed8fff', rgb: '237,143,255', visual: 'comms',
      teaser: 'A communications product that combines its own application security with independently supplied network transport.',
      customer: 'Teams, institutions or privacy products buying secure mail, messaging or machine communications.',
      problem: 'Application encryption can protect content while the transport layer still depends on one centrally operated network path.',
      proposition: 'A communications product that keeps identity, keys and storage in its own security model while UR carries encrypted payloads over distributed routes.',
      editorialOpportunityTitle: 'Make the network path part of the privacy promise',
      editorialProblemLabel: 'THE TRANSPORT GAP',
      editorialProblemTitle: 'Encryption protects content. Centralised transport still exposes structure.',
      editorialSn25Title: 'Distributed transport without surrendering the product',
      editorialThesis: 'A communications business can combine its own encryption and identity model with a network path that is not supplied by one fixed fleet.',
      editorialWhy: 'End-to-end encryption protects message content, but it does not remove metadata or make the underlying transport private by itself. The opportunity is narrower and more defensible: use distributed transport to reduce dependence on one network operator while the product remains responsible for keys, identity, storage and logging.',
      editorialUnlock: 'SN25 coordinates independently supplied, measurable routes for ciphertext. It does not provide the application security model or eliminate metadata. The Network Operator owns those promises and decides where distributed transport materially strengthens the product.',
      editorialOpen: 'The initial product might be encrypted mail, team messaging, machine communications or a privacy layer inside an existing suite. The useful question is where distributed transport materially improves the promise to the customer.',
      scenario: 'A team member sends an end-to-end encrypted message. The operator handles identity, keys and product policy; UR carries the ciphertext across an independently supplied and measured path.',
      traffic: 'Sender app → operator authentication + message service → contracted miner path → recipient service. Content keys and application storage remain outside the subnet.',
      owns: 'The mail or messaging product, key management, storage, deliverability, identity, retention, abuse controls, billing and support.',
      inherits: 'Distributed encrypted transport, routable provider capacity, per-transfer measurement and network settlement primitives.',
      value: 'Seat- or service-led customer demand creates recurring network usage. The subnet measures the active demand and data moved underneath the product.',
      constraints: ['Key custody and recovery', 'Metadata minimisation', 'Deliverability and interoperability', 'Regulatory and retention requirements'],
      demandProfile: 'User-led · moderate data', reliance: 'High', networkUse: 'Active users + transferred data'
    },
    {
      n: '03', slug: 'agent-access', short: 'Agent access', title: 'The agent access layer',
      category: 'Agent infrastructure', accent: '#eff7bb', rgb: '239,247,187', visual: 'agent',
      teaser: 'Policy-controlled public-web access for autonomous software operating across markets.',
      customer: 'Developers and platforms running agents, browsers, retrieval jobs or approved automations.',
      problem: 'Automated workloads need policy, auditability and geographic reach without every developer operating a residential access fleet.',
      proposition: 'An API or runtime that gives each agent session an approved region, route policy and operator-side audit record.',
      editorialOpportunityTitle: 'Give software actors governed access to real markets',
      editorialProblemLabel: 'THE CONTROL PROBLEM',
      editorialProblemTitle: 'Agents need attribution and policy, not another anonymous proxy',
      editorialSn25Title: 'Residential reach becomes a programmable network primitive',
      editorialThesis: 'Autonomous software needs network access that its operator can authorise, constrain and audit across real markets.',
      editorialWhy: 'Agents increasingly browse, retrieve and interact with public services, yet developers are left to assemble proxies, geography, rate limits and audit trails themselves. The need is not anonymous traffic; it is controlled access that a serious platform can explain and govern.',
      editorialUnlock: 'A Network Operator can wrap SN25 routes in an API that assigns each workload an approved region, policy and record of use. The destination sees a residential route; the operator remains responsible for authenticating the workload and making its use accountable.',
      editorialOpen: 'The product could begin as a browser runtime, a session API or infrastructure embedded into an agent platform. Its defensibility will come from policy and developer experience as much as raw connectivity.',
      scenario: 'An agent requests a public page in a target market. The operator authenticates the workload, records policy and selects constraints; SN25 assembles and measures a provider path before returning the result.',
      traffic: 'Agent runtime → operator API + policy log → measured miner chain → residential origin → public web. Evidence and results return to the operator’s developer surface.',
      owns: 'Agent authorisation, destination policy, audit records, runtime or browser layer, rate limits, billing, developer experience and compliance.',
      inherits: 'Geographically distributed residential routes, provider matching, proof-of-transit and measured network usage.',
      value: 'API sessions and data movement create network demand. The commercial layer can be usage-led while SN25 remains the shared bandwidth market underneath.',
      constraints: ['Destination permission and terms', 'Attribution and audit quality', 'Anti-abuse controls', 'Rate limits and workload isolation'],
      demandProfile: 'Hybrid · variable data', reliance: 'Critical', networkUse: 'Sessions + GB/day'
    },
    {
      n: '04', slug: 'answer-visibility', short: 'AI visibility', title: 'AI answer visibility',
      category: 'Research + intelligence', accent: '#8cc9ff', rgb: '140,201,255', visual: 'visibility',
      teaser: 'Measure how public AI systems represent a brand across prompts, places and time.',
      customer: 'Brands, agencies and intelligence teams monitoring public answer surfaces.',
      problem: 'A single data-centre observation cannot show whether answers, sources and recommendations vary across real markets.',
      proposition: 'A research product that observes public answer surfaces from defined residential markets and compares captured results over time.',
      editorialOpportunityTitle: 'Observe AI answers as users in each market see them',
      editorialProblemLabel: 'THE EVIDENCE PROBLEM',
      editorialProblemTitle: 'A data-centre vantage point is not a local user',
      editorialSn25Title: 'Geography becomes repeatable, measurable evidence',
      editorialThesis: 'Brands need a way to observe how public AI systems describe them across geography, prompts and time—not from one infrastructure location.',
      editorialWhy: 'Answer engines are becoming discovery surfaces, but their outputs are volatile and can vary by market. A useful visibility product therefore needs repeatable regional observation and evidence, not a single screenshot or a dashboard built on one location.',
      editorialUnlock: 'SN25 gives the operator residential vantage points across markets while validator-scored paths make the collection layer measurable. That validates network service, not the research conclusion: the operator still owns sampling, prompt design, account state, capture discipline and interpretation.',
      editorialOpen: 'The strongest wedge may be brand monitoring, source attribution, market comparison or another intelligence workflow. The subnet expands where evidence can be collected; it does not prescribe what insight to sell.',
      scenario: 'A defined prompt set is dispatched across selected markets. The operator controls sampling and capture; UR supplies the residential vantage points; the product compares answers and sources over time.',
      traffic: 'Research scheduler → operator sampling + capture service → regional miner paths → public AI surfaces → evidence store + analysis.',
      owns: 'Prompt methodology, permissions, sampling, evidence capture, quality control, analysis, reporting, accounts and customer workflow.',
      inherits: 'Residential geographic breadth, independently supplied paths and measurable transfer across the selected markets.',
      value: 'This is primarily data-led demand: fewer end users can generate repeated regional observations. UR supplies the reach, not the research method.',
      constraints: ['Platform permissions and terms', 'Sampling validity', 'Answer volatility and reproducibility', 'Evidence retention and privacy'],
      demandProfile: 'Data-led · repeated checks', reliance: 'Critical', networkUse: 'Locations + queries + data'
    },
    {
      n: '05', slug: 'ad-verification', short: 'Ad verification', title: 'Ad verification + brand protection',
      category: 'Media intelligence', accent: '#ffb65d', rgb: '255,182,93', visual: 'verification',
      teaser: 'Collect timestamped residential observations of adverts, listings or prices in selected markets.',
      customer: 'Advertisers, agencies, marketplaces and brand owners buying or protecting regional presence.',
      problem: 'Data-centre checks can be blocked or shown a different experience from the one a real household receives.',
      proposition: 'A verification product that schedules regional samples, captures evidence and reports discrepancies against an expected result.',
      editorialOpportunityTitle: 'Turn regional appearances into defensible evidence',
      editorialProblemLabel: 'THE VANTAGE-POINT PROBLEM',
      editorialProblemTitle: 'Infrastructure recognised as a bot cannot verify a household view',
      editorialSn25Title: 'Residential observation becomes measurable supply',
      editorialThesis: 'A residential observation can provide stronger evidence of what appeared in a market than a check made from recognisable data-centre infrastructure.',
      editorialWhy: 'Advertisers, marketplaces and brand owners often rely on checks from infrastructure that platforms recognise or treat differently from real households. That makes regional claims difficult to prove and creates room for fraud, leakage and incorrect pricing.',
      editorialUnlock: 'A Network Operator can use SN25 to dispatch measured observations through residential providers in the relevant market, then package captures, timestamps and discrepancy analysis into a product. Each result is a sampled observation, not proof of an entire campaign; the operator defines the sampling and evidence standard.',
      editorialOpen: 'Advertising is one obvious starting point, but the same pattern can apply to listings, prices, availability or brand protection. The opportunity is to choose a high-value claim that better regional evidence can settle.',
      scenario: 'A campaign check requests a market and time window. The operator dispatches a permitted observation through a measured residential route, captures the public result and returns a timestamped sample to the buyer.',
      traffic: 'Campaign schedule → operator policy + evidence capture → regional miner path → public advert or listing → timestamped result + analysis.',
      owns: 'Measurement rules, evidence integrity, compliance, capture tooling, anomaly detection, reporting, alerts and the enterprise workflow.',
      inherits: 'Residential regional origin, distributed provider capacity, transfer measurement and validator-scored network quality.',
      value: 'Verification is data-led and can move substantial observation traffic per customer. Network reach is an input; the operator creates the evidence product.',
      constraints: ['Evidence integrity and audit trail', 'Consent, platform rules and legality', 'Fraud and manipulation resistance', 'Regional availability'],
      demandProfile: 'Data-led · high observation volume', reliance: 'Critical', networkUse: 'Checks + regions + data'
    },
    {
      n: '06', slug: 'private-search', short: 'Private search', title: 'Private search + retrieval',
      category: 'Retrieval product', accent: '#c9a7ff', rgb: '201,167,255', visual: 'search',
      teaser: 'A focused search or answer product that minimises what its operator records and distributes the network path used for retrieval.',
      customer: 'Privacy-conscious users or applications retrieving information on their behalf.',
      problem: 'Search and answer products can centralise queries, profiles, retrieval paths and behavioural histories in one operator.',
      proposition: 'A focused search or answer engine with explicit query-handling rules and distributed transport beneath retrieval and ingestion.',
      editorialOpportunityTitle: 'Build privacy into both query handling and retrieval',
      editorialProblemLabel: 'THE CONCENTRATION PROBLEM',
      editorialProblemTitle: 'Private intent still leaks through centralised retrieval',
      editorialSn25Title: 'Distributed routing is one part of the privacy model',
      editorialThesis: 'A focused answer product can minimise query records and distribute retrieval traffic without having to build its own provider network.',
      editorialWhy: 'Search products can centralise intent, behavioural history and retrieval traffic in one place. As answer engines become more specialised, there is room for products that compete on privacy and purpose rather than recreating a general search engine.',
      editorialUnlock: 'SN25 can carry retrieval and ingestion traffic over distributed measured routes. That does not hide the query from the product operator or source systems by itself; the operator must define logging, access, retention and who can observe what.',
      editorialOpen: 'The first version could serve a profession, a commercial research workflow or privacy-conscious consumers. The valuable wedge is likely a specific kind of intent where trust matters more than breadth.',
      scenario: 'A user submits a query to the operator’s answer product. The operator applies its query-handling and retention policy; UR carries retrieval traffic across distributed routes before the ranked answer returns.',
      traffic: 'User query → operator query protection + ranking → distributed retrieval or ingestion paths → sources → answer surface.',
      owns: 'Index or search access, query protections, ranking, model or answer system, source policy, logs, billing and the full customer experience.',
      inherits: 'Distributed routing, residential provider reach, measurable transfer and the shared subnet market beneath retrieval.',
      value: 'User demand and retrieval volume both matter. The product can differentiate on intent or privacy while drawing on the same network foundation.',
      constraints: ['Index and content rights', 'Query-log minimisation', 'Model and source provenance', 'Latency, abuse and answer quality'],
      demandProfile: 'Hybrid · retrieval-heavy', reliance: 'High', networkUse: 'Users + retrieval GB/day'
    }
  ]
};

export const BUILD_V12 = [
  {
    slug: 'white-label-vpn',
    category: 'Privacy product',
    title: 'White-label VPN',
    summary: 'A brand with an existing audience could launch a VPN without first building a global provider network.',
    opportunityTitle: 'Launch a VPN for an audience you already serve',
    opportunity: 'A telecom, security company, community or consumer brand may already have the trust and distribution needed to launch a VPN. The infrastructure challenge is providing regional exits, maintaining route diversity and monitoring network quality. A Network Operator could build the VPN experience, subscription and policy layer on top of UR’s provider network. The result could be a standalone VPN, an embedded privacy feature or a travel product designed for a specific audience.',
    sn25Title: 'Use UR’s provider network instead of building a private fleet',
    sn25: 'UR provides access to residential bandwidth contributed by more than 100K providers across 100+ countries. Providers carry encrypted ingress and egress traffic, while the operator matches users to available routes. Independent validators test provider trails for liveness, latency and real-time transit, supplying a network-quality signal without validating each customer session. The operator can focus on the VPN product, distribution and service.',
    owns: 'Brand, client or SDK integration, identity, accounts, billing, support, route policy, abuse controls, compliance and the promise made to customers. UR supplies network leverage; the operator remains responsible for the service.',
    customer: 'Telecom, security, privacy or community brand',
    demand: 'Sustained user traffic',
    networkUse: 'Active users + data moved'
  },
  {
    slug: 'encrypted-communications',
    category: 'Communications',
    title: 'Encrypted communications',
    // Short form for the readout headline so it sits on one line like the other five;
    // the brief and the tab keep their own wording.
    displayTitle: 'Encrypted comms',
    summary: 'Use UR as the network layer beneath an encrypted messaging, mail or machine-to-machine product.',
    opportunityTitle: 'Make transport part of the privacy model',
    opportunity: 'Encrypted communications depend on more than message content. Availability, regional reach and reliance on a single transport fleet also shape the service. A Network Operator could use UR beneath business messaging, field communications or machine-to-machine traffic, pairing its own security model with independently supplied residential network capacity.',
    sn25Title: 'Add distributed transport without outsourcing the product',
    sn25: 'UR gives the Network Operator access to residential routes across multiple markets. The subnet coordinates incentives and validator measurements for that supply. This can broaden regional reach and reduce dependence on a fixed egress fleet, while the operator remains responsible for the communications product and its security model.',
    owns: 'The communications experience, encryption and key model, identity, storage, deliverability, retention, abuse controls, billing, support and every claim made about metadata. Distributed routing can strengthen the product, but it cannot substitute for sound application security.',
    customer: 'Teams, institutions and privacy products',
    demand: 'Recurring users + moderate data',
    networkUse: 'Active users + transferred payloads'
  },
  {
    slug: 'agent-access',
    category: 'Agent infrastructure',
    title: 'Agent access',
    summary: 'Build managed residential web access for agent workloads across selected markets.',
    opportunityTitle: 'Build an accountable network layer for agents',
    opportunity: 'UR already supports authenticated network access and regional route selection for agents. A Network Operator could turn that capability into a dedicated API or browser runtime with workload identity, destination policy, rate limits and usage records for research, monitoring and enterprise automation.',
    sn25Title: 'Turn residential reach into a programmable primitive',
    sn25: 'UR supplies residential egress across markets. Providers carry traffic and validators measure the underlying routing service. The operator packages that reach into a developer product with controls, tooling and a compliance model designed for its customers.',
    owns: 'Authentication, destination policy, audit records, rate limits, workload isolation, developer tooling, billing, abuse prevention and compliance with the rules of destination services. Network reach is useful only when the product makes its use governable.',
    customer: 'Agent platforms, developers and research teams',
    demand: 'Variable sessions + data',
    networkUse: 'Sessions, regions and GB/day'
  },
  {
    slug: 'ai-answer-visibility',
    category: 'Research + intelligence',
    title: 'AI answer visibility',
    summary: 'Observe how public AI systems describe a brand across prompts, markets and time.',
    opportunityTitle: 'Track how AI answers vary across markets and time',
    opportunity: 'Brands and research teams want to understand how publicly accessible AI systems describe them, which sources appear and how answers vary across prompts, markets and time. Credible comparison requires a defined query set, controlled account state and repeated evidence capture. A Network Operator could turn those observations into monitoring, launch reports or issue tracking.',
    sn25Title: 'Make geography part of the observation system',
    sn25: 'UR provides residential access across markets, while the subnet measures the underlying routing supply. This broadens where observations can be collected, but it does not validate an answer or research conclusion. The operator owns the prompts, accounts, sampling, capture method and interpretation.',
    owns: 'Research methodology, permissions, prompt design, sampling, evidence capture, quality control, analysis, reporting and the customer workflow. The product must distinguish a sampled observation from a universal claim about an answer engine.',
    customer: 'Brands, agencies and intelligence teams',
    demand: 'Repeated regional observations',
    networkUse: 'Locations, queries and data collected'
  },
  {
    slug: 'ad-verification',
    category: 'Media intelligence',
    title: 'Ad verification',
    summary: 'Capture timestamped residential observations in selected markets.',
    opportunityTitle: 'Verify delivery from the market where it mattered',
    opportunity: 'Advertisers and brands may need an independent record of what appeared in a specific market. Data-centre requests can be blocked or treated differently from residential traffic. A Network Operator could schedule residential checks, timestamp the returned result and compare it with the placement expected. Repeated samples can show a pattern; no single capture proves campaign-wide delivery.',
    sn25Title: 'Treat residential observation as measurable network supply',
    sn25: 'UR gives the operator residential access across selected markets. Providers carry the requests and independent validators measure the underlying routing supply; neither the network nor the validators verify the advertisement itself. The operator defines the sampling, capture and evidentiary standard.',
    owns: 'Sampling rules, permissions, capture tooling, timestamps, evidence integrity, anomaly detection, reporting and alerts.',
    customer: 'Advertisers, agencies, marketplaces and brands',
    demand: 'Scheduled, data-led checks',
    networkUse: 'Observations, regions and data collected'
  },
  {
    slug: 'private-search',
    category: 'Retrieval product',
    title: 'Private search',
    summary: 'Build a focused search or answer product with explicit rules for query handling, logging and retention.',
    opportunityTitle: 'Build search for a defined audience or workflow',
    opportunity: 'Search queries reveal intent. A Network Operator could build a focused retrieval or answer product for a profession, research workflow or privacy-conscious audience without depending on behavioural advertising. UR provides the network access beneath retrieval; the operator owns the index, ranking or model and the customer relationship.',
    sn25Title: 'Use distributed routing as one layer of the privacy model',
    sn25: 'UR can carry retrieval and ingestion traffic through residential routes across markets, while the subnet coordinates the supply behind those routes. Routing can reduce dependence on a fixed access fleet, but it does not hide queries from the search operator, model provider or source systems. Query privacy still depends on the operator’s architecture, logging and retention choices.',
    owns: 'The index or source relationships, query protections, ranking, model or answer system, retention policy, logs, billing and customer experience. Distributed routing is one useful layer in a private retrieval product, not a complete privacy guarantee.',
    customer: 'Privacy-conscious users and specialised research teams',
    demand: 'Users + retrieval-heavy data',
    networkUse: 'Queries, sources and GB/day'
  }
];
