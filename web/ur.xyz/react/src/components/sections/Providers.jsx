import React from 'react';
import Section from '../Section';
import { useLanguage } from '../../i18n';

export default function Providers() {
    const { t } = useLanguage();
    return (
        <Section id="providers" eyebrow={t.providers.eyebrow} title={t.providers.title}>
            <p>{t.providers.intro}</p>

            <div className="card-grid">
                {t.providers.roles.map(r => (
                    <div className="card" key={r.tag}>
                        <div className="card-eyebrow">{r.tag}</div>
                        <h3 className="card-title">{r.title}</h3>
                        <p className="card-body">{r.body}</p>
                    </div>
                ))}
            </div>
        </Section>
    );
}
