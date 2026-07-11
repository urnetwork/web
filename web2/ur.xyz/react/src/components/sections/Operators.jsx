import React from 'react';
import Section from '../Section';
import NetworkDiagram from '../NetworkDiagram';
import OperatorsDirectory from '../OperatorsDirectory';
import { useLanguage } from '../../i18n';

export default function Operators() {
    const { t, code } = useLanguage();
    const s = t.operators;
    return (
        <Section id="operators" eyebrow={s.eyebrow} title={s.title}>
            <p>{s.intro}</p>
            <NetworkDiagram active="operators" lang={code} ctaLabel={s.cta} />
            <div className="card-grid">
                {s.roles.map(r => (
                    <div className="card" key={r.tag}>
                        <div className="card-eyebrow">{r.tag}</div>
                        <h3 className="card-title">{r.title}</h3>
                        <p className="card-body">{r.body}</p>
                        {r.href && (
                            <a href={r.href} className="card-link" target="_blank" rel="noopener noreferrer">
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
