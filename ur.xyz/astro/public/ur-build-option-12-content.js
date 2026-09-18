window.UR_BUILD_V12 = [
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
