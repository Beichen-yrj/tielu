// Railway civil works, rails and region-specific landscape.
box('dark',0,-.76,0,204,1.5,116);box('land',0,-.14,0,200,.3,112);
function track(z,x=0,length=194){box('ballast',x,.04,z,length,.12,3.5);for(let xx=x-length/2;xx<x+length/2;xx+=1.8)box('pallet',xx,.16,z,.35,.18,2.5);for(const dz of[-.74,.74]){box('steel',x,.35,z+dz,length,.22,.12);box('steel',x,.24,z+dz,length,.08,.24)}}
for(const z of REGION.tracks)track(z);
// Diverging rails connect the yard tracks to the approach.
for(let i=1;i<REGION.tracks.length;i++){const z=REGION.tracks[i],start=-97;for(const dz of[-.74,.74])beam('steel',[start,.35,REGION.tracks[i-1]+dz],[start+20,.35,z+dz],.14);}
function canopy(x,z,w,d){for(let xx=x-w/2+2;xx<=x+w/2;xx+=8){for(const dz of[-d/2+.7,d/2-.7])box('steel',xx,3,z+dz,.18,6,.18);beam('steel',[xx,5.9,z-d/2],[xx,6.8,z],.16);beam('steel',[xx,6.8,z],[xx,5.9,z+d/2],.16)}for(const side of[-1,1]){box('blue',x+side*w*.375,6.9,z,w*.25,.18,d+1);if(REGION.snow)box('snow',x+side*w*.375,7.04,z,w*.25,.1,d+1);}for(const dz of[-d/2,d/2])box('steel',x,6.7,z+dz,w,.18,.15);}
function fence(x,z,w){for(let xx=x-w/2;xx<=x+w/2;xx+=4){box('steel',xx,1.1,z,.1,2.2,.1);box('dark',xx+1.9,1.15,z,3.8,1.6,.04)}box('steel',x,2.2,z,w,.08,.08)}
fence(0,-54,196);fence(-40,54,100);fence(62,54,58);
// Southern service road with clear markings and access gate.
box('asphalt',0,.02,45,196,.08,10);for(let x=-95;x<95;x+=7)box('ivory',x,.075,45,3,.02,.12);
for(let z of[40,50])box('ivory',0,.075,z,196,.02,.14);
for(let x of[-95,95])for(let z of[-40,40]){box('steel',x,7,z,.22,14,.22);box('whiteLight',x,14,z,3,.12,.8)}
function tree(x,z,scale=1){cyl('pallet',x,1.4*scale,z,.5*scale,2.8*scale);put('cone','foliage',x,4.3*scale,z,4*scale,6*scale,4*scale);if(REGION.snow)put('cone','snow',x,5*scale,z,2.9*scale,4.6*scale,2.9*scale);}
if(REGION.hills){const ridgeGeometry=new THREE.PlaneGeometry(250,70,32,12).rotateX(-Math.PI/2),pos=ridgeGeometry.attributes.position;for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i),edge=Math.sin((z+35)/70*Math.PI);pos.setY(i,Math.max(0,18+Math.sin(x*.07)*10+Math.sin(x*.18+z*.08)*7)*edge);pos.setZ(i,z-87);}ridgeGeometry.computeVertexNormals();const ridge=new THREE.Mesh(ridgeGeometry,M.land);ridge.receiveShadow=true;ridge.castShadow=true;scene.add(ridge);box('steel',-97,6,-8,8,12,24);box('dark',-96,4,-8,8.2,8,10);for(let i=0;i<10;i++)tree(-95+i*20,-49,.8);}
else if(REGION.water){box('water',0,-.15,-69,235,.12,23);for(let x=-115;x<115;x+=6)box('concrete',x,.1,-56,5.8,.7,1.4);if(REGION.id==='EC'){for(let x of[-65,65]){for(let dx of[-8,8])box('steel',x+dx,12,-70,.7,24,.7);box('amber',x,24,-70,20,.6,1);beam('amber',[x-8,23,-70],[x+11,29,-70],.4);}}}
if(REGION.city)for(let i=0;i<8;i++){const h=5+(i%4)*3;box('base',-90+i*25,h/2,-94,13,h,10);for(let y=2;y<h;y+=2.5)box('blue',-90+i*25,y,-88.9,9,.7,.06);}
if(REGION.snow)for(let i=0;i<16;i++)box('snow',-90+i*12,.07,-48,8,.16,5);
if(REGION.id==='NW'){for(let x=-92;x<98;x+=6){box('pallet',x,2,-49,5.5,4,.15);for(let y=.6;y<4;y+=.5)box('dark',x,y,-48.9,5.5,.08,.06);}}
if(REGION.id==='SC')for(let i=0;i<18;i++)tree(-90+i*10,-49,.8+rnd()*.25);
placard(REGION.station+' / 示范布局',-12,9,-48,42,3);
