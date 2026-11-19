export function compressImage(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = () => {
      const image = new Image()
      image.onerror = reject
      image.onload = () => {
        const scale = Math.min(1, 1280 / Math.max(image.width, image.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(image.width * scale))
        canvas.height = Math.max(1, Math.round(image.height * scale))
        const context = canvas.getContext('2d')
        if (!context) { reject(new Error('无法处理图片')); return }
        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.76))
      }
      image.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })
}

// The existing evidence field stores one image; keep every picture in a numbered sheet.
export async function compressInspectionPhotos(files: Blob[]): Promise<string> {
  if (files.length === 1) return compressImage(files[0])
  if (!files.length) throw new Error('没有可读取的检测照片')
  const images = await Promise.all(files.map(file => new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => { URL.revokeObjectURL(url); resolve(image) }
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('检测照片无法读取')) }
    image.src = url
  })))
  const columns = Math.ceil(Math.sqrt(images.length))
  const rows = Math.ceil(images.length / columns)
  const width = Math.min(1280, Math.floor(2560 / columns))
  const height = Math.min(960, Math.floor(2560 / rows))
  const canvas = document.createElement('canvas')
  canvas.width = columns * width
  canvas.height = rows * height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('无法处理检测照片')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  images.forEach((image, index) => {
    const x = (index % columns) * width
    const y = Math.floor(index / columns) * height
    const padding = 16
    const labelHeight = 48
    const scale = Math.min((width - padding * 2) / image.width, (height - padding * 2 - labelHeight) / image.height)
    const drawWidth = image.width * scale
    const drawHeight = image.height * scale
    context.drawImage(image, x + (width - drawWidth) / 2, y + labelHeight + (height - labelHeight - drawHeight) / 2, drawWidth, drawHeight)
    context.fillStyle = '#163452'
    context.font = '24px "Microsoft YaHei", sans-serif'
    context.fillText(`检测照片 ${index + 1} / ${images.length}`, x + padding, y + 34)
  })
  return canvas.toDataURL('image/jpeg', 0.82)
}
