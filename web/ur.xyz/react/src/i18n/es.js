// Español
export default {
    nav: {
        whitepaper: 'Whitepaper',
        research:   'Investigación',
        providers:  'Proveedores',
        extenders:  'Extensores',
        exchanges:  'Mercados',
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
                title:   'El protocolo',
                body: [
                    'El protocolo $UR coordina un mercado global de ancho de banda entre personas, proveedores y las redes que los conectan.',
                    'La liquidación se denomina en $UR. Cada bloque registra las comisiones recaudadas, el volumen servido y la parte devuelta a los participantes.'
                ]
            },
            {
                numeral: 'II.',
                title:   'El token',
                body: [
                    '$UR tiene un suministro fijo en el génesis. Una porción de cada bloque es absorbida por el protocolo, reduciendo el suministro a medida que la red crece.',
                    'Los tokens distribuidos a los participantes representan un derecho sobre futuro ancho de banda y la posición que ocupan en la red.'
                ]
            },
            {
                numeral: 'III.',
                title:   'La red',
                body: [
                    'La red está compuesta por proveedores, extensores y operadores independientes. Ninguno de ellos, individualmente, custodia el tráfico ni la identidad del usuario.',
                    'La coordinación es sin permiso. La participación es abierta. El estatus se gana por el servicio prestado, no por el capital depositado.'
                ]
            },
            {
                numeral: 'IV.',
                title:   'El descuento',
                body: [
                    'Los poseedores de $UR reciben un descuento sobre los datos comprados a través de la red. El descuento escala con el estatus mantenido en el tiempo.',
                    'Esto liga el valor del token a su uso, y el uso de la red a las personas que dependen de ella.'
                ]
            }
        ]
    },

    research: {
        eyebrow: 'Investigación',
        title:   'Trabajo abierto, a la vista.',
        intro:   'La investigación que respalda el protocolo se publica a medida que se escribe. Cada paper es un borrador de trabajo de una pieza de la red.',
        papers: [
            { tag: 'R-001', title: 'Ancho de banda como capa de liquidación',           body: 'Un modelo para fijar el precio del movimiento de datos como unidad de cuenta en una red sin permisos.' },
            { tag: 'R-002', title: 'Estatus sin colateral',                              body: 'Cómo el historial de participación puede sustituir al bloqueo de capital al coordinar un mercado abierto.' },
            { tag: 'R-003', title: 'Resistencia Sybil mediante atestación de tráfico', body: 'Identificar a los proveedores genuinos a partir del comportamiento observable en millones de flujos independientes.' },
            { tag: 'R-004', title: 'Una curva deflacionaria para la red abierta',       body: 'Diseñar la absorción del token para seguir el crecimiento real de la red en lugar de los ciclos especulativos.' }
        ]
    },

    providers: {
        eyebrow: 'Proveedores',
        title:   'Las personas que sirven la red.',
        intro:   'Los proveedores son la base de la red. Aportan el ancho de banda del que dependen todos los demás, y el protocolo los recompensa directamente por hacerlo.',
        roles: [
            { tag: '01', title: 'Servir tráfico',           body: 'Ejecuta un proveedor en hardware que ya posees. Gana $UR por el ancho de banda que aportas a la red.' },
            { tag: '02', title: 'Mantenerse independiente', body: 'Sin custodia, sin contrato, sin liquidación centralizada. Los proveedores operan a una distancia sana de cualquier parte individual.' },
            { tag: '03', title: 'Ganar una parte',          body: 'Cada bloque devuelve una parte de las comisiones a los proveedores activos. El estatus crece con un servicio constante.' }
        ]
    },

    extenders: {
        eyebrow: 'Extensores',
        title:   'Las personas que llevan la red más lejos.',
        intro:   'Los extensores hacen que la red llegue a lugares a los que los proveedores por sí solos no pueden llegar. Son el segundo nivel de la red abierta y mantienen el protocolo resiliente frente al aislamiento.',
        roles: [
            { tag: '01', title: 'Llegar más lejos',     body: 'Los extensores retransmiten tráfico a redes que los proveedores no pueden alcanzar por sí mismos: a través de fronteras, alrededor de bloqueos, hacia lo abierto.' },
            { tag: '02', title: 'No portan contenido',  body: 'Los extensores ven flujos, nunca contenido. El protocolo está diseñado para que la capa de retransmisión no pueda convertirse en una capa de vigilancia.' },
            { tag: '03', title: 'Ganar por distancia',  body: 'La compensación sigue la dificultad de la ruta servida, no solo el volumen: cuanto más difícil la ruta, mayor la parte.' }
        ]
    },

    exchanges: {
        eyebrow: 'Mercados',
        title:   'Donde la red se encuentra con el mercado.',
        intro:   '$UR es libremente negociable. Los mercados conectan la red abierta con la economía más amplia sin convertirse ellos mismos en la red.',
        roles: [
            { tag: '01', title: 'Rampas de entrada / salida', body: 'Los mercados convierten la moneda local a $UR y viceversa. Son la puerta de entrada para todos los que aún no están en el protocolo.' },
            { tag: '02', title: 'Lugar de liquidación',        body: 'La liquidación bloque a bloque se registra en el protocolo. Los mercados la leen directamente: sin feeds privilegiados, sin compensación opaca.' },
            { tag: '03', title: 'Listados abiertos',           body: 'Listar el token es sin permiso. Cualquier mercado puede integrarse; el protocolo no elige ganadores.' }
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
