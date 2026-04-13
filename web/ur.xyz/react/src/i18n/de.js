// Deutsch
export default {
    nav: {
        whitepaper: 'Whitepaper',
        research:   'Forschung',
        providers:  'Anbieter',
        extenders:  'Erweiterer',
        community:  'Gemeinschaft',
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
                title:   'Allgemeine Beschreibung von URnetwork',
                body: [
                    'URnetwork ist ein dezentrales Datenschutz-Infrastrukturprotokoll, das die „vollständige Internetverschlüsselung" ermöglicht, indem es die Offenlegung von Metadaten im TCP/IP-Protokollstapel minimiert. Während der Großteil des Internetverkehrs auf der Inhaltsebene verschlüsselt ist, bleiben Metadaten wie Quell- und Ziel-IP-Adressen für Zwischenstellen sichtbar. Das Protokoll verteilt den Benutzerverkehr über ein globales Netzwerk unabhängiger Anbieter mittels Multi-Hop-Routing und geschichteter Verschlüsselung, sodass kein einzelner Anbieter Zugang sowohl zur Identität des Nutzers als auch zum Inhalt der Kommunikation hat. Das Protokoll nutzt Techniken wie N-Schicht-TLS-Verschlüsselung, SNI-Spoofing und Verkehrsununterscheidbarkeit, um standardmäßigem HTTPS-Verkehr zu ähneln.',
                    'Die Protokollarchitektur trennt Transport, Routing, Zuordnung und Abrechnung in eigenständige Komponenten. Nutzer verbinden sich über Client-Software, die den Verkehr dynamisch über mehrere Anbieter basierend auf Leistungs- und Zuverlässigkeitsmetriken leitet. Die Datenübertragung erfolgt über verschlüsselte Verträge zwischen Nutzern und Anbietern, mit Treuhandguthaben, definierten Berechtigungen und nachgelagerter Abrechnung basierend auf bestätigter Nutzung. Verträge beinhalten Streitbeilegungsmechanismen und werden nach einem definierten Zeitraum gelöscht. Das Protokoll ist quelloffen und seit etwa April 2025 in Betrieb.',
                    'Nutzer und Anbieter können direkt mit dem Protokoll interagieren, ohne auf einen Netzbetreiber angewiesen zu sein. Netzbetreiber sind erfahrene Protokollbetreiber, die in der Lage sind, erhebliche Volumina an Smart Contracts zu koordinieren und einzusetzen. Sie können dieses Volumen an Verbraucher weiterverkaufen oder für eigene Zwecke nutzen. In vielen Fällen setzen Netzbetreiber Protokollverträge ein und fungieren als Brücke zwischen alltäglichen Nutzern und dem Protokoll.',
                    'Das Protokoll ist ein selbstbetriebenes, erlaubnisfreies System, das unabhängig von Netzbetreibern operiert. Die Ökonomie des Protokolls funktioniert über zwei Raten: eine Pro-Gigabyte-Transferrate und eine Pro-Nutzer-Transferrate. Diese beiden Raten decken alle Nutzungsszenarien des Netzwerks ab. Jeder kann das Protokoll nutzen, sofern er eine dieser beiden Raten zahlt.'
                ]
            },
            {
                numeral: 'II.',
                title:   'Rollentrennung',
                body: [
                    'Das Protokoll operiert völlig unabhängig und würde funktionsfähig bleiben, wenn das Unternehmen, das es eingesetzt hat, die Wartung einstellen würde. Betrieb und Nutzen des Protokolls hängen nicht von den fortlaufenden unternehmerischen Bemühungen einer einzelnen Einheit ab.',
                    'Nutzer und Anbieter müssen keine Software oder Hardware eines bestimmten Unternehmens verwenden, um teilzunehmen. Sie können direkt über eigene Code-Deployments mit dem Protokoll interagieren. Das Unternehmen, das das Protokoll eingesetzt hat, beabsichtigt, seine Rolle als Deployer des Protokolls, als Netzbetreiber, der das Protokoll für den Betrieb von Diensten nutzt, und als gegenwärtiger Verwalter des Protokolls klar zu unterscheiden.'
                ]
            },
            {
                numeral: 'III.',
                title:   'Einführung des $UR-Tokens',
                body: [
                    'Innerhalb des Protokolls soll der Token als Zahlungs- und Abrechnungsinstrument fungieren. Token werden im Zusammenhang mit diskreten Netzwerkoperationen verwendet und im Rahmen dieser Operationen verbraucht oder zugeteilt. Der Token ist nicht dafür konzipiert, Rechte auf Gewinne, Einkommen oder Renditen zu gewähren, und dient ausschließlich als Mittel für den Zugang zum und die Teilnahme am Protokoll.',
                    'Nutzer verwenden Token, indem sie diese vor der Netzwerknutzung in programmatische Verträge einzahlen, wobei die Preise auf Datenübertragung und Nutzeraktivität basieren. Eingezahlte Token finanzieren vertragsbasierte Bandbreitentransaktionen zwischen Nutzern und Anbietern, wobei Teile während der Ausführung treuhänderisch gehalten werden. Bei der Abrechnung werden Token in einen Belohnungspool verteilt und basierend auf Leistungskennzahlen an Anbieter zugeteilt.',
                    'Nach Abschluss jedes Blocks (eine Woche) werden 97,5 % der verwendeten Token an Anbieter verteilt und 2,5 % durch Absorption aus dem Umlauf genommen. Zur Absorption geleitete Token werden nicht umverteilt und aus der Protokoll-Buchhaltung für zukünftige Vertragsabrechnungen ausgeschlossen. Dieser Mechanismus dient der Ausbalancierung von Netzwerknutzung und Ressourcenzuteilung.',
                    'Das Gesamtangebot ist auf 1.000.000.000 Token festgelegt, alle bei Genesis geprägt, ohne laufende Inflation. Bei der Token-Generierung ist die Zuteilung wie folgt:',
                    { type: 'table', head: ['Kategorie', '%', 'Token', 'Vesting'], rows: [
                        ['Contributor Rewards', '20%', '200.000.000', '1 Jahr Vesting, 2 Jahre lineare Freigabe'],
                        ['Team & Advisors',     '23%', '230.000.000', '1 Jahr Vesting, bis zu 2 Jahre lineare Freigabe'],
                        ['Equity Investors',    '15%', '150.000.000', '1 Jahr Vesting, 2 Jahre lineare Freigabe'],
                        ['Treasury',            '2%',  '20.000.000',  'Lineare Freigabe über 1 Jahr'],
                        ['Strategic Reserve',   '40%', '450.000.000', 'Reserviert für zukünftige Protokollnutzung (0 Inflation)']
                    ]},
                    'Etwa 2 % des Angebots (20 Millionen Token) werden voraussichtlich für Liquiditätszwecke im Anfangsumlauf sein.'
                ]
            },
            {
                numeral: 'IV.',
                title:   'Verteilung und Umlauf',
                body: [
                    'Token können auf zwei Wegen erworben werden: direkter Erwerb auf Sekundärmärkten oder Erhalt als Anbieterbelohnungen für zum Netzwerk beigesteuerte Bandbreite.',
                    'Netzbetreiber können Token auf nicht-exklusiver, marktgetriebener Basis erwerben, um ihre Nutzung des Protokolls zu unterstützen. Diese Aktivität erfolgt ausschließlich zu Verbrauchszwecken und nicht zur Investition oder Marktunterstützung. Das Protokoll ist nicht darauf angewiesen, dass Netzbetreiber Token erwerben, um zu funktionieren, und die Token-Nachfrage ist nicht darauf ausgelegt, von einem einzelnen Teilnehmer oder einer Teilnehmerklasse getrieben zu werden.',
                    'Netzbetreiber können den Zugang zum Protokoll in Token, Fiatwährung oder tokendenominierten Konditionen verkaufen. Netzbetreiber können Serviceebenen strukturieren, die tokenbasierte Teilnahmesignale oder Zahlungsmethoden integrieren, um den Zugang zu Funktionen innerhalb ihrer Anwendungen anzupassen.',
                    'Zusammenfassung der Interaktion zwischen den Teilnehmern:',
                    { type: 'list', items: [
                        'Ein Nutzer kann Token auf dem offenen Markt kaufen und sie nutzen, um direkt mit dem Protokoll zu interagieren (einschließlich der Möglichkeit, Netzbetreiber zu werden), oder sich auf einen Netzbetreiber verlassen, um auf das Protokoll zuzugreifen, ohne Token zu berühren.',
                        'Ein Anbieter erhält Token für die Bereitstellung von Bandbreite an das Protokoll.',
                        'Netzbetreiber erwerben, halten und geben Token aus, um ihre Dienste ihren Kunden zur Verfügung zu stellen, die je nach Art der Dienste Nutzer sein können oder nicht.'
                    ]}
                ]
            },
            {
                numeral: 'V.',
                title:   'Staking und Integritätsmechanismen',
                body: [
                    'Das Protokoll bietet keine passiven Erträge oder Renditen auf Token. Jegliche Unterschiede in den Ergebnissen zwischen Teilnehmern sind ausschließlich eine Funktion von Unterschieden in Aktivität, Zuverlässigkeit und Netzwerknutzung. Das Protokoll verfügt über eine eingebaute Form der operativen Qualifikation und Priorisierung — Integritätsmechanismen — die Engagement, Zuverlässigkeit und Teilnahmequalität signalisieren und die das Protokoll zur Priorisierung der Ressourcenzuteilung und Vertragsauswahl nutzt.',
                    { type: 'list', items: [
                        'Verbraucher-Staking: Netzbetreiber können Serviceebenen anbieten, die tokenbasierte Authentifizierung oder Teilnahmesignale integrieren, um den Zugang zu Funktionen innerhalb ihrer Anwendungen anzupassen.',
                        'Entwickler-Staking: Entwickler, die Token-Guthaben halten, sind für reduzierte Netzwerkgebühren berechtigt — als Teil einer nutzungsbasierten Preisstruktur, die fest im Protokoll verankert ist und nachhaltige Integration sowie langfristige Netzwerkteilnahme fördern soll.',
                        'Anbieter-Staking: Anbieter, die Token sperren, werden bei der Vertragszuweisung auf Basis nachgewiesenen Engagements und Zuverlässigkeit priorisiert. Anbieter, die $UR sperren, erhalten größere Belohnungsanteile im Block-End-Belohnungszyklus basierend auf einem Gewichtungsmultiplikator (1,0x, 1,25x, 1,5x oder 2,0x). Diese angepassten Multiplikatoren erzeugen keine Inflation — der Gesamtbelohnungspool der Epoche ist fest. Anbieter ohne Staking verdienen weiterhin Belohnungen in kleineren proportionalen Anteilen.'
                    ]},
                    'Diese Integritätsmechanismen unterstützen den zuverlässigen Betrieb, die Leistung und Verfügbarkeit des Protokolls, indem sie den Netzwerkzugang und die Ressourcenzuteilung mit nachweisbarer Teilnahme und Servicequalität in Einklang bringen. Für jede Teilnehmerkategorie dienen diese Mechanismen der Förderung einer effektiven Netzwerknutzung und nicht der Bereitstellung wirtschaftlicher Vorteile auf Basis passiven Token-Besitzes.'
                ]
            }
        ]
    },

    research: {
        eyebrow: 'Forschung',
        title:   'Offene Algorithmen, offene Daten.',
        intro:   'Das Protokoll ist ein dezentral-natives Multi-IP-Multi-Transport-System, das auf Millionen von Anbietern pro Netzbetreiber skalieren soll. Jeder Algorithmenbereich unten ist mit seinem Quellcode und, wo zutreffend, anonymisierten Datensätzen für unabhängige Analyse veröffentlicht.',
        papers: [
            { tag: 'URTRANSPORT1', title: 'Leistung',
              body: 'Multi-Hop-Routing über TCP-Transporte mit Fokus auf globale Erreichbarkeit. UDP- und Peer-to-Peer-Stream-Upgrades werden unterstützt, die Integration von WebRTC, XRay und WireGuard ist geplant.',
              href: 'https://github.com/urnetwork/connect/blob/main/transport.go', linkLabel: 'transport.go' },
            { tag: 'UREXTENDER1', title: 'Erreichbarkeit',
              body: 'N-Schicht-TLS-Verschlüsselung (N≥2), bei der jede äußere Schicht ein selbstsigniertes Zertifikat mit SNI-Spoofing zu einer Zwischen-IP verwendet und an einen weiteren Hop oder eine Ende-zu-Ende-TLS-Verbindung weiterleitet. Jeder kann einen Erweiterer auf jeder Domain hosten.',
              href: 'https://github.com/urnetwork/connect/blob/main/net_extender.go', linkLabel: 'net_extender.go' },
            { tag: 'UR-FP2', title: 'Client-Anbieter-Zuordnung',
              body: 'Sampling-Algorithmus, der eine 10-fache Zufallsstichprobe potenzieller Anbieter lädt und proportional zu Zuverlässigkeit × Client-Bewertung mischt. Sybil-Resistenz wird durch die Bedingung garantiert, dass die Zuverlässigkeitssumme pro IP-Subnetz höchstens 1 beträgt.',
              href: 'https://github.com/urnetwork/server/blob/main/model/network_client_location_model.go', linkLabel: 'network_client_location_model.go' },
            { tag: 'UR-MULTI', title: 'Multi-Client',
              body: 'Heuristischer Sweep-Algorithmus, der ein Fenster von Anbietern verwaltet. Sperrt den Verkehr in die beste verfügbare Stufe basierend auf Übertragungsschwellen statt Protokollanalyse.',
              href: 'https://github.com/urnetwork/connect/blob/main/ip_remote_multi_client.go', linkLabel: 'ip_remote_multi_client.go' },
            { tag: 'UR-TRANSFER', title: 'Übertragung',
              body: 'Zuverlässiges Zustellungsfenster, optimiert für Umgebungen mit hoher Latenz. Protokoll-Neuübertragungen sind deaktiviert, da das Fenster zuverlässige Zustellung gewährleistet. Verteilt den Verkehr über Transporte nach Leistungsranking.',
              href: 'https://github.com/urnetwork/connect/blob/main/transfer.go', linkLabel: 'transfer.go' },
            { tag: 'UR-IP', title: 'IP-Egress',
              body: 'IP-Stack-Implementierung mit minimalem Speicherverbrauch. Setzt zuverlässige Peer-Kommunikation über die Übertragungsschicht voraus, daher werden Neuübertragungen entsprechend optimiert.',
              href: 'https://github.com/urnetwork/connect/blob/main/ip.go', linkLabel: 'ip.go' },
            { tag: 'UR-PSUB2', title: 'Token-Zuteilung',
              body: 'Blockbelohnungen werden alle 7 Tage proportional zu Datenübertragungs-Votes, Zuverlässigkeitsbewertungen und Empfehlungen verteilt. Bezahlter Abonnenten-Verkehr wird priorisiert, um Gaming entgegenzuwirken. Multiplikator-Boni gelten für Zuverlässigkeit und Community-Anreize.',
              href: 'https://github.com/urnetwork/server/blob/main/model/account_payment_model_plan.go', linkLabel: 'account_payment_model_plan.go' },
            { tag: 'UR-CONTRACT', title: 'Berechtigung',
              body: 'Die Übertragung zwischen Parteien erfordert einen verschlüsselten Vertrag mit Treuhandguthaben und einem Berechtigungssatz. Beide Seiten müssen mit bestätigten Byte-Zählern abschließen; Meinungsverschiedenheiten lösen einen erzwungenen Lösungsprozess aus.',
              href: 'https://github.com/urnetwork/server/blob/main/model/subscription_model.go', linkLabel: 'subscription_model.go' },
            { tag: 'UR-SEC1', title: 'Sicherheit',
              body: 'Port-Sperrliste und IP-Sperrliste zum Schutz des Anbieternetzwerks. Führt keine Protokollinspektion durch — Anbieter leiten nur verschlüsselten Verkehr weiter.',
              href: 'https://github.com/urnetwork/connect/blob/main/ip_security.go', linkLabel: 'ip_security.go' }
        ]
    },

    providers: {
        eyebrow: 'Anbieter',
        title:   'Der Egress des gemeinsamen Netzwerks.',
        intro:   'Anbieter sind die Egress-IPs des gemeinsamen Netzwerks. Sie betreiben ein standardmäßig sicheres Sicherheitsmodell, blockieren bekannte bösartige IPs und leiten nur verschlüsselten Verkehr weiter. Anbieter werden nach Geschwindigkeit und Zuverlässigkeit eingestuft, registrieren sich bei einem oder mehreren Netzbetreibern und verdienen einen Anteil am Vertragswert, den sie weiterleiten. Anbieter laufen vollständig im User-Space und benötigen keine Root-Rechte.',
        roles: [
            { tag: '01', title: 'Standardmäßig sicher',        body: 'Anbieter lehnen Verkehr ab, der gängigen Regulierungsrichtlinien wie CFAA und DMCA widerspricht. Bekannte Botnetze und bösartige IPs werden blockiert. Nur verschlüsselter Verkehr wird weitergeleitet, was sowohl Anbieter als auch Nutzer schützt.' },
            { tag: '02', title: 'Eingestuft und zugeordnet',    body: 'Anbieter werden nach Geschwindigkeit und Zuverlässigkeit eingestuft und registrieren sich bei einem oder mehreren Netzbetreibern. Jeder Netzbetreiber betreibt seinen eigenen Zuordnungsalgorithmus zwischen Nutzern und Anbietern.' },
            { tag: '03', title: 'Anteil verdienen',              body: 'Anbieter verdienen einen Anteil am Vertragswert, den sie weiterleiten. Betreibe einen Anbieter auf Hardware, die du bereits besitzt — keine Root-Rechte erforderlich, alles läuft im User-Space.' },
            { tag: '04', title: 'Erste Schritte',                body: 'Richte einen Anbieter-Knoten ein und beginne, Bandbreite zum Netzwerk beizutragen.', href: 'https://docs.ur.io/provider', linkLabel: 'Provider docs' }
        ]
    },

    extenders: {
        eyebrow: 'Erweiterer',
        title:   'Der Ingress, der das Netzwerk weiterträgt.',
        intro:   'Erweiterer schaffen ein privates oder gemeinsames Netzwerk von Ingress-IPs, die verschiedene Techniken nutzen, um die Konnektivität weltweit zu verbessern. Erweiterer können an bekannte vertrauenswürdige Netzbetreiber, an andere Erweiterer und an vertrauenswürdige Partner-IPs mithilfe der Vertrauenssignierung des Netzbetreibers weiterleiten.',
        roles: [
            { tag: '01', title: 'Private Erweiterer',           body: 'Nicht bei Netzbetreibern registriert — agieren als Client des Systems. Nutzer geben die Erweiterer-IP manuell im Client ein, um sich über den Erweiterer zu verbinden.' },
            { tag: '02', title: 'Öffentliche Erweiterer',       body: 'Registrieren sich bei Netzbetreibern und erhalten einen Anteil am Vertragswert des Protokolls, den sie weiterleiten. Öffentliche Erweiterer wählen, an welche Netzbetreiber sie weiterleiten, und können auch an andere Erweiterer-IPs oder von weitergeleiteten Netzbetreibern signierte IPs weiterleiten.' },
            { tag: '03', title: 'Rotierende Exposition',        body: 'Eine zufällige Teilmenge öffentlicher Erweiterer wird pro Block (1 Woche) zur Exposition ausgewählt. Die Exposition hängt von der Anrufregion und der Uhrzeit ab. Clients pflegen einen lokalen Cache von Erweiterern, sodass zuvor funktionierende Erweiterer automatisch erneut versucht werden.' },
            { tag: '04', title: 'Vertrauenswürdige Weiterleitung', body: 'Netzbetreiber können eine vertrauenswürdige IP mit einem Passwort verknüpfen, sodass Erweiterer an jede IP weiterleiten können, die den Vertrauenstest besteht. Das Netzwerk speichert die IP als gesalzenen Hash gemäß den allgemeinen IP-Speicherrichtlinien.' }
        ]
    },

    community: {
        eyebrow: 'Gemeinschaft',
        title:   'Die Menschen hinter dem Netzwerk.',
        intro:   'Das Protokoll ist offen. Die Gemeinschaft, die es aufbaut und betreibt, wächst. Hier findet man sie.',
        items: [
            { tag: '01', title: 'Netzbetreiber',  body: 'Netzbetreiber entwickeln Produkte auf dem Protokoll und verkaufen den Zugang zum Netzwerk.', href: 'https://ur.io', linkLabel: 'BringYour, Inc. — ur.io' },
            { tag: '02', title: 'Discord',          body: 'Tritt dem Gespräch bei — Protokollentwicklung, Anbieter-Support und Community-Diskussion.', href: 'https://discord.gg/urnetwork', linkLabel: 'Discord beitreten' },
            { tag: '03', title: 'Markenkit',         body: 'URnetwork und das Connector-Logo sind eingetragene US-Marken. Nutzern des Protokolls wird gestattet, das Markenkit als „powered by URnetwork" oder ähnliche Komponentenhinweise zu verwenden.' }
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
