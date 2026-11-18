const $=id=>document.getElementById(id), Q=new URLSearchParams(location.search), TAU=Math.PI*2;
let seed=3817;const rnd=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), lerp=(a,b,t)=>a+(b-a)*t, ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const zones=pointNames.map((name,i)=>({id:'Z0'+(i+1),name,en:['ENTRY INSPECTION','TANK LOADING','FREIGHT PLATFORM','ARRIVAL & SHUNTING','TRANSFER YARD','EMERGENCY SUPPORT'][i],x:pointPositions[i][0],z:pointPositions[i][1],w:[20,48,42,52,25,32][i],d:[15,15,17,13,17,14][i],desc:riskSubjects[i]+'。地区关注：'+REGION.attention+'。所有记录均为教学示例。'}));
const SIM={time:0,playing:!Q.has('still')&&!Q.has('tourat'),rate:[1,2,4].includes(+Q.get('sim'))?+Q.get('sim'):1,stations:zones.map((z,i)=>({id:REGION.id+'-P0'+(i+1),zone:i,state:'run',beacon:[z.x,5,z.z]}))};
const clockText=()=>{const t=Math.floor(8*3600+SIM.time);return[Math.floor(t/3600)%24,Math.floor(t/60)%60,t%60].map(v=>String(v).padStart(2,'0')).join(':')};
const M={}, batches=new Map(), tmpMatrix=new THREE.Matrix4(), tmpQ=new THREE.Quaternion(), tmpV=new THREE.Vector3(), tmpScale=new THREE.Vector3();
function mat(name,color,metalness=.1,roughness=.65,extra={}){return M[name]=new THREE.MeshStandardMaterial({color,metalness,roughness,...extra})}
mat('concrete',0x78838a,.04,.94);mat('base',0x17273a,.12,.92);mat('steel',0x647981,.65,.43);mat('dark',0x222b2d,.65,.4);mat('ivory',0xcbd2d4,.22,.5);mat('orange',0xd68b3a,.35,.48);mat('amber',0xcba748,.3,.55);mat('pallet',0x857358,.05,.9);mat('box',0x9c8b6c,.04,.95);mat('blue',0x396b92,.25,.65);mat('rubber',0x121b1d,.1,.8);mat('car',0xbcc8c6,.65,.25);mat('carDark',0x778b8d,.6,.25);mat('blackglass',0x183138,.8,.16);mat('whiteLight',0xf8f1ce,.1,.3,{emissive:0xefe3ba,emissiveIntensity:2});mat('greenLight',0xa6d7ae,0,.3,{emissive:0x6dbe80,emissiveIntensity:1.5});mat('redLight',0xff6644,0,.3,{emissive:0xff3322,emissiveIntensity:1.4});mat('amberLight',0xf2a73b,0,.3,{emissive:0xf2a73b,emissiveIntensity:1.1});mat('glass',0x8eada8,.4,.17,{transparent:true,opacity:.15,depthWrite:false,side:THREE.DoubleSide});
const geom={box:new THREE.BoxGeometry(1,1,1),cyl:new THREE.CylinderGeometry(.5,.5,1,12),sphere:new THREE.SphereGeometry(.5,10,7),wheel:new THREE.CylinderGeometry(.5,.5,1,18).rotateX(Math.PI/2)};
// Rounded body shells and painted robot castings retain highlights at close range.
geom.rounded=new THREE.BoxGeometry(1,1,1,4,4,4);{const positions=geom.rounded.attributes.position,v=new THREE.Vector3(),inner=new THREE.Vector3();for(let i=0;i<positions.count;i++){v.fromBufferAttribute(positions,i);inner.set(clamp(v.x,-.43,.43),clamp(v.y,-.43,.43),clamp(v.z,-.43,.43));v.sub(inner).normalize().multiplyScalar(.07).add(inner);positions.setXYZ(i,v.x,v.y,v.z)}geom.rounded.computeVertexNormals()}
function put(type,m,x,y,z,w,h,d,ry=0,rz=0){const key=type+'|'+m;if(!batches.has(key))batches.set(key,[]);tmpV.set(x,y,z);tmpScale.set(w,h,d);tmpQ.setFromEuler(new THREE.Euler(0,ry,rz));tmpMatrix.compose(tmpV,tmpQ,tmpScale);batches.get(key).push(tmpMatrix.clone())}
const box=(m,x,y,z,w,h,d,ry=0,rz=0)=>put('box',m,x,y,z,w,h,d,ry,rz);
const cyl=(m,x,y,z,diam,h,ry=0,rz=0)=>put('cyl',m,x,y,z,diam,h,diam,ry,rz);
function beam(m,a,b,width=.16){const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),dir=vb.clone().sub(va),mid=va.clone().add(vb).multiplyScalar(.5);tmpQ.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.clone().normalize());tmpMatrix.compose(mid,tmpQ,new THREE.Vector3(width,dir.length(),width));const key='box|'+m;if(!batches.has(key))batches.set(key,[]);batches.get(key).push(tmpMatrix.clone())}
function flush(){for(const[key,list]of batches){const[type,m]=key.split('|'),mesh=new THREE.InstancedMesh(geom[type],M[m],list.length);list.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));mesh.castShadow=!['whiteLight','glass','greenLight'].includes(m);mesh.receiveShadow=true;scene.add(mesh)}batches.clear()}
function movingBox(parent,m,x,y,z,w,h,d){const o=new THREE.Mesh(['orange','ivory'].includes(m)?geom.rounded:geom.box,M[m]);o.position.set(x,y,z);o.scale.set(w,h,d);o.castShadow=true;parent.add(o);return o}
function placard(text,x,y,z,w=10,h=2,ry=0){
 // Match the physical sign's aspect ratio so glyphs keep their proportions.
 const c=document.createElement('canvas'),ratio=w/h;c.width=Math.min(4096,Math.round(256*ratio));c.height=Math.round(c.width/ratio);
 const g=c.getContext('2d'),pad=c.height*.24;g.fillStyle='#0b1e33';g.fillRect(0,0,c.width,c.height);g.fillStyle='#58bfff';g.fillRect(0,0,c.height*.065,c.height);
 let fontSize=c.height*.62;const font=()=>`600 ${fontSize}px "Microsoft YaHei","Noto Sans CJK SC",sans-serif`;g.font=font();
 const textWidth=g.measureText(text).width;fontSize*=Math.min(1,(c.width-pad*2)/textWidth);g.font=font();g.textAlign='center';g.textBaseline='middle';g.fillStyle='#d0ebff';g.fillText(text,c.width/2,c.height/2);
 const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=8;
 const material=new THREE.MeshBasicMaterial({map:tex,side:THREE.FrontSide}),geometry=new THREE.PlaneGeometry(w,h),p=new THREE.Mesh(geometry,material);
 // A separate outward-facing back keeps letters readable from either side.
 const back=new THREE.Mesh(geometry,material);back.rotation.y=Math.PI;p.add(back);p.position.set(x,y,z);p.rotation.y=ry;scene.add(p);return p;
}
function rail(x,z,w,d){for(const v of[-1,1]){box('amber',x,.035,z+v*d/2,w,.035,.1);box('amber',x+v*w/2,.035,z,.1,.035,d)}}
const anim={trains:[],patrols:[]};

mat('asphalt',0x303b44,.03,.96);mat('ballast',0x59636a,.02,.98);

mat('land',REGION.ground,.02,.95);mat('snow',0xd9e0db,.02,.98);mat('water',0x407b86,.45,.28);mat('foliage',0x3d6555,.02,.96);mat('red',0xb45746,.15,.65);geom.cone=new THREE.ConeGeometry(.5,1,10);
