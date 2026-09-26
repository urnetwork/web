import React from 'react';
import Section from '../Section';
import NetworkDiagram from '../NetworkDiagram';
import ValidatorSim from '../ValidatorSim';
import { useLanguage } from '../../i18n';
import { EXTERNAL, isExternal } from '../../lib/links';

export default function Validators() {
    const { t, code } = useLanguage();
    const s = t.validators;
    return (
        <Section id="validators" eyebrow={s.eyebrow} title={s.title} headingLevel="h1">
            <p>{s.intro}</p>
            <NetworkDiagram active="validators" lang={code} ctaLabel={s.cta} />
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
            <ValidatorSim />
        </Section>
    );
}
