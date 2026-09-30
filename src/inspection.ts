export type RiskLevel = '重大' | '较大' | '一般' | '低'

export type StaticItem = { code: string; category: string; name: string; requirement: string; basis: string; measure: string }

// 静态自查 31 项（站台结构、平面布局、轨道、警示标识、安全距离、设施设备、监控报警、消防与应急）
export const staticItems: StaticItem[] = [
  { code: 'S-01', category: '站台结构', name: '站台面平整度与承载能力', requirement: '站台面无破损、无积水，承载能力满足危险货物装卸作业要求', basis: '《铁路危险货物运输安全监督管理规定》', measure: '修补破损站台面，清除积水并复核承载标识' },
  { code: 'S-02', category: '站台结构', name: '站台边缘防护与限界', requirement: '站台边缘防护设施完好，装卸作业不侵限', basis: '《铁路技术管理规程》', measure: '修复防护设施，重新标定侵限警戒线' },
  { code: 'S-03', category: '站台结构', name: '雨棚结构安全状态', requirement: '雨棚结构无明显变形、连接件无松动', basis: '《铁路危险货物运输安全监督管理规定》', measure: '加固变形构件，紧固连接件并留存检查记录' },
  { code: 'S-04', category: '站台结构', name: '排水与防渗设施', requirement: '排水沟畅通，危险货物作业区地面具备防渗条件', basis: '《危险货物运输包装通用技术条件》', measure: '清掏排水沟，对防渗层破损部位补做防渗处理' },
  { code: 'S-05', category: '平面布局', name: '装卸区与仓储区分区', requirement: '装卸作业区与仓储区、办公区有效分隔', basis: '《铁路危险货物运输安全监督管理规定》', measure: '按分区要求设置实体隔离并补充标识' },
  { code: 'S-06', category: '平面布局', name: '消防车道畅通性', requirement: '消防车道无占压、无堆物，宽度满足消防车通行', basis: '《建筑设计防火规范》', measure: '清理占压物并划定禁停标线' },
  { code: 'S-07', category: '平面布局', name: '疏散通道与安全出口', requirement: '疏散通道畅通，安全出口数量与宽度满足要求', basis: '《建筑设计防火规范》', measure: '移除通道障碍物，复核安全出口标识' },
  { code: 'S-08', category: '平面布局', name: '危险区域划线隔离', requirement: '危险货物作业区域划线清晰，具备隔离措施', basis: '《铁路危险货物运输安全监督管理规定》', measure: '重新划设警戒线并增设隔离设施' },
  { code: 'S-09', category: '轨道', name: '轨道几何状态', requirement: '轨距、水平、方向偏差在养护标准范围内', basis: '《铁路线路修理规则》', measure: '安排轨道整修并复测几何尺寸' },
  { code: 'S-10', category: '轨道', name: '道床与轨枕状态', requirement: '道床饱满，轨枕无失效、无爬行', basis: '《铁路线路修理规则》', measure: '补充道砟、更换失效轨枕' },
  { code: 'S-11', category: '轨道', name: '钢轨磨耗与伤损', requirement: '钢轨磨耗、擦伤未超过限值', basis: '《铁路线路修理规则》', measure: '对超限钢轨安排更换或打磨处理' },
  { code: 'S-12', category: '轨道', name: '道岔状态与尖轨密贴', requirement: '道岔尖轨密贴、转辙设备动作正常', basis: '《铁路技术管理规程》', measure: '调整道岔密贴并加强转辙设备保养' },
  { code: 'S-13', category: '警示标识', name: '危险货物标识与标签', requirement: '危险货物包装标识、标签清晰完整，与品名一致', basis: '《危险货物运输包装通用技术条件》', measure: '更换缺失或模糊标识标签，核对品名一致性' },
  { code: 'S-14', category: '警示标识', name: '作业区域警示标志', requirement: '作业区设置禁止烟火、当心爆炸等警示标志', basis: '《安全标志及其使用导则》', measure: '按规范补齐警示标志并固定牢靠' },
  { code: 'S-15', category: '警示标识', name: '风向标与应急指示', requirement: '风向标、应急集合点指示清晰可见', basis: '《铁路危险货物运输安全监督管理规定》', measure: '更新破损指示牌，明确应急集合点位置' },
  { code: 'S-16', category: '警示标识', name: '疏散指示与应急照明标识', requirement: '疏散指示标识连续、可视，指向正确', basis: '《消防应急照明和疏散指示系统技术标准》', measure: '更换不亮或方向错误的疏散指示标识' },
  { code: 'S-17', category: '安全距离', name: '与建（构）筑物防火间距', requirement: '危险货物作业区与相邻建构筑物间距符合规范', basis: '《建筑设计防火规范》', measure: '评估间距不足部位，采取隔离或调整作业布置' },
  { code: 'S-18', category: '安全距离', name: '与明火及散发火花地点距离', requirement: '作业区与明火、散发火花地点保持规定距离', basis: '《铁路危险货物运输安全监督管理规定》', measure: '暂停相邻动火作业并重新核定安全距离' },
  { code: 'S-19', category: '安全距离', name: '与相邻作业区隔离距离', requirement: '不同危险特性作业区之间保持隔离距离', basis: '《危险货物分类和品名编号》', measure: '调整作业计划，避免性质相抵触货物同时作业' },
  { code: 'S-20', category: '安全距离', name: '储罐区防火堤与围堰', requirement: '储罐区防火堤、围堰完整，容积满足泄漏收集要求', basis: '《储罐区防火堤设计规范》', measure: '修复防火堤缺口，清理围堰内积水与杂物' },
  { code: 'S-21', category: '设施设备', name: '装卸栈台与附属设施', requirement: '栈台结构、栏杆、梯道完好，附属设施可用', basis: '《铁路危险货物运输安全监督管理规定》', measure: '维修栈台附属设施并设置防坠落措施' },
  { code: 'S-22', category: '设施设备', name: '静电接地装置有效性', requirement: '静电接地装置完好，接地电阻检测在有效期内', basis: '《防止静电事故通用导则》', measure: '重新检测接地电阻并更换失效接地线' },
  { code: 'S-23', category: '设施设备', name: '防爆电气设备状态', requirement: '防爆电气设备等级匹配、外壳完好、无失爆', basis: '《爆炸危险环境电力装置设计规范》', measure: '更换失爆电气设备并张贴防爆等级标识' },
  { code: 'S-24', category: '设施设备', name: '计量与检测仪表校验', requirement: '温度、压力、液位等仪表在校验有效期内', basis: '《铁路危险货物运输安全监督管理规定》', measure: '送检超期仪表并粘贴合格标识' },
  { code: 'S-25', category: '监控报警', name: '可燃气体报警系统', requirement: '报警探测器完好，报警信号能传至值班室', basis: '《石油化工可燃气体和有毒气体检测报警设计标准》', measure: '修复报警回路并组织联动功能测试' },
  { code: 'S-26', category: '监控报警', name: '视频监控覆盖与存储', requirement: '装卸区、仓储区监控无盲区，存储周期满足要求', basis: '《铁路危险货物运输安全监督管理规定》', measure: '调整摄像机点位消除盲区，扩容存储' },
  { code: 'S-27', category: '监控报警', name: '火灾自动报警系统', requirement: '火灾报警探测器、手报按钮功能正常', basis: '《火灾自动报警系统设计规范》', measure: '更换失效探测器并完成联动测试' },
  { code: 'S-28', category: '监控报警', name: '周界防范与门禁管理', requirement: '周界防护完好，危险货物作业区实行门禁管理', basis: '《铁路危险货物运输安全监督管理规定》', measure: '修复周界设施，落实进出登记与门禁制度' },
  { code: 'S-29', category: '消防与应急', name: '消防灭火器材配置', requirement: '灭火器材数量、类型与作业风险匹配且在有效期内', basis: '《建筑灭火器配置设计规范》', measure: '按配置标准补足器材并更新压力表检查记录' },
  { code: 'S-30', category: '消防与应急', name: '应急救援物资配备', requirement: '堵漏、吸附、洗消等应急物资齐全可用', basis: '《铁路危险货物运输安全监督管理规定》', measure: '补充缺失应急物资并明确存放位置' },
  { code: 'S-31', category: '消防与应急', name: '应急照明与疏散设施', requirement: '应急照明、疏散通道设施功能正常', basis: '《消防应急照明和疏散指示系统技术标准》', measure: '维修应急照明并进行断电应急测试' },
]

export type DynamicItem = { code: string; stage: string; dimension: string; name: string; requirement: string; basis: string; measure: string; dataKey?: string }

const dims = ['人', '物', '环境', '管理'] as const

const buildDynamic = (): DynamicItem[] => {
  const source: Array<[string, string, string, string]> = [
    // 进场环节（17 项）
    ['人员与车辆进场资质核验', '押运、驾驶及随车人员资质齐全有效', '《铁路危险货物运输安全监督管理规定》', '补齐资质证明并暂停无证人员作业'],
    ['运输票据与货物品名核对', '运单、货票与实物品名、编号一致', '《铁路货物运输规程》', '重新核对票据与实物，更正不一致信息'],
    ['包装类别与货物危险性匹配', '包装类别与货物危险等级匹配', '《危险货物运输包装通用技术条件》', '更换不符合要求的包装并复检'],
    ['包装外观与封闭状态检查', '包装无破损、渗漏、污染', '《危险货物运输包装通用技术条件》', '更换破损包装并对渗漏部位清理洗消'],
    ['车辆状态与阻火装置', '车辆技术状态良好，阻火器完好', '《铁路危险货物运输安全监督管理规定》', '修复车辆缺陷并更换失效阻火器'],
    ['罐车罐体外观检查', '罐体无腐蚀、无渗漏、无变形', '《铁路危险货物运输安全监督管理规定》', '对缺陷罐体安排检修并禁止装车'],
    ['罐车安全附件检查', '安全阀、紧急切断装置动作可靠', '《压力容器安全技术监察规程》', '校验安全附件并记录动作试验结果'],
    ['押运人员防护装备配置', '防护服、面具、手套等配备齐全', '《个体防护装备配备规范》', '补足防护装备并培训正确佩戴方法'],
    ['作业人员健康与精神状态', '作业人员无疲劳、醉酒等异常状态', '《铁路危险货物运输安全监督管理规定》', '调整作业人员排班并加强岗前状态确认'],
    ['进场安全交底与确认', '进场前完成安全交底并签字确认', '《安全生产法》', '补做安全交底并留存签字记录'],
    ['车辆停放与防溜措施', '车辆停放位置正确并采取防溜措施', '《铁路技术管理规程》', '纠正停放位置，补设防溜装置'],
    ['卸车场地条件确认', '卸车场地无积水、无障碍物', '《铁路危险货物运输安全监督管理规定》', '清理场地并确认防渗条件'],
    ['危险货物信息传递与登记', '危险货物信息按规定登记传递', '《铁路危险货物运输安全监督管理规定》', '补齐登记信息并明确传递责任'],
    ['货物温度初检', '进场时货物温度处于允许范围', '《危险货物运输管理规则》', '对超温货物采取降温措施后再作业'],
    ['可燃气体初始检测', '作业前作业区可燃气体浓度低于报警下限', '《石油化工可燃气体和有毒气体检测报警设计标准》', '强制通风并复测合格后作业'],
    ['周边环境风险确认', '周边无动火作业、无无关人员', '《铁路危险货物运输安全监督管理规定》', '停止周边动火作业并清退无关人员'],
    ['应急预案与联系方式确认', '应急处置流程、联系方式明确', '《生产安全事故应急预案管理办法》', '更新应急联系卡并现场张贴'],
    // 装卸环节（24 项）
    ['装卸机械与索具状态', '装卸机械、索具完好并定期检验', '《起重机械安全技术规程》', '停用缺陷机械并送检索具'],
    ['装卸设备额定负荷控制', '装载重量不超过设备额定负荷', '《起重机械安全技术规程》', '调整作业方案，避免超负荷装卸'],
    ['罐体温度与超压监测', '罐体温度、压力在允许范围内', '《压力容器安全技术监察规程》', '暂停装卸并采取降温、泄压措施'],
    ['可燃气体浓度检测', '作业区气体浓度低于报警下限', '《石油化工可燃气体和有毒气体检测报警设计标准》', '停止作业、通风置换并复测'],
    ['高挥发性货物呼吸阀检查', '高挥发性货物呼吸阀、密封装置可靠', '《压力容器安全技术监察规程》', '清洗或更换呼吸阀并复检密封性'],
    ['低闪点货物防火措施', '低闪点货物作业落实防火防爆措施', '《建筑设计防火规范》', '增加防火隔离与灭火器材配置'],
    ['静电接地连接与限速', '装卸全程静电接地有效，流速符合要求', '《防止静电事故通用导则》', '重新连接接地并降低装卸流速'],
    ['装卸作业警戒设置', '作业区设置警戒并专人监护', '《铁路危险货物运输安全监督管理规定》', '按规范设置警戒线并落实监护人员'],
    ['装卸软管与接头检查', '软管、接头无老化、无渗漏', '《危险货物运输管理规则》', '更换老化软管并复核接头紧固情况'],
    ['作业人员防护落实', '作业人员按危险特性佩戴防护装备', '《个体防护装备配备规范》', '现场纠正防护缺失并补充装备'],
    ['监护人员到岗履职', '装卸全程有专人监护', '《铁路危险货物运输安全监督管理规定》', '明确监护人员职责并落实在岗'],
    ['装卸记录与计量核对', '装卸数量、计量数据与单据一致', '《铁路货物运输规程》', '重新计量并更正单据数据'],
    ['装卸过程泄漏控制', '作业面无残留、无渗漏', '《危险货物运输管理规则》', '清理残留物并检查密封部位'],
    ['车辆防溜与制动确认', '装卸期间车辆制动、防溜有效', '《铁路技术管理规程》', '补设防溜措施并确认制动状态'],
    ['恶劣天气作业管控', '雷雨、大风等天气按规定停止作业', '《铁路危险货物运输安全监督管理规定》', '停止作业并做好车辆防护'],
    ['照明条件确认', '装卸作业照度满足要求', '《建筑照明设计标准》', '增设临时照明并检查防爆等级'],
    ['货物堆码与隔离', '货物堆码稳固，性质相抵触货物隔离', '《危险货物分类和品名编号》', '重新堆码并设置隔离措施'],
    ['消防器材现场备置', '作业现场按风险配备灭火器材', '《建筑灭火器配置设计规范》', '补足现场灭火器材并核对有效期'],
    ['应急器材可就近取用', '堵漏、吸附器材就近可快速取用', '《生产安全事故应急预案管理办法》', '调整应急器材存放位置并标识'],
    ['作业过程通信联络', '作业双方通信畅通', '《铁路技术管理规程》', '补充对讲设备并测试通信效果'],
    ['作业结束清场确认', '作业结束后清场、关门、上锁', '《铁路危险货物运输安全监督管理规定》', '落实清场确认签字'],
    ['装卸异常处置记录', '异常情况处置过程有记录', '《安全生产法》', '补记处置过程并分析原因'],
    ['装卸作业票据签认', '装卸作业完成票据签认', '《铁路货物运输规程》', '补齐票据签认手续'],
    ['危险货物残留处理', '残留危险货物按规程处理', '《危险货物运输管理规则》', '按规程收集处理残留物并记录'],
    // 搬运环节（20 项）
    ['搬运路线划设', '搬运路线明确且避开人员密集区', '《铁路危险货物运输安全监督管理规定》', '重新划设搬运路线并设置导向标识'],
    ['搬运机械选型匹配', '搬运机械与货物危险特性匹配', '《起重机械安全技术规程》', '更换适配机械或调整搬运方式'],
    ['叉车等设备防爆要求', '进入防爆区域的机械符合防爆要求', '《爆炸危险环境电力装置设计规范》', '更换非防爆机械并加强区域管理'],
    ['搬运人员分工与监护', '搬运作业分工明确、有人监护', '《铁路危险货物运输安全监督管理规定》', '明确分工并落实监护职责'],
    ['搬运过程碰撞防护', '装载稳固、防碰撞、防跌落', '《危险货物运输管理规则》', '加设防护垫并加固货物固定'],
    ['搬运速度与转弯控制', '搬运速度平稳，转弯减速', '《铁路危险货物运输安全监督管理规定》', '限速行驶并加强现场监督'],
    ['货位与库容核对', '货位、库容与货物性质相符', '《铁路危险货物运输安全监督管理规定》', '调整货位，避免禁忌货物混存'],
    ['库内通风与温湿度控制', '库内通风良好，温湿度在控制范围', '《危险货物运输管理规则》', '开启通风设施并记录温湿度'],
    ['库内照明与电气防护', '库内照明、电气设备符合防爆要求', '《爆炸危险环境电力装置设计规范》', '更换不合格灯具与线路'],
    ['堆码高度与稳定性', '堆码高度、方式符合规范', '《危险货物运输管理规则》', '重新堆码并设置防倾倒措施'],
    ['货物标识可视性', '堆码后货物标识、标签可视', '《危险货物运输包装通用技术条件》', '调整码放方向，确保标识朝外'],
    ['禁忌货物隔离存放', '性质相抵触货物分区隔离存放', '《危险货物分类和品名编号》', '重新分区存放并设置隔离带'],
    ['仓库巡检记录', '按周期开展库房巡检并记录', '《安全生产法》', '落实巡检制度并补记巡检情况'],
    ['出入库登记与核对', '出入库数量、品名登记准确', '《铁路货物运输规程》', '补正登记数据并复核'],
    ['搬运作业区警戒管理', '搬运作业区禁止无关人员进入', '《铁路危险货物运输安全监督管理规定》', '设置警戒并清退无关人员'],
    ['泄漏应急器材就位', '搬运区域应急器材就位可用', '《生产安全事故应急预案管理办法》', '补充应急器材并明确责任人'],
    ['搬运作业人员防护', '防护装备与货物危险特性匹配', '《个体防护装备配备规范》', '补充适配防护装备'],
    ['交接班信息完整性', '交接班信息完整，隐患交接明确', '《铁路危险货物运输安全监督管理规定》', '完善交接班记录并明确隐患交接'],
    ['搬运记录归档', '搬运作业记录按规定归档', '《安全生产法》', '补齐归档资料并明确保管期限'],
    ['搬运安全监督考核', '搬运作业纳入安全考核', '《安全生产法》', '将搬运作业检查结果纳入考核'],
  ]
  const stageOf = (index: number) => (index < 17 ? '进场' : index < 41 ? '装卸' : '搬运')
  return source.map((item, index) => ({
    code: `D-${String(index + 1).padStart(2, '0')}`,
    stage: stageOf(index),
    dimension: dims[(index * 3) % 4],
    name: item[0],
    requirement: item[1],
    basis: item[2],
    measure: item[3],
  }))
}

export const dynamicItems: DynamicItem[] = buildDynamic()

// 数据驱动的判定项：录入检测数据直接影响这些检查项的结论
const dataDriven: Record<string, string> = {
  'D-25': 'temperature',
  'D-27': 'concentration',
  'D-31': 'weight',
  'D-32': 'volatility',
  'D-33': 'flashPoint',
  'D-26': 'pressure',
  'D-03': 'packingGroup',
  'D-14': 'temperature',
}

export type InspectionInput = {
  temperature: string
  pressure: string
  concentration: string
  weight: string
  volatility: string
  flashPoint: string
  boilingPoint: string
  corrosivity: string
  toxicity: string
  packingGroup: string
  handling: string
  storage: string
  seal: string
  cargoHours: string
  [key: string]: string
}

export type InspectionInputKey = keyof Omit<InspectionInput, never>

export const inputFields: Array<{ key: string; label: string; unit: string; placeholder: string }> = [
  { key: 'temperature', label: '货物温度', unit: '℃', placeholder: '填写实测值，无检测数据填“无”' },
  { key: 'pressure', label: '罐内压力', unit: 'MPa', placeholder: '填写实测值，无检测数据填“无”' },
  { key: 'concentration', label: '可燃气体浓度', unit: '%LEL', placeholder: '填写实测值，无检测数据填“无”' },
  { key: 'weight', label: '单批装载重量', unit: 't', placeholder: '填写实测值，无检测数据填“无”' },
  { key: 'volatility', label: '挥发性', unit: '', placeholder: '高 / 中 / 低，无资料填“无”' },
  { key: 'flashPoint', label: '闪点', unit: '℃', placeholder: '填写实测值，无资料填“无”' },
  { key: 'boilingPoint', label: '沸点', unit: '℃', placeholder: '填写实测值，无资料填“无”' },
  { key: 'corrosivity', label: '腐蚀性', unit: '', placeholder: '强 / 中 / 弱 / 无腐蚀性' },
  { key: 'toxicity', label: '毒性', unit: '', placeholder: '剧毒 / 有毒 / 低毒 / 无毒' },
  { key: 'packingGroup', label: '包装类别', unit: '', placeholder: 'Ⅰ类 / Ⅱ类 / Ⅲ类' },
  { key: 'handling', label: '装卸方式', unit: '', placeholder: '如 泵送、鹤管、叉车' },
  { key: 'storage', label: '储存条件', unit: '', placeholder: '如 阴凉通风、库温≤30℃' },
  { key: 'seal', label: '密封状况', unit: '', placeholder: '良好 / 轻微渗漏 / 明显渗漏' },
  { key: 'cargoHours', label: '货物在途时长', unit: 'h', placeholder: '填写小时数，无数据填“无”' },
]

export const emptyInput = (): InspectionInput => {
  const result: Record<string, string> = {}
  for (const field of inputFields) result[field.key] = '无'
  result.volatility = '无'
  return result as InspectionInput
}

const hash = (text: string) => {
  let value = 0
  for (let index = 0; index < text.length; index += 1) value = (value * 31 + text.charCodeAt(index)) % 100003
  return value
}

const toNumber = (value: string) => {
  const text = String(value ?? '').trim()
  if (!text || text === '无' || text === '—') return null
  const parsed = Number(text.replace(/[^\d.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : null
}

export type ItemResult = { code: string; name: string; category: string; passed: boolean; level: RiskLevel; basis: string; issue: string; measure: string; evidence: string; score?: number }

export type InspectionResult = {
  staticPassed: boolean
  staticResults: ItemResult[]
  dynamicResults: ItemResult[]
  staticFailed: ItemResult[]
  dynamicFailed: ItemResult[]
  conclusions: { major: number; bigger: number; general: number; low: number; total: number; index: number; risk: RiskLevel }
  summary: string
  overallIssues: string[]
  measures: string[]
  permits: { engineer: string; engineerConclusion: string; manager: string; managerConclusion: string; time: string }
  staticRate: number
  dynamicRate: number
  generatedAt: string
}

const levelFromScore = (score: number): RiskLevel => (score >= 16 ? '重大' : score >= 9 ? '较大' : score >= 4 ? '一般' : '低')

const judgeDataDriven = (key: string, input: InspectionInput): { passed: boolean; evidence: string } | null => {
  const value = input[key]
  if (value === undefined) return null
  const number = toNumber(value)
  if (key === 'temperature') {
    if (number === null) return null
    return { passed: number <= 35, evidence: `货物温度实测 ${number}℃（限值 ≤35℃）` }
  }
  if (key === 'concentration') {
    if (number === null) return null
    return { passed: number <= 25, evidence: `可燃气体浓度实测 ${number}%LEL（报警下限 25%LEL）` }
  }
  if (key === 'pressure') {
    if (number === null) return null
    return { passed: number <= 0.6, evidence: `罐内压力实测 ${number}MPa（限值 ≤0.6MPa）` }
  }
  if (key === 'weight') {
    if (number === null) return null
    return { passed: number <= 60, evidence: `单批装载 ${number}t（设备额定负荷 60t）` }
  }
  if (key === 'flashPoint') {
    if (number === null) return null
    return { passed: number >= 28, evidence: `闪点实测 ${number}℃（低闪点货物需强化防火措施）` }
  }
  if (key === 'volatility') {
    const text = String(value).trim()
    if (text === '无') return null
    return { passed: text !== '高', evidence: `挥发性：${text}` }
  }
  if (key === 'packingGroup') {
    const text = String(value).trim()
    if (text === '无') return null
    return { passed: text !== 'Ⅲ类', evidence: `包装类别：${text}` }
  }
  return null
}

export function evaluateInspection(input: InspectionInput, context: { id: string; cargo: string; station: string }): InspectionResult {
  const seedBase = hash(`${context.id}｜${context.station}｜${context.cargo}`)

  const staticResults: ItemResult[] = staticItems.map((item, index) => {
    const seed = hash(`${context.station}${item.code}`) + seedBase
    const passed = seed % 10 > 2
    const level: RiskLevel = passed ? '低' : (['重大', '较大', '较大', '一般'][seed % 4] as RiskLevel)
    return {
      code: item.code,
      name: item.name,
      category: item.category,
      passed,
      level,
      basis: item.basis,
      issue: passed ? '' : `${item.name}：现场检查发现不符合“${item.requirement}”`,
      measure: passed ? '' : item.measure,
      evidence: passed ? `现场检查记录：${item.requirement}，结论符合` : `现场检查记录：不符合，需整改（判定序号 ${index + 1}）`,
    }
  })

  const staticFailed = staticResults.filter((item) => !item.passed)
  const staticPassed = staticFailed.length === 0

  const dynamicResults: ItemResult[] = staticPassed
    ? dynamicItems.map((item) => {
      const dataKey = dataDriven[item.code]
      const driven = dataKey ? judgeDataDriven(dataKey, input) : null
      const seed = hash(`${context.id}${item.code}`) + seedBase
      const passed = driven ? driven.passed : seed % 10 > 2
      const likelihood = passed ? 1 : 2 + (seed % 4)
      const severity = passed ? 1 : 2 + ((seed >> 3) % 4)
      const score = likelihood * severity
      const level = passed ? '低' : levelFromScore(score)
      return {
        code: item.code,
        name: item.name,
        category: `${item.stage} · ${item.dimension}`,
        passed,
        level,
        score,
        basis: item.basis,
        issue: passed ? '' : `${item.stage}环节${item.dimension}维度：${item.name}不符合要求`,
        measure: passed ? '' : item.measure,
        evidence: driven ? driven.evidence : (passed ? '现场作业记录符合要求' : `L=${likelihood}，C=${severity}，R=${score}（判定序号 ${seed % 97}）`),
      }
    })
    : []

  const dynamicFailed = dynamicResults.filter((item) => !item.passed)
  const allFailed = [...staticFailed, ...dynamicFailed]
  const conclusions = {
    major: allFailed.filter((item) => item.level === '重大').length,
    bigger: allFailed.filter((item) => item.level === '较大').length,
    general: allFailed.filter((item) => item.level === '一般').length,
    low: allFailed.filter((item) => item.level === '低').length,
    total: allFailed.length,
    index: 0,
    risk: '低' as RiskLevel,
  }
  conclusions.index = Math.round((38 + (conclusions.major * 4 + conclusions.bigger * 3 + conclusions.general * 2 + conclusions.low) / Math.max(1, allFailed.length) * 4.6) * 10) / 10
  conclusions.risk = conclusions.major ? '重大' : conclusions.bigger ? '较大' : conclusions.general ? '一般' : '低'

  const overallIssues = staticPassed
    ? [
      `静态自查 ${staticItems.length} 项全部符合要求，静态达标率 ${((staticResults.length - staticFailed.length) / staticResults.length * 100).toFixed(1)}%。`,
      `动态作业检查 ${dynamicItems.length} 项共发现 ${dynamicFailed.length} 项不符合，其中${conclusions.major ? `重大 ${conclusions.major} 项、` : ''}较大 ${conclusions.bigger} 项、一般 ${conclusions.general} 项。`,
      dynamicFailed.length ? `重点问题集中在${Array.from(new Set(dynamicFailed.map((item) => item.category.split(' · ')[0]))).join('、')}环节，建议按措施清单限期整改。` : '动态作业检查未发现不符合项，维持现有作业条件即可。',
    ]
    : [
      `静态自查发现 ${staticFailed.length} 项不符合，静态达标率 ${((staticResults.length - staticFailed.length) / staticResults.length * 100).toFixed(1)}%，未达到动态评估前置条件。`,
      `涉及类别：${Array.from(new Set(staticFailed.map((item) => item.category))).join('、')}。按“静态不通过不开展动态评估”的规则，本次不再出具动态评分结论。`,
      '静态问题整改并复核通过后，需重新发起评估任务完成动态作业评分。',
    ]

  const summary = staticPassed
    ? `综合风险等级：${conclusions.risk}风险（综合风险指数 ${conclusions.index} 分）。静态 ${staticItems.length} 项符合要求，动态 ${dynamicItems.length} 项发现 ${dynamicFailed.length} 项不符合，合计隐患 ${conclusions.total} 项。`
    : `综合风险等级：${conclusions.risk}风险（综合风险指数 ${conclusions.index} 分）。静态 ${staticItems.length} 项发现 ${staticFailed.length} 项不符合，动态评估按规则暂缓开展，需先完成静态整改复核。`

  const measures = allFailed.map((item, index) => `${index + 1}. 【${item.category}】${item.measure}（依据：${item.basis}；责任期限：7 日内）`)

  const engineerPool = ['王建国（安全工程师）', '李海涛（安全工程师）', '张卫国（安全工程师）']
  const managerPool = ['周明远（项目经理）', '陈晓东（项目经理）', '郑海峰（项目经理）']
  const engineer = engineerPool[seedBase % engineerPool.length]
  const manager = managerPool[seedBase % managerPool.length]
  const permits = staticPassed
    ? {
      engineer,
      engineerConclusion: dynamicFailed.length
        ? `已完成技术复核：${dynamicItems.length} 项动态检查中发现 ${dynamicFailed.length} 项不符合，同意按措施清单整改后复核销号`
        : '已完成技术复核：静态与动态检查均符合要求，结论有效',
      manager,
      managerConclusion: dynamicFailed.length ? '许可继续作业并限期完成整改，整改期间加强现场监护' : '许可维持现有作业方式，按周期开展复评',
      time: new Date().toLocaleString('zh-CN', { hour12: false }),
    }
    : {
      engineer,
      engineerConclusion: `静态自查存在 ${staticFailed.length} 项不符合，暂不同意开展动态作业评估`,
      manager,
      managerConclusion: '暂缓该场站危险货物装卸作业，静态问题整改复核通过后再行评估',
      time: new Date().toLocaleString('zh-CN', { hour12: false }),
    }

  return {
    staticPassed,
    staticResults,
    dynamicResults,
    staticFailed,
    dynamicFailed,
    conclusions,
    summary,
    overallIssues,
    measures,
    permits,
    staticRate: Math.round(((staticResults.length - staticFailed.length) / staticResults.length) * 1000) / 10,
    dynamicRate: dynamicResults.length ? Math.round(((dynamicResults.length - dynamicFailed.length) / dynamicResults.length) * 1000) / 10 : 0,
    generatedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
  }
}

export function parseImportedData(text: string, fileName: string): Record<string, string> {
  const result: Record<string, string> = {}
  const trimmed = text.trim()
  if (fileName.endsWith('.json') || trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>
      for (const field of inputFields) {
        const value = parsed[field.key] ?? parsed[field.label]
        if (value !== undefined && value !== null && String(value).trim() !== '') result[field.key] = String(value).trim()
      }
    } catch {
      return result
    }
    return result
  }
  const lines = trimmed.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  for (const line of lines) {
    const cells = line.split(/[,\t;]/).map((cell) => cell.trim())
    if (cells.length < 2) continue
    const matched = inputFields.find((field) => field.key === cells[0] || field.label === cells[0])
    if (matched) result[matched.key] = cells[cells.length - 1]
  }
  return result
}

export const importTemplate = () => {
  const header = inputFields.map((field) => (field.unit ? `${field.label}(${field.unit})` : field.label)).join(',')
  const sample = inputFields.map((field) => {
    if (field.key === 'temperature') return '28'
    if (field.key === 'pressure') return '0.35'
    if (field.key === 'concentration') return '12'
    if (field.key === 'weight') return '42'
    if (field.key === 'volatility') return '中'
    if (field.key === 'flashPoint') return '45'
    if (field.key === 'packingGroup') return 'Ⅱ类'
    if (field.key === 'seal') return '良好'
    return '无'
  }).join(',')
  return `${header}\n${sample}\n`
}
