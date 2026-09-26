// Español — refleja en.js (la fuente canónica) clave por clave.
// Si se añade una clave allí, hay que añadirla también aquí.
export default {
    nav: {
        whitepaper: 'Litepaper',
        operators:  'Operadores',
        miners:     'Mineros',
        validators: 'Validadores',
        research:   'Investigación',
        community:  'Comunidad',
        price:      'Costo de uso',
        docs:       'Documentación',
        roadmap:    'Hoja de ruta',
        network:    'Red',
        tagline:    'Posee tu privacidad. Posee la red.',
        languageMenu: 'Idioma',
        menu:         'Menú',
        closeMenu:    'Cerrar menú',
        primaryNav:   'Navegación principal',
        mobileNav:    'Navegación móvil',
        siteMenu:     'Menú del sitio',
        browseDocs:   'Explorar documentación',
        apiReference: 'Referencia de API',
        search:       'Buscar',
        ctaAria:    'Costo de uso — el precio actual de la red',
        denomAria:  'Moneda del precio'
    },

    footer: {
        github:     'GitHub',
        contact:    'Contacto',
        license:    'MPLv2',
        disclaimer: 'Este sitio es un protocolo de utilidad de código abierto impulsado por una comunidad de participantes, operado de forma independiente al operador de red que vende el acceso a la red.',
        languagesAria: 'Idiomas',
        terms:      'Términos de uso',
        privacy:    'Privacidad',
        vdp:        'VDP',
        protocol:   'Protocolo',
        community:  'Comunidad',
        legal:      'Legal',
        learn:      'Conocer',
        resources:  'Recursos',
        connect:    'Conectar',
        bittensorDiscord: 'Discord de Bittensor',
        brandKit:   'Kit de marca',
        launchVideo: 'Video de lanzamiento',
        socialAria:     'Enlaces a la comunidad y redes sociales',
        socialX:        'URnetwork en X',
        socialTelegram: 'Subred UR en Telegram',
        socialDiscord:  'Discord de URnetwork',
        socialGithub:   'Subred UR en GitHub',
        productsAria:   'Productos de URnetwork en ur.io'
    },

    disclaimer: {
        protocol: 'UR es un protocolo de código abierto que impulsa infraestructura de red y es mantenido por su comunidad.',
        products: 'Para productos de URnetwork (por ejemplo, VPN), visita ur.io',
        before: 'UR es un protocolo de código abierto que impulsa infraestructura de red y es mantenido por su comunidad. Para productos de URnetwork (por ejemplo, VPN), visita'
    },

    launchVideo: {
        aria:  'Video de lanzamiento de UR',
        close: 'Cerrar video',
        sound: 'Toca para activar el sonido',
        play:  'Reproducir video',
        fullscreen: 'Pantalla completa',
        exitFullscreen: 'Salir de pantalla completa'
    },

    homepage: {
        intro: 'La subred UR es una red de privacidad construida sobre Bittensor. La subred recompensa a quienes la usan y contribuyen a ella. Los operadores ejecutan servidores y depositan alpha para enrutar tráfico. Los mineros transportan tráfico cifrado y reciben emisiones. Los validadores vuelven a medir la red, verifican su precisión y reciben emisiones.',
        diagramAria: 'Cómo funciona la red UR',
        rolesEyebrow: 'Participa en la red',
        rolesTitle: 'Tres roles. Una red medida.',
        roles: {
            operators: { name: 'Operadores', body: 'Los operadores ejecutan los servidores de privacidad y el endpoint de verificación. Depositan según el tráfico esperado, firman conjuntamente cada ruta medida y confirman la lista de pagos que divide las recompensas entre sus mineros. Los depósitos pasan a una reserva y los operadores nunca custodian fondos ajenos.', explore: 'Explorar Operadores' },
            miners: { name: 'Mineros', body: 'Los mineros transportan el tráfico. Ejecutan nodos que enrutan tráfico cifrado para uno o más operadores y reciben emisiones de la subred según la capacidad que aportan.', explore: 'Explorar Mineros' },
            validators: { name: 'Validadores', body: 'Los validadores vuelven a medir la red. Ejecutan el protocolo de verificación de rutas y puntúan cada pool de operador según la demanda y la calidad medida. Reciben emisiones de la subred por puntuar con precisión.', explore: 'Explorar Validadores' }
        },
        whitepaperCta: 'Para más detalles, lee el litepaper',
        metaTitle: 'UR | La red de privacidad descentralizada en Bittensor SN25',
        metaDescription: 'UR es una red de privacidad descentralizada en Bittensor SN25: los mineros llevan tráfico cifrado, los validadores lo miden y los operadores traen la demanda.'
    },

    diagram: {
        subnet: 'Subred',
        aria:   'La red UR — {subnet}, {operators}, {miners} y {validators}; resaltado: {active}',
        goTo:   'Ir a {label}'
    },

    // Las etiquetas de estadísticas se muestran tal cual (sin text-transform
    // en CSS) para que el glifo α y la unidad GiB conserven su caja —
    // escríbelas en su forma final.
    stats: {
        protocolLedger:  'Libro de la subred',
        refresh:         'Actualizar estadísticas',
        blockNumber:     'NÚMERO DE BLOQUE',
        dataPerBlock:    'DATOS TOTALES / BLOQUE (GiB)',
        usersPerBlock:   'USUARIOS TOTALES / BLOQUE',
        totalNetworks:   'REDES TOTALES',
        stakedInContract:'EN STAKE EN EL CONTRATO (α)',
        demandDeposits:  'DEPÓSITOS DE DEMANDA / BLOQUE (α)',
        minerEmissions:  'EMISIÓN DE MINEROS / BLOQUE (α)',
        networkOperators:'OPERADORES DE RED',
        testnet:         'Estado: TESTNET. Solo se muestran valores de la red de prueba.'
    },

    sim: {
        block: 'BLOQUE',
        prevBlock: 'BLOQUE ANTERIOR',
        blockProgressAria: 'Progreso del bloque actual',
        endsAt: 'Termina a las 00:00 UTC del {date}. {d}d {h}h {m}m {s}s hasta el fin del bloque',
        heroAria: 'Simulación de la red',
        ops:      'OPERADORES',
        protocol: 'PROTOCOLO'
    },

    price: {
        eyebrow: 'Costo de uso',
        title:   'El precio publicado de la red.',
        intro:   'Los operadores financian la red con depósitos de demanda: α depositado por bloque (7 días) según los datos y usuarios que atienden. La tabla siguiente es la tarifa publicada: un operador paga el mejor nivel cuyo umbral de α en stake cumple; el nivel 0 aplica a todos, con o sin α en stake.',
        colTier:    'Nivel',
        colStake:   'Umbral de α en stake',
        colGib:     'α / GiB',
        colUser:    'α / usuario',
        colGibUsd:  'USD / GiB',
        colUserUsd: 'USD / usuario',
        tierEveryone: 'Todos',
        usdNote:  'Los equivalentes en USD usan el precio de α en vivo de SN{sn} del feed público de CoinGecko (GeckoTerminal).',
        usdNoteOperators: 'Los equivalentes en USD usan el precio medio de α informado por los operadores de red.',
        alphaNow: '1 α = {usd}',
        usdUnavailable: 'Precio de α en vivo no disponible — equivalentes en USD ocultos.',
        subscribe: 'Suscribirse a los cambios de precio (RSS)',
        rawFile:   'Tabla de precios sin procesar (price.yml)',
        initialPeriod: 'Período inicial: la tarifa publicada es 0 α. Mientras la red se endurece no se cobran depósitos de demanda a los operadores; a cada pool de operador se le asigna la misma demanda, de modo que solo la calidad medida dirige el canal de pools.'
    },

    roadmap: {
        eyebrow: 'Hoja de ruta',
        title:   'Hacia dónde va la red.',
        intro:   'Tres fases, cada una construida sobre la anterior: abrir la red de entrada, hacer de UR el sustrato sobre el que construyen las empresas y reconstruir la puerta de entrada a internet. Los plazos son objetivos medidos desde hoy: una dirección, no una promesa.',
        phaseLabel: 'Fase',
        phases: [
            {
                no: '01',
                date: '1–2 meses',
                flag: 'Lanzamiento próximo',
                title: 'Acceso a la red de entrada',
                body: 'Los mineros se convierten en salida y entrada a la vez. Cada minero detecta automáticamente su entorno y se configura para hacer todo lo que puede: transportar tráfico de entrada además del de salida. La red de entrada reutiliza el diseño de encriptación de N capas de los extensores, con nuevo trabajo del lado del cliente para descubrir de forma iterativa extensores que se desbloquean con el tiempo, de modo que nuevos puntos de entrada rotan continuamente hasta quedar al alcance.'
            },
            {
                no: '02',
                date: '3–4 meses',
                title: 'Roles empresariales y autorización',
                body: 'Acceso basado en roles, integrado con OAuth y Workload Identity Federation. El RBAC viene incorporado en la propia red, de modo que las redes empresariales pueden construirse directamente sobre el protocolo: esta es la capa que impulsa los casos de uso de VPN.dev para desarrolladores y VPN. El atractivo para esas empresas: una red que se mantiene accesible y con buen rendimiento en cualquier parte del mundo, para que los participantes de proyectos descentralizados puedan participar desde cualquier lugar.'
            },
            {
                no: '03',
                date: '8–12 meses',
                title: 'Una nueva página de inicio de internet — WW.dev',
                body: 'Una nueva puerta de entrada a internet. Nos centramos en la indexación —tanto push como pull—, un índice de búsqueda para agentes y modelos locales pequeños y densos. Las personas pueden establecer una nueva página de inicio privada; los agentes pueden usar un índice de búsqueda abierto que les da acceso privado y en tiempo real a la información, liquidado con Privacy Pass y x402.'
            }
        ]
    },

    legal: {
        eyebrow: 'Legal',
        terms: {
            title: 'Términos de uso',
            body:  'Los Términos de Servicio de ur.xyz, el sitio informativo del protocolo UR alojado por UR Foundation.'
        },
        privacy: {
            title: 'Política de privacidad',
            body:  'Cómo UR Foundation recopila, usa y protege la información sobre los visitantes de ur.xyz, incluidas las direcciones de billetera, y cómo ejercer tus derechos de privacidad.'
        },
        vdp: {
            title: 'Política de divulgación de vulnerabilidades',
            body:  'Cómo reportar vulnerabilidades de seguridad en los activos de UR Foundation, y el puerto seguro para la investigación de buena fe.'
        }
    },

operators: {
        eyebrow: 'Operadores',
        title:   'Los operadores que ejecutan la red.',
        intro:   'Los operadores de red ejecutan los servidores de privacidad y el punto de verificación. Un operador deposita en la subred como una señal respaldada por ingresos de demanda real, ejecuta el protocolo de verificación de enrutamiento que co-firma cada ruta medida, y registra la lista de pagos que reparte sus recompensas entre los mineros asociados a él. Los operadores dirigen a dónde van las recompensas, pero nunca custodian los fondos de nadie más.',
        cta: 'Conviértete en operador de red',
        metaTitle: 'Operadores de red: ejecuta servidores de privacidad de UR en SN25 — UR',
        metaDescription: 'Los operadores ejecutan servidores de privacidad UR y el endpoint /verify, depositan alpha como señal de demanda real y dirigen los pagos a sus mineros.',
        roles: [
            { tag: '01', title: 'Ejecutar los servidores', body: 'Los operadores ejecutan los servidores de privacidad y el punto /verify que co-firma cada ruta medida: la capa de coordinación entre los usuarios y los mineros que transportan el tráfico.' },
            { tag: '02', title: 'Señalar demanda real',    body: 'A los operadores se les factura en alpha en proporción a su uso real. Cada depósito pasa a una reserva como una señal respaldada por ingresos que los validadores ponderan cuando puntúan los pools.' },
            { tag: '03', title: 'Dirigir los pagos',        body: 'En cada período de liquidación, un operador registra una lista de pagos Merkle que reparte su pool entre sus mineros. Dirige el reparto pero nunca toma custodia: cada minero reclama su parte directamente del contrato.' },
            { tag: '04', title: 'Comenzar',                 body: 'Registra una clave de operador de red, ejecuta el servidor /verify y deposita para empezar. La admisión de operadores está controlada por el propietario durante la fase de lanzamiento.', href: '/docs/operator', linkLabel: 'Guía del operador' }
        ],
        directoryTitle: 'Operadores de red',
        directoryNote:  'Ordenados por redes totales. Las estadísticas se leen en vivo del feed público de cada operador; los iconos enlazan a la app del operador en cada tienda.',
        dashboard: 'Panel',
        colOperator: 'OPERADOR',
        colStores:   'DESCARGAR'
    },

    miners: {
        eyebrow: 'Mineros',
        title:   'Los mineros que convierten las subredes IP en la internet dual.',
        intro:   'Los mineros compiten por poner a disposición de la red la mayor cantidad de subredes IPv4 /29 e IPv6 /48, cada una enrutable en todo momento para el tráfico de entrada o de salida. En otras palabras, los mineros convierten la internet pública en una red privada y anónima que cualquiera puede usar. Cada minero transporta tanto el tráfico de entrada como el de salida, ejecuta un modelo de seguridad seguro por defecto, solo enruta tráfico cifrado y recibe pago de la emisión de la subred por la capacidad enrutable que aporta. Las flotas con la mayor cobertura de subredes distintas y enrutables son promovidas a mineros de nivel superior y ganan más: todo en espacio de usuario, en hardware que ya posees.',
        both:    'Un minero es a la vez extensor y proveedor: cada minero asume al mismo tiempo el rol de entrada y el de salida. Se configura automáticamente para el sistema en el que se ejecuta.',
        goal:    'El objetivo es una red sombra dual: por cada subred pública IPv4 e IPv6 existe también una contraparte privada y anónima. UR está construyendo esa red privada anónima.',
        globeAlt: 'Un globo de mineros: los proveedores como puntos, los extensores como anillos, cada uno del color de su país.',
        globeLabels: { provider: 'proveedor', extender: 'extensor', miner: 'minero' },
        simCaption: 'Los mineros compiten por la mayor cantidad de IPs únicas disponibles de forma fiable en la red. Los mejores mineros ascienden a su propio slot de UID.',
        cta: 'Conviértete en minero',
        metaTitle: 'Mineros: transporta tráfico cifrado y gana emisiones de SN25 — UR',
        metaDescription: 'Los mineros de UR mantienen enrutables subredes IPv4 /29 e IPv6 /48 para tráfico cifrado en Bittensor SN25 y ganan emisiones por cobertura distinta y medida.',
        roles: [
            { tag: '01', title: 'Salida',               body: 'Como salida, un minero es una IP de salida de la red compartida. Rechaza el tráfico que entra en conflicto con directrices regulatorias comunes como CFAA y DMCA, bloquea IPs maliciosas conocidas y solo enruta tráfico cifrado, protegiendo tanto a los mineros como a los usuarios.' },
            { tag: '02', title: 'Entrada',              body: 'Como entrada (extensor), un minero crea puntos de entrada que mejoran la accesibilidad en todo el mundo, usando TLS de N capas, suplantación de SNI y reenvío de confianza. Un subconjunto rotativo se expone en cada ciclo, y los clientes reintentan automáticamente los puntos de entrada que funcionaron antes.' },
            { tag: '03', title: 'Medido y emparejado', body: 'Los validadores independientes recorren cadenas de mineros para probar el tránsito en tiempo real y medir la disponibilidad y la calidad. Los mineros se clasifican según esa medición y según la velocidad, y cada operador ejecuta su propio emparejamiento entre usuarios y mineros.' },
            { tag: '04', title: 'Ganar con la emisión', body: 'A los mineros se les paga con la emisión de la subred. Dentro del pool de un operador reclamas tu parte en cada liquidación mediante prueba: una recompensa base de baja barrera, sin ningún slot que ganar ni nada que quemar.', href: '/docs/miner', linkLabel: 'Guía del minero' },
            { tag: '05', title: 'Competir por la cima', body: 'Los mineros compiten por alcance. La red clasifica a las flotas por cuántas IPs de salida distintas y enrutables prestan realmente —no por volumen de tráfico— y las aproximadamente 200 con la cobertura más amplia son promovidas a mineros de nivel superior: su propio slot on-chain, con pago nativo, ganando más. Las IPs compartidas se reparten entre las flotas que las reclaman, de modo que la cobertura única es lo que gana: aumenta tu amplitud de IPs distintas para ascender, y si tu alcance retrocede vuelves al pool.' }
        ]
    },

    validators: {
        eyebrow: 'Validadores',
        title:   'Los validadores que miden la red.',
        intro:   'Los validadores son independientes. Cada uno hace staking de su propio UR y ejecuta el protocolo de verificación de enrutamiento, recorriendo continuamente cadenas de mineros asignadas por los operadores para probar el tránsito en tiempo real y medir qué mineros son los eslabones más débiles. Esa medición es la señal central por la que paga la red, y los validadores ganan dividendos nativos por producirla con precisión.',
        simCaption: 'Los validadores sondean la superficie de IPs disponible y clasifican a los mineros por fiabilidad.',
        cta: 'Conviértete en validador',
        metaTitle: 'Validadores: mide la red UR y gana dividendos de SN25 — UR',
        metaDescription: 'Los validadores de UR hacen staking de su UR, recorren cadenas de mineros para probar el tránsito y ganan dividendos de Bittensor por puntuar con precisión.',
        roles: [
            { tag: '01', title: 'Recorrer las rutas',       body: 'Los validadores recorren cadenas de mineros asignadas por los operadores y recopilan un registro firmado y autoverificable de cada salto completado: prueba criptográfica del tránsito en tiempo real que cualquiera puede comprobar.' },
            { tag: '02', title: 'Puntuar la red',           body: 'En cada ciclo, un validador puntúa el pool de cada operador según la demanda y la calidad medida, y clasifica las principales flotas por amplitud de IPs enrutables, todo bajo commit-reveal. El Yuma Consensus de Bittensor convierte esas puntuaciones independientes en emisión para los mineros.' },
            { tag: '03', title: 'Ganar dividendos nativos', body: 'Los validadores ganan dividendos nativos de Bittensor por una puntuación precisa y alineada con el consenso: su única recompensa. Ningún operador posee un validador, y el conjunto es sin permisos.', href: '/docs/validator', linkLabel: 'Guía del validador' },
            { tag: '04', title: 'Independiente por diseño', body: 'Como el commit-reveal oculta las puntuaciones de cada validador hasta que quedan obsoletas, copiar no gana nada: un validador tiene que ejecutar recorridos reales. La medición se mantiene honesta, y ninguna parte individual la controla.' }
        ]
    },

    research: {
        eyebrow: 'Investigación',
        title:   'Algoritmos abiertos, datos abiertos.',
        metaTitle: 'Investigación: algoritmos, datos y auditorías abiertos — UR',
        metaDescription: 'Investigación abierta de UR: algoritmos de enrutamiento, matching, transferencia y recompensas con código y datos anónimos, el concurso Apex SN1 y auditorías.',
        intro:   'El protocolo es un sistema nativo descentralizado, multi-IP y multi-transporte diseñado para escalar a millones de mineros por operador de red. Cada área algorítmica a continuación se publica con su código fuente y, cuando corresponde, conjuntos de datos anonimizados para análisis independiente.',
        areaLabels: {
            approach: 'Enfoque actual',
            implementation: 'Implementación',
            directions: 'Líneas de investigación'
        },
        papers: [
            { tag: 'URTRANSPORT1', title: 'Rendimiento',
              body: 'Enrutamiento multi-salto a través de transportes TCP enfocado en la accesibilidad global. Se admiten actualizaciones a UDP y a flujos punto a punto, con integración planificada de WebRTC, XRay y WireGuard.',
              approach: 'El transporte está construido primero para la accesibilidad, de modo que cualquier persona del mundo pueda conectarse. El enrutamiento multi-salto corre sobre transportes TCP a través de un salto central. Los transportes UDP como H3 y DNS están implementados pero desactivados: en uso real rindieron por debajo de la ruta TCP en esta configuración. Un salto multi-minero con actualización a flujo punto a punto también está implementado y desactivado por ahora. La selección de transporte y la ruta de actualización de flujos viven en transport.go y transfer_stream_manager.go.',
              links: [
                  { href: 'https://github.com/urnetwork/connect/blob/main/transport.go', label: 'transport.go' },
                  { href: 'https://github.com/urnetwork/connect/blob/main/transfer_stream_manager.go', label: 'transfer_stream_manager.go' }
              ],
              directions: 'Integrar protocolos establecidos como WebRTC, XRay y WireGuard como actualizaciones de flujo en el salto multi-minero, y reactivar los transportes UDP donde las mediciones muestren que ayudan. El algoritmo de emparejamiento también podría empezar a distinguir los saltos con IP y puerto públicos de los que no los tienen, para equilibrar velocidad y calidad de conexión. Cada uno de estos cambios puede probarse en un operador de red experimental antes de convertirse en el predeterminado.' },
            { tag: 'UREXTENDER1', title: 'Accesibilidad',
              body: 'Encriptación TLS de N capas (N≥2) donde cada capa exterior usa un certificado autofirmado con suplantación de SNI hacia una IP intermediaria, reenviando a otro salto o a una conexión TLS de extremo a extremo. Cualquiera puede alojar un extensor en cualquier dominio.',
              approach: 'La pila de red central admite encriptación TLS de N capas, con N de al menos dos. Cada capa exterior puede usar un certificado autofirmado para un nombre de host elegido y alcanzar una IP intermediaria, que reenvía el tráfico a otro salto o a una conexión TLS de extremo a extremo con el dominio del operador de red, de modo que la conexión parece tráfico ordinario hacia ese nombre de host. Cualquiera puede alojar un extensor en un dominio que controle. Los usuarios de un extensor comparten un límite de tasa común, ajustable caso por caso.',
              links: [
                  { href: 'https://github.com/urnetwork/connect/blob/main/net_extender.go', label: 'net_extender.go' }
              ],
              directions: 'Los extensores pueden añadirse a una lista de subvenciones del protocolo que reparte una parte de los incentivos entre los extensores participantes; los detalles de incorporación se publicarán cuando la lista abra. Cada minero ya asume el rol de extensor junto al de salida. Las preguntas abiertas son cómo medir el alcance de un extensor donde más importa sin exponer a sus usuarios, y cómo deberían rotar las capas exteriores los nombres de host y los certificados a medida que el bloqueo se adapta.' },
            { tag: 'UR-FP2', title: 'Emparejamiento cliente-minero',
              body: 'Algoritmo de muestreo que carga una muestra aleatoria 10× de mineros potenciales y los mezcla proporcionalmente a fiabilidad × puntuación del cliente. La resistencia Sybil se garantiza por la restricción de que la fiabilidad suma como máximo 1 por subred IP.',
              approach: 'El sistema de emparejamiento carga desde memoria una muestra aleatoria de mineros candidatos, unas diez veces el número que necesita, y la mezcla en proporción a fiabilidad × puntuación del cliente para producir los finalistas. Su protección contra el aliasing de mineros (ataques Sybil) es un tope por subred IP: las puntuaciones de fiabilidad de todos los mineros de una subred suman como máximo 1, así que dividir una conexión en muchas identidades no aumenta su cuota de emparejamientos. El punto de entrada es FindProviders2.',
              links: [
                  { href: 'https://github.com/urnetwork/server/blob/main/model/network_client_location_model.go', label: 'network_client_location_model.go' }
              ],
              directions: 'Distinguir al emparejar los saltos con IP y puerto públicos de los que no los tienen, para equilibrar explícitamente velocidad y calidad de conexión en lugar de solo a través de la fiabilidad. Los pesos de fiabilidad y de puntuación del cliente y el tamaño de la muestra son las entradas naturales que un operador experimental puede variar frente a las exportaciones de bloque anonimizadas descritas abajo, manteniendo fijo el tope por subred como cota Sybil.' },
            { tag: 'UR-MULTI', title: 'Multi cliente',
              body: 'Algoritmo heurístico de barrido que gestiona una ventana de mineros. Fija el tráfico en el mejor nivel disponible basándose en umbrales de transferencia en lugar de análisis de protocolo.',
              approach: 'Un barrido heurístico gestiona una ventana de mineros y fija el tráfico en los mineros del nivel más alto disponible. Las decisiones se toman sobre umbrales de transferencia, cuánto ha movido realmente un minero, y no inspeccionando el protocolo dentro del túnel, así que el enrutador nunca necesita mirar el tráfico de aplicación. La ventana es lo que permite a un cliente mantener varios mineros en juego a la vez y mover el tráfico entre ellos a medida que cambia su transferencia medida.',
              links: [
                  { href: 'https://github.com/urnetwork/connect/blob/main/ip_remote_multi_client.go', label: 'ip_remote_multi_client.go' }
              ],
              directions: 'Los umbrales y los límites de nivel hoy se fijan a mano. Preguntas abiertas para un operador experimental: si deberían derivarse de distribuciones de transferencia medidas, y si la ventana debería incorporar también las estadísticas de disponibilidad y latencia por minero que ahora producen los validadores (ver Verificación de enrutamiento), para que un cliente evite un eslabón débil antes de pagarlo con su propio tráfico.' },
            { tag: 'UR-TRANSFER', title: 'Transferencia',
              body: 'Ventana de entrega fiable ajustada para entornos de alta latencia. Las retransmisiones del protocolo están desactivadas ya que la ventana proporciona entrega fiable. Distribuye el tráfico entre transportes según el rendimiento clasificado.',
              approach: 'Una ventana de transferencia fiable está ajustada para entornos de alta latencia. Como la propia ventana proporciona entrega fiable, las retransmisiones del protocolo hacia la capa de transferencia están desactivadas: un flujo TCP que viaja por el túnel no se retransmite encima. El tráfico se distribuye entre los transportes disponibles según su rendimiento clasificado y su disponibilidad, de modo que un transporte lento o fallido pierde cuota en lugar de detener el flujo.',
              links: [
                  { href: 'https://github.com/urnetwork/connect/blob/main/transfer.go', label: 'transfer.go' }
              ],
              directions: 'Preguntas abiertas: cómo debería dimensionarse la ventana a lo largo del abanico de latencias reales en lugar de para un único perfil fijo, cómo reclasificar los transportes cuando su rendimiento cambia a mitad del flujo, y cómo debería cooperar la capa de transferencia con las actualizaciones de flujo planificadas para el transporte (ver Rendimiento) cuando un salto es punto a punto y el siguiente no.' },
            { tag: 'UR-IP', title: 'Salida IP',
              body: 'Implementación de pila IP con consumo mínimo de memoria. Asume comunicación fiable entre pares a través de la capa de transferencia, por lo que las retransmisiones se optimizan en consecuencia.',
              approach: 'La pila IP está diseñada para funcionar con memoria mínima, de modo que un minero pueda servir como salida en un teléfono o en un dispositivo pequeño. Asume comunicación fiable con el par a través de la capa de transferencia, lo que permite optimizar y eliminar su propio manejo de retransmisiones en lugar de duplicarlo. La capa de seguridad (ver Seguridad) está en la misma ruta, así que cada paquete se comprueba antes de salir del minero.',
              links: [
                  { href: 'https://github.com/urnetwork/connect/blob/main/ip.go', label: 'ip.go' }
              ],
              directions: 'Preguntas abiertas: cuánto más puede reducirse la huella de memoria en los dispositivos más pequeños, y cómo conserva sus garantías la pila de salida cuando se relajan las suposiciones de fiabilidad de la capa de transferencia para las actualizaciones de flujo punto a punto planificadas para el transporte. Como con el transporte, los cambios se prueban en un operador experimental antes de convertirse en predeterminados.' },
            { tag: 'UR-PSUB2', title: 'Asignación de recompensas',
              body: 'Los validadores independientes puntúan cada pool de operador según la demanda y la calidad medida; el Yuma Consensus de Bittensor convierte esas puntuaciones en emisión. Dentro de un pool, un operador clasifica a sus mineros según los contratos servidos y la fiabilidad, registra una raíz de pagos Merkle en cada ciclo, y cada minero reclama su parte directamente del contrato de liquidación.',
              approach: 'Las recompensas son la emisión de la subred UR en SN25. Los mineros de cada operador forman un pool con un UID de minero. En cada tempo, los validadores independientes puntúan cada pool según uso implícito × calidad medida (el depósito de época del operador dividido por la tasa publicada de su nivel de convicción, multiplicado por la calidad de los mineros del pool según los recorridos propios del validador) bajo commit-reveal, y el Yuma Consensus convierte la mediana en emisión. Dentro del pool, el operador clasifica a los mineros por contratos servidos × fiabilidad, registra una raíz de pagos Merkle en cada época, y cada minero reclama su parte directamente del contrato de liquidación. Las principales flotas por amplitud de IPs enrutables tienen sus propios UIDs y reciben pago nativo. Mientras el precio publicado sea 0, no se recogen depósitos y cada pool lleva la misma demanda implícita, así que solo la calidad medida dirige el canal de pools.',
              links: [
                  { href: 'https://github.com/urnetwork/server/blob/main/model/account_payment_model_plan.go', label: 'account_payment_model_plan.go' },
                  { href: 'https://github.com/urfoundation/sn/blob/main/WHITEPAPER.md', label: 'WHITEPAPER.md §7–§10' },
                  { href: 'https://github.com/urfoundation/sn/tree/main/validator', label: 'sn/validator' }
              ],
              directions: 'θ es un parámetro de gobernanza publicado: empezar cargado hacia la cola (θ ≈ 0,3), instrumentar el pago realizado por nivel y ampliarlo a medida que maduren el conjunto de mineros de nivel superior y el consenso de calidad de los validadores independientes, con la restricción de que el minero de nivel superior peor pagado siga ganando al menos lo que el minero de pool mejor pagado. La oscilación que la calidad ejerce sobre el peso del pool está acotada en el arranque y se amplía gradualmente. Una prima de esfuerzo para validadores está diseñada pero aparcada, para construirse solo si la red en vivo muestra que la cobertura independiente la necesita. Descentralizar el conjunto de validadores más allá de la mayoría del propietario es un paso de gobernanza posterior y deliberado.' },
            { tag: 'UR-CONTRACT', title: 'Permiso',
              body: 'La transferencia entre partes requiere un contrato encriptado con saldo en custodia y un conjunto de permisos. Ambas partes deben cerrar con recuentos de bytes confirmados; los desacuerdos activan un proceso de resolución forzada.',
              approach: 'La transferencia entre un iniciador y un acompañante requiere un contrato encriptado con la clave secreta del cliente de destino. El contrato mantiene un saldo de transferencia fijo en custodia y define los permisos entre ambas partes. El acompañante puede crear contratos emparejados para el tráfico de retorno, y las rutas multi-salto envían eventos de apertura y cierre de flujo a los intermediarios. Tras el uso, ambas partes cierran el contrato con un recuento de bytes confirmado. Si alguna parte no cierra, o los totales no coinciden, la resolución del contrato determina el resultado; si alguna parte denuncia abuso, se bloquea la transferencia futura entre esas partes.',
              links: [
                  { href: 'https://github.com/urnetwork/server/blob/main/model/subscription_model.go', label: 'subscription_model.go' }
              ],
              directions: 'Contratos servidos × fiabilidad es también la base predeterminada del operador para su lista de pagos del pool, así que la exactitud de los recuentos de bytes cerrados alimenta las recompensas. Preguntas abiertas: cómo resolver un desacuerdo entre dos recuentos de cierre sin un tercer total de confianza, cómo dimensionar los contratos de retorno emparejados para tráfico asimétrico, y cómo ponderar una denuncia de abuso cuando los recuentos de ambas partes ya han discrepado antes.' },
            { tag: 'UR-SEC1', title: 'Seguridad',
              body: 'Lista de bloqueo de puertos y lista de bloqueo de IP que protegen la red de mineros. No realiza inspección de protocolo: los mineros solo enrutan tráfico cifrado.',
              approach: 'La capa de seguridad usa listas de bloqueo de puertos y de IP. No inspecciona protocolos de aplicación: los mineros solo enrutan tráfico cifrado, así que no hay nada que inspeccionar, y las listas de bloqueo son lo que permite a un minero rechazar el tráfico que entra en conflicto con directrices regulatorias comunes como CFAA y DMCA y descartar destinos maliciosos conocidos. Las listas se aplican en el minero, de modo que el tráfico de un usuario encuentra las mismas reglas en cada salida.',
              links: [
                  { href: 'https://github.com/urnetwork/connect/blob/main/ip_security.go', label: 'ip_security.go' }
              ],
              directions: 'Preguntas abiertas: cómo distribuir y actualizar las listas de bloqueo en una flota sin un punto central que pueda ver el tráfico, si la capa de seguridad debería aprender la reputación por destino a partir de datos de salida anonimizados en lugar de listas estáticas, y qué debería poder añadir un minero a sus propias listas sin dividir el comportamiento de la red entre salidas.' },
            { tag: 'UR-VERIFY1', title: 'Verificación de enrutamiento',
              body: 'Los validadores recorren cadenas de mineros asignadas por el servidor, probando la salida en vivo desde cada salto con cuatro firmas Ed25519. Las estadísticas de completado y latencia por paso encuentran el eslabón más débil y se convierten en la señal de calidad que dirige la emisión de los pools.',
              approach: 'Un validador siembra un recorrido a través de un minero de su elección y llama a /verify; el servidor deriva el salto de la IP de origen de la petición, nunca de una afirmación. Cada salto siguiente se extrae uniformemente al azar, sin reemplazo, y se revela solo cuando el salto actual se confirma, así que una ruta no puede precalcularse. Cuatro firmas Ed25519 atan el recorrido: SEED y EXTEND del validador, ASSIGN y FINAL del servidor, que además sella el tiempo de cada salto. Un fallo se atribuye al único salto que nunca se alcanzó, la latencia se registra por paso al confirmarse, el salto semilla elegido por el validador se excluye, y cada minero se reporta con un intervalo de Wilson para el completado y percentiles de latencia una vez que tiene exposición suficiente.',
              links: [
                  { href: 'https://github.com/urnetwork/server/blob/main/controller/verify_controller.go', label: 'verify_controller.go' },
                  { href: 'https://github.com/urfoundation/sn/tree/main/validator', label: 'sn/validator' },
                  { href: 'https://github.com/urfoundation/sn/blob/main/VALIDATOR.md', label: 'VALIDATOR.md' }
              ],
              directions: 'Un recorrido completado prueba tránsito secuencial en vivo hacia un destino conocido, no el reenvío honesto del tráfico de usuario, y el autobeneficio por salto solo está acotado estadísticamente, por una población de validadores independientes. La hoja de ruta hacia una medición apta para pagos: prueba de enrutamiento mediante atestación de vecinos, diversidad de destinos para que un minero no pueda optimizar la única ruta medida, resistencia Sybil de los validadores mediante stake, y un modelo de riesgo jerárquico para la atribución. Hasta entonces, las estadísticas son monitorización de disponibilidad y latencia y puntuación provisional.' }
        ],
        competition: {
            title: 'Competencia de algoritmos de latencia simulada',
            eyebrow: 'Impulsada por Apex (SN1)',
            body: 'Optimiza el protocolo UR. Las propuestas se evalúan frente a una rama {code} y la ganadora se convierte en la nueva línea base y gana SN1α. Seis rondas de una semana cada una, a partir del 2026-09-28. ¡Vamos!',
            codeLabel: 'del código',
            cta: 'Únete a la competencia',
            statusUpcoming: 'Empieza el {date}',
            statusLive: 'En curso',
            statusEnded: 'Finalizada',
            imageAlt: 'Dos nodos unidos por rutas a través de una barrera: la competencia de latencia simulada de Apex'
        },
        anonymization: {
            title: 'Anonimización',
            body: 'El bloque de pagos de la red es de 7 días, y las exportaciones de las entradas y salidas de cada algoritmo se anonimizan por bloque. Cada id de cliente y cada hash de subred IP se sustituye por un simple contador entero, de modo que una identidad es consistente dentro de un bloque pero no lleva nada entre bloques ni de vuelta a un id de producción. No se incluyen metadatos de ciudad. Las exportaciones por bloque están preparadas para su publicación pero aún no publicadas; esta página las enlazará cuando lo estén.'
        },
        researchers: {
            title: 'Para investigadores y desarrolladores',
            body: 'UR quiere que los usuarios puedan optar por algoritmos experimentales a través de operadores de red federados. Un nuevo operador se une al mismo sistema de incentivos que hoy paga a los mineros, y un minero puede servir a tantos operadores como quiera. La app ofrecerá a cada usuario la opción de introducir un dominio de operador alternativo. Los detalles de acceso a los operadores experimentales se publicarán cuando el programa abra, y esta página sigue el algoritmo predeterminado actual y las líneas experimentales. Para la investigación de seguridad, sigue la {vdp}.',
            vdpLabel: 'Política de divulgación de vulnerabilidades'
        },
        audits: {
            title: 'Auditorías',
            intro: 'Auditorías de pares del protocolo y sus implementaciones.',
            tag: 'Auditoría de pares',
            items: [
                { id: 'cure53-2026', pending: true, name: 'Auditoría de cifrado 2026', firm: 'Cure53',
                  tag: 'Programada', status: 'Programada para noviembre – diciembre de 2026',
                  scope: 'Alcance: diseño del cifrado y corrección de la implementación.',
                  note: 'Los resultados serán publicados por UR y Cure53.' },
                { id: 'masa-l2-2025', name: 'MASA L2 2025', firm: 'Leviathan Security Group',
                  status: 'Completada en mayo de 2025' }
            ]
        },
        publications: {
            title: 'Artículos',
            comingSoon: 'arXiv — próximamente',
            items: [
                { title: 'Whole Internet Encryption for the whole world' }
            ]
        }
    },

    community: {
        eyebrow: 'Comunidad',
        title:   'Las personas detrás de la red.',
        intro:   'El protocolo es abierto. La comunidad que lo construye y opera está creciendo. Aquí es donde encontrarla.',
        items: [
            { tag: '01', title: 'Discord',              body: 'Discusión general sobre el proyecto: desarrollo del protocolo, soporte a mineros y comunidad.', href: 'https://discord.gg/urnetwork', linkLabel: 'Unirse a Discord' },
            { tag: '02', title: 'Discord de Bittensor SN', body: 'Discusión específica de Bittensor: la subred, la emisión, los validadores y el staking.', soon: 'Próximamente' },
            { tag: '03', title: 'Kit de marca',        body: 'URnetwork y el logotipo del conector son marcas registradas en EE. UU. Se permite a los usuarios del protocolo usar el kit de marca como "powered by UR", "with URnetwork" o mensajes de componente similares.', button: { label: 'Descargar kit de marca' } }
        ],
        supportersTitle: 'Patrocinadores',
        partnersTitle:   'Socios'
    }
};
