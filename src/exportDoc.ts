export type DocSection = {
  heading: string
  paragraphs?: string[]
  facts?: Array<[string, string]>
  list?: string[]
  table?: { columns: string[]; rows: string[][] }
}

const escapeHtml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export function buildDocHtml(title: string, subtitle: string, sections: DocSection[]) {
  const body = sections.map((section) => {
    const parts: string[] = [`<h2>${escapeHtml(section.heading)}</h2>`]
    if (section.paragraphs?.length) parts.push(...section.paragraphs.map((text) => `<p>${escapeHtml(text)}</p>`))
    if (section.facts?.length) {
      parts.push('<table class="facts">' + section.facts.map(([key, value]) => `<tr><th>${escapeHtml(key)}</th><td>${escapeHtml(value)}</td></tr>`).join('') + '</table>')
    }
    if (section.list?.length) parts.push('<ol>' + section.list.map((text) => `<li>${escapeHtml(text)}</li>`).join('') + '</ol>')
    if (section.table) {
      const head = section.table.columns.map((column) => `<th>${escapeHtml(column)}</th>`).join('')
      const rows = section.table.rows.map((row) => '<tr>' + row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('') + '</tr>').join('')
      parts.push(`<table class="grid"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>`)
    }
    return parts.join('')
  }).join('')

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
body{font-family:"宋体",serif;font-size:10.5pt;line-height:1.75;color:#111}
h1{font-size:16pt;text-align:center;margin:0 0 6pt}
.sub{text-align:center;color:#666;font-size:9pt;margin-bottom:16pt}
h2{font-size:12pt;margin:16pt 0 8pt;border-left:3pt solid #185da7;padding-left:6pt}
p{margin:0 0 8pt;text-indent:2em}
table{border-collapse:collapse;width:100%;margin-bottom:10pt}
table.facts th{width:26%;text-align:left;background:#f2f6fa}
th,td{border:0.5pt solid #999;padding:4pt 6pt;font-size:9pt;vertical-align:top}
table.grid th{background:#eef3f8}
ol{margin:0 0 10pt;padding-left:20pt}
li{margin-bottom:4pt}
</style></head><body>
<h1>${escapeHtml(title)}</h1><div class="sub">${escapeHtml(subtitle)}</div>
${body}
</body></html>`
}

export function downloadDoc(fileName: string, html: string) {
  const blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName.endsWith('.doc') ? fileName : `${fileName}.doc`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function downloadText(fileName: string, text: string, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob(['\ufeff', text], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
