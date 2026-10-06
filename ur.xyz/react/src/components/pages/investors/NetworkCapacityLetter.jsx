import React from 'react';
import { investorCentre } from '../../../data/investors';
import './InvestorAnnouncement.css';
import './NetworkCapacityLetter.css';

const letter = investorCentre.capacityLetter;

// The supplied October letter and original diagram, with approved copy edits.
export default function NetworkCapacityLetter() {
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
                <p className="announcement-kicker"><span aria-hidden="true"></span>Tokenholder update</p>
                <h1 className="announcement-summary-title--compact">{letter.title}</h1>
                <div className="announcement-summary-meta">
                    <div className="announcement-issuer">
                        <span className="announcement-issuer__mark" aria-hidden="true">
                            <img src="/favicon.svg" alt="" />
                        </span>
                        <span><strong>UR Foundation</strong><small>UR (SN25) · Network capacity update</small></span>
                    </div>
                    <p>
                        <span>{letter.dateIso ? <>Dated <time dateTime={letter.dateIso}>{letter.date}</time></> : letter.date}</span>
                        <span>{letter.readTime}</span>
                    </p>
                </div>
            </header>

            <div className="announcement-stage">
                <article className="announcement-paper announcement-paper--tokenholders announcement-paper--capacity" aria-labelledby="capacity-letter-title">
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
                    <p className="announcement-date">{letter.dateIso ? <time dateTime={letter.dateIso}>{letter.date}</time> : letter.date}</p>
                    <h2 className="announcement-document-title" id="capacity-letter-title">{letter.headline}</h2>

                    <section className="announcement-document-section" aria-labelledby="capacity-introduction">
                        <h3 id="capacity-introduction">Introduction</h3>
                        <p>UR (SN25) aims to support Bittensor’s open source vision by building a marketplace for private connectivity: coordinating independent providers to build private network capacity that operators need to serve customers.</p>
                        <p>ur.io is the first customer-facing example; the broader opportunity is infrastructure shared by multiple operators. Ultimately, our priority is to create a strong, reliable network that enables any operator to grow, and make private networking accessible for all.</p>
                        <p>In this manner, operators bring products, customers and demand and our independent miners supply connectivity, where UR (SN25) coordinates incentives and verification to help useful supply develop.</p>
                        <p>For UR:</p>
                        <ul>
                            <li><strong>Network operators</strong>, including ur.io, build services and bring customer demand.</li>
                            <li><strong>Providers and fleets</strong> contribute the connections and routing capacity those services use.</li>
                            <li><strong>SN25</strong> incentivizes and verifies the underlying supply and usage of miners.</li>
                        </ul>
                        <p>This makes capacity investment an ecosystem strategy. We therefore should always be building and reinvesting to expand network needs and service outcomes across operators.</p>
                    </section>

                    <section className="announcement-document-section" aria-labelledby="capacity-working-capital">
                        <h3 id="capacity-working-capital">Why retain emissions as working capital?</h3>
                        <p>We do not expect network capacity and customer demand to grow in perfect alignment. In conversations with operators, they seek evidence of reliable supply PRIOR to launching on the subnet. Take a new VPN operator that may have an existing product and customers: broader coverage or dependable availability in particular markets will be critical to support their growth. UR needs to coordinate those providers that can fulfil those requirements as quickly as possible.</p>
                        <p>We therefore propose SN25 should use excess emissions to bootstrap miners to demonstrate network strength to attract new Network operators.</p>
                        <figure className="capacity-letter-diagram">
                            <img src="/investors/network-capacity-gap.png" width="1140" height="606" alt="Operators want supply before demand arrives. Capacity is established before an operator launches, while customer traffic grows later. The Network Capacity Reserve funds the gap and is released against verified delivery. Operators launch with capacity already in place; the reserve carries the cost until traffic catches up, so early customers get full service from day one." />
                            <figcaption><a href="/investors/network-capacity-gap.png" target="_blank" rel="noopener noreferrer">View diagram at full size ↗</a></figcaption>
                        </figure>
                    </section>
                </article>

                <article className="announcement-paper announcement-paper--tokenholders announcement-paper--capacity announcement-paper--continued" aria-label="Funding network capacity for UR’s operator ecosystem, page 2">
                    <section className="announcement-document-section" id="capacity-reserve" aria-label="Network Capacity Reserve">
                        <p>As such we are launching the “Network Capacity Reserve”, which uses excess emissions to bridge that gap:</p>
                        <ul>
                            <li>Commission capacity ahead of an operator’s expansion.</li>
                            <li>Improve coverage and reliability where existing supply is inadequate.</li>
                            <li>Respond to rising demand without relying only on that period’s emissions.</li>
                            <li>Keep strategically useful capacity available during quieter periods.</li>
                            <li>Release funds against verified delivery instead of distributing the entire budget immediately.</li>
                        </ul>
                        <p>The <em>Network Capacity Reserve</em> adds a way to fund that supply ahead of demand. In this model, emissions accumulate as working capital and are released against defined, verified commitments.</p>
                        <p>To support this, we are launching a dashboard to help visualise capital allocation, showing reserve balances and published allocations, with commitments and payments reported as programs become active.</p>
                        <p>Ultimately, each program should have a clear ROI for how excess capacity is being incentivised.</p>
                    </section>

                    <section className="announcement-document-section" aria-labelledby="capacity-examples">
                        <h3 id="capacity-examples">Examples</h3>
                        <ul>
                            <li>When a new operator is ready to bring users onto UR, establish a capped provider incentive program for its required supply. Payments depend on working routes and sustained service, rather than simply registering an operator.</li>
                            <li>If ur.io or another operator needs additional exits in a target market, commission providers to maintain qualifying connections there. The existing fleet mechanism measures routable prefix breadth; geographic rewards would require additional location verification.</li>
                            <li>Offer temporary incentives when an operator’s usage rises beyond available supply. Payments specifically tied to throughput or delivered traffic would require stronger verification than the current routing checks.</li>
                            <li>Fund time-limited commitments to keep useful connections online between demand peaks, conditional on successful random verification.</li>
                        </ul>
                    </section>

                    <section className="announcement-document-section" aria-labelledby="capacity-operations">
                        <h3 id="capacity-operations">Reserve Operations</h3>
                        <ul>
                            <li>Start with a dedicated multisig treasury wallet.</li>
                            <li>Publish objectives, eligibility, measurement and duration when excess miner rewards are used.</li>
                            <li>Reserve funds for accepted commitments and account for existing baseline rewards.</li>
                            <li>Verify delivery, publish the reward calculation and approve payments through the multisig.</li>
                            <li>Keep unused funds available for future operator and network needs.</li>
                        </ul>
                    </section>

                    <section className="announcement-document-section" aria-labelledby="capacity-impact">
                        <h3 id="capacity-impact">Impact</h3>
                        <p>UR (SN25) as a network becomes more valuable as demand from operators increases, who buy and permanently lock the token to continue accessing the network.</p>
                        <p>That is the intended connection: <strong>more bandwidth usage → larger required buys / deposits from NOs → potential market purchases → more demand of $SN25</strong></p>
                        <p>The <em>Network Capacity Reserve</em> supports this directly: it incentivises providers to improve specific coverage, availability and capacity, helping us attract operators which serve more users, further accelerating growth.</p>
                        <p>We look forward to sharing updates on this program.</p>
                    </section>
                    <p className="announcement-legal"><em>This material is provided for informational purposes only and does not constitute an offer, solicitation or investment advice.</em></p>
                </article>
            </div>
        </div>
    );
}
