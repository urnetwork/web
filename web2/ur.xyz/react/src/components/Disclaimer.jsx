import React, { useEffect, useState } from 'react';
import './Disclaimer.css';

/**
 * Hook that tracks whether the disclaimer bar should be visible (i.e.
 * the page is scrolled to the top). Shared between Disclaimer and Nav
 * so they stay in sync.
 */
export function useDisclaimerVisible() {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        let raf = 0;
        const onScroll = () => {
            if (raf) return;
            raf = requestAnimationFrame(() => {
                raf = 0;
                setVisible(window.scrollY <= 8);
            });
        };
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', onScroll);
            if (raf) cancelAnimationFrame(raf);
        };
    }, []);

    return visible;
}

/**
 * Disclaimer
 *
 * A slim bar above the navigation that links to https://ur.io. Visibility
 * is controlled by the parent via the `visible` prop so the Nav can
 * stay in sync with the disclaimer's position.
 */
export default function Disclaimer({ visible }) {
    return (
        <div className={`disclaimer ${visible ? '' : 'disclaimer-hidden'}`}>
            <a
                href="https://ur.io"
                className="disclaimer-link"
                target="_blank"
                rel="noopener noreferrer"
            >
                This site is an open source utility protocol powered by a
                community of participants, run separately from the network
                operator that sells access to the network at https://ur.io.
            </a>
        </div>
    );
}
