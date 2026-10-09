export type DangerousGood = {
  name: string
  formalName: string
  unNumber: string
  category: string
  aliases?: string[]
}

// 常用危险货物查询清单。正式运输申报应以现行危险货物品名表和托运单为准。
export const dangerousGoods: DangerousGood[] = [
  { name: '航空煤油', formalName: '航空涡轮发动机燃料', unNumber: 'UN1863', category: '易燃液体', aliases: ['航煤'] },
  { name: '煤油', formalName: '煤油', unNumber: 'UN1223', category: '易燃液体' },
  { name: '汽油', formalName: '车用汽油', unNumber: 'UN1203', category: '易燃液体' },
  { name: '柴油', formalName: '柴油或轻质燃料油', unNumber: 'UN1202', category: '易燃液体' },
  { name: '原油', formalName: '原油', unNumber: 'UN1267', category: '易燃液体' },
  { name: '甲醇', formalName: '甲醇', unNumber: 'UN1230', category: '易燃液体' },
  { name: '乙醇', formalName: '乙醇或乙醇溶液', unNumber: 'UN1170', category: '易燃液体', aliases: ['酒精'] },
  { name: '苯', formalName: '苯', unNumber: 'UN1114', category: '易燃液体' },
  { name: '甲苯', formalName: '甲苯', unNumber: 'UN1294', category: '易燃液体' },
  { name: '二甲苯', formalName: '二甲苯', unNumber: 'UN1307', category: '易燃液体' },
  { name: '液化石油气', formalName: '液化石油气', unNumber: 'UN1075', category: '易燃气体', aliases: ['LPG'] },
  { name: '丙烷', formalName: '丙烷', unNumber: 'UN1978', category: '易燃气体' },
  { name: '液氨', formalName: '无水氨', unNumber: 'UN1005', category: '有毒气体', aliases: ['无水氨'] },
  { name: '氯气', formalName: '氯', unNumber: 'UN1017', category: '有毒气体', aliases: ['氯'] },
  { name: '盐酸', formalName: '盐酸', unNumber: 'UN1789', category: '腐蚀性物质' },
  { name: '硫酸', formalName: '硫酸', unNumber: 'UN1830', category: '腐蚀性物质' },
  { name: '硝酸', formalName: '硝酸', unNumber: 'UN2031', category: '腐蚀性物质' },
  { name: '氢氧化钠溶液', formalName: '氢氧化钠溶液', unNumber: 'UN1824', category: '腐蚀性物质', aliases: ['液碱'] },
  { name: '电石', formalName: '碳化钙', unNumber: 'UN1402', category: '遇水放出易燃气体的物质', aliases: ['碳化钙'] },
  { name: '硫磺', formalName: '硫磺', unNumber: 'UN1350', category: '易燃固体' },
  { name: '硝酸铵', formalName: '硝酸铵', unNumber: 'UN1942', category: '氧化性物质' },
]
