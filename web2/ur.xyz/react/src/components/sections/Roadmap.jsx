import React from 'react';
import Section from '../Section';
import RoadmapTrack from '../RoadmapTrack';
import { useLanguage } from '../../i18n';
import en from '../../i18n/en';

/**
 * Roadmap — a standalone page (like Usage Cost): the shared section shell plus
 * the vertical track of phases. Localized dictionaries only need the short nav
 * label; the body copy falls back to English until translated, mirroring the
 * Astro `t[section] || en[section]` idiom.
 */
export default function Roadmap() {
    const { t } = useLanguage();
    const data = t.roadmap || en.roadmap;
    return (
        <Section id="roadmap" eyebrow={data.eyebrow} title={data.title}>
            <p>{data.intro}</p>
            <RoadmapTrack data={data} />
        </Section>
    );
}
