import React from 'react';
import './OperatorsDirectory.css';
import { useLanguage } from '../i18n';
import { useOperatorFeeds } from '../lib/network';

const fmt = (n) =>
    Number(n || 0).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

const fmtInt = (n) => Math.floor(Number(n || 0)).toLocaleString();

const DASH = '—';

/**
 * Mini store marks, drawn inline (the site ships no external assets).
 * The GitHub and Apple marks are the canonical logo paths; the rest are
 * simplified geometric renderings — each link carries the store's name
 * as its title and accessible label, so the glyph only has to evoke.
 */
const ICONS = {
    play: (
        <path d="M3 20.5v-17c0-.59.34-1.11.84-1.35L13.69 12l-9.85 9.85c-.5-.24-.84-.76-.84-1.35zm13.81-5.38L6.05 21.34l8.49-8.49 2.27 2.27zm3.35-4.31c.34.27.59.69.59 1.19s-.22.9-.57 1.18l-2.29 1.32-2.5-2.5 2.5-2.5 2.27 1.31zM6.05 2.66l10.76 6.22-2.27 2.27-8.49-8.49z" />
    ),
    appStore: (
        <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
    ),
    chrome: (
        <>
            <circle cx="12" cy="12" r="3.3" />
            <path d="M12 2a10 10 0 0 1 8.66 5H12a5 5 0 0 0-4.56 2.94L4.1 5.33A9.98 9.98 0 0 1 12 2zm9.33 7a10 10 0 0 1-6.98 12.63l3.35-8.51A4.98 4.98 0 0 0 17 12c0-1.1-.36-2.13-.96-2.96zM9.56 21.7A10 10 0 0 1 2.75 8.98l4.9 6.12A5 5 0 0 0 12 17c.25 0 .5-.02.75-.06z" />
        </>
    ),
    firefox: (
        <path d="M21.5 12.5a9.5 9.5 0 1 1-18.98-.42c.02-1.3.31-2.55.83-3.68.16.9.56 1.6 1.23 2.06-.3-2.53.66-4.9 2.5-6.47.8 1.54 2.2 2.6 4.2 2.54-1.16.44-1.93 1.17-2.3 2.18.82-.35 1.65-.4 2.47-.16-1.55.63-2.42 1.75-2.5 3.32-.07 2 1.56 3.7 3.56 3.7 1.6 0 2.9-.9 3.45-2.34.35 1.44 0 2.9-.99 4.06 1.8-1.16 2.91-3.13 3.04-5.5.4.2.9.42 1.49.71z" />
    ),
    fdroid: (
        <>
            <path d="M4.06 10.4h15.88a8.1 8.1 0 0 0-3.3-5.53l1.1-1.9-.86-.5-1.14 1.96A7.97 7.97 0 0 0 12 3.66c-1.34 0-2.61.28-3.74.77L7.12 2.47l-.86.5 1.1 1.9a8.1 8.1 0 0 0-3.3 5.53zm4.42-3.13a.85.85 0 1 1 0 1.7.85.85 0 0 1 0-1.7zm7.04 0a.85.85 0 1 1 0 1.7.85.85 0 0 1 0-1.7z" />
            <path d="M4 11.9h16v5.1a3.3 3.3 0 0 1-3.3 3.3H7.3A3.3 3.3 0 0 1 4 17z" />
        </>
    ),
    github: (
        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    ),
    solanaMobile: (
        <>
            <path d="M6.5 4.5h14L17 8H3z" />
            <path d="M3 10.25h14l3.5 3.5h-14z" />
            <path d="M6.5 16h14L17 19.5H3z" />
        </>
    ),
    ethos: (
        <>
            <path d="M12 1.75 5.75 12.1 12 15.8l6.25-3.7z" />
            <path d="M12 17.2 5.75 13.5 12 22.25l6.25-8.75z" />
        </>
    ),
    wireguard: (
        <path d="M12 1.9 4 4.9v6.2c0 4.6 3.1 8.6 8 10.3 4.9-1.7 8-5.7 8-10.3V4.9zm0 2.14 6 2.25v4.81c0 3.6-2.4 6.86-6 8.36-3.6-1.5-6-4.76-6-8.36V6.29z" />
    )
};

// Display order for the store strip.
const STORES = [
    { id: 'play', label: 'Google Play' },
    { id: 'appStore', label: 'App Store' },
    { id: 'chrome', label: 'Chrome Web Store' },
    { id: 'firefox', label: 'Firefox Add-ons' },
    { id: 'fdroid', label: 'F-Droid' },
    { id: 'github', label: 'GitHub' },
    { id: 'solanaMobile', label: 'Solana Mobile' },
    { id: 'ethos', label: 'ethOS' },
    { id: 'wireguard', label: 'WireGuard' }
];

function StoreLinks({ operator, label }) {
    return (
        <div className="op-stores" aria-label={label}>
            {STORES.map(store => {
                const href = operator.stores && operator.stores[store.id];
                if (!href) return null;
                return (
                    <a
                        key={store.id}
                        className="op-store"
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={store.label}
                        aria-label={`${operator.appName} — ${store.label}`}
                    >
                        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            {ICONS[store.id]}
                        </svg>
                    </a>
                );
            })}
        </div>
    );
}

/**
 * OperatorsDirectory
 *
 * The baked-in network operator registry as a table: each operator's app
 * and store listings next to the core stats read live from its public
 * feed, ranked by total networks. Unreachable feeds rank last and show
 * placeholders.
 */
export default function OperatorsDirectory() {
    const { t } = useLanguage();
    const s = t.operators;
    const rows = useOperatorFeeds();

    const ranked = [...rows].sort((a, b) =>
        (b.feed ? b.feed.totalNetworks : -1) - (a.feed ? a.feed.totalNetworks : -1)
    );

    return (
        <div className="operators-directory">
            <h3 className="operators-directory-title">{s.directoryTitle}</h3>
            <p className="operators-directory-note">{s.directoryNote}</p>

            <div className="article-table-wrap">
                <table className="article-table operators-table">
                    <thead>
                        <tr>
                            <th>{s.colOperator}</th>
                            <th>{t.stats.totalNetworks}</th>
                            <th>{t.stats.usersPerBlock}</th>
                            <th>{t.stats.dataPerBlock}</th>
                            <th>{t.stats.demandDeposits}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ranked.map(({ operator, feed }) => (
                            <tr key={operator.name}>
                                {/* Identity cell: operator, its app, and the app's
                                    store listings together, so the stores can never
                                    scroll out of view on a wide stats table. */}
                                <td className="op-ident">
                                    <div className="op-links">
                                        <a
                                            className="op-name"
                                            href={operator.siteUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            {operator.name}
                                        </a>
                                        {operator.dashboardUrl && (
                                            <a
                                                className="op-ident-link"
                                                href={operator.dashboardUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                {s.dashboard}
                                            </a>
                                        )}
                                        {operator.githubUrl && (
                                            <a
                                                className="op-ident-link"
                                                href={operator.githubUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                {t.footer.github}
                                            </a>
                                        )}
                                    </div>
                                    <div className="op-app">
                                        <span className="op-app-name">{operator.appName}</span>
                                        <StoreLinks operator={operator} label={s.colStores} />
                                    </div>
                                </td>
                                <td>{feed ? fmtInt(feed.totalNetworks) : DASH}</td>
                                <td>{feed ? fmtInt(feed.users) : DASH}</td>
                                <td>{feed ? fmt(feed.dataGib) : DASH}</td>
                                <td>{feed ? fmt(feed.demandDepositsAlpha) : DASH}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
