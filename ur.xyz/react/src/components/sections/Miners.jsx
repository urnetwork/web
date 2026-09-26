import React from 'react';
import Section from '../Section';
import NetworkDiagram from '../NetworkDiagram';
import MinerSim from '../MinerSim';
import MinerGlobeIntro from '../MinerGlobeIntro';
import { useLanguage } from '../../i18n';
import { EXTERNAL, isExternal } from '../../lib/links';

export default function Miners() {
    const { t, code } = useLanguage();
    const s = t.miners;
    return (
        <Section id="miners" eyebrow={s.eyebrow} title={s.title} headingLevel="h1">
            <MinerGlobeIntro alt={s.globeAlt} labels={s.globeLabels} />
            <p>{s.intro}</p>
            <p>{s.both}</p>
            <p>{s.goal}</p>
            <NetworkDiagram active="miners" lang={code} ctaLabel={s.cta} />
            <div className="card-grid">
                {s.roles.map(r => (
                    <div className="card" key={r.tag}>
                        <div className="card-eyebrow">{r.tag}</div>
                        <h2 className="card-title">{r.title}</h2>
                        <p className="card-body">{r.body}</p>
                        {r.href && (
                            // only an external link opens a new tab; a guide on this site opens in place
                            <a href={r.href} className="card-link" {...(isExternal(r.href) ? EXTERNAL : {})}>
                                {r.linkLabel}
                            </a>
                        )}
                    </div>
                ))}
            </div>
            <MinerSim />
        </Section>
    );
}
