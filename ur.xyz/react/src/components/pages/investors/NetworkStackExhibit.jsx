import React, { useEffect, useRef } from 'react';

/**
 * The letter's network-stack exhibit: the live product and three research
 * programmes over the shared subnet layer. The diagram is drawn at a fixed
 * 840px; on screens up to 900px wide it is scaled down to fit, and a tap
 * opens it in a zoomable dialog (pinch, drag, buttons, keys).
 *
 * The dialog shows the one diagram node, moved from the preview into the
 * dialog's canvas and back on close, rather than a second rendering of it,
 * so the scaled preview and the zoomed copy can never differ. React renders
 * the diagram once and never touches it again, so moving it is safe; the
 * effect's cleanup puts it back where React left it.
 */
export default function NetworkStackExhibit() {
    const figureRef = useRef(null);

    useEffect(() => {
        const figure = figureRef.current;
        const preview = figure.querySelector('[data-stack-preview]');
        const diagram = preview?.querySelector('.letter-stack');
        const openButton = figure.querySelector('[data-stack-open]');
        const dialog = figure.querySelector('.letter-stack-dialog');
        const dialogContent = figure.querySelector('[data-stack-dialog-content]');
        const dialogCanvas = figure.querySelector('[data-stack-dialog-canvas]');
        const closeButton = figure.querySelector('.letter-stack-dialog__close');
        const zoomOutButton = figure.querySelector('[data-stack-zoom-out]');
        const zoomFitButton = figure.querySelector('[data-stack-zoom-fit]');
        const zoomInButton = figure.querySelector('[data-stack-zoom-in]');

        if (!preview || !diagram || !openButton || !dialog || !dialogContent || !dialogCanvas ||
            typeof dialog.showModal !== 'function') return undefined;

        // Every listener shares one signal, so the cleanup (a route change, or
        // StrictMode's development double-mount) removes them all at once.
        const controller = new AbortController();
        const { signal } = controller;
        const listen = (target, type, handler, options) =>
            target.addEventListener(type, handler, { ...options, signal });

        const intrinsicWidth = parseFloat(getComputedStyle(figure).getPropertyValue('--stack-intrinsic-width'));
        const minimumZoom = 0.35;
        const maximumZoom = 2.5;
        let zoom = 1;
        let fitZoom = 1;
        let pinchDistance = 0;
        let pinchZoom = 1;
        let pinchAnchor = { x: 0, y: 0 };
        const pointers = new Map();

        const clampZoom = (value) => Math.min(maximumZoom, Math.max(Math.min(minimumZoom, fitZoom), value));

        const setZoom = (value) => {
            zoom = clampZoom(value);
            diagram.style.setProperty('--stack-dialog-scale', String(zoom));
            const width = Math.ceil(intrinsicWidth * zoom);
            const height = Math.ceil(diagram.offsetHeight * zoom);
            dialogCanvas.style.width = `${width}px`;
            dialogCanvas.style.height = `${height}px`;

            const styles = getComputedStyle(dialogContent);
            const availableHeight = dialogContent.clientHeight - parseFloat(styles.paddingTop) - parseFloat(styles.paddingBottom);
            const verticalMargin = Math.max(0, (availableHeight - height) / 2);
            dialogCanvas.style.marginBlock = `${verticalMargin}px`;

            if (zoomOutButton) zoomOutButton.disabled = zoom <= Math.min(minimumZoom, fitZoom) + 0.001;
            if (zoomInButton) zoomInButton.disabled = zoom >= maximumZoom - 0.001;
        };

        const zoomAroundCentre = (value) => {
            const previousZoom = zoom;
            const centreX = dialogContent.scrollLeft + (dialogContent.clientWidth / 2);
            const centreY = dialogContent.scrollTop + (dialogContent.clientHeight / 2);
            setZoom(value);
            dialogContent.scrollLeft = (centreX * (zoom / previousZoom)) - (dialogContent.clientWidth / 2);
            dialogContent.scrollTop = (centreY * (zoom / previousZoom)) - (dialogContent.clientHeight / 2);
        };

        const distanceBetween = ([first, second]) => Math.hypot(second.x - first.x, second.y - first.y);

        const fitPreview = () => {
            if (diagram.parentElement !== preview) return;
            const scale = Math.min(1, preview.clientWidth / intrinsicWidth);
            diagram.style.setProperty('--stack-preview-scale', String(scale));
            preview.style.height = `${Math.ceil(diagram.offsetHeight * scale)}px`;
        };

        const fitDialog = () => {
            if (!dialog.open || diagram.parentElement !== dialogCanvas) return;
            const styles = getComputedStyle(dialogContent);
            const availableWidth = dialogContent.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight);
            const availableHeight = dialogContent.clientHeight - parseFloat(styles.paddingTop) - parseFloat(styles.paddingBottom);
            fitZoom = Math.max(0.15, Math.min(1, availableWidth / intrinsicWidth, availableHeight / diagram.offsetHeight));
            setZoom(fitZoom);
            dialogContent.scrollTo({ top: 0, left: 0 });
        };

        const resizeObserver = new ResizeObserver(fitPreview);
        resizeObserver.observe(preview);
        resizeObserver.observe(diagram);
        fitPreview();
        document.fonts?.ready.then(() => { if (!signal.aborted) fitPreview(); });
        listen(window, 'resize', () => {
            if (dialog.open) requestAnimationFrame(fitDialog);
        }, { passive: true });

        listen(openButton, 'click', () => {
            dialogCanvas.append(diagram);
            if (!dialog.open) dialog.showModal();
            requestAnimationFrame(fitDialog);
            if (closeButton) closeButton.focus();
        });

        listen(dialog, 'close', () => {
            preview.append(diagram);
            requestAnimationFrame(fitPreview);
            openButton.focus();
        });

        listen(dialogContent, 'pointerdown', (event) => {
            if (event.pointerType !== 'touch') return;
            dialogContent.setPointerCapture(event.pointerId);
            pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

            if (pointers.size === 2) {
                const points = [...pointers.values()];
                const rect = dialogContent.getBoundingClientRect();
                const centreX = (points[0].x + points[1].x) / 2 - rect.left;
                const centreY = (points[0].y + points[1].y) / 2 - rect.top;
                pinchDistance = distanceBetween(points);
                pinchZoom = zoom;
                pinchAnchor = {
                    x: (dialogContent.scrollLeft + centreX) / zoom,
                    y: (dialogContent.scrollTop + centreY) / zoom,
                };
            }
        });

        listen(dialogContent, 'pointermove', (event) => {
            const previous = pointers.get(event.pointerId);
            if (!previous) return;

            const next = { x: event.clientX, y: event.clientY };
            pointers.set(event.pointerId, next);

            if (pointers.size === 1) {
                dialogContent.scrollLeft -= next.x - previous.x;
                dialogContent.scrollTop -= next.y - previous.y;
            } else if (pointers.size === 2 && pinchDistance > 0) {
                const points = [...pointers.values()];
                const rect = dialogContent.getBoundingClientRect();
                const centreX = (points[0].x + points[1].x) / 2 - rect.left;
                const centreY = (points[0].y + points[1].y) / 2 - rect.top;
                setZoom(pinchZoom * (distanceBetween(points) / pinchDistance));
                dialogContent.scrollLeft = (pinchAnchor.x * zoom) - centreX;
                dialogContent.scrollTop = (pinchAnchor.y * zoom) - centreY;
            }

            event.preventDefault();
        });

        const releasePointer = (event) => {
            pointers.delete(event.pointerId);
            if (pointers.size < 2) pinchDistance = 0;
        };

        listen(dialogContent, 'pointerup', releasePointer);
        listen(dialogContent, 'pointercancel', releasePointer);

        listen(dialogContent, 'dblclick', () => {
            zoomAroundCentre(Math.abs(zoom - fitZoom) < 0.05 ? 1 : fitZoom);
        });

        if (zoomOutButton) listen(zoomOutButton, 'click', () => zoomAroundCentre(zoom / 1.2));
        if (zoomFitButton) listen(zoomFitButton, 'click', () => zoomAroundCentre(fitZoom));
        if (zoomInButton) listen(zoomInButton, 'click', () => zoomAroundCentre(zoom * 1.2));

        listen(dialog, 'click', (event) => {
            if (event.target === dialog) dialog.close();
        });

        listen(dialog, 'keydown', (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                dialog.close();
            } else if (event.key === '+' || event.key === '=') {
                event.preventDefault();
                zoomAroundCentre(zoom * 1.2);
            } else if (event.key === '-') {
                event.preventDefault();
                zoomAroundCentre(zoom / 1.2);
            } else if (event.key === '0') {
                event.preventDefault();
                zoomAroundCentre(fitZoom);
            }
        });

        return () => {
            controller.abort();
            resizeObserver.disconnect();
            // Leave the DOM as React rendered it: dialog closed, diagram in
            // the preview.
            if (dialog.open) dialog.close();
            if (diagram.parentElement !== preview) preview.append(diagram);
        };
    }, []);

    return (
        <figure className="letter-exhibit letter-stack-exhibit" style={{ '--stack-intrinsic-width': '840px' }} ref={figureRef}>
            <figcaption id="network-stack-caption" className="letter-visually-hidden">The live ur.io product and three current research programmes all draw on the UR Subnet.</figcaption>
            <div className="letter-stack-frame">
                <div className="letter-stack-scroll" data-stack-preview="">
                <div className="letter-stack">
                    <div className="letter-stack__group-label letter-stack__group-label--live">Live product</div>
                    <div className="letter-stack__group-label letter-stack__group-label--research">Current research</div>

                    <section className="letter-stack__programme">
                        <strong>ur.io</strong>
                        <b>350k+ monthly active users</b>
                        <span>Live usage creates<br />network demand.</span>
                    </section>
                    <section className="letter-stack__programme">
                        <strong>Project Bastion</strong>
                        <span>How do we unlock<br />enterprise network<br />connectivity?</span>
                    </section>
                    <section className="letter-stack__programme">
                        <strong>Project Stargate</strong>
                        <span>Can one open index<br />support model training<br />and live retrieval?</span>
                    </section>
                    <section className="letter-stack__programme">
                        <strong>Project Meridian</strong>
                        <span>How do we create<br />dedicated identity<br />for agents?</span>
                    </section>

                    <div className="letter-stack__connector" aria-hidden="true">
                        <span></span><span></span><span></span><span></span>
                    </div>

                    <section className="letter-stack__subnet">
                        <div>
                            <span className="letter-stack__subnet-label">UR Subnet</span>
                            <strong>Shared provider and validation layer</strong>
                            <small>One infrastructure supports live demand and all three research programmes, through quality scoring and an incentive market.</small>
                        </div>
                        <div className="letter-stack__stat"><strong>100k+</strong><span>residential miners</span></div>
                        <div className="letter-stack__stat"><strong>100+</strong><span>countries</span></div>
                    </section>
                </div>
                </div>
                <button
                    className="letter-stack-expand"
                    type="button"
                    aria-haspopup="dialog"
                    aria-controls="network-stack-dialog"
                    aria-describedby="network-stack-caption"
                    aria-label="Open expanded network stack diagram"
                    data-stack-open=""
                ></button>
            </div>

            <dialog className="letter-stack-dialog" id="network-stack-dialog" aria-labelledby="network-stack-dialog-title">
                <div className="letter-stack-dialog__toolbar">
                    <span id="network-stack-dialog-title">Network stack</span>
                    <div className="letter-stack-dialog__actions">
                        <div className="letter-stack-dialog__zoom" role="group" aria-label="Diagram zoom controls">
                            <button type="button" aria-label="Zoom out" data-stack-zoom-out="">−</button>
                            <button type="button" aria-label="Fit diagram to window" data-stack-zoom-fit="">Fit</button>
                            <button type="button" aria-label="Zoom in" data-stack-zoom-in="">+</button>
                        </div>
                        <form method="dialog">
                            <button className="letter-stack-dialog__close" type="submit" aria-label="Close expanded diagram"></button>
                        </form>
                    </div>
                </div>
                <div
                    className="letter-stack-dialog__viewport"
                    role="group"
                    tabIndex={0}
                    aria-label="Zoomable network stack diagram. Pinch, drag, or use the zoom controls."
                    data-stack-dialog-content=""
                >
                    <div className="letter-stack-dialog__canvas" data-stack-dialog-canvas=""></div>
                </div>
            </dialog>
        </figure>
    );
}
