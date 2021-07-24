<template>
  <div class="ct-container">
    <div class="ct-chart" />
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch } from 'vue-property-decorator'
import Chartist from 'chartist'
import '../../node_modules/chartist/dist/chartist.min.css'

export interface ImageChartData extends Chartist.IChartistData {
  labels: Array<string>
  series: Array<number>
  images: Array<string>
}

@Component
export default class ImagePieChart extends Vue {
  @Prop({ type: Object, required: true })
  public chartData!: ImageChartData | null

  private chart: any = null

  @Watch('chartData')
  onChangeData(newValue: ImageChartData) {
    console.log(newValue)
    this.chart?.update(newValue)
  }

  mounted() {
    this.chart = new Chartist.Pie('.ct-chart', this.chartData!, {
      labelInterpolationFnc: (label: string, index: number) => {
        const sum = this.chartData!.series.reduce((a: number, b: number) => {
          return a + b
        })
        const ratio = (this.chartData!.series[index] / sum) * 100
        return `${label}\n${Math.round(ratio)}%`
      },
    })

    const baseWidth = 400
    const baseHeight = 560

    this.chart.on('draw', (context: any) => {
      if (context.type == 'slice') {
        const imgId = `img-${Math.random().toString(36).substr(2, 8)}`

        const angleList = [
          context.startAngle,
          context.endAngle,
          0,
          90,
          180,
          270,
        ]
        let minX = 0
        let minY = 0
        let maxX = 0
        let maxY = 0

        angleList.some((angle: number) => {
          if (angle < context.startAngle) {
            return false // continue
          }
          if (context.endAngle < angle) {
            return true // break
          }

          const x = Math.sin(angle * (Math.PI / 180))
          const y = -Math.cos(angle * (Math.PI / 180))
          minX = Math.min(minX, x)
          minY = Math.min(minY, y)
          maxX = Math.max(maxX, x)
          maxY = Math.max(maxY, y)
        })

        const scale = Math.max(maxX - minX, maxY - minY) / 2
        const width = baseWidth * scale
        const height = baseHeight * scale
        const offsetX = context.radius * ((minX + maxX) / 2 - (scale - 1))
        const offsetY = context.radius * ((minY + maxY) / 2 - (scale - 1))
        console.log(`(${minX}, ${minY}) -> (${maxX}, ${maxY})`)
        console.log(`(${offsetX}, ${offsetY}) * ${scale}`)

        const svgNS = 'http://www.w3.org/2000/svg'
        const defs = document.createElementNS(svgNS, 'defs')

        const pattern = document.createElementNS(svgNS, 'pattern')
        pattern.setAttribute('id', imgId)
        pattern.setAttribute('patternUnits', 'userSpaceOnUse')
        pattern.setAttribute('x', `${offsetX}`)
        pattern.setAttribute('y', `${offsetY}`)
        pattern.setAttribute('width', `${width}`)
        pattern.setAttribute('height', `${height}`)

        const image = document.createElementNS(svgNS, 'image')
        image.setAttribute('href', this.chartData!.images[context.index])
        image.setAttribute('width', `${width}`)
        image.setAttribute('height', `${height}`)

        pattern.appendChild(image)
        defs.appendChild(pattern)
        this.chart.svg._node.appendChild(defs)

        context.element._node.setAttribute('style', `fill: url(#${imgId})`)
      }
    })
  }
}
</script>

<style lang="scss" scoped>
.ct-container {
  position: relative;
  width: 100%;
  height: 0;
  padding-bottom: 100%;

  .ct-chart {
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
  }
}
</style>
