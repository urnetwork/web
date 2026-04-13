// Deutsch
export default {
    nav: {
        whitepaper: 'Whitepaper',
        research:   'Forschung',
        providers:  'Anbieter',
        extenders:  'Erweiterer',
        exchanges:  'Börsen',
        usage:      'Nutzung',
        docs:       'Dokumentation',
        tagline:    'Besitze deine Privatsphäre. Besitze dein Netzwerk.',
        languageMenu: 'Sprache',
        ctaAria:    'Nutzung — aktuelle Netzwerkkosten'
    },

    footer: {
        github:     'GitHub',
        contact:    'Kontakt',
        copyright:  '© 2026 BringYour, Inc.',
        disclaimer: 'Diese Seite ist ein Open-Source-Versorgungsprotokoll, getragen von einer Gemeinschaft von Teilnehmern, und wird unabhängig vom Netzbetreiber betrieben, der den Zugang zum Netzwerk verkauft.',
        languagesAria: 'Sprachen'
    },

    stats: {
        protocolLedger:  'Protokoll-Ledger',
        block:           'Block',
        totalFees:       'Gesamtgebühren ($UR)',
        totalData:       'Gesamtdaten',
        totalUsers:      'Gesamtnutzer',
        totalSupply:     'Gesamt-$UR-Angebot',
        totalDistributed:'Gesamt verteilt',
        urAbsorbed:      '$UR absorbiert',
        statusHeld:      'Status gehalten ($UR)'
    },

    whitepaper: {
        eyebrow: 'Whitepaper',
        title:   'Ein Token für das offene Netzwerk.',
        clauses: [
            {
                numeral: 'I.',
                title:   'Das Protokoll',
                body: [
                    'Das $UR-Protokoll koordiniert einen globalen Markt für Bandbreite zwischen Menschen, Anbietern und den Netzwerken, die sie verbinden.',
                    'Die Abrechnung erfolgt in $UR. Jeder Block erfasst die erhobenen Gebühren, das bediente Volumen und den an die Teilnehmer zurückgegebenen Anteil.'
                ]
            },
            {
                numeral: 'II.',
                title:   'Der Token',
                body: [
                    '$UR hat zum Genesis-Zeitpunkt ein festes Angebot. Ein Teil jedes Blocks wird vom Protokoll absorbiert und verringert das Angebot, während das Netzwerk wächst.',
                    'An Teilnehmer ausgegebene Token verkörpern einen Anspruch auf zukünftige Bandbreite und den Status, den sie im Netzwerk innehaben.'
                ]
            },
            {
                numeral: 'III.',
                title:   'Das Netzwerk',
                body: [
                    'Das Netzwerk besteht aus unabhängigen Anbietern, Erweiterern und Betreibern. Keiner von ihnen verwahrt für sich allein den Datenverkehr oder die Identität der Nutzer.',
                    'Die Koordinierung ist erlaubnisfrei. Die Teilnahme ist offen. Status wird durch erbrachten Dienst verdient, nicht durch eingesetztes Kapital.'
                ]
            },
            {
                numeral: 'IV.',
                title:   'Der Rabatt',
                body: [
                    'Halter von $UR erhalten einen Rabatt auf Daten, die über das Netzwerk gekauft werden. Der Rabatt skaliert mit dem über die Zeit gehaltenen Status.',
                    'Dies bindet den Wert des Tokens an seine Nutzung und die Nutzung des Netzwerks an die Menschen, die darauf angewiesen sind.'
                ]
            }
        ]
    },

    research: {
        eyebrow: 'Forschung',
        title:   'Offene Arbeit, in der Öffentlichkeit.',
        intro:   'Die Forschung, die das Protokoll trägt, wird veröffentlicht, sobald sie geschrieben ist. Jedes Papier ist ein Arbeitsentwurf eines Teils des Netzwerks.',
        papers: [
            { tag: 'R-001', title: 'Bandbreite als Abrechnungsschicht',                   body: 'Ein Modell zur Bepreisung von Datenbewegung als Rechnungseinheit in einem erlaubnisfreien Netzwerk.' },
            { tag: 'R-002', title: 'Status ohne Einsatz',                                  body: 'Wie Teilnahme­geschichte den Kapitaleinsatz bei der Koordinierung eines offenen Marktplatzes ersetzen kann.' },
            { tag: 'R-003', title: 'Sybil-Resistenz durch Verkehrsbeglaubigung',           body: 'Echte Anbieter aus dem beobachtbaren Verhalten von Millionen unabhängiger Datenflüsse identifizieren.' },
            { tag: 'R-004', title: 'Eine deflationäre Kurve für das offene Netzwerk',     body: 'Token-Absorption so gestalten, dass sie echtes Netzwerkwachstum statt spekulativer Zyklen abbildet.' }
        ]
    },

    providers: {
        eyebrow: 'Anbieter',
        title:   'Die Menschen, die das Netzwerk bedienen.',
        intro:   'Anbieter sind die Grundlage des Netzwerks. Sie steuern die Bandbreite bei, auf die sich alle anderen verlassen, und werden vom Protokoll direkt dafür entlohnt.',
        roles: [
            { tag: '01', title: 'Verkehr bedienen',  body: 'Betreibe einen Anbieter auf Hardware, die du bereits besitzt. Verdiene $UR für die Bandbreite, die du zum Netzwerk beiträgst.' },
            { tag: '02', title: 'Unabhängig bleiben', body: 'Keine Verwahrung, kein Vertrag, keine zentrale Abwicklung. Anbieter agieren in gebührendem Abstand zu jeder einzelnen Partei.' },
            { tag: '03', title: 'Anteil verdienen',   body: 'Jeder Block gibt einen Anteil der Gebühren an aktive Anbieter zurück. Status wächst mit beständigem Dienst.' }
        ]
    },

    extenders: {
        eyebrow: 'Erweiterer',
        title:   'Die Menschen, die das Netzwerk weitertragen.',
        intro:   'Erweiterer sorgen dafür, dass das Netzwerk Orte erreicht, die Anbieter allein nicht erreichen können. Sie sind die zweite Stufe des offenen Netzwerks und halten das Protokoll widerstandsfähig gegen Isolation.',
        roles: [
            { tag: '01', title: 'Weiter reichen',       body: 'Erweiterer leiten Verkehr in Netzwerke, die Anbieter allein nicht erreichen — über Grenzen hinweg, um Sperren herum, ins Offene.' },
            { tag: '02', title: 'Keine Inhalte tragen', body: 'Erweiterer sehen Datenflüsse, niemals Inhalte. Das Protokoll ist so gestaltet, dass die Relais-Schicht keine Überwachungs­schicht werden kann.' },
            { tag: '03', title: 'Für Distanz verdienen',body: 'Die Vergütung folgt der Schwierigkeit des bedienten Wegs, nicht nur dem Volumen — je härter die Route, desto größer der Anteil.' }
        ]
    },

    exchanges: {
        eyebrow: 'Börsen',
        title:   'Wo das Netzwerk auf den Markt trifft.',
        intro:   '$UR ist frei handelbar. Börsen verbinden das offene Netzwerk mit der weiteren Wirtschaft, ohne selbst zum Netzwerk zu werden.',
        roles: [
            { tag: '01', title: 'Ein- / Ausstiegspunkte', body: 'Börsen tauschen lokale Währung in $UR und zurück. Sie sind das Tor für jeden, der noch nicht am Protokoll teilnimmt.' },
            { tag: '02', title: 'Abrechnungsort',          body: 'Die blockweise Abrechnung wird auf dem Protokoll erfasst. Börsen lesen sie direkt — keine privilegierten Feeds, keine intransparente Abwicklung.' },
            { tag: '03', title: 'Offene Listings',         body: 'Das Listing des Tokens ist erlaubnisfrei. Jede Börse kann integrieren; das Protokoll wählt keine Gewinner aus.' }
        ]
    },

    usage: {
        eyebrow: 'Nutzung',
        title:   'Die Menschen, die das Netzwerk bündeln.',
        intro:   'Netzbetreiber verwandeln den offenen Marktplatz aus Anbietern und Erweiterern in Produkte, die Verbraucher und Unternehmen kaufen können. Sie sind das öffentliche Gesicht des Netzwerks, und das Protokoll hält sie an dieselben Standards wie alle anderen.',
        roles: [
            { tag: '01', title: 'Nachfrage bündeln',     body: 'Betreiber bündeln Anbieter und Erweiterer zu Netzwerken, von denen Kunden mit vorhersagbarer Leistung kaufen können.' },
            { tag: '02', title: 'Qualität verbürgen',    body: 'Betreiber setzen ihren Status für die Bandbreite ein, die sie verkaufen. Schlechter Dienst spiegelt sich im Ledger und in der Rabattkurve wider.' },
            { tag: '03', title: 'Auf-Protokoll-Abrechnung', body: 'Die gesamte Abrechnung erfolgt über $UR. Betreiber sind denselben Regeln unterworfen wie alle anderen im Netzwerk.' }
        ]
    }
};
