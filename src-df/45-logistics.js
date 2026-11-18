// Freight rolling stock. Reuse one wheel draw per vehicle.
const wheelAxis=new THREE.Vector3(0,0,1);
function wheelSet(parent,centers){const mesh=new THREE.InstancedMesh(geom.wheel,M.rubber,centers.length);mesh.userData.wheelCenters=centers;mesh.castShadow=true;parent.add(mesh);updateWheelSet(mesh,0);return mesh;}
function updateWheelSet(mesh,angle){tmpQ.setFromAxisAngle(wheelAxis,angle);tmpScale.set(.8,.8,.22);for(let i=0;i<mesh.userData.wheelCenters.length;i++){tmpV.set(...mesh.userData.wheelCenters[i]);tmpMatrix.compose(tmpV,tmpQ,tmpScale);mesh.setMatrixAt(i,tmpMatrix);}mesh.instanceMatrix.needsUpdate=true;}
// Wheels share the 1.48-unit demo track gauge.
function wagon(x,z,tank=true){const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);movingBox(g,'dark',0,1.05,0,10.4,.5,2.55);wheelSet(g,[-3.3,-2.4,2.4,3.3].flatMap(x=>[-.74,.74].map(z=>[x,.86,z])));
 if(tank){const body=new THREE.Mesh(new THREE.CylinderGeometry(1.35,1.35,8.5,20).rotateZ(Math.PI/2),M.ivory);body.position.y=2.7;body.castShadow=true;g.add(body);for(const xx of[-4.25,4.25]){const end=new THREE.Mesh(geom.sphere,M.ivory);end.scale.set(.8,2.7,2.7);end.position.set(xx,2.7,0);g.add(end);}movingBox(g,'dark',0,4.1,0,1,.2,1);movingBox(g,'orange',0,2.8,1.36,1,.8,.03);for(let y=1;y<4.3;y+=.5)movingBox(g,'steel',1.8,y,1.43,.55,.07,.08);}
 else{movingBox(g,'blue',0,2.6,0,9.5,2.7,2.6);for(let xx=-4.5;xx<=4.5;xx+=.6)movingBox(g,'steel',xx,2.6,1.32,.07,2.5,.05);movingBox(g,'ivory',0,2.8,1.36,1.2,1,.04);movingBox(g,'orange',0,2.8,1.39,.6,.6,.04);}
 for(let xx of[-5.6,5.6])movingBox(g,'steel',xx,1,0,1,.15,.18);return g;}
const tankTrack=REGION.tracks[1],goodsTrack=REGION.tracks.at(-1);
for(let i=0;i<4;i++)wagon(REGION.platformX-18+i*12,tankTrack,true);
for(let i=0;i<3;i++)wagon(REGION.goodsX-12+i*12,goodsTrack,false);
// A through freight train runs on the first track, clear of loading operations.
const throughTrain=new THREE.Group();scene.add(throughTrain);throughTrain.position.z=REGION.tracks[0];
const trainCars=[],trainWheels=[];
const locomotive=new THREE.Group();throughTrain.add(locomotive);
movingBox(locomotive,'dark',0,1.05,0,12,.5,2.7);
movingBox(locomotive,'red',0,2.3,0,11.5,2.3,2.7);
movingBox(locomotive,'ivory',3.2,3.6,0,4.7,1.5,2.65);
movingBox(locomotive,'blackglass',4,3.75,0,2.7,.7,2.72);
movingBox(locomotive,'amber',0,2.5,1.37,10,.2,.05);
for(const z of[-.8,.8])movingBox(locomotive,'whiteLight',5.8,2,z,.08,.22,.32);
for(let x=-4;x<1;x+=.7)movingBox(locomotive,'dark',x,2.7,1.38,.35,1,.04);
trainWheels.push(wheelSet(locomotive,[-4,-2.8,2.8,4].flatMap(x=>[-.74,.74].map(z=>[x,.86,z]))));
trainCars.push(locomotive);
for(let i=1;i<=4;i++){const car=wagon(-i*12.5,0,i%2===0);scene.remove(car);throughTrain.add(car);trainCars.push(car);car.traverse(o=>{if(o.isMesh&&o.geometry===geom.wheel)trainWheels.push(o);});}
anim.trains.push({group:throughTrain,cars:trainCars,wheels:trainWheels,speed:5,length:300,phase:150});
// Clip only the through train at the yard boundary; the loop resets off stage.
const trainClips=[new THREE.Plane(new THREE.Vector3(1,0,0),97),new THREE.Plane(new THREE.Vector3(-1,0,0),97)],trainMaterials=new Map();
throughTrain.traverse(o=>{if(!o.isMesh)return;if(!trainMaterials.has(o.material)){const material=o.material.clone();material.clippingPlanes=trainClips;material.clipShadows=true;trainMaterials.set(o.material,material);}o.material=trainMaterials.get(o.material);});
// Clearance portals mask cars as they enter/leave the model boundary.
for(const x of[-96,96]){for(const dz of[-2.5,2.5])box('steel',x,3,REGION.tracks[0]+dz,.3,6,.3);box('steel',x,6,REGION.tracks[0],.4,.3,5.3);}

// Articulated inspectors walk only on platforms and the pedestrian strip.
function inspector(id,zone,start,end,height,phase){
 const g=new THREE.Group();scene.add(g);
 const torso=movingBox(g,'orange',0,1.35,0,.64,.75,.38);
 movingBox(g,'ivory',0,1.45,.205,.57,.1,.025);
 movingBox(g,'amber',-.19,1.4,.22,.07,.6,.025);movingBox(g,'amber',.19,1.4,.22,.07,.6,.025);
 const head=new THREE.Group();head.position.y=1.95;g.add(head);movingBox(head,'ivory',0,0,0,.4,.4,.38);movingBox(head,'amber',0,.25,0,.54,.16,.5);movingBox(head,'blackglass',0,.04,.2,.3,.07,.02);
 const limbs=[];
 for(const side of[-1,1]){const leg=new THREE.Group();leg.position.set(side*.17,.86,0);g.add(leg);movingBox(leg,'dark',0,-.39,0,.23,.78,.24);movingBox(leg,'rubber',0,-.78,.09,.27,.16,.4);limbs.push(leg);}
 for(const side of[-1,1]){const arm=new THREE.Group();arm.position.set(side*.43,1.67,0);g.add(arm);movingBox(arm,'orange',0,-.3,0,.2,.6,.23);movingBox(arm,'ivory',0,-.65,0,.18,.16,.2);limbs.push(arm);}
 movingBox(limbs[3],'blue',0,-.6,.18,.35,.42,.06);
 const ring=new THREE.Mesh(new THREE.RingGeometry(.58,.66,24),new THREE.MeshBasicMaterial({color:0xc9b276,transparent:true,opacity:.5,side:THREE.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.y=.04;g.add(ring);
 const route={id,zone,group:g,torso,head,limbs,start,end,height,phase,speed:1.3,dwell:4,turn:1};anim.patrols.push(route);
 const points=[new THREE.Vector3(start[0],height+.035,start[1]),new THREE.Vector3(end[0],height+.035,end[1])];
 const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineDashedMaterial({color:0xc4b179,dashSize:.7,gapSize:.9,transparent:true,opacity:.25}));line.computeLineDistances();scene.add(line);
}
inspector('PATROL-01',1,[REGION.platformX-18,tankTrack+5.6],[REGION.platformX+18,tankTrack+5.6],1.2,0);
inspector('PATROL-02',2,[REGION.goodsX-17,goodsTrack+8.4],[REGION.goodsX+17,goodsTrack+8.4],1.4,12);
inspector('PATROL-03',5,[-22,39.3],[20,39.3],.05,22);
inspector('PATROL-04',0,[-62,39.3],[-33,39.3],.05,8);
function patrolPose(p,t){
 const dx=p.end[0]-p.start[0],dz=p.end[1]-p.start[1],distance=Math.hypot(dx,dz),walk=distance/p.speed,half=walk+p.dwell+p.turn,cycle=2*half,u=(t+p.phase)%cycle,returning=u>=half,local=u%half;
 const walking=local<walk,checking=local>=walk&&local<walk+p.dwell,turning=local>=walk+p.dwell,progress=Math.min(local/walk,1),along=returning?1-progress:progress;
 const baseAngle=Math.atan2(dx,dz)+(returning?Math.PI:0),angle=baseAngle+(turning?ease((local-walk-p.dwell)/p.turn)*Math.PI:0);
 return {x:lerp(p.start[0],p.end[0],along),z:lerp(p.start[1],p.end[1],along),angle,walking,checking,step:(t+p.phase)*7,local};
}
function updateMovement(t){
 for(const train of anim.trains){const distance=t*train.speed,head=-120+(distance+train.phase)%train.length;train.group.position.x=head;for(const car of train.cars){const x=head+car.position.x;car.visible=x>=-105&&x<=105;}for(const wheel of train.wheels)updateWheelSet(wheel,-distance/.4);}
 for(const p of anim.patrols){const pose=patrolPose(p,t);p.group.position.set(pose.x,p.height,pose.z);p.group.rotation.y=pose.angle;p.torso.position.y=1.35+(pose.walking?Math.sin(pose.step*2)*.025:0);p.head.rotation.y=pose.checking?Math.sin(t*1.5)*.35:0;const swing=pose.walking?Math.sin(pose.step)*.48:0;p.limbs[0].rotation.x=swing;p.limbs[1].rotation.x=-swing;p.limbs[2].rotation.x=-swing*.75;p.limbs[3].rotation.x=pose.checking?-1.05:swing*.75;}
}
updateMovement(0);
box('red',30,1.4,45,7,2.3,2.6);box('ivory',32,2.1,45,2,1.5,2.65);for(let x of[27.5,32])for(let z of[43.7,46.3])box('rubber',x,.6,z,1,1,.25);
