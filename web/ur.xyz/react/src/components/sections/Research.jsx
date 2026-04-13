import React from 'react';
import Section from '../Section';
import { useLanguage } from '../../i18n';

export default function Research() {
    const { t } = useLanguage();
    return (
        <Section id="research" eyebrow={t.research.eyebrow} title={t.research.title}>
            <p>{t.research.intro}</p>

            <div className="card-grid">
                {t.research.papers.map(p => (
                    <div className="card" key={p.tag}>
                        <div className="card-eyebrow">{p.tag}</div>
                        <h3 className="card-title">{p.title}</h3>
                        <p className="card-body">{p.body}</p>
                        {p.href && (
                            <a
                                href={p.href}
                                className="card-link"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {p.linkLabel}
                            </a>
                        )}
                    </div>
                ))}
            </div>
        </Section>
    );
}
