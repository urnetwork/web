import React from 'react';
import { investorCentre } from '../../../data/investors';
import './InvestorAnnouncement.css';

/**
 * The September 2026 letter to tokenholders
 * (/investors/letter-to-tokenholders-september-2026): a summary header over
 * the letter itself, reproduced as two white sheets in the announcement's
 * dress. Static; the Astro page server-renders it without hydration.
 *
 * Named explicitly rather than read from `featured`: this is the September
 * letter whatever the Investor Centre leads with next.
 */
const letter = investorCentre.tokenholderLetter;

export default function TokenholderLetter() {
    return (
        <div className="announcement-page" id="announcement">
            <div className="announcement-toolbar announcement-shell">
                <a className="announcement-back" href="/investors">
                    <span aria-hidden="true">←</span> Investor Centre
                </a>
                <div className="announcement-actions">
                    <a className="announcement-download" href={letter.pdfHref} download>
                        Download PDF <span aria-hidden="true">↓</span>
                    </a>
                </div>
            </div>

            <header className="announcement-summary announcement-shell">
                <p className="announcement-kicker">
                    <span aria-hidden="true"></span>
                    Tokenholder update
                </p>
                <h1 className="announcement-summary-title--compact">{letter.title}</h1>
                <div className="announcement-summary-meta">
                    <div className="announcement-issuer">
                        <span className="announcement-issuer__mark" aria-hidden="true">
                            <img src="/favicon.svg" alt="" />
                        </span>
                        <span>
                            <strong>UR Foundation</strong>
                            <small>UR (SN25) · Mainnet and product update</small>
                        </span>
                    </div>
                    <p>
                        <span>Dated <time dateTime={letter.dateIso}>{letter.date}</time></span>
                        <span>{letter.readTime}</span>
                    </p>
                </div>
            </header>

            <div className="announcement-stage">
                <article className="announcement-paper announcement-paper--tokenholders" aria-labelledby="tokenholder-title">
                    <header className="announcement-letterhead">
                        <img className="announcement-wordmark" src="/ur.svg" alt="UR" />
                        <address className="announcement-address">
                            <strong>UR FOUNDATION</strong>
                            Bittensor Subnet 25 (netuid 25)<br />
                            Protocol: github.com/urfoundation/sn<br />
                            Network: ur.xyz<br />
                            Applications: ur.io
                        </address>
                    </header>

                    <p className="announcement-date"><time dateTime={letter.dateIso}>{letter.date}</time></p>

                    <h2 className="announcement-document-title" id="tokenholder-title">Letter to Tokenholders</h2>

                    <p><strong>To tokenholders of UR (SN25),</strong></p>

                    <p>It gives me great pleasure to announce that UR will launch mainnet this week, with the next quarter focused on refining incentives and expanding usage of our protocol to replace the old internet as we know it. Our ambition is to make privacy a seamless function of the internet, available without requiring technical expertise or an unacceptable sacrifice in performance. Brien and I feel immense responsibility to deliver and commercialise frontier privacy technology, and we will not be able to achieve this without the people of Bittensor.</p>

                    <p>Privacy has gone from the least fashionable corner of crypto to its best performing one in under twelve months, led by ZEC, XMR and various confidential AI and compute names. The thesis is actually very simple, and I like what A16z said in their <a href="https://a16zcrypto.com/posts/article/privacy-trends-moats-quantum-data-testing/" target="_blank" rel="noopener noreferrer">privacy thesis</a>: “privacy will be the most important moat in crypto… Once a user commits to a private network, leaving it leaks the metadata that made them identifiable in the first place, so privacy produces lock-in”. As we scale up mainnet and launch new products on UR, the journey to onboard 1bn people has just begun.</p>

                    <section className="announcement-document-section" aria-labelledby="design-of-sn25">
                        <h3 id="design-of-sn25">Design of SN25</h3>

                        <p>Our entire objective for the subnet has been to carve out our supply side bandwidth network that we have built over the last ~2 years into a marketplace accessible to developers. Core to this idea is our <em>Network Operators</em>, a scalable franchise model in which each operator can permissionlessly leverage UR (SN25) as a public commodity, creating an ecosystem of entrepreneurs who contribute to the network’s reach and utilisation. As we launch mainnet, here are some priorities:</p>

                        <ol>
                            <li><strong>Calibrate emissions during launch:</strong> We will initially <strong><u>burn 90% of miner emissions</u></strong> while testing the incentive mechanism and assessing network performance. This is intended to support alpha retention while we determine the reward allocation required to attract and retain productive supply.</li>
                            <li><strong>Expand supply and improve service quality:</strong> Our internal target is to grow the miner base approximately tenfold, from around ~100k today to 1mm. Through Bittensor incentives, we aim to broaden geographic coverage and attract providers with higher-quality bandwidth, improving connection reliability, speed and availability for users.</li>
                            <li><strong>Validate the subnet through an initial fee-free period:</strong> ur.xyz will operate without fees for the first one to two months, allowing us to test the subnet under real usage, evaluate miner and validator performance, and refine the incentive mechanism before introducing fees.</li>
                        </ol>

                        <p>In Jan 2026, Iran <a href="https://www.techradar.com/vpn/vpn-privacy-security/i-have-never-seen-such-a-thing-in-my-life-iran-completely-shuts-down-the-internet-amid-protests-starlink-also-affected" target="_blank" rel="noopener noreferrer">turned off access to the internet</a> for its people. For those affected, reaching the internet meant retaining contact with family, accessing information and continuing their work. During that Jan period, we went from 100k lifetime sign ups to ~350k, and have recently hit 1mm downloads in September; Behind those numbers are real lives impacted by the technology Brien has created. Interestingly, that growth also exposed the demands placed on our own infrastructure. One Saturday morning, we discovered that the load on our servers had tripped the power in a data-centre cabinet: Users were depending on us, and our capacity had been pushed beyond its limits. The experience reinforced a practical obligation: we must build for the conditions in which our service is needed most.</p>

                        <p>Which brings me back to Bittensor: expanding the network’s geographic reach and attracting dependable bandwidth providers are essential to serving users under pressure. As we extend UR into private identity and agent communications, we will carry forward the same standard: infrastructure earns trust by remaining useful and true to privacy value when people need it the most.</p>
                    </section>

                    <section className="announcement-document-section" aria-labelledby="project-meridien">
                        <h3 id="project-meridien">Project Meridien</h3>

                        <p>Following the mainnet launch, our core product development focus will shift to our second Network Operator, <em>Project Meridien</em>, extending UR’s infrastructure to serve AI agents and the businesses deploying them. Our thesis is that, as agents take on more work, they will need secure and reliable ways to communicate, exchange code and connect to services. We intend to build products that meet those needs while bringing additional demand to the SN25.</p>
                    </section>
                </article>

                <article className="announcement-paper announcement-paper--tokenholders announcement-paper--continued" aria-label="September Letter to Tokenholders, page 2">
                    <section className="announcement-document-section" aria-label="Project Meridien continued">
                        <p>Our first product under Meridien will be <strong>agent email hosted on the user’s private network</strong>; the proposed design would route messages sent to an address such as <code>agent@mynetwork.ur.network</code> directly to a mail server on that network. Users could operate their agents’ mailboxes on infrastructure they control, creating alternatives to centralized hosted email providers such as Gmail or Proton. We think that over time, agent identity persistence will be driven by email architecture, whereby they can communicate with other agents, humans and services via an email framework. If a business deploys agents for recurring operational work, such as procurement, scheduling or customer enquiries, the objective is to workflows easier, core features would need to be:</p>

                        <ol>
                            <li>Let AI agents handle routine business correspondence</li>
                            <li>Give each agent its own inbox, defined permissions and reviewable activity</li>
                            <li>Keeping sensitive stored messages and mailbox within infrastructure under your control</li>
                        </ol>

                        <p>Our broader vision for <em>Meridian</em> is to help developers deploy AI agents faster and spend less time managing infrastructure. Beyond agent identity i.e. email, we plan to add encrypted code storage and private networking so agents can communicate, access code and connect to internal tools through one integrated service. A lightweight companion process, designed to run without administrator privileges, would make Meridian easier to add to existing deployments. For developers, the intended benefits are fewer integrations to build, less networking to configure and lower ongoing maintenance costs, while retaining control over their data and agent access. In this manner, we think that by accelerating the proliferation of agent capability, we can embed our world class proxy network for their agents too.</p>
                    </section>

                    <section className="announcement-document-section" aria-labelledby="mycelium-private-internet">
                        <h3 id="mycelium-private-internet">The Mycelium Of The Private Internet</h3>

                        <p>Our long-term vision is for <strong><u>privacy to become an expected property of the internet</u></strong>. Our mission is simple: People should be able to communicate, build and transact securely without having to understand the infrastructure protecting them. Accessing and leveraging the internet is a human right, and where there may be gatekeepers who try to suppress access or collect tolls, we aim to stay true to these values.</p>

                        <p>Brien likes using mycelium as a useful image of how such a network could grow: Beneath a forest floor, countless local connections form a vast structure that is largely invisible from above. UR’s ambition is similarly built from the bottom up: individuals contribute connectivity, independent operators develop services, and developers bring applications and users. Each participant has a practical reason to join, while contributing to infrastructure whose reach extends beyond any single participant.</p>

                        <p>For the user, that infrastructure should quietly do its job: An agent should be able to receive a message at its own address, exchange private code and connect to another service without requiring its owner to configure a complex network. Achieving that simplicity requires considerable work underneath, particularly in routing, reliability and making services reachable across different environments.</p>

                        <p>The internet’s adoption of encrypted web connections provides a useful precedent, encryption became part of everyday browsing as software made it routine. We see an opportunity to extend that expectation further, towards private identities and communications hosted on infrastructure users control. Much of today’s internet already encrypts information in transit; our ambition is to reduce the additional exposure and dependence that remain around who is communicating, how they connect and who holds their data. This will be the legacy of UR (SN25).</p>
                    </section>

                    <footer className="announcement-signoff">
                        <p>With much love,</p>
                        <p>Brien and Jack</p>
                        <p>on behalf of team UR (SN25)</p>
                    </footer>

                    <p className="announcement-legal"><em>This material is provided for informational purposes only and does not constitute an offer, solicitation or investment advice.</em></p>
                </article>
            </div>
        </div>
    );
}
