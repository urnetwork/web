import React from 'react';
import Section from '../Section';
import { useLanguage } from '../../i18n';

export default function Usage() {
    const { t } = useLanguage();
    return (
        <Section id="usage" eyebrow={t.usage.eyebrow} title={t.usage.title}>
            <p>{t.usage.intro}</p>

            <div className="card-grid">
                {t.usage.roles.map(r => (
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
