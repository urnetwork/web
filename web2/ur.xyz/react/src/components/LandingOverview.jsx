import React from 'react';
import NetworkDiagram from './NetworkDiagram';
import { useLanguage } from '../i18n';
import { buildPath } from '../router';
import './LandingOverview.css';

const ROLE_ROUTES = ['operators', 'miners', 'validators'];

export default function LandingOverview() {
    const { code, t } = useLanguage();

    return (
        <section className="landing-overview" aria-label={t.homepage.diagramAria}>
            <NetworkDiagram active="subnet" lang={code} />
            <section className="roles" aria-labelledby="roles-title-react">
                <div className="roles-heading">
                    <p className="roles-eyebrow">{t.homepage.rolesEyebrow}</p>
                    <h2 id="roles-title-react">{t.homepage.rolesTitle}</h2>
                </div>
                <div className="roles-grid">
                    {ROLE_ROUTES.map((route, index) => {
                        const role = t.homepage.roles[route];
                        return (
                            <article className="role-card" key={route}>
                                <p className="role-number">{String(index + 1).padStart(2, '0')}</p>
                                <h3>{role.name}</h3>
                                <p>{role.body}</p>
                                <a href={buildPath({ name: route, slug: null }, code)}>
                                    {role.explore} <span aria-hidden="true">→</span>
                                </a>
                            </article>
                        );
                    })}
                </div>
                <a className="roles-cta" href={buildPath({ name: 'docs', slug: 'litepaper' }, code)}>
                    {t.homepage.whitepaperCta} <span aria-hidden="true">→</span>
                </a>
            </section>
        </section>
    );
}
