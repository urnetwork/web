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
        tagline:    'Posee tu privacidad. Posee tu red.',
        languageMenu: 'Idioma',
        menu:         'Menú',
        closeMenu:    'Cerrar menú',
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
        launchVideo: 'Video de lanzamiento'
    },

    disclaimer: {
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
        whitepaperCta: 'Para más detalles, lee el litepaper'
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
        endsAt: 'Termina a las 00:00 UTC del {date}. {d}d {h}h {m}m {s}s hasta el fin del bloque'
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
        rawFile:   'Tabla de precios sin procesar (price.yml)'
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
            body:  'Cómo UR Foundation maneja la información en ur.xyz: qué se recopila, cómo se usa y cómo contactarnos.'
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
        roles: [
            { tag: '01', title: 'Ejecutar los servidores', body: 'Los operadores ejecutan los servidores de privacidad y el punto /verify que co-firma cada ruta medida: la capa de coordinación entre los usuarios y los mineros que transportan el tráfico.' },
            { tag: '02', title: 'Señalar demanda real',    body: 'A los operadores se les factura en alpha en proporción a su uso real. Cada depósito pasa a una reserva como una señal respaldada por ingresos que los validadores ponderan cuando puntúan los pools.' },
            { tag: '03', title: 'Dirigir los pagos',        body: 'En cada período de liquidación, un operador registra una lista de pagos Merkle que reparte su pool entre sus mineros. Dirige el reparto pero nunca toma custodia: cada minero reclama su parte directamente del contrato.' },
            { tag: '04', title: 'Comenzar',                 body: 'Registra una clave de operador de red, ejecuta el servidor /verify y deposita para empezar. La admisión de operadores está controlada por el propietario durante la fase de lanzamiento.' }
        ],
        directoryTitle: 'Operadores de red',
        directoryNote:  'Ordenados por redes totales. Las estadísticas se leen en vivo del feed público de cada operador; los iconos enlazan a la app del operador en cada tienda.',
        dashboard: 'Panel',
        colOperator: 'OPERADOR',
        colStores:   'DESCARGAR'
    },

    miners: {
        eyebrow: 'Mineros',
        title:   'Los mineros que transportan el tráfico.',
        intro:   'Los mineros compiten por poner a disposición de la red la mayor cantidad de subredes IPv4 /29 e IPv6 /48, cada una enrutable en todo momento para el tráfico de entrada o de salida. En otras palabras, los mineros convierten la internet pública en una red privada y anónima que cualquiera puede usar. Cada minero transporta tanto el tráfico de entrada como el de salida, ejecuta un modelo de seguridad seguro por defecto, solo enruta tráfico cifrado y recibe pago de la emisión de la subred por la capacidad enrutable que aporta. Las flotas con la mayor cobertura de subredes distintas y enrutables son promovidas a mineros de nivel superior y ganan más: todo en espacio de usuario, en hardware que ya posees.',
        cta: 'Conviértete en minero',
        roles: [
            { tag: '01', title: 'Salida',               body: 'Los mineros de salida son las IPs de salida de la red compartida. Rechazan el tráfico que entra en conflicto con directrices regulatorias comunes como CFAA y DMCA, bloquean IPs maliciosas conocidas y solo enrutan tráfico cifrado, protegiendo tanto a los mineros como a los usuarios.' },
            { tag: '02', title: 'Entrada',              body: 'Los mineros de entrada (extensores) crean puntos de entrada que mejoran la accesibilidad en todo el mundo, usando TLS de N capas, suplantación de SNI y reenvío de confianza. Un subconjunto rotativo se expone en cada ciclo, y los clientes reintentan automáticamente los puntos de entrada que funcionaron antes.' },
            { tag: '03', title: 'Medido y emparejado', body: 'Los validadores independientes recorren cadenas de mineros para probar el tránsito en tiempo real y medir la disponibilidad y la calidad. Los mineros se clasifican según esa medición y según la velocidad, y cada operador ejecuta su propio emparejamiento entre usuarios y mineros.' },
            { tag: '04', title: 'Ganar con la emisión', body: 'A los mineros se les paga con la emisión de la subred. Dentro del pool de un operador reclamas tu parte en cada liquidación mediante prueba: una recompensa base de baja barrera, sin ningún slot que ganar ni nada que quemar.', href: '/docs/provider', linkLabel: 'Documentación para mineros' },
            { tag: '05', title: 'Competir por la cima', body: 'Los mineros compiten por alcance. La red clasifica a las flotas por cuántas IPs de salida distintas y enrutables prestan realmente —no por volumen de tráfico— y las aproximadamente 200 con la cobertura más amplia son promovidas a mineros de nivel superior: su propio slot on-chain, con pago nativo, ganando más. Las IPs compartidas se reparten entre las flotas que las reclaman, de modo que la cobertura única es lo que gana: aumenta tu amplitud de IPs distintas para ascender, y si tu alcance retrocede vuelves al pool.' }
        ]
    },

    validators: {
        eyebrow: 'Validadores',
        title:   'Los validadores que miden la red.',
        intro:   'Los validadores son independientes. Cada uno hace staking de su propio UR y ejecuta el protocolo de verificación de enrutamiento, recorriendo continuamente cadenas de mineros asignadas por los operadores para probar el tránsito en tiempo real y medir qué mineros son los eslabones más débiles. Esa medición es la señal central por la que paga la red, y los validadores ganan dividendos nativos por producirla con precisión.',
        cta: 'Conviértete en validador',
        roles: [
            { tag: '01', title: 'Recorrer las rutas',       body: 'Los validadores recorren cadenas de mineros asignadas por los operadores y recopilan un registro firmado y autoverificable de cada salto completado: prueba criptográfica del tránsito en tiempo real que cualquiera puede comprobar.' },
            { tag: '02', title: 'Puntuar la red',           body: 'En cada ciclo, un validador puntúa el pool de cada operador según la demanda y la calidad medida, y clasifica las principales flotas por amplitud de IPs enrutables, todo bajo commit-reveal. El Yuma Consensus de Bittensor convierte esas puntuaciones independientes en emisión para los mineros.' },
            { tag: '03', title: 'Ganar dividendos nativos', body: 'Los validadores ganan dividendos nativos de Bittensor por una puntuación precisa y alineada con el consenso: su única recompensa. Ningún operador posee un validador, y el conjunto es sin permisos.' },
            { tag: '04', title: 'Independiente por diseño', body: 'Como el commit-reveal oculta las puntuaciones de cada validador hasta que quedan obsoletas, copiar no gana nada: un validador tiene que ejecutar recorridos reales. La medición se mantiene honesta, y ninguna parte individual la controla.' }
        ]
    },

    research: {
        eyebrow: 'Investigación',
        title:   'Algoritmos abiertos, datos abiertos.',
        intro:   'El protocolo es un sistema nativo descentralizado, multi-IP y multi-transporte diseñado para escalar a millones de mineros por operador de red. Cada área algorítmica a continuación se publica con su código fuente y, cuando corresponde, conjuntos de datos anonimizados para análisis independiente.',
        papers: [
            { tag: 'URTRANSPORT1', title: 'Rendimiento',
              body: 'Enrutamiento multi-salto a través de transportes TCP enfocado en la accesibilidad global. Se admiten actualizaciones a UDP y a flujos punto a punto, con integración planificada de WebRTC, XRay y WireGuard.',
              href: 'https://github.com/urnetwork/connect/blob/main/transport.go', linkLabel: 'transport.go' },
            { tag: 'UREXTENDER1', title: 'Accesibilidad',
              body: 'Encriptación TLS de N capas (N≥2) donde cada capa exterior usa un certificado autofirmado con suplantación de SNI hacia una IP intermediaria, reenviando a otro salto o a una conexión TLS de extremo a extremo. Cualquiera puede alojar un extensor en cualquier dominio.',
              href: 'https://github.com/urnetwork/connect/blob/main/net_extender.go', linkLabel: 'net_extender.go' },
            { tag: 'UR-FP2', title: 'Emparejamiento cliente-minero',
              body: 'Algoritmo de muestreo que carga una muestra aleatoria 10× de mineros potenciales y los mezcla proporcionalmente a fiabilidad × puntuación del cliente. La resistencia Sybil se garantiza por la restricción de que la fiabilidad suma como máximo 1 por subred IP.',
              href: 'https://github.com/urnetwork/server/blob/main/model/network_client_location_model.go', linkLabel: 'network_client_location_model.go' },
            { tag: 'UR-MULTI', title: 'Multi cliente',
              body: 'Algoritmo heurístico de barrido que gestiona una ventana de mineros. Fija el tráfico en el mejor nivel disponible basándose en umbrales de transferencia en lugar de análisis de protocolo.',
              href: 'https://github.com/urnetwork/connect/blob/main/ip_remote_multi_client.go', linkLabel: 'ip_remote_multi_client.go' },
            { tag: 'UR-TRANSFER', title: 'Transferencia',
              body: 'Ventana de entrega fiable ajustada para entornos de alta latencia. Las retransmisiones del protocolo están desactivadas ya que la ventana proporciona entrega fiable. Distribuye el tráfico entre transportes según el rendimiento clasificado.',
              href: 'https://github.com/urnetwork/connect/blob/main/transfer.go', linkLabel: 'transfer.go' },
            { tag: 'UR-IP', title: 'Salida IP',
              body: 'Implementación de pila IP con consumo mínimo de memoria. Asume comunicación fiable entre pares a través de la capa de transferencia, por lo que las retransmisiones se optimizan en consecuencia.',
              href: 'https://github.com/urnetwork/connect/blob/main/ip.go', linkLabel: 'ip.go' },
            { tag: 'UR-PSUB2', title: 'Asignación de recompensas',
              body: 'Los validadores independientes puntúan cada pool de operador según la demanda y la calidad medida; el Yuma Consensus de Bittensor convierte esas puntuaciones en emisión. Dentro de un pool, un operador clasifica a sus mineros según los contratos servidos y la fiabilidad, registra una raíz de pagos Merkle en cada ciclo, y cada minero reclama su parte directamente del contrato de liquidación.',
              href: 'https://github.com/urnetwork/server/blob/main/model/account_payment_model_plan.go', linkLabel: 'account_payment_model_plan.go' },
            { tag: 'UR-CONTRACT', title: 'Permiso',
              body: 'La transferencia entre partes requiere un contrato encriptado con saldo en custodia y un conjunto de permisos. Ambas partes deben cerrar con recuentos de bytes confirmados; los desacuerdos activan un proceso de resolución forzada.',
              href: 'https://github.com/urnetwork/server/blob/main/model/subscription_model.go', linkLabel: 'subscription_model.go' },
            { tag: 'UR-SEC1', title: 'Seguridad',
              body: 'Lista de bloqueo de puertos y lista de bloqueo de IP que protegen la red de mineros. No realiza inspección de protocolo: los mineros solo enrutan tráfico cifrado.',
              href: 'https://github.com/urnetwork/connect/blob/main/ip_security.go', linkLabel: 'ip_security.go' }
        ],
        competition: {
            eyebrow: 'Competencia de algoritmos — impulsada por Apex (SN1)',
            body: 'Buscamos lanzar la competencia de algoritmos de Apex a fin de mes junto con el lanzamiento 25; el objetivo es una mejora medible del 10–20 % en la latencia media del algoritmo de matchmaking y enrutamiento.',
            cta: 'Próximamente'
        },
        datasetsLabel: 'Conjuntos de datos',
        datasetBlock: 'Bloque {n}',
        audits: {
            title: 'Auditorías',
            intro: 'Auditorías de pares del protocolo y sus implementaciones.',
            tag: 'Auditoría de pares',
            items: ['MASA L2 2026', 'MASA L2 2025']
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
