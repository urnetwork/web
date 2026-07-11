import React from 'react';
import Section from '../Section';
import { useLanguage } from '../../i18n';
import { ResearchCompetition, ResearchCardGrid, ResearchFoot } from '../ResearchExtras';

export default function Research() {
    const { t } = useLanguage();
    return (
        <Section id="research" eyebrow={t.research.eyebrow} title={t.research.title}>
            <ResearchCompetition t={t} />
            <p>{t.research.intro}</p>
            <ResearchCardGrid t={t} />
            <ResearchFoot t={t} />
        </Section>
    );
}
