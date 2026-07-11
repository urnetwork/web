import React from 'react';
import Section from './Section';
import { useLanguage } from '../i18n';

/**
 * LegalSection — a legal document page (terms | privacy | vdp). The full
 * documents are being finalized; until then each page carries a short,
 * honest placeholder from the dictionaries.
 */
export default function LegalSection({ doc }) {
    const { t } = useLanguage();
    const d = t.legal[doc];
    return (
        <Section id={doc} eyebrow={t.legal.eyebrow} title={d.title}>
            <p>{d.body}</p>
        </Section>
    );
}
