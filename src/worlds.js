import { AppError } from "./errors.js";
import { canonicalAttitude, isFanSourceLabel, localizedSourceLabel, normalizeLanguage, seedLabels } from "./i18n.js";
import { localizePreset } from "./preset-i18n.js";

const ATTITUDES = new Set(["敌视", "戒备", "陌生", "中立", "好奇", "友善", "信任", "亲近"]);

const CINDER_RIVER = {
  id: "cinder-river",
  title: "烬河照夜",
  subtitle: "边城将乱，一点异能足以改命",
  description: "烬河从群山中穿过照夜城。倒流的河沿正升起淡金灵雾，凡人也有机会借今夜灵潮第一次感气；药市卖基础引气药，城外废庙留着入门吐纳石刻。修行是改变命运的直接道路，不必靠给别人跑腿才能推进。城里有药市、船帮、旧矿和不肯低头的人。你刚成年不久，境界低微，却在今夜得到一种有明确边界的异能。没有天命催你上路；救人、交易、逃走或趁乱夺利，都会留下真实后果。",
  genre: "东方玄幻",
  tags: ["边城", "修行", "异能", "抉择"],
  sourceLabel: "TGN Live 原创",
  powerSystem: {
    summary: "天地灵气进入经脉后，先改变感知与体力，再逐步外放。境界决定基础承受、灵力总量和可到达的危险区域；天赋只在一条局部规则上给玩家额外选择。",
    growth: "一次有效修炼可以概括半日或一个完整练习阶段。安静吐纳、引气药、实战掌握和灵潮机缘都能推进，但重复空坐收益很快降低。每次真正成长要同时写清获得的可用动作；达到100进度后仍需在正文中完成本境突破条件。",
    realms: [
      { name: "凡身", rank: 0, benchmark: "普通成年人的体力，偶尔能感到灵气却留不住。", unlock: "可完成基础吐纳并辨认灵气与自身气血的差别。" },
      { name: "引气一层", rank: 1, benchmark: "能稳定留住一缕灵气，连续奔走与伤后恢复优于凡人。", unlock: "能主动感气、温养身体，并把所选天赋稳定用于一次短行动。" },
      { name: "引气二层", rank: 2, benchmark: "灵气可沿一条经脉循环，短时爆发足以越过高墙或压住普通兵卒。", unlock: "能在移动与轻微干扰中运转灵气，进入低危灵地。" },
      { name: "引气三层", rank: 3, benchmark: "灵气可短暂离体，感知、护身或攻击范围扩到数步。", unlock: "能独自处理低阶邪物，并接近旧矿深层与烬河夜渡。" },
      { name: "凝脉初境", rank: 4, benchmark: "经脉凝成稳定回路，普通刀伤难以立刻止住行动。", unlock: "可长时间运转术法、争取城中修行身份，并进入真正的宗门与荒野。" },
    ],
  },
  opening: {
    location: "照夜城南门药市",
    chapterTitle: "烬河倒流",
    goal: "在封城风波中找到自己的路，尝试第一次引气，让异能成为修行的起点",
    situation: "暮鼓未停，烬河忽然倒流半尺。药市掌柜沈秋禾正把一个受伤少年藏进药柜，巡夜校尉韩峥带兵逐摊搜查，河堤方向则传来矿奴砸门的喊声。沈秋禾想保住少年和药铺；韩峥急着找到失窃的赤砂令；那少年紧攥一枚染血铜片，只求不要被带回旧矿。三方愿望彼此冲突，玩家可以介入，也可以离开。",
    npcMoves: [
      { id: "shen-qiuhua", name: "沈秋禾", role: "药市掌柜", desire: "保住少年与药铺", nextMove: "设法遮掩伤者，但不会替玩家决定是否帮忙" },
      { id: "han-zheng", name: "韩峥", role: "巡夜校尉", desire: "尽快找到失窃的赤砂令", nextMove: "搜查药市，同时留意河堤局势" },
      { id: "wounded-youth", name: "受伤少年", role: "旧矿逃工", desire: "不再被带回旧矿", nextMove: "藏好铜片，寻找愿意交易或帮助的人" },
    ],
    opportunities: ["借河沿灵潮完成半日引气练习，第一次真正留住灵气", "用药钱或人情换到基础引气药，让修炼有可见推进", "前往城外废庙读完吐纳石刻，掌握一项能在行动中使用的入门法门"],
    continuity: ["开局地点为南门药市", "玩家没有自动接受任何任务", "铜片起初在受伤少年手中，除非正文明确发生交付、夺取或遗失，否则不会改变持有人", "可拒绝NPC请求；自由行动以现有能力和物品为界"],
    milestone: "第一次有效修炼应完成一个练习阶段，并产生可记录的新用途；不提前承诺玩家选择或结局。",
  },
  seed: {
    currencyName: "铜钱",
    coins: 18,
    inventory: [
      { id: "plain-clothes", name: "旧布外衣", description: "洗得发白，但足够遮风", qty: 1 },
      { id: "copper-token", name: "母亲留下的铜钱", description: "边缘有一道月牙缺口", qty: 1 },
    ],
    relationships: [
      { id: "shen-qiuhua", name: "沈秋禾", role: "药市掌柜", attitude: "陌生" },
      { id: "han-zheng", name: "韩峥", role: "巡夜校尉", attitude: "陌生" },
    ],
    capabilities: [],
    facts: ["烬河今夜反常倒流", "照夜城正在临时封城", "河沿淡金灵雾是今夜灵潮的外显，适合在不被打扰时尝试感气", "你幼时学过最粗浅的吐纳：定息、感受周身灵气，再尝试留住一丝；过去没有真正成功，觉醒异能并不等于已经进入引气境"],
    promises: [],
  },
  powers: [
    { id: "ember-hearing", name: "烬息", description: "触碰余温，听见它最近一次剧烈变化留下的短暂回声。", growth: "先从数息回声成长到分辨多层痕迹，并能在移动中使用。", boundary: "只能读取被触碰对象留下的有限痕迹；不能读心、遥感或预知，连续使用会耳鸣失衡。" },
    { id: "borrowed-force-seal", name: "借势印", description: "承受一次真实冲击后，可把部分力道封在掌心，并在十息内一次释放。", growth: "修为提升后可保存更完整的力道，并改变一次近身攻防的主动权。", boundary: "最多存一击，身体仍会受伤；无法储存法术、毒或超过肉身承受极限的力量。" },
    { id: "hollow-pouch", name: "空囊界", description: "每日三次，把手掌能完全盖住的一件无生命物收入一方静止小界，再原样取出。", growth: "修为提升后尺寸与取放速度扩大，可形成藏物、换手和越过封锁的独特玩法。", boundary: "最多存三件；活物、燃烧物和比自身更重的东西无法进入。" },
  ],
};

const SKY_BEAST_ISLES = {
  id: "sky-beast-isles",
  title: "云背群岛",
  subtitle: "驭兽者争夺会迁徙的天空航路",
  description: "数百座浮空岛随季风缓慢漂移，岛民靠翼兽、风帆和短暂相接的云桥往来。每年迁徙季，最肥沃的母岛会穿过雷海，旧航路随之作废。驭兽不是收集宠物：人和兽共享恐惧、方向与一次关键本领，契约越深，双方越能去过去到不了的天空。牧团想抢先占住新航路，猎团要捕获罕见云兽，失去幼崽的兽群正在逼近港口。玩家可以结契、追踪、护送或自行夺路。",
  genre: "浮空岛驭兽",
  tags: ["浮空岛", "驭兽", "探索", "航路"],
  sourceLabel: "TGN Live 原创",
  powerSystem: {
    summary: "驭者以心环与一只自愿回应的云兽共享感官和天赋。境界提升会扩大共同承受、空中机动和可契约兽群，而兽的意愿始终独立。",
    growth: "完整训练以一次飞行、追踪、共同狩猎或安抚阶段结算。成长必须出现新协作动作、抵达新空域或获得新伙伴信任，不能只增加亲密数字。突破需要心环稳定、伙伴主动回应，并完成对应天空考验。",
    realms: [
      { name: "地行者", rank: 0, benchmark: "只能依靠器具短途滑翔，无法与云兽共享感知。", unlock: "能学习手势、气味与风向，争取第一只云兽回应。" },
      { name: "缚风学徒", rank: 1, benchmark: "可与一只小型云兽共享一种感官，短途跨越岛缝。", unlock: "能借伙伴视野侦察，并完成第一次真正的双向协作。" },
      { name: "一环驭手", rank: 2, benchmark: "心环能分担一次冲击，人与兽可在乱风中同时改变方向。", unlock: "可进入雷海外缘，独立护送或追猎。" },
      { name: "双环巡空者", rank: 3, benchmark: "能维持两重共享本领，让小队在风暴中协同。", unlock: "可率领迁徙、争夺移动航路，并接近大型天空兽。" },
      { name: "云冠契师", rank: 4, benchmark: "契约能覆盖一支自愿同行的兽群，跨岛战斗持续数个时辰。", unlock: "可改变群岛迁徙格局，与岛主和兽王平等谈条件。" },
    ],
  },
  opening: {
    location: "折帆岛幼兽港",
    chapterTitle: "失控的迁徙季",
    goal: "在航路封闭前得到第一份真正的天空行动权",
    situation: "迁徙钟提前响了。港主洛岑命人扣住一只从雷海跌落的幼年镜翅兽，准备卖给出价最高的猎团；兽医弥娅发现它的伤口里缠着另一座失踪浮岛的红苔；老领航员昆戈则准备私自起航，抢在风暴前寻找那座岛。洛岑要保住港口收入，弥娅要先救兽，昆戈只剩这一次翻身机会。幼兽没有认主，它正用喙一点点割断笼索。",
    npcMoves: [
      { id: "luo-cen", name: "洛岑", role: "幼兽港主", desire: "用镜翅兽填上港口亏空", nextMove: "封锁栈桥并召来买家" },
      { id: "mi-ya", name: "弥娅", role: "云兽医", desire: "救下幼兽并查明红苔来源", nextMove: "设法拖延拍卖，寻找能靠近幼兽的人" },
      { id: "kun-ge", name: "昆戈", role: "失势领航员", desire: "找到失踪浮岛重获航线", nextMove: "无论有没有同伴都将在钟停前起航" },
    ],
    opportunities: ["赢得镜翅兽一次自愿回应，立刻获得俯瞰港口的共享视野", "跟昆戈穿过第一段乱风，学会可实际跨越岛缝的驭风动作", "查清红苔能指向移动岛屿，得到一条高价值新航路的先手"],
    continuity: ["镜翅兽没有预定主人，接受谁取决于实际互动", "昆戈会按自己的时限起航", "港口封锁限制普通出入，但玩家可以谈判、潜行、结契或另找空路"],
    milestone: "第一次成长应让玩家获得共享感官、跨岛移动或兽群信任中的一种真实新动作。",
  },
  seed: {
    currencyName: "风铢",
    coins: 24,
    inventory: [{ id: "glider-harness", name: "旧滑翔索", description: "能承受一次短距滑翔，磨损处需要避开猛风", qty: 1 }, { id: "sweet-moss", name: "甜苔饼", description: "多数幼年云兽愿意闻一闻", qty: 2 }],
    relationships: [{ id: "mi-ya", name: "弥娅", role: "云兽医", attitude: "陌生" }, { id: "kun-ge", name: "昆戈", role: "失势领航员", attitude: "陌生" }],
    capabilities: [{ id: "short-glide", name: "短距滑翔", description: "借旧滑翔索从高处越过十余步落差；乱风中风险很高。", source: "旧滑翔索" }],
    facts: ["迁徙钟比往年提前响起", "镜翅兽伤口中的红苔来自本地没有的浮岛", "幼兽尚未与任何人结契"],
    promises: [],
  },
  powers: [
    { id: "shared-sky-eye", name: "共天眼", description: "只要一只云兽愿意与你对视，你就能短暂借用它的视野与方向感。", growth: "从数息视野成长为飞行中双向协同，最终让队伍共享同一片天空。", boundary: "不能强迫、不夺取控制；恐惧或背叛会立刻中断共享。" },
    { id: "wild-bond", name: "野契", description: "你能听懂云兽最强烈的一种欲望，并提出一项双方都要兑现的交换。", growth: "从单次交换成长为长期契约和群兽协商，能打开别人无法谈成的路线。", boundary: "只能听见最强欲望，不能读完整思想；你也必须履行自己的交换。" },
    { id: "borrowed-wing", name: "借翼", description: "触碰自愿伙伴后，你能在自己身上显出它一种移动本领。", growth: "从短滑、攀附成长到真正飞行，并能组合不同伙伴的空中动作。", boundary: "一次只能借一种本领，持续受自身境界与伙伴体力限制。" },
  ],
};

const WESTERN_MAGIC = {
  id: "ashen-star-covenant",
  title: "灰塔星契",
  subtitle: "魔法城邦的星门今夜少了一颗星",
  description: "白炬诸邦用刻印法术照亮城市、驱动列车并守住荒野，但每座城市都依赖一座由法师议会控制的星门。今夜，边城灰塔的第七码星突然熄灭，通往北境的门仍在吞入行李，却不再放回旅人。学院要封锁消息，失踪者家属要闯门，走私法师正兜售一枚能改写单个法术的残缺星片。力量让人真正改变物质、距离和契约；身份只决定谁能合法学习，不决定玩家必须服从谁。",
  genre: "西幻魔法",
  tags: ["魔法", "城邦", "星门", "探索"],
  sourceLabel: "TGN Live 原创",
  powerSystem: {
    summary: "法师在身体上刻下法环，用精神与材料把一个清楚意图变成火、力、形态或距离变化。境界决定同时维持的法环数量、范围和可承受反噬。",
    growth: "一次完整练习可以概括数小时的刻印、施法与复盘。真正掌握必须在现实对象上成功一次，并记录新的可用法术或施法方式。突破需要稳定现有法环、理解一个新结构并完成公开或私下验证。",
    realms: [
      { name: "无环学徒", rank: 0, benchmark: "只能借用成品符具，无法独立维持法术。", unlock: "能辨认基础刻纹并安全触发一件低阶符具。" },
      { name: "一环法徒", rank: 1, benchmark: "可稳定维持一个掌心大小法术十余息。", unlock: "能独立点燃、推动、塑形或侦测一种具体对象。" },
      { name: "二环塑术师", rank: 2, benchmark: "可让法术覆盖一间房，并在移动中保持。", unlock: "能进入学院工坊与低危遗迹，创造第一件个人符具。" },
      { name: "三环行塔者", rank: 3, benchmark: "可同时维持三种互不冲突的法术，抵挡街区级事故。", unlock: "能短距穿门、独立远行，并参与城邦级法术争夺。" },
      { name: "星门法师", rank: 4, benchmark: "能锚定远方坐标，让多人或大型物体跨城移动。", unlock: "可修复或夺取星门，改变城邦之间的真实距离与权力。" },
    ],
  },
  opening: {
    location: "灰塔北站失物厅",
    chapterTitle: "熄灭的第七码星",
    goal: "在星门封锁中掌握第一项属于自己的法术，并决定如何使用失踪线索",
    situation: "北站把最后一批吐回来的行李堆进失物厅，其中一只皮箱正从内部规律敲响。学院监察官赛芙要在议会来人前封存全部行李；修表匠奥兰认出皮箱属于失踪的女儿，坚持要带走；走私法师维克则悄悄展示一枚残缺星片，说它能让无环者改写一次现成法术。赛芙要控制事故，奥兰要找女儿，维克只想在封城前卖出星片。",
    npcMoves: [
      { id: "seif", name: "赛芙", role: "学院监察官", desire: "封住事故并保住灰塔秩序", nextMove: "清场、编号并转移所有异常行李" },
      { id: "oran", name: "奥兰", role: "修表匠", desire: "找回失踪的女儿", nextMove: "若被拒绝就自己撬开皮箱" },
      { id: "vik", name: "维克", role: "走私法师", desire: "在封城前高价卖掉星片", nextMove: "挑一个最着急的人报价，然后离站" },
    ],
    opportunities: ["用残缺星片改写一次车站符具，立刻学会一项可复用的基础法术", "解开皮箱内的敲击规律，得到穿过失效星门的第一个安全坐标", "在学院封存前取得一件合法训练符具，完成数小时的第一环练习"],
    continuity: ["皮箱归奥兰的失踪女儿所有，检查不等于获得", "星片在维克手中，交易或夺取都要产生真实后果", "星门事故仍在发生，不会等玩家完成对话"],
    milestone: "第一次成长必须在真实对象上成功施法，并留下一个以后还能使用的明确动作。",
  },
  seed: {
    currencyName: "银盾",
    coins: 12,
    inventory: [{ id: "chalk-case", name: "刻纹粉笔盒", description: "六支不同矿粉粉笔，够画三次基础刻纹", qty: 1 }, { id: "station-ticket", name: "作废北站票", description: "背面印着星门安全须知", qty: 1 }],
    relationships: [{ id: "seif", name: "赛芙", role: "学院监察官", attitude: "陌生" }, { id: "oran", name: "奥兰", role: "修表匠", attitude: "陌生" }],
    capabilities: [{ id: "read-basic-runes", name: "辨认基础刻纹", description: "能分清启动、停止与危险标记，但还不能独立施法。", source: "旧学徒课程" }],
    facts: ["灰塔星门的第七码星今夜熄灭", "星门吞入行李后没有送回旅人", "学院尚未公开事故规模"],
    promises: [],
  },
  powers: [
    { id: "spell-echo", name: "术式回声", description: "看过一个法术完整发动后，你能在一小时内无材料复现它一次。", growth: "从复现小术成长为拆分、组合见过的术式，让陌生法术迅速成为行动工具。", boundary: "必须亲眼看完整施法；一次只保留一个回声，威力不超过自身境界。" },
    { id: "living-script", name: "活刻", description: "你写下的一个基础刻纹可以在物体移动或破损时自行调整一次。", growth: "从稳定小物成长到让护具、门与载具在现场改变用途。", boundary: "只修正原本意图，不能凭一个刻纹创造第二种法术。" },
    { id: "true-distance", name: "真距", description: "触碰两件看得见的物体时，你能知道它们之间最短的可行路径，并让下一步跨出两步距离。", growth: "从房间内错步成长为穿门、越墙和星门定位。", boundary: "不能穿过未知致命环境；每次只能影响自己的下一步。" },
  ],
};

const ALCHEMY_WORLD = {
  id: "crimson-cauldron",
  title: "赤曜药州",
  subtitle: "火种、丹方与境界都能当场改变命运",
  description: "赤曜药州以焰息修行。修行者把天地火息纳入气轮，境界越高，力量、速度、火焰控制和可进入的炎地都会同时提升。炼药师能把稀有药材变成突破机会，因此宗族、药盟和佣兵都在争夺火种与丹方。南岭城的公共药炉今夜炸裂，一缕无主青焰钻入旧街；药盟要封街收焰，负债少女想用祖传残方救家，受伤佣兵则知道青焰来自一座刚露出的地下火宫。",
  genre: "斗气炼药成长",
  tags: ["焰息", "炼药", "突破", "异火奇遇"],
  sourceLabel: "非官方同人灵感 · 斗破苍穹成长机制",
  powerSystem: {
    summary: "焰息进入气轮，先强化身体与火感，再外放成形。药材、战斗压力、功法理解和稀有火种分别改变积累、突破与术法上限。",
    growth: "一轮有效修炼可以概括半日到半月，按资源与阶段决定。结算时要写清药液或材料消耗、当前境界、相对普通速度，以及新招在现实物体上的当前效果。每步最多增加20进度；跨境还需足够积累和本境明确条件。",
    realms: [
      { name: "初息三段", rank: 0, benchmark: "能感火息，力量仍接近普通武者，无法让火离掌。", unlock: "能完成药浴修炼并用气感分辨常见药材。" },
      { name: "初息四段", rank: 1, benchmark: "气力明显超过凡人，可把一只花瓶隔空拉动半尺。", unlock: "能使用第一式牵引或震击，在争夺物品时真正改变结果。" },
      { name: "聚轮一星", rank: 2, benchmark: "气轮成形，可连续战斗并短暂外放焰息。", unlock: "能正式学习炼药、进入佣兵炎地，并与城中修行者同台。" },
      { name: "烈师一星", rank: 3, benchmark: "焰息覆盖数丈，能在火场中护住自己与一人。", unlock: "可独立炼制破境药、争夺城级火种并带队入火宫。" },
      { name: "凌空王阶", rank: 4, benchmark: "气焰化翼，可离地飞行并压制整支低阶队伍。", unlock: "能越过天险、建立自己的药坊或挑战州域强者。" },
    ],
  },
  opening: {
    location: "南岭城旧药街",
    chapterTitle: "无主青焰",
    goal: "夺得一次能让修炼或炼药真正起步的机会",
    situation: "公共药炉爆裂后，青焰钻进废弃澡堂。药盟执事罗谦带人封街，声称一切火种归药盟处置；负债少女顾遥抱着祖传残方，想先取一缕火救回家中药铺；断臂佣兵石阔知道澡堂下连着火宫，却只肯把入口卖给能护他出城的人。罗谦要立功，顾遥要保住家业，石阔要活着离开追杀。青焰正在吞掉澡堂里的旧药渣。",
    npcMoves: [
      { id: "luo-qian", name: "罗谦", role: "药盟执事", desire: "独占青焰换取晋升", nextMove: "封死澡堂出口并搜查靠近者" },
      { id: "gu-yao", name: "顾遥", role: "落魄药坊继承人", desire: "炼成祖传残方救回药铺", nextMove: "趁封锁未严潜入澡堂取火" },
      { id: "shi-kuo", name: "石阔", role: "断臂佣兵", desire: "用火宫情报换到出城保护", nextMove: "向不同买家报价，但会隐瞒一处致命危险" },
    ],
    opportunities: ["用现有药材完成一个完整药浴阶段，把境界推进并获得可用牵引动作", "从青焰上取得一缕受控火种，让炼药与战斗同时出现新可能", "拿到残方缺失的一味主药线索，打开不依附药盟的成长路线"],
    continuity: ["青焰无主但危险，接近不等于收服", "残方属于顾遥，阅读不等于取得所有权", "三名NPC会为自己的目标行动，不会无限陪玩家议价"],
    milestone: "第一次有效修炼同时说明耗时、消耗、相对速度和一个可立刻验证的动作。",
  },
  seed: {
    currencyName: "金币",
    coins: 30,
    inventory: [{ id: "warming-tonic", name: "温脉药液", description: "够完成一次半日药浴，之后药力耗尽", qty: 1 }, { id: "iron-palm-notes", name: "牵息手抄页", description: "记着最基础的隔空牵引练法", qty: 1 }],
    relationships: [{ id: "gu-yao", name: "顾遥", role: "落魄药坊继承人", attitude: "陌生" }, { id: "shi-kuo", name: "石阔", role: "断臂佣兵", attitude: "陌生" }],
    capabilities: [{ id: "sense-flame", name: "感应火息", description: "闭眼时能分辨一丈内最强的火息方向，不能判断其主人。", source: "初息三段" }],
    facts: ["公共药炉今夜爆裂", "一缕无主青焰进入旧街澡堂", "药盟正在封锁旧药街"],
    promises: [],
  },
  powers: [
    { id: "ten-thousand-flames", name: "万火亲和", description: "陌生火焰第一次接触你时不会立刻灼伤，并会显出最容易驯服的一瞬。", growth: "从争取一瞬机会成长为驾驭多种火性，直接提升炼药、攻击和火域行动。", boundary: "只免除第一次接触的灼伤；不能跳过收服、境界或持续承受。" },
    { id: "pill-pattern-echo", name: "丹纹回响", description: "尝过一枚丹药后，你能分辨其中最关键的一味材料和一次失败火候。", growth: "从辨错成长为改方、补方和创造个人炼药路线。", boundary: "每枚丹只能得到一味材料与一个火候信息，不直接给出完整丹方。" },
    { id: "breakthrough-ember", name: "破境余烬", description: "每当你真正突破一个小层级，会留下三日余烬，可在一次招式中重现突破瞬间的爆发。", growth: "境界越高，余烬越能改变战斗、炼药或逃生的关键一击。", boundary: "一次突破只留一枚余烬，用掉即失；不能靠失败或口头宣称产生。" },
  ],
};

const SOUL_MARK_WORLD = {
  id: "myriad-mark-hunt",
  title: "万相猎庭",
  subtitle: "每次成长都会给你的本命形态添一个新动作",
  description: "万相大陆的人在成年时觉醒本命形态：兽、器、植物或难以归类的异相。修行者每跨过一个大节点，必须在荒野中面对与自己相合的强大生灵，取得对方自愿交出的印记或战后遗留的完整印核，才能把新动作刻进本命形态。猎庭学院垄断安全猎区，边村却正被一只离群的雷角兽逼迁；学院想活捉它，村长想把人先撤走，年轻猎人坚称它在守护某样更值钱的东西。",
  genre: "武魂成长",
  tags: ["本命形态", "猎取印记", "学院", "成长组合"],
  sourceLabel: "非官方同人灵感 · 斗罗大陆成长机制",
  powerSystem: {
    summary: "本命形态随修炼提升基础体魄、反应和能量；关键节点通过印记获得一项清楚的新动作。形态与印记组合决定打法，但高等级仍拥有更大的基础盘。",
    growth: "日常训练可概括完整一日，推进控制、体魄或已有印技；每次有效成长要让旧动作更稳或解锁新用法。跨大节点需达到进度、证明承受能力，并取得相合印记，不能凭空生成印技。",
    realms: [
      { name: "初醒一级", rank: 0, benchmark: "本命形态刚能显现，维持不满半刻。", unlock: "能使用形态最基础的身体或器物特性一次。" },
      { name: "成印十级", rank: 1, benchmark: "形态可稳定战斗，并承载第一枚印记。", unlock: "获得第一项真正印技，进入正式猎区与学院考核。" },
      { name: "双印二十级", rank: 2, benchmark: "可让两项印技连续配合，体魄足以正面对抗大型野兽。", unlock: "能独立猎取、进入禁林深处并形成个人打法。" },
      { name: "御印四十级", rank: 3, benchmark: "形态覆盖全身或完全实体化，可影响数丈战场。", unlock: "能建立猎队、争夺稀有印核并改变一地势力判断。" },
      { name: "冠印七十级", rank: 4, benchmark: "本命形态形成领域，低阶印技在其中受到压制。", unlock: "能进入王庭禁区、挑战兽王，并决定一方猎庭的规则。" },
    ],
  },
  opening: {
    location: "青栎村猎庭考棚",
    chapterTitle: "雷角兽没有进村",
    goal: "证明本命形态的第一种真实用途，并找到自己的第一枚印记机会",
    situation: "学院考官白砚正宣布撤销青栎村今年的入学名额，因为雷角兽占住了唯一山路。村长杜衡忙着组织撤村，不肯拿年轻人的命赌；猎人阿迟却带回一截被雷劈开的古木，声称雷角兽没有袭村，它在阻止山里某种东西下来。白砚要按时带走活兽，杜衡要全村安全，阿迟要证明自己的判断。远处山口传来第二声雷，却没有兽吼。",
    npcMoves: [
      { id: "bai-yan", name: "白砚", role: "猎庭学院考官", desire: "活捉雷角兽完成学院指标", nextMove: "征用村中猎具并挑选能带路的人" },
      { id: "du-heng", name: "杜衡", role: "青栎村长", desire: "在天黑前让全村撤到安全谷地", nextMove: "封存粮仓并阻止年轻人进山" },
      { id: "a-chi", name: "阿迟", role: "年轻猎人", desire: "查清雷角兽守着什么", nextMove: "带着古木证据独自绕进后山" },
    ],
    opportunities: ["完成一次完整形态训练，让本命特性成为可用于追踪、战斗或移动的动作", "接近雷角兽并争取一枚自愿印记，提前看到第一印技的诱惑", "沿古木雷痕找到被守住的稀有印泉，获得不依赖学院的成长入口"],
    continuity: ["雷角兽目前没有袭击村民，这是阿迟的观察，不是全部真相", "印记需要自愿交出或完整印核，看到生灵不等于获得能力", "撤村、活捉与探山三件事有各自时限，NPC不会等待玩家"],
    milestone: "先兑现本命形态当前的具体用途，再把第一印技展示为可接近但尚未白送的高价值机会。",
  },
  seed: {
    currencyName: "猎印钱",
    coins: 16,
    inventory: [{ id: "training-brace", name: "训练护臂", description: "能承受一次初醒形态失控的冲击", qty: 1 }, { id: "salted-meat", name: "盐肉干", description: "进山一日口粮，也可用来引开普通野兽", qty: 2 }],
    relationships: [{ id: "du-heng", name: "杜衡", role: "青栎村长", attitude: "陌生" }, { id: "a-chi", name: "阿迟", role: "年轻猎人", attitude: "陌生" }],
    capabilities: [{ id: "manifest-form", name: "显现本命形态", description: "能让所选形态显现十余息，并使用其最基础特性。", source: "初醒一级" }],
    facts: ["猎庭学院撤销了青栎村今年的入学名额", "雷角兽占住唯一山路但尚未袭村", "后山雷声出现时没有兽吼"],
    promises: [],
  },
  powers: [
    { id: "dual-aspect", name: "双相本命", description: "你的本命形态有两种可切换形态：一种强化身体，一种化为器物。", growth: "每枚印记都能在两种形态中产生不同用法，长期形成真正可组合的战斗树。", boundary: "同一时刻只能维持一种形态，切换会中断当前印技。" },
    { id: "self-grown-mark", name: "自生印", description: "你无需猎杀生灵；把一项基础动作练到极限，就能让本命形态长出对应印记。", growth: "从靠苦练得到第一印技，成长为把个人经历直接刻进形态。", boundary: "每枚自生印都需要一次可验证的极限完成，不能靠重复安全动作刷出。" },
    { id: "trait-graft", name: "借性", description: "触碰一枚尚未吸收的印核时，你可以先试用其中一个动作十息。", growth: "从试用判断相性，成长为在关键时刻临时借出稀有动作。", boundary: "一次只能借一个动作，不能保留；超过自身承受会立即中断。" },
  ],
};

export const REALMS = CINDER_RIVER.powerSystem.realms.map(({ name, rank }) => ({ name, rank }));
export const WORLDS = [CINDER_RIVER, SKY_BEAST_ISLES, WESTERN_MAGIC, ALCHEMY_WORLD, SOUL_MARK_WORLD].map((world) => validateWorldDefinition(world));

const LEGACY_CINDER_WORLD = validateWorldDefinition({
  ...CINDER_RIVER,
  description: "烬河从群山中穿过照夜城。倒流的河沿正升起淡金灵雾，凡人也有机会借今夜灵潮第一次感气；药市卖基础引气药，城外废庙留着入门吐纳石刻。修行是改变命运的直接道路，不必靠给别人跑腿才能推进。城里有药市、船帮、旧矿和不肯低头的人。你刚成年不久，境界低微，却在今夜得到一种有明确代价的异能。没有天命催你上路；救人、交易、逃走或趁乱夺利，都会留下真实后果。",
  opening: {
    ...CINDER_RIVER.opening,
    opportunities: ["可与药铺交易引气药，也可介入藏人与搜查", "可借河沿灵潮感气，需自己选择安全时机", "可离城前往有吐纳石刻的废庙，也可完全改换路线"],
    continuity: ["开局地点为南门药市", "玩家没有自动接受任何任务", "可拒绝NPC请求；自由行动以现有能力和物品为界"],
    milestone: "玩家确实改变自己的处境后再根据已发生事件调整局势，不能提前承诺结局",
  },
  powers: [
    { id: "ember-hearing", name: "烬息", description: "触碰余温，听见它最近一次剧烈变化留下的短暂回声。只能看见数息片段，越久远越模糊；连续使用会耳鸣失衡，不能读心，也不能凭空知道真相。", growth: CINDER_RIVER.powers[0].growth, boundary: CINDER_RIVER.powers[0].boundary },
    { id: "borrowed-force-seal", name: "借势印", description: "承受一次真实冲击后，可把部分力道封在掌心，并在十息内一次释放。最多存一击，身体仍会受伤；无法储存法术、毒或超过肉身承受极限的力量。", growth: CINDER_RIVER.powers[1].growth, boundary: CINDER_RIVER.powers[1].boundary },
    { id: "hollow-pouch", name: "空囊界", description: "每日三次，把手掌能完全盖住的一件无生命物收入一方静止小界，再原样取出。最多存三件，活物、燃烧物和比自身更重的东西无法进入。", growth: CINDER_RIVER.powers[2].growth, boundary: CINDER_RIVER.powers[2].boundary },
  ],
});

export function getWorld(worldId, language = "zh") {
  const world = WORLDS.find((candidate) => candidate.id === worldId);
  return world ? localizePreset(world, normalizeLanguage(language)) : undefined;
}

export function getLegacyWorld(worldId) {
  return worldId === LEGACY_CINDER_WORLD.id ? structuredClone(LEGACY_CINDER_WORLD) : undefined;
}

export function getPower(world, powerId) {
  return world?.powers.find((power) => power.id === powerId);
}

export function createSeedState(world, power) {
  const firstRealm = world.powerSystem.realms[0];
  const labels = seedLabels(world.language || "zh");
  return {
    worldId: world.id,
    realm: { ...firstRealm, progress: 0 },
    location: world.opening.location,
    currencyName: world.seed.currencyName,
    coins: world.seed.coins,
    inventory: structuredClone(world.seed.inventory),
    relationships: structuredClone(world.seed.relationships),
    capabilities: [
      { id: `power-${power.id}`, name: power.name, description: `${power.description} ${labels.boundary}: ${power.boundary}`, source: labels.starterPower },
      ...structuredClone(world.seed.capabilities),
    ],
    goal: world.opening.goal,
    turnNumber: 0,
    power: structuredClone(power),
    facts: structuredClone(world.seed.facts),
    promises: structuredClone(world.seed.promises),
  };
}

export function publicWorld(world) {
  if (!world) return null;
  const { opening, seed, ...safe } = world;
  return structuredClone(safe);
}

export function publicWorlds(customWorlds = []) {
  return publicWorldsForLanguage(customWorlds, "zh");
}

export function publicWorldsForLanguage(customWorlds = [], language = "zh") {
  const code = normalizeLanguage(language);
  return [...WORLDS.map((world) => localizePreset(world, code)), ...customWorlds].map(publicWorld);
}

export function validateWorldDefinition(input, { id, createdAt, custom = false } = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) invalidWorld("世界必须是对象");
  const language = normalizeLanguage(input.language);
  const worldId = shortId(id || input.id, "id");
  const title = text(input.title, "title", 2, maxFor(language, 40, 80));
  const subtitle = text(input.subtitle, "subtitle", 4, maxFor(language, 80, 160));
  const description = text(input.description, "description", 40, maxFor(language, 800, 1200));
  const genre = text(input.genre, "genre", 2, maxFor(language, 40, 80));
  const tags = stringList(input.tags, "tags", 2, 6, 2, maxFor(language, 24, 48));
  const sourceLabel = custom ? localizedSourceLabel({ language, custom: true, fan: isFanSourceLabel(input.sourceLabel) }) : text(input.sourceLabel, "sourceLabel", 2, 120);
  const powerSystem = validatePowerSystem(input.powerSystem, language);
  const powers = validatePowers(input.powers, language);
  const opening = validateOpening(input.opening, language);
  const seed = validateSeed(input.seed, language);
  return { id: worldId, title, subtitle, description, genre, tags, sourceLabel, powerSystem, powers, opening, seed, language, ...(createdAt || input.createdAt ? { createdAt: createdAt || input.createdAt } : {}) };
}

function validatePowerSystem(value, language) {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalidWorld("powerSystem 必须是对象");
  if (!Array.isArray(value.realms) || value.realms.length < 4 || value.realms.length > 8) invalidWorld("realms 需要 4–8 个层级");
  const realms = value.realms.map((realm, index) => {
    if (!realm || typeof realm !== "object" || realm.rank !== index) invalidWorld("realm rank 必须从 0 连续递增");
    return { name: text(realm.name, `realms[${index}].name`, 2, maxFor(language, 30, 60)), rank: index, benchmark: text(realm.benchmark, `realms[${index}].benchmark`, 8, maxFor(language, 220, 440)), unlock: text(realm.unlock, `realms[${index}].unlock`, 8, maxFor(language, 220, 440)) };
  });
  if (new Set(realms.map((realm) => realm.name)).size !== realms.length) invalidWorld("realm name 必须唯一");
  return { summary: text(value.summary, "powerSystem.summary", 20, maxFor(language, 600, 1200)), growth: text(value.growth, "powerSystem.growth", 30, maxFor(language, 800, 1600)), realms };
}

function validatePowers(value, language) {
  if (!Array.isArray(value) || value.length !== 3) invalidWorld("powers 必须恰好有 3 个");
  const powers = value.map((power, index) => {
    if (!power || typeof power !== "object") invalidWorld(`powers[${index}] 必须是对象`);
    const name = text(power.name, `powers[${index}].name`, 2, maxFor(language, 30, 60));
    return { id: shortId(power.id || slug(name, `power-${index + 1}`), `powers[${index}].id`), name, description: text(power.description, `powers[${index}].description`, 15, maxFor(language, 300, 600)), growth: text(power.growth, `powers[${index}].growth`, 15, maxFor(language, 300, 600)), boundary: text(power.boundary, `powers[${index}].boundary`, 10, maxFor(language, 260, 520)) };
  });
  if (new Set(powers.map((power) => power.id)).size !== 3 || new Set(powers.map((power) => power.name)).size !== 3) invalidWorld("power id/name 必须唯一");
  return powers;
}

function validateOpening(value, language) {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalidWorld("opening 必须是对象");
  if (!Array.isArray(value.npcMoves) || value.npcMoves.length < 2 || value.npcMoves.length > 5) invalidWorld("opening.npcMoves 需要 2–5 个 NPC");
  const npcMoves = value.npcMoves.map((npc, index) => ({ id: shortId(npc?.id || slug(npc?.name, `npc-${index + 1}`), `npcMoves[${index}].id`), name: text(npc?.name, `npcMoves[${index}].name`, 1, maxFor(language, 30, 60)), role: text(npc?.role, `npcMoves[${index}].role`, 2, maxFor(language, 40, 80)), desire: text(npc?.desire, `npcMoves[${index}].desire`, 4, maxFor(language, 100, 200)), nextMove: text(npc?.nextMove, `npcMoves[${index}].nextMove`, 5, maxFor(language, 140, 280)) }));
  return { location: text(value.location, "opening.location", 2, maxFor(language, 80, 160)), chapterTitle: text(value.chapterTitle || "初入此界", "opening.chapterTitle", 2, maxFor(language, 40, 80)), goal: text(value.goal, "opening.goal", 10, maxFor(language, 220, 440)), situation: text(value.situation, "opening.situation", 80, maxFor(language, 900, 1800)), npcMoves, opportunities: stringList(value.opportunities, "opening.opportunities", 3, 3, 10, maxFor(language, 180, 360)), continuity: stringList(value.continuity, "opening.continuity", 2, 8, 5, maxFor(language, 180, 360)), milestone: text(value.milestone, "opening.milestone", 10, maxFor(language, 260, 520)) };
}

function validateSeed(value, language) {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalidWorld("seed 必须是对象");
  if (!Number.isInteger(value.coins) || value.coins < 0 || value.coins > 1000) invalidWorld("seed.coins 必须是 0–1000 的整数");
  const inventory = objectList(value.inventory, "seed.inventory", 1, 8, (item, index) => ({ id: shortId(item?.id || `item-${index + 1}`, `seed.inventory[${index}].id`), name: text(item?.name, `seed.inventory[${index}].name`, 1, maxFor(language, 40, 80)), description: text(item?.description, `seed.inventory[${index}].description`, 4, maxFor(language, 180, 360)), qty: integer(item?.qty ?? 1, `seed.inventory[${index}].qty`, 1, 10) }));
  const relationships = objectList(value.relationships, "seed.relationships", 1, 6, (npc, index) => {
    const attitude = text(canonicalAttitude(npc?.attitude), `seed.relationships[${index}].attitude`, 2, 10);
    if (!ATTITUDES.has(attitude)) invalidWorld(`seed.relationships[${index}].attitude 无效`);
    return { id: shortId(npc?.id || `npc-${index + 1}`, `seed.relationships[${index}].id`), name: text(npc?.name, `seed.relationships[${index}].name`, 1, maxFor(language, 30, 60)), role: text(npc?.role, `seed.relationships[${index}].role`, 2, maxFor(language, 40, 80)), attitude };
  });
  const capabilities = objectList(value.capabilities || [], "seed.capabilities", 0, 5, (ability, index) => ({ id: shortId(ability?.id || `ability-${index + 1}`, `seed.capabilities[${index}].id`), name: text(ability?.name, `seed.capabilities[${index}].name`, 2, maxFor(language, 40, 80)), description: text(ability?.description, `seed.capabilities[${index}].description`, 8, maxFor(language, 220, 440)), source: text(ability?.source || "开局", `seed.capabilities[${index}].source`, 2, maxFor(language, 40, 80)) }));
  return { currencyName: text(value.currencyName, "seed.currencyName", 1, maxFor(language, 20, 40)), coins: value.coins, inventory, relationships, capabilities, facts: stringList(value.facts, "seed.facts", 2, 12, 4, maxFor(language, 180, 360)), promises: stringList(value.promises || [], "seed.promises", 0, 5, 4, maxFor(language, 180, 360)) };
}

function objectList(value, field, minimum, maximum, mapper) {
  if (!Array.isArray(value) || value.length < minimum || value.length > maximum) invalidWorld(`${field} 数量无效`);
  return value.map(mapper);
}

function stringList(value, field, minimum, maximum, minChars, maxChars) {
  if (!Array.isArray(value) || value.length < minimum || value.length > maximum) invalidWorld(`${field} 数量无效`);
  const values = value.map((item, index) => text(item, `${field}[${index}]`, minChars, maxChars));
  if (new Set(values).size !== values.length) invalidWorld(`${field} 不能重复`);
  return values;
}

function text(value, field, minimum, maximum) {
  if (typeof value !== "string") invalidWorld(`${field} 必须是文本`);
  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length < minimum || normalized.length > maximum) invalidWorld(`${field} 长度无效`);
  return normalized;
}

function integer(value, field, minimum, maximum) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) invalidWorld(`${field} 超出范围`);
  return value;
}

function maxFor(language, zh, translated) {
  return language === "zh" ? zh : translated;
}

function shortId(value, field) {
  if (typeof value !== "string" || !/^[a-z0-9][a-z0-9-]{2,79}$/.test(value)) invalidWorld(`${field} 必须是稳定英文短 id`);
  return value;
}

function slug(value, fallback) {
  const candidate = String(value || "").normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return candidate.length >= 3 ? candidate.slice(0, 80) : fallback;
}

function invalidWorld(message) {
  throw new AppError(message, { code: "INVALID_WORLD", status: 422, retryable: true });
}
