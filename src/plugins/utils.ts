export default class Utils {
  static createDataURL(url: string) {
    return new Promise<string>((resolve, reject) => {
      const image = new Image()
      image.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = image.width
        canvas.height = image.height
        const context = canvas.getContext('2d')
        context?.drawImage(image, 0, 0)
        resolve(canvas.toDataURL('image/png'))
      }
      image.onerror = reject
      image.src = url
    })
  }
}
