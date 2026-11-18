// Environmental details support the local station's inspection focus.
for(let x=-82;x<85;x+=10){box('dark',x,.13,28,8,.14,.6);for(let xx=x-3;xx<x+4;xx+=.6)box('steel',xx,.24,28,.08,.04,.65);}
for(const z of[-36,26])for(let x of[-56,-6,45]){box('steel',x,4,z,.14,8,.14);box('blackglass',x,8,z,.7,.5,.5);}
for(const z of[-41,26]){box('concrete',-88,.1,z,10,.2,5);for(let x=-91;x<-84;x+=2){cyl('orange',x,.65,z,.5,1.2);cyl('ivory',x,.8,z,.51,.18);}}
if(REGION.id==='SW'){for(let x=-85;x<95;x+=8){box('steel',x,3.5,-46,.1,7,.1);box('dark',x+3.8,3.5,-46,7.6,6,.04);}}
placard('示范站场 / 非实测布局',0,1.2,54,28,1.5);
