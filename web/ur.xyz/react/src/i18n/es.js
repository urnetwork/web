// Español
export default {
    nav: {
        whitepaper: 'Whitepaper',
        research:   'Investigación',
        providers:  'Proveedores',
        extenders:  'Extensores',
        community:  'Comunidad',
        usage:      'Uso',
        docs:       'Documentación',
        tagline:    'Posee tu privacidad. Posee tu red.',
        languageMenu: 'Idioma',
        ctaAria:    'Uso — costos actuales de la red'
    },

    footer: {
        github:     'GitHub',
        contact:    'Contacto',
        copyright:  '© 2026 BringYour, Inc.',
        disclaimer: 'Este sitio es un protocolo de utilidad de código abierto impulsado por una comunidad de participantes, operado de forma independiente al operador de red que vende el acceso a la red.',
        languagesAria: 'Idiomas'
    },

    stats: {
        protocolLedger:  'Libro del protocolo',
        block:           'Bloque',
        totalFees:       'Comisiones totales ($UR)',
        totalData:       'Datos totales',
        totalUsers:      'Usuarios totales',
        totalSupply:     'Suministro total de $UR',
        totalDistributed:'Total distribuido',
        urAbsorbed:      '$UR absorbidos',
        statusHeld:      'Estatus retenido ($UR)'
    },

    whitepaper: {
        eyebrow: 'Whitepaper',
        title:   'Un token para la red abierta.',
        clauses: [
            {
                numeral: 'I.',
                title:   'Descripción general de URnetwork',
                body: [
                    'URnetwork es un protocolo descentralizado de infraestructura de privacidad diseñado para permitir la "encriptación total de internet" mitigando la exposición de metadatos inherente a la suite de protocolos TCP/IP. Si bien la mayor parte del tráfico de internet está encriptado a nivel de contenido, los metadatos como las direcciones IP de origen y destino permanecen visibles para los intermediarios. El protocolo distribuye el tráfico de los usuarios a través de una red global de proveedores independientes usando enrutamiento multi-salto y encriptación por capas, de modo que ningún proveedor individual tiene acceso tanto a la identidad del usuario como al contenido de las comunicaciones. El protocolo incorpora técnicas como encriptación TLS de N capas, suplantación de SNI e indistinguibilidad del tráfico para asemejarse al tráfico HTTPS estándar.',
                    'La arquitectura del protocolo separa el transporte, el enrutamiento, la asignación y la liquidación en componentes distintos. Los usuarios se conectan a través de software cliente que enruta dinámicamente el tráfico a través de múltiples proveedores basándose en métricas de rendimiento y fiabilidad. La transferencia de datos ocurre a través de contratos encriptados entre usuarios y proveedores, con saldos en custodia, permisos definidos y liquidación posterior basada en el uso confirmado. Los contratos incluyen mecanismos de resolución de disputas y se eliminan después de un período definido. El protocolo es de código abierto y ha estado operativo desde aproximadamente abril de 2025.',
                    'Los usuarios y proveedores pueden interactuar directamente con el protocolo sin depender de ningún operador de red. Los operadores de red son operadores sofisticados del protocolo capaces de coordinar y desplegar volúmenes significativos de contratos inteligentes. Pueden revender ese volumen a consumidores o usarlo para sus propios fines. En muchos casos, los operadores de red despliegan contratos del protocolo actuando como puente entre los usuarios cotidianos y el protocolo.',
                    'El protocolo es un sistema autooperado y sin permisos que opera independientemente de los operadores de red. La economía del protocolo opera mediante dos tarifas: una tarifa de transferencia por gigabyte y una tarifa de transferencia por usuario. Estas dos tarifas abarcan todos los casos de uso de la red. Cualquier persona puede utilizar el protocolo siempre que pague una de estas dos tarifas.'
                ]
            },
            {
                numeral: 'II.',
                title:   'Separación de roles',
                body: [
                    'El protocolo opera de forma completamente independiente y seguiría siendo funcional si la empresa que lo desplegó dejara de mantenerlo. La operación y utilidad del protocolo no dependen de los esfuerzos gerenciales o empresariales continuos de ninguna entidad individual.',
                    'Los usuarios y proveedores no necesitan usar software o hardware proporcionado por ninguna empresa en particular para participar. Pueden interactuar directamente con el protocolo mediante sus propios despliegues de código. La empresa que desplegó el protocolo tiene la intención de distinguir claramente entre su papel como desplegador del protocolo, como operador de red que usa el protocolo para operar servicios, y como administrador actual del protocolo.'
                ]
            },
            {
                numeral: 'III.',
                title:   'Introducción del token $UR',
                body: [
                    'Dentro del protocolo, el token está destinado a funcionar como un instrumento de pago y liquidación. Los tokens se utilizan en conexión con operaciones de red discretas y se consumen o asignan como parte de esas operaciones. El token no está diseñado para representar ni otorgar ningún derecho a ganancias, ingresos o rendimientos, y está destinado a funcionar únicamente como medio de acceso y participación en el protocolo.',
                    'Los usuarios utilizan tokens depositándolos en contratos programáticos antes del uso de la red, con precios basados en la transferencia de datos y la actividad del usuario. Los tokens depositados financian transacciones de ancho de banda basadas en contratos entre usuarios y proveedores, con porciones retenidas en custodia durante la ejecución. Al liquidar, los tokens se distribuyen en un fondo de recompensas y se asignan a los proveedores según métricas de rendimiento.',
                    'Al completarse cada bloque (una semana), el 97,5% de los tokens utilizados se distribuyen a los proveedores, y el 2,5% se retira de circulación mediante absorción. Los tokens dirigidos a absorción no se redistribuyen y se excluyen de la contabilidad del protocolo para futuras liquidaciones de contratos. Este mecanismo está diseñado para equilibrar el uso de la red y la asignación de recursos.',
                    'El suministro total está fijado en 1.000.000.000 de tokens, todos acuñados en el génesis, sin inflación continua. En la generación de tokens, la asignación es la siguiente:',
                    { type: 'table', head: ['Categoría', '%', 'Tokens', 'Vesting'], rows: [
                        ['Contributor Rewards', '20%', '200.000.000', '1 año de vesting, 2 años de desbloqueo lineal'],
                        ['Team & Advisors',     '23%', '230.000.000', '1 año de vesting, hasta 2 años de desbloqueo lineal'],
                        ['Equity Investors',    '15%', '150.000.000', '1 año de vesting, 2 años de desbloqueo lineal'],
                        ['Treasury',            '2%',  '20.000.000',  'Desbloqueo lineal en 1 año'],
                        ['Strategic Reserve',   '40%', '450.000.000', 'Reservado para uso futuro del protocolo (0 inflación)']
                    ]},
                    'Se espera que aproximadamente el 2% del suministro (20 millones de tokens) esté en circulación inicial para propósitos de liquidez.'
                ]
            },
            {
                numeral: 'IV.',
                title:   'Distribución y circulación',
                body: [
                    'Los tokens pueden obtenerse de dos formas: adquisición directa en mercados secundarios, o recepción como recompensas por el ancho de banda aportado a la red como proveedor.',
                    'Los operadores de red pueden adquirir tokens de forma no exclusiva y basada en el mercado para apoyar su uso del protocolo. Dicha actividad se realiza únicamente con fines de consumo y no para inversión o soporte de mercado. El protocolo no depende de que ningún operador de red adquiera tokens para funcionar, y la demanda de tokens no está diseñada para ser impulsada por ningún participante o clase de participantes en particular.',
                    'Los operadores de red pueden vender el acceso al protocolo en tokens, moneda fiduciaria o términos denominados en tokens. Los operadores de red pueden estructurar niveles de servicio que incorporen señales de participación basadas en tokens o métodos de pago para personalizar el acceso a funciones dentro de sus aplicaciones.',
                    'Resumen de la interacción entre entidades:',
                    { type: 'list', items: [
                        'Un usuario puede comprar tokens en el mercado abierto y usarlos para interactuar directamente con el protocolo (incluyendo convertirse en operador de red), o puede depender de un operador de red para acceder al protocolo sin tocar tokens.',
                        'Un proveedor recibirá tokens por la provisión de ancho de banda al protocolo.',
                        'Los operadores de red adquirirán, retendrán y gastarán tokens para poner sus servicios a disposición de sus clientes, quienes pueden o no ser usuarios dependiendo de la naturaleza de esos servicios.'
                    ]}
                ]
            },
            {
                numeral: 'V.',
                title:   'Staking y mecanismos de integridad',
                body: [
                    'El protocolo no proporciona rendimientos pasivos ni ganancias sobre tokens. Cualquier diferencia en los resultados entre participantes es únicamente función de las diferencias en actividad, fiabilidad y uso dentro de la red. El protocolo tiene una forma integrada de cualificación operativa y priorización — mecanismos de integridad — que señalan compromiso, fiabilidad y calidad de participación, los cuales el protocolo usa para priorizar la asignación de recursos y la selección de contratos.',
                    { type: 'list', items: [
                        'Staking de consumidores: Los operadores de red pueden ofrecer niveles de servicio que integren autenticación basada en tokens o señales de participación para personalizar el acceso a funciones dentro de sus aplicaciones.',
                        'Staking de desarrolladores: Los desarrolladores que mantienen saldos de tokens son elegibles para tarifas de red reducidas como parte de una estructura de precios basada en el uso integrada en el protocolo, diseñada para fomentar la integración sostenida y la participación a largo plazo en la red.',
                        'Staking de proveedores: Los proveedores que bloquean tokens reciben prioridad en la asignación de contratos basándose en el compromiso y la fiabilidad demostrados. Los proveedores que bloquean $UR reciben mayores cuotas de recompensa durante el ciclo de recompensas al final del bloque basándose en un multiplicador de ponderación (1,0x, 1,25x, 1,5x o 2,0x). Estos multiplicadores ajustados no generan inflación — el fondo total de recompensas de la época es fijo. Los proveedores sin staking siguen ganando recompensas en proporciones menores.'
                    ]},
                    'Estos mecanismos de integridad apoyan la operación fiable, el rendimiento y la disponibilidad del protocolo alineando el acceso a la red y la asignación de recursos con la participación y calidad de servicio demostrables. Para cada categoría de participante, estos mecanismos operan para facilitar el uso efectivo de la red en lugar de proporcionar beneficios económicos basados en la propiedad pasiva de tokens.'
                ]
            }
        ]
    },

    research: {
        eyebrow: 'Investigación',
        title:   'Algoritmos abiertos, datos abiertos.',
        intro:   'El protocolo es un sistema nativo descentralizado, multi-IP y multi-transporte diseñado para escalar a millones de proveedores por operador de red. Cada área algorítmica a continuación se publica con su código fuente y, cuando corresponda, conjuntos de datos anonimizados para análisis independiente.',
        papers: [
            { tag: 'URTRANSPORT1', title: 'Rendimiento',
              body: 'Enrutamiento multi-salto a través de transportes TCP enfocado en la accesibilidad global. Se admiten actualizaciones de UDP y flujos punto a punto, con integración planificada de WebRTC, XRay y WireGuard.',
              href: 'https://github.com/urnetwork/connect/blob/main/transport.go', linkLabel: 'transport.go' },
            { tag: 'UREXTENDER1', title: 'Accesibilidad',
              body: 'Encriptación TLS de N capas (N≥2) donde cada capa exterior usa un certificado autofirmado con suplantación de SNI hacia una IP intermediaria, reenviando a otro salto o a una conexión TLS de extremo a extremo. Cualquier persona puede alojar un extensor en cualquier dominio.',
              href: 'https://github.com/urnetwork/connect/blob/main/net_extender.go', linkLabel: 'net_extender.go' },
            { tag: 'UR-FP2', title: 'Emparejamiento cliente-proveedor',
              body: 'Algoritmo de muestreo que carga una muestra aleatoria 10 veces mayor de proveedores potenciales y mezcla proporcionalmente a la fiabilidad por la puntuación del cliente. La resistencia Sybil se garantiza por la restricción de que la suma de fiabilidad es como máximo 1 por subred IP.',
              href: 'https://github.com/urnetwork/server/blob/main/model/network_client_location_model.go', linkLabel: 'network_client_location_model.go' },
            { tag: 'UR-MULTI', title: 'Multi cliente',
              body: 'Algoritmo heurístico de barrido que gestiona una ventana de proveedores. Fija el tráfico en el mejor nivel disponible basándose en umbrales de transferencia en lugar de análisis de protocolo.',
              href: 'https://github.com/urnetwork/connect/blob/main/ip_remote_multi_client.go', linkLabel: 'ip_remote_multi_client.go' },
            { tag: 'UR-TRANSFER', title: 'Transferencia',
              body: 'Ventana de entrega fiable optimizada para entornos de alta latencia. Las retransmisiones del protocolo están desactivadas ya que la ventana proporciona entrega fiable. Distribuye el tráfico entre transportes según el rendimiento clasificado.',
              href: 'https://github.com/urnetwork/connect/blob/main/transfer.go', linkLabel: 'transfer.go' },
            { tag: 'UR-IP', title: 'Salida IP',
              body: 'Implementación de pila IP con consumo mínimo de memoria. Asume comunicación fiable entre pares a través de la capa de transferencia, por lo que las retransmisiones se optimizan en consecuencia.',
              href: 'https://github.com/urnetwork/connect/blob/main/ip.go', linkLabel: 'ip.go' },
            { tag: 'UR-PSUB2', title: 'Asignación de tokens',
              body: 'Las recompensas de bloque se distribuyen cada 7 días de forma proporcional a los votos de transferencia de datos, las puntuaciones de fiabilidad y las referencias. El tráfico de suscriptores de pago se prioriza para contrarrestar la manipulación. Se aplican bonificaciones multiplicadoras por fiabilidad e incentivos comunitarios.',
              href: 'https://github.com/urnetwork/server/blob/main/model/account_payment_model_plan.go', linkLabel: 'account_payment_model_plan.go' },
            { tag: 'UR-CONTRACT', title: 'Permiso',
              body: 'La transferencia entre partes requiere un contrato encriptado con saldo en custodia y un conjunto de permisos. Ambas partes deben cerrar con recuentos de bytes confirmados; los desacuerdos activan un proceso de resolución forzada.',
              href: 'https://github.com/urnetwork/server/blob/main/model/subscription_model.go', linkLabel: 'subscription_model.go' },
            { tag: 'UR-SEC1', title: 'Seguridad',
              body: 'Lista de bloqueo de puertos y lista de bloqueo de IP que protegen la red de proveedores. No realiza inspección de protocolo: los proveedores solo enrutan tráfico encriptado.',
              href: 'https://github.com/urnetwork/connect/blob/main/ip_security.go', linkLabel: 'ip_security.go' }
        ]
    },

    providers: {
        eyebrow: 'Proveedores',
        title:   'La salida de la red compartida.',
        intro:   'Los proveedores son las IPs de salida de la red compartida. Ejecutan un modelo de seguridad seguro por defecto, bloquean IPs maliciosas conocidas y solo enrutan tráfico cifrado. Los proveedores se clasifican por velocidad y fiabilidad, se registran con uno o más operadores de red y obtienen una parte del valor contractual que enrutan. Los proveedores se ejecutan completamente en espacio de usuario y no requieren privilegios de root.',
        roles: [
            { tag: '01', title: 'Seguro por defecto',          body: 'Los proveedores rechazan tráfico que entra en conflicto con directrices regulatorias comunes como CFAA y DMCA. Se bloquean botnets conocidos e IPs maliciosas. Solo se enruta tráfico cifrado, protegiendo tanto a proveedores como a usuarios.' },
            { tag: '02', title: 'Clasificado y emparejado',    body: 'Los proveedores se clasifican por velocidad y fiabilidad y se registran con uno o más operadores de red. Cada operador de red ejecuta su propio algoritmo de emparejamiento entre usuarios y proveedores.' },
            { tag: '03', title: 'Ganar una parte',              body: 'Los proveedores ganan una parte del valor contractual que enrutan. Ejecuta un proveedor en hardware que ya posees — no se requieren privilegios de root, todo se ejecuta en espacio de usuario.' },
            { tag: '04', title: 'Comenzar',                     body: 'Configura un nodo proveedor y comienza a contribuir ancho de banda a la red.', href: 'https://docs.ur.io/provider', linkLabel: 'Provider docs' }
        ]
    },

    extenders: {
        eyebrow: 'Extensores',
        title:   'La entrada que lleva la red más lejos.',
        intro:   'Los extensores crean una red privada o compartida de IPs de entrada que utilizan diversas técnicas para mejorar la conectividad en todo el mundo. Los extensores pueden reenviar a operadores de red de confianza conocidos, a otros extensores y a IPs de socios de confianza utilizando la firma de confianza del operador de red.',
        roles: [
            { tag: '01', title: 'Extensores privados',          body: 'No registrados con operadores de red — actúan como cliente del sistema. Los usuarios introducen manualmente la IP del extensor en el cliente para conectarse a través del extensor.' },
            { tag: '02', title: 'Extensores públicos',          body: 'Se registran con operadores de red y reciben una porción del valor contractual del protocolo que enrutan. Los extensores públicos eligen a qué operadores de red reenvían, y también pueden reenviar a otras IPs de extensores o IPs firmadas por los operadores de red reenviados.' },
            { tag: '03', title: 'Exposición rotativa',          body: 'Un subconjunto aleatorio de extensores públicos es elegido para ser expuesto en cada bloque (1 semana). La exposición depende de la región de llamada y la hora. Los clientes mantienen una caché local de extensores para que los extensores que funcionaron previamente se reintenten automáticamente.' },
            { tag: '04', title: 'Reenvío de confianza',         body: 'Los operadores de red pueden asociar una IP de confianza con una contraseña para que los extensores puedan reenviar a cualquier IP que pase la prueba de confianza. La red almacena la IP como un hash con sal siguiendo las directrices generales de almacenamiento de IP.' }
        ]
    },

    community: {
        eyebrow: 'Comunidad',
        title:   'Las personas detrás de la red.',
        intro:   'El protocolo es abierto. La comunidad que lo construye y opera está creciendo. Aquí es donde encontrarlos.',
        items: [
            { tag: '01', title: 'Operadores de red',  body: 'Los operadores de red construyen productos sobre el protocolo y venden acceso a la red.', href: 'https://ur.io', linkLabel: 'BringYour, Inc. — ur.io' },
            { tag: '02', title: 'Discord',              body: 'Únete a la conversación: desarrollo del protocolo, soporte a proveedores y discusión de la comunidad.', href: 'https://discord.gg/urnetwork', linkLabel: 'Unirse a Discord' },
            { tag: '03', title: 'Kit de marca',          body: 'URnetwork y el logotipo del conector son marcas registradas en EE. UU. Se permite a los usuarios del protocolo usar el kit de marca como "powered by URnetwork" o mensajes similares de componente.' }
        ]
    },

    usage: {
        eyebrow: 'Uso',
        title:   'Las personas que empaquetan la red.',
        intro:   'Los operadores de red transforman el mercado abierto de proveedores y extensores en productos que consumidores y empresas pueden comprar. Son la cara pública de la red, y el protocolo los somete a los mismos estándares que a todos los demás.',
        roles: [
            { tag: '01', title: 'Agregar demanda',          body: 'Los operadores agrupan proveedores y extensores en redes a las que los clientes pueden comprar con un rendimiento predecible.' },
            { tag: '02', title: 'Garantizar la calidad',    body: 'Los operadores ponen en juego su estatus por el ancho de banda que venden. El mal servicio se refleja en el libro mayor y en la curva de descuento.' },
            { tag: '03', title: 'Liquidar en el protocolo', body: 'Toda la liquidación ocurre a través de $UR. Los operadores responden a las mismas reglas que cualquier otro en la red.' }
        ]
    }
};
