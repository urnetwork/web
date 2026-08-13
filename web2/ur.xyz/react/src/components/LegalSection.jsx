import React from 'react';
import Section from './Section';
import { useLanguage } from '../i18n';
import { LEGAL_DOCS } from '../data/legal';
import './Legal.css';

/**
 * LegalSection — a legal document page (terms | privacy | vdp). The full
 * documents render from the generated react/src/data/legal.js; the canonical
 * text lives in docs/legal/*.md. English only by design — a translated
 * contract would be a different contract — so only the chrome (eyebrow) is
 * localized.
 */
export default function LegalSection({ doc }) {
    const { t } = useLanguage();
    const d = LEGAL_DOCS[doc];
    return (
        <Section id={doc} eyebrow={t.legal.eyebrow} title={d.title}>
            {d.updated && <p className="legal-updated">Last revised: {d.updated}</p>}
            {/* build-time trusted content: our own documents, our own converter */}
            <div className="legal-doc" dangerouslySetInnerHTML={{ __html: d.html }} />
        </Section>
    );
}
