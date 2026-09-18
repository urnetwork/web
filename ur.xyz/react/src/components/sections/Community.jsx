import React from 'react';
import Section from '../Section';
import { useLanguage } from '../../i18n';
import { CommunityFoot } from '../CommunityFoot';

export default function Community() {
    const { t } = useLanguage();
    return (
        <Section id="community" eyebrow={t.community.eyebrow} title={t.community.title}>
            <p>{t.community.intro}</p>

            <div className="card-grid">
                {t.community.items.map(r => (
                    <div className="card" key={r.tag}>
                        <div className="card-eyebrow">{r.tag}</div>
                        <h3 className="card-title">{r.title}</h3>
                        <p className="card-body">{r.body}</p>
                        {r.href && (
                            <a
                                href={r.href}
                                className="card-link"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {r.linkLabel}
                            </a>
                        )}
                        {r.soon && <span className="card-soon">{r.soon}</span>}
                        {r.button && (
                            r.button.href ? (
                                <a
                                    href={r.button.href}
                                    className="card-button"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {r.button.label}
                                </a>
                            ) : (
                                <span className="card-button is-disabled">{r.button.label}</span>
                            )
                        )}
                    </div>
                ))}
            </div>

            <CommunityFoot t={t} />
        </Section>
    );
}
