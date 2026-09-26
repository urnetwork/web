// Deutsch — spiegelt die kanonische Quelle en.js Schlüssel für Schlüssel.
// Wird dort ein Schlüssel hinzugefügt, muss er auch hier ergänzt werden.
export default {
    nav: {
        whitepaper: 'Litepaper',
        operators:  'Betreiber',
        miners:     'Miner',
        validators: 'Validatoren',
        research:   'Forschung',
        community:  'Gemeinschaft',
        price:      'Nutzungskosten',
        docs:       'Dokumentation',
        roadmap:    'Roadmap',
        network:    'Netzwerk',
        tagline:    'Besitze deine Privatsphäre. Besitze das Netzwerk.',
        languageMenu: 'Sprache',
        menu:         'Menü',
        closeMenu:    'Menü schließen',
        primaryNav:   'Hauptnavigation',
        mobileNav:    'Mobile Navigation',
        siteMenu:     'Website-Menü',
        browseDocs:   'Dokumentation',
        apiReference: 'API-Referenz',
        search:       'Suche',
        ctaAria:    'Nutzungskosten — der aktuelle Netzwerkpreis',
        denomAria:  'Preiswährung'
    },

    footer: {
        github:     'GitHub',
        contact:    'Kontakt',
        license:    'MPLv2',
        disclaimer: 'Diese Website ist ein quelloffenes Utility-Protokoll, getragen von einer Gemeinschaft von Teilnehmern, und wird getrennt vom Netzbetreiber betrieben, der den Zugang zum Netzwerk verkauft.',
        languagesAria: 'Sprachen',
        terms:      'Nutzungsbedingungen',
        privacy:    'Datenschutz',
        vdp:        'VDP',
        protocol:   'Protokoll',
        community:  'Community',
        legal:      'Rechtliches',
        learn:      'Entdecken',
        resources:  'Ressourcen',
        connect:    'Kontakt',
        bittensorDiscord: 'Bittensor Discord',
        brandKit:   'Brand Kit',
        launchVideo: 'Launch-Video',
        socialAria:     'Community- und Social-Media-Links',
        socialX:        'URnetwork auf X',
        socialTelegram: 'UR-Subnet auf Telegram',
        socialDiscord:  'URnetwork-Discord',
        socialGithub:   'UR-Subnet auf GitHub',
        productsAria:   'URnetwork-Produkte auf ur.io'
    },

    disclaimer: {
        protocol: 'UR ist ein Open-Source-Protokoll für Netzwerkinfrastruktur und wird von seiner Community gepflegt.',
        products: 'URnetwork-Produkte (z. B. VPN) findest du unter ur.io',
        before: 'UR ist ein Open-Source-Protokoll für Netzwerkinfrastruktur und wird von seiner Community gepflegt. URnetwork-Produkte (z. B. VPN) findest du unter'
    },

    launchVideo: {
        aria:  'UR Launch-Video',
        close: 'Video schließen',
        sound: 'Für Ton tippen',
        play:  'Video abspielen',
        fullscreen: 'Vollbild',
        exitFullscreen: 'Vollbild beenden'
    },

    homepage: {
        intro: 'Das UR-Subnet ist ein auf Bittensor aufgebautes Datenschutznetzwerk. Das Subnet belohnt Menschen, die es nutzen und dazu beitragen. Betreiber führen Server aus und hinterlegen Alpha, um Datenverkehr zu routen. Miner transportieren verschlüsselten Datenverkehr und erhalten Emissionen. Validatoren vermessen das Netzwerk erneut, prüfen die Genauigkeit und erhalten Emissionen.',
        diagramAria: 'So funktioniert das UR-Netzwerk',
        rolesEyebrow: 'Am Netzwerk teilnehmen',
        rolesTitle: 'Drei Rollen. Ein vermessenes Netzwerk.',
        roles: {
            operators: { name: 'Betreiber', body: 'Betreiber führen die Datenschutzserver und den Verifizierungsendpunkt aus. Sie hinterlegen Einlagen für den erwarteten Datenverkehr, signieren jeden vermessenen Pfad mit und bestätigen die Auszahlungsliste, die Belohnungen unter ihren Minern aufteilt. Einlagen fließen in eine Reserve; Betreiber verwahren niemals fremde Mittel.', explore: 'Betreiber entdecken' },
            miners: { name: 'Miner', body: 'Miner transportieren den Datenverkehr. Sie betreiben Nodes, die verschlüsselten Datenverkehr für einen oder mehrere Betreiber routen, und werden entsprechend ihrer bereitgestellten Kapazität aus den Subnet-Emissionen bezahlt.', explore: 'Miner entdecken' },
            validators: { name: 'Validatoren', body: 'Validatoren vermessen das Netzwerk erneut. Sie führen das Routing-Verifizierungsprotokoll aus und bewerten jeden Betreiber-Pool nach Nachfrage und gemessener Qualität. Für genaue Bewertungen erhalten sie Subnet-Emissionen.', explore: 'Validatoren entdecken' }
        },
        whitepaperCta: 'Weitere Details stehen im Litepaper',
        metaTitle: 'UR | Das dezentrale Datenschutznetzwerk auf Bittensor SN25',
        metaDescription: 'UR ist ein offenes, dezentrales Datenschutznetz auf Bittensor SN25: Miner tragen verschlüsselten Verkehr, Validatoren messen ihn, Betreiber bringen Nachfrage.'
    },

    diagram: {
        subnet: 'Subnet',
        aria:   'Das UR-Netzwerk — {subnet}, {operators}, {miners} und {validators}; hervorgehoben: {active}',
        goTo:   'Zu {label} wechseln'
    },

    // Statistik-Labels werden unverändert gerendert (kein CSS text-transform),
    // damit das α-Zeichen und die Einheit GiB ihre Schreibweise behalten —
    // bitte in finaler Form schreiben.
    stats: {
        protocolLedger:  'Subnet-Ledger',
        refresh:         'Statistiken aktualisieren',
        blockNumber:     'BLOCKNUMMER',
        dataPerBlock:    'GESAMTDATEN / BLOCK (GiB)',
        usersPerBlock:   'GESAMTNUTZER / BLOCK',
        totalNetworks:   'NETZWERKE GESAMT',
        stakedInContract:'IM VERTRAG GESTAKT (α)',
        demandDeposits:  'NACHFRAGE-EINLAGEN / BLOCK (α)',
        minerEmissions:  'MINER-EMISSION / BLOCK (α)',
        networkOperators:'NETZBETREIBER',
        testnet:         'Status: TESTNET. Es werden nur Testnet-Werte angezeigt.'
    },

    sim: {
        block: 'BLOCK',
        prevBlock: 'VORHERIGER BLOCK',
        blockProgressAria: 'Fortschritt des aktuellen Blocks',
        endsAt: 'Endet um 00:00 UTC am {date}. Noch {d}T {h}h {m}min {s}s bis zum Blockende',
        heroAria: 'Netzwerksimulation',
        ops:      'BETREIBER',
        protocol: 'PROTOKOLL'
    },

    price: {
        eyebrow: 'Nutzungskosten',
        title:   'Der veröffentlichte Preis des Netzwerks.',
        intro:   'Betreiber finanzieren das Netzwerk über Nachfrage-Einlagen — α, das pro Block (7 Tage) für die bedienten Daten und Nutzer hinterlegt wird. Die Tabelle unten ist der veröffentlichte Tarif: Ein Betreiber zahlt die beste Stufe, deren Staked-α-Schwelle er erreicht; Stufe 0 gilt für alle — mit oder ohne gestaktes α.',
        colTier:    'Stufe',
        colStake:   'Staked-α-Schwelle',
        colGib:     'α / GiB',
        colUser:    'α / Nutzer',
        colGibUsd:  'USD / GiB',
        colUserUsd: 'USD / Nutzer',
        tierEveryone: 'Alle',
        usdNote:  'USD-Äquivalente nutzen den Live-α-Preis von SN{sn} aus dem öffentlichen CoinGecko-Feed (GeckoTerminal).',
        usdNoteOperators: 'USD-Äquivalente nutzen den mittleren α-Preis, den die Netzbetreiber melden.',
        alphaNow: '1 α = {usd}',
        usdUnavailable: 'Live-α-Preis nicht verfügbar — USD-Äquivalente ausgeblendet.',
        subscribe: 'Preisänderungen abonnieren (RSS)',
        rawFile:   'Rohe Preistabelle (price.yml)',
        initialPeriod: 'Anfangsphase: Der veröffentlichte Tarif beträgt 0 α. Solange das Netzwerk gehärtet wird, werden keine Nachfrage-Einlagen von Betreibern erhoben; jedem Betreiber-Pool wird die gleiche Nachfrage zugerechnet, sodass allein die gemessene Qualität den Pool-Kanal steuert.'
    },

    roadmap: {
        eyebrow: 'Roadmap',
        title:   'Wohin sich das Netzwerk entwickelt.',
        intro:   'Drei Phasen, jede baut auf der vorigen auf: das Ingress-Netzwerk öffnen, UR zum Substrat machen, auf dem Unternehmen bauen, und das Eingangstor zum Internet neu errichten. Die Zeiträume sind Zielmarken, gemessen ab heute — eine Richtung, kein Versprechen.',
        phaseLabel: 'Phase',
        phases: [
            {
                no: '01',
                date: '1–2 Monate',
                flag: 'Startet in Kürze',
                title: 'Zugang zum Ingress-Netzwerk',
                body: 'Miner werden zugleich Egress und Ingress. Jeder Miner erkennt seine Umgebung automatisch und konfiguriert sich so, dass er alles tut, was er kann — er trägt Ingress-Verkehr ebenso wie Egress-Verkehr. Das Ingress-Netzwerk greift das N-Schicht-Verschlüsselungsdesign der Extender wieder auf, ergänzt um neue clientseitige Logik, die iterativ Extender entdeckt, die sich zeitgesteuert freischalten — so rotieren laufend frische Einstiegspunkte in Reichweite.'
            },
            {
                no: '02',
                date: '3–4 Monate',
                title: 'Enterprise-Rollen & Autorisierung',
                body: 'Rollenbasierter Zugriff, integriert mit OAuth und Workload Identity Federation. RBAC ist direkt ins Netzwerk eingebaut, sodass Geschäftsnetzwerke unmittelbar auf dem Protokoll aufgebaut werden können — diese Schicht treibt die Entwickler- und VPN-Anwendungsfälle von VPN.dev an. Der Reiz für diese Unternehmen: ein Netzwerk, das überall auf der Welt zugänglich und performant bleibt — damit Teilnehmer dezentraler Projekte von überall aus mitwirken können.'
            },
            {
                no: '03',
                date: '8–12 Monate',
                title: 'Eine neue Internet-Startseite — WW.dev',
                body: 'Ein neues Eingangstor zum Internet. Wir konzentrieren uns auf Indexierung — Push wie Pull —, einen agentenbasierten Suchindex und kleine, dichte lokale Modelle. Menschen können eine neue private Startseite festlegen; Agenten können einen offenen Suchindex nutzen, der ihnen privaten Echtzeitzugriff auf Informationen gibt — abgerechnet über Privacy Pass und x402.'
            }
        ]
    },

    legal: {
        eyebrow: 'Rechtliches',
        terms: {
            title: 'Nutzungsbedingungen',
            body:  'Die Nutzungsbedingungen für ur.xyz, die Informationsseite zum UR-Protokoll, gehostet von UR Foundation.'
        },
        privacy: {
            title: 'Datenschutzerklärung',
            body:  'Wie UR Foundation Informationen über Besucher von ur.xyz erhebt, verwendet und schützt, einschließlich Wallet-Adressen, und wie Sie Ihre Datenschutzrechte ausüben.'
        },
        vdp: {
            title: 'Richtlinie zur Offenlegung von Schwachstellen',
            body:  'So melden Sie Sicherheitslücken in Assets von UR Foundation — und der Safe Harbor für Forschung in gutem Glauben.'
        }
    },

operators: {
        eyebrow: 'Betreiber',
        title:   'Die Betreiber, die das Netzwerk betreiben.',
        intro:   'Netzbetreiber betreiben die Datenschutzserver und den Verifizierungsendpunkt. Ein Betreiber zahlt als umsatzgedecktes Signal echter Nachfrage in das Subnet ein, führt das Routing-Verifizierungsprotokoll aus, das jeden gemessenen Pfad mitsigniert, und legt die Auszahlungsliste fest, die seine Belohnungen auf die ihm zugeordneten Miner aufteilt. Betreiber bestimmen, wohin Belohnungen fließen, verwahren aber niemals fremde Gelder.',
        cta: 'Netzbetreiber werden',
        metaTitle: 'Netzbetreiber: UR-Datenschutzserver auf SN25 betreiben — UR',
        metaDescription: 'Netzbetreiber betreiben UR-Datenschutzserver und den /verify-Endpunkt, hinterlegen Alpha als umsatzgedecktes Nachfragesignal und lenken Auszahlungen an Miner.',
        roles: [
            { tag: '01', title: 'Die Server betreiben',    body: 'Betreiber betreiben die Datenschutzserver und den /verify-Endpunkt, der jeden gemessenen Pfad mitsigniert — die Koordinationsschicht zwischen Nutzern und den Minern, die den Verkehr tragen.' },
            { tag: '02', title: 'Echte Nachfrage signalisieren',  body: 'Betreibern wird Alpha in Höhe ihrer tatsächlichen Nutzung berechnet. Jede Einzahlung fließt in eine Reserve als umsatzgedecktes Signal, das Validatoren gewichten, wenn sie die Pools bewerten.' },
            { tag: '03', title: 'Die Auszahlungen steuern',  body: 'In jedem Abrechnungszeitraum legt ein Betreiber eine Merkle-Auszahlungsliste fest, die seinen Pool auf seine Miner aufteilt. Er steuert die Aufteilung, nimmt aber niemals etwas in Verwahrung — jeder Miner beansprucht seinen Anteil direkt vom Vertrag.' },
            { tag: '04', title: 'Erste Schritte',         body: 'Registriere einen Netzbetreiber-Schlüssel, betreibe den /verify-Server und zahle ein, um zu beginnen. Die Zulassung von Betreibern erfolgt während der Startphase durch den Eigentümer.', href: '/docs/operator', linkLabel: 'Betreiber-Leitfaden' }
        ],
        directoryTitle: 'Netzbetreiber',
        directoryNote:  'Sortiert nach Netzwerken gesamt. Die Statistiken werden live aus dem öffentlichen Feed jedes Betreibers gelesen; die Icons führen zur App des Betreibers im jeweiligen Store.',
        dashboard: 'Dashboard',
        colOperator: 'BETREIBER',
        colStores:   'APP LADEN'
    },

    miners: {
        eyebrow: 'Miner',
        title:   'Die Miner, die IP-Subnetze in das duale Internet verwandeln.',
        intro:   'Miner konkurrieren darum, möglichst viele IPv4-/29- und IPv6-/48-Subnetze im Netzwerk verfügbar zu machen — jedes davon jederzeit routbar für Ingress- oder Egress-Verkehr. Mit anderen Worten: Miner verwandeln das öffentliche Internet in ein anonymes privates Netzwerk, das jeder nutzen kann. Jeder Miner trägt sowohl Ingress- als auch Egress-Verkehr, betreibt ein standardmäßig sicheres Sicherheitsmodell, leitet nur verschlüsselten Verkehr weiter und wird aus der Subnet-Emission für die routbare Kapazität bezahlt, die er beisteuert. Die Flotten mit der größten Abdeckung an verschiedenen, routbaren Subnetzen werden zu Top-Level-Minern befördert und verdienen mehr — alles im User-Space, auf Hardware, die du bereits besitzt.',
        both:    'Ein Miner ist zugleich Extender und Provider: Jeder Miner übernimmt die Ingress- und die Egress-Rolle gleichzeitig. Er konfiguriert sich automatisch für das System, auf dem er läuft.',
        goal:    'Das Ziel ist ein duales Schattennetz: Zu jedem öffentlichen IPv4- und IPv6-Subnetz gibt es auch ein privates, anonymes Gegenstück. UR baut dieses private anonyme Netz.',
        globeAlt: 'Ein Globus aus Minern: Provider als Punkte, Extender als Ringe, jeder in der Farbe seines Landes.',
        globeLabels: { provider: 'Provider', extender: 'Extender', miner: 'Miner' },
        simCaption: 'Miner konkurrieren um die meisten einzigartigen IPs, die zuverlässig im Netzwerk verfügbar sind. Top-Miner werden in einen eigenen UID-Slot befördert.',
        cta: 'Miner werden',
        metaTitle: 'Miner: Verschlüsselten Verkehr tragen, SN25-Emissionen verdienen — UR',
        metaDescription: 'UR-Miner halten IPv4-/29- und IPv6-/48-Subnetze auf Bittensor SN25 routbar für verschlüsselten Ingress und Egress und verdienen Emission für ihre Abdeckung.',
        roles: [
            { tag: '01', title: 'Egress',              body: 'Als Egress ist ein Miner eine Exit-IP des gemeinsamen Netzwerks. Er lehnt Verkehr ab, der gängigen Regulierungsrichtlinien wie CFAA und DMCA widerspricht, blockiert bekannte bösartige IPs und leitet nur verschlüsselten Verkehr weiter — was sowohl Miner als auch Nutzer schützt.' },
            { tag: '02', title: 'Ingress',             body: 'Als Ingress (Extender) schafft ein Miner Einstiegspunkte, die die Erreichbarkeit weltweit verbessern — mittels N-Schicht-TLS, SNI-Spoofing und vertrauenswürdiger Weiterleitung. Eine rotierende Teilmenge wird in jedem Zyklus exponiert, und Clients versuchen automatisch erneut die Einstiegspunkte, die zuvor funktioniert haben.' },
            { tag: '03', title: 'Gemessen und zugeordnet',body: 'Unabhängige Validatoren durchlaufen Ketten von Minern, um Echtzeit-Transit nachzuweisen und Lebendigkeit sowie Qualität zu messen. Miner werden nach dieser Messung und nach Geschwindigkeit eingestuft, und jeder Betreiber betreibt seine eigene Zuordnung zwischen Nutzern und Minern.' },
            { tag: '04', title: 'Aus der Emission verdienen',  body: 'Miner werden aus der Emission des Subnets bezahlt. Innerhalb des Pools eines Betreibers beanspruchst du deinen Anteil bei jeder Abrechnung per Nachweis — eine niedrigschwellige Grundbelohnung, ohne Slot zu gewinnen und ohne etwas zu verbrennen.', href: '/docs/miner', linkLabel: 'Miner-Leitfaden' },
            { tag: '05', title: 'Um die Spitze konkurrieren',  body: 'Miner konkurrieren um Reichweite. Das Netzwerk stuft Flotten danach ein, wie viele verschiedene, routbare Exit-IPs sie tatsächlich bedienen — nicht nach Verkehrsvolumen — und die rund 200 mit der breitesten Abdeckung werden zu Top-Level-Minern befördert: ein eigener On-Chain-Slot, nativ bezahlt, mit höherem Verdienst. Gemeinsam genutzte IPs werden auf die Flotten aufgeteilt, die sie beanspruchen, sodass einzigartige Abdeckung entscheidet — vergrößere deine Breite an verschiedenen IPs, um aufzusteigen, und wenn deine Reichweite nachlässt, fällst du in den Pool zurück.' }
        ]
    },

    validators: {
        eyebrow: 'Validatoren',
        title:   'Die Validatoren, die das Netzwerk vermessen.',
        intro:   'Validatoren sind unabhängig. Jeder setzt sein eigenes UR ein und führt das Routing-Verifizierungsprotokoll aus — dabei durchläuft er fortlaufend vom Betreiber zugewiesene Ketten von Minern, um Echtzeit-Transit nachzuweisen und zu messen, welche Miner die schwächsten Glieder sind. Diese Messung ist das zentrale Signal, für das das Netzwerk zahlt, und Validatoren verdienen native Dividenden dafür, sie genau zu erzeugen.',
        simCaption: 'Validatoren testen die verfügbare IP-Fläche und stufen Miner nach Zuverlässigkeit ein.',
        cta: 'Validator werden',
        metaTitle: 'Validatoren: Das UR-Netzwerk vermessen, SN25-Dividenden verdienen — UR',
        metaDescription: 'UR-Validatoren setzen eigenes UR ein, durchlaufen zugewiesene Miner-Ketten, belegen Echtzeit-Transit und verdienen Bittensor-Dividenden für genaue Bewertung.',
        roles: [
            { tag: '01', title: 'Die Routen durchlaufen',        body: 'Validatoren durchlaufen vom Betreiber zugewiesene Ketten von Minern und sammeln eine signierte, selbstbeweisende Aufzeichnung jedes abgeschlossenen Hops — kryptografischer Beweis von Echtzeit-Transit, den jeder überprüfen kann.' },
            { tag: '02', title: 'Das Netzwerk bewerten',      body: 'In jedem Zyklus bewertet ein Validator den Pool jedes Betreibers nach Nachfrage und gemessener Qualität und stuft die Top-Flotten nach routbarer IP-Breite ein — alles unter Commit-Reveal. Bittensors Yuma Consensus verwandelt diese unabhängigen Bewertungen in Miner-Emission.' },
            { tag: '03', title: 'Native Dividenden verdienen',  body: 'Validatoren verdienen Bittensor-native Dividenden für genaue, konsenskonforme Bewertung — ihre einzige Belohnung. Kein Betreiber besitzt einen Validator, und die Menge ist erlaubnisfrei.', href: '/docs/validator', linkLabel: 'Validator-Leitfaden' },
            { tag: '04', title: 'Von Grund auf unabhängig',  body: 'Da Commit-Reveal die Bewertungen jedes Validators verbirgt, bis sie veraltet sind, bringt Kopieren nichts — ein Validator muss die Routen wirklich selbst durchlaufen. Die Messung bleibt ehrlich, und keine einzelne Partei kontrolliert sie.' }
        ]
    },

    research: {
        eyebrow: 'Forschung',
        title:   'Offene Algorithmen, offene Daten.',
        metaTitle: 'Forschung: Offene Algorithmen, Daten und Audits — UR',
        metaDescription: 'Offene UR-Forschung: Routing-, Zuordnungs-, Übertragungs- und Belohnungsalgorithmen mit Quellcode und anonymen Daten, der Apex-SN1-Wettbewerb und Audits.',
        intro:   'Das Protokoll ist ein dezentral-natives Multi-IP-, Multi-Transport-System, das auf Millionen von Minern pro Netzbetreiber skalieren soll. Jeder Algorithmenbereich unten ist mit seinem Quellcode und, wo zutreffend, mit anonymisierten Datensätzen für unabhängige Analyse veröffentlicht.',
        areaLabels: {
            approach: 'Aktueller Ansatz',
            implementation: 'Implementierung',
            directions: 'Forschungsrichtungen'
        },
        papers: [
            { tag: 'URTRANSPORT1', title: 'Leistung',
              body: 'Multi-Hop-Routing über TCP-Transporte mit Fokus auf globale Erreichbarkeit. UDP- und Peer-to-Peer-Stream-Upgrades werden unterstützt, die Integration von WebRTC, XRay und WireGuard ist geplant.',
              approach: 'Der Transport ist zuerst auf Erreichbarkeit ausgelegt, damit jeder Mensch auf der Welt eine Verbindung aufbauen kann. Multi-Hop-Routing läuft über TCP-Transporte durch einen zentralen Hop. UDP-Transporte wie H3 und DNS sind implementiert, aber deaktiviert: Im realen Betrieb blieben sie in diesem Aufbau hinter dem TCP-Pfad zurück. Ein Multi-Miner-Hop mit Peer-to-Peer-Stream-Upgrade ist ebenfalls implementiert und derzeit deaktiviert. Transportauswahl und der Pfad für Stream-Upgrades liegen in transport.go und transfer_stream_manager.go.',
              links: [
                  { href: 'https://github.com/urnetwork/connect/blob/main/transport.go', label: 'transport.go' },
                  { href: 'https://github.com/urnetwork/connect/blob/main/transfer_stream_manager.go', label: 'transfer_stream_manager.go' }
              ],
              directions: 'Etablierte Protokolle wie WebRTC, XRay und WireGuard als Stream-Upgrades auf dem Multi-Miner-Hop integrieren und UDP-Transporte dort wieder aktivieren, wo Messungen einen Nutzen zeigen. Der Zuordnungsalgorithmus könnte zudem Hops mit öffentlicher IP und Port von Hops ohne unterscheiden, um Geschwindigkeit und Verbindungsqualität gegeneinander abzuwägen. Jede dieser Änderungen lässt sich auf einem experimentellen Netzbetreiber erproben, bevor sie zum Standard wird.' },
            { tag: 'UREXTENDER1', title: 'Erreichbarkeit',
              body: 'N-Schicht-TLS-Verschlüsselung (N≥2), bei der jede äußere Schicht ein selbstsigniertes Zertifikat mit SNI-Spoofing zu einer Zwischen-IP verwendet und an einen weiteren Hop oder eine Ende-zu-Ende-TLS-Verbindung weiterleitet. Jeder kann einen Extender auf jeder Domain hosten.',
              approach: 'Der Kern-Netzwerkstack unterstützt N-Schicht-TLS-Verschlüsselung mit N von mindestens zwei. Jede äußere Schicht kann ein selbstsigniertes Zertifikat für einen gewählten Hostnamen verwenden, um eine Zwischen-IP zu erreichen, die den Verkehr an einen weiteren Hop oder an eine Ende-zu-Ende-TLS-Verbindung mit der Domain des Netzbetreibers weiterleitet — die Verbindung sieht so wie gewöhnlicher Verkehr zu diesem Hostnamen aus. Jeder kann einen Extender auf einer Domain hosten, die er kontrolliert. Die Nutzer eines Extenders teilen sich ein gemeinsames Rate-Limit, das im Einzelfall angepasst werden kann.',
              links: [
                  { href: 'https://github.com/urnetwork/connect/blob/main/net_extender.go', label: 'net_extender.go' }
              ],
              directions: 'Extender können in eine Protokoll-Grant-Liste aufgenommen werden, die einen Anteil der Anreize auf die teilnehmenden Extender verteilt; die Details zur Aufnahme werden veröffentlicht, sobald die Liste öffnet. Jeder Miner übernimmt die Extender-Rolle bereits neben dem Egress. Offen ist, wie sich die Reichweite eines Extenders dort messen lässt, wo sie am meisten zählt, ohne seine Nutzer preiszugeben, und wie die äußeren Schichten Hostnamen und Zertifikate rotieren sollten, wenn sich Blockaden anpassen.' },
            { tag: 'UR-FP2', title: 'Client-Miner-Zuordnung',
              body: 'Sampling-Algorithmus, der eine 10×-Zufallsstichprobe potenzieller Miner lädt und proportional zu Zuverlässigkeit × Client-Bewertung mischt. Sybil-Resistenz wird durch die Bedingung garantiert, dass die Summe der Zuverlässigkeit pro IP-Subnetz höchstens 1 beträgt.',
              approach: 'Das Zuordnungssystem lädt eine Zufallsstichprobe möglicher Miner aus dem Speicher — etwa das Zehnfache der benötigten Zahl — und mischt sie proportional zu Zuverlässigkeit × Client-Bewertung, um die Finalisten zu bestimmen. Sein Schutz gegen Miner-Aliasing (Sybil-Angriffe) ist eine Obergrenze pro IP-Subnetz: Die Zuverlässigkeitswerte aller Miner eines Subnetzes summieren sich auf höchstens 1, sodass das Aufteilen einer Verbindung in viele Identitäten ihren Anteil an Zuordnungen nicht erhöht. Der Einstiegspunkt ist FindProviders2.',
              links: [
                  { href: 'https://github.com/urnetwork/server/blob/main/model/network_client_location_model.go', label: 'network_client_location_model.go' }
              ],
              directions: 'Bei der Zuordnung Hops mit öffentlicher IP und Port von Hops ohne unterscheiden, um Geschwindigkeit und Verbindungsqualität explizit gegeneinander abzuwägen statt nur über die Zuverlässigkeit. Die Gewichte für Zuverlässigkeit und Client-Bewertung sowie die Stichprobengröße sind die natürlichen Stellgrößen, die ein experimenteller Betreiber gegen die unten beschriebenen anonymisierten Block-Exporte variieren kann — bei fester Obergrenze pro Subnetz als Sybil-Schranke.' },
            { tag: 'UR-MULTI', title: 'Multi-Client',
              body: 'Heuristischer Sweep-Algorithmus, der ein Fenster von Minern verwaltet. Sperrt den Verkehr in die beste verfügbare Stufe basierend auf Übertragungsschwellen statt Protokollanalyse.',
              approach: 'Ein heuristischer Sweep verwaltet ein Fenster von Minern und sperrt den Verkehr in die Miner der höchsten verfügbaren Stufe. Entschieden wird anhand von Übertragungsschwellen — wie viel ein Miner tatsächlich übertragen hat — und nicht durch Inspektion des Protokolls im Tunnel, sodass der Router den Anwendungsverkehr nie ansehen muss. Das Fenster erlaubt einem Client, mehrere Miner gleichzeitig im Spiel zu halten und den Verkehr zwischen ihnen zu verschieben, wenn sich ihre gemessene Übertragung ändert.',
              links: [
                  { href: 'https://github.com/urnetwork/connect/blob/main/ip_remote_multi_client.go', label: 'ip_remote_multi_client.go' }
              ],
              directions: 'Die Schwellen und Stufengrenzen sind heute von Hand gesetzt. Offene Fragen für einen experimentellen Betreiber: ob sie stattdessen aus gemessenen Übertragungsverteilungen abgeleitet werden sollten, und ob das Fenster auch die Lebendigkeits- und Latenzstatistiken pro Miner einbeziehen sollte, die Validatoren jetzt erzeugen (siehe Routing-Verifizierung), damit ein Client ein schwaches Glied meidet, bevor er es mit eigenem Verkehr bezahlt hat.' },
            { tag: 'UR-TRANSFER', title: 'Übertragung',
              body: 'Zuverlässiges Zustellungsfenster, optimiert für Umgebungen mit hoher Latenz. Protokoll-Neuübertragungen sind deaktiviert, da das Fenster zuverlässige Zustellung gewährleistet. Verteilt den Verkehr über Transporte nach Leistungsranking.',
              approach: 'Ein zuverlässiges Übertragungsfenster ist auf Umgebungen mit hoher Latenz abgestimmt. Da das Fenster selbst zuverlässige Zustellung gewährleistet, sind Protokoll-Neuübertragungen in die Übertragungsschicht deaktiviert: Ein durch den Tunnel geführter TCP-Stream wird nicht noch einmal obendrauf neu übertragen. Der Verkehr wird nach Leistungsranking und Verfügbarkeit auf die verfügbaren Transporte verteilt, sodass ein langsamer oder ausfallender Transport Anteil verliert, statt den Stream zum Stillstand zu bringen.',
              links: [
                  { href: 'https://github.com/urnetwork/connect/blob/main/transfer.go', label: 'transfer.go' }
              ],
              directions: 'Offene Fragen: wie sich das Fenster über die Bandbreite realer Latenzen statt für ein festes Profil selbst dimensionieren sollte, wie Transporte neu gereiht werden sollten, wenn sich ihre Leistung mitten im Stream ändert, und wie die Übertragungsschicht mit den für den Transport geplanten Stream-Upgrades (siehe Leistung) zusammenspielen sollte, wenn ein Hop Peer-to-Peer ist und der nächste nicht.' },
            { tag: 'UR-IP', title: 'IP-Egress',
              body: 'IP-Stack-Implementierung mit minimalem Speicherverbrauch. Setzt zuverlässige Peer-Kommunikation über die Übertragungsschicht voraus, daher werden Neuübertragungen entsprechend optimiert.',
              approach: 'Der IP-Stack ist auf minimalen Speicherverbrauch ausgelegt, damit ein Miner auch auf einem Telefon oder einem kleinen Gerät als Egress dienen kann. Er setzt zuverlässige Kommunikation mit der Gegenseite über die Übertragungsschicht voraus, wodurch seine eigene Neuübertragungslogik wegoptimiert statt dupliziert werden kann. Die Sicherheitsschicht (siehe Sicherheit) sitzt im selben Pfad, sodass jedes Paket geprüft wird, bevor es den Miner verlässt.',
              links: [
                  { href: 'https://github.com/urnetwork/connect/blob/main/ip.go', label: 'ip.go' }
              ],
              directions: 'Offene Fragen: wie weit der Speicherbedarf auf den kleinsten Geräten noch sinken kann, und wie der Egress-Stack seine Garantien behält, wenn die Zuverlässigkeitsannahmen der Übertragungsschicht für die für den Transport geplanten Peer-to-Peer-Stream-Upgrades gelockert werden. Wie beim Transport werden Änderungen auf einem experimentellen Betreiber erprobt, bevor sie zum Standard werden.' },
            { tag: 'UR-PSUB2', title: 'Belohnungszuteilung',
              body: 'Unabhängige Validatoren bewerten jeden Betreiber-Pool nach Nachfrage und gemessener Qualität; Bittensors Yuma Consensus verwandelt diese Bewertungen in Emission. Innerhalb eines Pools stuft ein Betreiber seine Miner nach bedienten Verträgen und Zuverlässigkeit ein, legt in jedem Zyklus eine Merkle-Auszahlungswurzel fest, und jeder Miner beansprucht seinen Anteil direkt vom Abrechnungsvertrag.',
              approach: 'Belohnungen sind die Emission des UR-Subnets auf SN25. Die Miner jedes Betreibers bilden einen Pool mit einer Miner-UID. In jedem Tempo bewerten unabhängige Validatoren jeden Pool nach implizierter Nutzung × gemessener Qualität (die Epochen-Einlage des Betreibers geteilt durch den veröffentlichten Satz seiner Conviction-Stufe, mal der Miner-Qualität des Pools aus den eigenen Trails des Validators) unter Commit-Reveal, und Yuma Consensus verwandelt den Median in Emission. Innerhalb des Pools stuft der Betreiber die Miner nach bedienten Verträgen × Zuverlässigkeit ein, legt in jeder Epoche eine Merkle-Auszahlungswurzel fest, und jeder Miner beansprucht seinen Anteil direkt vom Abrechnungsvertrag. Die Top-Flotten nach routbarer IP-Breite halten eigene UIDs und werden nativ bezahlt. Solange der veröffentlichte Preis 0 ist, werden keine Einlagen eingesammelt und jeder Pool trägt dieselbe implizierte Nachfrage, sodass allein die gemessene Qualität den Pool-Kanal steuert.',
              links: [
                  { href: 'https://github.com/urnetwork/server/blob/main/model/account_payment_model_plan.go', label: 'account_payment_model_plan.go' },
                  { href: 'https://github.com/urfoundation/sn/blob/main/WHITEPAPER.md', label: 'WHITEPAPER.md §7–§10' },
                  { href: 'https://github.com/urfoundation/sn/tree/main/validator', label: 'sn/validator' }
              ],
              directions: 'θ ist ein veröffentlichter Governance-Parameter: tail-lastig starten (θ ≈ 0,3), die realisierte Vergütung pro Stufe messen und θ ausweiten, wenn die Menge der Top-Miner und der Qualitätskonsens unabhängiger Validatoren reifen — unter der Bedingung, dass der am schlechtesten bezahlte Top-Level-Miner weiterhin mindestens so viel verdient wie der bestbezahlte Pool-Miner. Der Ausschlag, den die Qualität auf das Pool-Gewicht hat, ist beim Bootstrap begrenzt und wird hochgefahren. Eine Aufwandsprämie für Validatoren ist entworfen, aber geparkt und wird nur gebaut, wenn das laufende Netzwerk zeigt, dass unabhängige Abdeckung sie braucht. Die Dezentralisierung der Validatorenmenge über die Eigentümermehrheit hinaus ist ein bewusster späterer Governance-Schritt.' },
            { tag: 'UR-CONTRACT', title: 'Berechtigung',
              body: 'Die Übertragung zwischen Parteien erfordert einen verschlüsselten Vertrag mit Treuhandguthaben und einem Berechtigungssatz. Beide Seiten müssen mit bestätigten Byte-Zählern abschließen; Meinungsverschiedenheiten lösen einen erzwungenen Lösungsprozess aus.',
              approach: 'Die Übertragung zwischen einem Initiator und einem Companion erfordert einen Vertrag, der mit dem geheimen Schlüssel des Ziel-Clients verschlüsselt ist. Der Vertrag hält ein festes Übertragungsguthaben in Treuhand und legt die Berechtigungen zwischen beiden Parteien fest. Der Companion kann gepaarte Verträge für den Rückverkehr anlegen, und Multi-Hop-Pfade senden Stream-Open- und Stream-Close-Ereignisse an die Zwischenstationen. Nach der Nutzung schließen beide Parteien den Vertrag mit einem bestätigten Byte-Zähler ab. Schließt eine Seite nicht ab oder weichen die Summen voneinander ab, entscheidet die Vertragsauflösung über das Ergebnis; meldet eine Seite Missbrauch, wird künftige Übertragung zwischen diesen Parteien blockiert.',
              links: [
                  { href: 'https://github.com/urnetwork/server/blob/main/model/subscription_model.go', label: 'subscription_model.go' }
              ],
              directions: 'Bediente Verträge × Zuverlässigkeit ist zugleich die Standardbasis des Betreibers für seine Pool-Auszahlungsliste, sodass die Genauigkeit der abgeschlossenen Byte-Zähler in die Belohnungen einfließt. Offene Fragen: wie eine Abweichung zwischen zwei Abschlusszählern ohne eine vertrauenswürdige dritte Summe beigelegt werden kann, wie gepaarte Rückverträge für asymmetrischen Verkehr dimensioniert sein sollten und wie eine Missbrauchsmeldung zu gewichten ist, wenn die Zähler beider Parteien schon früher voneinander abwichen.' },
            { tag: 'UR-SEC1', title: 'Sicherheit',
              body: 'Port-Sperrliste und IP-Sperrliste zum Schutz des Miner-Netzwerks. Führt keine Protokollinspektion durch — Miner leiten nur verschlüsselten Verkehr weiter.',
              approach: 'Die Sicherheitsschicht verwendet Port- und IP-Sperrlisten. Sie inspiziert keine Anwendungsprotokolle: Miner leiten nur verschlüsselten Verkehr weiter, es gibt also nichts zu inspizieren, und die Sperrlisten sind es, die einen Miner Verkehr ablehnen lassen, der gängigen Regulierungsrichtlinien wie CFAA und DMCA widerspricht, und bekannte bösartige Ziele verwerfen lassen. Die Listen gelten auf dem Miner, sodass der Verkehr eines Nutzers an jedem Exit auf dieselben Regeln trifft.',
              links: [
                  { href: 'https://github.com/urnetwork/connect/blob/main/ip_security.go', label: 'ip_security.go' }
              ],
              directions: 'Offene Fragen: wie Sperrlisten über eine Flotte verteilt und aktualisiert werden sollten, ohne eine zentrale Stelle, die den Verkehr sehen kann; ob die Sicherheitsschicht die Reputation je Ziel aus anonymisierten Egress-Daten lernen sollte statt aus statischen Listen; und was ein Miner seinen eigenen Listen hinzufügen dürfen sollte, ohne das Verhalten des Netzwerks über die Exits hinweg zu spalten.' },
            { tag: 'UR-VERIFY1', title: 'Routing-Verifizierung',
              body: 'Validatoren durchlaufen vom Server zugewiesene Ketten von Minern und belegen den Live-Egress aus jedem Hop mit vier Ed25519-Signaturen. Statistiken zu Abschluss und Latenz pro Schritt finden das schwächste Glied und werden zum Qualitätssignal, das die Pool-Emission steuert.',
              approach: 'Ein Validator startet einen Trail über einen Miner seiner Wahl und ruft /verify auf; der Server leitet den Hop aus der Quell-IP der Anfrage ab, nie aus einer Behauptung. Jeder nächste Hop wird gleichverteilt zufällig ohne Zurücklegen gezogen und erst offengelegt, wenn der aktuelle Hop bestätigt ist, sodass sich ein Pfad nicht vorausberechnen lässt. Vier Ed25519-Signaturen binden den Trail: SEED und EXTEND vom Validator, ASSIGN und FINAL vom Server, der auch jede Hop-Zeit stempelt. Ein Fehlschlag wird dem einen Hop zugeschrieben, der nie erreicht wurde, die Latenz wird pro Schritt bei der Bestätigung erfasst, der vom Validator gewählte Seed-Hop wird ausgeschlossen, und jeder Miner wird, sobald er genug Exposition hat, über ein Wilson-Score-Intervall für den Abschluss und Latenzperzentile berichtet.',
              links: [
                  { href: 'https://github.com/urnetwork/server/blob/main/controller/verify_controller.go', label: 'verify_controller.go' },
                  { href: 'https://github.com/urfoundation/sn/tree/main/validator', label: 'sn/validator' },
                  { href: 'https://github.com/urfoundation/sn/blob/main/VALIDATOR.md', label: 'VALIDATOR.md' }
              ],
              directions: 'Ein abgeschlossener Trail beweist sequenziellen Live-Transit zu einem bekannten Ziel, nicht die ehrliche Weiterleitung von Nutzerverkehr, und Selbstbegünstigung pro Hop ist nur statistisch beschränkt — durch eine unabhängige Validatorenpopulation. Der Weg zu auszahlungstauglicher Messung: Proof-of-Routing durch Attestierung der Nachbarn, Zielvielfalt, damit ein Miner den einen gemessenen Pfad nicht optimieren kann, Sybil-Resistenz der Validatoren über Stake und ein hierarchisches Hazard-Modell für die Zuschreibung. Bis dahin sind die Statistiken Lebendigkeits- und Latenzüberwachung sowie vorläufige Bewertung.' }
        ],
        competition: {
            title: 'Sim-Latenz-Algo-Wettbewerb',
            eyebrow: 'Unterstützt von Apex (SN1)',
            body: 'Optimiere das UR-Protokoll. Einreichungen werden gegen einen Branch {code} bewertet, und der Gewinner wird zur nächsten Baseline und erhält SN1α. Sechs Runden zu je einer Woche, Start am 2026-09-28. Los geht’s!',
            codeLabel: 'des Codes',
            cta: 'Am Wettbewerb teilnehmen',
            statusUpcoming: 'Beginnt am {date}',
            statusLive: 'Läuft',
            statusEnded: 'Beendet',
            imageAlt: 'Zwei Knoten, verbunden über Routen durch eine Barriere: der Apex-Sim-Latenz-Wettbewerb'
        },
        anonymization: {
            title: 'Anonymisierung',
            body: 'Der Auszahlungsblock des Netzwerks beträgt 7 Tage, und die Exporte der Ein- und Ausgaben jedes Algorithmus werden pro Block anonymisiert. Jede Client-ID und jeder IP-Subnetz-Hash wird durch einen einfachen ganzzahligen Zähler ersetzt, sodass eine Identität innerhalb eines Blocks konsistent ist, aber nichts über Blöcke hinweg und nichts zu einer Produktions-ID zurück trägt. Stadt-Metadaten sind nicht enthalten. Die Block-Exporte sind zur Veröffentlichung vorbereitet, aber noch nicht veröffentlicht; diese Seite wird sie verlinken, sobald sie es sind.'
        },
        researchers: {
            title: 'Für Forschende und Entwickler',
            body: 'UR möchte, dass Nutzer sich über föderierte Netzbetreiber für experimentelle Algorithmen entscheiden können. Ein neuer Betreiber tritt demselben Anreizsystem bei, das heute die Miner bezahlt, und ein Miner kann so viele Betreiber bedienen, wie er will. Die App wird jedem Nutzer die Option bieten, eine alternative Betreiber-Domain einzugeben. Zugangsdetails für experimentelle Betreiber werden veröffentlicht, sobald das Programm öffnet, und diese Seite verfolgt den aktuellen Standardalgorithmus und die experimentellen Richtungen. Für Sicherheitsforschung folge der {vdp}.',
            vdpLabel: 'Richtlinie zur Offenlegung von Schwachstellen'
        },
        audits: {
            title: 'Audits',
            intro: 'Peer-Audits des Protokolls und seiner Implementierungen.',
            tag: 'Peer-Audit',
            items: [
                { id: 'cure53-2026', pending: true, name: 'Verschlüsselungsaudit 2026', firm: 'Cure53',
                  tag: 'Geplant', status: 'Geplant für November – Dezember 2026',
                  scope: 'Umfang: Design der Verschlüsselung und Korrektheit der Implementierung.',
                  note: 'Die Ergebnisse werden von UR und Cure53 veröffentlicht.' },
                { id: 'masa-l2-2025', name: 'MASA L2 2025', firm: 'Leviathan Security Group',
                  status: 'Abgeschlossen im Mai 2025' }
            ]
        },
        publications: {
            title: 'Paper',
            comingSoon: 'arXiv — demnächst',
            items: [
                { title: 'Whole Internet Encryption for the whole world' }
            ]
        }
    },

    community: {
        eyebrow: 'Gemeinschaft',
        title:   'Die Menschen hinter dem Netzwerk.',
        intro:   'Das Protokoll ist offen. Die Gemeinschaft, die es aufbaut und betreibt, wächst. Hier findest du sie.',
        items: [
            { tag: '01', title: 'Discord',              body: 'Allgemeine Diskussion über das Projekt — Protokollentwicklung, Miner-Support und Community.', href: 'https://discord.gg/urnetwork', linkLabel: 'Discord beitreten' },
            { tag: '02', title: 'Bittensor-SN-Discord', body: 'Bittensor-spezifische Diskussion — Subnet, Emission, Validatoren und Staking.', soon: 'Demnächst' },
            { tag: '03', title: 'Brand Kit',           body: 'URnetwork und das Connector-Logo sind eingetragene US-Marken. Nutzern des Protokolls wird gestattet, das Brand Kit als „powered by UR" oder „with URnetwork" oder ähnliche Komponentenhinweise zu verwenden.', button: { label: 'Brand Kit herunterladen' } }
        ],
        supportersTitle: 'Unterstützer',
        partnersTitle:   'Partner'
    }
};
