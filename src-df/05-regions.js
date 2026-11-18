// Explicit, reproducible teaching fixtures. These do not describe real stations.
const REGIONS = [
 {id:'NE',name:'东北',station:'东北示范货运站',terrain:'寒地平原 · 防冻与防滑',ground:0x687579,accent:0xa8c3ce,tracks:[-27,-15,-3,13],snow:true,roof:true,platformX:34,goodsX:-28,water:false,hills:false,city:false,attention:'低温密封 / 消防防冻 / 除雪防滑',hazards:['栈台排水口结冰堵塞','包装货物站台防滑垫破损','消防保温检查记录待补'],closed:3},
 {id:'NC',name:'华北',station:'华北示范货运站',terrain:'城市边缘 · 平原枢纽',ground:0x737065,accent:0xc6b591,tracks:[-29,-17,-5,9,21],roof:false,platformX:25,goodsX:-34,water:false,hills:false,city:true,attention:'调车交叉 / 防溜 / 周边敏感目标',hazards:['消防通道临时堆物占用','防溜器具检查记录缺项','作业警戒标识破损','接地连接检查待复核'],closed:4},
 {id:'EC',name:'华东',station:'华东示范货运站',terrain:'临港水网 · 铁水联运',ground:0x687a73,accent:0x91bfc2,tracks:[-28,-16,-4,14],roof:true,platformX:38,goodsX:-22,water:true,hills:false,city:true,attention:'事故排水 / 罐箱交接 / 雷雨管理',hazards:['事故收集沟局部堵塞','罐式集装箱交接标识污损','排水阀检查记录待复核'],closed:5},
 {id:'SC',name:'华南',station:'华南示范货运站',terrain:'湿热多雨 · 通风排水',ground:0x597869,accent:0x9fc3a0,tracks:[-26,-14,-2,14],roof:true,platformX:29,goodsX:-33,water:true,hills:false,city:false,attention:'防雷静电 / 通风降温 / 积水防滑',hazards:['搬运通道积水待清理','通风设备维护记录缺项','防雷检测资料待复核','消防器材标识遮挡'],closed:3},
 {id:'SW',name:'西南',station:'西南示范货运站',terrain:'山地谷地 · 线性站场',ground:0x63765f,accent:0xb1bc91,tracks:[-20,-8,8],roof:true,platformX:43,goodsX:-38,water:false,hills:true,city:false,attention:'边坡排水 / 应急通行 / 桥隧接入',hazards:['站场侧沟堆积杂物','应急通道局部占用','边坡巡检资料待复核'],closed:2},
 {id:'NW',name:'西北',station:'西北示范货运站',terrain:'干旱开阔 · 防风沙站场',ground:0x9c8c6d,accent:0xd2b785,tracks:[-28,-14,2,18],roof:false,platformX:44,goodsX:-32,water:false,hills:false,city:false,attention:'防风固定 / 温差 / 消防资源',hazards:['应急器材配置清单缺项','危货标识被防尘布遮挡'],closed:4}
];
const regionCode = new URLSearchParams(location.search).get('region');
const REGION = REGIONS.find(r=>r.id===regionCode)||REGIONS[0];
const riskLevels=['重大','较大','一般','低'];
const riskColors=['#f17467','#e6a35b','#dfc76c','#78b5dd'];
const pointNames=['进场核验区','罐车装卸栈台','包装危货站台','到发与调车区','暂存交接区','应急保障区'];
const riskSubjects=['包装与标识核验','装卸连接与静电控制','搬运隔离与防护','车辆防溜与调车防护','交接核对与适配隔离','消防通道与应急资源'];
const pointPositions=[[-73,34],[REGION.platformX,REGION.tracks[1]+5],[REGION.goodsX,REGION.tracks.at(-1)+6],[-48,-30],[58,31],[7,39]];
let platformRecords=new URLSearchParams(location.search).has('platform')?[]:null;
let platformSource='平台记录（等待同步）';
const demoRisks=pointNames.map((name,i)=>({id:`${REGION.id}-R0${i+1}`,zone:i,level:[2,1,2,1,3,2][(i+REGIONS.indexOf(REGION))%6],subject:riskSubjects[i],basis:'示范评估记录 · 人工给定分级，非实时测定',measure:['核对包装、标志和交接单证','核验装卸连接、接地和警戒','检查搬运通道、隔离与防护','核对防溜设置和调车作业防护','核对货物适配与交接记录','核查消防设施、通道和应急物资'][i]}));
const hazardZones={NE:[1,2,5],NC:[5,3,2,1],EC:[1,4,1],SC:[2,2,1,5],SW:[3,5,3],NW:[5,2]};
const demoHazards=REGION.hazards.map((title,i)=>({id:`${REGION.id}-H0${i+1}`,zone:hazardZones[REGION.id][i],title,stage:['待整改','整改中','待复核','复核中'][i],owner:['货运检查岗','装卸安全岗','货运检查岗','调车作业岗','交接管理岗','应急保障岗'][hazardZones[REGION.id][i]],overdue:i===0,evidence:'教学样例文字；尚未关联现场照片',due:i===0?'示范：已逾期':'示范：本班次跟进'}));
function regionMetrics(){if(platformRecords!==null){const hazards=platformRecords.filter(r=>r.hasHazard),closed=hazards.filter(r=>['已闭环','已整改'].includes(r.status)).length;return {counts:riskLevels.map(level=>platformRecords.filter(r=>r.risk===level).length),open:hazards.length-closed,overdue:null,review:hazards.filter(r=>['待复核','复核中','待项目经理确认'].includes(r.status)).length,closed,total:hazards.length,closure:hazards.length?Math.round(closed/hazards.length*100):null}}const counts=riskLevels.map((_,i)=>demoRisks.filter(r=>r.level===i).length);const open=demoHazards.length,total=open+REGION.closed;return {counts,open,overdue:demoHazards.filter(h=>h.overdue).length,review:demoHazards.filter(h=>h.stage==='待复核').length,closed:REGION.closed,total,closure:total?Math.round(REGION.closed/total*100):0};}
