// Pure snapshot aggregation. No fabricated deadlines, historical series or closure timestamps.
function dashboardSummary(records){
 const closed=r=>['已闭环','已整改'].includes(r.status),hazards=records.filter(r=>r.hasHazard);
 const stages=['待整改','整改中','待复核','复核中','待项目经理确认','已闭环'];
 const stageCounts=stages.map(status=>hazards.filter(r=>status==='已闭环'?closed(r):r.status===status).length);
 const unknown=hazards.filter(r=>!closed(r)&&!stages.includes(r.status)).length;
 const durations=hazards.filter(closed).map(r=>{
  const start=typeof r.created==='string'&&r.created.trim()?Date.parse(r.created):NaN;
  const end=typeof r.closedAt==='string'&&r.closedAt.trim()?Date.parse(r.closedAt):NaN;
  return Number.isFinite(start)&&Number.isFinite(end)&&end>=start?(end-start)/3600000:null;
 }).filter(v=>v!==null);
 const measures=new Map();let missingMeasures=0;
 for(const record of hazards){
  const text=typeof record.measure==='string'?record.measure.trim():'';
  if(!text){missingMeasures++;continue;}
  if(!measures.has(text))measures.set(text,{text,records:[]});measures.get(text).records.push(record);
 }
 const closedCount=hazards.filter(closed).length;
 return {total:records.length,counts:riskLevels.map(level=>records.filter(r=>r.risk===level).length),hazards:hazards.length,
  open:hazards.length-closedCount,closed:closedCount,closure:hazards.length?Math.round(closedCount/hazards.length*100):null,
  stages,stageCounts,unknown,measures:[...measures.values()],missingMeasures,durationSamples:durations.length,
  averageHours:durations.length?durations.reduce((a,b)=>a+b,0)/durations.length:null};
}
