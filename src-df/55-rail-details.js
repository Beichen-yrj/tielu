// Generic railway equipment, built from maintainable geometry; no measured site is implied.
const infrastructure={grounding:[],detectors:[],wheelStops:[],connections:[],collection:[]};
function curvedPipe(points,radius,material='steel'){
 const mesh=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),20,radius,7,false),M[material]);mesh.castShadow=true;scene.add(mesh);return mesh;
}
// Bogie frames, axle boxes, suspension, tank access and unloading fittings.
for(let i=0;i<4;i++){
 const x=tx-18+i*12,z=tankTrack;
 for(const bx of[-2.8,2.8])for(const side of[-1,1]){
  box('steel',x+bx,.86,z+side*.99,2.5,.22,.18);
  for(const dx of[-.65,.65]){box('dark',x+bx+dx,.67,z+side*1.1,.4,.35,.22);cyl('steel',x+bx+dx,.97,z+side*.95,.25,.35);}
 }
 box('steel',x,4.28,z,5,.1,.7);for(const side of[-1,1]){beam('steel',[x-2.5,4.8,z+side*.45],[x+2.5,4.8,z+side*.45],.055);for(const dx of[-2.5,0,2.5])beam('steel',[x+dx,4.28,z+side*.45],[x+dx,4.8,z+side*.45],.05);}
 cyl('steel',x,4.35,z,.65,.45);cyl('red',x,4.64,z,.48,.1);
 beam('steel',[x-1.1,2.65,z+1.2],[x-1.1,1.8,z+1.7],.16);cyl('red',x-1.1,1.82,z+1.7,.4,.13,0,Math.PI/2);
 // Earthing cable routes along the platform edge, with a separate clamp.
 const clampPoint=[x+1,1.1,z+1.4],earthPoint=[x+2,.2,z+3.3];
 curvedPipe([clampPoint,[x+1.5,.4,z+2],[x+2,.15,z+2.8],earthPoint],.035,'foliage');box('amber',...clampPoint,.28,.12,.1);infrastructure.grounding.push(earthPoint);
 for(const side of[-1,1]){box('amber',x+3.45,.37,z+side*.74,.6,.38,.25);infrastructure.wheelStops.push([x+3.45,.37,z+side*.74]);}
 // Flexible connection and flanged coupling at the second tank, matching scenario anchor.
 const hoseX=x;
 curvedPipe([[hoseX,2.8,z+1.35],[hoseX+.8,2.3,z+2],[hoseX+1,1.9,z+3.2],[hoseX+1.5,1.75,z+4.3]],.11,'rubber');
 cyl('steel',hoseX,2.8,z+1.35,.35,.18,0,Math.PI/2);infrastructure.connections.push([hoseX,2.8,z+1.35]);
 box('blue',x+2,2.6,z+4.1,.55,.45,.25);box('greenLight',x+2,2.6,z+4.25,.12,.12,.03);infrastructure.detectors.push([x+2,2.6,z+4.1]);
}
// Guard rails, stair access, emergency shutoff and numbered inspection points.
for(const end of[-1,1]){
 const x=tx+end*23;
 for(let step=0;step<6;step++)box('steel',x+end*(.5+step*.4),1.12-step*.19,tz, .42,.18,1.6);
 for(const side of[-1,1])beam('steel',[x,2.25,tz+side*.85],[x+end*3,1.1,tz+side*.85],.07);
 box('red',x,1.95,tz+1.9,.5,.65,.25);box('ivory',x,1.95,tz+2.04,.22,.3,.02);
}
for(let x=tx-22;x<tx+23;x+=4){for(const y of[1.8,2.35])beam('steel',[x,y,tz+1.9],[x+3.6,y,tz+1.9],.055);}
for(let i=0;i<3;i++){const x=tx-18+i*18;box('steel',x,1.5,tz+3.8,.1,3,.1);placard('巡检点 '+(i+1)+' / 接地·阀组',x,3.3,tz+3.8,5.8,.65);}
// Solid covers replace exposed collection water: this is equipment, not a lake.
box('concrete',tx+28,1.64,tz,5.2,.12,7.2);for(let i=0;i<2;i++)box('steel',tx+26.8+i*2.4,1.73,tz,1.7,.08,2);
infrastructure.collection.push([tx+28,1.7,tz]);placard('事故收集 / 阀控隔离',tx+28,3.5,tz+3,9,1);
// Packaged cargo segregation, drum closures, aisle crossings and firefighting water points.
for(let i=0;i<6;i++){
 const x=gx-15+i*6;
 cyl(i%2?'blue':'red',x,2.03,gz+1.5,.65,1.15);cyl('steel',x,2.63,gz+1.5,.67,.06);cyl('dark',x+.16,2.68,gz+1.5,.1,.05);
 box('amber',x,1.44,gz-2.6,3.7,.025,.08);
}
for(let i=0;i<7;i++)box('ivory',-27+i*.65,.09,39.8,.35,.025,2.6);
for(const x of[-25,35,75]){cyl('red',x,.65,39,.35,1.3);beam('red',[x-.4,.9,39],[x+.4,.9,39],.12);box('steel',x+1.2,1.1,39,.8,2.2,.5);}
for(const z of REGION.tracks.slice(1)){
 for(const side of[-1,1])beam('red',[94,.15,z+side*.8],[96,1.2,z+side*.8],.18);
 box('red',96,1.15,z, .3,.3,2.3);
 box('steel',-80,.7,z+2.6,1.2,1.4,.65);beam('steel',[-86,.35,z],[-83,.35,z+1],.06);
}
placard('危货作业线 / 防溜·隔离·禁火',tx,7.8,tz-2,26,1.3);
placard('消防通道 / 保持畅通',40,3,49,19,1.2);
