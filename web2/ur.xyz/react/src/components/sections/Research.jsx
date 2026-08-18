import React from 'react';
import Section from '../Section';
import { useLanguage } from '../../i18n';
import { buildPath } from '../../router';
import { ResearchCompetition, ResearchDocsLink, ResearchCardGrid, ResearchFoot } from '../ResearchExtras';

export default function Research() {
    const { t, code } = useLanguage();
    return (
        <Section id="research" eyebrow={t.research.eyebrow} title={t.research.title}>
            <ResearchCompetition t={t} />
            <p>{t.research.intro}</p>
            <ResearchDocsLink t={t} href={buildPath({ name: 'docs', slug: 'protocol/protocol-research' }, code)} />
            <ResearchCardGrid t={t} />
            <ResearchFoot t={t} />
        </Section>
    );
}
