// 简体中文 — 逐键镜像 en.js 的结构；若在 en.js 新增键，请在此同步添加。
export default {
    nav: {
        whitepaper: '白皮书',
        operators:  '运营商',
        miners:     '矿工',
        validators: '验证者',
        research:   '研究',
        community:  '社区',
        price:      '使用成本',
        docs:       '文档',
        roadmap:    '路线图',
        tagline:    '掌控你的隐私，掌控你的网络。',
        languageMenu: '语言',
        menu:         '菜单',
        closeMenu:    '关闭菜单',
        browseDocs:   '浏览文档',
        apiReference: 'API 参考',
        search:       '搜索',
        ctaAria:    '使用成本——当前网络价格',
        denomAria:  '价格计价单位'
    },

    footer: {
        github:     'GitHub',
        contact:    '联系',
        copyright:  '© 2026 BringYour, Inc.',
        disclaimer: '本网站是一个由参与者社区提供支持的开源实用协议，与销售网络访问权的网络运营商分开运行。',
        languagesAria: '语言',
        terms:      '使用条款',
        privacy:    '隐私政策',
        vdp:        'VDP'
    },

    // 统计标签按原样渲染（无 CSS text-transform），
    // 以保留 α 字形与 GiB 单位的大小写——请直接写成最终显示形式。
    stats: {
        protocolLedger:  '子网账本',
        blockNumber:     '区块编号',
        dataPerBlock:    '每区块总数据量 (GiB)',
        usersPerBlock:   '每区块总用户数',
        totalNetworks:   '网络总数',
        stakedInContract:'合约质押量 (α)',
        demandDeposits:  '每区块需求存款 (α)',
        minerEmissions:  '每区块矿工排放 (α)',
        networkOperators:'网络运营商'
    },

    sim: {
        block: '区块',
        blockProgressAria: '当前区块进度',
        endsAt: '于 {date} 00:00 UTC 结束。距区块结束还有 {d}天 {h}时 {m}分 {s}秒'
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
        rawFile:   '原始价格表 (price.yml)'
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
                body: '矿工同时成为出口与入口。每个矿工自动检测自身环境，并把自己配置为尽其所能——既承载入口流量，也承载出口流量。入口网络复用扩展方的 N 层加密设计，并新增客户端侧的工作，以迭代方式发现按时间解锁的扩展方，使新的入口点不断轮换进入可达范围。'
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
            body:  '适用于本网站及其所记述协议接口的使用条款。完整文件正在定稿，将发布于此。'
        },
        privacy: {
            title: '隐私政策',
            body:  '本网站无需账户，也不收集任何个人信息——所示价格与网络数据均直接来自公开源。完整政策正在定稿，将发布于此。'
        },
        vdp: {
            title: '漏洞披露政策',
            body:  '我们欢迎对协议及本网站进行善意的安全研究。请将漏洞报告至 support@ur.xyz。完整政策——范围、安全港与披露时限——正在定稿，将发布于此。'
        }
    },

    whitepaper: {
        eyebrow: '白皮书',
        title:   '在 Bittensor 上协调的隐私网络。',
        clauses: [
            {
                numeral: 'I.',
                title:   '去中心化的隐私网络',
                body: [
                    'UR 是一个去中心化的隐私网络。它使用多跳路由和分层加密，将用户流量分布到由独立矿工组成的全球网络中，使得任何单一矿工都无法同时看到用户是谁以及在做什么。其传输被设计为与普通 HTTPS 相似——N 层 TLS 加密、SNI 伪装以及流量不可区分性——从而使网络几乎在任何地方都保持可达。',
                    'UR Subnet 通过 Bittensor 上的链上激励来协调这个网络。网络运营商运行服务器；独立矿工承载入口与出口流量；独立验证方则持续遍历由运营商指定的矿工链，以证明实时中转并衡量哪些矿工是最薄弱的环节。这一衡量正是网络付费购买的核心信号。',
                    'Bittensor 的 Yuma Consensus 将验证方的衡量结果转化为代币排放，而 Subtensor EVM 上的一份智能合约负责结算支付。协议是开源的，运行矿工或验证方均无需许可。'
                ]
            },
            {
                numeral: 'II.',
                title:   '角色',
                body: [
                    '网络运营商运行隐私服务器和验证端点。运营商向子网存入资金，为每一条被测量的路径共同签名，并提交一份支付清单，将其奖励在附属于它的各矿工之间进行分配。运营商指定其奖励的去向，但从不持有任何他人的资金。',
                    '矿工是网络的入口与出口。他们运行默认安全的安全模型，阻止已知的恶意 IP，并且只路由加密流量。矿工为一个或多个运营商承载流量，并因其贡献的可路由容量而获得报酬。',
                    '验证方是独立的。每个验证方质押自己的 UR，运行路由验证协议，并按需求与实测质量为每个运营商的池评分。验证方因准确且与共识一致的评分而赚取网络的原生分红——没有任何运营商拥有验证方，且验证方集合是无需许可的。',
                    '子网所有者——BringYour, Inc.——治理结算合约并运营网络的储备。该角色是过渡性的：控制权在初期是中心化但有边界的，并逐步走向去中心化（条款 V）。'
                ]
            },
            {
                numeral: 'III.',
                title:   'UR 代币',
                body: [
                    'UR 是子网的原生代币——存入、排放与结算的记账单位。它是一种用于协调和支付网络资源的实用型代币；它并非旨在代表或提供任何对利润、收入或回报的权利。',
                    '每个周期，新的 UR 由 Bittensor 的 coinbase 排放，并按三种方式分配：',
                    { type: 'table', head: ['流向', '份额', '接收方'], rows: [
                        ['所有者',   '18%', 'BringYour, Inc.——子网所有者与网络储备'],
                        ['矿工',     '41%', '矿工——通过运营商池和顶级矿工槽位'],
                        ['验证方',   '41%', '独立验证方——因准确评分而获得的原生分红']
                    ]},
                    '运营商通过按其真实使用量、以公布的参考费率存入 UR 来为网络提供资金。存入是一种高成本、有收入支撑的真实需求信号——并且是一种信念质押：合约会将每一笔存入转入一个锁定储备，在那里它持续累积且永不被重新分配，从而按真实使用量的比例将 UR 永久性地从流通供应中移除。运营商累积的锁定质押会降低它必须缴纳的费率，因此坚定投入的运营商能够以更少的前期资本加入。',
                    '矿工的报酬来自排放，而非来自存入资金。由于存入资金被锁定而非回收再利用，真实使用会成为对代币持续存在且不断增长的支撑性买盘，而非抛压；与此同时，排放遵循带有减半机制的固定时间表。'
                ]
            },
            {
                numeral: 'IV.',
                title:   '两种赚取方式',
                body: [
                    '单个运营商可以服务远超 100,000 个矿工——远多于一个子网大约 256 个链上槽位——因此网络通过两个并行运行的层级向矿工支付报酬。',
                    '池是入门通道。每个运营商为其所有矿工持有一个链上槽位；验证方按运营商的需求及其实测质量为该池加权，每个矿工凭一份密码学证明直接从结算合约领取其份额。这里没有需要争夺的槽位，也没有需要销毁的东西——它是矿工起步并赚取基线奖励的地方。',
                    '顶级矿工是供给的顶点。大约 200 个最大的集群——按它们实际服务的不同的可路由出口 IP 数量排名，而非按流量大小——各自认领属于自己的链上槽位，并由网络直接支付，支付路径中没有运营商。一个共享的 IP 会在认领它的各集群之间拆分，因此广度无法被重复计算。',
                    '这两个层级是同一场锦标赛：矿工从池中起步，随着其可路由 IP 广度的增长晋级到顶级槽位，若表现下滑则退回池中。一个由治理设定的份额在头部与尾部之间划分排放。',
                    { type: 'list', items: [
                        '池层级——入门通道：加入一个运营商，无需槽位、无注册成本；验证方按需求与质量为池加权；每个矿工在每个结算周期凭证明领取其份额。',
                        '顶级矿工——顶点：~200 个拥有最广可路由 IP 覆盖的集群认领属于自己的槽位，并由网络直接支付，没有运营商、没有池、也没有中间方。'
                    ]}
                ]
            },
            {
                numeral: 'V.',
                title:   '托管、结算与去中心化',
                body: [
                    '结算以七天为一个周期运行。合约在此周期内累计每个池的排放，然后开放领取：矿工凭其运营商已提交的支付清单，直接从合约中提取其 UR。顶级矿工无需结算步骤——链在每个周期原生地向其槽位支付。',
                    '没有人持有他人的资金。结算合约是在途 UR 的唯一托管方，每一笔池支付都是一次直接的链上领取，而顶级矿工则被原生地支付到他们自己的密钥。运营商与所有者从不托管矿工的奖励。',
                    '已赚取的应领款项是最终的。一旦某个结算周期被最终确定，支撑其应领款项的代币便被锁定——任何升级、暂停或管理操作都无法阻止或撤销它们。锁定储备依照同样的标准是单向的：没有任何函数能够将资金从中转出。',
                    '控制权随时间去中心化。网络启动时，合约在所有者多签之后可升级——这是为早期漏洞修复而设的、刻意且有边界的中心化控制——并分阶段加固：对每一次变更施加公开的时间锁，一个仅可暂停的守护者（它能够阻止漏洞攻击，但永远无法转移资金或阻止已最终确定的应领款项），并在适当的时候引入链上治理和一个不可变的结算核心。'
                ]
            }
        ],
        source: { label: '阅读完整白皮书', href: 'https://github.com/urfoundation/sn/' }
    },

    operators: {
        eyebrow: '运营商',
        title:   '运行网络的运营商。',
        intro:   '网络运营商运行隐私服务器和验证端点。运营商作为一种高成本、有收入支撑的真实需求信号向子网存入资金，运行路由验证协议、为每一条被测量的路径共同签名，并提交支付清单，将其奖励在附属于它的各矿工之间进行分配。运营商指定奖励的去向，但从不持有任何他人的资金。',
        cta: '成为网络运营商',
        roles: [
            { tag: '01', title: '运行服务器',       body: '运营商运行隐私服务器和为每一条被测量的路径共同签名的 /verify 端点——它是用户与承载流量的矿工之间的协调层。' },
            { tag: '02', title: '发出真实需求信号', body: '运营商按其真实使用量存入 UR。每一笔存入都是锁定在回购储备中的信念质押——永不被重新分配——因此它是一种高成本、有收入支撑的信号，验证方在为各池评分时会将其计入权重。' },
            { tag: '03', title: '指定支付分配',     body: '每个结算周期，运营商提交一份 Merkle 支付清单，将其池在各矿工之间进行分配。它指定分配方式，但从不进行托管——每个矿工直接从合约领取其份额。' },
            { tag: '04', title: '开始使用',         body: '注册一个网络运营商密钥，运行 /verify 服务器，并存入资金即可开始。在启动阶段，运营商准入由所有者把关。', href: 'https://ur.xyz', linkLabel: '运营商文档' }
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
        intro:   '矿工们竞相在网络上提供尽可能多的 IPv4 /29 与 IPv6 /48 子网——每个子网在任何时刻都可用于入口或出口流量的路由。换句话说，矿工把公共互联网转变为人人都能使用的匿名私有网络。每个矿工同时承载入口与出口流量，运行默认安全的安全模型，仅路由加密流量，并因其贡献的可路由容量而从子网排放中获得报酬。覆盖最多不同可路由子网的集群会被晋升为顶级矿工并赚取更多——一切都在用户空间中、在你已拥有的硬件上运行。',
        cta: '成为矿工',
        roles: [
            { tag: '01', title: '出口',             body: '出口矿工是共享网络的出口 IP。他们拒绝与 CFAA、DMCA 等常见监管方向相冲突的流量，阻止已知的恶意 IP，并且只路由加密流量——从而同时保护矿工与用户。' },
            { tag: '02', title: '入口',             body: '入口矿工（扩展方）创建入口点，改善全球范围的可达性——使用 N 层 TLS、SNI 伪装以及可信转发。每个周期会曝光一个轮换的子集，客户端会自动重试之前有效的入口点。' },
            { tag: '03', title: '实测与匹配',       body: '独立验证方遍历矿工链，以证明实时中转并衡量存活性与质量。矿工按该衡量结果以及速度排名，每个运营商都运行自己的用户与矿工匹配机制。' },
            { tag: '04', title: '从排放中赚取',     body: '矿工的报酬来自子网的排放。在运营商的池内，你凭一份证明领取每次结算中的份额——这是一种低门槛的基线奖励，没有需要争夺的槽位，也没有需要销毁的东西。', href: 'https://docs.ur.io/provider', linkLabel: '矿工文档' },
            { tag: '05', title: '争夺顶级',         body: '矿工在覆盖范围上展开竞争。网络按集群实际服务的不同的可路由出口 IP 数量对其排名——而非按流量大小——覆盖范围最广的大约 200 个集群会被晋升为顶级矿工：拥有属于自己的链上槽位，被原生地支付，赚取更多。共享的 IP 会在认领它们的各集群之间拆分，因此取胜的关键是独特的覆盖范围——扩大你的不同 IP 广度以攀升，若你的覆盖范围下滑，则退回池中。' }
        ]
    },

    validators: {
        eyebrow: '验证方',
        title:   '衡量网络的验证方。',
        intro:   '验证方是独立的。每个验证方质押自己的 UR，运行路由验证协议——持续遍历由运营商指定的矿工链，以证明实时中转并衡量哪些矿工是最薄弱的环节。这一衡量正是网络付费购买的核心信号，验证方因准确地产生这一衡量而赚取原生分红。',
        cta: '成为验证者',
        roles: [
            { tag: '01', title: '遍历路由',       body: '验证方遍历由运营商指定的矿工链，并为每一个已完成的跳收集一份带签名、自证明的记录——这是任何人都可以核查的实时中转的密码学证明。' },
            { tag: '02', title: '为网络评分',     body: '每个周期，验证方按需求与实测质量为每个运营商的池评分，并按可路由 IP 广度对顶级集群排名——全部在提交-揭示（commit-reveal）机制下进行。Bittensor 的 Yuma Consensus 将这些独立的评分转化为矿工排放。' },
            { tag: '03', title: '赚取原生分红',   body: '验证方因准确且与共识一致的评分而赚取 Bittensor 原生分红——这是它们唯一的奖励。没有任何运营商拥有验证方，且验证方集合是无需许可的。' },
            { tag: '04', title: '设计上独立',     body: '由于提交-揭示会隐藏每个验证方的评分直到它们过时，复制他人不会有任何收益——验证方必须实际遍历真实的路径。衡量保持诚实，且没有任何单一方控制它。' }
        ]
    },

    research: {
        eyebrow: '研究',
        title:   '开放算法，开放数据。',
        intro:   '协议是一个去中心化原生、多 IP、多传输的系统，旨在扩展到每个网络运营商数百万矿工的规模。下面的每个算法领域都发布了其源代码，以及（如适用）用于独立分析的匿名数据集。',
        papers: [
            { tag: 'URTRANSPORT1', title: '性能',
              body: '通过 TCP 传输实现的多跳路由，专注于全球可达性。支持 UDP 和点对点流升级，并计划集成 WebRTC、XRay 和 WireGuard。',
              href: 'https://github.com/urnetwork/connect/blob/main/transport.go', linkLabel: 'transport.go' },
            { tag: 'UREXTENDER1', title: '可达性',
              body: 'N 层 TLS 加密（N≥2），每个外层使用自签名证书并将 SNI 伪装到一个中间 IP，转发到另一跳或一个端到端 TLS 连接。任何人都可以在任何域上托管扩展方。',
              href: 'https://github.com/urnetwork/connect/blob/main/net_extender.go', linkLabel: 'net_extender.go' },
            { tag: 'UR-FP2', title: '客户端–矿工匹配',
              body: '采样算法，加载潜在矿工的 10× 随机样本，并按可靠性 × 客户端评分成比例地进行洗牌。Sybil 抵抗由每个 IP 子网的可靠性总和至多为 1 这一约束来保证。',
              href: 'https://github.com/urnetwork/server/blob/main/model/network_client_location_model.go', linkLabel: 'network_client_location_model.go' },
            { tag: 'UR-MULTI', title: '多客户端',
              body: '启发式扫描算法，管理一个矿工窗口。基于传输阈值而非协议分析，将流量锁定到最优的可用层级。',
              href: 'https://github.com/urnetwork/connect/blob/main/ip_remote_multi_client.go', linkLabel: 'ip_remote_multi_client.go' },
            { tag: 'UR-TRANSFER', title: '传输',
              body: '为高延迟环境调优的可靠交付窗口。由于该窗口已提供可靠交付，协议重传被禁用。它按性能排名在各传输通道之间分配流量。',
              href: 'https://github.com/urnetwork/connect/blob/main/transfer.go', linkLabel: 'transfer.go' },
            { tag: 'UR-IP', title: 'IP 出口',
              body: '最小内存占用的 IP 协议栈实现。它假设通过传输层实现可靠的对等通信，因此相应地优化了重传。',
              href: 'https://github.com/urnetwork/connect/blob/main/ip.go', linkLabel: 'ip.go' },
            { tag: 'UR-PSUB2', title: '奖励分配',
              body: '独立验证方按需求与实测质量为每个运营商池评分；Bittensor 的 Yuma Consensus 将这些评分转化为排放。在一个池内，运营商按已服务的合约数与可靠性对其矿工排名，每个周期提交一个 Merkle 支付根，每个矿工直接从结算合约领取其份额。',
              href: 'https://github.com/urnetwork/server/blob/main/model/account_payment_model_plan.go', linkLabel: 'account_payment_model_plan.go' },
            { tag: 'UR-CONTRACT', title: '权限',
              body: '双方之间的传输需要一份带有托管余额和权限集的加密合约。双方都必须以确认的字节计数关闭合约；出现分歧时会触发强制解决流程。',
              href: 'https://github.com/urnetwork/server/blob/main/model/subscription_model.go', linkLabel: 'subscription_model.go' },
            { tag: 'UR-SEC1', title: '安全',
              body: '保护矿工网络的端口阻止列表和 IP 阻止列表。它不执行协议检查——矿工仅路由加密流量。',
              href: 'https://github.com/urnetwork/connect/blob/main/ip_security.go', linkLabel: 'ip_security.go' }
        ],
        competition: {
            eyebrow: '算法竞赛——由 Apex (SN1) 提供支持',
            body: '目标在本月底随 25 发布上线 Apex 算法竞赛；力争在撮合/路由算法上实现可测量的 10–20% 平均延迟改进。',
            cta: '加入研究'
        },
        datasetsLabel: '数据集',
        datasetBlock: '区块 {n}',
        audits: {
            title: '审计',
            intro: '对协议及其实现的同行审计。',
            tag: '同行审计',
            items: ['MASA L2 2026', 'MASA L2 2025']
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
            { tag: '02', title: 'Bittensor SN Discord', body: '讨论 Bittensor 相关内容——子网、排放、验证者与质押。', soon: '即将上线' },
            { tag: '03', title: '品牌工具包',  body: 'URnetwork 和连接器标志是美国注册商标。允许协议用户以 "powered by UR"、"with URnetwork" 或类似的组件宣传信息使用品牌工具包。', button: { label: '下载品牌工具包' } }
        ],
        supportersTitle: '支持者',
        partnersTitle:   '合作伙伴'
    }
};
