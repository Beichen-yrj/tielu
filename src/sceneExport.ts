import { strToU8, zipSync } from 'fflate'
import { sceneFacts, sceneStages, stageExplanation, type SceneDraft } from './railScenario'

const xml = (v: string) => [...v].filter(c => c.charCodeAt(0) >= 32 || '\t\n\r'.includes(c)).join('').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const packageZip = (parts: Record<string, string | Uint8Array>) => zipSync(Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, typeof v === 'string' ? strToU8(v) : v])))
const rels = 'http://schemas.openxmlformats.org/package/2006/relationships'
const officeRels = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
const ns = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
export function buildSceneWorkbook(d: SceneDraft): Uint8Array {
  const sheets = [ { name: '场景参数与评估', rows: [['字段', '内容'], ...sceneFacts(d)] }, { name: '过程与后果', rows: [['阶段', '说明'], ...sceneStages.map((s, i) => [s, stageExplanation(d, i)])] } ]
  const parts: Record<string, string> = {
    '[Content_Types].xml': `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
    '_rels/.rels': `<Relationships xmlns="${rels}"><Relationship Id="rId1" Type="${officeRels}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    'xl/workbook.xml': `<workbook xmlns="${ns}" xmlns:r="${officeRels}"><sheets>${sheets.map((s, i) => `<sheet name="${s.name}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `<Relationships xmlns="${rels}">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${officeRels}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="styles" Type="${officeRels}/styles" Target="styles.xml"/></Relationships>`,
    'xl/styles.xml': `<styleSheet xmlns="${ns}"><fonts count="1"><font><sz val="11"/><name val="Microsoft YaHei"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="1"><xf fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`,
  }
  sheets.forEach((s, i) => { parts[`xl/worksheets/sheet${i + 1}.xml`] = `<worksheet xmlns="${ns}"><cols><col min="1" max="1" width="28" customWidth="1"/><col min="2" max="2" width="100" customWidth="1"/></cols><sheetData>${s.rows.map((r, row) => `<row r="${row + 1}" ht="46" customHeight="1">${r.map((v, col) => `<c r="${String.fromCharCode(65 + col)}${row + 1}" t="inlineStr"><is><t xml:space="preserve">${xml(v)}</t></is></c>`).join('')}</row>`).join('')}</sheetData></worksheet>` })
  return packageZip(parts)
}
export function buildSceneDocument(d: SceneDraft, imageSize = { width: 640, height: 400 }): Uint8Array {
  const w = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
  const p = (s: string, bold = false) => `<w:p><w:pPr><w:spacing w:after="120"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Calibri" w:eastAsia="Microsoft YaHei"/>${bold ? '<w:b/>' : ''}<w:sz w:val="22"/></w:rPr><w:t xml:space="preserve">${xml(s)}</w:t></w:r></w:p>`
  const content = [p('铁路三维情景 · 参数与评估资料', true), ...sceneFacts(d).map(([k, v]) => p(`${k}：${v}`)), p('问题过程与后果演示', true), ...sceneStages.flatMap((s, i) => [p(`${i + 1}. ${s}`, true), p(stageExplanation(d, i))])]
  const parts: Record<string, string | Uint8Array> = {}
  let imageRel = ''
  let imageType = ''
  if (d.photo) {
    const format = d.photo.startsWith('data:image/png') ? 'png' : d.photo.startsWith('data:image/webp') ? 'webp' : 'jpeg'
    const bytes = Uint8Array.from(atob(d.photo.split(',')[1]), c => c.charCodeAt(0))
    parts[`word/media/evidence.${format}`] = bytes
    imageType = `<Default Extension="${format}" ContentType="image/${format}"/>`
    imageRel = `<Relationship Id="photo" Type="${officeRels}/image" Target="media/evidence.${format}"/>`
    const cx = Math.min(5_400_000, Math.round(7_000_000 * imageSize.width / imageSize.height)), cy = Math.round(cx * imageSize.height / imageSize.width)
    content.push(p('现场照片 / 原始证据（非三维重建结果）', true), `<w:p><w:r><w:drawing><wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="1" name="现场照片"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="evidence"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="photo"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`)
  }
  parts['[Content_Types].xml'] = `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${imageType}<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`
  parts['_rels/.rels'] = `<Relationships xmlns="${rels}"><Relationship Id="rId1" Type="${officeRels}/officeDocument" Target="word/document.xml"/></Relationships>`
  parts['word/_rels/document.xml.rels'] = `<Relationships xmlns="${rels}">${imageRel}</Relationships>`
  parts['word/document.xml'] = `<w:document xmlns:w="${w}" xmlns:r="${officeRels}"><w:body>${content.join('')}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1000" w:right="1000" w:bottom="1000" w:left="1000"/></w:sectPr></w:body></w:document>`
  return packageZip(parts)
}
export function downloadSceneFile(name: string, value: Uint8Array | string, mime: string) {
  const blob = new Blob([typeof value === 'string' ? value : new Uint8Array(value)], { type: mime })
  const url = URL.createObjectURL(blob), a = document.createElement('a')
  a.href = url; a.download = name; a.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
