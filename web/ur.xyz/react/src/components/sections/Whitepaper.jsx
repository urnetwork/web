import React from 'react';
import Section from '../Section';
import { useLanguage } from '../../i18n';

export default function Whitepaper() {
    const { t } = useLanguage();
    return (
        <Section
            id="whitepaper"
            eyebrow={t.whitepaper.eyebrow}
            title={t.whitepaper.title}
            variant="whitepaper"
        >
            <div className="article-grid">
                {t.whitepaper.clauses.map(c => (
                    <article className="article-clause" key={c.numeral}>
                        <div className="article-numeral">{c.numeral}</div>
                        <div className="article-body">
                            <h3 className="article-title">{c.title}</h3>
                            {c.body.map((p, i) => <p key={i}>{p}</p>)}
                        </div>
                    </article>
                ))}
            </div>
        </Section>
    );
}
