import React from 'react';
import './RoadmapTrack.css';

/**
 * RoadmapTrack — the vertical timeline that carries the roadmap phases.
 *
 * Presentational and prop-driven (the roadmap dict is passed as `data`), with
 * no hooks or browser APIs — so the Astro build renders it to static HTML per
 * language and the React SPA reuses the exact same markup, keeping the two
 * renders pixel-identical. Each phase is a "stop" on a single hairline running
 * down the page: a node, a phase label with its timeframe, a title, a body.
 */
export default function RoadmapTrack({ data }) {
    return (
        <ol className="roadmap">
            {data.phases.map((p) => (
                <li className="roadmap-stop" key={p.no}>
                    <span className="roadmap-node" aria-hidden="true" />
                    <div className="roadmap-content">
                        <div className="roadmap-meta">
                            <span className="roadmap-phase">{data.phaseLabel} {p.no}</span>
                            <span className="roadmap-sep" aria-hidden="true">·</span>
                            <span className="roadmap-date">{p.date}</span>
                            {p.flag && <span className="roadmap-flag">{p.flag}</span>}
                        </div>
                        <h3 className="roadmap-title">{p.title}</h3>
                        <p className="roadmap-body">{p.body}</p>
                    </div>
                </li>
            ))}
        </ol>
    );
}
