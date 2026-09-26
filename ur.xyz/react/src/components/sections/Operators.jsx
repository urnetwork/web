import React from 'react';
import Section from '../Section';
import NetworkDiagram from '../NetworkDiagram';
import OperatorsDirectory from '../OperatorsDirectory';
import { useLanguage } from '../../i18n';
import { EXTERNAL, isExternal } from '../../lib/links';

export default function Operators() {
    const { t, code } = useLanguage();
    const s = t.operators;
    return (
        <Section id="operators" eyebrow={s.eyebrow} title={s.title} headingLevel="h1">
            <p>{s.intro}</p>
            <NetworkDiagram active="operators" lang={code} ctaLabel={s.cta} />
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
            <OperatorsDirectory />
        </Section>
    );
}
