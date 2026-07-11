import React from 'react';
import './CommunityFoot.css';

/**
 * Supporter / partner logo walls at the bottom of the community page.
 *
 * Org data lives here (it isn't language copy). Wordmark logos stand
 * alone; square marks show the org's name next to them; orgs without a
 * published logo asset render as a typographic wordmark. Prop-driven
 * (dict passed as `t`), so the Astro build renders it statically per
 * language and the React SPA reuses it.
 */
const SUPPORTERS = [
    { name: 'URnetwork', href: 'https://ur.io', logo: '/orgs/urnetwork.svg' },
    { name: 'Pylon Partners', href: 'https://pylon.partners' }
];

const PARTNERS = [
    { name: 'TAO.com', href: 'https://tao.com', logo: '/orgs/tao.png', showName: true },
    { name: 'Macrocosmos', href: 'https://www.macrocosmos.ai', logo: '/orgs/macrocosmos.svg' }
];

function OrgWall({ title, orgs }) {
    return (
        <div className="community-orgs">
            <h3 className="community-orgs-title">{title}</h3>
            <ul className="community-orgs-list">
                {orgs.map(org => {
                    const inner = (
                        <>
                            {org.logo && (
                                <img
                                    className={`community-org-logo${org.showName ? ' is-mark' : ''}`}
                                    src={org.logo}
                                    alt={org.name}
                                    loading="lazy"
                                />
                            )}
                            {(!org.logo || org.showName) && (
                                <span className="community-org-name">{org.name}</span>
                            )}
                        </>
                    );
                    return (
                        <li key={org.name}>
                            {org.href ? (
                                <a
                                    className="community-org"
                                    href={org.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title={org.name}
                                >
                                    {inner}
                                </a>
                            ) : (
                                <div className="community-org" title={org.name}>
                                    {inner}
                                </div>
                            )}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

export function CommunityFoot({ t }) {
    return (
        <>
            <OrgWall title={t.community.supportersTitle} orgs={SUPPORTERS} />
            <OrgWall title={t.community.partnersTitle} orgs={PARTNERS} />
        </>
    );
}
