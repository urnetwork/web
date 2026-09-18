import React from 'react';
import Section from '../Section';
import { useLanguage } from '../../i18n';

export default function Exchanges() {
    const { t } = useLanguage();
    return (
        <Section id="exchanges" eyebrow={t.exchanges.eyebrow} title={t.exchanges.title}>
            <p>{t.exchanges.intro}</p>

            <div className="card-grid">
                {t.exchanges.roles.map(r => (
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
