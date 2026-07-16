// Deutsch — spiegelt die kanonische Quelle en.js Schlüssel für Schlüssel.
// Wird dort ein Schlüssel hinzugefügt, muss er auch hier ergänzt werden.
export default {
    nav: {
        whitepaper: 'Whitepaper',
        operators:  'Betreiber',
        miners:     'Miner',
        validators: 'Validatoren',
        research:   'Forschung',
        community:  'Gemeinschaft',
        price:      'Nutzungskosten',
        docs:       'Dokumentation',
        roadmap:    'Roadmap',
        tagline:    'Besitze deine Privatsphäre. Besitze dein Netzwerk.',
        languageMenu: 'Sprache',
        menu:         'Menü',
        closeMenu:    'Menü schließen',
        browseDocs:   'Dokumentation',
        apiReference: 'API-Referenz',
        search:       'Suche',
        ctaAria:    'Nutzungskosten — der aktuelle Netzwerkpreis',
        denomAria:  'Preiswährung'
    },

    footer: {
        github:     'GitHub',
        contact:    'Kontakt',
        copyright:  '© 2026 BringYour, Inc.',
        disclaimer: 'Diese Website ist ein quelloffenes Utility-Protokoll, getragen von einer Gemeinschaft von Teilnehmern, und wird getrennt vom Netzbetreiber betrieben, der den Zugang zum Netzwerk verkauft.',
        languagesAria: 'Sprachen',
        terms:      'Nutzungsbedingungen',
        privacy:    'Datenschutz',
        vdp:        'VDP'
    },

    // Statistik-Labels werden unverändert gerendert (kein CSS text-transform),
    // damit das α-Zeichen und die Einheit GiB ihre Schreibweise behalten —
    // bitte in finaler Form schreiben.
    stats: {
        protocolLedger:  'Subnet-Ledger',
        blockNumber:     'BLOCKNUMMER',
        dataPerBlock:    'GESAMTDATEN / BLOCK (GiB)',
        usersPerBlock:   'GESAMTNUTZER / BLOCK',
        totalNetworks:   'NETZWERKE GESAMT',
        stakedInContract:'IM VERTRAG GESTAKT (α)',
        demandDeposits:  'NACHFRAGE-EINLAGEN / BLOCK (α)',
        minerEmissions:  'MINER-EMISSION / BLOCK (α)',
        networkOperators:'NETZBETREIBER'
    },

    sim: {
        block: 'BLOCK',
        blockProgressAria: 'Fortschritt des aktuellen Blocks',
        endsAt: 'Endet um 00:00 UTC am {date}. Noch {d}T {h}h {m}min {s}s bis zum Blockende'
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
        rawFile:   'Rohe Preistabelle (price.yml)'
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
                body: 'Miner werden zugleich Egress und Ingress. Jeder Miner erkennt seine Umgebung automatisch und konfiguriert sich so, dass er alles tut, was er kann — er trägt Ingress-Verkehr ebenso wie Egress-Verkehr. Das Ingress-Netzwerk greift das N-Schicht-Verschlüsselungsdesign der Erweiterer wieder auf, ergänzt um neue clientseitige Logik, die iterativ Erweiterer entdeckt, die sich zeitgesteuert freischalten — so rotieren laufend frische Einstiegspunkte in Reichweite.'
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
            body:  'Die Bedingungen für die Nutzung dieser Website und der hier dokumentierten Protokollschnittstellen. Das vollständige Dokument wird derzeit finalisiert und hier veröffentlicht.'
        },
        privacy: {
            title: 'Datenschutzerklärung',
            body:  'Diese Website erfordert kein Konto und erhebt keine personenbezogenen Daten — die angezeigten Preis- und Netzwerkzahlen werden direkt aus öffentlichen Feeds geladen. Die vollständige Erklärung wird derzeit finalisiert und hier veröffentlicht.'
        },
        vdp: {
            title: 'Richtlinie zur Offenlegung von Schwachstellen',
            body:  'Wir begrüßen gutgläubige Sicherheitsforschung am Protokoll und an dieser Website. Melde Schwachstellen an support@ur.xyz. Die vollständige Richtlinie — Umfang, Safe Harbor und Offenlegungsfristen — wird derzeit finalisiert und hier veröffentlicht.'
        }
    },

    whitepaper: {
        eyebrow: 'Whitepaper',
        title:   'Ein Datenschutznetzwerk, koordiniert auf Bittensor.',
        clauses: [
            {
                numeral: 'I.',
                title:   'Ein dezentrales Datenschutznetzwerk',
                body: [
                    'UR ist ein dezentrales Datenschutznetzwerk. Es verteilt den Nutzerverkehr über ein globales Netzwerk unabhängiger Miner mittels Multi-Hop-Routing und geschichteter Verschlüsselung, sodass kein einzelner Miner zugleich sieht, wer ein Nutzer ist und was er tut. Der Transport ist so konzipiert, dass er gewöhnlichem HTTPS ähnelt — N-Schicht-TLS-Verschlüsselung, SNI-Spoofing und Verkehrsununterscheidbarkeit — damit das Netzwerk nahezu überall erreichbar bleibt.',
                    'Das UR Subnet koordiniert dieses Netzwerk über On-Chain-Anreize auf Bittensor. Netzbetreiber betreiben die Server; unabhängige Miner tragen den Ingress- und Egress-Verkehr; und unabhängige Validatoren durchlaufen fortlaufend vom Betreiber zugewiesene Ketten von Minern, um Echtzeit-Transit nachzuweisen und zu messen, welche Miner die schwächsten Glieder sind. Diese Messung ist das zentrale Signal, für das das Netzwerk zahlt.',
                    'Bittensors Yuma Consensus verwandelt die Messungen der Validatoren in Token-Emission, und ein Smart Contract auf der Subtensor EVM wickelt die Auszahlungen ab. Das Protokoll ist quelloffen, und der Betrieb eines Miners oder eines Validators ist erlaubnisfrei.'
                ]
            },
            {
                numeral: 'II.',
                title:   'Rollen',
                body: [
                    'Netzbetreiber betreiben die Datenschutzserver und den Verifizierungsendpunkt. Ein Betreiber zahlt in das Subnet ein, signiert jeden gemessenen Pfad mit und legt eine Auszahlungsliste fest, die seine Belohnungen auf die ihm zugeordneten Miner aufteilt. Ein Betreiber bestimmt, wohin seine Belohnungen fließen, verwahrt aber niemals fremde Gelder.',
                    'Miner sind der Ingress und Egress des Netzwerks. Sie betreiben ein standardmäßig sicheres Sicherheitsmodell, blockieren bekannte bösartige IPs und leiten nur verschlüsselten Verkehr weiter. Ein Miner trägt Verkehr für einen oder mehrere Betreiber und wird für die routbare Kapazität bezahlt, die er beisteuert.',
                    'Validatoren sind unabhängig. Jeder setzt sein eigenes UR ein, führt das Routing-Verifizierungsprotokoll aus und bewertet den Pool jedes Betreibers nach Nachfrage und gemessener Qualität. Validatoren verdienen die nativen Dividenden des Netzwerks für genaue, konsenskonforme Bewertung — kein Betreiber besitzt einen Validator, und die Menge ist erlaubnisfrei.',
                    'Der Subnet-Eigentümer — BringYour, Inc. — verwaltet den Abrechnungsvertrag und betreibt die Reserve des Netzwerks. Diese Rolle ist übergangsweise: Die Kontrolle beginnt zentralisiert, aber begrenzt und dezentralisiert sich schrittweise (Abschnitt V).'
                ]
            },
            {
                numeral: 'III.',
                title:   'Der UR-Token',
                body: [
                    'UR ist der native Token des Subnets — die Recheneinheit für Einzahlungen, Emission und Abrechnung. Es ist ein Utility-Token zur Koordinierung und Bezahlung von Netzwerkressourcen; es ist nicht dafür konzipiert, irgendein Recht auf Gewinne, Einkommen oder Renditen darzustellen oder zu gewähren.',
                    'Neues UR wird von Bittensors Coinbase in jedem Zyklus emittiert und dreifach aufgeteilt:',
                    { type: 'table', head: ['Strom', 'Anteil', 'Empfänger'], rows: [
                        ['Eigentümer', '18%', 'BringYour, Inc. — Subnet-Eigentümer und Netzwerkreserve'],
                        ['Miner',      '41%', 'Miner — über Betreiber-Pools und Top-Level-Miner-Slots'],
                        ['Validatoren','41%', 'Unabhängige Validatoren — native Dividenden für genaue Bewertung']
                    ]},
                    'Betreiber finanzieren das Netzwerk, indem sie UR in Höhe ihrer tatsächlichen Nutzung zu einem veröffentlichten Referenzsatz einzahlen. Eine Einzahlung ist ein kostspieliges, umsatzgedecktes Signal echter Nachfrage — und sie ist Überzeugungseinsatz (Conviction Stake): Der Vertrag überführt jede Einzahlung in eine gesperrte Reserve, wo sie anwächst und niemals umverteilt wird, wodurch UR im Verhältnis zur tatsächlichen Nutzung dauerhaft aus dem liquiden Angebot entfernt wird. Der kumulierte gesperrte Einsatz eines Betreibers senkt den Satz, den er hinterlegen muss, sodass engagierte Betreiber mit weniger Vorabkapital einsteigen können.',
                    'Miner werden aus der Emission bezahlt, nicht aus Einzahlungen. Da Einzahlungen gesperrt statt wiederverwendet werden, wird tatsächliche Nutzung zu einem dauerhaften, wachsenden Kaufgebot unter dem Token statt zu Verkaufsdruck, während die Emission einem festen Zeitplan mit Halbierungen folgt.'
                ]
            },
            {
                numeral: 'IV.',
                title:   'Zwei Wege zu verdienen',
                body: [
                    'Ein einzelner Betreiber kann weit über 100.000 Miner bedienen — weit mehr als die rund 256 On-Chain-Slots eines Subnets — daher bezahlt das Netzwerk Miner über zwei parallel laufende Stufen.',
                    'Der Pool ist der Einstieg. Jeder Betreiber hält einen On-Chain-Slot für alle seine Miner; Validatoren gewichten diesen Pool nach der Nachfrage des Betreibers und seiner gemessenen Qualität, und jeder Miner beansprucht seinen Anteil direkt vom Abrechnungsvertrag mit einem kryptografischen Nachweis. Es gibt keinen Slot zu gewinnen und nichts zu verbrennen — hier beginnt ein Miner und verdient eine Grundbelohnung.',
                    'Top-Level-Miner sind die Spitze des Angebots. Die rund 200 größten Flotten — eingestuft danach, wie viele verschiedene, routbare Exit-IPs sie tatsächlich bedienen, nicht nach Verkehrsvolumen — beanspruchen jeweils ihren eigenen On-Chain-Slot und werden direkt vom Netzwerk bezahlt, ohne Betreiber im Auszahlungspfad. Eine gemeinsam genutzte IP wird auf die Flotten aufgeteilt, die sie beanspruchen, sodass Breite nicht doppelt gezählt werden kann.',
                    'Die zwei Stufen sind ein einziges Turnier: Ein Miner beginnt in einem Pool, steigt zu einem Top-Slot auf, wenn seine routbare IP-Breite wächst, und fällt in den Pool zurück, wenn er abrutscht. Ein per Governance festgelegter Anteil teilt die Emission zwischen Spitze und Ausläufer auf.',
                    { type: 'list', items: [
                        'Pool-Stufe — der Einstieg: einem Betreiber ohne Slot und ohne Registrierungskosten beitreten; Validatoren gewichten den Pool nach Nachfrage und Qualität; jeder Miner beansprucht seinen Anteil per Nachweis in jedem Abrechnungszeitraum.',
                        'Top-Level-Miner — die Spitze: die ~200 Flotten mit der breitesten routbaren IP-Abdeckung beanspruchen ihren eigenen Slot und werden direkt vom Netzwerk bezahlt, ohne Betreiber, ohne Pool und ohne Zwischenhändler.'
                    ]}
                ]
            },
            {
                numeral: 'V.',
                title:   'Verwahrung, Abrechnung und Dezentralisierung',
                body: [
                    'Die Abrechnung läuft in einem Sieben-Tage-Zyklus. Der Vertrag sammelt die Emission jedes Pools über den Zeitraum an und öffnet dann die Ansprüche: Miner beziehen ihr UR direkt vom Vertrag gegen die festgelegte Auszahlungsliste ihres Betreibers. Top-Level-Miner benötigen keinen Abrechnungsschritt — die Chain bezahlt ihren Slot in jedem Zyklus nativ.',
                    'Niemand verwahrt fremde Gelder. Der Abrechnungsvertrag ist der alleinige Verwahrer von in Transit befindlichem UR, jede Pool-Auszahlung ist ein direkter On-Chain-Anspruch, und Top-Level-Miner werden nativ auf ihre eigenen Schlüssel bezahlt. Betreiber und der Eigentümer nehmen niemals die Belohnungen der Miner in Verwahrung.',
                    'Verdiente Ansprüche sind endgültig. Sobald ein Abrechnungszeitraum finalisiert ist, sind die Token, die seine Ansprüche decken, verbindlich festgelegt — kein Upgrade, keine Pause und keine administrative Maßnahme kann sie blockieren oder rückgängig machen. Die gesperrte Reserve ist nach demselben Maßstab einseitig: Keine Funktion kann Gelder aus ihr herausbewegen.',
                    'Die Kontrolle dezentralisiert sich mit der Zeit. Das Netzwerk startet mit einem hinter einer Eigentümer-Multisig aktualisierbaren Vertrag — bewusste, begrenzte zentrale Kontrolle für frühe Fehlerbehebungen — und wird stufenweise gehärtet: ein öffentlicher Timelock für jede Änderung, ein reiner Pause-Guardian, der einen Exploit stoppen, aber niemals Gelder bewegen oder finalisierte Ansprüche blockieren kann, und mit der Zeit On-Chain-Governance sowie ein unveränderlicher Abrechnungskern.'
                ]
            }
        ],
        source: { label: 'Das vollständige Whitepaper lesen', href: 'https://github.com/urfoundation/sn/' }
    },

    operators: {
        eyebrow: 'Betreiber',
        title:   'Die Betreiber, die das Netzwerk betreiben.',
        intro:   'Netzbetreiber betreiben die Datenschutzserver und den Verifizierungsendpunkt. Ein Betreiber zahlt als kostspieliges, umsatzgedecktes Signal echter Nachfrage in das Subnet ein, führt das Routing-Verifizierungsprotokoll aus, das jeden gemessenen Pfad mitsigniert, und legt die Auszahlungsliste fest, die seine Belohnungen auf die ihm zugeordneten Miner aufteilt. Betreiber bestimmen, wohin Belohnungen fließen, verwahren aber niemals fremde Gelder.',
        cta: 'Netzbetreiber werden',
        roles: [
            { tag: '01', title: 'Die Server betreiben',    body: 'Betreiber betreiben die Datenschutzserver und den /verify-Endpunkt, der jeden gemessenen Pfad mitsigniert — die Koordinationsschicht zwischen Nutzern und den Minern, die den Verkehr tragen.' },
            { tag: '02', title: 'Echte Nachfrage signalisieren',  body: 'Betreiber zahlen UR in Höhe ihrer tatsächlichen Nutzung ein. Jede Einzahlung ist Überzeugungseinsatz, gesperrt in der Rückkaufreserve — niemals umverteilt —, also ein kostspieliges, umsatzgedecktes Signal, das Validatoren gewichten, wenn sie die Pools bewerten.' },
            { tag: '03', title: 'Die Auszahlungen steuern',  body: 'In jedem Abrechnungszeitraum legt ein Betreiber eine Merkle-Auszahlungsliste fest, die seinen Pool auf seine Miner aufteilt. Er steuert die Aufteilung, nimmt aber niemals etwas in Verwahrung — jeder Miner beansprucht seinen Anteil direkt vom Vertrag.' },
            { tag: '04', title: 'Erste Schritte',         body: 'Registriere einen Netzbetreiber-Schlüssel, betreibe den /verify-Server und zahle ein, um zu beginnen. Die Zulassung von Betreibern erfolgt während der Startphase durch den Eigentümer.', href: 'https://ur.xyz', linkLabel: 'Betreiber-Dokumentation' }
        ],
        directoryTitle: 'Netzbetreiber',
        directoryNote:  'Sortiert nach Netzwerken gesamt. Die Statistiken werden live aus dem öffentlichen Feed jedes Betreibers gelesen; die Icons führen zur App des Betreibers im jeweiligen Store.',
        dashboard: 'Dashboard',
        colOperator: 'BETREIBER',
        colStores:   'APP LADEN'
    },

    miners: {
        eyebrow: 'Miner',
        title:   'Die Miner, die den Verkehr tragen.',
        intro:   'Miner konkurrieren darum, möglichst viele IPv4-/29- und IPv6-/48-Subnetze im Netzwerk verfügbar zu machen — jedes davon jederzeit routbar für Ingress- oder Egress-Verkehr. Mit anderen Worten: Miner verwandeln das öffentliche Internet in ein anonymes privates Netzwerk, das jeder nutzen kann. Jeder Miner trägt sowohl Ingress- als auch Egress-Verkehr, betreibt ein standardmäßig sicheres Sicherheitsmodell, leitet nur verschlüsselten Verkehr weiter und wird aus der Subnet-Emission für die routbare Kapazität bezahlt, die er beisteuert. Die Flotten mit der größten Abdeckung an verschiedenen, routbaren Subnetzen werden zu Top-Level-Minern befördert und verdienen mehr — alles im User-Space, auf Hardware, die du bereits besitzt.',
        cta: 'Miner werden',
        roles: [
            { tag: '01', title: 'Egress',              body: 'Egress-Miner sind die Exit-IPs des gemeinsamen Netzwerks. Sie lehnen Verkehr ab, der gängigen Regulierungsrichtlinien wie CFAA und DMCA widerspricht, blockieren bekannte bösartige IPs und leiten nur verschlüsselten Verkehr weiter — was sowohl Miner als auch Nutzer schützt.' },
            { tag: '02', title: 'Ingress',             body: 'Ingress-Miner (Erweiterer) schaffen Einstiegspunkte, die die Erreichbarkeit weltweit verbessern — mittels N-Schicht-TLS, SNI-Spoofing und vertrauenswürdiger Weiterleitung. Eine rotierende Teilmenge wird in jedem Zyklus exponiert, und Clients versuchen automatisch erneut die Einstiegspunkte, die zuvor funktioniert haben.' },
            { tag: '03', title: 'Gemessen und zugeordnet',body: 'Unabhängige Validatoren durchlaufen Ketten von Minern, um Echtzeit-Transit nachzuweisen und Lebendigkeit sowie Qualität zu messen. Miner werden nach dieser Messung und nach Geschwindigkeit eingestuft, und jeder Betreiber betreibt seine eigene Zuordnung zwischen Nutzern und Minern.' },
            { tag: '04', title: 'Aus der Emission verdienen',  body: 'Miner werden aus der Emission des Subnets bezahlt. Innerhalb des Pools eines Betreibers beanspruchst du deinen Anteil bei jeder Abrechnung per Nachweis — eine niedrigschwellige Grundbelohnung, ohne Slot zu gewinnen und ohne etwas zu verbrennen.', href: 'https://docs.ur.io/provider', linkLabel: 'Miner-Dokumentation' },
            { tag: '05', title: 'Um die Spitze konkurrieren',  body: 'Miner konkurrieren um Reichweite. Das Netzwerk stuft Flotten danach ein, wie viele verschiedene, routbare Exit-IPs sie tatsächlich bedienen — nicht nach Verkehrsvolumen — und die rund 200 mit der breitesten Abdeckung werden zu Top-Level-Minern befördert: ein eigener On-Chain-Slot, nativ bezahlt, mit höherem Verdienst. Gemeinsam genutzte IPs werden auf die Flotten aufgeteilt, die sie beanspruchen, sodass einzigartige Abdeckung entscheidet — vergrößere deine Breite an verschiedenen IPs, um aufzusteigen, und wenn deine Reichweite nachlässt, fällst du in den Pool zurück.' }
        ]
    },

    validators: {
        eyebrow: 'Validatoren',
        title:   'Die Validatoren, die das Netzwerk vermessen.',
        intro:   'Validatoren sind unabhängig. Jeder setzt sein eigenes UR ein und führt das Routing-Verifizierungsprotokoll aus — dabei durchläuft er fortlaufend vom Betreiber zugewiesene Ketten von Minern, um Echtzeit-Transit nachzuweisen und zu messen, welche Miner die schwächsten Glieder sind. Diese Messung ist das zentrale Signal, für das das Netzwerk zahlt, und Validatoren verdienen native Dividenden dafür, sie genau zu erzeugen.',
        cta: 'Validator werden',
        roles: [
            { tag: '01', title: 'Die Routen durchlaufen',        body: 'Validatoren durchlaufen vom Betreiber zugewiesene Ketten von Minern und sammeln eine signierte, selbstbeweisende Aufzeichnung jedes abgeschlossenen Hops — kryptografischer Beweis von Echtzeit-Transit, den jeder überprüfen kann.' },
            { tag: '02', title: 'Das Netzwerk bewerten',      body: 'In jedem Zyklus bewertet ein Validator den Pool jedes Betreibers nach Nachfrage und gemessener Qualität und stuft die Top-Flotten nach routbarer IP-Breite ein — alles unter Commit-Reveal. Bittensors Yuma Consensus verwandelt diese unabhängigen Bewertungen in Miner-Emission.' },
            { tag: '03', title: 'Native Dividenden verdienen',  body: 'Validatoren verdienen Bittensor-native Dividenden für genaue, konsenskonforme Bewertung — ihre einzige Belohnung. Kein Betreiber besitzt einen Validator, und die Menge ist erlaubnisfrei.' },
            { tag: '04', title: 'Von Grund auf unabhängig',  body: 'Da Commit-Reveal die Bewertungen jedes Validators verbirgt, bis sie veraltet sind, bringt Kopieren nichts — ein Validator muss die Routen wirklich selbst durchlaufen. Die Messung bleibt ehrlich, und keine einzelne Partei kontrolliert sie.' }
        ]
    },

    research: {
        eyebrow: 'Forschung',
        title:   'Offene Algorithmen, offene Daten.',
        intro:   'Das Protokoll ist ein dezentral-natives Multi-IP-, Multi-Transport-System, das auf Millionen von Minern pro Netzbetreiber skalieren soll. Jeder Algorithmenbereich unten ist mit seinem Quellcode und, wo zutreffend, mit anonymisierten Datensätzen für unabhängige Analyse veröffentlicht.',
        papers: [
            { tag: 'URTRANSPORT1', title: 'Leistung',
              body: 'Multi-Hop-Routing über TCP-Transporte mit Fokus auf globale Erreichbarkeit. UDP- und Peer-to-Peer-Stream-Upgrades werden unterstützt, die Integration von WebRTC, XRay und WireGuard ist geplant.',
              href: 'https://github.com/urnetwork/connect/blob/main/transport.go', linkLabel: 'transport.go' },
            { tag: 'UREXTENDER1', title: 'Erreichbarkeit',
              body: 'N-Schicht-TLS-Verschlüsselung (N≥2), bei der jede äußere Schicht ein selbstsigniertes Zertifikat mit SNI-Spoofing zu einer Zwischen-IP verwendet und an einen weiteren Hop oder eine Ende-zu-Ende-TLS-Verbindung weiterleitet. Jeder kann einen Erweiterer auf jeder Domain hosten.',
              href: 'https://github.com/urnetwork/connect/blob/main/net_extender.go', linkLabel: 'net_extender.go' },
            { tag: 'UR-FP2', title: 'Client-Miner-Zuordnung',
              body: 'Sampling-Algorithmus, der eine 10×-Zufallsstichprobe potenzieller Miner lädt und proportional zu Zuverlässigkeit × Client-Bewertung mischt. Sybil-Resistenz wird durch die Bedingung garantiert, dass die Summe der Zuverlässigkeit pro IP-Subnetz höchstens 1 beträgt.',
              href: 'https://github.com/urnetwork/server/blob/main/model/network_client_location_model.go', linkLabel: 'network_client_location_model.go' },
            { tag: 'UR-MULTI', title: 'Multi-Client',
              body: 'Heuristischer Sweep-Algorithmus, der ein Fenster von Minern verwaltet. Sperrt den Verkehr in die beste verfügbare Stufe basierend auf Übertragungsschwellen statt Protokollanalyse.',
              href: 'https://github.com/urnetwork/connect/blob/main/ip_remote_multi_client.go', linkLabel: 'ip_remote_multi_client.go' },
            { tag: 'UR-TRANSFER', title: 'Übertragung',
              body: 'Zuverlässiges Zustellungsfenster, optimiert für Umgebungen mit hoher Latenz. Protokoll-Neuübertragungen sind deaktiviert, da das Fenster zuverlässige Zustellung gewährleistet. Verteilt den Verkehr über Transporte nach Leistungsranking.',
              href: 'https://github.com/urnetwork/connect/blob/main/transfer.go', linkLabel: 'transfer.go' },
            { tag: 'UR-IP', title: 'IP-Egress',
              body: 'IP-Stack-Implementierung mit minimalem Speicherverbrauch. Setzt zuverlässige Peer-Kommunikation über die Übertragungsschicht voraus, daher werden Neuübertragungen entsprechend optimiert.',
              href: 'https://github.com/urnetwork/connect/blob/main/ip.go', linkLabel: 'ip.go' },
            { tag: 'UR-PSUB2', title: 'Belohnungszuteilung',
              body: 'Unabhängige Validatoren bewerten jeden Betreiber-Pool nach Nachfrage und gemessener Qualität; Bittensors Yuma Consensus verwandelt diese Bewertungen in Emission. Innerhalb eines Pools stuft ein Betreiber seine Miner nach bedienten Verträgen und Zuverlässigkeit ein, legt in jedem Zyklus eine Merkle-Auszahlungswurzel fest, und jeder Miner beansprucht seinen Anteil direkt vom Abrechnungsvertrag.',
              href: 'https://github.com/urnetwork/server/blob/main/model/account_payment_model_plan.go', linkLabel: 'account_payment_model_plan.go' },
            { tag: 'UR-CONTRACT', title: 'Berechtigung',
              body: 'Die Übertragung zwischen Parteien erfordert einen verschlüsselten Vertrag mit Treuhandguthaben und einem Berechtigungssatz. Beide Seiten müssen mit bestätigten Byte-Zählern abschließen; Meinungsverschiedenheiten lösen einen erzwungenen Lösungsprozess aus.',
              href: 'https://github.com/urnetwork/server/blob/main/model/subscription_model.go', linkLabel: 'subscription_model.go' },
            { tag: 'UR-SEC1', title: 'Sicherheit',
              body: 'Port-Sperrliste und IP-Sperrliste zum Schutz des Miner-Netzwerks. Führt keine Protokollinspektion durch — Miner leiten nur verschlüsselten Verkehr weiter.',
              href: 'https://github.com/urnetwork/connect/blob/main/ip_security.go', linkLabel: 'ip_security.go' }
        ],
        competition: {
            eyebrow: 'Algo-Wettbewerb — powered by Apex (SN1)',
            body: 'Der Apex-Algo-Wettbewerb soll bis Monatsende mit dem 25-Launch starten; Ziel ist eine messbare Verbesserung der mittleren Latenz des Matchmaking-/Routing-Algorithmus um 10–20 %.',
            cta: 'Der Forschung beitreten'
        },
        datasetsLabel: 'Datensätze',
        datasetBlock: 'Block {n}',
        audits: {
            title: 'Audits',
            intro: 'Peer-Audits des Protokolls und seiner Implementierungen.',
            tag: 'Peer-Audit',
            items: ['MASA L2 2026', 'MASA L2 2025']
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
            { tag: '03', title: 'Markenkit',           body: 'URnetwork und das Connector-Logo sind eingetragene US-Marken. Nutzern des Protokolls wird gestattet, das Markenkit als „powered by UR" oder „with URnetwork" oder ähnliche Komponentenhinweise zu verwenden.', button: { label: 'Markenkit herunterladen' } }
        ],
        supportersTitle: 'Unterstützer',
        partnersTitle:   'Partner'
    }
};
