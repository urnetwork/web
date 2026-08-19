import React, { useCallback, useEffect, useRef, useState } from 'react';
import './LaunchVideo.css';
import { useLanguage } from '../i18n';

/**
 * LaunchVideo
 *
 * Cinematic full-screen overlay for the launch film. Auto-opens once per
 * visitor on the home page — localStorage remembers a dismissal (or a full
 * watch) so it never auto-opens again. Fades in from black, and closes on
 * ✕, backdrop click, Escape, or when the film ends.
 *
 * `/#launch-video` — the "Launch video" footer link on every page — re-opens
 * it on demand: the overlay reacts to that hash both on load (arriving from
 * another page) and on hashchange (clicking the link on the home page).
 *
 * Autoplay policy: an auto-open carries no user gesture, so the first play
 * attempt with sound is rejected and playback falls back to muted behind a
 * "tap for sound" pill. Opening from the footer link carries a user
 * activation, so sound starts on. Auto-open is skipped for visitors who
 * prefer reduced motion or have data saver on — the footer link still works.
 */

export const LAUNCH_VIDEO_HASH = '#launch-video';

const DISMISS_KEY = 'ur.xyz.launchVideoDismissed';
const VIDEO_SRC = '/launch-video.mp4';
const POSTER_SRC = '/launch-video-poster.jpg';
const CLOSE_MS = 480; // keep in sync with the .lv-overlay.is-closing animation

function wasDismissed() {
    try { return window.localStorage.getItem(DISMISS_KEY) === '1'; } catch (e) { return false; }
}
function rememberDismissed() {
    try { window.localStorage.setItem(DISMISS_KEY, '1'); } catch (e) { /* private mode */ }
}

// Fullscreen API with the WebKit-prefixed fallbacks Safari still needs.
function fullscreenElement() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
}
function exitFullscreen() {
    if (!fullscreenElement()) return;
    if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
}

export default function LaunchVideo() {
    const { t } = useLanguage();
    const [phase, setPhase] = useState(null); // null | 'open' | 'closing'
    const [muted, setMuted] = useState(false);
    const [paused, setPaused] = useState(true);
    const [started, setStarted] = useState(false); // playback began at least once
    const [blocked, setBlocked] = useState(false); // even muted autoplay refused
    const [fullscreen, setFullscreen] = useState(false);
    const overlayRef = useRef(null);
    const frameRef = useRef(null);
    const videoRef = useRef(null);
    const progressRef = useRef(null);
    const closeTimer = useRef(null);
    const returnFocus = useRef(null);

    const open = useCallback(() => {
        clearTimeout(closeTimer.current);
        returnFocus.current = document.activeElement;
        setMuted(false);
        setPaused(true);
        setStarted(false);
        setBlocked(false);
        setFullscreen(false);
        setPhase('open');
    }, []);

    const dismiss = useCallback(() => {
        rememberDismissed();
        exitFullscreen();
        if (videoRef.current) videoRef.current.pause();
        if (window.location.hash === LAUNCH_VIDEO_HASH) {
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
        setPhase((p) => (p ? 'closing' : p));
        clearTimeout(closeTimer.current);
        closeTimer.current = setTimeout(() => setPhase(null), CLOSE_MS);
        const back = returnFocus.current;
        if (back && back.focus) back.focus({ preventScroll: true });
    }, []);

    // First view: auto-open unless previously dismissed. The footer link
    // always opens — on load and on in-page hash change.
    useEffect(() => {
        const openIfHash = () => { if (window.location.hash === LAUNCH_VIDEO_HASH) open(); };
        window.addEventListener('hashchange', openIfHash);
        let autoTimer = null;
        if (window.location.hash === LAUNCH_VIDEO_HASH) {
            open();
        } else if (
            !wasDismissed() &&
            !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
            !(navigator.connection && navigator.connection.saveData)
        ) {
            autoTimer = setTimeout(open, 700);
        }
        return () => {
            window.removeEventListener('hashchange', openIfHash);
            clearTimeout(autoTimer);
            clearTimeout(closeTimer.current);
        };
    }, [open]);

    // While open: lock page scroll (compensating the scrollbar width so the
    // page never shifts), close on Escape, keep Tab inside the dialog, and
    // start playback — with sound when allowed, muted otherwise.
    useEffect(() => {
        if (phase !== 'open') return undefined;

        const doc = document.documentElement;
        const scrollbar = window.innerWidth - doc.clientWidth;
        const prevOverflow = doc.style.overflow;
        const prevPadding = doc.style.paddingRight;
        doc.style.overflow = 'hidden';
        if (scrollbar > 0) doc.style.paddingRight = `${scrollbar}px`;

        const onKey = (e) => {
            if (e.key === 'Escape') {
                // First Escape leaves fullscreen (browsers do this natively;
                // exit explicitly too), the next one closes the overlay.
                if (fullscreenElement()) exitFullscreen();
                else dismiss();
                return;
            }
            if (e.key !== 'Tab' || !overlayRef.current) return;
            const items = overlayRef.current.querySelectorAll('button');
            if (!items.length) return;
            const first = items[0];
            const last = items[items.length - 1];
            const active = document.activeElement;
            if (active === overlayRef.current) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
            else if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
        };
        const onFsChange = () => setFullscreen(!!fullscreenElement());
        document.addEventListener('keydown', onKey);
        document.addEventListener('fullscreenchange', onFsChange);
        document.addEventListener('webkitfullscreenchange', onFsChange);
        if (overlayRef.current) overlayRef.current.focus({ preventScroll: true });

        let cancelled = false;
        const v = videoRef.current;
        (async () => {
            if (!v) return;
            v.muted = false;
            try {
                await v.play();
            } catch (err) {
                v.muted = true;
                try {
                    await v.play();
                } catch (err2) {
                    if (!cancelled) setBlocked(true);
                }
            }
        })();

        return () => {
            cancelled = true;
            document.removeEventListener('keydown', onKey);
            document.removeEventListener('fullscreenchange', onFsChange);
            document.removeEventListener('webkitfullscreenchange', onFsChange);
            doc.style.overflow = prevOverflow;
            doc.style.paddingRight = prevPadding;
        };
    }, [phase, dismiss]);

    if (!phase) return null;

    const unmute = () => {
        if (videoRef.current) videoRef.current.muted = false;
    };

    const onVideoClick = () => {
        const v = videoRef.current;
        if (!v) return;
        if (v.paused) v.play().catch(() => {});
        else if (v.muted) unmute();
        else v.pause();
    };

    const onPlayClick = () => {
        const v = videoRef.current;
        if (!v) return;
        setBlocked(false);
        v.muted = false;
        v.play().catch(() => {});
    };

    const onTimeUpdate = () => {
        const v = videoRef.current;
        const bar = progressRef.current;
        if (v && bar && v.duration) bar.style.transform = `scaleX(${v.currentTime / v.duration})`;
    };

    const onBackdrop = (e) => {
        if (e.target.closest('[data-lv-keep]')) return;
        dismiss();
    };

    // Fullscreen the frame (keeps the custom controls) where element
    // fullscreen exists; iPhone Safari only fullscreens the video itself.
    const toggleFullscreen = () => {
        if (fullscreenElement()) { exitFullscreen(); return; }
        const frame = frameRef.current;
        const v = videoRef.current;
        if (frame && frame.requestFullscreen) frame.requestFullscreen().catch(() => {});
        else if (frame && frame.webkitRequestFullscreen) frame.webkitRequestFullscreen();
        else if (v && v.webkitEnterFullscreen) v.webkitEnterFullscreen();
    };

    const showPlay = phase === 'open' && (blocked || (paused && started));

    // The ✕ lives at the overlay level, but a fullscreened frame sits in the
    // browser's top layer above it — so while fullscreen, the button renders
    // inside the frame instead (same screen corner, still clickable).
    const closeButton = (
        <button type="button" className="lv-close" data-lv-keep onClick={dismiss} aria-label={t.launchVideo.close}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12 19 6.4 17.6 5 12 10.6 6.4 5z" /></svg>
        </button>
    );

    return (
        <div
            ref={overlayRef}
            className={`lv-overlay ${phase === 'closing' ? 'is-closing' : 'is-open'}`}
            role="dialog"
            aria-modal="true"
            aria-label={t.launchVideo.aria}
            tabIndex={-1}
            onClick={onBackdrop}
        >
            <div className="lv-frame" data-lv-keep ref={frameRef}>
                {/* eslint-disable-next-line jsx-a11y/media-has-caption -- the film subtitles are burned in */}
                <video
                    ref={videoRef}
                    className="lv-video"
                    src={VIDEO_SRC}
                    poster={POSTER_SRC}
                    preload="auto"
                    playsInline
                    onClick={onVideoClick}
                    onPlay={() => { setPaused(false); setStarted(true); }}
                    onPause={() => setPaused(true)}
                    onEnded={dismiss}
                    onTimeUpdate={onTimeUpdate}
                    onVolumeChange={() => setMuted(videoRef.current ? videoRef.current.muted : false)}
                />
                <div className="lv-progress" aria-hidden="true"><div ref={progressRef} className="lv-progress-fill" /></div>
                {showPlay && (
                    <button type="button" className="lv-play" onClick={onPlayClick} aria-label={t.launchVideo.play}>
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.3v13.4L19 12z" /></svg>
                    </button>
                )}
                {phase === 'open' && muted && !paused && (
                    <button type="button" className="lv-sound" onClick={unmute}>
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 4.5v-15L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zm-2.5-8.6v2.1a6.5 6.5 0 0 1 0 13v2.1a8.6 8.6 0 0 0 0-17.2z" /></svg>
                        {t.launchVideo.sound}
                    </button>
                )}
                {phase === 'open' && (
                    <button
                        type="button"
                        className="lv-fullscreen"
                        onClick={toggleFullscreen}
                        aria-label={fullscreen ? t.launchVideo.exitFullscreen : t.launchVideo.fullscreen}
                    >
                        {fullscreen
                            ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4v5H4V7h3V4h2zm11 3v2h-5V4h2v3h3zM4 15h5v5H7v-3H4v-2zm13 0h3v2h-3v3h-2v-5h2z" /></svg>
                            : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5v2H6v3H4zm11-5h5v5h-2V6h-3V4zM4 15h2v3h3v2H4v-5zm14 3v-3h2v5h-5v-2h3z" /></svg>}
                    </button>
                )}
                {fullscreen && closeButton}
            </div>
            {!fullscreen && closeButton}
        </div>
    );
}
