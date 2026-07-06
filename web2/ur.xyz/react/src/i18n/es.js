// Español — refleja en.js (la fuente canónica) clave por clave.
// Si se añade una clave allí, hay que añadirla también aquí.
export default {
    nav: {
        whitepaper: 'Whitepaper',
        operators:  'Operadores',
        miners:     'Mineros',
        validators: 'Validadores',
        research:   'Investigación',
        community:  'Comunidad',
        usage:      'Uso',
        docs:       'Documentación',
        tagline:    'Posee tu privacidad. Posee tu red.',
        languageMenu: 'Idioma',
        ctaAria:    'Uso — actividad actual de la red'
    },

    footer: {
        github:     'GitHub',
        contact:    'Contacto',
        copyright:  '© 2026 BringYour, Inc.',
        disclaimer: 'Este sitio es un protocolo de utilidad de código abierto impulsado por una comunidad de participantes, operado de forma independiente al operador de red que vende el acceso a la red.',
        languagesAria: 'Idiomas'
    },

    stats: {
        protocolLedger:  'Libro de la subred',
        block:           'Época',
        totalFees:       'Depósitos ($UR)',
        totalData:       'Datos totales',
        totalUsers:      'Usuarios totales',
        totalSupply:     'Suministro total de $UR',
        totalDistributed:'Emisión distribuida',
        urAbsorbed:      'Reserva de recompra ($UR)',
        statusHeld:      'Retenido en el contrato ($UR)'
    },

    whitepaper: {
        eyebrow: 'Whitepaper',
        title:   'Una red de privacidad, coordinada en Bittensor.',
        clauses: [
            {
                numeral: 'I.',
                title:   'Una red de privacidad descentralizada',
                body: [
                    'UR es una red de privacidad descentralizada. Distribuye el tráfico de los usuarios a través de una red global de mineros independientes mediante enrutamiento multi-salto y encriptación por capas, de modo que ningún minero individual ve al mismo tiempo quién es un usuario y qué está haciendo. El transporte está diseñado para asemejarse al tráfico HTTPS ordinario —encriptación TLS de N capas, suplantación de SNI e indistinguibilidad del tráfico— de modo que la red permanece accesible en casi todas partes.',
                    'La UR Subnet coordina esta red mediante incentivos on-chain en Bittensor. Los operadores de red ejecutan los servidores; los mineros independientes transportan el tráfico de entrada y de salida; y los validadores independientes recorren continuamente cadenas de mineros asignadas por los operadores para probar el tránsito en tiempo real y medir qué mineros son los eslabones más débiles. Esa medición es la señal central por la que paga la red.',
                    'El Yuma Consensus de Bittensor convierte las mediciones de los validadores en emisión de tokens, y un contrato inteligente en la Subtensor EVM liquida los pagos. El protocolo es de código abierto, y ejecutar un minero o un validador es sin permisos.'
                ]
            },
            {
                numeral: 'II.',
                title:   'Roles',
                body: [
                    'Los operadores de red ejecutan los servidores de privacidad y el punto de verificación. Un operador deposita en la subred, co-firma cada ruta medida y registra una lista de pagos que reparte sus recompensas entre los mineros asociados a él. Un operador dirige a dónde van sus recompensas, pero nunca custodia los fondos de nadie más.',
                    'Los mineros son la entrada y la salida de la red. Ejecutan un modelo de seguridad seguro por defecto, bloquean IPs maliciosas conocidas y solo enrutan tráfico cifrado. Un minero transporta tráfico para uno o más operadores y recibe pago por la capacidad enrutable que aporta.',
                    'Los validadores son independientes. Cada uno hace staking de su propio $UR, ejecuta el protocolo de verificación de enrutamiento y puntúa el pool de cada operador según la demanda y la calidad medida. Los validadores ganan los dividendos nativos de la red por una puntuación precisa y alineada con el consenso: ningún operador posee un validador, y el conjunto es sin permisos.',
                    'El propietario de la subred —BringYour, Inc.— gobierna el contrato de liquidación y opera la reserva de la red. Ese rol es transitorio: el control comienza centralizado pero acotado y se descentraliza progresivamente (cláusula V).'
                ]
            },
            {
                numeral: 'III.',
                title:   'El token $UR',
                body: [
                    '$UR es el token nativo de la subred: la unidad de cuenta para depósitos, emisión y liquidación. Es un token de utilidad para coordinar y pagar recursos de la red; no está diseñado para representar ni otorgar ningún derecho a ganancias, ingresos o rendimientos.',
                    'Bittensor emite nuevo $UR mediante su coinbase en cada ciclo y se reparte en tres flujos:',
                    { type: 'table', head: ['Flujo', 'Cuota', 'Destinatarios'], rows: [
                        ['Propietario', '18%', 'BringYour, Inc. — propietario de la subred y reserva de la red'],
                        ['Mineros',     '41%', 'Mineros — a través de los pools de operadores y los slots de mineros de nivel superior'],
                        ['Validadores', '41%', 'Validadores independientes — dividendos nativos por una puntuación precisa']
                    ]},
                    'Los operadores financian la red depositando $UR en proporción a su uso real, a una tasa de referencia publicada. Un depósito es una señal costosa y respaldada por ingresos de demanda real, y a la vez una participación de convicción: el contrato traslada cada depósito a una reserva bloqueada donde se acumula y nunca se redistribuye, retirando permanentemente $UR del suministro líquido en proporción al uso real. La participación bloqueada acumulada de un operador reduce la tasa que debe aportar, de modo que los operadores comprometidos pueden incorporarse con menos capital inicial.',
                    'A los mineros se les paga con la emisión, no con los depósitos. Como los depósitos se bloquean en lugar de reciclarse, el uso real se convierte en un soporte de compra permanente y creciente para el token en lugar de presión vendedora, mientras que la emisión sigue un calendario fijo con halvings.'
                ]
            },
            {
                numeral: 'IV.',
                title:   'Dos formas de ganar',
                body: [
                    'Un solo operador puede dar servicio a mucho más de 100,000 mineros —muchos más que los aproximadamente 256 slots on-chain de una subred—, por lo que la red paga a los mineros mediante dos niveles que funcionan en paralelo.',
                    'El pool es la vía de entrada. Cada operador mantiene un único slot on-chain para todos sus mineros; los validadores ponderan ese pool según la demanda del operador y su calidad medida, y cada minero reclama su parte directamente del contrato de liquidación con una prueba criptográfica. No hay ningún slot que ganar ni nada que quemar: es donde un minero comienza y gana una recompensa base.',
                    'Los mineros de nivel superior son el vértice de la oferta. Las aproximadamente 200 flotas más grandes —clasificadas por cuántas IPs de salida distintas y enrutables prestan realmente, no por volumen de tráfico— reclaman cada una su propio slot on-chain y reciben pago directamente de la red, sin ningún operador en la ruta de pago. Una IP compartida se reparte entre las flotas que la reclaman, de modo que la amplitud no puede contarse dos veces.',
                    'Los dos niveles son un mismo torneo: un minero comienza en un pool, asciende a un slot superior a medida que crece su amplitud de IPs enrutables, y vuelve al pool si retrocede. Una cuota fijada por la gobernanza divide la emisión entre la cabeza y la cola.',
                    { type: 'list', items: [
                        'Nivel de pool — la vía de entrada: únete a un operador sin slot y sin coste de registro; los validadores ponderan el pool según la demanda y la calidad; cada minero reclama su parte mediante prueba en cada período de liquidación.',
                        'Mineros de nivel superior — el vértice: las ~200 flotas con la cobertura de IPs enrutables más amplia reclaman su propio slot y reciben pago directamente de la red, sin operador, sin pool y sin intermediario.'
                    ]}
                ]
            },
            {
                numeral: 'V.',
                title:   'Custodia, liquidación y descentralización',
                body: [
                    'La liquidación se ejecuta en un ciclo de siete días. El contrato acumula la emisión de cada pool durante el período y luego abre las reclamaciones: los mineros retiran su $UR directamente del contrato contra la lista de pagos comprometida por su operador. Los mineros de nivel superior no necesitan ningún paso de liquidación: la cadena paga su slot de forma nativa en cada ciclo.',
                    'Nadie custodia los fondos de nadie más. El contrato de liquidación es el único custodio del $UR en tránsito, cada pago de pool es una reclamación on-chain directa, y a los mineros de nivel superior se les paga de forma nativa a sus propias claves. Los operadores y el propietario nunca toman custodia de las recompensas de los mineros.',
                    'Las reclamaciones ganadas son definitivas. Una vez que un período de liquidación se finaliza, los tokens que respaldan sus reclamaciones quedan comprometidos: ninguna actualización, pausa o acción administrativa puede bloquearlas ni revertirlas. La reserva bloqueada es unidireccional por el mismo estándar: ninguna función puede retirar fondos de ella.',
                    'El control se descentraliza con el tiempo. La red se lanza con el contrato actualizable tras un multisig del propietario —un control central deliberado y acotado para corregir errores tempranos— y se refuerza por etapas: un timelock público en cada cambio, un guardián que solo puede pausar y que puede detener un exploit pero nunca mover fondos ni bloquear reclamaciones finalizadas, y, con el tiempo, gobernanza on-chain y un núcleo de liquidación inmutable.'
                ]
            }
        ],
        source: { label: 'Lee el whitepaper completo', href: 'https://github.com/urfoundation/sn/' }
    },

    operators: {
        eyebrow: 'Operadores',
        title:   'Los operadores que ejecutan la red.',
        intro:   'Los operadores de red ejecutan los servidores de privacidad y el punto de verificación. Un operador deposita en la subred como una señal costosa y respaldada por ingresos de demanda real, ejecuta el protocolo de verificación de enrutamiento que co-firma cada ruta medida, y registra la lista de pagos que reparte sus recompensas entre los mineros asociados a él. Los operadores dirigen a dónde van las recompensas, pero nunca custodian los fondos de nadie más.',
        roles: [
            { tag: '01', title: 'Ejecutar los servidores', body: 'Los operadores ejecutan los servidores de privacidad y el punto /verify que co-firma cada ruta medida: la capa de coordinación entre los usuarios y los mineros que transportan el tráfico.' },
            { tag: '02', title: 'Señalar demanda real',    body: 'Los operadores depositan $UR en proporción a su uso real. Cada depósito es una participación de convicción bloqueada en la reserva de recompra —nunca redistribuida—, por lo que es una señal costosa y respaldada por ingresos que los validadores ponderan cuando puntúan los pools.' },
            { tag: '03', title: 'Dirigir los pagos',        body: 'En cada período de liquidación, un operador registra una lista de pagos Merkle que reparte su pool entre sus mineros. Dirige el reparto pero nunca toma custodia: cada minero reclama su parte directamente del contrato.' },
            { tag: '04', title: 'Comenzar',                 body: 'Registra una clave de operador de red, ejecuta el servidor /verify y deposita para empezar. La admisión de operadores está controlada por el propietario durante la fase de lanzamiento.', href: 'https://ur.xyz', linkLabel: 'Documentación para operadores' }
        ]
    },

    miners: {
        eyebrow: 'Mineros',
        title:   'Los mineros que transportan el tráfico.',
        intro:   'Los mineros son la oferta de la red: transportan tanto el tráfico de entrada como el de salida. Ejecutan un modelo de seguridad seguro por defecto, solo enrutan tráfico cifrado, se registran con uno o más operadores y reciben pago de la emisión de la subred por la capacidad enrutable que aportan. Los mineros compiten por alcance: las flotas que dan servicio a la mayor cantidad de subredes IP distintas y enrutables son promovidas a mineros de nivel superior y ganan más. Todo se ejecuta en espacio de usuario, en hardware que ya posees.',
        roles: [
            { tag: '01', title: 'Salida',               body: 'Los mineros de salida son las IPs de salida de la red compartida. Rechazan el tráfico que entra en conflicto con directrices regulatorias comunes como CFAA y DMCA, bloquean IPs maliciosas conocidas y solo enrutan tráfico cifrado, protegiendo tanto a los mineros como a los usuarios.' },
            { tag: '02', title: 'Entrada',              body: 'Los mineros de entrada (extensores) crean puntos de entrada que mejoran la accesibilidad en todo el mundo, usando TLS de N capas, suplantación de SNI y reenvío de confianza. Un subconjunto rotativo se expone en cada ciclo, y los clientes reintentan automáticamente los puntos de entrada que funcionaron antes.' },
            { tag: '03', title: 'Medido y emparejado', body: 'Los validadores independientes recorren cadenas de mineros para probar el tránsito en tiempo real y medir la disponibilidad y la calidad. Los mineros se clasifican según esa medición y según la velocidad, y cada operador ejecuta su propio emparejamiento entre usuarios y mineros.' },
            { tag: '04', title: 'Ganar con la emisión', body: 'A los mineros se les paga con la emisión de la subred. Dentro del pool de un operador reclamas tu parte en cada liquidación mediante prueba: una recompensa base de baja barrera, sin ningún slot que ganar ni nada que quemar.', href: 'https://docs.ur.io/provider', linkLabel: 'Documentación para mineros' },
            { tag: '05', title: 'Competir por la cima', body: 'Los mineros compiten por alcance. La red clasifica a las flotas por cuántas IPs de salida distintas y enrutables prestan realmente —no por volumen de tráfico— y las aproximadamente 200 con la cobertura más amplia son promovidas a mineros de nivel superior: su propio slot on-chain, con pago nativo, ganando más. Las IPs compartidas se reparten entre las flotas que las reclaman, de modo que la cobertura única es lo que gana: aumenta tu amplitud de IPs distintas para ascender, y si tu alcance retrocede vuelves al pool.' }
        ]
    },

    validators: {
        eyebrow: 'Validadores',
        title:   'Los validadores que miden la red.',
        intro:   'Los validadores son independientes. Cada uno hace staking de su propio $UR y ejecuta el protocolo de verificación de enrutamiento, recorriendo continuamente cadenas de mineros asignadas por los operadores para probar el tránsito en tiempo real y medir qué mineros son los eslabones más débiles. Esa medición es la señal central por la que paga la red, y los validadores ganan dividendos nativos por producirla con precisión.',
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
        ]
    },

    community: {
        eyebrow: 'Comunidad',
        title:   'Las personas detrás de la red.',
        intro:   'El protocolo es abierto. La comunidad que lo construye y opera está creciendo. Aquí es donde encontrarla.',
        items: [
            { tag: '01', title: 'Operadores de red',  body: 'Los operadores de red ejecutan servidores, depositan en la subred y venden acceso a la red.', href: 'https://ur.io', linkLabel: 'BringYour, Inc. — ur.io' },
            { tag: '02', title: 'Discord',             body: 'Únete a la conversación: desarrollo del protocolo, soporte a mineros y discusión de la comunidad.', href: 'https://discord.gg/urnetwork', linkLabel: 'Unirse a Discord' },
            { tag: '03', title: 'Kit de marca',        body: 'URnetwork y el logotipo del conector son marcas registradas en EE. UU. Se permite a los usuarios del protocolo usar el kit de marca como "powered by URnetwork" o mensajes de componente similares.' }
        ]
    }
};
