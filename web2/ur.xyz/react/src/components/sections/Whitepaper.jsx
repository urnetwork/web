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
                            {c.body.map((b, i) =>
                                typeof b === 'string'
                                    ? <p key={i}>{b}</p>
                                    : b.type === 'table'
                                    ? <ClauseTable key={i} head={b.head} rows={b.rows} />
                                    : b.type === 'list'
                                    ? <ClauseList key={i} items={b.items} />
                                    : null
                            )}
                        </div>
                    </article>
                ))}
            </div>
        </Section>
    );
}

function ClauseTable({ head, rows }) {
    return (
        <div className="article-table-wrap">
            <table className="article-table">
                <thead>
                    <tr>{head.map((h, i) => <th key={i}>{h}</th>)}</tr>
                </thead>
                <tbody>
                    {rows.map((row, r) => (
                        <tr key={r}>{row.map((cell, c) => <td key={c}>{cell}</td>)}</tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function ClauseList({ items }) {
    return (
        <ul className="article-list">
            {items.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
    );
}
