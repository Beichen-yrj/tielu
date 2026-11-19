// Deterministic qualitative VFX. No concentration, blast pressure or safe distance is calculated.
const accident={active:false,time:0,playing:false,rate:1,event:'leak',elapsed:0,stage:-1,config:null};
const accidentGroup=new THREE.Group();accidentGroup.visible=false;scene.add(accidentGroup);
const accidentMarker=new THREE.Mesh(new THREE.SphereGeometry(.27,12,8),new THREE.MeshBasicMaterial({color:0xff745e}));accidentGroup.add(accidentMarker);
const accidentOutline=new THREE.Mesh(new THREE.TorusGeometry(.65,.045,7,40),new THREE.MeshBasicMaterial({color:0xffbd69}));accidentOutline.rotation.x=Math.PI/2;accidentGroup.add(accidentOutline);
function plumeTexture(){
 const size=64,pixels=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const dx=(x+.5)/32-1,dy=(y+.5)/32-1,r=Math.hypot(dx,dy),noise=.8+.12*Math.sin(x*.39+y*.31)+.08*Math.sin(x*.93-y*.67),i=(y*size+x)*4;pixels[i]=pixels[i+1]=pixels[i+2]=255;pixels[i+3]=Math.round(Math.pow(Math.max(0,1-r),1.8)*noise*220);}
 const tex=new THREE.DataTexture(pixels,size,size,THREE.RGBAFormat);tex.needsUpdate=true;return tex;
}
const softParticle=plumeTexture(),particleGeometry=new THREE.PlaneGeometry(1,1);
function particles(count,color,additive=false){const mesh=new THREE.InstancedMesh(particleGeometry,new THREE.MeshBasicMaterial({map:softParticle,color,transparent:true,opacity:1,depthWrite:false,side:THREE.DoubleSide,blending:additive?THREE.AdditiveBlending:THREE.NormalBlending}),count);mesh.frustumCulled=false;accidentGroup.add(mesh);return mesh;}
const gas=particles(180,0xa8b9bd),flames=particles(90,0xffa440,true),spray=particles(65,0xc8e6f2);
const flash=new THREE.Mesh(new THREE.SphereGeometry(1,16,12),new THREE.MeshBasicMaterial({color:0xffc067,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}));accidentGroup.add(flash);
const pool=new THREE.Mesh(new THREE.CircleGeometry(1,48),new THREE.MeshStandardMaterial({color:0x555f48,transparent:true,opacity:.8,roughness:.25,metalness:.25,depthWrite:false,side:THREE.DoubleSide}));pool.rotation.x=-Math.PI/2;accidentGroup.add(pool);
const accidentLight=new THREE.PointLight(0xff8e36,0,30,2);accidentGroup.add(accidentLight);
const windArrow=new THREE.ArrowHelper(new THREE.Vector3(1,0,0),new THREE.Vector3(0,6,0),5,0x69c9ff,1,.55);accidentGroup.add(windArrow);
const responders=new THREE.Group();scene.add(responders);const responseActors=[];
const stageNames=['作业背景','问题定位','过程演示','后果与整改'];
function accidentStatus(){if(window.parent!==window)window.parent.postMessage({type:'rail-scene-status',time:accident.time,playing:accident.playing,rate:accident.rate},location.origin);}
function configureAccident(config){
 if(!Q.has('scenario')||!config||config.region!==REGION.id||!['Z02','Z03','Z05'].includes(config.zone)||!['leak','fire','explosion','dispersion','control'].includes(config.event))return;
 const material=['unknown','flammable_liquid','flammable_gas','toxic_gas','corrosive_liquid','other'].includes(config.material)?config.material:'unknown',combustible=['flammable_liquid','flammable_gas'].includes(material);
 if(['fire','explosion'].includes(config.event)&&(!combustible||config.ignition!==true))return;
 if(config.event==='explosion'&&config.accumulation!==true)return;
 if(config.event==='dispersion'&&!['flammable_gas','toxic_gas'].includes(material))return;
 const finite=(v,min,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max?v:null;
 accident.config={...config,material,wind:finite(config.wind,0,100),direction:finite(config.direction,0,359),release:['seep','jet','rupture'].includes(config.release)?config.release:'seep',mitigated:config.mitigated===true};
 accident.active=true;accident.time=0;accident.playing=false;accident.rate=1;accident.event=config.event;accident.stage=-1;
 const point=config.zone==='Z02'?[REGION.platformX-6,2.8,tankTrack+1.35]:config.zone==='Z03'?[REGION.goodsX+2.2,2.3,goodsTrack+6.5]:[58,1.8,32.4];
 accidentGroup.position.set(...point);accidentGroup.visible=true;pool.position.set(1,-point[1]+(config.zone==='Z03'?1.44:.4),0);accidentOutline.position.y=-point[1]+.42;
 view={tx:point[0],ty:3,tz:point[2],azim:.65,elev:.44,dist:53,fov:44};transition=null;stopTour();SIM.playing=false;
 while(responders.children.length)responders.remove(responders.children[0]);responseActors.length=0;
 for(let i=0;i<2;i++){const template=anim.patrols[config.zone==='Z02'?0:config.zone==='Z03'?1:2],actor=template.group.clone(true);responders.add(actor);responseActors.push({actor,startX:point[0]+3+i*3,z:config.zone==='Z02'?tankTrack+5.6:config.zone==='Z03'?goodsTrack+8.4:39.3,height:template.height});}
 $('scenarioProblem').textContent=String(config.problem||'').slice(0,2000);
 const consequence=String(config.caption||config.consequence||'').trim();
 const consequenceNode=$('scenarioConsequence');if(consequenceNode)consequenceNode.textContent=consequence.slice(0,240);
 applyCamera();updateAccident(0);accidentStatus();
}
function updateAccident(dt){
 if(!accident.active)return;
 if(accident.playing){accident.time=Math.min(24,accident.time+dt*accident.rate);if(accident.time>=24)accident.playing=false;}
 const t=accident.time,c=accident.config,stage=Math.min(3,Math.floor(t/6)),elapsed=Math.max(0,t-12),physical=c.event!=='control'&&c.material!=='other',known=c.material!=='unknown',liquid=['flammable_liquid','corrosive_liquid'].includes(c.material);
 const flowScale={seep:.45,jet:1,rupture:1.7}[c.release],mitigation=c.mitigated&&t>=18?Math.max(.12,1-(t-18)/5):1;
 const windKnown=c.wind!==null&&c.direction!==null,angle=(c.direction||0)*Math.PI/180,drift=windKnown?Math.min(10,c.wind)*.36:0,wx=-Math.sin(angle),wz=Math.cos(angle),burning=physical&&['fire','explosion'].includes(c.event)&&t>=14;
 accidentMarker.visible=stage>=1;accidentMarker.scale.setScalar(1+Math.sin(t*5)*.12);accidentOutline.visible=stage>=1;
 spray.visible=physical&&known&&liquid&&elapsed>0;pool.visible=spray.visible;gas.visible=physical&&known&&elapsed>0&&(!liquid||burning);flames.visible=burning;flash.visible=c.event==='explosion'&&t>=15.2&&t<16.1;
 windArrow.visible=stage>=1&&windKnown;if(windKnown)windArrow.setDirection(new THREE.Vector3(wx,0,wz));
 // Face the camera in world space: the emitter has translation only.
 tmpQ.copy(camera.quaternion);
 for(let i=0;i<180;i++){
  const phase=(i*.618+t*.18)%1,age=phase*5,a=i*2.4,buoyancy=burning?age*1.35:Math.min(.4,age*.06),height=liquid?Math.max(-accidentGroup.position.y+.5,buoyancy):Math.max(-accidentGroup.position.y+.6,buoyancy-age*.12),spread=(.3+age*.32)*flowScale;
  tmpV.set(wx*drift*age+Math.sin(a+age*.7)*spread,height+Math.sin(a*1.7+age)*.25,wz*drift*age+Math.cos(a+age*.6)*spread);
  const size=(1+age*.5)*flowScale*mitigation*Math.min(1,elapsed/2),fade=Math.sin(phase*Math.PI);tmpScale.set(size,size*(burning?1.3:.65),size);tmpMatrix.compose(tmpV,tmpQ,tmpScale);gas.setMatrixAt(i,tmpMatrix);gas.setColorAt(i,new THREE.Color().setRGB((burning?.22:.75)*fade,(burning?.25:c.material==='toxic_gas'?.8:.85)*fade,(burning?.29:.9)*fade));
 }gas.instanceMatrix.needsUpdate=true;if(gas.instanceColor)gas.instanceColor.needsUpdate=true;
 for(let i=0;i<90;i++){
  const phase=(i*.38197+t*.65)%1,a=i*2.4,r=Math.sqrt((i+.5)/90)*flowScale,life=Math.sin(phase*Math.PI),size=(.7+life*1.3)*flowScale*mitigation;
  tmpV.set(Math.sin(a)*r+wx*drift*phase*.4,phase*(3.8+flowScale)+.1,Math.cos(a)*r+wz*drift*phase*.4);tmpScale.set(size,size*1.9,size);tmpMatrix.compose(tmpV,tmpQ,tmpScale);flames.setMatrixAt(i,tmpMatrix);flames.setColorAt(i,new THREE.Color().setRGB(1,Math.max(.12,.85-phase*.65),Math.max(.01,.2-phase*.3)));
 }flames.instanceMatrix.needsUpdate=true;if(flames.instanceColor)flames.instanceColor.needsUpdate=true;
 for(let i=0;i<65;i++){const p=(i*.618+t*1.3)%1,range=c.release==='jet'?2.8:1.2;tmpV.set(p*range*flowScale,p*.35-p*p*(accidentGroup.position.y+.6),Math.sin(i*8.1)*p*.18);tmpScale.set(.06*flowScale*mitigation,.22*flowScale*mitigation,.08);tmpMatrix.compose(tmpV,tmpQ,tmpScale);spray.setMatrixAt(i,tmpMatrix);}spray.instanceMatrix.needsUpdate=true;
 pool.scale.set((.5+Math.sqrt(c.mitigated?Math.min(elapsed,6):elapsed)*.65)*flowScale,(.35+Math.sqrt(c.mitigated?Math.min(elapsed,6):elapsed)*.3)*flowScale,1);pool.material.color.set(c.material==='corrosive_liquid'?0x607b65:0x494b3a);
 const blast=clamp((t-15.2)/.9,0,1);flash.scale.setScalar(.5+blast*5*flowScale);flash.material.opacity=flash.visible?Math.pow(1-blast,2)*.8:0;accidentLight.intensity=burning?(3+Math.sin(t*13)*.7)*mitigation:0;
 // Illustrative retreat along existing pedestrian strips; no computed evacuation route.
 updateMovement(Math.min(t,12));for(const p of anim.patrols)p.group.visible=!(stage>=2&&p.zone===(c.zone==='Z02'?1:c.zone==='Z03'?2:5));
 for(const {actor,startX,z,height}of responseActors){actor.visible=stage>=1;actor.position.set(Math.min(85,startX+Math.max(0,t-12)*.8),height,z);actor.rotation.y=Math.PI/2;}
 if(stage!==accident.stage){accident.stage=stage;$('scenarioStage').textContent='0'+(stage+1)+' / '+stageNames[stage];}
 const consequenceNode=$('scenarioConsequence');
 if(consequenceNode){const caption=String(c.caption||c.consequence||'').trim();const stageHint=stage>=3?'当前阶段：后果观察与整改响应。':stage>=2?'当前阶段：按条件展示局部后果演示。':stage>=1?'当前阶段：定位问题对象并启动巡检。':'当前阶段：作业背景与风险对象。';consequenceNode.textContent=(caption?caption+' · ':'')+stageHint;}
 const materialText={unknown:'物态未知：仅定位，不虚构泄漏形态',flammable_liquid:'液体泄漏 / 液池',flammable_gas:'可燃气云 / 条件性点火',toxic_gas:'有毒气云（示意着色）',corrosive_liquid:'液体泄漏 / 收集隔离',other:'非燃烧类：防控检查'}[c.material];
 const sub=$('scenarioConditions');if(sub)sub.textContent=(c.event==='control'?'作业防控检查 · 无泄漏或燃烧':materialText)+' · '+(windKnown?`风 ${c.wind} m/s，来向 ${c.direction}°`:'风况未知：中性示意')+' · '+(c.mitigated?'防控措施对比假设':'未施加对比措施');
 accident.elapsed+=dt;if(accident.elapsed>.15){accidentStatus();accident.elapsed=0;}
}
if(Q.has('scenario')){
 document.body.classList.add('scenario-mode');
 window.addEventListener('message',event=>{
  if(event.source!==window.parent||event.origin!==location.origin)return;
  const data=event.data;if(!data||typeof data!=='object')return;
  if(data.type==='rail-scene-configure'){configureAccident(data.config);return;}
  if(data.type!=='rail-scene-command'||!accident.active)return;
  if(data.command==='play'){if(accident.time>=24)accident.time=0;accident.playing=true;}
  if(data.command==='pause')accident.playing=false;
  if(data.command==='restart'){accident.time=0;accident.playing=true;}
  if(data.command==='seek'&&Number.isFinite(data.time)){accident.time=clamp(data.time,0,24);accident.playing=false;}
  if(data.command==='rate'&&[1,2,4].includes(data.rate))accident.rate=data.rate;
  updateAccident(0);accidentStatus();
 });
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&window.parent!==window)window.parent.postMessage({type:'rail-simulation-close'},location.origin);});
 if(window.parent!==window)window.parent.postMessage({type:'rail-scene-ready'},location.origin);
}
