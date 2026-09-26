import React from 'react';
import { investorCentre } from '../../../data/investors';
import './InvestorAnnouncement.css';

/**
 * The conviction-lock announcement (/investors/conviction-lock): a summary
 * header over the announcement itself, reproduced as a white sheet. Static;
 * the Astro page server-renders it without hydration.
 *
 * Named explicitly rather than read from `featured`: this is the conviction
 * announcement whatever the Investor Centre leads with next.
 */
const announcement = investorCentre.convictionAnnouncement;

export default function InvestorAnnouncement() {
    return (
        <div className="announcement-page" id="announcement">
            <div className="announcement-toolbar announcement-shell">
                <a className="announcement-back" href="/investors">
                    <span aria-hidden="true">←</span> Investor Centre
                </a>
                <div className="announcement-actions">
                    <a className="announcement-download" href={announcement.pdfHref} download>
                        Download PDF <span aria-hidden="true">↓</span>
                    </a>
                </div>
            </div>

            <header className="announcement-summary announcement-shell">
                <p className="announcement-kicker">
                    <span aria-hidden="true"></span>
                    Network announcement
                </p>
                <h1>{announcement.headline}</h1>
                <div className="announcement-summary-meta">
                    <div className="announcement-issuer">
                        <span className="announcement-issuer__mark" aria-hidden="true">
                            <img src="/favicon.svg" alt="" />
                        </span>
                        <span>
                            <strong>UR Foundation</strong>
                            <small>UR (SN25) · Management update</small>
                        </span>
                    </div>
                    <p>
                        <span>Dated <time dateTime={announcement.dateIso}>{announcement.date}</time></span>
                        <span>3 min read</span>
                    </p>
                </div>
            </header>

            <div className="announcement-stage">
                <article className="announcement-paper" aria-labelledby="announcement-title">
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

                    <p className="announcement-date"><time dateTime="2026-09-09">9 September 2026</time></p>

                    <h2 className="announcement-document-title" id="announcement-title">
                        UR (SN25) management team locks 550,000 alpha under perpetual conviction, taking total locked alpha behind the subnet to 27.1 per cent of circulating supply
                    </h2>

                    <section className="announcement-document-section" aria-labelledby="announcement-highlights">
                        <h3 id="announcement-highlights">Highlights</h3>
                        <ul>
                            <li><strong>Team lock</strong>: 550,000 alpha, equivalent to 5,451 TAO or approximately US$1.44 million.</li>
                            <li><strong>Lock term</strong>: Perpetual, carrying no unlock date and no vesting schedule, transparently verifiable onchain.</li>
                            <li><strong>Holders lock</strong>: 323,519 alpha locked before the team's commitment and a further 291,974 alpha locked since.</li>
                            <li><strong>Total locked</strong>: 1,165,493 alpha, approximately US$3.04 million and 27.1 per cent of circulating supply.</li>
                            <li><strong>Rank</strong>: Second of 128 subnets by total alpha conviction locked on Bittensor.</li>
                        </ul>
                    </section>

                    <p>The management team of UR (SN25) has locked 550,000 alpha under Bittensor's conviction mechanism, approximately US$1.44 million at the spot price on 9 September 2026, under perpetual lock state. Outside holders had already locked 323,519 alpha behind UR (SN25) before the team committed, approximately US$844,000 and 7.5 per cent of circulating supply. A further 291,974 alpha has been locked by outside holders since. Together the total now stands at 1,165,493 alpha, roughly US$3.04 million and 27.1 per cent of all circulating SN25 alpha, which is the second largest total alpha locked behind any subnet on Bittensor.</p>

                    <p>The management team has set the lock to perpetual to show conviction. The position becomes more valuable only if the network grows and the alpha accrues value. That is the same condition for every holder and validator on SN25. The team's incentives are aligned with everyone else holding and working on the subnet, because the only way this position gains is if the network does.</p>

                    <section className="announcement-document-section" aria-labelledby="brien-colwell">
                        <h3 id="brien-colwell">Brien Colwell, Core Contributor, said:</h3>
                        <blockquote>
                            <p>"We've been building UR for years because the current model doesn't work. Bittensor is a critical part that helps us achieve our vision with miners and the community powering our commodity. The network is for anyone to run a miner, become an operator and bring their products to use it. With our official transfer of SN25 ownership and locking in perpetual conviction, we want to show the community we are invested alongside them and aligned with the long-term growth and success of the subnet."</p>
                        </blockquote>
                    </section>

                    <section className="announcement-document-section" aria-labelledby="keith-singery">
                        <h3 id="keith-singery">Keith Singery, Advisor, said:</h3>
                        <blockquote>
                            <p>"It gives me great pride to welcome UR to Bittensor, and have a team working on encryption and a private internet using Bittensor. Since 2022 I've dedicated myself to supporting the mission of open source via Bittensor, and since meeting Brien and Jack, this is a team that we have a clear aligned vision together on the future. I am excited that they are aligning with all token holders as they embark on this journey."</p>
                        </blockquote>
                    </section>

                    <section className="announcement-document-section" aria-labelledby="about-sn25">
                        <h3 id="about-sn25">About UR (SN25)</h3>
                        <p>UR (SN25) is an open-source, bandwidth marketplace for private internet access built on Bittensor. Today, UR (SN25) partners with over 80,000 network providers across more than 100 countries to carry traffic. UR is developed in the open by UR Foundation, with the protocol at github.com/urfoundation/sn. More at ur.xyz.</p>
                        <p>BringYour is the first Network Operator, ur.io, running a consumer VPN serving more than 350,000 monthly active users. It is fully open source at github.com/urnetwork and is live on iOS, Android, Windows, macOS, Linux, Chrome and Firefox.</p>
                    </section>

                    <p className="announcement-legal"><em>This material is provided for informational purposes only and does not constitute an offer, solicitation or investment advice. All figures are as at 9 September 2026 and are subject to change.</em></p>
                </article>
            </div>
        </div>
    );
}
