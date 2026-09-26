import React from 'react';
import Section from '../Section';
import { useLanguage } from '../../i18n';
import { ResearchCompetition, ResearchAreas, ResearchNotes, ResearchFoot } from '../ResearchExtras';

export default function Research() {
    const { t } = useLanguage();
    return (
        <Section id="research" eyebrow={t.research.eyebrow} title={t.research.title} headingLevel="h1">
            <ResearchCompetition t={t} />
            <p>{t.research.intro}</p>
            <ResearchAreas t={t} />
            <ResearchNotes t={t} />
            <ResearchFoot t={t} />
        </Section>
    );
}
