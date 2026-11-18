const canvas=$('scene'), scene=new THREE.Scene();scene.background=new THREE.Color(0x060e19);scene.fog=new THREE.FogExp2(0x060e19,.0018);
// Concrete pores and paint roughness are baked once into a local texture.
{const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d'),pixels=g.createImageData(256,256);for(let i=0;i<pixels.data.length;i+=4){const value=220+Math.floor(rnd()*25);pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=value;pixels.data[i+3]=255}g.putImageData(pixels,0,0);g.strokeStyle='#b9b9b9';g.lineWidth=.5;for(let i=0;i<30;i++){g.beginPath();const x=rnd()*256,y=rnd()*256;g.moveTo(x,y);g.lineTo(x+rnd()*18,y+rnd()*2);g.stroke()}const texture=new THREE.CanvasTexture(c);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(24,24);texture.colorSpace=THREE.SRGBColorSpace;M.concrete.map=texture;M.base.map=texture;M.ivory.roughnessMap=texture;M.steel.roughnessMap=texture;}
const renderer=new THREE.WebGLRenderer({canvas,antialias:!Q.has('lq'),powerPreference:'high-performance',preserveDrawingBuffer:true});renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;renderer.shadowMap.enabled=!Q.has('lq');renderer.shadowMap.type=THREE.PCFSoftShadowMap;
// Resize once per actual size change, never as a side effect of the frame rate.
// Bound drawing-buffer memory on high-DPI displays.
let drawingWidth=0,drawingHeight=0,drawingRatio=0;
function resizeRenderer(){
 const width=Math.max(1,Math.round(innerWidth)),height=Math.max(1,Math.round(innerHeight));
 const requested=Q.has('lq')?1:Q.has('pr')?clamp(+Q.get('pr')||1,.5,1.75):Math.min(devicePixelRatio,1.5);
 const ratio=Math.min(requested,Math.sqrt(2500000/(width*height)));
 if(width===drawingWidth&&height===drawingHeight&&ratio===drawingRatio)return;
 drawingWidth=width;drawingHeight=height;drawingRatio=ratio;
 renderer.setDrawingBufferSize(width,height,ratio);
}
resizeRenderer();
const camera=new THREE.PerspectiveCamera(34,innerWidth/innerHeight,.5,5000);
renderer.localClippingEnabled=true;
scene.add(new THREE.HemisphereLight(0xd1e4fa,0x293038,1.45));const keyLight=new THREE.DirectionalLight(0xe5efff,2.4);keyLight.position.set(-70,135,85);keyLight.castShadow=true;keyLight.shadow.mapSize.set(Q.has('lq')?1024:2048,Q.has('lq')?1024:2048);Object.assign(keyLight.shadow.camera,{left:-125,right:125,top:100,bottom:-100,near:1,far:350});keyLight.shadow.bias=-.00012;keyLight.shadow.normalBias=.12;scene.add(keyLight);
const rimLight=new THREE.DirectionalLight(0xa5ccdc,1.3);rimLight.position.set(90,60,-60);scene.add(rimLight);const fillLight=new THREE.DirectionalLight(0x8cbce8,.8);fillLight.position.set(-30,30,110);scene.add(fillLight);
// A local PMREM studio environment; no images, loaders, fonts or network.
const studio=new THREE.Scene();studio.background=new THREE.Color(0x223348);for(const[p,s,intensity]of[[[-10,15,0],[12,14,5],3],[[10,8,-10],[5,10,5],1.4],[[0,20,10],[8,2,16],2]]){const softbox=new THREE.Mesh(geom.box,new THREE.MeshBasicMaterial({color:new THREE.Color(0xd6e9fa).multiplyScalar(intensity)}));softbox.position.set(...p);softbox.scale.set(...s);studio.add(softbox)}
let envRT=null;
function rebuildEnvironment(){if(envRT)envRT.dispose();const pmrem=new THREE.PMREMGenerator(renderer);envRT=pmrem.fromScene(studio,.04);scene.environment=envRT.texture;pmrem.dispose();}
rebuildEnvironment();
const floor=new THREE.Mesh(new THREE.PlaneGeometry(6000,6000),M.base);floor.rotation.x=-Math.PI/2;floor.position.y=-1.35;floor.receiveShadow=true;scene.add(floor);
const grid=new THREE.GridHelper(520,52,0x32618a,0x1b344d);grid.position.y=-1.32;grid.material.transparent=true;grid.material.opacity=.24;scene.add(grid);
