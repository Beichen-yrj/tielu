const dataGroup=new THREE.Group();scene.add(dataGroup);const pickables=[];
let selectedZone=null,selectedDevice=null,showLabels=!Q.has('nolabels'),showData=!Q.has('nodata'),hiddenUI=Q.has('hideui'),filmMode=false;
for(const [i,zone]of zones.entries()){
 const color=riskColors[demoRisks[i].level];
 const plane=new THREE.Mesh(new THREE.PlaneGeometry(zone.w,zone.d),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.045,depthWrite:false}));plane.rotation.x=-Math.PI/2;plane.position.set(zone.x,.4,zone.z);dataGroup.add(plane);zone.riskVisuals=[plane];
 const outline=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(zone.w,.1,zone.d)),new THREE.LineBasicMaterial({color,transparent:true,opacity:.5}));outline.position.set(zone.x,.45,zone.z);dataGroup.add(outline);zone.riskVisuals.push(outline);
 const pin=new THREE.Mesh(new THREE.SphereGeometry(.55,10,8),new THREE.MeshBasicMaterial({color}));pin.position.set(zone.x,7,zone.z);dataGroup.add(pin);zone.riskVisuals.push(pin);
 const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(zone.x,.6,zone.z),new THREE.Vector3(zone.x,7,zone.z)]),new THREE.LineBasicMaterial({color,transparent:true,opacity:.6}));dataGroup.add(line);zone.riskVisuals.push(line);
 const pick=new THREE.Mesh(new THREE.BoxGeometry(zone.w,8,zone.d),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));pick.position.set(zone.x,4,zone.z);pick.userData.zone=zone;scene.add(pick);pickables.push(pick);
 const tag=document.createElement('div');tag.className='tag';tag.style.visibility='hidden';tag.setAttribute('aria-hidden','true');tag.style.borderColor=color;tag.innerHTML=`<b>${zone.name}</b><small>${zone.en}</small><em>${riskLevels[demoRisks[i].level]}风险 · ${demoHazards.filter(h=>h.zone===i).length} 项示范隐患</em>`;$('labels').appendChild(tag);zone.tag=tag;zone.anchor=new THREE.Vector3(zone.x,9,zone.z);
}
const selectBox=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1,1,1)),new THREE.LineBasicMaterial({color:0x58bfff,transparent:true,opacity:.75}));scene.add(selectBox);selectBox.visible=false;
function inspect(zone,device=null){
 setDrawer(null);selectedZone=zone;selectedDevice=device;$('inspector').hidden=Q.has('nocard');const i=zones.indexOf(zone),risk=demoRisks[i];
 $('inspectcode').textContent=`${REGION.id} / ${zone.id} / 示范作业点`;$('inspectname').textContent=zone.name;$('inspectdesc').textContent=platformRecords===null?zone.desc:'平台评估按作业类型关联至通用布局；实际位置、隔离距离和设备配置仍需现场核实。';
 const root=$('devices');root.replaceChildren();
 if(platformRecords!==null){
  const records=platformRecords.filter(r=>r.zone===zone.id);
  for(const record of records){const card=document.createElement('section');card.className='risk-detail';
   const title=document.createElement('h4');title.textContent=record.id+' · '+record.risk+' / '+record.status;
   const text=document.createElement('p');text.textContent=record.title;
   const basis=document.createElement('small');basis.textContent=record.basis;
   const action=document.createElement('p');action.textContent=record.measure;
   card.append(title,text,basis,action);
   for(const [label,type]of[['配置此危险源情景','rail-select-source'],['查看平台评估与整改','rail-open-source']]){const b=document.createElement('button');b.className='textlink';b.textContent=label+' →';b.onclick=()=>window.parent.postMessage({type,id:record.id},location.origin);card.appendChild(b);}
   root.appendChild(card);
  }
  if(!records.length){const p=document.createElement('p');p.textContent='当前模板作业点未关联平台记录，不代表现场无风险。';root.appendChild(p);}
 }else{
 const card=document.createElement('div');card.className='risk-detail';card.innerHTML=`<span style="color:${riskColors[risk.level]}">${riskLevels[risk.level]}风险 · ${risk.id}</span><h4>${risk.subject}</h4><p>${risk.measure}</p><small>${risk.basis}</small>`;root.appendChild(card);
 for(const hazard of demoHazards.filter(h=>h.zone===i)){const el=document.createElement('div');el.className='hazard-detail';el.innerHTML=`<b>${hazard.id} · ${hazard.stage}</b><p>${hazard.title}</p><small>责任：${hazard.owner}<br>${hazard.due}<br>证据：${hazard.evidence}</small>`;root.appendChild(el);}
 if(!demoHazards.some(h=>h.zone===i)){const el=document.createElement('p');el.textContent='此作业点暂无示范隐患记录；不代表现场已通过检查。';root.appendChild(el);}
 }
 $('inspectpoint').textContent=platformRecords===null?SIM.stations[i].id+' · '+REGION.station:'模板位置 '+zone.id+' / 非现场坐标';selectBox.visible=true;selectBox.position.set(zone.x,2,zone.z);selectBox.scale.set(zone.w+.3,4,zone.d+.3);$('focusDevice').textContent='聚焦此作业点 →';$('workpoint').value=zone.id;
}
function updateLabels(){
 const placed=[], bounds=[...document.querySelectorAll('.left,.right,.inspector,.top,.scopebar,.viewtitle,.yard-index,.bottom,.mobile-summary,.floor-caption,.legend')].filter(el=>{const css=getComputedStyle(el);return !el.hidden&&css.display!=='none'&&css.visibility!=='hidden'&&css.opacity!=='0'}).map(el=>el.getBoundingClientRect());
 for(const zone of zones){const p=zone.anchor.clone().project(camera),x=(p.x*.5+.5)*innerWidth,y=(-p.y*.5+.5)*innerHeight;
 // visibility preserves the real text dimensions while hidden. display:none
 // returned zero and made the old fallback alternate between two hit boxes.
 const width=zone.tag.offsetWidth,height=zone.tag.offsetHeight,rect={x:x-width/2,y:y-height,w:width,h:height+15};
 const gap=zone.labelVisible?8:14,edge=zone.labelVisible?12:18;
 let visible=showLabels&&!hiddenUI&&width>0&&height>0&&p.z>-1&&p.z<1&&rect.x>edge&&rect.x+rect.w<innerWidth-edge&&rect.y>edge&&rect.y+rect.h<innerHeight-edge;
 if(bounds.some(a=>rect.x<a.right+gap&&rect.x+rect.w>a.left-gap&&rect.y<a.bottom+gap&&rect.y+rect.h>a.top-gap)||placed.some(a=>rect.x<a.x+a.w+gap&&rect.x+rect.w>a.x-gap&&rect.y<a.y+a.h+gap&&rect.y+rect.h>a.y-gap))visible=false;
 if(visible)placed.push(rect);zone.labelVisible=visible;zone.tag.style.visibility=visible?'visible':'hidden';zone.tag.setAttribute('aria-hidden',String(!visible));zone.tag.style.left=`${x}px`;zone.tag.style.top=`${y}px`;
 }
}
function updateHUD(){$('clock').textContent=clockText();$('rate').textContent=SIM.rate+'×';$('motion').textContent=SIM.playing?'Ⅱ 动态暂停':'▷ 动态继续';$('motion').setAttribute('aria-pressed',String(!SIM.playing));$('motionStatus').textContent=SIM.playing?'● 列车通行 · 4 人巡检 / 动态演示':'Ⅱ 列车与巡检已暂停 / 动态演示';}
// Both modes use the same renderer; teaching fixtures remain explicitly separate.
function dashboardRecords(){
 if(platformRecords!==null)return platformRecords;
 const records=demoRisks.map(r=>({id:r.id,station:REGION.station,title:r.subject,hazardName:r.subject,zone:zones[r.zone].id,risk:riskLevels[r.level],status:'评估样例',hasHazard:false,basis:r.basis,measure:r.measure}));
 // Each fixture risk receives its own problem where available; remaining fixture hazards are additional assessments.
 for(const h of demoHazards){const target=records.find(r=>r.zone===zones[h.zone].id&&!r.hasHazard);if(target)Object.assign(target,{title:h.title,status:h.stage,hasHazard:true,overdue:h.overdue});else records.push({id:h.id,station:REGION.station,title:h.title,hazardName:riskSubjects[h.zone],zone:zones[h.zone].id,risk:riskLevels[demoRisks[h.zone].level],status:h.stage,hasHazard:true,overdue:h.overdue,measure:demoRisks[h.zone].measure});}
 return records;
}
function textNode(tag,className,text){const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=String(text);return el;}
function locateRecord(record){const i=zones.findIndex(z=>z.id===record.zone);if(i>=0)chooseZone(i);}
function sourceButton(record){const b=textNode('button','source-link',platformRecords===null?'查看作业点 →':'查看来源评估 →');b.onclick=()=>platformRecords===null?locateRecord(record):window.parent.postMessage({type:'rail-open-source',id:record.id},location.origin);return b;}
function renderDashboard(){
 const teaching=platformRecords===null,records=dashboardRecords(),summary=dashboardSummary(records),m=regionMetrics();
 // Standalone fixtures explicitly include a historical aggregate with no individual evidence or time data.
 const closed=teaching?m.closed:summary.closed,totalHazards=teaching?m.total:summary.hazards,closure=teaching?m.closure:summary.closure;
 const counts=teaching?m.counts:summary.counts,total=counts.reduce((a,b)=>a+b,0);
 $('riskPanelTitle').textContent=teaching?'教学风险等级与评估':'原平台风险等级';
 $('governancePanelTitle').textContent=teaching?'教学整改与闭环效能':'平台整改与闭环效能';
 $('riskTotal').textContent=total;
 let cursor=0;const segments=counts.map((count,i)=>{const start=cursor;cursor+=total?count/total*100:0;return riskColors[i]+' '+start+'% '+cursor+'%';});
 $('riskPie').style.background=total?'conic-gradient('+segments.join(',')+')':'#15365a';
 $('riskPie').setAttribute('aria-label','风险等级分布：'+riskLevels.map((label,i)=>label+' '+counts[i]+' 项').join('，'));
 $('riskCounts').replaceChildren();riskLevels.forEach((level,i)=>{
  const b=textNode('button','risk-count');b.style.setProperty('--risk',riskColors[i]);b.append(textNode('span','',level),textNode('strong','',counts[i]),textNode('small','',total?Math.round(counts[i]/total*100)+'%':'—'));
  b.onclick=()=>{if(teaching){const r=demoRisks.find(r=>r.level===i);if(r)chooseZone(r.zone);else notice('当前没有该等级示例');}else{const r=records.find(r=>r.risk===level);if(r)locateRecord(r);else notice('当前范围没有该等级评估记录');}};$('riskCounts').appendChild(b);
 });
 $('riskScopeNote').textContent=teaching?'教学分级样例 · 非实时监测':'原评估等级分布（含已闭环历史） · '+platformSource;
 $('problemCount').textContent=records.length+' 条';$('problemList').replaceChildren();
 for(const record of records){
  const card=textNode('article','assessment-card');const head=textNode('div','assessment-meta');const level=textNode('span','risk-badge',record.risk);level.style.setProperty('--risk',riskColors[riskLevels.indexOf(record.risk)]);head.append(level,textNode('span','',record.hasHazard?record.status:'未识别隐患'));
  const title=textNode('button','problem-title',record.title||record.hazardName||'问题说明待补');title.onclick=()=>locateRecord(record);
  card.append(head,title,textNode('small','record-location',record.station+' · '+record.hazardName));
  if(record.measured)card.append(textNode('p','measurement','检测：'+record.measured));if(record.standard)card.append(textNode('p','measurement','标准：'+record.standard));
  card.append(sourceButton(record));$('problemList').appendChild(card);
 }
 if(!records.length)$('problemList').appendChild(textNode('p','dashboard-empty','暂无可访问评估记录，请从原平台录入或同步。'));
 $('closureCount').textContent=closure===null?'—':closure+'%';$('closurePie').style.background=closure===null?'#15365a':`conic-gradient(#3bd6de ${closure}%,#15365a 0)`;
 $('closurePie').setAttribute('aria-label',closure===null?'闭环率未知：当前没有隐患记录':'闭环率 '+closure+'%，已闭环 '+closed+' / 隐患 '+totalHazards);
 $('openCount').textContent=teaching?m.open:summary.open;$('closedCount').textContent=closed;$('reviewCount').textContent=m.review;
 $('closureNote').textContent=`已闭环 ${closed} / 全部隐患 ${totalHazards}`+(teaching?' · 教学汇总':' · 原治理状态');
 $('overdueCount').textContent=teaching?m.overdue:'未知';
 $('averageDuration').textContent=summary.averageHours===null?'未知':summary.averageHours>=24?(summary.averageHours/24).toFixed(1)+' 天':summary.averageHours.toFixed(1)+' 小时';
 $('efficiencyNote').textContent=summary.durationSamples?`记录创建至最终闭环均值 · 有效 ${summary.durationSamples}/${closed} 项；无期限字段，逾期未知`:'缺少完整创建 / 闭环时间，耗时未知；无期限字段不推断逾期。';
 if(teaching)$('efficiencyNote').textContent='教学汇总无完整时间日志，耗时未知；逾期为显式教学标记。';
 const values=[...summary.stageCounts];if(teaching)values[5]=m.closed;const max=Math.max(1,...values);$('statusChart').replaceChildren();
 for(const [i,label]of summary.stages.entries()){
  const row=textNode('div','trapezoid-row');row.style.setProperty('--stage-color',['#2484ed','#20aae8','#29becd','#50c7ab','#a29cf5','#648bf3'][i]);
  const shape=textNode('i','trapezoid-shape');shape.style.width=(values[i]?35+65*values[i]/max:0)+'%';
  row.append(shape,textNode('span','',label==='待项目经理确认'?'待经理确认':label),textNode('b','',values[i]));$('statusChart').appendChild(row);
 }
 $('statusChartNote').textContent='各阶段当前存量 · 非累计转化漏斗'+(summary.unknown?'；未识别状态 '+summary.unknown+' 项':'');
 $('measureCount').textContent=summary.measures.length+' 类';$('measureList').replaceChildren();
 for(const item of summary.measures){
  const details=textNode('details','measure-card'),title=textNode('summary','');title.append(textNode('span','',item.text),textNode('b','',item.records.length+' 项'));details.appendChild(title);
  for(const record of item.records){const source=textNode('div','measure-source');source.append(textNode('small','',record.station+' · '+record.id+' · '+record.status),sourceButton(record));details.appendChild(source);}$('measureList').appendChild(details);
 }
 if(!summary.measures.length)$('measureList').appendChild(textNode('p','dashboard-empty','暂无可汇总的整改措施'));
 $('measureNote').textContent='按原措施文字去重汇总'+(summary.missingMeasures?' · '+summary.missingMeasures+' 项措施待补':'')+'；点击展开查看来源。';
 $('mobileAssessments').textContent=(teaching?'教学评估 ':'平台评估 ')+total+' 项';
 $('mobileHazards').textContent='未闭环 '+(teaching?m.open:summary.open)+' 项';
}
function renderRecords(){
 $('stationName').textContent=REGION.station;$('stationSubtitle').textContent=REGION.terrain+' / 非实测布局';$('terrainText').textContent=REGION.terrain;$('attentionText').textContent=REGION.attention;$('trackCount').textContent=REGION.tracks.length+' 条示范股道';$('drawingStation').textContent=REGION.id+' / '+REGION.station;$('region').value=REGION.id;
 if($('workpoint').options.length===1)for(const z of zones){const o=document.createElement('option');o.value=z.id;o.textContent=z.name;$('workpoint').appendChild(o);}
 if(platformRecords!==null){renderPlatformRecords();return;}renderDashboard();
}
function renderPlatformRecords(){
 document.querySelector('.sync').textContent=platformSource;
 document.querySelector('.demo-badge').textContent='平台快照 · 模板映射';
 document.querySelector('.floor-caption').lastChild.textContent='按原平台评估与整改记录展示 · 不改变等级与治理状态';
 $('stationSubtitle').textContent='跨站记录按作业类型映射 / 非真实场站测绘';
 $('stationName').textContent=REGION.name+'布局模板 · 平台记录';$('drawingStation').textContent=REGION.id+' / 平台记录模板';
 renderDashboard();
 for(const zone of zones){const records=platformRecords.filter(r=>r.zone===zone.id),level=records.length?Math.min(...records.map(r=>riskLevels.indexOf(r.risk))):-1,color=level<0?'#70879a':riskColors[level];zone.riskVisuals.forEach(mesh=>{mesh.visible=records.length>0;mesh.material.color.set(color)});zone.tag.style.borderColor=color;zone.tag.querySelector('em').textContent=records.length?records.length+' 条平台评估 · '+riskLevels[level]:'未关联平台记录';}
}
window.addEventListener('message',event=>{
 if(event.source!==window.parent||event.origin!==location.origin||event.data?.type!=='rail-platform-records'||!Q.has('platform'))return;
 const records=event.data.records;if(!Array.isArray(records)||records.length>10000)return;
 platformRecords=records.filter(r=>r&&['Z02','Z03','Z05'].includes(r.zone)&&riskLevels.includes(r.risk)&&typeof r.id==='string'&&typeof r.title==='string'&&typeof r.hasHazard==='boolean');
 platformSource=String(event.data.sourceLabel||'平台记录快照').slice(0,100);renderPlatformRecords();
});
