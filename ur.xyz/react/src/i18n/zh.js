// 简体中文 — 逐键镜像 en.js 的结构；若在 en.js 新增键，请在此同步添加。
export default {
    nav: {
        whitepaper: 'Litepaper',
        operators:  '运营商',
        miners:     '矿工',
        validators: '验证者',
        research:   '研究',
        community:  '社区',
        price:      '使用成本',
        docs:       '文档',
        roadmap:    '路线图',
        network:    '网络',
        tagline:    '掌控你的隐私，掌控网络。',
        languageMenu: '语言',
        menu:         '菜单',
        closeMenu:    '关闭菜单',
        primaryNav:   '主导航',
        mobileNav:    '移动端导航',
        siteMenu:     '网站菜单',
        browseDocs:   '浏览文档',
        apiReference: 'API 参考',
        search:       '搜索',
        ctaAria:    '使用成本——当前网络价格',
        denomAria:  '价格计价单位'
    },

    footer: {
        github:     'GitHub',
        contact:    '联系',
        license:    'MPLv2',
        disclaimer: '本网站是一个由参与者社区提供支持的开源实用协议，与销售网络访问权的网络运营商分开运行。',
        languagesAria: '语言',
        terms:      '使用条款',
        privacy:    '隐私政策',
        vdp:        'VDP',
        protocol:   '协议',
        community:  '社区',
        legal:      '法律',
        learn:      '了解',
        resources:  '资源',
        connect:    '联系',
        bittensorDiscord: 'Bittensor Discord',
        brandKit:   '品牌资料包',
        launchVideo: '发布视频',
        socialAria:     '社区与社交媒体链接',
        socialX:        'URnetwork 的 X 账号',
        socialTelegram: 'UR 子网的 Telegram',
        socialDiscord:  'URnetwork 的 Discord',
        socialGithub:   'UR 子网的 GitHub',
        productsAria:   'ur.io 上的 URnetwork 产品'
    },

    disclaimer: {
        protocol: 'UR 是一个为网络基础设施提供动力、由社区维护的开源协议。',
        products: '如需 URnetwork 产品（例如 VPN），请访问 ur.io',
        before: 'UR 是一个为网络基础设施提供动力、由社区维护的开源协议。如需 URnetwork 产品（例如 VPN），请访问'
    },

    launchVideo: {
        aria:  'UR 发布视频',
        close: '关闭视频',
        sound: '点按开启声音',
        play:  '播放视频',
        fullscreen: '全屏',
        exitFullscreen: '退出全屏'
    },

    homepage: {
        intro: 'UR 子网是构建在 Bittensor 上的隐私网络。子网会奖励使用网络并为其做出贡献的人。运营商运行服务器并存入 alpha 以路由流量。矿工承载加密流量并获得发行奖励。验证者重新测量网络、验证准确性并获得发行奖励。',
        diagramAria: 'UR 网络的工作方式',
        rolesEyebrow: '参与网络',
        rolesTitle: '三种角色。一个可测量的网络。',
        roles: {
            operators: { name: '运营商', body: '运营商运行隐私服务器和验证端点。他们根据预期流量存入资金，共同签署每条测量路径，并提交将奖励分配给旗下矿工的支付清单。存款进入储备，运营商从不托管他人的资金。', explore: '了解运营商' },
            miners: { name: '矿工', body: '矿工承载流量。他们运行节点，为一个或多个运营商路由加密流量，并根据所贡献的容量从子网发行中获得奖励。', explore: '了解矿工' },
            validators: { name: '验证者', body: '验证者重新测量网络。他们运行路由验证协议，并按需求和实测质量为每个运营商池评分。准确评分可获得子网发行奖励。', explore: '了解验证者' }
        },
        whitepaperCta: '阅读 Litepaper 了解更多详情',
        metaTitle: 'UR | Bittensor SN25 上的去中心化隐私网络',
        metaDescription: 'UR 是 Bittensor SN25 上开源的去中心化隐私网络：矿工承载加密流量，验证者对其进行测量，运营商带来需求。'
    },

    diagram: {
        subnet: '子网',
        aria:   'UR 网络——{subnet}、{operators}、{miners}和{validators}，当前突出显示：{active}',
        goTo:   '前往{label}'
    },

    // 统计标签按原样渲染（无 CSS text-transform），
    // 以保留 α 字形与 GiB 单位的大小写——请直接写成最终显示形式。
    stats: {
        protocolLedger:  '子网账本',
        refresh:         '刷新统计数据',
        blockNumber:     '区块编号',
        dataPerBlock:    '每区块总数据量 (GiB)',
        usersPerBlock:   '每区块总用户数',
        totalNetworks:   '网络总数',
        stakedInContract:'合约质押量 (α)',
        demandDeposits:  '每区块需求存款 (α)',
        minerEmissions:  '每区块矿工发行 (α)',
        networkOperators:'网络运营商',
        testnet:         '状态：TESTNET。仅显示测试网数据。'
    },

    sim: {
        block: '区块',
        prevBlock: '上一区块',
        blockProgressAria: '当前区块进度',
        endsAt: '于 {date} 00:00 UTC 结束。距区块结束还有 {d}天 {h}时 {m}分 {s}秒',
        heroAria: '网络模拟',
        ops:      '运营商',
        protocol: '协议'
    },

    price: {
        eyebrow: '使用成本',
        title:   '网络的公开价格。',
        intro:   '运营商通过需求存款为网络提供资金——即每个区块（7 天）按其服务的数据量和用户数存入的 α。下表为公开费率：运营商按其满足质押 α 门槛的最优档位付费；第 0 档适用于所有人，无论是否质押 α。',
        colTier:    '档位',
        colStake:   '质押 α 门槛',
        colGib:     'α / GiB',
        colUser:    'α / 用户',
        colGibUsd:  'USD / GiB',
        colUserUsd: 'USD / 用户',
        tierEveryone: '所有人',
        usdNote:  'USD 等值采用 CoinGecko 公开 GeckoTerminal 源中 SN{sn} 的实时 α 价格。',
        usdNoteOperators: 'USD 等值采用网络运营商报告的 α 平均价格。',
        alphaNow: '1 α = {usd}',
        usdUnavailable: '实时 α 价格不可用——已隐藏 USD 等值。',
        subscribe: '订阅价格变更 (RSS)',
        rawFile:   '原始价格表 (price.yml)',
        initialPeriod: '初始阶段：公开费率为 0 α。在网络加固期间不收取运营商需求存款；每个运营商池被赋予相同的需求，因此仅由实测质量决定池通道的分配。'
    },

    roadmap: {
        eyebrow: '路线图',
        title:   '网络的前进方向。',
        intro:   '三个阶段，每一个都建立在前一个之上：开放入口网络，让 UR 成为企业在其上构建的基底，再重建互联网的大门。时间范围是从今天起算的目标——是方向，而非承诺。',
        phaseLabel: '阶段',
        phases: [
            {
                no: '01',
                date: '1–2 个月',
                flag: '即将上线',
                title: '入口网络访问',
                body: '矿工同时成为出口与入口。每个矿工自动检测自身环境，并把自己配置为尽其所能——既承载入口流量，也承载出口流量。入口网络复用扩展器的 N 层加密设计，并新增客户端侧的工作，以迭代方式发现按时间解锁的扩展器，使新的入口点不断轮换进入可达范围。'
            },
            {
                no: '02',
                date: '3–4 个月',
                title: '企业角色与授权',
                body: '基于角色的访问，与 OAuth 和 Workload Identity Federation 集成。RBAC 内建于网络本身，因此企业网络可以直接构建在协议之上——这一层正是支撑 VPN.dev 开发者与 VPN 两类用例的基础。对这些企业的吸引力在于：一个在世界任何地方都保持可达且高性能的网络——让去中心化项目的参与者可以从任何地方参与。'
            },
            {
                no: '03',
                date: '8–12 个月',
                title: '新的互联网主页——WW.dev',
                body: '互联网的一扇新大门。我们专注于索引——推与拉并举——一个面向智能体的搜索索引，以及小而稠密的本地模型。人们可以设置一个新的私密主页；智能体则可以使用一个开放的搜索索引，获得对信息的私密、实时访问，并通过 Privacy Pass 与 x402 结算。'
            }
        ]
    },

    legal: {
        eyebrow: '法律',
        terms: {
            title: '使用条款',
            body:  'ur.xyz（由 UR Foundation 托管的 UR 协议信息网站）的服务条款。'
        },
        privacy: {
            title: '隐私政策',
            body:  'UR Foundation 如何收集、使用和保护 ur.xyz 访问者的信息（包括钱包地址），以及如何行使你的隐私权利。'
        },
        vdp: {
            title: '漏洞披露政策',
            body:  '如何报告 UR Foundation 资产中的安全漏洞，以及善意研究的安全港政策。'
        }
    },

operators: {
        eyebrow: '运营商',
        title:   '运行网络的运营商。',
        intro:   '网络运营商运行隐私服务器和验证端点。运营商作为一种有收入支撑的真实需求信号向子网存入资金，运行路由验证协议、为每一条被测量的路径共同签名，并提交支付清单，将其奖励在附属于它的各矿工之间进行分配。运营商指定奖励的去向，但从不持有任何他人的资金。',
        cta: '成为网络运营商',
        metaTitle: '网络运营商：在 SN25 上运行 UR 隐私服务器 — UR',
        metaDescription: '网络运营商运行 UR 隐私服务器和 /verify 端点，存入 alpha 作为有收入支撑的需求信号，并将支付分配给旗下矿工。',
        roles: [
            { tag: '01', title: '运行服务器',       body: '运营商运行隐私服务器和为每一条被测量的路径共同签名的 /verify 端点——它是用户与承载流量的矿工之间的协调层。' },
            { tag: '02', title: '发出真实需求信号', body: '运营商按其真实使用量以 alpha 计费。每一笔存入都会进入储备，作为一种有收入支撑的信号，验证者在为各池评分时会将其计入权重。' },
            { tag: '03', title: '指定支付分配',     body: '每个结算周期，运营商提交一份 Merkle 支付清单，将其池在各矿工之间进行分配。它指定分配方式，但从不进行托管——每个矿工直接从合约领取其份额。' },
            { tag: '04', title: '开始使用',         body: '注册一个网络运营商密钥，运行 /verify 服务器，并存入资金即可开始。在启动阶段，运营商准入由所有者把关。', href: '/docs/operator', linkLabel: '运营商指南' }
        ],
        directoryTitle: '网络运营商',
        directoryNote:  '按网络总数排序。统计数据实时读取自各运营商的公开源；图标链接到运营商在各商店的应用。',
        dashboard: '仪表盘',
        colOperator: '运营商',
        colStores:   '获取应用'
    },

    miners: {
        eyebrow: '矿工',
        title:   '承载流量的矿工。',
        intro:   '矿工们竞相在网络上提供尽可能多的 IPv4 /29 与 IPv6 /48 子网——每个子网在任何时刻都可用于入口或出口流量的路由。换句话说，矿工把公共互联网转变为人人都能使用的匿名私有网络。每个矿工同时承载入口与出口流量，运行默认安全的安全模型，仅路由加密流量，并因其贡献的可路由容量而从子网发行中获得报酬。覆盖最多不同可路由子网的集群会被晋升为顶级矿工并赚取更多——一切都在用户空间中、在你已拥有的硬件上运行。',
        both:    '矿工既是扩展器也是提供者：每个矿工同时承担入口和出口两种角色。它会根据所运行的系统自动完成配置。',
        goal:    '目标是建立一个双重影子网络：每个公共 IPv4 和 IPv6 子网都有一个私密、匿名的对应网络。UR 正在建设这个私密匿名网络。',
        globeAlt: '矿工地球：提供者以圆点表示，扩展器以圆环表示，每个都使用其所在国家的颜色。',
        globeLabels: { provider: '提供者', extender: '扩展器', miner: '矿工' },
        simCaption: '矿工竞相在网络上稳定提供最多的独立 IP。顶级矿工会晋升到属于自己的 UID 槽位。',
        cta: '成为矿工',
        metaTitle: '矿工：承载加密流量，赚取 SN25 发行奖励 — UR',
        metaDescription: 'UR 矿工让 IPv4 /29 与 IPv6 /48 子网在 Bittensor SN25 上可路由，承载加密的出入口流量，并凭经测量的独特覆盖赚取发行奖励。',
        roles: [
            { tag: '01', title: '出口',             body: '作为出口，矿工是共享网络的出口 IP。它拒绝与 CFAA、DMCA 等常见监管方向相冲突的流量，阻止已知的恶意 IP，并且只路由加密流量——从而同时保护矿工与用户。' },
            { tag: '02', title: '入口',             body: '作为入口（扩展器），矿工创建入口点，改善全球范围的可达性——使用 N 层 TLS、SNI 伪装以及可信转发。每个周期会曝光一个轮换的子集，客户端会自动重试之前有效的入口点。' },
            { tag: '03', title: '实测与匹配',       body: '独立验证者遍历矿工链，以证明实时中转并衡量存活性与质量。矿工按该衡量结果以及速度排名，每个运营商都运行自己的用户与矿工匹配机制。' },
            { tag: '04', title: '从发行中赚取',     body: '矿工的报酬来自子网的发行。在运营商的池内，你凭一份证明领取每次结算中的份额——这是一种低门槛的基线奖励，没有需要争夺的槽位，也没有需要销毁的东西。', href: '/docs/miner', linkLabel: '矿工指南' },
            { tag: '05', title: '争夺顶级',         body: '矿工在覆盖范围上展开竞争。网络按集群实际服务的不同的可路由出口 IP 数量对其排名——而非按流量大小——覆盖范围最广的大约 200 个集群会被晋升为顶级矿工：拥有属于自己的链上槽位，被原生地支付，赚取更多。共享的 IP 会在认领它们的各集群之间拆分，因此取胜的关键是独特的覆盖范围——扩大你的不同 IP 广度以攀升，若你的覆盖范围下滑，则退回池中。' }
        ]
    },

    validators: {
        eyebrow: '验证者',
        title:   '衡量网络的验证者。',
        intro:   '验证者是独立的。每个验证者质押自己的 UR，运行路由验证协议——持续遍历由运营商指定的矿工链，以证明实时中转并衡量哪些矿工是最薄弱的环节。这一衡量正是网络付费购买的核心信号，验证者因准确地产生这一衡量而赚取原生分红。',
        simCaption: '验证者探测可用的 IP 覆盖面，并按可靠性为矿工排名。',
        cta: '成为验证者',
        metaTitle: '验证者：测量 UR 网络，赚取 SN25 分红 — UR',
        metaDescription: 'UR 验证者质押自己的 UR，遍历运营商指定的矿工链以证明实时中转，并因准确评分赚取 Bittensor 分红。',
        roles: [
            { tag: '01', title: '遍历路由',       body: '验证者遍历由运营商指定的矿工链，并为每一个已完成的跳收集一份带签名、自证明的记录——这是任何人都可以核查的实时中转的密码学证明。' },
            { tag: '02', title: '为网络评分',     body: '每个周期，验证者按需求与实测质量为每个运营商的池评分，并按可路由 IP 广度对顶级集群排名——全部在提交-揭示（commit-reveal）机制下进行。Bittensor 的 Yuma Consensus 将这些独立的评分转化为矿工发行。' },
            { tag: '03', title: '赚取原生分红',   body: '验证者因准确且与共识一致的评分而赚取 Bittensor 原生分红——这是它们唯一的奖励。没有任何运营商拥有验证者，且验证者集合是无需许可的。', href: '/docs/validator', linkLabel: '验证者指南' },
            { tag: '04', title: '设计上独立',     body: '由于提交-揭示会隐藏每个验证者的评分直到它们过时，复制他人不会有任何收益——验证者必须实际遍历真实的路径。衡量保持诚实，且没有任何单一方控制它。' }
        ]
    },

    research: {
        eyebrow: '研究',
        title:   '开放算法，开放数据。',
        metaTitle: '研究：开放的算法、数据与审计 — UR',
        metaDescription: '公开的 UR 研究：路由、匹配、传输与奖励算法及其源代码和匿名数据，Apex SN1 延迟竞赛，以及审计。',
        intro:   '协议是一个去中心化原生、多 IP、多传输的系统，旨在扩展到每个网络运营商数百万矿工的规模。下面的每个算法领域都发布了其源代码，以及（如适用）用于独立分析的匿名数据集。',
        areaLabels: {
            approach: '当前方案',
            implementation: '实现',
            directions: '研究方向'
        },
        papers: [
            { tag: 'URTRANSPORT1', title: '性能',
              body: '通过 TCP 传输实现的多跳路由，专注于全球可达性。支持 UDP 和点对点流升级，并计划集成 WebRTC、XRay 和 WireGuard。',
              approach: '传输层首先为可达性而设计，让世界上每个人都能连接。多跳路由通过 TCP 传输经由一个中央跳完成。H3 和 DNS 等 UDP 传输已实现但被禁用：在实际使用中，这种配置下它们的表现不如 TCP 路径。带点对点流升级的多矿工跳同样已实现，目前也处于禁用状态。传输选择与流升级路径位于 transport.go 和 transfer_stream_manager.go。',
              links: [
                  { href: 'https://github.com/urnetwork/connect/blob/main/transport.go', label: 'transport.go' },
                  { href: 'https://github.com/urnetwork/connect/blob/main/transfer_stream_manager.go', label: 'transfer_stream_manager.go' }
              ],
              directions: '把 WebRTC、XRay 和 WireGuard 等成熟协议作为流升级集成到多矿工跳上，并在测量显示有益的地方重新启用 UDP 传输。匹配算法也可以开始区分拥有公网 IP 和端口的跳与没有的跳，以在速度与连接质量之间取得平衡。这些改动都可以先在实验性网络运营商上试行，再成为默认方案。' },
            { tag: 'UREXTENDER1', title: '可达性',
              body: 'N 层 TLS 加密（N≥2），每个外层使用自签名证书并将 SNI 伪装到一个中间 IP，转发到另一跳或一个端到端 TLS 连接。任何人都可以在任何域上托管扩展器。',
              approach: '核心网络栈支持 N 层 TLS 加密，N 至少为二。每个外层都可以使用针对所选主机名的自签名证书来到达一个中间 IP，该 IP 再把流量转发到另一跳，或转发到与网络运营商域的端到端 TLS 连接，因此这条连接看起来就像发往该主机名的普通流量。任何人都可以在自己控制的域上托管扩展器。同一个扩展器的用户共享一个公共速率限制，可逐例调整。',
              links: [
                  { href: 'https://github.com/urnetwork/connect/blob/main/net_extender.go', label: 'net_extender.go' }
              ],
              directions: '扩展器可以加入协议的资助名单，该名单在参与的扩展器之间分配一部分激励；加入细节将在名单开放时公布。每个矿工已经在出口角色之外同时承担扩展器角色。悬而未决的问题是：如何在最需要的地方测量扩展器的覆盖范围而不暴露其用户，以及随着封锁手段的调整，外层应如何轮换主机名和证书。' },
            { tag: 'UR-FP2', title: '客户端–矿工匹配',
              body: '采样算法，加载潜在矿工的 10× 随机样本，并按可靠性 × 客户端评分成比例地进行洗牌。Sybil 抵抗由每个 IP 子网的可靠性总和至多为 1 这一约束来保证。',
              approach: '匹配系统从内存中加载候选矿工的随机样本，约为所需数量的十倍，并按可靠性 × 客户端评分成比例地洗牌，得出最终候选者。它对矿工别名化（Sybil 攻击）的防护是按 IP 子网设定的上限：同一子网内所有矿工的可靠性评分之和至多为 1，因此把一条连接拆成许多身份并不会提高其匹配份额。入口点是 FindProviders2。',
              links: [
                  { href: 'https://github.com/urnetwork/server/blob/main/model/network_client_location_model.go', label: 'network_client_location_model.go' }
              ],
              directions: '在匹配时区分拥有公网 IP 和端口的跳与没有的跳，从而显式地权衡速度与连接质量，而不只是通过可靠性。可靠性与客户端评分的权重以及样本大小，是实验性运营商可以基于下文描述的匿名区块导出数据加以调整的自然输入，同时保持每子网上限不变，作为 Sybil 边界。' },
            { tag: 'UR-MULTI', title: '多客户端',
              body: '启发式扫描算法，管理一个矿工窗口。基于传输阈值而非协议分析，将流量锁定到最优的可用层级。',
              approach: '启发式扫描管理一个矿工窗口，并把流量锁定到最高可用层级的矿工上。决策依据的是传输阈值——矿工实际传输了多少——而不是检查隧道内的协议，因此路由器永远不需要查看应用流量。正是这个窗口让一个客户端能同时保持多个矿工在用，并随着它们实测传输量的变化在它们之间转移流量。',
              links: [
                  { href: 'https://github.com/urnetwork/connect/blob/main/ip_remote_multi_client.go', label: 'ip_remote_multi_client.go' }
              ],
              directions: '阈值与层级边界目前是手工设定的。留给实验性运营商的开放问题：是否应改为从实测的传输分布中推导；窗口是否还应纳入验证者现在产出的每矿工存活性与延迟统计（见“路由验证”），让客户端在用自己的流量付出代价之前就避开薄弱环节。' },
            { tag: 'UR-TRANSFER', title: '传输',
              body: '为高延迟环境调优的可靠交付窗口。由于该窗口已提供可靠交付，协议重传被禁用。它按性能排名在各传输通道之间分配流量。',
              approach: '可靠传输窗口针对高延迟环境调优。由于窗口本身提供可靠交付，协议向传输层的重传被禁用：经隧道承载的 TCP 流不会在其之上再次重传。流量按各传输通道的性能排名与可用性在它们之间分配，因此缓慢或失败的传输通道会失去份额，而不会让流停滞。',
              links: [
                  { href: 'https://github.com/urnetwork/connect/blob/main/transfer.go', label: 'transfer.go' }
              ],
              directions: '开放问题：窗口应如何针对真实世界延迟的整个分布而非单一固定画像自行定尺寸；当传输通道的性能在流中途变化时应如何重新排名；以及当一跳是点对点而下一跳不是时，传输层应如何与为传输规划的流升级（见“性能”）协作。' },
            { tag: 'UR-IP', title: 'IP 出口',
              body: '最小内存占用的 IP 协议栈实现。它假设通过传输层实现可靠的对等通信，因此相应地优化了重传。',
              approach: 'IP 协议栈为最小内存占用而设计，使矿工可以在手机或小型设备上充当出口。它假设通过传输层与对端的通信是可靠的，这样它自身的重传处理可以被优化掉而非重复实现。安全层（见“安全”）位于同一路径上，因此每个数据包在离开矿工之前都会被检查。',
              links: [
                  { href: 'https://github.com/urnetwork/connect/blob/main/ip.go', label: 'ip.go' }
              ],
              directions: '开放问题：在最小的设备上内存占用还能降低多少；当传输层的可靠性假设为传输规划中的点对点流升级而放宽时，出口协议栈如何保持其保证。与传输一样，改动会先在实验性运营商上试行，再成为默认方案。' },
            { tag: 'UR-PSUB2', title: '奖励分配',
              body: '独立验证者按需求与实测质量为每个运营商池评分；Bittensor 的 Yuma Consensus 将这些评分转化为发行。在一个池内，运营商按已服务的合约数与可靠性对其矿工排名，每个周期提交一个 Merkle 支付根，每个矿工直接从结算合约领取其份额。',
              approach: '奖励来自 UR 子网在 SN25 上的发行。每个运营商的矿工组成一个池，对应一个矿工 UID。每个 tempo 周期，独立验证者在提交-揭示机制下按隐含用量 × 实测质量为每个池评分（运营商的本周期存款除以其信念层级的公布费率，再乘以该池矿工按验证者自身遍历得出的质量），Yuma Consensus 把中位数转化为发行。在池内，运营商按已服务合约 × 可靠性对矿工排名，每个周期提交一个 Merkle 支付根，每个矿工直接从结算合约领取其份额。按可路由 IP 广度排名靠前的集群拥有自己的 UID，并被原生地支付。当公布价格为 0 时，不收取存款，每个池承载相同的隐含需求，因此只有实测质量在引导池通道。',
              links: [
                  { href: 'https://github.com/urnetwork/server/blob/main/model/account_payment_model_plan.go', label: 'account_payment_model_plan.go' },
                  { href: 'https://github.com/urfoundation/sn/blob/main/WHITEPAPER.md', label: 'WHITEPAPER.md §7–§10' },
                  { href: 'https://github.com/urfoundation/sn/tree/main/validator', label: 'sn/validator' }
              ],
              directions: 'θ 是公布的治理参数：先偏向池端起步（θ ≈ 0.3），度量各层级的实际收益，随着顶级矿工集合与独立验证者的质量共识逐渐成熟再逐步扩大——约束是收入最低的顶级矿工仍至少不低于收入最高的池内矿工。质量对池权重的摆动幅度在启动阶段受限，并逐步放开。验证者努力奖励已有设计但被搁置，只有当运行中的网络表明独立覆盖需要它时才会构建。把验证者集合去中心化到所有者多数之外，是有意安排的后续治理步骤。' },
            { tag: 'UR-CONTRACT', title: '权限',
              body: '双方之间的传输需要一份带有托管余额和权限集的加密合约。双方都必须以确认的字节计数关闭合约；出现分歧时会触发强制解决流程。',
              approach: '发起方与伴随方之间的传输需要一份用目标客户端密钥加密的合约。合约在托管中持有固定的传输余额，并定义双方之间的权限。伴随方可以为返回流量创建配对合约，多跳路径则向中间节点发送流打开与流关闭事件。使用完毕后，双方以确认的字节计数关闭合约。若任一方未关闭，或双方总数不一致，则由合约裁决决定结果；若任一方举报滥用，双方之间未来的传输将被阻止。',
              links: [
                  { href: 'https://github.com/urnetwork/server/blob/main/model/subscription_model.go', label: 'subscription_model.go' }
              ],
              directions: '已服务合约 × 可靠性同时也是运营商池支付列表的默认依据，因此关闭时字节计数的准确性会影响奖励。开放问题：在没有可信第三方总数的情况下如何解决两个关闭计数之间的分歧；配对的返回合约应如何针对非对称流量定尺寸；以及当双方计数此前已有分歧时，应如何权衡滥用举报。' },
            { tag: 'UR-SEC1', title: '安全',
              body: '保护矿工网络的端口阻止列表和 IP 阻止列表。它不执行协议检查——矿工仅路由加密流量。',
              approach: '安全层使用端口和 IP 阻止列表。它不检查应用协议：矿工仅路由加密流量，因此无从检查；正是阻止列表让矿工能够拒绝与 CFAA、DMCA 等常见监管方向相冲突的流量，并丢弃已知的恶意目的地。列表在矿工上生效，因此用户的流量在每个出口都遇到同样的规则。',
              links: [
                  { href: 'https://github.com/urnetwork/connect/blob/main/ip_security.go', label: 'ip_security.go' }
              ],
              directions: '开放问题：如何在没有能看到流量的中心节点的情况下，在整个集群中分发和更新阻止列表；安全层是否应从匿名出口数据中学习按目的地的信誉，而不是依赖静态列表；以及矿工可以往自己的列表中添加什么，而不至于让网络在各出口之间行为分裂。' },
            { tag: 'UR-VERIFY1', title: '路由验证',
              body: '验证者遍历由服务器指定的矿工链，用四个 Ed25519 签名证明从每一跳的实时出口。逐步的完成率与延迟统计找出最薄弱的环节，并成为引导池发行的质量信号。',
              approach: '验证者经由自选的矿工播种一条遍历路径并调用 /verify；服务器根据请求的源 IP 推导当前跳，绝不依据声明。每个下一跳都是均匀随机、不放回地抽取，且只在当前跳确认之后才揭示，因此路径无法被预先计算。四个 Ed25519 签名把整条路径绑定在一起：验证者签署 SEED 与 EXTEND，服务器签署 ASSIGN 与 FINAL，并为每一跳盖上时间戳。失败归因于那个从未被到达的唯一一跳；延迟在确认时逐步记录；验证者自选的种子跳被排除；每个矿工在曝光量足够后，以完成率的 Wilson 评分区间和延迟百分位数来报告。',
              links: [
                  { href: 'https://github.com/urnetwork/server/blob/main/controller/verify_controller.go', label: 'verify_controller.go' },
                  { href: 'https://github.com/urfoundation/sn/tree/main/validator', label: 'sn/validator' },
                  { href: 'https://github.com/urfoundation/sn/blob/main/VALIDATOR.md', label: 'VALIDATOR.md' }
              ],
              directions: '一条完成的路径证明的是到一个已知目的地的实时顺序中转，而不是对用户流量的诚实转发；逐跳的自我交易只能在统计意义上受到限制——依靠独立的验证者群体。通往可用于支付的测量的路线图：通过邻居见证实现路由证明；目的地多样性，使矿工无法只优化那条被测路径；通过质押实现验证者的 Sybil 抵抗；以及用于归因的分层风险模型。在此之前，这些统计是存活性与延迟监控以及临时评分。' }
        ],
        competition: {
            title: '模拟延迟算法竞赛',
            eyebrow: '由 Apex (SN1) 提供支持',
            body: '优化 UR 协议。提交的方案将与{code}的一个分支进行对比评估，胜出者将成为新的基线并赢得 SN1α。共六轮，每轮一周，自 2026-09-28 开始。一起来吧！',
            codeLabel: '代码',
            cta: '参加竞赛',
            statusUpcoming: '{date} 开始',
            statusLive: '进行中',
            statusEnded: '已结束',
            imageAlt: '两个节点经由穿过屏障的路由相连：Apex 模拟延迟竞赛'
        },
        anonymization: {
            title: '匿名化',
            body: '网络的支付区块为 7 天，每个算法输入与输出的导出数据按区块匿名化。每个客户端 id 和每个 IP 子网哈希都被替换为简单的整数计数器，因此一个身份在同一区块内保持一致，但不会跨区块延续，也无法追溯到生产环境的 id。不包含城市元数据。区块导出数据已准备好发布，但尚未发布；发布后本页面会给出链接。'
        },
        researchers: {
            title: '致研究者与开发者',
            body: 'UR 希望用户能够通过联邦化的网络运营商选择加入实验性算法。新的运营商加入的是今天为矿工付费的同一套激励体系，而一个矿工可以为任意多个运营商服务。应用将为每位用户提供输入备用运营商域的选项。实验性运营商的接入细节将在计划开放时公布，本页面持续跟踪当前的默认算法与实验方向。安全研究请遵循{vdp}。',
            vdpLabel: '漏洞披露政策'
        },
        audits: {
            title: '审计',
            intro: '对协议及其实现的同行审计。',
            tag: '同行审计',
            items: [
                { id: 'cure53-2026', pending: true, name: '2026 年加密审计', firm: 'Cure53',
                  tag: '已排期', status: '计划于 2026 年 11 月至 12 月进行',
                  scope: '范围：加密设计与实现正确性。',
                  note: '结果将由 UR 和 Cure53 共同发布。' },
                { id: 'masa-l2-2025', name: 'MASA L2 2025', firm: 'Leviathan Security Group',
                  status: '已于 2025 年 5 月完成' }
            ]
        },
        publications: {
            title: '论文',
            comingSoon: 'arXiv——即将发布',
            items: [
                { title: 'Whole Internet Encryption for the whole world' }
            ]
        }
    },

    community: {
        eyebrow: '社区',
        title:   '网络背后的人们。',
        intro:   '协议是开放的。构建并运营它的社区正在壮大。以下是找到他们的地方。',
        items: [
            { tag: '01', title: 'Discord',              body: '关于项目的一般讨论——协议开发、矿工支持与社区。', href: 'https://discord.gg/urnetwork', linkLabel: '加入 Discord' },
            { tag: '02', title: 'Bittensor SN Discord', body: '讨论 Bittensor 相关内容——子网、发行、验证者与质押。', soon: '即将上线' },
            { tag: '03', title: '品牌工具包',  body: 'URnetwork 和连接器标志是美国注册商标。允许协议用户以 "powered by UR"、"with URnetwork" 或类似的组件宣传信息使用品牌工具包。', button: { label: '下载品牌工具包' } }
        ],
        supportersTitle: '支持者',
        partnersTitle:   '合作伙伴'
    }
};
