from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
def change(file,old,new):
    p=ROOT/file;text=p.read_text(encoding='utf-8-sig')
    if text.count(old)!=1:raise RuntimeError(f'{file}: expected one match, got {text.count(old)}')
    p.write_text(text.replace(old,new),encoding='utf-8')
quality='''export function liveSceneContract(game) {
  const recent = game.turns.slice(-3);
  const samePlace = recent.length >= 3 && !recent.some(t => (t.changes || []).some(c => /所在|抵达|位置/.test(c)));
  return `当轮执行准则：先兑现本次具体行动的结果，再展开新局势；成功、部分成功或失败都必须使局面发生清楚变化。不得连续把出口、暗门、谈判或夺物改成“又发现一重阻碍”来拖住读者；脱险后允许真正脱险，守卫不能每次瞬移追上。把紧张、喘息、交易、探索和短暂安心写出节奏差异。不要在正文尾部再用“他可以A也可以B”复述按钮；正文停在人物或事物的具体变化上。\n物理与记忆：触碰什么，就只能取得该对象自身留下的有限信息；烬息不是遥感、读心或预知，触摸自己的铜钱不能读取远处药柜；没有余温或相应痕迹可以无收获。普通遗物不得因方便剧情突然拥有新功能。已关的门不能无因重新开高，已写明的伤处不能从肩头换到腹部，人物离开后不能无因到场。旧计划只是可能性，旧开局不是必须重复的场景。\n所有权与成长：正文中交给玩家、花掉、吃掉、失去的关键物品和钱，必须在同轮delta中增减；别人持有的物品不自动归玩家。临时借用要写清归还与否。玩家因风险、谈判、训练赢得了可用资源、报酬、掌握能力或盟友，应及时兑现，不要只发下一条线索。不要无端送境界进度；当确实有修炼或能力掌握改善时，写出过程与新用途并记录小幅进度。若玩家选择调查而非修炼，信息收获本身即可，不必强行升级。\n只记新发生或确实确认的事实；传闻、推断、NPC的说法须注明来源，不能升级成世界真相。${samePlace ? '最近数回合仍处于近似场景：特别检查本次行动是否获得了阶段性结果，避免重复逼近/敲门/耳鸣。' : ''}`;
}
'''
(ROOT/'src/scene-contract.js').write_text(quality,encoding='utf-8')
change('src/prompts.js','import { deltaContractText } from "./delta-contract.js";','import { deltaContractText } from "./delta-contract.js";\nimport { liveSceneContract } from "./scene-contract.js";')
change('src/prompts.js','export function buildNarratorPrompt({ game, world, action, plan }) {\n  return `${deltaContractText()}\\n\\n','export function buildNarratorPrompt({ game, world, action, plan }) {\n  return `${deltaContractText()}\\n${liveSceneContract(game)}\\n\\n')
# Avoid re-injecting the original cast/location as an eternal current scene after departure.
p=ROOT/'src/prompts.js';s=p.read_text(encoding='utf-8');old='JSON.stringify({ title: world.title, description: world.description, opening: world.opening })'
if s.count(old)!=2:raise RuntimeError('world prompt object count changed')
s=s.replace(old,'JSON.stringify({ title: world.title, description: world.description, ...(game.state.turnNumber === 0 ? { opening: world.opening } : { note: "开局已结束，以当前Canon与近期事件为准；不得把人强拉回药铺" }) })')
p.write_text(s,encoding='utf-8')
change('src/config.js','version: "0.2.0",','version: "0.3.0",')
# Reject encoding damage at app entry too; never try to narrate replacement-character input.
change('src/app.js','const action = value.trim();','const action = value.trim();\n  if (action.includes("\\uFFFD")) throw new AppError("行动文字编码损坏，请重新输入", {code:"INVALID_ENCODING",status:400});')
change('public/app.js','<section class="status-card"><h3>所在之地</h3>','<section class="status-card power-status"><h3>我的天赋</h3><h2>${escapeHtml(state.power?.name || "未记录")}</h2><p>${escapeHtml(state.power?.description || "")}</p></section><section class="status-card"><h3>所在之地</h3>')
change('public/app.js','facts.slice(0,4)','facts.slice(-4)')
change('public/app.js','function renderGeneration() {','function stageLabel(name) {\n  const labels = {authored_opening_plan:"铺开开局",plan:"整理后续局势",context_assembly:"回忆当前经历",narrative_generation:"续写你的行动",parse_validate:"核对结果",repair:"修复本段结果",persistence:"保存故事"};\n  return labels[name] || (name?.startsWith("acp_") ? "连接叙事模型" : name || "请求已发出");\n}\nfunction renderGeneration() {')
change('public/app.js',"escapeHtml(app.pendingAction?.stage || '请求已发出')","escapeHtml(stageLabel(app.pendingAction?.stage))")
# Race-safe cancellation: reconcile canon, never promise non-commit without reading it.
p=ROOT/'public/app.js';s=p.read_text(encoding='utf-8');start=s.index('async function cancelTurn() {');end=s.index('\nfunction download(',start)
s=s[:start]+'''async function cancelTurn() {
  const gameId=app.game?.id; if(!gameId||!app.stream)return;
  const previousVersion=app.game.version; const controller=app.stream; const pending=app.pendingAction;
  app.stream=null; controller.abort(); app.startedAt=null; record('cancel-click',gameId);
  let cancelConfirmed=false;
  try {
    const payload=await fetchJson(`/games/${encodeURIComponent(gameId)}/cancel`,{method:'POST'});
    cancelConfirmed=Boolean(payload.cancelled);
    const current=await fetchJson(`/games/${encodeURIComponent(gameId)}`);
    if(current.game.version>previousVersion){
      app.pendingAction=null; applyGame(current.game); els.turnError.textContent='停止请求到达前，本回合已完成并保存。'; els.retryRow.hidden=true;
    } else {
      app.pendingAction=pending ? {...pending,text:'',stage:cancelConfirmed?'已停止':'停止状态待确认'}:null;
      applyGame(current.game); els.turnError.textContent=cancelConfirmed?'已确认停止，本次没有写入新回合。':'当前还没有新回合；稍后重试前会重新核对存档。'; els.retryRow.hidden=!pending?.action;
    }
  }catch(error){els.turnError.textContent=`停止状态暂未确认：${error.message}。请刷新检查存档，勿将预览当作已保存。`;els.retryRow.hidden=!pending?.action;}
  finally{renderGeneration();renderNarrative();renderActions();saveSession();}
}
async function retryTurn() {
  const action=app.pendingAction?.action;if(!action||!app.game?.id||app.stream)return;
  try {
    const previousVersion=app.game.version;
    const result=await fetchJson(`/games/${encodeURIComponent(app.game.id)}`);
    if(result.game.version>previousVersion){app.pendingAction=null;applyGame(result.game);els.turnError.textContent='已恢复上次完成的回合，没有重复执行行动。';els.retryRow.hidden=true;return;}
    applyGame(result.game);await submitAction(action);
  }catch(error){els.turnError.textContent=`暂时无法核对存档：${error.message}`;}
}'''+s[end:]
s=s.replace("els.retry.addEventListener('click', () => submitAction(app.pendingAction?.action));","els.retry.addEventListener('click', retryTurn);")
p.write_text(s,encoding='utf-8')
p=ROOT/'public/styles.css';s=p.read_text(encoding='utf-8');s+='\n/* Programmatic region focus should not outline the entire novel; controls retain focus-visible. */\n#main-content:focus { outline:none; }\n.provisional p { white-space:pre-wrap; }\n.power-status p { color:var(--mist); }\n';p.write_text(s,encoding='utf-8')
p=ROOT/'public/index.html';s=p.read_text(encoding='utf-8').replace('CHOOSE AN INTENT','决定下一步');p.write_text(s,encoding='utf-8')
p=ROOT/'package.json';data=json.loads(p.read_text(encoding='utf-8'));data['version']='0.3.0';p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Cycle2 code applied. Verify before launching experiments.')
