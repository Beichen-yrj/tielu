// Ancillary railway campus. Coordinates are generic, not surveyed or approved clearances.
// The new buildings/vehicles stay south of the loading tracks and the existing fire road.
const yardContext={buildings:[],vehicles:[],landscape:[],utility:[],rollingStock:[]};
mat('wall',0xaebcc6,.05,.87);
mat('roofBlue',0x285b86,.3,.65);mat('roofLight',0x7191a4,.25,.72);
mat('grass',REGION.id==='NW'?0x7a8057:0x466c51,.01,.98);
mat('curb',0xa8b0ad,.03,.95);mat('safetyBlue',0x187bb5,.1,.7);
mat('brick',0x887665,.02,.9);mat('roadPaint',0xc8cbbd,.01,.88);

// Extend only the service campus; keep the regional waterfront/hills to the north.
box('dark',0,-.8,70,204,1.4,36);box('land',0,-.13,70,200,.3,36);
box('asphalt',0,.06,59,196,.12,9);
for(const z of[54.6,63.4])box('roadPaint',0,.14,z,196,.025,.12);
for(let x=-93;x<96;x+=7)box('roadPaint',x,.14,59,3,.025,.12);
// Gate access links the existing roadway through the pre-existing fence opening.
box('asphalt',20,.07,51.5,10,.14,8);
for(let i=0;i<6;i++)box('roadPaint',16+i*1.45,.16,51.5,.72,.025,3.4);
for(const x of[14,26]){box('concrete',x,.45,54,1,.9,1);box('steel',x,2.5,54,.15,4,.15);}
fence(-40,87,110);fence(66,87,54);

function supportBuilding(x,z,w,d,h,label,roof='roofBlue'){
 box('concrete',x,.24,z,w+1.6,.45,d+1.6);
 box('wall',x,h/2+.5,z,w,h,d);box('blue',x,1,z+d/2+.06,w,.5,.12);
 box(roof,x,h+.65,z,w+1,.28,d+1);
 for(let xx=x-w/2+1.2;xx<x+w/2;xx+=3){
  box('steel',xx,h/2+.5,z+d/2+.08,.12,h,.13);
  box('blackglass',xx,h*.68,z+d/2+.12,1.8,1,.06);
  box('blackglass',xx,h*.68,z-d/2-.12,1.8,1,.06);
 }
 // Roof ribs and rooftop ventilation.
 for(let xx=x-w/2;xx<=x+w/2;xx+=1.4)box('steel',xx,h+.84,z,.045,.04,d);
 for(const dx of[-w*.23,w*.23]){box('steel',x+dx,h+1,z,.9,.45,1.1);box('dark',x+dx,h+1.25,z,1,.06,1.2);}
 placard(label,x,h*.45,z+d/2+.18,Math.min(w-2,15),1.1);
 yardContext.buildings.push({x,z,w,d,h,label});
}

supportBuilding(-59,74,42,17,7.2,'普通物资仓库 / 非危货');
// Recessed dock doors, loading bumpers and covered apron.
for(const x of[-72,-59,-46]){
 box('dark',x,2.1,65.4,6,3.8,.12);
 for(let y=.5;y<3.9;y+=.35)box('steel',x,y,65.3,5.8,.06,.06);
 for(const dx of[-3.1,3.1])box('rubber',x+dx,1,64.95,.35,1.6,.3);
 box('amber',x,4.3,64.8,6.7,.13,1.8);
}
supportBuilding(-17,75,24,15,8.5,'货运综合楼','roofLight');
for(let x=-26;x<=-8;x+=3)for(const y of[2.5,5.8]){
 box('blackglass',x,y,82.58,1.7,1.5,.07);box('ivory',x,y-.85,82.65,1.95,.08,.16);
}
box('blackglass',-17,2,67.35,3.4,3,.12);box('steel',-17,3.8,66.7,5,.12,2);
for(let i=0;i<3;i++)box('concrete',-17,.2+i*.14,66.5+i*.45,5,.25,.7);

supportBuilding(76,75,20,15,5.7,'检修物资 / 器材库');
for(let x=70;x<86;x+=6){box('dark',x,1.9,67.4,4,3,.12);box('amber',x,3.6,67.1,4.6,.12,1.2);}
// Fire-water assets are segregated from the cargo and are illustrative equipment.
box('concrete',91,.3,71,8,.5,23);
for(const z of[65,76]){
 cyl('ivory',91,3.5,z,6,6.2);cyl('steel',91,6.65,z,6.2,.12);
 for(const y of[1.3,3.6,5.7])cyl('steel',91,y,z,6.1,.08);
 for(let y=.7;y<6.7;y+=.45)beam('steel',[88,y,z-.5],[88,y,z+.5],.06);
 yardContext.utility.push({x:91,z,type:'fire-water'});
}
supportBuilding(52,79,13,9,4,'消防泵房','roofLight');
for(let x=47;x<=57;x+=2)box('steel',x,2,74.42,1,1.5,.08);
beam('blue',[95,.65,65],[60,.65,65],.2);beam('blue',[95,.65,76],[95,.65,65],.2);
beam('blue',[94,.65,76],[95,.65,76],.2);beam('blue',[60,.65,65],[60,.65,79],.2);beam('blue',[60,.65,79],[58.5,.65,79],.2);

// Marked ancillary parking / empty-container marshalling: not added dangerous cargo.
box('concrete',23,.12,76,29,.22,17);
for(let x=10;x<=35;x+=5){box('roadPaint',x,.25,74,.12,.025,10);box('roadPaint',x+2.5,.25,69,5,.025,.12);}
function roadVehicle(x,z,kind='truck',paint='blue'){
 const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
 const truck=kind==='truck',length=truck?9:5.2;
 movingBox(g,'dark',0,.72,0,length,.3,2.45);
 if(truck){
  movingBox(g,paint,-1,2.1,0,6.2,2.5,2.6);
  for(let xx=-3.8;xx<2;xx+=.6)movingBox(g,'steel',xx,2.1,1.32,.04,2.3,.04);
  movingBox(g,'ivory',3.2,1.7,0,2,2.5,2.5);movingBox(g,'blackglass',3.5,2.4,0,1.1,.85,2.54);
 }else{
  movingBox(g,paint,0,1.1,0,4.9,1,2.2);movingBox(g,'blackglass',-.25,1.8,0,2.8,.75,2);
  movingBox(g,paint,-.25,2.25,0,2.9,.12,2.1);
 }
 for(const xx of truck?[-3,-1.4,3.2]:[-1.6,1.6])for(const side of[-1,1]){
  const wheel=new THREE.Mesh(geom.wheel,M.rubber);wheel.position.set(xx,.62,side*1.23);wheel.scale.set(.95,.95,.25);g.add(wheel);
  movingBox(g,'steel',xx,.62,side*1.38,.32,.32,.04);
 }
 for(const side of[-1,1]){movingBox(g,'whiteLight',length/2,.95,side*.8,.05,.18,.3);movingBox(g,'redLight',-length/2,.95,side*.8,.05,.18,.3);}
 yardContext.vehicles.push({x,z,length,width:2.8,kind});return g;
}
roadVehicle(-60,61.5,'truck','roofBlue');
roadVehicle(-40,61.5,'truck','ivory');
for(const [i,x]of[12,18,24,30].entries()){const car=roadVehicle(x,74,'car',i%2?'car':'blue');car.rotation.y=Math.PI/2;}
// A parked maintenance van and compact forklift within the apron, away from tracks.
roadVehicle(75,62,'truck','amber');
const forklift=new THREE.Group();forklift.position.set(-84,0,72);scene.add(forklift);
movingBox(forklift,'amber',0,.9,0,2.8,1.3,1.6);movingBox(forklift,'rubber',-.1,1.7,0,.7,.55,.7);
for(const dz of[-.7,.7]){movingBox(forklift,'steel',.6,2.3,dz,.08,3.6,.08);movingBox(forklift,'steel',-.8,2.3,dz,.08,3.6,.08);movingBox(forklift,'dark',1.5,2,dz,.15,3.9,.12);movingBox(forklift,'steel',2,.22,dz,1.5,.13,.14);}
movingBox(forklift,'dark',-.1,4.15,0,1.8,.12,1.7);
for(const xx of[-.85,.9])for(const zz of[-.85,.85]){const wheel=new THREE.Mesh(geom.wheel,M.rubber);wheel.position.set(xx,.4,zz);wheel.scale.set(.7,.7,.22);forklift.add(wheel);}
yardContext.vehicles.push({x:-84,z:72,length:5,width:2,kind:'forklift'});

// Empty handling frames, pallet racks and workshop stocks in marked bays.
for(let i=0;i<3;i++){
 const x=-89+i*6;
 box('pallet',x,.35,81,4,.55,3);
 for(const dz of[-1.3,1.3])for(const dx of[-1.7,1.7])box('steel',x+dx,2,81+dz,.12,3.3,.12);
 for(const y of[.65,2,3.45])box('steel',x,y,81,3.8,.12,2.9);
 for(const y of[1.2,2.55])for(const dx of[-.9,.9])box('box',x+dx,y,81,1.5,.9,2.4);
}

// Curbed green strips, region-specific trees and lighting complete the site context.
function greenStrip(x,z,w,d){
 box('curb',x,.19,z,w+.5,.32,d+.5);box('grass',x,.36,z,w,.08,d);
 yardContext.landscape.push({x,z,w,d});
}
greenStrip(-43,85,100,2.5);greenStrip(38,84,23,2.5);
greenStrip(-94,73,3,21);greenStrip(39,73,3,16);
for(const x of[-89,-77,-65,-53,-41,-29,-17,-5,30,39]){
 tree(x,85,REGION.id==='NW'?.48:.64);
 if(!REGION.snow&&REGION.id!=='NW'){
  for(const dx of[-1.3,1.3])put('sphere','foliage',x+dx,.9,85,2.1,1.1,1.5);
 }
}
for(const x of[-86,-34,32,85]){
 box('steel',x,5.1,55.2,.16,10,.16);
 for(const dz of[-1,1]){beam('steel',[x,10.1,55.2],[x,10.6,55.2+dz*1.6],.1);box('whiteLight',x,10.6,55.2+dz*1.6,.7,.1,1.1);}
}
// Ground arrows and fire access stripes add scale without covering the roadway.
for(const x of[-80,-23,47]){
 box('roadPaint',x,.15,59,2,.025,.2);
 beam('roadPaint',[x+1,.15,59],[x+.2,.15,58.3],.14);beam('roadPaint',[x+1,.15,59],[x+.2,.15,59.7],.14);
}
for(let x=-8;x<9;x+=1.2)box('amber',x,.16,54.4,.55,.025,1.3,-.5);
placard('后勤保障区 / 普通物资与检修',-20,10,84,27,1.6);

// Trackside infrastructure adds operational scale while keeping the loading gauge free.
for(const z of REGION.tracks){
 for(let x=-82;x<=84;x+=10){
  box('concrete',x,.13,z-2.25,9.5,.18,.35);
  for(let dx=-4;dx<=4;dx+=2)box('steel',x+dx,.24,z-2.25,.05,.03,.36);
 }
}
const stoneGeo=new THREE.IcosahedronGeometry(1,0),stoneCount=REGION.tracks.length*720;
const stones=new THREE.InstancedMesh(stoneGeo,M.ballast,stoneCount);let stoneIndex=0;
// Separate seeded stream: scenery details never affect motion or procedural fixtures.
let scenerySeed=9417;const sceneryRandom=()=>{scenerySeed=(scenerySeed*16807)%2147483647;return(scenerySeed-1)/2147483646};
for(const z of REGION.tracks)for(let i=0;i<720;i++){
 tmpV.set(-96+sceneryRandom()*192,.1,z+(sceneryRandom()-.5)*3.4);
 tmpQ.setFromEuler(new THREE.Euler(sceneryRandom(),sceneryRandom(),sceneryRandom()));const size=.05+sceneryRandom()*.1;
 tmpScale.set(size*1.8,size*.6,size);tmpMatrix.compose(tmpV,tmpQ,tmpScale);stones.setMatrixAt(stoneIndex++,tmpMatrix);
}stones.receiveShadow=true;scene.add(stones);
for(const x of[-66,4,70]){
 const z=REGION.tracks[0]-5;
 box('concrete',x,.2,z,2,.4,2);box('steel',x,7,z,.28,14,.28);
 for(let y=1;y<13;y+=.6)box('steel',x+.25,y,z,.65,.06,.08);
 for(const side of[-1,1]){beam('steel',[x,13.6,z],[x+side*2,14,z],.12);box('whiteLight',x+side*2,14,z,1.1,.15,.8);}
 yardContext.utility.push({x,z,type:'yard-light'});
}
for(const x of[-82,84]){
 const z=REGION.tracks[0]-3;
 box('concrete',x,.25,z,2.3,.5,1.6);box('blue',x,1.2,z,1.6,1.6,.7);
 for(let y=.7;y<1.7;y+=.2)box('dark',x,y,z+.36,1.2,.045,.02);
}
// Empty handling frames near the transfer zone; these are not extra hazardous inventory.
for(const x of[78,86]){
 for(const dx of[-2.7,2.7])for(const dz of[-1.2,1.2])box('steel',x+dx,1.5,31+dz,.12,3,.12);
 for(const y of[.12,2.94])for(const dz of[-1.2,1.2])beam('blue',[x-2.7,y,31+dz],[x+2.7,y,31+dz],.14);
 for(const dx of[-2.7,2.7])beam('blue',[x+dx,.12,29.8],[x+dx,2.94,32.2],.1);
}

// Ordinary freight / empty frames on a spare siding, never the animated through line.
if(REGION.tracks.length>3)for(let i=0;i<3;i++){
 const x=-28+i*13,z=REGION.tracks[2],g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
 movingBox(g,'dark',0,1,0,11.5,.45,2.6);
 wheelSet(g,[-3.7,-2.5,2.5,3.7].flatMap(xx=>[-.74,.74].map(zz=>[xx,.82,zz])));
 if(i<2){
  movingBox(g,i?'roofBlue':'orange',0,2.55,0,10.2,2.6,2.55);
  for(let xx=-4.9;xx<5;xx+=.55)for(const side of[-1,1])movingBox(g,'steel',xx,2.55,side*1.29,.045,2.45,.035);
  for(const zz of[-.62,.62]){movingBox(g,'steel',5.13,2.55,zz,.04,2.5,.04);movingBox(g,'steel',5.16,2.55,zz,.04,2.3,.04);}
 }else{
  for(const xx of[-4.8,4.8])for(const zz of[-1.2,1.2])movingBox(g,'blue',xx,2.5,zz,.13,2.7,.13);
  for(const zz of[-1.2,1.2])movingBox(g,'blue',0,3.85,zz,9.7,.14,.14);
 }
 for(const xx of[-5.9,5.9])movingBox(g,'steel',xx,1,0,.6,.12,.2);
 for(const side of[-1,1])for(let xx=-4.4;xx<4.5;xx+=2.2)movingBox(g,'amber',xx,1.1,side*1.32,.65,.12,.03);
 yardContext.rollingStock.push({x,z,length:12});
}
