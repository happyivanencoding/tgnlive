export const WORLDS = [
  {
    id: "cinder-river",
    title: "烬河照夜",
    subtitle: "边城将乱，一点异能足以改命",
    description: "烬河从群山中穿过照夜城。城里有药市、船帮、旧矿和不肯低头的人。你刚成年不久，境界低微，却在今夜得到一种有明确代价的异能。没有天命催你上路；救人、交易、逃走或趁乱夺利，都会留下真实后果。",
    opening: {
      location: "照夜城南门药市",
      goal: "先在封城前活过今夜，并决定要相信谁",
      situation: "暮鼓未停，烬河忽然倒流半尺。药市掌柜沈秋禾正把一个受伤少年藏进药柜，巡夜校尉韩峥带兵逐摊搜查，河堤方向则传来矿奴砸门的喊声。沈秋禾想保住少年和药铺；韩峥急着找到失窃的赤砂令；那少年紧攥一枚染血铜片，只求不要被带回旧矿。三方愿望彼此冲突，玩家可以介入，也可以离开。",
    },
    powers: [
      {
        id: "ember-hearing",
        name: "烬息",
        description: "触碰余温，听见它最近一次剧烈变化留下的短暂回声。只能看见数息片段，越久远越模糊；连续使用会耳鸣失衡，不能读心，也不能凭空知道真相。",
      },
      {
        id: "borrowed-force-seal",
        name: "借势印",
        description: "承受一次真实冲击后，可把部分力道封在掌心，并在十息内一次释放。最多存一击，身体仍会受伤；无法储存法术、毒或超过肉身承受极限的力量。",
      },
      {
        id: "hollow-pouch",
        name: "空囊界",
        description: "每日三次，把手掌能完全盖住的一件无生命物收入一方静止小界，再原样取出。最多存三件，活物、燃烧物和比自身更重的东西无法进入。",
      },
    ],
  },
];

export const REALMS = [
  { name: "凡身", rank: 0 },
  { name: "引气一层", rank: 1 },
  { name: "引气二层", rank: 2 },
  { name: "引气三层", rank: 3 },
  { name: "凝脉初境", rank: 4 },
];

export function getWorld(worldId) {
  return WORLDS.find((world) => world.id === worldId);
}

export function getPower(world, powerId) {
  return world?.powers.find((power) => power.id === powerId);
}

export function createSeedState(world, power) {
  return {
    realm: { ...REALMS[0], progress: 0 },
    location: world.opening.location,
    coins: 18,
    inventory: [
      { id: "plain-clothes", name: "旧布外衣", description: "洗得发白，但足够遮风", qty: 1 },
      { id: "copper-token", name: "母亲留下的铜钱", description: "边缘有一道月牙缺口", qty: 1 },
    ],
    relationships: [
      { id: "shen-qiuhua", name: "沈秋禾", role: "药市掌柜", attitude: "陌生" },
      { id: "han-zheng", name: "韩峥", role: "巡夜校尉", attitude: "陌生" },
    ],
    goal: world.opening.goal,
    turnNumber: 0,
    power: { id: power.id, name: power.name, description: power.description },
    facts: ["烬河今夜反常倒流", "照夜城正在临时封城"],
    promises: [],
  };
}

export function publicWorlds() {
  return WORLDS.map(({ opening, ...world }) => world);
}
