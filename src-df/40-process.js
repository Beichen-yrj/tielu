// Tank loading trestle and packaged dangerous-goods freight platform.
const tx=REGION.platformX,gx=REGION.goodsX,tz=REGION.tracks[1]+5,gz=REGION.tracks.at(-1)+6;
box('concrete',tx,.6,tz,48,1.2,4.6);for(let xx=tx-22;xx<tx+23;xx+=4){box('amber',xx,1.25,tz+2.2,2,.06,.25);box('steel',xx,2,tz,.12,2,.12);box('steel',xx,3,tz,4,.08,.08);}
for(let xx=tx-18;xx<=tx+18;xx+=12){box('steel',xx,4.5,tz,.25,7,.25);beam('steel',[xx,6.5,tz],[xx,6.5,tz-5],.25);beam('steel',[xx,6.5,tz-5],[xx+1,4.2,tz-5],.18);box('amber',xx,1.4,tz+3,1,.2,1);cyl('greenLight',xx,3.5,tz-1,.3,.3);}
if(REGION.roof)canopy(tx,tz,48,5);
for(let z of[tz-1.2,tz-.4])beam('steel',[tx-25,1.7,z],[tx+25,1.7,z],.22);
// Dedicated collection channel and collection tank, not a consequence radius.
box('dark',tx,.13,tz+5,52,.14,.65);for(let xx=tx-24;xx<tx+24;xx+=1)box('steel',xx,.23,tz+5,.08,.05,.65);box('concrete',tx+28,.8,tz,6,1.6,8);box('water',tx+28,1.61,tz,4.8,.02,6.8);
placard('01 罐车装卸栈台',tx,5.2,tz+4,22,1.7);
box('concrete',gx,.7,gz,44,1.4,7);box('amber',gx,1.43,gz-3.4,44,.04,.22);box('amber',gx,1.43,gz+3.4,44,.04,.22);
if(REGION.roof)canopy(gx,gz,44,8);else{for(let xx=gx-20;xx<gx+20;xx+=10)box('blue',xx,3,gz+3,8,3,2);}
for(let i=0;i<8;i++){const x=gx-17+i*4.8;box('pallet',x,1.6,gz,2.6,.25,2.5);for(const dz of[-.6,.6]){box(i%2?'blue':'box',x,2.3,gz+dz,2.3,1.2,1);box('ivory',x,2.35,gz+dz+.51,.65,.6,.02);box('orange',x,2.35,gz+dz+.53,.3,.3,.03,0,.78);}}
placard('02 包装危货货运站台',gx,5.3,gz+4.3,25,1.7);
// Gatehouse, inspection bay and segregated transfer yard.
box('ivory',-75,2.1,34,11,4.2,7);box('blue',-75,4.4,34,12,.3,8);box('blackglass',-75,2.6,37.55,7,1.5,.06);box('steel',-66,1.5,35,.18,3,.18);box('amber',-59,2.8,35,14,.15,.15);placard('进场核验',-75,5.6,38,12,1.5);
for(let i=0;i<3;i++){const x=49+i*9;box('concrete',x,.1,31,7,.2,12);for(let z of[26,36])box('amber',x,.23,z,7,.03,.13);box(i%2?'blue':'ivory',x,1.8,31,6,3,2.5);for(let xx=x-2.8;xx<x+3;xx+=.45)box('steel',xx,1.8,32.3,.06,2.8,.04);}
placard('暂存交接 / 示范货位',59,5.3,38,24,1.5);
// Emergency resources and dispatch room.
box('ivory',1,2.4,34,20,4.8,9);box('blue',1,5,34,21,.3,10);box('blackglass',1,2.9,38.6,14,1.8,.08);placard('调度值守 / 应急保障',1,6.7,39,23,1.7);
for(let x of[15,18,21]){box('red',x,1,36,1.8,2,1.1);box('ivory',x,1.2,36.57,.8,.8,.03);}cyl('red',25,.9,36,.7,1.8);beam('red',[25,1.5,36],[27,1.5,36],.2);
box('foliage',-16,.08,34,9,.08,9);placard('应急集合点',-16,3.5,34,10,1.5);
// Signal posts and wheel stops protect ends of loading lines.
for(const z of REGION.tracks){for(let x of[-89,89]){box('dark',x,2.5,z+2.4,.15,5,.15);box('dark',x,4.6,z+2.4,.8,1.6,.4);cyl('greenLight',x,4.7,z+2.65,.3,.3,0,Math.PI/2);}if(z!==REGION.tracks[0])box('red',96,.7,z,1,1,2.8);}
