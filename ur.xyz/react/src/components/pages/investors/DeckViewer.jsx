import React, { useEffect, useRef, useState } from 'react';
import { investorCentre } from '../../../data/investors';
import './DeckViewer.css';

/**
 * The investor deck (/investors/deck), viewable in the browser. Slides are
 * served as images from /investors/deck/, so viewing the deck downloads
 * nothing but the page's own assets: no third-party embed, and nothing that
 * would put a Google host into the network-privacy test's contacted-hosts
 * list.
 *
 * Only the current slide and the next one are in the page. The slides sit
 * stacked in one stage, so a hidden slide is still "in the viewport" and
 * loading="lazy" never deferred it: every slide downloaded with the page.
 * Now slide 1 loads first (fetchpriority high), the next one quietly behind
 * it, and each move brings in the one after. Every slide offers a 1280 px and a
 * 2560 px file, and the deck's text follows the viewer as an outline, so the
 * page reads without the images.
 *
 * The first slide and its controls are rendered from props and the initial
 * state, so the server render (the Astro page hydrates this component) and
 * the first client render agree; the deep link in the hash, the keyboard and
 * fullscreen are applied in effects and handlers.
 */

const { deck } = investorCentre;
const total = deck.slideCount;
const pad = (n) => String(n).padStart(2, '0');
const clamp = (n) => Math.min(Math.max(n, 1), total);
const file = (n, width) => `${deck.slideBase}/${pad(n)}${width === deck.slideWidth ? '' : `-${width}`}.${deck.slideExt}`;
const slides = Array.from({ length: total }, (_, i) => {
    const n = i + 1;
    const text = deck.slides?.[i] || {};
    return {
        n,
        title: text.title || `Slide ${n}`,
        headline: text.headline || '',
        summary: text.summary || '',
        alt: text.alt || `Slide ${n} of ${total}`,
        src: file(n, deck.slideWidth),
        srcSet: `${file(n, deck.slideSmallWidth)} ${deck.slideSmallWidth}w, ${file(n, deck.slideWidth)} ${deck.slideWidth}w`,
    };
});
// the stage's width (--deck-shell in DeckViewer.css), for picking a file
const STAGE_SIZES = '(max-width: 720px) calc(100vw - 40px), (max-width: 1244px) calc(100vw - 64px), 1180px';

function slideFromHash() {
    const n = Number(window.location.hash.slice(1));
    return Number.isInteger(n) && n > 0 ? n : 1;
}

export default function DeckViewer() {
    const [current, setCurrent] = useState(1);
    const stageRef = useRef(null);
    const railRef = useRef(null);
    // The keyboard handler is registered once and reads the slide from here.
    const currentRef = useRef(1);
    // How the latest move was asked for: a user move records the slide in the
    // hash and may scroll the tick rail smoothly; the initial and hash-driven
    // moves do neither.
    const moveRef = useRef({ pushHash: false });

    const show = (n, pushHash = true) => {
        const next = clamp(n);
        moveRef.current = { pushHash };
        currentRef.current = next;
        setCurrent(next);
    };

    const toggleFullscreen = () => {
        if (document.fullscreenElement) document.exitFullscreen();
        else stageRef.current?.requestFullscreen?.();
    };

    // After each move: keep the active tick in view when the rail scrolls
    // (phones), and record the slide in the hash so the page can be shared
    // open on it.
    useEffect(() => {
        const { pushHash } = moveRef.current;
        const rail = railRef.current;
        const activeTick = rail?.children[current - 1];
        if (rail && activeTick && rail.scrollWidth > rail.clientWidth) {
            const left = activeTick.offsetLeft - ((rail.clientWidth - activeTick.offsetWidth) / 2);
            rail.scrollTo({
                left: Math.max(0, left),
                behavior: pushHash && !window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'auto',
            });
        }
        if (pushHash) window.history.replaceState(null, '', `#${current}`);
    }, [current]);

    useEffect(() => {
        const onKeydown = (event) => {
            if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
            const at = currentRef.current;
            if (event.key === 'ArrowRight' || event.key === 'PageDown') { event.preventDefault(); show(at + 1); }
            else if (event.key === 'ArrowLeft' || event.key === 'PageUp') { event.preventDefault(); show(at - 1); }
            else if (event.key === 'Home') { event.preventDefault(); show(1); }
            else if (event.key === 'End') { event.preventDefault(); show(total); }
            else if (event.key === 'f' || event.key === 'F') { event.preventDefault(); toggleFullscreen(); }
        };
        // Deep link: /investors/deck#7 opens on that slide. Also honour a hash
        // that changes while the page is open, so following a #7 link from
        // someone who is already here moves the deck instead of doing nothing:
        // that is a same-document navigation and never re-runs an effect.
        const onHashchange = () => show(slideFromHash(), false);

        document.addEventListener('keydown', onKeydown);
        window.addEventListener('hashchange', onHashchange);
        show(slideFromHash(), false);

        return () => {
            document.removeEventListener('keydown', onKeydown);
            window.removeEventListener('hashchange', onHashchange);
        };
    }, []);

    return (
        <div className="deck-page">
            <div className="deck-shell deck-back-row">
                <a className="deck-back" href="/investors"><span aria-hidden="true">←</span> Investor Centre</a>
            </div>

            <header className="deck-heading deck-shell">
                <h1>{deck.title}</h1>
                <div className="deck-meta">
                    <time dateTime={deck.dateIso}>{deck.date}</time>
                    <span>{`${deck.slideCount} slides`}</span>
                    <a className="deck-download" href={deck.pdfHref} download>
                        Download PDF <i aria-hidden="true">↓</i>
                    </a>
                </div>
            </header>

            <div className="deck-shell">
                <div className="deck-stage" id="deck-stage" ref={stageRef}>
                    {/* The current slide, and the next one loading behind it
                        (invisible, and hidden from assistive tech until shown).
                        Keyed by slide, so the next slide's element is the one
                        that becomes current. */}
                    {slides.slice(current - 1, current + 1).map(s => {
                        const shown = s.n === current;
                        return (
                            <img
                                key={s.n}
                                className={shown ? 'deck-slide is-current' : 'deck-slide'}
                                src={s.src}
                                srcSet={s.srcSet}
                                sizes={STAGE_SIZES}
                                alt={s.alt}
                                aria-hidden={shown ? undefined : 'true'}
                                data-slide={s.n}
                                width={deck.slideWidth}
                                height={deck.slideHeight}
                                fetchpriority={shown ? (s.n === 1 ? 'high' : undefined) : 'low'}
                                decoding={s.n === 1 ? undefined : 'async'}
                            />
                        );
                    })}
                    <button className="deck-hit deck-hit--prev" type="button" data-deck-prev="" aria-label="Previous slide" disabled={current === 1} onClick={() => show(current - 1)}></button>
                    <button className="deck-hit deck-hit--next" type="button" data-deck-next="" aria-label="Next slide" disabled={current === total} onClick={() => show(current + 1)}></button>
                </div>

                <div className="deck-controls">
                    <button className="deck-arrow" type="button" data-deck-prev="" aria-label="Previous slide" disabled={current === 1} onClick={() => show(current - 1)}>←</button>
                    <button className="deck-arrow" type="button" data-deck-next="" aria-label="Next slide" disabled={current === total} onClick={() => show(current + 1)}>→</button>
                    <span className="deck-count" data-deck-count="" aria-live="polite">{`${pad(current)} / ${pad(total)}`}</span>
                    {/* A group of jump buttons, not a tablist: the slides are
                        not tabpanels, and claiming tab semantics without them
                        makes a screen reader announce controls it cannot then
                        resolve. */}
                    <div className="deck-ticks" role="group" aria-label="Jump to slide" ref={railRef}>
                        {slides.map(s => (
                            <button
                                key={s.n}
                                className={s.n === current ? 'deck-tick is-current' : 'deck-tick'}
                                type="button"
                                data-deck-go={s.n}
                                aria-label={`Go to slide ${s.n}`}
                                aria-current={s.n === current ? 'true' : undefined}
                                onClick={() => show(s.n)}
                            ></button>
                        ))}
                    </div>
                    <button className="deck-fullscreen" type="button" data-deck-fullscreen="" onClick={toggleFullscreen}>Fullscreen</button>
                </div>

                <p className="deck-hint">
                    Use <kbd>←</kbd> <kbd>→</kbd> to move through the deck, <kbd>F</kbd> for fullscreen.
                </p>
            </div>

            {/* The deck as text: what each slide says. */}
            <section className="deck-shell deck-outline" aria-labelledby="deck-outline-title">
                <h2 id="deck-outline-title">In this deck</h2>
                <ol className="deck-outline-list">
                    {slides.map(s => (
                        <li key={s.n}>
                            <span className="deck-outline-label">{`${pad(s.n)} · ${s.title}`}</span>
                            {s.headline && <h3>{s.headline}</h3>}
                            {s.summary && <p>{s.summary}</p>}
                        </li>
                    ))}
                </ol>
            </section>

            <div className="deck-shell deck-outro">
                <a className="deck-back" href="/investors"><span aria-hidden="true">←</span> Back to Investor Centre</a>
            </div>
        </div>
    );
}
