const MASKED_TIDES = {
  id: "masked-tides",
  title: "隐潮七港",
  subtitle: "把配方炼成手艺，把身份铺成跨海的路",
  description: "七座雾港靠夜航船与邮契互通。刻式师按配方调制潮墨，再把一个动作刻进身体或器物。普通配墨能赚钱，人们真正羡慕的是入身刻式、独有配方，以及能进入隐市和远海的非凡身份。完整材料、正确步骤与身体承受才把纸上的知识变成力量。玩家可以经营生意，也可把钱和信用投入自己的能力、多重身份或独行远航，任何雇佣与商会责任都由自己选择。",
  genre: "雾海配方奇幻",
  tags: ["配方", "身份", "交易", "远航"],
  sourceLabel: "非官方同人灵感 · 《诡秘之主》成长机制",
  growthGrammar: {
    desire: "长期最诱人的是掌握越来越稀有的刻式、拥有彼此隔离却都能兑现信用的身份，并把个人配方与双港递物能力接入七港乃至远海市场。玩家可以追求财富、隐秘、力量、关系或自由航路，不必成为调查员。",
    conversion: "开局两用公开方包含保鲜凉雾墨与雾息入身墨的完整步骤，现有一包共用原料只够制成其中一批。前者可卖钱，后者可练自己的雾息式：把呼吸热气与衣声收进贴身薄雾，使普通耳目短时难以定位，但不是完全隐形。首次短暂生效只是练习；身体能承受、并在紧张移动中稳定维持数分钟后，才符合一式匠的能力定义。已有完整配方与材料不再另设核验服务前置条件。",
    recognition: "普通好墨换正常货价；亲见玩家在真实行动中运用入身刻式、改良异常配方或组合效果的人，才会按自身利益重新报价、邀请秘密合作或引介非凡材料与另一身份圈层。公开表现可传播，私下成功无人知晓则不会凭空出名。工位和信用是取得个人力量的资源，不把更多验货订单当成身份升格本身。",
    expansion: "已掌握的小配方、验货和普通运输压缩为可选择的资源投入与结算，把重要行动留给刻式入身、复合用法、个人配方和跨港身份。旧配方、伙伴与渠道继续供应现金、伪装和补给，不因换港重置，也不要求在每个新圈层从普通跑腿重新做起。",
  },
  powerSystem: {
    summary: "刻式师按配方把矿盐、植物汁和异兽残质调成潮墨，再把一个清楚动作刻进身体或器物。力量不是知道配方就自动获得：材料要够，步骤要对，首次使用要受控，之后还要在真实场景中安全完成。",
    growth: "完整配方、足量材料、正确操作、身体承受与实际使用共同决定掌握。好墨和交易不等于身体已经升阶；稳定入身并在行动中维持下一阶段核心效果才改变境界。进度记录准备，不是已掌握能力之外的第二道门槛。材料、财富与信用应供养个人刻式、组合与身份，不以更多低额验证服务替代修行。",
    realms: [
      { name: "白纸客", rank: 0, benchmark: "体能接近普通成年人，只会按公开方做简单潮墨，不能把刻式留在身上。", unlock: "可使用公共工位，小批炼制保存、清洁或显色类成品，并靠成品赚钱。" },
      { name: "一式匠", rank: 1, benchmark: "能稳定承载一个刻式，在紧张行动中连续使用数分钟。", unlock: "可独立处理低危材料、试作个人支式；已具备绕开普通耳目、用刻式参与非凡者交换的实力。具体隐市仍需找到入口或获得引荐，不随晋阶自动放行。" },
      { name: "并式师", rank: 2, benchmark: "两个相容刻式可以前后衔接，身体能承受一次配方偏差。", unlock: "可改良低阶配方、制作复合成品，并进入受控材料市与跨港货舱。" },
      { name: "藏面行", rank: 3, benchmark: "能让不同身份分别承载一组习惯、信用与刻式用法，切换时不互相冲乱。", unlock: "可经营两地身份、使用保密邮契，并进入只认履约记录的隐市。" },
      { name: "越潮师", rank: 4, benchmark: "刻式可跨一座港区或整段航程保持，复合动作足以改变一艘船上的胜负。", unlock: "可建立远距中继、独立走危险航线，并与港级商会谈材料与运力。" },
      { name: "百契执印", rank: 5, benchmark: "能同时维护多地契约、身份与远距刻式，一次选择可影响数座港的资源流。", unlock: "可开辟新航网、制定自己的配方许可，并进入雾海外仍在交易的陌生大陆。" },
    ],
  },
  opening: {
    location: "砾钟港旧邮市",
    chapterTitle: "一张能兑现的旧配方",
    goal: "用手里的完整配方与一份原料，选择赚取第一笔本钱还是练成自己的雾息刻式，再把所得投入个人力量、非凡身份或跨港自由",
    situation: "夜潮提前，旧邮市将在三刻后落闸。你是已成年的自由刻式学徒，已买下蒸瓶、两用公开入门方和一包共用原料：足够制一批保鲜凉雾墨卖钱，或一份雾息入身墨练自己的第一个身体刻式。雾息式能收住呼吸热气与衣声，练成后可在夜雾里做普通人不敢做的独行。洛纱愿收成品，也出售更高阶配方；欧岚缺药包保鲜墨，愿给现金或夜航仓位；信使弥策正卖旧中继图筹钱修递物签。三人有各自打算，公共工位仍开放，你不必接生意才能练习。",
    npcMoves: [
      { id: "luo-sha", name: "洛纱", role: "配方掮客", desire: "趁闭市前低价收下尚未出名的配方与成品", nextMove: "先看成色再压价；若玩家拒绝，她会转向别的学徒" },
      { id: "ou-lan", name: "欧岚", role: "邮船记账员", desire: "在开船前保住一箱易坏药包并填满最后仓位", nextMove: "公开悬出现金与夜航仓位两种报酬，不会替玩家选择" },
      { id: "mi-ce", name: "弥策", role: "独行信使", desire: "卖出旧中继图，换钱修好自己的递物签", nextMove: "再等两轮叫价就登船，也可能接受成品或情报交换" },
    ],
    opportunities: [
      "在公共工位完成凉雾墨，立刻得到一份可卖、可保存药物或可用于后续刻式练习的真实成品",
      "用成品通过邮船的现场验货，换现金、夜航仓位或一条以后仍可调用的保密寄送渠道",
      "把同一包原料投入雾息入身墨，依完整步骤练第一项个人刻式；也可购买中继图，用现有本事独行出港",
    ],
    continuity: [
      "蒸瓶、公开方和原料都已由玩家买下，开局就在玩家库存中",
      "中继图属于弥策，药箱属于邮船；看见、检查或听取报价不会改变所有权",
      "公共工位允许自由使用到闭市，玩家没有自动接受委托",
      "首次成品成功后不会立刻自动损坏、被没收或产生同额债务",
      "三名NPC会按自己的时限行动，玩家可以交易、修炼、交友、欺骗、离开或完全不理会他们",
    ],
    milestone: "把完整公开方与现有材料转成一次真实取得：卖成品得到本钱，或安全练成雾息式并用于一次自己选择的实际行动。此后让已成之物成为追求更高刻式、个人配方或另一身份圈层的本钱，不用新的验货任务替代原目标。",
  },
  seed: {
    currencyName: "潮券",
    coins: 22,
    inventory: [
      { id: "folding-retort", name: "便携蒸瓶", description: "你的旧工具，可在公共火台上完成一小批低阶潮墨", qty: 1 },
      { id: "cool-mist-recipe", name: "两用公开入门方", description: "合法完整抄本：凉雾墨用于密封包三日保鲜；雾息入身墨含安全入身与练习步骤，可收住呼吸热气和衣声。两者共用一份原料，只能制成其中一批；照方成墨不等于身体已经掌握刻式", qty: 1 },
      { id: "cool-mist-materials", name: "入门潮墨原料包", description: "你已付清的一份共用原料，只够制一批保鲜凉雾墨或一份雾息入身墨，不能两边重复花用", qty: 1 },
    ],
    relationships: [
      { id: "luo-sha", name: "洛纱", role: "配方掮客", attitude: "陌生" },
      { id: "ou-lan", name: "欧岚", role: "邮船记账员", attitude: "陌生" },
    ],
    capabilities: [
      { id: "basic-batch-brewing", name: "小批配墨", description: "能按完整公开方操作蒸瓶并判断常见的温度与沉淀变化；陌生方仍需逐步验证。", source: "公共工坊训练" },
    ],
    facts: [
      "你已经成年，是可自行签约和出港的自由学徒",
      "旧邮市将在三刻后闭市，公共工位此前仍可使用",
      "手中两份公开入门方均完整，现有原料足够制保鲜凉雾墨或雾息入身墨其中一批，不需先完成核验服务才能练个人刻式",
      "雾息式首次短暂生效只是入门练习；身体稳定承载并在紧张移动中维持数分钟，才达到一式匠的核心能力定义",
      "欧岚悬出的现金与夜航仓位只是报价，尚未属于任何人",
    ],
    promises: [],
  },
  powers: [
    { id: "fault-taster", name: "错味校准", description: "触碰一份正在调制或已经完成的潮墨，你能指出其中最影响成败的一处步骤偏差。", growth: "先用少走弯路的配制建立自己的入身刻式，再从真实成方与实用反馈中找出可替换节点，在相应境界和材料条件下发展个人支式、组合互补效果。校准可换钱或稀缺配方，但卖验证服务不是能力的最终形态。", boundary: "不会直接给出完整配方，也不创造缺失材料；每批只能指出一处主要偏差，强行试毒仍会受伤，识出偏差不等于越阶改方成功。" },
    { id: "layered-role", name: "分面记", description: "你可为两个主动声明的身份各保存一套练熟的声线、手势和工作习惯，切换时立即恢复稳定。", growth: "身份可积累各自的技能用法、信用与联系人，之后能让多个身份分工合作而不抹去早期关系。", boundary: "不生成证件、外貌或他人信任；未练过的专业能力不能伪装成功，被证据揭穿仍会失去信用。" },
    { id: "paired-port-sign", name: "双港签", description: "在两件自己持有的签牌上做成配对后，每日一次，可把一件手掌大小的无生命物从一牌送到另一牌。", growth: "从同一街区递物成长到跨港中继，并能把多个已布置签牌串成个人交易与补给网络。", boundary: "开局距离不超过一里，只能送一件轻物；活物、燃烧物、未持有物和受封锁空间都不能传送。" },
  ],
  language: "zh",
};

const MARTIAL_FRONTIER = {
  id: "martial-frontier",
  title: "裂陆武途",
  subtitle: "把资源吃进身体，把战绩写上公开榜",
  description: "百座武城守在裂陆边缘，城内人人能训练，真正稀缺的是高效补给、可信战绩与进入荒野的资源权。身体基础决定力量上限，公开测试和实战记录决定别人愿意给什么价格、训练条件和准入。玩家可以参加排名，也可以只用资源变强、赚钱、经营关系或持证独行；更高力量先带来更自由的路线，公共责任必须由玩家自己选择。",
  genre: "都市高武拓荒",
  tags: ["武道", "资源", "排名", "拓荒"],
  sourceLabel: "非官方同人灵感 · 《全球高武》成长机制",
  growthGrammar: {
    desire: "长期诱惑是把食物、药材和荒野收获稳定变成更强的身体，在公开榜上证明真实水平，取得更好的价格、训练资源和独立探索权，最终能凭自己的实力选择城市、队伍与裂陆深处的路线。",
    conversion: "资源只有在训练、恢复和实测闭环完成后才转成身体基础或可复用招式；材料也可净化后出售或自用。突破由进度、身体承受和对应动作验证共同决定，不按固定回合赠送，也不因一次高光自动跨阶。",
    recognition: "训练厅、商队和城防按测试记录、现场战绩和稳定交付重新报价。认可可换低价补给、专用器械、优先治疗、材料收购价、低危或高危区通行证及独立接单权，不自动变成职位和义务。",
    expansion: "从城内训练、短工和公开测试扩展到城外采集、跨城挑战、裂隙远征与个人资源地。旧体能、基础动作和低阶材料处理始终是耐力、补给与现金来源，高阶世界不会把早期积累清零。",
  },
  powerSystem: {
    summary: "武者用高营养补给、负重训练、恢复和实战把资源变成可测的身体基础，再学习发力、护体与移动技巧。城市的公开榜记录力量、速度、耐力和真实任务，但榜位只证明结果，不替代境界或个人选择。",
    growth: "一次有效训练可以概括数小时到数日，但必须写清消耗、恢复和哪项身体能力改变。进度满后，还要在本阶对应的测试或真实行动中完成基准，才能突破。公开验证能换资源权；私下突破也成立，只是暂时没有相应社会权限。",
    realms: [
      { name: "锻身段", rank: 0, benchmark: "身体略强于普通成年人，能完成基础负重，但连续爆发会迅速力竭。", unlock: "可使用公共训练器械、购买基础补给，并申请一次城内公开测试。" },
      { name: "通劲段", rank: 1, benchmark: "能把全身力量贯入一击，击裂厚木板并保持短距离冲刺。", unlock: "可学习正式招式、进入低危荒带，并获得基础材料的个人携出权。" },
      { name: "鸣骨段", rank: 2, benchmark: "骨骼和呼吸能承受连续重击，可在楼顶与碎地间高速追逐。", unlock: "可独立对付常见裂兽、参加跨城榜赛并竞买中阶补给。" },
      { name: "披罡段", rank: 3, benchmark: "力量可离体数步形成护层或冲击，普通枪械难以立即阻止行动。", unlock: "可进入中危裂谷、护送商队或单独承包资源点，并取得紧急治疗优先权。" },
      { name: "踏空段", rank: 4, benchmark: "能借连续发力短暂踏空，跨越城墙与断崖，在空中改变一次方向。", unlock: "可走无人航线、追击飞行裂兽，并跨城经营自己的资源与挑战路线。" },
      { name: "镇界段", rank: 5, benchmark: "护体与外放力量可覆盖一条街区，能长时间压制成群低阶裂兽。", unlock: "可占有并守住个人资源地，与武城平等交换通道、补给和情报。" },
      { name: "开域段", rank: 6, benchmark: "个人力量能稳定改变一片裂陆的重压、风向或地形通行条件。", unlock: "可开辟跨裂陆路线、探索异域城市，并决定是否把个人力量投入更大的公共战争。" },
    ],
  },
  opening: {
    location: "折钢城南体测场",
    chapterTitle: "榜单空出最后一格",
    goal: "在城门关闭前完成一种自己选择的真实增长：身体提升、现金收入、公开成绩或一次低危独行收获",
    situation: "傍晚的公开体测临时空出一个名额。你是已经成年的自由武者，手里有自己买下的三日补给、护震绑带和一张低危荒带通行票。训练厅主侯铃希望有人在今晚打出成绩，好保住下一季器械额度；材料商任砺现金收购灰裂沟的热壳根，只认完整根须；独行向导桑拓在场外卖一张旧路线图，天黑前卖不掉就独自出城。你也可以不理任何人，直接训练、出售通行票、休息结交，或凭现有标识独行。",
    npcMoves: [
      { id: "hou-ling", name: "侯铃", role: "南场训练厅主", desire: "用今晚的真实成绩保住下一季器械额度", nextMove: "开放最后一次免费热身并邀请自愿者测试，不会强拉任何人上场" },
      { id: "ren-li", name: "任砺", role: "荒材商", desire: "在商队出发前收齐可炼补给的完整热壳根", nextMove: "按根须完整度公开报价，也愿用训练药餐交换" },
      { id: "sang-tuo", name: "桑拓", role: "独行向导", desire: "卖出旧路线图，凑够修理护甲的钱", nextMove: "在城门关闭前离开；若无人同行，他仍会独自进入灰裂沟" },
    ],
    opportunities: [
      "用自己的补给和公共器械完成一次完整训练，立刻改善一项可测的力量、速度或恢复基础",
      "参加最后一个公开体测，把真实成绩换成奖金、榜位记录和之后可调用的训练厅折扣",
      "使用自己的低危通行票独自进入灰裂沟，采到可自用或出售的热壳根后返回，不必加入任何队伍",
    ],
    continuity: [
      "三日补给、护震绑带和低危通行票均属于玩家，NPC报价不会改变所有权",
      "公开体测只记录实际完成的动作；报名、围观或口头挑战不会产生榜位",
      "低危通行票允许玩家独行，但不会消除地形、体力和裂兽风险",
      "第一次训练、成绩或采集成功后不会自动出现同额罚款、伤病或强制征召来抵消奖励",
      "玩家可以拒绝全部请求，优先修炼、赚钱、交友、出售物品或离城探索",
    ],
    milestone: "前一到三回合应能完成一次身体训练、公开测试或低危采集，并留下数值基础、现金、榜位服务或真实材料；不要把每个结果都改写成新的资格检查。",
  },
  seed: {
    currencyName: "武券",
    coins: 35,
    inventory: [
      { id: "three-day-rations", name: "三日训练补给", description: "你已付清的高营养食物，足够支撑一次强化训练或三日普通活动", qty: 1 },
      { id: "shock-wraps", name: "护震绑带", description: "你的旧护具，可减少一次负重或重击训练对手腕的损伤", qty: 1 },
      { id: "low-risk-pass", name: "低危荒带通行票", description: "登记在你名下的一次性票，可独自进入灰裂沟外圈并携出基础材料", qty: 1 },
    ],
    relationships: [
      { id: "hou-ling", name: "侯铃", role: "南场训练厅主", attitude: "陌生" },
      { id: "ren-li", name: "任砺", role: "荒材商", attitude: "陌生" },
    ],
    capabilities: [
      { id: "standard-body-drill", name: "标准锻身操", description: "能独立完成热身、负重、冲刺和恢复记录；无补给时只能维持普通强度。", source: "城市公共训练课" },
      { id: "read-frontier-markers", name: "辨认荒带标识", description: "能看懂低危区的返程箭头、裂兽警记和天气旗，但不知道未标区域的安全情况。", source: "通行票安全课" },
    ],
    facts: [
      "你已经成年，可以独立报名测试、签交易和使用个人通行票",
      "今晚公开体测只剩一个空位，完成者才会留下榜位记录",
      "灰裂沟外圈允许持票者独行，热壳根可炼成训练补给",
      "侯铃的器械额度和任砺的收购都不是玩家已经接受的任务",
    ],
    promises: [],
  },
  powers: [
    { id: "clean-forge-body", name: "净炉身", description: "每天第一次吸收训练食物或药材时，身体会排出其中最主要的一种杂质，并把有效部分稳定用于恢复或锻炼。", growth: "从净化一份补给成长为处理荒野材料、调配个人训练餐，并把多余净化产物做成可出售资源。", boundary: "不会增加原料总量，也不能替代训练和睡眠；未知剧毒、过量服用或跨阶药材仍会伤身。" },
    { id: "proof-mark", name: "实绩印", description: "一次由中立仪器或公开见证确认的真实动作，会留下可展示的简短成绩印记。", growth: "多个不同成绩可组合成个人战法履历，用来争取价格、训练权限、挑战资格或让对手重新判断。", boundary: "不能伪造成绩、复制他人记录或自动赢得信任；同一简单动作反复刷取不会生成新印记。" },
    { id: "force-trail", name: "力痕回看", description: "触碰地面、墙面或损坏器物时，你能看见一刻钟内最强的一道受力方向。", growth: "从判断脚印、撞击和倒塌方向，成长为在荒野中追索资源搬运痕迹，并把地形受力接入自己的移动与攻击。", boundary: "只显示力量方向和大致强弱，不给身份、目的或完整画面；旧痕、软水和刻意扰乱会失真。" },
  ],
  language: "zh",
};

export const PROGRESSION_WORLDS = [MASKED_TIDES, MARTIAL_FRONTIER];

const TRANSLATIONS = {
  en: {
    "masked-tides": {
      head: {
        title: "The Seven Veiled Ports",
        subtitle: "Turn formulas into craft and identities into sea roads",
        description: "Seven mist ports are linked by night ships and postal contracts. Inscribers brew tidal ink and set an action into body or tool. Ordinary ink earns money; the coveted prizes are embodied powers, personal formulas and identities that open hidden markets and distant seas. Materials, correct steps and bodily endurance turn knowledge into power. Trade can fund that freedom, but employment and guild obligations remain a choice.",
        genre: "Fog-sea formula fantasy",
        tags: ["Formulas", "Identity", "Trade", "Voyages"],
        sourceLabel: "Unofficial fan inspiration · Lord of Mysteries progression mechanics",
      },
      growthGrammar: {
        desire: "The long temptation is to master rarer inscriptions, maintain separate identities with real credit, and connect personal formulas and paired-sign delivery to markets across the seven ports and the outer sea. Wealth, secrecy, power, relationships and free travel are all valid goals.",
        conversion: "The complete booklet offers preserving ink or embodied Mist Breath; one shared pack makes only one batch. Preservation earns money. Mist Breath gathers breath heat and clothing noise into thin mist, obscuring your position without invisibility. A brief flicker is practice; stable use for minutes under pressure establishes Single-Script Artisan. Complete recipes and owned materials need no preceding verification job.",
        recognition: "Normal good ink earns normal prices. People who witness an embodied inscription, a personal formula or a useful combination may change their offers, invite confidential cooperation or introduce unusual materials and another social circle. Private success does not magically become public fame. Workbenches and credit finance personal power; more inspection orders are not themselves a change of identity.",
        expansion: "Mastered small batches, ordinary inspection and familiar shipping can be settled briefly when chosen, leaving major actions for embodied powers, combinations, personal formulas and cross-port identities. Old contacts, formulas and routes remain useful sources of cash, disguise and supplies. A new port does not reset the character to routine errand work.",
      },
      powerSystem: {
        summary: "Inscribers follow formulas to mix mineral salts, plant liquids and creature remnants into tide ink, then bind one clear action into a body or object. Knowing a formula is not enough: materials, correct steps, controlled first use and safe practice all matter.",
        growth: "Complete formulas, enough materials, correct operation, bodily endurance and actual use establish mastery. Producing or selling good ink is not a bodily promotion. Stable embodied use under the next tier’s conditions changes the stage; progress tracks preparation rather than imposing another gate on demonstrated ability. Money and credit support inscriptions and identities rather than endless low-value verification.",
        realms: [
          { name: "Blankhand", benchmark: "Near ordinary adult fitness; can follow simple public formulas but cannot retain an inscription on the body.", unlock: "Use public benches, make small preservation, cleaning or reveal inks, and earn money from finished goods." },
          { name: "Single-Script Artisan", benchmark: "Carries one stable inscription and can use it for several minutes under pressure.", unlock: "Work low-risk materials and try personal variations; possess the ability to evade ordinary senses and trade powers with other practitioners. A specific hidden market still needs a discovered entrance or real introduction, not automatic access on promotion." },
          { name: "Joined-Script Maker", benchmark: "Links two compatible inscriptions and withstands one moderate formula error.", unlock: "Improve low-tier formulas, make compound goods and enter controlled material markets and cross-port holds." },
          { name: "Veiled-Role Walker", benchmark: "Keeps separate habits, credit and inscription use for different identities without mixing them.", unlock: "Operate identities in two places, use discreet courier contracts and enter markets that judge delivery records." },
          { name: "Tide-Crossing Master", benchmark: "Keeps inscriptions active across a port district or voyage; compound actions can decide a shipboard fight.", unlock: "Build distant relays, travel dangerous routes alone and negotiate materials and transport with port guilds." },
          { name: "Keeper of a Hundred Contracts", benchmark: "Maintains contracts, identities and distant inscriptions across several ports; one choice can redirect regional goods.", unlock: "Open a new trade web, license personal formulas and reach unknown continents still trading beyond the mist." },
        ],
      },
      powers: {
        "fault-taster": { name: "Fault Taster", description: "Touch a brewing or finished tide ink to identify the single step error most likely to decide success.", growth: "Use fewer brewing mistakes to establish your own bodily inscription. From real completed formulas and practical results, discover replaceable steps and develop personal variations or complementary combinations when stage and materials permit. Calibration can buy cash or rare formulas, but selling verification is not its final form.", boundary: "Does not reveal a complete formula or create missing ingredients. Each batch exposes only its main flaw; reckless poison testing still hurts, and spotting a flaw does not make an above-tier modification succeed." },
        "layered-role": { name: "Layered Role", description: "Give two declared identities a practiced voice, gestures and work habits, restoring them steadily whenever you switch.", growth: "Each identity can accumulate its own skill uses, credit and contacts, then cooperate with the others without erasing old relationships.", boundary: "It creates no papers, face or trust. Unlearned expertise cannot be faked, and evidence can still destroy an identity's credit." },
        "paired-port-sign": { name: "Paired Port Signs", description: "After pairing two owned sign tokens, move one palm-sized lifeless object between them once each day.", growth: "Extend delivery from one district to cross-port relays and chain placed signs into a personal trade and supply network.", boundary: "Initial range is one mile and one light object. No living, burning, unowned or sealed-space target can pass." },
      },
      opening: {
        head: {
          location: "Old Post Market, Gravelbell Port",
          chapterTitle: "A Formula That Can Pay",
          goal: "Choose whether one owned ingredient pack earns your first capital or becomes your own Mist Breath inscription, then invest the result in personal power, a distinctive identity or freedom across ports.",
          situation: "The night tide arrives early and the Old Post Market closes in three bells. As an adult independent apprentice, you own a retort, a complete two-use public booklet and one ingredient pack: enough for preserving cool-mist ink to sell, or Mist Breath ink to practise your first bodily inscription. Mist Breath conceals warm breath and clothing noise for quiet travel, not invisibility. Losa buys products and sells higher formulas; Olan offers money or cargo space for preserving medicine; Misek sells a relay map to repair his courier sign. The public bench is still open. You need not accept a job before practising.",
        },
        npcMoves: {
          "luo-sha": { name: "Losa", role: "formula broker", desire: "Buy an unknown formula and product cheaply before closing", nextMove: "Inspect the finish and push the price down, then approach another apprentice if refused" },
          "ou-lan": { name: "Olan", role: "mailship accountant", desire: "Preserve a crate of medicine and fill the last berth before departure", nextMove: "Post both cash and night-berth rewards without choosing for anyone" },
          "mi-ce": { name: "Misek", role: "solo courier", desire: "Sell an old relay map to repair a damaged delivery sign", nextMove: "Wait through two more bids, then board; may trade for goods or information" },
        },
        opportunities: [
          "Finish cool-mist ink at the public bench and gain a real product to sell, preserve medicine or use in later inscription practice",
          "Pass the mailship's on-site inspection and trade the product for cash, a night berth or a discreet shipping channel you can call later",
          "Use the same pack for Mist Breath ink and practise a personal inscription from its complete instructions; alternatively buy the relay map and travel with your existing abilities.",
        ],
        continuity: [
          "The retort, public formula and ingredients were bought by the player and begin in player inventory",
          "The relay map belongs to Misek and the medicine crate to the ship; seeing or inspecting them changes no ownership",
          "The public bench is freely usable until closing, and the player has accepted no commission",
          "A first successful product is not automatically damaged, seized or balanced by equal debt",
          "The three NPCs act on their own clocks; the player may trade, train, befriend, deceive, leave or ignore them",
        ],
        milestone: "Turn the complete public recipe and owned materials into a real acquisition: capital from a sale, or safely learnt Mist Breath used in an actual action of the player’s choice. Then let the result fund a higher inscription, a personal formula or another social identity; do not replace that goal with another inspection job.",
      },
      seed: {
        currencyName: "tide notes",
        inventory: {
          "folding-retort": { name: "Folding retort", description: "Your worn tool, able to finish one small low-tier tide-ink batch at a public burner" },
          "cool-mist-recipe": { name: "Two-use public beginner formulas", description: "Complete legal instructions for cool-mist preservation or embodied Mist Breath, including safe binding and practice. Both use the same single ingredient pack: only one batch can be made. Brewing the ink is not yet mastery of the bodily inscription." },
          "cool-mist-materials": { name: "Beginner tidal-ink ingredients", description: "One fully paid shared pack, enough for either one preserving batch or one Mist Breath batch, not both." },
        },
        relationships: {
          "luo-sha": { name: "Losa", role: "formula broker" },
          "ou-lan": { name: "Olan", role: "mailship accountant" },
        },
        capabilities: {
          "basic-batch-brewing": { name: "Small-batch ink mixing", description: "Follow a complete public formula with a retort and read common heat and sediment changes; unknown formulas still need stepwise testing.", source: "public workshop training" },
        },
        facts: [
          "You are an adult freelance apprentice who may sign contracts and leave port",
          "The Old Post Market closes in three bells, and the public bench remains open until then",
          "Both beginner formulas are complete; the owned pack makes one of them, without prior verification work. A brief Mist Breath flicker is practice; stable use for minutes under pressure meets the Single-Script Artisan benchmark.",
          "Olan's cash and night berth are offers and do not belong to anyone yet",
        ],
        promises: [],
      },
    },
    "martial-frontier": {
      head: {
        title: "Martial Road of the Riven Lands",
        subtitle: "Turn resources into body and write results on the public board",
        description: "A hundred martial cities stand along the Riven Lands. Anyone may train, but efficient supplies, trusted records and rights to frontier resources are scarce. Physical foundation sets the ceiling; public tests and field records determine prices, training access and entry. You may chase rank or simply grow stronger, earn, build relationships or explore alone. Greater power first expands freedom, while public duty remains a choice.",
        genre: "Urban martial frontier",
        tags: ["Martial arts", "Resources", "Ranking", "Frontier"],
        sourceLabel: "Unofficial fan inspiration · Global Martial Arts progression mechanics",
      },
      growthGrammar: {
        desire: "The long temptation is to turn food, medicine and frontier harvests into a reliably stronger body, prove real ability on public boards, gain better prices and training, and earn independent exploration rights deep in the Riven Lands.",
        conversion: "Resources become physical foundation or reusable moves only after training, recovery and measurement close the loop. Materials may also be purified for sale or use. Advancement requires progress, bodily tolerance and the matching feat, never a fixed turn count or one lucky highlight.",
        recognition: "Halls, caravans and city guards reprice you through test records, field results and reliable deliveries. Recognition grants cheaper supplies, special equipment, treatment priority, better material prices, zone permits and independent contracts without automatically assigning office or duty.",
        expansion: "Play grows from city training, short jobs and tests to gathering, intercity challenges, rift expeditions and personal resource sites. Early stamina, basic moves and low-tier material handling remain sources of endurance, supplies and cash instead of resetting.",
      },
      powerSystem: {
        summary: "Martial artists turn dense food, weighted training, recovery and combat into measurable physical foundation, then learn force, protection and movement skills. Public boards record strength, speed, endurance and real missions, but rank proves results rather than replacing realm or choice.",
        growth: "A useful session may cover hours or days, but must state resources, recovery and the changed physical trait. At full progress, the matching test or real feat is still required. Private advancement is valid; without public proof, its social permissions simply remain unavailable.",
        realms: [
          { name: "Tempered Body", benchmark: "Slightly stronger than an ordinary adult; handles basic loads but tires quickly after repeated bursts.", unlock: "Use public equipment, buy basic supplies and apply for one city test." },
          { name: "Coursing Force", benchmark: "Drives whole-body force into one strike, cracks thick boards and keeps a short sprint.", unlock: "Learn formal moves, enter low-risk wild belts and carry out basic materials personally." },
          { name: "Resonant Bone", benchmark: "Bones and breath withstand repeated impacts; can chase across roofs and broken ground at speed.", unlock: "Fight common rift beasts alone, enter intercity rankings and bid for middle-grade supplies." },
          { name: "Mantled Force", benchmark: "Projects force several steps as armour or impact; ordinary firearms rarely stop action at once.", unlock: "Enter medium-risk ravines, escort caravans or claim resource work alone, with emergency treatment priority." },
          { name: "Sky Step", benchmark: "Chains bursts into brief air steps, crosses walls and cliffs, and changes direction once in midair.", unlock: "Travel unmapped routes, pursue flying rift beasts and run personal resources and challenges across cities." },
          { name: "Rift Warden", benchmark: "Protection and projected force cover a street and suppress groups of lower rift beasts for hours.", unlock: "Hold a personal resource site and negotiate routes, supplies and intelligence with martial cities." },
          { name: "Domain Opener", benchmark: "Personal force steadily alters pressure, wind or passable terrain across part of the Riven Lands.", unlock: "Open cross-rift routes, explore foreign cities and choose whether to enter larger public wars." },
        ],
      },
      powers: {
        "clean-forge-body": { name: "Clean-Furnace Body", description: "The first training food or medicine you absorb each day sheds its main impurity and feeds recovery or exercise steadily.", growth: "Advance from cleaning one ration to processing frontier materials, designing personal meals and selling surplus purified products.", boundary: "It adds no material and replaces neither training nor sleep. Unknown poison, overdose and above-realm medicine can still harm you." },
        "proof-mark": { name: "Proof Mark", description: "A real feat confirmed by neutral equipment or public witnesses leaves a short record you can display.", growth: "Combine different records into a fighting history that earns prices, training access, challenges or a new assessment from opponents.", boundary: "It cannot fake a feat, copy another record or force trust. Repeating the same easy action creates no new mark." },
        "force-trail": { name: "Force-Trail Recall", description: "Touch ground, wall or broken equipment to see the strongest direction of force from the last fifteen minutes.", growth: "Move from reading steps and impacts to tracking resource transport and joining terrain force to your movement and attacks.", boundary: "It shows direction and rough strength, not identity, purpose or a full scene. Old traces, water and deliberate disruption distort it." },
      },
      opening: {
        head: {
          location: "South Testing Ground, Foldsteel City",
          chapterTitle: "The Last Place on the Board",
          goal: "Before the gate closes, choose and complete one real gain: physical growth, cash, a public result or a low-risk solo harvest",
          situation: "At dusk, one place opens in the public test. You are an adult freelance martial artist carrying your own three-day rations, shock wraps and one low-risk wilderness pass. Hall keeper Hou Ling needs a real result tonight to preserve next season's equipment quota. Material buyer Ren Li pays cash for intact heat-shell roots. Solo guide Sang Tuo sells an old route map and leaves before dark if it remains unsold. You may ignore them, train, sell your pass, rest and meet people, or enter alone under your existing permit.",
        },
        npcMoves: {
          "hou-ling": { name: "Hou Ling", role: "south-ground hall keeper", desire: "Use a real result tonight to keep next season's equipment quota", nextMove: "Open one last free warm-up and invite volunteers without forcing anyone onto the floor" },
          "ren-li": { name: "Ren Li", role: "frontier-material buyer", desire: "Buy enough intact heat-shell roots before the caravan departs", nextMove: "Post prices by root condition and offer training meals as an alternative" },
          "sang-tuo": { name: "Sang Tuo", role: "solo guide", desire: "Sell an old route map and pay for armour repairs", nextMove: "Leave before the gates close and enter Grey Rift alone if nobody joins" },
        },
        opportunities: [
          "Use your own supplies and public equipment for a complete session that immediately improves measurable strength, speed or recovery",
          "Take the final public test and turn a real result into prize money, a board record and a training discount you can use later",
          "Use your low-risk pass to enter Grey Rift alone, gather heat-shell root for personal use or sale, and return without joining a team",
        ],
        continuity: [
          "The rations, shock wraps and low-risk pass belong to the player; NPC offers change no ownership",
          "The public test records only completed actions; registration, watching or a spoken challenge creates no board rank",
          "The low-risk pass allows solo entry but removes no terrain, fatigue or rift-beast danger",
          "A first training, test or harvest win does not trigger an equal fine, injury or forced draft to cancel it",
          "The player may refuse every request and prioritize training, money, friendship, selling goods or exploration",
        ],
        milestone: "Within turns 1 to 3, finish a body session, public test or low-risk harvest and keep physical gain, cash, board services or real material. Do not turn every result into another qualification check.",
      },
      seed: {
        currencyName: "martial notes",
        inventory: {
          "three-day-rations": { name: "Three-day training rations", description: "Fully paid dense food for one hard session or three ordinary days" },
          "shock-wraps": { name: "Shock wraps", description: "Your worn protection, reducing wrist harm from one load or impact session" },
          "low-risk-pass": { name: "Low-risk wild-belt pass", description: "A one-use pass in your name for solo entry to outer Grey Rift and basic material carry-out" },
        },
        relationships: {
          "hou-ling": { name: "Hou Ling", role: "south-ground hall keeper" },
          "ren-li": { name: "Ren Li", role: "frontier-material buyer" },
        },
        capabilities: {
          "standard-body-drill": { name: "Standard body drill", description: "Perform warm-up, loading, sprint and recovery records alone; without supplies, only ordinary intensity is safe.", source: "city public training course" },
          "read-frontier-markers": { name: "Read wild-belt markers", description: "Read return arrows, rift-beast warnings and weather flags in low-risk zones, but not safety in unmarked ground.", source: "pass safety course" },
        },
        facts: [
          "You are an adult who may register tests, sign trades and use a personal pass",
          "Only one public test place remains tonight, and only completion leaves a board record",
          "Pass holders may enter outer Grey Rift alone, and heat-shell root can become training supplies",
          "Hou Ling's equipment quota and Ren Li's purchase offer are not accepted player tasks",
        ],
        promises: [],
      },
    },
  },
  fr: {
    "masked-tides": {
      head: {
        title: "Les Sept Ports voilés",
        subtitle: "Transformer les formules en savoir-faire et les identités en routes maritimes",
        description: "Sept ports brumeux sont reliés par les navires de nuit et les contrats postaux. Les graveurs préparent des encres pour inscrire un geste dans le corps ou un outil. Les encres ordinaires rapportent de l’argent ; les pouvoirs incorporés, les formules personnelles et les identités ouvrant les marchés cachés et le large font véritablement envie. Matières, gestes justes et endurance transforment le savoir en puissance. Le commerce finance cette liberté sans imposer emploi ni devoir de guilde.",
        genre: "Fantaisie de formules maritimes",
        tags: ["Formules", "Identités", "Commerce", "Navigation"],
        sourceLabel: "Inspiration non officielle · mécanismes de progression de Lord of Mysteries",
      },
      growthGrammar: {
        desire: "L'attrait durable consiste à maîtriser des inscriptions rares, maintenir plusieurs identités dotées d'un vrai crédit et relier ses formules et ses signes appariés aux marchés des sept ports puis de la haute mer. Richesse, secret, puissance, liens et liberté restent des buts distincts.",
        conversion: "Le livret complet propose conservation ou Souffle de brume incorporé ; le seul lot permet une préparation. La conservation se vend. Le Souffle retient chaleur et bruit dans une fine brume, sans invisibilité. Un effet fugace reste un exercice ; plusieurs minutes stables sous pression correspondent à l’Artisan d’un signe. Une recette complète et des matières possédées ne nécessitent aucun service de vérification préalable.",
        recognition: "Une bonne encre ordinaire reçoit un prix ordinaire. Les témoins d’un signe incorporé, d’une formule personnelle ou d’une combinaison utile peuvent revoir leur offre, proposer une coopération discrète ou ouvrir un autre cercle de matières et de personnes. Une réussite secrète ne devient pas une célébrité par magie. Établis et crédit financent les pouvoirs ; multiplier les commandes de contrôle ne constitue pas un changement d’identité.",
        expansion: "Les petites préparations maîtrisées, contrôles ordinaires et transports connus se règlent brièvement lorsque le joueur les choisit. Les décisions importantes concernent l’incorporation, les combinaisons, les formules personnelles et les identités entre ports. Les anciens contacts et recettes conservent leur valeur ; changer de port ne ramène pas aux courses d’un débutant.",
      },
      powerSystem: {
        summary: "Les graveurs suivent des formules pour mêler sels minéraux, sucs végétaux et restes de créatures en encre de marée, puis inscrivent une action précise dans un corps ou un objet. Connaître la formule ne suffit pas : matériaux, étapes, premier usage contrôlé et pratique sûre sont nécessaires.",
        growth: "Formule complète, matières suffisantes, gestes justes, endurance et usage réel établissent la maîtrise. Fabriquer ou vendre une bonne encre ne transforme pas le corps. L’usage incorporé stable dans les conditions du palier suivant détermine le rang ; la progression chiffre la préparation, sans bloquer une capacité déjà démontrée. Argent et crédit alimentent les signes et identités plutôt qu’une suite de contrôles bon marché.",
        realms: [
          { name: "Main blanche", benchmark: "Condition proche d'un adulte ordinaire ; suit des formules publiques simples sans garder d'inscription corporelle.", unlock: "Utiliser les établis publics, produire des encres de conservation, nettoyage ou révélation et gagner de l'argent." },
          { name: "Artisan d'un signe", benchmark: "Porte une inscription stable et l'emploie plusieurs minutes sous pression.", unlock: "Traiter des matières peu risquées et essayer des variantes personnelles ; pouvoir déjouer les sens ordinaires et échanger entre pratiquants. Un marché caché précis demande encore une entrée découverte ou une véritable présentation, jamais un accès automatique au nouveau rang." },
          { name: "Faiseur de signes liés", benchmark: "Enchaîne deux inscriptions compatibles et supporte une erreur modérée de formule.", unlock: "Améliorer les petites formules, créer des produits composés et entrer aux marchés contrôlés et dans les cales interportuaires." },
          { name: "Marcheur aux rôles voilés", benchmark: "Sépare habitudes, crédit et usages d'inscription de plusieurs identités sans les confondre.", unlock: "Faire vivre deux identités locales, utiliser des contrats postaux discrets et entrer dans les marchés fondés sur l'historique." },
          { name: "Maître traverse-marée", benchmark: "Maintient ses inscriptions sur un quartier ou une traversée ; des actions composées décident un combat à bord.", unlock: "Créer des relais lointains, prendre seul des routes dangereuses et négocier matières et transport avec les guildes." },
          { name: "Gardien des cent contrats", benchmark: "Maintient contrats, identités et inscriptions lointaines dans plusieurs ports ; un choix détourne les flux régionaux.", unlock: "Ouvrir un réseau commercial, accorder ses propres licences et atteindre les continents qui commercent au-delà de la brume." },
        ],
      },
      powers: {
        "fault-taster": { name: "Goûteur de faute", description: "Touchez une encre en cours ou finie pour repérer l'unique erreur d'étape qui menace le plus sa réussite.", growth: "Éviter les erreurs de préparation pour établir son propre signe corporel. Comparer des formules réelles et leurs usages pour trouver les étapes remplaçables, développer des variantes personnelles ou des combinaisons complémentaires si le rang et les matières le permettent. Le contrôle peut rapporter argent ou formules rares, mais vendre des vérifications n’est pas sa forme finale.", boundary: "Ne révèle pas de formule complète et ne crée pas de matières. Une préparation expose son principal défaut ; tester imprudemment un poison reste dangereux, et reconnaître un défaut ne permet pas de réussir une modification au-dessus de son rang." },
        "layered-role": { name: "Mémoire des rôles", description: "Attribuez à deux identités déclarées une voix, des gestes et des habitudes travaillés, restaurés avec stabilité à chaque changement.", growth: "Chaque identité accumule ses usages, son crédit et ses contacts, puis coopère avec les autres sans effacer les anciens liens.", boundary: "Ne crée ni papiers, ni visage, ni confiance. Une compétence inconnue ne se feint pas et des preuves peuvent ruiner le crédit." },
        "paired-port-sign": { name: "Signes des deux ports", description: "Après avoir apparié deux plaques possédées, transférez une fois par jour un objet inerte tenant dans la paume.", growth: "Étendre l'envoi d'un quartier aux relais interportuaires et relier les plaques posées en réseau personnel de commerce et de ravitaillement.", boundary: "Au départ, une lieue et un objet léger. Aucun être vivant, objet en feu, bien d'autrui ou espace scellé ne passe." },
      },
      opening: {
        head: {
          location: "Vieux marché postal du port de Clochegrève",
          chapterTitle: "Une formule qui peut payer",
          goal: "Choisir entre vendre une préparation pour obtenir du capital et employer le seul lot à apprendre son propre Souffle de brume, puis investir dans sa puissance, son identité ou sa liberté entre les ports.",
          situation: "La marée nocturne arrive tôt et le Vieux marché postal ferme dans trois sonneries. Apprenti adulte indépendant, vous possédez un alambic, un livret public complet à deux usages et un seul lot : encre de conservation à vendre ou encre du Souffle de brume pour votre premier signe corporel. Celui-ci dissimule chaleur du souffle et bruits des vêtements, sans rendre invisible. Losa achète les produits et vend des formules supérieures ; Olan échange argent ou cale contre une encre de conservation ; Misek vend une carte pour réparer son signe de courrier. L’établi reste ouvert, sans devoir accepter un travail avant de vous exercer.",
        },
        npcMoves: {
          "luo-sha": { name: "Losa", role: "courtière en formules", desire: "Acheter à bas prix une formule et un produit encore inconnus avant la fermeture", nextMove: "Examiner la finition et baisser le prix, puis chercher un autre apprenti en cas de refus" },
          "ou-lan": { name: "Olan", role: "comptable du navire postal", desire: "Sauver une caisse de remèdes et remplir la dernière place avant le départ", nextMove: "Afficher deux récompenses, argent ou place nocturne, sans choisir pour autrui" },
          "mi-ce": { name: "Misek", role: "courrier solitaire", desire: "Vendre une vieille carte de relais pour réparer son signe de livraison", nextMove: "Attendre encore deux offres puis embarquer ; il accepte aussi produit ou renseignement" },
        },
        opportunities: [
          "Finir l'encre de brume froide sur l'établi public et obtenir un produit réel à vendre, conserver ou employer lors d'un futur exercice",
          "Réussir le contrôle du navire et échanger le produit contre de l'argent, une place nocturne ou un canal d'envoi discret réutilisable",
          "Employer le même lot pour le Souffle de brume et apprendre un signe personnel avec les instructions complètes ; ou acheter la carte et voyager avec les capacités déjà acquises.",
        ],
        continuity: [
          "L'alambic, la formule publique et les ingrédients ont été achetés par le joueur et commencent dans son inventaire",
          "La carte appartient à Misek et la caisse au navire ; les voir ou les examiner ne change pas leur propriétaire",
          "L'établi public reste libre jusqu'à la fermeture et le joueur n'a accepté aucune mission",
          "Un premier produit réussi n'est pas aussitôt abîmé, saisi ou compensé par une dette égale",
          "Les trois personnages suivent leur propre horaire ; le joueur peut commercer, s'entraîner, mentir, partir ou les ignorer",
        ],
        milestone: "Transformer la recette complète et les matières possédées en un acquis réel : le capital d’une vente ou un Souffle de brume appris sans danger et utilisé dans une action choisie. Cet acquis finance ensuite un signe supérieur, une formule personnelle ou une autre identité sociale ; pas une nouvelle inspection remplaçant le but.",
      },
      seed: {
        currencyName: "billets de marée",
        inventory: {
          "folding-retort": { name: "Alambic pliant", description: "Votre outil usé, capable de finir un petit lot d'encre sur un brûleur public" },
          "cool-mist-recipe": { name: "Formules publiques à deux usages", description: "Deux instructions complètes et légales : conservation par brume froide ou Souffle de brume incorporé, avec étapes de sécurité et d’exercice. Elles partagent un seul lot, donc une seule préparation. Fabriquer l’encre ne signifie pas encore maîtriser le signe corporel." },
          "cool-mist-materials": { name: "Ingrédients d’encre pour débutant", description: "Un seul lot commun entièrement payé, pour une préparation de conservation ou de Souffle de brume, jamais les deux." },
        },
        relationships: {
          "luo-sha": { name: "Losa", role: "courtière en formules" },
          "ou-lan": { name: "Olan", role: "comptable du navire postal" },
        },
        capabilities: {
          "basic-batch-brewing": { name: "Mélange en petit lot", description: "Suivre une formule publique complète avec un alambic et lire chaleur et dépôt courants ; les formules inconnues exigent des essais par étape.", source: "formation d'atelier public" },
        },
        facts: [
          "Vous êtes un apprenti adulte indépendant, libre de signer et de quitter le port",
          "Le Vieux marché ferme dans trois sonneries et l'établi reste ouvert jusque-là",
          "Les deux formules sont complètes ; le lot permet un seul usage, sans service préalable de vérification. Un effet bref du Souffle de brume reste un exercice ; plusieurs minutes stables sous pression répondent au palier d’Artisan d’un signe.",
          "L'argent et la place nocturne d'Olan sont des offres qui n'appartiennent encore à personne",
        ],
        promises: [],
      },
    },
    "martial-frontier": {
      head: {
        title: "La Voie martiale des Terres fendues",
        subtitle: "Transformer les ressources en corps et inscrire les exploits au classement public",
        description: "Cent cités martiales bordent les Terres fendues. Tous peuvent s'entraîner, mais les bons ravitaillements, les résultats fiables et les droits sur les ressources sauvages sont rares. Le corps fixe le plafond ; tests publics et missions déterminent prix, entraînement et accès. Vous pouvez viser le classement ou seulement devenir plus fort, gagner, créer des liens ou explorer seul. La puissance ouvre d'abord la liberté ; le devoir public reste un choix.",
        genre: "Frontière martiale urbaine",
        tags: ["Arts martiaux", "Ressources", "Classement", "Frontière"],
        sourceLabel: "Inspiration non officielle · mécanismes de progression de Global Martial Arts",
      },
      growthGrammar: {
        desire: "L'attrait durable consiste à transformer nourriture, remèdes et récoltes sauvages en un corps plus fort, prouver sa valeur au classement, obtenir de meilleurs prix et entraînements, puis gagner le droit d'explorer seul les profondeurs des Terres fendues.",
        conversion: "Les ressources deviennent fondation physique ou geste réutilisable seulement après entraînement, récupération et mesure. Les matières peuvent aussi être purifiées pour la vente. La promotion exige progrès, tolérance du corps et exploit correspondant, jamais un nombre fixe de tours.",
        recognition: "Salles, caravanes et gardes réévaluent le protagoniste selon tests, résultats de terrain et livraisons fiables. La reconnaissance donne ravitaillement réduit, appareils spéciaux, soins prioritaires, meilleur prix, permis de zone ou contrat autonome, sans imposer de poste.",
        expansion: "Le jeu passe de l'entraînement urbain et des tests à la collecte, aux défis entre cités, aux expéditions et aux ressources personnelles. Endurance, gestes de base et traitement des petites matières restent utiles pour le ravitaillement et l'argent.",
      },
      powerSystem: {
        summary: "Les combattants transforment nourriture dense, charges, récupération et combat en fondation physique mesurable, puis apprennent force, protection et mouvement. Les classements notent puissance, vitesse, endurance et missions réelles, sans remplacer le rang ni le choix personnel.",
        growth: "Une séance utile peut résumer des heures ou des jours, mais précise consommation, récupération et trait amélioré. À progression pleine, il faut encore réussir le test ou l'action du rang. Une promotion privée est valide ; sans preuve publique, les permissions sociales restent simplement fermées.",
        realms: [
          { name: "Corps trempé", benchmark: "Un peu plus fort qu'un adulte ordinaire ; supporte les charges simples mais s'épuise après plusieurs explosions.", unlock: "Utiliser les appareils publics, acheter les vivres de base et demander un test urbain." },
          { name: "Force circulante", benchmark: "Concentre tout le corps dans un coup, fend une planche épaisse et garde un court sprint.", unlock: "Apprendre des gestes formels, entrer en zone sauvage peu risquée et sortir soi-même les matières ordinaires." },
          { name: "Os résonnant", benchmark: "Os et souffle supportent des chocs répétés ; poursuit vite sur toits et sol brisé.", unlock: "Affronter seul les bêtes communes, entrer au classement entre cités et enchérir sur les vivres moyens." },
          { name: "Force en manteau", benchmark: "Projette la force à quelques pas comme protection ou choc ; les armes ordinaires arrêtent rarement l'action aussitôt.", unlock: "Entrer dans les ravins moyens, escorter ou prendre seul une ressource, avec priorité de soins urgents." },
          { name: "Pas du ciel", benchmark: "Enchaîne des poussées pour marcher brièvement dans l'air, franchir murs et falaises et tourner une fois.", unlock: "Prendre les routes sans carte, chasser les bêtes volantes et gérer ses ressources et défis entre cités." },
          { name: "Gardien de faille", benchmark: "Protection et force projetée couvrent une rue et contiennent longtemps des groupes de petites bêtes.", unlock: "Tenir une ressource personnelle et négocier routes, vivres et renseignements avec les cités." },
          { name: "Ouvre-domaine", benchmark: "La force personnelle modifie durablement pression, vent ou terrain praticable sur une partie des Terres fendues.", unlock: "Ouvrir des routes entre failles, explorer des cités étrangères et choisir d'entrer ou non dans les grandes guerres." },
        ],
      },
      powers: {
        "clean-forge-body": { name: "Corps-fourneau pur", description: "La première nourriture ou médecine d'entraînement du jour perd sa principale impureté et nourrit régulièrement récupération ou exercice.", growth: "Passer d'une ration purifiée au traitement des matières sauvages, aux repas personnels et à la vente des surplus propres.", boundary: "N'ajoute aucune matière et ne remplace ni entraînement ni sommeil. Poison inconnu, surdose et remède trop élevé restent dangereux." },
        "proof-mark": { name: "Marque de preuve", description: "Un exploit confirmé par appareil neutre ou témoins publics laisse une courte marque que vous pouvez montrer.", growth: "Combiner plusieurs preuves en historique de combat pour obtenir prix, entraînement, défis ou nouvelle estimation d'un adversaire.", boundary: "Impossible de falsifier, copier autrui ou forcer la confiance. Répéter le même geste facile ne crée aucune marque." },
        "force-trail": { name: "Lecture des traces de force", description: "Touchez sol, mur ou objet brisé pour voir la plus forte direction d'effort des quinze dernières minutes.", growth: "Passer des pas et impacts au suivi des transports de ressources, puis joindre la force du terrain à vos déplacements et attaques.", boundary: "Montre direction et force approximative, pas identité, but ou scène entière. Les vieilles traces, l'eau et le brouillage déforment." },
      },
      opening: {
        head: {
          location: "Terrain d'épreuve sud de Forgepliée",
          chapterTitle: "La dernière place au classement",
          goal: "Avant la fermeture des portes, choisir et obtenir un vrai gain : corps, argent, résultat public ou récolte solitaire peu risquée",
          situation: "Au crépuscule, une place se libère au test public. Vous êtes un combattant adulte indépendant avec vos propres vivres de trois jours, bandages amortisseurs et un permis sauvage peu risqué. Hou Ling veut un vrai résultat ce soir pour conserver les appareils de la prochaine saison. Ren Li paie comptant les racines à coque chaude intactes. Le guide solitaire Sang Tuo vend une vieille carte et part avant la nuit si elle reste invendue. Vous pouvez les ignorer, vous entraîner, vendre le permis, vous reposer ou entrer seul avec votre autorisation.",
        },
        npcMoves: {
          "hou-ling": { name: "Hou Ling", role: "maître de la salle sud", desire: "Obtenir ce soir un vrai résultat pour garder les appareils de la saison prochaine", nextMove: "Ouvrir un dernier échauffement gratuit et inviter des volontaires sans forcer personne" },
          "ren-li": { name: "Ren Li", role: "acheteur de matières sauvages", desire: "Acheter assez de racines intactes avant le départ de la caravane", nextMove: "Afficher les prix selon l'état des racines et proposer des repas d'entraînement" },
          "sang-tuo": { name: "Sang Tuo", role: "guide solitaire", desire: "Vendre une vieille carte pour réparer son armure", nextMove: "Partir avant la fermeture et entrer seul dans la Faille grise si personne ne vient" },
        },
        opportunities: [
          "Employer ses vivres et les appareils publics pour une séance complète améliorant aussitôt force, vitesse ou récupération mesurable",
          "Passer le dernier test public et convertir le résultat en prime, ligne au classement et réduction d'entraînement réutilisable",
          "Employer son permis pour entrer seul dans la Faille grise, récolter une racine à utiliser ou vendre, puis revenir sans équipe",
        ],
        continuity: [
          "Vivres, bandages et permis appartiennent au joueur ; les offres des personnages n'en changent pas la propriété",
          "Le test n'inscrit que les actions achevées ; inscription, observation ou défi oral ne donnent aucun rang",
          "Le permis autorise l'entrée solitaire sans supprimer terrain, fatigue ni danger des bêtes",
          "Un premier succès d'entraînement, de test ou de récolte n'entraîne pas une amende, blessure ou conscription égale",
          "Le joueur peut tout refuser et choisir entraînement, argent, amitié, vente ou exploration",
        ],
        milestone: "Dans les tours 1 à 3, finir une séance physique, un test public ou une récolte peu risquée et garder gain, argent, service de classement ou matière réelle. Ne pas transformer chaque résultat en nouveau contrôle.",
      },
      seed: {
        currencyName: "billets martiaux",
        inventory: {
          "three-day-rations": { name: "Vivres d'entraînement pour trois jours", description: "Nourriture dense déjà payée pour une séance forte ou trois jours ordinaires" },
          "shock-wraps": { name: "Bandages amortisseurs", description: "Votre protection usée réduit une blessure au poignet pendant une séance de charge ou d'impact" },
          "low-risk-pass": { name: "Permis de zone peu risquée", description: "Permis à usage unique à votre nom pour entrer seul dans la Faille grise extérieure et sortir des matières de base" },
        },
        relationships: {
          "hou-ling": { name: "Hou Ling", role: "maître de la salle sud" },
          "ren-li": { name: "Ren Li", role: "acheteur de matières sauvages" },
        },
        capabilities: {
          "standard-body-drill": { name: "Exercice corporel standard", description: "Faire seul échauffement, charge, sprint et relevé de récupération ; sans vivres, seule l'intensité ordinaire reste sûre.", source: "cours public de la cité" },
          "read-frontier-markers": { name: "Lire les balises sauvages", description: "Lire flèches de retour, alertes de bêtes et drapeaux météo en zone basse, mais pas la sécurité des lieux non marqués.", source: "cours de sécurité du permis" },
        },
        facts: [
          "Vous êtes adulte et pouvez vous inscrire, commercer et employer votre permis",
          "Il ne reste qu'une place au test ce soir et seule une réussite laisse une ligne au classement",
          "Les détenteurs d'un permis entrent seuls dans la Faille grise extérieure et la racine devient un aliment d'entraînement",
          "Le quota de Hou Ling et l'offre de Ren Li ne sont pas des missions acceptées par le joueur",
        ],
        promises: [],
      },
    },
  },
  es: {
    "masked-tides": {
      head: {
        title: "Los Siete Puertos Velados",
        subtitle: "Convierte fórmulas en oficio e identidades en rutas marítimas",
        description: "Siete puertos de niebla se unen por barcos nocturnos y contratos postales. Los grabadores preparan tinta para inscribir una acción en el cuerpo o en una herramienta. La tinta corriente da dinero; lo deseado son poderes incorporados, fórmulas propias e identidades que abran mercados ocultos y mares lejanos. Materiales, pasos correctos y resistencia convierten conocimiento en poder. El comercio puede financiar esa libertad sin imponer empleo ni obligaciones gremiales.",
        genre: "Fantasía marítima de fórmulas",
        tags: ["Fórmulas", "Identidades", "Comercio", "Navegación"],
        sourceLabel: "Inspiración no oficial · mecánicas de progreso de Lord of Mysteries",
      },
      growthGrammar: {
        desire: "La gran tentación es dominar inscripciones más raras, sostener identidades separadas con crédito real y conectar fórmulas propias y señales emparejadas con los mercados de los siete puertos y el mar exterior. Riqueza, secreto, poder, vínculos y libertad son metas válidas.",
        conversion: "El cuaderno completo ofrece conservación o Aliento de niebla corporal; el único lote permite una preparación. Conservar da dinero. El Aliento recoge calor y roce en niebla tenue, ocultando la posición sin invisibilidad. Un destello es práctica; varios minutos estables bajo presión cumplen el nivel de Artesano de un signo. La receta completa y materiales propios no requieren trabajos previos de verificación.",
        recognition: "La buena tinta corriente recibe un precio corriente. Quien presencie una inscripción corporal, una fórmula personal o una combinación útil puede cambiar su oferta, proponer cooperación confidencial o presentar materiales y círculos nuevos. Un logro secreto no se convierte mágicamente en fama. El taller y el crédito financian poderes; más pedidos de inspección no equivalen a una identidad superior.",
        expansion: "Las preparaciones dominadas, inspecciones corrientes y transportes conocidos se resuelven brevemente cuando se eligen. Las acciones principales abren poderes corporales, combinaciones, fórmulas propias e identidades entre puertos. Los contactos y recetas anteriores siguen dando dinero, disfraz y suministros; cambiar de puerto no reinicia al personaje como recadero.",
      },
      powerSystem: {
        summary: "Los grabadores siguen fórmulas para mezclar sales minerales, jugos vegetales y restos de criaturas en tinta de marea, y fijan una acción clara en un cuerpo u objeto. Conocer la fórmula no basta: hacen falta materiales, pasos correctos, un primer uso controlado y práctica segura.",
        growth: "Fórmula completa, materiales suficientes, operación correcta, resistencia y uso real establecen dominio. Producir o vender buena tinta no asciende el cuerpo. El uso corporal estable bajo las condiciones del siguiente nivel cambia el rango; el progreso registra preparación sin imponer otra barrera a capacidades demostradas. Dinero y crédito alimentan inscripciones e identidades, no una cadena de verificaciones baratas.",
        realms: [
          { name: "Mano en blanco", benchmark: "Condición cercana a un adulto común; sigue fórmulas públicas simples pero no retiene una inscripción corporal.", unlock: "Usa mesas públicas, fabrica tintas de conservación, limpieza o revelado y gana dinero con el producto." },
          { name: "Artesano de un signo", benchmark: "Porta una inscripción estable y la usa varios minutos bajo presión.", unlock: "Trabajar materiales de bajo riesgo y probar variantes propias; poder eludir sentidos ordinarios e intercambiar poderes con otros practicantes. Un mercado oculto concreto aún exige encontrar su entrada o una presentación real, no acceso automático al ascender." },
          { name: "Creador de signos unidos", benchmark: "Encadena dos inscripciones compatibles y soporta un error moderado de fórmula.", unlock: "Mejora fórmulas menores, crea productos compuestos y entra en mercados controlados y bodegas entre puertos." },
          { name: "Caminante de papeles velados", benchmark: "Separa hábitos, crédito y usos de inscripción de varias identidades sin mezclarlos.", unlock: "Mantiene dos identidades locales, usa contratos postales discretos y entra en mercados que juzgan el historial." },
          { name: "Maestro cruza-mareas", benchmark: "Mantiene inscripciones por un distrito o viaje; las acciones compuestas deciden una lucha a bordo.", unlock: "Crea relevos lejanos, recorre rutas peligrosas solo y negocia materiales y transporte con gremios portuarios." },
          { name: "Guardián de cien contratos", benchmark: "Mantiene contratos, identidades e inscripciones lejanas en varios puertos; una decisión cambia flujos regionales.", unlock: "Abre una red comercial, licencia fórmulas propias y alcanza continentes que comercian más allá de la niebla." },
        ],
      },
      powers: {
        "fault-taster": { name: "Catador de fallos", description: "Toca una tinta en proceso o terminada para señalar el único error de paso que más amenaza el resultado.", growth: "Reducir errores de preparación para establecer tu propia inscripción corporal. A partir de fórmulas reales y resultados prácticos, encontrar pasos sustituibles y crear variantes personales o combinaciones complementarias cuando rango y materiales lo permitan. Calibrar puede conseguir dinero o fórmulas raras; vender verificaciones no es su forma final.", boundary: "No revela fórmulas completas ni crea ingredientes. Cada lote muestra solo su defecto principal; probar venenos imprudentemente sigue dañando y detectar un defecto no garantiza modificar una fórmula por encima del propio nivel." },
        "layered-role": { name: "Memoria de papeles", description: "Asigna a dos identidades declaradas una voz, gestos y hábitos practicados, recuperados con firmeza al cambiar.", growth: "Cada identidad acumula usos, crédito y contactos propios, y luego coopera con las demás sin borrar relaciones anteriores.", boundary: "No crea documentos, rostro ni confianza. No simula pericia no aprendida y las pruebas todavía pueden destruir el crédito." },
        "paired-port-sign": { name: "Señales de dos puertos", description: "Tras emparejar dos placas propias, mueve una vez al día un objeto inerte del tamaño de la palma entre ellas.", growth: "Amplía el envío de un barrio a relevos entre puertos y enlaza placas colocadas en una red personal de comercio y suministro.", boundary: "Al inicio alcanza una milla y un objeto ligero. No pasan seres vivos, fuego, bienes ajenos ni espacios sellados." },
      },
      opening: {
        head: {
          location: "Viejo mercado postal de Puerto Campanagrava",
          chapterTitle: "Una fórmula que puede pagar",
          goal: "Elegir entre usar el único lote para ganar capital o para aprender tu propio Aliento de niebla, e invertir el resultado en poder, identidad o libertad entre puertos.",
          situation: "La marea nocturna se adelanta y el Viejo mercado postal cierra en tres campanadas. Como aprendiz adulto independiente tienes un alambique, un cuaderno público completo de dos usos y un solo lote: tinta conservante para vender o tinta de Aliento de niebla para practicar tu primera inscripción corporal. Esta oculta calor del aliento y ruido de ropa, no da invisibilidad. Losa compra productos y vende fórmulas superiores; Olan ofrece dinero o bodega por conservación; Misek vende un mapa para reparar su signo de mensajero. La mesa pública sigue libre, sin aceptar encargos para poder practicar.",
        },
        npcMoves: {
          "luo-sha": { name: "Losa", role: "corredora de fórmulas", desire: "Comprar barata una fórmula y un producto aún desconocidos antes del cierre", nextMove: "Examinar el acabado y bajar el precio, luego buscar otro aprendiz si recibe una negativa" },
          "ou-lan": { name: "Olan", role: "contable del barco postal", desire: "Salvar una caja de remedios y llenar el último espacio antes de partir", nextMove: "Publicar dos pagos, dinero o bodega nocturna, sin decidir por nadie" },
          "mi-ce": { name: "Misek", role: "correo solitario", desire: "Vender un viejo mapa de relevos para reparar su señal de entrega", nextMove: "Esperar dos ofertas más y embarcar; también puede cambiarlo por producto o información" },
        },
        opportunities: [
          "Termina tinta de niebla fría en la mesa pública y obtén un producto real para vender, conservar medicinas o practicar después",
          "Supera la inspección del barco y cambia el producto por dinero, una plaza nocturna o un canal discreto reutilizable",
          "Usar el mismo lote para Aliento de niebla y aprender una inscripción personal siguiendo todos sus pasos; o comprar el mapa y viajar con tus habilidades actuales.",
        ],
        continuity: [
          "El alambique, la fórmula pública y los ingredientes fueron comprados por el jugador y empiezan en su inventario",
          "El mapa pertenece a Misek y la caja al barco; verlos o inspeccionarlos no cambia su dueño",
          "La mesa pública es libre hasta el cierre y el jugador no ha aceptado ningún encargo",
          "Un primer producto exitoso no se daña, confisca ni compensa de inmediato con una deuda igual",
          "Los tres personajes siguen sus propios plazos; el jugador puede comerciar, entrenar, mentir, partir o ignorarlos",
        ],
        milestone: "Convertir la receta completa y los materiales propios en una adquisición real: capital de una venta o Aliento de niebla aprendido con seguridad y usado en una acción elegida. El resultado financia una inscripción superior, una fórmula propia u otra identidad social; no sustituir esa meta por otra inspección.",
      },
      seed: {
        currencyName: "billetes de marea",
        inventory: {
          "folding-retort": { name: "Alambique plegable", description: "Tu herramienta gastada, capaz de terminar un pequeño lote de tinta en un quemador público" },
          "cool-mist-recipe": { name: "Fórmulas públicas de dos usos", description: "Instrucciones legales completas para conservar con niebla fría o incorporar Aliento de niebla, con pasos de seguridad y práctica. Comparten el único lote: solo una preparación. Fabricar tinta no equivale a dominar la inscripción corporal." },
          "cool-mist-materials": { name: "Ingredientes de tinta para principiante", description: "Un lote común ya pagado, suficiente para conservar o para Aliento de niebla, nunca ambos." },
        },
        relationships: {
          "luo-sha": { name: "Losa", role: "corredora de fórmulas" },
          "ou-lan": { name: "Olan", role: "contable del barco postal" },
        },
        capabilities: {
          "basic-batch-brewing": { name: "Mezcla en lote pequeño", description: "Sigue una fórmula pública completa con alambique y lee cambios comunes de calor y sedimento; las fórmulas desconocidas exigen pruebas por pasos.", source: "formación del taller público" },
        },
        facts: [
          "Eres un aprendiz adulto independiente que puede firmar y salir del puerto",
          "El Viejo mercado cierra en tres campanadas y la mesa pública sigue abierta hasta entonces",
          "Ambas fórmulas son completas; el lote permite elegir una, sin servicios previos de verificación. Un destello de Aliento de niebla es práctica; varios minutos estables bajo presión cumplen el nivel de Artesano de un signo.",
          "El dinero y la plaza nocturna de Olan son ofertas que todavía no pertenecen a nadie",
        ],
        promises: [],
      },
    },
    "martial-frontier": {
      head: {
        title: "La Senda marcial de las Tierras Hendidas",
        subtitle: "Convierte recursos en cuerpo y escribe logros en la tabla pública",
        description: "Cien ciudades marciales bordean las Tierras Hendidas. Todos pueden entrenar, pero escasean los buenos suministros, los logros fiables y los derechos sobre recursos salvajes. El cuerpo fija el techo; pruebas públicas y misiones deciden precios, entrenamiento y acceso. Puedes buscar rango o solo fuerza, dinero, relaciones o exploración en solitario. El poder primero amplía la libertad; el deber público sigue siendo una elección.",
        genre: "Frontera marcial urbana",
        tags: ["Artes marciales", "Recursos", "Clasificación", "Frontera"],
        sourceLabel: "Inspiración no oficial · mecánicas de progreso de Global Martial Arts",
      },
      growthGrammar: {
        desire: "La tentación duradera es convertir comida, medicinas y cosechas salvajes en un cuerpo cada vez más fuerte, probar la capacidad en tablas públicas, lograr mejores precios y entrenamiento y ganar derecho a explorar en solitario las profundidades hendidas.",
        conversion: "Los recursos se vuelven base física o movimiento reutilizable solo cuando entrenamiento, recuperación y medida cierran el ciclo. Los materiales también pueden purificarse para vender. El ascenso exige progreso, tolerancia corporal y la hazaña correspondiente, nunca turnos fijos.",
        recognition: "Salas, caravanas y guardias te revalúan por pruebas, resultados de campo y entregas estables. El reconocimiento da suministros baratos, equipo especial, atención prioritaria, mejor precio, permisos de zona o contratos libres, sin imponer un cargo.",
        expansion: "El juego pasa del entrenamiento urbano y las pruebas a la recolección, los desafíos entre ciudades, las expediciones y los recursos propios. La resistencia, los movimientos básicos y el trato de materiales menores siguen dando suministros y dinero.",
      },
      powerSystem: {
        summary: "Los luchadores convierten comida densa, cargas, recuperación y combate en una base corporal medible, y luego aprenden fuerza, defensa y movimiento. Las tablas registran fuerza, velocidad, resistencia y misiones reales, pero no sustituyen el rango ni la elección personal.",
        growth: "Una sesión útil puede resumir horas o días, pero declara consumo, recuperación y rasgo mejorado. Con progreso lleno, aún hay que superar la prueba o acción del rango. Un ascenso privado vale; sin prueba pública, los permisos sociales permanecen cerrados.",
        realms: [
          { name: "Cuerpo templado", benchmark: "Algo más fuerte que un adulto común; soporta cargas simples pero se agota tras varias explosiones.", unlock: "Usa equipo público, compra suministros básicos y solicita una prueba urbana." },
          { name: "Fuerza circulante", benchmark: "Lleva la fuerza de todo el cuerpo a un golpe, rompe madera gruesa y mantiene un sprint corto.", unlock: "Aprende movimientos formales, entra en zonas de bajo riesgo y extrae materiales básicos por cuenta propia." },
          { name: "Hueso resonante", benchmark: "Huesos y respiración resisten golpes repetidos; persigue rápido por tejados y terreno roto.", unlock: "Combate bestias comunes solo, entra en tablas entre ciudades y puja por suministros medios." },
          { name: "Fuerza envolvente", benchmark: "Proyecta fuerza varios pasos como defensa o impacto; las armas ordinarias rara vez detienen la acción al instante.", unlock: "Entra en barrancos medios, escolta o toma recursos solo y obtiene prioridad de atención urgente." },
          { name: "Paso celeste", benchmark: "Encadena impulsos para pisar el aire, cruza muros y precipicios y cambia una vez de dirección.", unlock: "Recorre rutas sin mapa, caza bestias voladoras y gestiona recursos y desafíos propios entre ciudades." },
          { name: "Guardián de la grieta", benchmark: "Defensa y fuerza proyectada cubren una calle y dominan durante horas grupos de bestias menores.", unlock: "Mantiene un recurso propio y negocia rutas, suministros e información con ciudades marciales." },
          { name: "Abridor de dominio", benchmark: "La fuerza personal altera de forma estable presión, viento o terreno transitable en parte de las Tierras Hendidas.", unlock: "Abre rutas entre grietas, explora ciudades extranjeras y elige si participa en guerras públicas mayores." },
        ],
      },
      powers: {
        "clean-forge-body": { name: "Cuerpo de horno limpio", description: "La primera comida o medicina de entrenamiento del día pierde su impureza principal y alimenta de forma estable la recuperación o el ejercicio.", growth: "Pasa de limpiar una ración a procesar materiales salvajes, crear comidas propias y vender excedentes purificados.", boundary: "No añade materia ni sustituye entrenamiento o sueño. Veneno desconocido, sobredosis y medicina superior aún dañan." },
        "proof-mark": { name: "Marca de prueba", description: "Una hazaña real confirmada por equipo neutral o testigos públicos deja un registro breve que puedes mostrar.", growth: "Combina registros distintos en un historial de combate que consigue precios, entrenamiento, retos o una nueva valoración rival.", boundary: "No falsifica, copia ni obliga a confiar. Repetir la misma acción fácil no crea una marca nueva." },
        "force-trail": { name: "Lectura de huellas de fuerza", description: "Toca suelo, pared u objeto roto para ver la dirección de fuerza más intensa de los últimos quince minutos.", growth: "Pasa de leer pasos e impactos a rastrear transporte de recursos y unir la fuerza del terreno a movimiento y ataque.", boundary: "Muestra dirección y fuerza aproximada, no identidad, intención ni escena completa. Huellas viejas, agua y sabotaje distorsionan." },
      },
      opening: {
        head: {
          location: "Campo de pruebas sur de Ciudad Acero Plegado",
          chapterTitle: "El último lugar de la tabla",
          goal: "Antes del cierre, elige y completa una ganancia real: cuerpo, dinero, resultado público o cosecha solitaria de bajo riesgo",
          situation: "Al atardecer queda libre un lugar en la prueba pública. Eres un luchador adulto independiente con tus propias raciones de tres días, vendas contra impactos y un permiso salvaje de bajo riesgo. Hou Ling necesita un resultado real para conservar el equipo de la próxima temporada. Ren Li paga por raíces de caparazón caliente intactas. El guía solitario Sang Tuo vende un mapa viejo y parte antes de la noche si nadie compra. Puedes ignorarlos, entrenar, vender el permiso, descansar o entrar solo con tu autorización.",
        },
        npcMoves: {
          "hou-ling": { name: "Hou Ling", role: "dueño de la sala sur", desire: "Lograr un resultado real esta noche y conservar el equipo de la próxima temporada", nextMove: "Abrir un último calentamiento gratis e invitar voluntarios sin obligar a nadie" },
          "ren-li": { name: "Ren Li", role: "comprador de materiales salvajes", desire: "Comprar suficientes raíces intactas antes de que salga la caravana", nextMove: "Publicar precios según el estado y ofrecer comidas de entrenamiento como alternativa" },
          "sang-tuo": { name: "Sang Tuo", role: "guía solitario", desire: "Vender un mapa viejo para reparar su armadura", nextMove: "Salir antes del cierre y entrar solo en la Grieta Gris si nadie se une" },
        },
        opportunities: [
          "Usa tus suministros y el equipo público para una sesión completa que mejore fuerza, velocidad o recuperación medible",
          "Realiza la última prueba y convierte el resultado en premio, registro de tabla y descuento de entrenamiento reutilizable",
          "Usa tu permiso para entrar solo en la Grieta Gris, recoge una raíz para usar o vender y regresa sin unirte a un equipo",
        ],
        continuity: [
          "Las raciones, vendas y permiso pertenecen al jugador; las ofertas de los personajes no cambian la propiedad",
          "La prueba registra solo acciones terminadas; inscribirse, mirar o desafiar de palabra no da rango",
          "El permiso autoriza la entrada en solitario, pero no elimina terreno, fatiga ni bestias",
          "El primer éxito de entrenamiento, prueba o cosecha no activa una multa, lesión o reclutamiento equivalente",
          "El jugador puede rechazar todo y elegir entrenamiento, dinero, amistad, venta o exploración",
        ],
        milestone: "En los turnos 1 a 3, termina una sesión corporal, prueba pública o cosecha de bajo riesgo y conserva mejora, dinero, servicio de tabla o material real. No conviertas cada resultado en otro control.",
      },
      seed: {
        currencyName: "billetes marciales",
        inventory: {
          "three-day-rations": { name: "Raciones de entrenamiento para tres días", description: "Comida densa ya pagada para una sesión fuerte o tres días normales" },
          "shock-wraps": { name: "Vendas contra impactos", description: "Tu protección gastada reduce una lesión de muñeca durante una sesión de carga o golpes" },
          "low-risk-pass": { name: "Permiso de zona de bajo riesgo", description: "Permiso de un uso a tu nombre para entrar solo en la Grieta Gris exterior y sacar materiales básicos" },
        },
        relationships: {
          "hou-ling": { name: "Hou Ling", role: "dueño de la sala sur" },
          "ren-li": { name: "Ren Li", role: "comprador de materiales salvajes" },
        },
        capabilities: {
          "standard-body-drill": { name: "Rutina corporal estándar", description: "Realiza calentamiento, carga, sprint y registro de recuperación solo; sin suministros, solo es segura la intensidad normal.", source: "curso público de la ciudad" },
          "read-frontier-markers": { name: "Leer señales salvajes", description: "Lee flechas de regreso, alertas de bestias y banderas del tiempo en zonas bajas, pero no la seguridad de terrenos sin marcar.", source: "curso de seguridad del permiso" },
        },
        facts: [
          "Eres adulto y puedes registrar pruebas, firmar tratos y usar tu permiso",
          "Solo queda un lugar en la prueba de esta noche y solo terminar deja un registro",
          "Los titulares pueden entrar solos en la Grieta Gris exterior y la raíz sirve para preparar alimento de entrenamiento",
          "La cuota de Hou Ling y la oferta de Ren Li no son tareas aceptadas por el jugador",
        ],
        promises: [],
      },
    },
  },
  ar: {
    "masked-tides": {
      head: {
        title: "الموانئ السبعة المحجوبة",
        subtitle: "حوّل الوصفات إلى حرفة والهويات إلى طرق بحرية",
        description: "تربط سفن الليل وعقود البريد سبعة موانئ ضبابية. يصنع النقاشون حبرًا يثبت فعلًا في الجسد أو الأداة. الحبر العادي يربح المال، لكن المطمع الحقيقي هو القدرات الجسدية والوصفات الخاصة والهويات التي تفتح الأسواق الخفية والبحار البعيدة. المواد والخطوات الصحيحة وتحمل الجسد تحول المعرفة إلى قوة. قد تمول التجارة هذه الحرية، ولا تفرض وظيفة أو واجب نقابة.",
        genre: "فانتازيا الوصفات البحرية",
        tags: ["وصفات", "هويات", "تجارة", "إبحار"],
        sourceLabel: "إلهام غير رسمي · آليات التطور في Lord of Mysteries",
      },
      growthGrammar: {
        desire: "الإغراء البعيد هو إتقان نقوش أندر، وحفظ هويات منفصلة لكل منها ائتمان حقيقي، وربط الوصفات الشخصية وعلامات النقل المزدوجة بأسواق الموانئ السبعة وما وراء البحر. الثراء والسر والقوة والعلاقات وحرية السفر أهداف مستقلة.",
        conversion: "يحتوي الكتيب العام الكامل على حبر الضباب البارد للحفظ أو حبر نَفَس الضباب لتثبيته في الجسد. الحزمة المشتركة الواحدة تكفي أحدهما فقط. الأول يباع، والثاني يعلم نقشًا يجمع حرارة النفس وحفيف الثياب في ضباب رقيق يصعب معه تحديد الموضع بالحواس العادية، دون اختفاء كامل. الأثر الوجيز تدريب؛ والثبات عدة دقائق تحت الضغط يحقق معيار صانع النقش الواحد. لا تلزم خدمة تحقق سابقة عند امتلاك الوصفة الكاملة والمواد.",
        recognition: "الحبر العادي الجيد ينال ثمنًا عاديًا. من يشهد استعمال نقش جسدي أو وصفة شخصية أو تركيب نافع قد يغير عرضه أو يقترح تعاونًا سريًا أو يفتح دائرة مواد ومعارف جديدة. الإنجاز الخفي لا يصنع شهرة سحرية. المنضدة والائتمان يمولان القوة؛ وزيادة طلبات الفحص ليست تحولًا في الهوية.",
        expansion: "تحسم الدفعات المتقنة والفحوص العادية والنقل المألوف باختصار عندما يختارها اللاعب، وتترك الأفعال المهمة للنقوش الجسدية وتركيب القدرات والوصفات الخاصة وهويات الموانئ. تظل المعارف والوصفات القديمة نافعة للمال والتمويه والمؤن؛ والانتقال إلى ميناء جديد لا يعيد الشخصية إلى أعمال المبتدئ.",
      },
      powerSystem: {
        summary: "يتبع النقاشون وصفات تمزج الأملاح المعدنية وعصارات النبات وبقايا المخلوقات في حبر المد، ثم يثبتون فعلًا واضحًا في جسد أو غرض. معرفة الوصفة لا تكفي؛ لا بد من المواد والخطوات الصحيحة وأول استعمال مضبوط وتدريب آمن.",
        growth: "الوصفة الكاملة والمواد الكافية والعمل الصحيح وتحمل الجسد والاستعمال الحقيقي تثبت الإتقان. بيع حبر جيد ليس ترقية جسدية. الثبات في شروط المرحلة التالية يحدد المرتبة؛ والتقدم يسجل الاستعداد ولا يضع بوابة أخرى أمام قدرة مثبتة. المال والائتمان يغذيان النقوش والهويات بدل سلسلة خدمات تحقق زهيدة.",
        realms: [
          { name: "صاحب اليد البيضاء", benchmark: "لياقة قريبة من بالغ عادي؛ يتبع وصفات عامة بسيطة لكنه لا يحتفظ بنقش على الجسد.", unlock: "يستعمل المناضد العامة ويصنع أحبار الحفظ والتنظيف والكشف ويكسب المال من المنتج." },
          { name: "صانع النقش الواحد", benchmark: "يحمل نقشًا ثابتًا ويستعمله عدة دقائق تحت الضغط.", unlock: "معالجة المواد قليلة الخطر وتجربة فروع شخصية، والقدرة على تفادي الحواس العادية وتبادل القوى مع الممارسين. السوق الخفي المعين يحتاج مدخلًا مكتشفًا أو تعريفًا حقيقيًا، ولا يفتح تلقائيًا مع الترقي." },
          { name: "صانع النقوش المتصلة", benchmark: "يصل بين نقشين متوافقين ويتحمل خطأ متوسطًا في الوصفة.", unlock: "يحسن الوصفات الدنيا ويصنع منتجات مركبة ويدخل أسواق المواد المضبوطة وعنابر النقل بين الموانئ." },
          { name: "سائر الأدوار المحجوبة", benchmark: "يفصل عادات وائتمان واستعمالات كل هوية من دون أن تختلط.", unlock: "يدير هويتين في مكانين ويستعمل عقود بريد سرية ويدخل أسواقًا تحكم بسجل الوفاء." },
          { name: "سيد عبور المد", benchmark: "يحفظ النقوش عبر حي كامل أو رحلة بحرية، وتستطيع الأفعال المركبة حسم قتال على سفينة.", unlock: "يبني نقاط ترحيل بعيدة ويسلك طرقًا خطرة وحده ويفاوض نقابات الموانئ على المواد والنقل." },
          { name: "حافظ المئة عقد", benchmark: "يحفظ عقودًا وهويات ونقوشًا بعيدة في عدة موانئ، وقد يغير قرار واحد تدفق بضائع الإقليم.", unlock: "يفتح شبكة تجارة جديدة ويرخص وصفاته ويصل إلى قارات تتاجر خلف الضباب." },
        ],
      },
      powers: {
        "fault-taster": { name: "متذوق الخلل", description: "المس حبرًا قيد الخلط أو مكتملًا لتحدد خطأ الخطوة الأشد تأثيرًا في نجاحه.", growth: "قلل أخطاء التحضير لبناء نقش جسدي خاص. من الوصفات المكتملة والنتائج الفعلية تعرف الخطوات القابلة للاستبدال، وطور فروعًا شخصية أو تركيبات متكاملة حين تسمح المرتبة والمواد. قد تكسب المعايرة مالًا أو وصفة نادرة، لكن بيع خدمات التحقق ليس صورتها النهائية.", boundary: "لا يكشف وصفة كاملة ولا يصنع مواد ناقصة. تكشف كل دفعة خللها الرئيسي وحده؛ واختبار السم بتهور يضر، ومعرفة الخلل لا تضمن نجاح تعديل يفوق المرتبة." },
        "layered-role": { name: "ذاكرة الأدوار", description: "امنح هويتين معلنتين صوتًا وإشارات وعادات عمل مدربة، واستعدها بثبات عند التبديل.", growth: "تجمع كل هوية استعمالاتها وائتمانها واتصالاتها، ثم تتعاون الهويات من دون محو العلاقات القديمة.", boundary: "لا تصنع وثائق أو وجهًا أو ثقة. لا يمكن تمثيل خبرة لم تتعلمها، وقد تدمر الأدلة ائتمان الهوية." },
        "paired-port-sign": { name: "علامتا الميناء", description: "بعد ربط لوحين تملكهما، انقل مرة كل يوم غرضًا جامدًا بحجم الكف من أحدهما إلى الآخر.", growth: "يتسع النقل من حي واحد إلى ترحيل بين الموانئ، ثم تتصل العلامات الموضوعة في شبكة تجارة ومؤن شخصية.", boundary: "المدى الأول ميل واحد وغرض خفيف واحد. لا يمر حي أو مشتعل أو مملوك لغيرك أو هدف داخل مكان مختوم." },
      },
      opening: {
        head: {
          location: "سوق البريد القديم في ميناء جرس الحصى",
          chapterTitle: "وصفة تستطيع أن تدفع ثمنها",
          goal: "اختر بين استعمال الحزمة الوحيدة لكسب رأس مال أو لتعلم نقش نَفَس الضباب الخاص بك، ثم استثمر الحصيلة في القوة أو الهوية أو حرية التنقل بين الموانئ.",
          situation: "جاء مد الليل مبكرًا ويغلق سوق البريد القديم بعد ثلاث دقات. أنت متدرب بالغ مستقل تملك مقطرًا وكتيبًا عامًا كاملًا باستعمالين وحزمة واحدة: حبر حفظ للبيع أو حبر نَفَس الضباب لتدريب أول نقش جسدي. يخفي حرارة النفس وحفيف الثياب ولا يمنح اختفاءً كاملًا. لوسا تشتري المنتجات وتبيع وصفات أعلى؛ وأولان يعرض مالًا أو حيز شحن مقابل الحفظ؛ وميسك يبيع خريطة لإصلاح علامة رسائله. المنضدة العامة مفتوحة، ولا يلزم قبول عمل قبل التدريب.",
        },
        npcMoves: {
          "luo-sha": { name: "لوسا", role: "سمسارة وصفات", desire: "شراء وصفة ومنتج غير معروفين بسعر منخفض قبل الإغلاق", nextMove: "تفحص جودة المنتج وتخفض السعر، ثم تذهب إلى متدرب آخر إذا رُفض عرضها" },
          "ou-lan": { name: "أولان", role: "محاسب سفينة البريد", desire: "حفظ صندوق أدوية وملء آخر مكان شحن قبل الرحيل", nextMove: "يعلن خياري المال أو المكان الليلي من دون أن يقرر عن أحد" },
          "mi-ce": { name: "ميسك", role: "رسول منفرد", desire: "بيع خريطة ترحيل قديمة لإصلاح علامة النقل الخاصة به", nextMove: "ينتظر عرضين آخرين ثم يصعد السفينة، وقد يقبل منتجًا أو معلومة" },
        },
        opportunities: [
          "أكمل حبر الضباب البارد على المنضدة العامة واحصل على منتج حقيقي للبيع أو حفظ الدواء أو تدريب نقش لاحق",
          "اجتز فحص السفينة وبدل المنتج بمال أو مكان ليلي أو قناة شحن سرية تستطيع استعمالها لاحقًا",
          "استعمل الحزمة نفسها لحبر نَفَس الضباب وتعلم نقشًا شخصيًا من التعليمات الكاملة، أو اشتر الخريطة وارحل بقدراتك الحالية.",
        ],
        continuity: [
          "اشترى اللاعب المقطر والوصفة العامة والمواد، وهي في مخزونه منذ البداية",
          "الخريطة ملك ميسك وصندوق الدواء ملك السفينة؛ الرؤية أو الفحص لا يغيران الملكية",
          "المنضدة العامة متاحة حتى الإغلاق، واللاعب لم يقبل أي مهمة",
          "المنتج الناجح الأول لا يتلف أو يصادر أو يقابل بدين مساوٍ تلقائيًا",
          "تتحرك الشخصيات الثلاث وفق مواعيدها؛ يستطيع اللاعب التجارة والتدرب والكذب والرحيل أو تجاهلهم",
        ],
        milestone: "حول الوصفة الكاملة والمواد المملوكة إلى مكسب حقيقي: رأس مال من بيع، أو نَفَس ضباب متعلم بأمان يستخدم في فعل يختاره اللاعب. ثم يمول المكسب نقشًا أعلى أو وصفة شخصية أو هوية اجتماعية أخرى؛ لا تستبدل الهدف بوظيفة فحص جديدة.",
      },
      seed: {
        currencyName: "سندات المد",
        inventory: {
          "folding-retort": { name: "مقطر قابل للطي", description: "أداتك القديمة، تكمل دفعة صغيرة من حبر منخفض على موقد عام" },
          "cool-mist-recipe": { name: "وصفات عامة باستعمالين", description: "تعليمات قانونية كاملة لحفظ الضباب البارد أو نَفَس الضباب الجسدي مع خطوات الأمان والتدريب. يشتركان في حزمة واحدة تكفي إعدادًا واحدًا. صنع الحبر لا يعني إتقان النقش في الجسد." },
          "cool-mist-materials": { name: "مواد حبر المبتدئ", description: "حزمة مشتركة مدفوعة كاملة، تكفي حبر الحفظ أو نَفَس الضباب وليس كليهما." },
        },
        relationships: {
          "luo-sha": { name: "لوسا", role: "سمسارة وصفات" },
          "ou-lan": { name: "أولان", role: "محاسب سفينة البريد" },
        },
        capabilities: {
          "basic-batch-brewing": { name: "خلط دفعة صغيرة", description: "تتبع وصفة عامة كاملة بالمقطر وتفهم تغيرات الحرارة والرواسب المعتادة؛ الوصفات المجهولة تحتاج اختبارًا خطوة خطوة.", source: "تدريب الورشة العامة" },
        },
        facts: [
          "أنت متدرب بالغ ومستقل يحق له توقيع العقود ومغادرة الميناء",
          "يغلق السوق القديم بعد ثلاث دقات وتبقى المنضدة مفتوحة حتى ذلك الوقت",
          "الوصفاتان كاملتان؛ تختار الحزمة أحد الاستعمالين بلا خدمة تحقق مسبقة. الأثر الوجيز لنَفَس الضباب تدريب؛ والثبات عدة دقائق تحت الضغط يحقق مرتبة صانع النقش الواحد.",
          "مال أولان ومكان الشحن الليلي عرضان ولا يملكهما أحد بعد",
        ],
        promises: [],
      },
    },
    "martial-frontier": {
      head: {
        title: "طريق القتال في الأراضي المتصدعة",
        subtitle: "حوّل الموارد إلى جسد واكتب الإنجاز على اللوح العام",
        description: "تقف مئة مدينة قتالية على حافة الأراضي المتصدعة. يستطيع الجميع التدريب، لكن المؤن الفعالة والسجلات الموثوقة وحقوق موارد البرية نادرة. يحدد أساس الجسد سقف القوة، وتحدد الاختبارات والمهام السعر والتدريب والدخول. يمكنك طلب مرتبة أو الاكتفاء بالقوة والمال والعلاقات والاستكشاف منفردًا. توسع القوة حريتك أولًا، وتبقى الخدمة العامة اختيارًا.",
        genre: "حدود قتالية حضرية",
        tags: ["قتال", "موارد", "ترتيب", "حدود"],
        sourceLabel: "إلهام غير رسمي · آليات التطور في Global Martial Arts",
      },
      growthGrammar: {
        desire: "الإغراء البعيد هو تحويل الطعام والدواء وحصاد البرية إلى جسد أقوى بثبات، وإثبات القدرة على الألواح العامة، والحصول على أسعار وتدريب أفضل وحق الاستكشاف المنفرد في عمق الأراضي المتصدعة.",
        conversion: "لا تصبح الموارد أساسًا جسديًا أو حركة قابلة للتكرار إلا بعد اكتمال التدريب والتعافي والقياس. يمكن أيضًا تنقية المواد للبيع أو الاستعمال. يحتاج الصعود إلى التقدم وتحمل الجسد والفعل الموافق، لا عدد ثابت من الأدوار ولا لحظة حظ واحدة.",
        recognition: "تعيد القاعات والقوافل وحراسة المدينة تسعيرك وفق سجلات الاختبار ونتائج الميدان والتسليم الثابت. يمنح الاعتراف مؤنًا أرخص وأجهزة خاصة وأولوية علاج وسعرًا أفضل وتصريح منطقة أو عقدًا مستقلًا، من دون فرض منصب أو واجب.",
        expansion: "ينتقل اللعب من تدريب المدينة والعمل القصير والاختبارات إلى الجمع والتحديات بين المدن ورحلات الصدوع وموارد شخصية. تبقى اللياقة والحركات الأساسية ومعالجة المواد الدنيا مصادر تحمل ومؤن ومال، ولا يعيد العالم الأعلى ضبطها.",
      },
      powerSystem: {
        summary: "يحول المقاتلون الطعام الكثيف والأثقال والتعافي والقتال إلى أساس جسدي قابل للقياس، ثم يتعلمون القوة والحماية والحركة. تسجل الألواح القوة والسرعة والتحمل والمهام الحقيقية، لكنها تثبت النتيجة ولا تستبدل المرتبة أو الاختيار.",
        growth: "قد تلخص جلسة مفيدة ساعات أو أيامًا، لكن يجب ذكر الاستهلاك والتعافي والصفة الجسدية المتغيرة. عند امتلاء التقدم يبقى اختبار المرتبة أو فعلها الحقيقي لازمًا. الصعود السري صحيح، لكن صلاحياته الاجتماعية تبقى مغلقة من دون إثبات علني.",
        realms: [
          { name: "الجسد المصقول", benchmark: "أقوى قليلًا من بالغ عادي؛ يحمل أوزانًا بسيطة لكنه يتعب سريعًا بعد انفجارات متكررة.", unlock: "يستعمل أجهزة التدريب العامة ويشتري المؤن الأساسية ويطلب اختبارًا داخل المدينة." },
          { name: "القوة الجارية", benchmark: "يجمع قوة الجسد في ضربة تكسر خشبًا سميكًا ويحافظ على ركض قصير.", unlock: "يتعلم حركات رسمية ويدخل حزامًا بريًا قليل الخطر ويحمل المواد الأساسية بنفسه." },
          { name: "العظم الرنان", benchmark: "تتحمل العظام والأنفاس صدمات متكررة، ويمكن المطاردة بسرعة فوق السطوح والأرض المكسورة.", unlock: "يواجه وحوش الصدع الشائعة منفردًا ويدخل ترتيب المدن ويزايد على المؤن المتوسطة." },
          { name: "رداء القوة", benchmark: "تمتد القوة عدة خطوات كحماية أو صدمة، ونادرًا ما يوقف السلاح العادي الحركة فورًا.", unlock: "يدخل الوديان متوسطة الخطر ويحرس القوافل أو يأخذ موردًا منفردًا ويحصل على أولوية العلاج العاجل." },
          { name: "خطوة السماء", benchmark: "يربط دفعات القوة ليخطو في الهواء ويعبر سورًا أو هاوية ويغير اتجاهه مرة.", unlock: "يسلك طرقًا بلا خرائط ويطارد الوحوش الطائرة ويدير موارده وتحدياته بين المدن." },
          { name: "حارس الصدع", benchmark: "تغطي الحماية والقوة الممتدة شارعًا وتسيطر ساعات على مجموعات من الوحوش الأدنى.", unlock: "يحفظ موقع موارد شخصيًا ويفاوض المدن القتالية على الطرق والمؤن والمعلومات." },
          { name: "فاتح المجال", benchmark: "تغير القوة الشخصية بثبات الضغط أو الريح أو الأرض القابلة للعبور في جزء من الأراضي المتصدعة.", unlock: "يفتح طرقًا عبر الصدوع ويستكشف مدنًا غريبة ويختار إن كان يدخل حروبًا عامة أكبر." },
        ],
      },
      powers: {
        "clean-forge-body": { name: "جسد الفرن النقي", description: "يطرد أول طعام أو دواء تدريب في اليوم شوائبه الرئيسية ويغذي التعافي أو التمرين بثبات.", growth: "ينمو من تنقية وجبة إلى معالجة مواد البرية وصنع غذاء شخصي وبيع الفائض المنقى.", boundary: "لا يزيد كمية المادة ولا يغني عن التدريب أو النوم. السم المجهول والجرعة الزائدة ودواء المرتبة الأعلى ما زالت تؤذي." },
        "proof-mark": { name: "علامة الإنجاز", description: "يترك الفعل الحقيقي الذي يؤكده جهاز محايد أو شهود علنيون سجلًا قصيرًا تستطيع عرضه.", growth: "تجمع سجلات مختلفة في تاريخ قتالي يفتح السعر والتدريب والتحدي أو يجبر الخصم على إعادة التقدير.", boundary: "لا تزور الفعل ولا تنسخ سجل غيرك ولا تفرض الثقة. تكرار الفعل السهل نفسه لا يصنع علامة جديدة." },
        "force-trail": { name: "قراءة أثر القوة", description: "المس أرضًا أو جدارًا أو غرضًا مكسورًا لترى اتجاه أقوى قوة خلال آخر خمس عشرة دقيقة.", growth: "ينمو من قراءة الخطوات والصدمات إلى تتبع نقل الموارد وربط قوة التضاريس بحركتك وهجومك.", boundary: "يظهر الاتجاه والقوة التقريبية، لا الهوية أو القصد أو المشهد الكامل. الأثر القديم والماء والتشويش يحرفه." },
      },
      opening: {
        head: {
          location: "ميدان الاختبار الجنوبي في مدينة الفولاذ المطوي",
          chapterTitle: "المكان الأخير على اللوح",
          goal: "قبل إغلاق البوابة اختر وأكمل مكسبًا حقيقيًا: نمو الجسد أو المال أو نتيجة علنية أو حصادًا منفردًا قليل الخطر",
          situation: "عند المساء شغر مكان واحد في الاختبار العام. أنت مقاتل بالغ ومستقل تحمل مؤنك المدفوعة لثلاثة أيام ورباطي حماية وتصريح برية قليل الخطر. يحتاج هو لينغ إلى نتيجة حقيقية الليلة ليحفظ أجهزة الموسم المقبل. يدفع رن لي نقدًا مقابل جذور القشرة الحارة السليمة. يبيع الدليل المنفرد سانغ تو خريطة قديمة ويرحل قبل الظلام إن لم تبع. يمكنك تجاهلهم والتدرب أو بيع التصريح أو الراحة أو دخول البرية منفردًا بتصريحك.",
        },
        npcMoves: {
          "hou-ling": { name: "هو لينغ", role: "صاحب قاعة الميدان الجنوبي", desire: "تحقيق نتيجة حقيقية الليلة للحفاظ على أجهزة الموسم المقبل", nextMove: "يفتح آخر إحماء مجاني ويدعو المتطوعين من دون إجبار أحد" },
          "ren-li": { name: "رن لي", role: "مشتري مواد البرية", desire: "شراء جذور سليمة كافية قبل رحيل القافلة", nextMove: "يعلن السعر حسب سلامة الجذر ويعرض وجبات تدريب بدل المال" },
          "sang-tuo": { name: "سانغ تو", role: "دليل منفرد", desire: "بيع خريطة قديمة ليدفع إصلاح درعه", nextMove: "يغادر قبل إغلاق البوابة ويدخل الصدع الرمادي وحده إن لم يرافقه أحد" },
        },
        opportunities: [
          "استعمل مؤنك وأجهزة التدريب العامة في جلسة كاملة تحسن فورًا قوة أو سرعة أو تعافيًا قابلًا للقياس",
          "ادخل آخر اختبار عام وحول النتيجة إلى جائزة وسجل على اللوح وخصم تدريب تستعمله لاحقًا",
          "استعمل تصريحك لدخول الصدع الرمادي منفردًا واجمع جذرًا للاستعمال أو البيع ثم عد بلا فريق",
        ],
        continuity: [
          "المؤن والرباطان والتصريح ملك اللاعب؛ عروض الشخصيات لا تغير الملكية",
          "يسجل الاختبار الأفعال المكتملة فقط؛ التسجيل أو المشاهدة أو التحدي بالكلام لا يمنح مرتبة",
          "يسمح التصريح بالدخول منفردًا لكنه لا يزيل خطر الأرض أو التعب أو الوحوش",
          "لا يطلق أول نجاح في التدريب أو الاختبار أو الجمع غرامة أو إصابة أو تجنيدًا مساويًا لإلغائه",
          "يستطيع اللاعب رفض كل الطلبات واختيار التدريب أو المال أو الصداقة أو البيع أو الاستكشاف",
        ],
        milestone: "خلال الأدوار 1 إلى 3، أكمل جلسة جسدية أو اختبارًا عامًا أو حصادًا قليل الخطر واحتفظ بالنمو أو المال أو خدمة اللوح أو المادة الحقيقية. لا تجعل كل نتيجة فحص أهلية جديدًا.",
      },
      seed: {
        currencyName: "سندات القتال",
        inventory: {
          "three-day-rations": { name: "مؤن تدريب لثلاثة أيام", description: "طعام كثيف مدفوع يكفي جلسة قوية أو ثلاثة أيام عادية" },
          "shock-wraps": { name: "رباطا الحماية", description: "حمايتك القديمة تقلل أذى المعصم في جلسة أثقال أو صدمات واحدة" },
          "low-risk-pass": { name: "تصريح منطقة قليلة الخطر", description: "تصريح باسمك لاستعمال واحد، يسمح بدخول الصدع الرمادي الخارجي منفردًا وإخراج المواد الأساسية" },
        },
        relationships: {
          "hou-ling": { name: "هو لينغ", role: "صاحب قاعة الميدان الجنوبي" },
          "ren-li": { name: "رن لي", role: "مشتري مواد البرية" },
        },
        capabilities: {
          "standard-body-drill": { name: "تمرين الجسد القياسي", description: "تنفذ الإحماء والأثقال والعدو وتسجيل التعافي منفردًا؛ من دون مؤن لا تكون إلا الشدة العادية آمنة.", source: "دورة التدريب العامة في المدينة" },
          "read-frontier-markers": { name: "قراءة علامات البرية", description: "تقرأ سهام العودة وتحذير الوحوش ورايات الطقس في المناطق الدنيا، لكنك لا تعرف أمان الأرض غير المعلمة.", source: "دورة سلامة التصريح" },
        },
        facts: [
          "أنت بالغ وتستطيع تسجيل الاختبار وتوقيع الصفقة واستعمال تصريحك",
          "بقي مكان واحد في اختبار الليلة، والإكمال وحده يترك سجلًا على اللوح",
          "يستطيع صاحب التصريح دخول الصدع الرمادي الخارجي منفردًا، ويصبح الجذر طعام تدريب",
          "حصة أجهزة هو لينغ وعرض شراء رن لي ليسا مهمتين قبلهما اللاعب",
        ],
        promises: [],
      },
    },
  },
};

export function localizeProgressionWorld(world, language) {
  const base = PROGRESSION_WORLDS.find((candidate) => candidate.id === world?.id);
  if (!base) return null;
  if (language === "zh") return { ...structuredClone(base), language: "zh" };
  const translation = TRANSLATIONS[language]?.[base.id];
  if (!translation) return null;
  const localized = structuredClone(base);
  Object.assign(localized, translation.head, { language });
  localized.growthGrammar = structuredClone(translation.growthGrammar);
  localized.powerSystem.summary = translation.powerSystem.summary;
  localized.powerSystem.growth = translation.powerSystem.growth;
  localized.powerSystem.realms = localized.powerSystem.realms.map((realm) => ({ ...realm, ...translation.powerSystem.realms[realm.rank] }));
  localized.powers = localized.powers.map((power) => ({ ...power, ...translation.powers[power.id] }));
  Object.assign(localized.opening, translation.opening.head);
  localized.opening.npcMoves = localized.opening.npcMoves.map((npc) => ({ ...npc, ...translation.opening.npcMoves[npc.id] }));
  localized.opening.opportunities = structuredClone(translation.opening.opportunities);
  localized.opening.continuity = structuredClone(translation.opening.continuity);
  localized.opening.milestone = translation.opening.milestone;
  localized.seed.currencyName = translation.seed.currencyName;
  localized.seed.inventory = localized.seed.inventory.map((item) => ({ ...item, ...translation.seed.inventory[item.id] }));
  localized.seed.relationships = localized.seed.relationships.map((npc) => ({ ...npc, ...translation.seed.relationships[npc.id] }));
  localized.seed.capabilities = localized.seed.capabilities.map((ability) => ({ ...ability, ...translation.seed.capabilities[ability.id] }));
  localized.seed.facts = structuredClone(translation.seed.facts);
  localized.seed.promises = structuredClone(translation.seed.promises);
  return localized;
}
