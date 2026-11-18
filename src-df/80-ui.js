let scenarioParameters={temperature:'',wind:'',direction:'',targets:''};
const parameterKey='rail-yard-parameters-v1-'+REGION.id;
try{const saved=JSON.parse(sessionStorage.getItem(parameterKey)||'null');if(saved&&typeof saved==='object')for(const key of Object.keys(scenarioParameters))if(typeof saved[key]==='string')scenarioParameters[key]=saved[key];}catch{/* Session storage can be unavailable for a local file. */}
function openParameters(){stopTour();$('parameterScope').textContent=REGION.station+' / '+REGION.terrain;for(const key of Object.keys(scenarioParameters))$('parameterForm').elements.namedItem(key).value=scenarioParameters[key];$('parameterDialog').showModal();}
function parameterLabel(value,unit=''){return value===''?'未录入':value+unit;}
function reportText(){const m=regionMetrics();if(platformRecords!==null)return ['平台记录与模板映射简报',platformSource,'布局：'+REGION.station+'（非实际场站测绘）',`评估 ${platformRecords.length} 条；未闭环 ${m.open}；已闭环 ${m.closed}；逾期未知`,...platformRecords.map(r=>`${r.id} | ${r.station} | ${r.risk} | ${r.status}\n${r.hazardName}：${r.title}\n原依据：${r.basis}\n原措施：${r.measure}`),'未改变平台风险等级与整改状态；正式复核在原平台办理。'].join('\n\n');return [
 REGION.station+' · 风险与隐患示范简报',
 '资料属性：本地教学样例 / 非实测布局 / 非真实站场档案',
 '地区环境：'+REGION.terrain,
 '布局：'+REGION.tracks.length+' 条示范股道，6 个作业点',
 '检查关注：'+REGION.attention,
 '',
 '一、演练环境假设（未知不补零）',
 '温度：'+parameterLabel(scenarioParameters.temperature,' °C'),
 '风速：'+parameterLabel(scenarioParameters.wind,' m/s'),
 '风向：'+parameterLabel(scenarioParameters.direction,' °（气象来向）'),
 '周边敏感目标：'+parameterLabel(scenarioParameters.targets),
 '',
 '二、示范风险评估记录',
 ...demoRisks.map(r=>`${r.id}｜${zones[r.zone].name}｜${riskLevels[r.level]}风险\n  ${r.subject}\n  管控建议：${r.measure}\n  依据：${r.basis}`),
 '',
 '三、示范隐患治理记录',
 `当前未闭环 ${m.open} 项，逾期 ${m.overdue} 项，待复核 ${m.review} 项。`,
 `示范闭环率 ${m.closure}%（已闭环 ${m.closed} / 全部 ${m.total}）。`,
 ...demoHazards.map(h=>`${h.id}｜${h.title}｜${h.stage}${h.overdue?' / 示范逾期':''}\n  位置：${zones[h.zone].name}；责任：${h.owner}\n  证据：${h.evidence}`),
 '',
 '四、边界与待补资料',
 '上述分级为人工给定的教学样例，未关联现场照片、检测值或正式业务任务。',
 '演练环境假设不改变原风险等级，不自动产生隐患。',
 '正式评估、整改、复核和销号在原系统办理。',
 '此版本未接入爆炸超压、热辐射、伤害半径计算及推演资料回写。',
 '正式使用须补充站场测绘、办理范围、参数来源、现场证据和适用判据。'
 ].join('\n');}
function openReport(){stopTour();$('reportContent').textContent=reportText();$('reportDialog').showModal();}
$('parameters').addEventListener('click',openParameters);$('mobileParameters').addEventListener('click',openParameters);
$('closeParameters').addEventListener('click',()=>$('parameterDialog').close());
$('parameterForm').addEventListener('submit',e=>{e.preventDefault();if(!$('parameterForm').reportValidity())return;for(const key of Object.keys(scenarioParameters))scenarioParameters[key]=$('parameterForm').elements.namedItem(key).value.trim();let persisted=true;try{sessionStorage.setItem(parameterKey,JSON.stringify(scenarioParameters));}catch{persisted=false;}$('parameterDialog').close();notice(persisted?'已保存本地区演练假设；风险等级保持原记录':'已应用本页演练假设；当前浏览器不支持会话保存');});
$('clearParameters').addEventListener('click',()=>{for(const key of Object.keys(scenarioParameters)){scenarioParameters[key]='';$('parameterForm').elements.namedItem(key).value='';}try{sessionStorage.removeItem(parameterKey);}catch{/* In-memory values have still been cleared. */}notice('本地区演练参数已清空，未知值未补零');});
$('reportButton').addEventListener('click',openReport);$('mobileReport').addEventListener('click',openReport);$('closeReport').addEventListener('click',()=>$('reportDialog').close());
$('downloadReport').addEventListener('click',()=>{const blob=new Blob([reportText()],{type:'text/markdown;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=REGION.station+'-示范简报.md';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);});
$('mobileHazards').textContent='未闭环 '+regionMetrics().open+' 项';
