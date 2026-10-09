import { hazardCatalog, hazardDimensions, hazardStages } from './hazardCatalog'
import { bureaus } from './railwayScope'
import type { AssessmentType, RiskLevel } from './api/hazardAssessments'
import { compressImage } from './assessmentPhotos'

export type ImportedAssessment = {
  taskName: string
  bureau: string
  station: string
  area: string
  cargo: string
  unNumber: string
  stage: (typeof hazardStages)[number]
  dimension: (typeof hazardDimensions)[number]
  hazardCode: string
  assessmentType: AssessmentType
  dataName: string
  measuredValue: string
  unit: string
  standardValue: string
  staticResult: string
  staticRisk: RiskLevel
  likelihood: number
  severity: number
  finding: string
  action: string
  photoName: string
  photoData: string
}

const fieldByHeader: Record<string, keyof ImportedAssessment> = {
  任务名称: 'taskName',
  办理局: 'bureau',
  办理站: 'station',
  作业区域: 'area',
  危险货物: 'cargo',
  un编号: 'unNumber',
  作业环节: 'stage',
  指标维度: 'dimension',
  危险源编号: 'hazardCode',
  评估方式: 'assessmentType',
  检测数据名称: 'dataName',
  检测值结论: 'measuredValue',
  单位: 'unit',
  标准或阈值: 'standardValue',
  确定性结论: 'staticResult',
  静态风险等级: 'staticRisk',
  发生可能性l: 'likelihood',
  后果严重度c: 'severity',
  隐患描述: 'finding',
  整改建议: 'action',
  照片文件名: 'photoName',
  检测照片文件名: 'photoName',
}

const normalizeHeader = (value: unknown) => String(value ?? '').trim().toLowerCase().replace(/[\s*＊/／]/g, '')
const cellText = (value: unknown) => String(value ?? '').trim()
const riskLevels: RiskLevel[] = ['低', '一般', '较大', '重大']

type ParsedRow = { values: unknown[]; excelRow: number }

export async function parseAssessmentWorkbook(file: File): Promise<ImportedAssessment[]> {
  const { default: readXlsxFile } = await import('read-excel-file/browser')
  const sheets = await readXlsxFile(file)
  const sheet = sheets.find((item) => item.sheet === '评估数据') ?? sheets[0]
  if (!sheet) throw new Error('Excel 中没有可读取的工作表')

  const rows = sheet.data as unknown[][]
  const { readWorkbookPhotos } = await import('./workbookPhotos')
  const photos = await readWorkbookPhotos(file, sheet.sheet)
  const parsed = parseAssessmentRows(rows)
  for (const row of parsed) {
    const pictures = photos.get(row.excelRow) ?? []
    if (pictures.length > 1) throw new Error(`第 ${row.excelRow} 行有多张检测照片，请每行保留一张，或导入后逐行上传`)
    if (pictures[0]) {
      try { row.photoData = await compressImage(pictures[0].file) }
      catch { throw new Error(`第 ${row.excelRow} 行检测照片无法读取，请重新插入或导入后逐条上传`) }
      row.photoName = row.photoName || pictures[0].name
    }
  }
  return parsed
}

export function parseAssessmentRows(rows: unknown[][]): Array<ImportedAssessment & { excelRow: number }> {
  const headerIndex = rows.slice(0, 12).findIndex((row) => row.some((cell) => normalizeHeader(cell) === '任务名称'))
  if (headerIndex < 0) throw new Error('未找到模板表头，请使用平台提供的 Excel 模板')

  const columns = rows[headerIndex].map((header) => fieldByHeader[normalizeHeader(header)] ?? null)
  const taskColumn = columns.indexOf('taskName')
  const dataRows: ParsedRow[] = rows.slice(headerIndex + 1).flatMap((row, index) => (
    taskColumn >= 0 && cellText(row[taskColumn]) ? [{ values: row, excelRow: headerIndex + index + 2 }] : []
  ))
  if (!dataRows.length) throw new Error('模板中没有评估数据，请填写表头下方的数据行')

  const required: Array<[string, string]> = [
    ['taskName', '任务名称'], ['bureau', '办理局'], ['station', '办理站'], ['area', '作业区域'],
    ['cargo', '危险货物'], ['stage', '作业环节'], ['dimension', '指标维度'], ['hazardCode', '危险源编号'],
    ['assessmentType', '评估方式'], ['dataName', '检测数据名称'], ['measuredValue', '检测值/结论'],
  ]
  const parsed: Array<ImportedAssessment & { excelRow: number }> = []
  const errors: string[] = []
  for (const { values, excelRow } of dataRows) {
    try {
      const raw: Record<string, string> = {}
      columns.forEach((field, index) => {
        if (field) raw[field] = cellText(values[index])
      })
      const missing = required.filter(([key]) => !raw[key]).map(([, label]) => label)
      if (missing.length) throw new Error(`缺少必填字段：${missing.join('、')}`)

      const bureau = bureaus.find((item) => item.name === raw.bureau || item.short === raw.bureau)
      if (!bureau) throw new Error(`办理局“${raw.bureau}”不在系统清单中`)
      if (!bureau.stations.includes(raw.station)) throw new Error(`办理站“${raw.station}”不属于${bureau.short}`)
      if (!hazardStages.includes(raw.stage as (typeof hazardStages)[number])) throw new Error('作业环节只能填写进场、装卸或搬运')
      if (!hazardDimensions.includes(raw.dimension as (typeof hazardDimensions)[number])) throw new Error('指标维度只能填写人、物、环或管')

      const hazard = hazardCatalog.find((item) => item.code.toLowerCase() === raw.hazardCode.toLowerCase())
      if (!hazard) throw new Error(`危险源编号“${raw.hazardCode}”不存在`)
      if (hazard.stage !== raw.stage || hazard.dimension !== raw.dimension) {
        throw new Error(`${hazard.code} 对应“${hazard.stage} / ${hazard.dimension}”，与表格填写不一致`)
      }
      if (raw.assessmentType !== '静态' && raw.assessmentType !== '动态') throw new Error('评估方式只能填写静态或动态')

      let staticResult = raw.staticResult || '符合'
      let staticRisk: RiskLevel = riskLevels.includes(raw.staticRisk as RiskLevel) ? raw.staticRisk as RiskLevel : '一般'
      const likelihood = Number(raw.likelihood || 2)
      const severity = Number(raw.severity || 2)
      if (raw.assessmentType === '静态') {
        if (!raw.staticResult) throw new Error('静态评估必须填写确定性结论')
        if (raw.likelihood || raw.severity) throw new Error('静态评估不能填写发生可能性 L 或后果严重度 C')
        if (staticResult !== '符合' && staticResult !== '不符合') throw new Error('确定性结论只能填写符合或不符合')
        if (staticResult === '符合' && raw.staticRisk) throw new Error('静态结论为“符合”时不能填写静态风险等级')
        if (staticResult === '不符合' && !riskLevels.includes(raw.staticRisk as RiskLevel)) throw new Error('静态结论不符合时必须填写有效的静态风险等级')
      } else {
        if (raw.staticResult || raw.staticRisk) throw new Error('动态评估不能填写确定性结论或静态风险等级')
        if (!raw.likelihood || !raw.severity) throw new Error('动态评估必须同时填写发生可能性 L 和后果严重度 C')
        if (!Number.isInteger(likelihood) || likelihood < 1 || likelihood > 5) throw new Error('发生可能性 L 必须为 1 至 5 的整数')
        if (!Number.isInteger(severity) || severity < 1 || severity > 5) throw new Error('后果严重度 C 必须为 1 至 5 的整数')
        staticResult = '符合'
        staticRisk = '一般'
      }

      const unNumber = (raw.unNumber || '').toUpperCase().replace(/\s+/g, '')
      if (unNumber && !/^UN\d{4}$/.test(unNumber)) throw new Error('UN编号应填写为 UN 加 4 位数字，例如 UN1863')
      parsed.push({
        taskName: raw.taskName,
        bureau: bureau.name,
        station: raw.station,
        area: raw.area,
        cargo: raw.cargo,
        unNumber,
        stage: raw.stage as ImportedAssessment['stage'],
        dimension: raw.dimension as ImportedAssessment['dimension'],
        hazardCode: hazard.code,
        assessmentType: raw.assessmentType,
        dataName: raw.dataName,
        measuredValue: raw.measuredValue,
        unit: raw.unit || '',
        standardValue: raw.standardValue || '',
        staticResult,
        staticRisk,
        likelihood,
        severity,
        finding: raw.finding || '',
        action: raw.action || '',
        photoName: raw.photoName || '',
        photoData: '',
        excelRow,
      })
    } catch (error) {
      errors.push(`第 ${excelRow} 行：${error instanceof Error ? error.message : '数据格式错误'}`)
    }
  }
  if (errors.length) throw new Error(errors.join('；'))
  return parsed
}
