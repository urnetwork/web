import React from 'react';
import Section from '../Section';
import { useLanguage } from '../../i18n';

export default function Extenders() {
    const { t } = useLanguage();
    return (
        <Section id="extenders" eyebrow={t.extenders.eyebrow} title={t.extenders.title}>
            <p>{t.extenders.intro}</p>

            <div className="card-grid">
                {t.extenders.roles.map(r => (
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
