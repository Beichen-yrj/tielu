import { strFromU8, unzipSync } from 'fflate'

type WorkbookPhoto = { file: Blob; name: string }
const elements = (node: Document | Element, name: string) => Array.from(node.getElementsByTagNameNS('*', name))
const relationId = (node: Element) => node.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id') || ''
const resolvePart = (source: string, target: string) => {
  const parts: string[] = []
  for (const part of (target.startsWith('/') ? target.slice(1) : `${source.slice(0, source.lastIndexOf('/') + 1)}${target}`).split('/')) {
    if (part === '..') parts.pop()
    else if (part && part !== '.') parts.push(part)
  }
  return parts.join('/')
}

// Only read packaged images. Never request URLs or local paths from a workbook.
export async function readWorkbookPhotos(file: File, sheetName: string): Promise<Map<number, WorkbookPhoto[]>> {
  if (file.size > 30 * 1024 * 1024) throw new Error('Excel 文件不能超过 30 MB，请压缩检测照片后重试')
  const zip = unzipSync(new Uint8Array(await file.arrayBuffer()))
  const xml = (path: string) => {
    if (!zip[path]) throw new Error(`Excel 图片引用缺失：${path}`)
    const document = new DOMParser().parseFromString(strFromU8(zip[path]), 'application/xml')
    if (elements(document, 'parsererror').length) throw new Error('Excel 图片信息无法读取')
    return document
  }
  const relationships = (source: string) => {
    const slash = source.lastIndexOf('/')
    const path = `${source.slice(0, slash + 1)}_rels/${source.slice(slash + 1)}.rels`
    const result = new Map<string, string>()
    if (zip[path]) for (const item of elements(xml(path), 'Relationship')) {
      if (item.getAttribute('TargetMode') !== 'External') result.set(item.getAttribute('Id') || '', resolvePart(source, item.getAttribute('Target') || ''))
    }
    return result
  }
  const sheet = elements(xml('xl/workbook.xml'), 'sheet').find((item) => item.getAttribute('name') === sheetName)
  if (!sheet) return new Map()
  const sheetPath = relationships('xl/workbook.xml').get(relationId(sheet))
  if (!sheetPath) return new Map()
  const sheetRels = relationships(sheetPath)
  const photos = new Map<number, WorkbookPhoto[]>()
  for (const drawing of elements(xml(sheetPath), 'drawing')) {
    const drawingPath = sheetRels.get(relationId(drawing))
    if (!drawingPath) continue
    const rels = relationships(drawingPath)
    for (const anchor of Array.from(xml(drawingPath).documentElement.children)) {
      const from = elements(anchor, 'from')[0]
      const rowText = from && elements(from, 'row')[0]?.textContent
      if (rowText == null) continue
      const row = Number(rowText) + 1
      for (const picture of elements(anchor, 'pic')) {
        const blip = elements(picture, 'blip')[0]
        const id = blip?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'embed')
        const imagePath = id && rels.get(id)
        if (!imagePath || !zip[imagePath]) throw new Error(`第 ${row} 行检测照片缺失，请重新插入图片`)
        const extension = imagePath.split('.').pop()?.toLowerCase()
        const mime = extension === 'png' ? 'image/png' : extension === 'jpg' || extension === 'jpeg' ? 'image/jpeg' : extension === 'webp' ? 'image/webp' : ''
        if (!mime) throw new Error(`第 ${row} 行图片格式不支持，请使用 JPG、PNG 或 WebP`)
        const name = imagePath.split('/').pop() || `第${row}行检测照片`
        const bytes = new Uint8Array(zip[imagePath]).buffer
        photos.set(row, [...(photos.get(row) ?? []), { file: new Blob([bytes], { type: mime }), name }])
      }
    }
  }
  if (Object.keys(zip).some((path) => path.startsWith('xl/richData/'))) {
    throw new Error('暂不支持 Excel 单元格内图片，请改为插入浮动图片并将左上角放在对应数据行，或导入后逐行上传照片')
  }
  return photos
}
