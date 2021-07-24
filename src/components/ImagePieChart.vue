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
  @Prop({ type: Object, required: true }) chartData!: ImageChartData | null
  @Prop({ type: Number, default: 1.25 }) scale!: number
  @Prop({ type: Number, default: 0 }) offsetX!: number
  @Prop({ type: Number, default: -20 }) offsetY!: number
  @Prop({ type: Number, default: 60 }) holeRadius!: number

  private chart: any = null

  @Watch('chartData')
  onChangeData(newValue: ImageChartData) {
    console.log(newValue)
    this.chart?.update(newValue)
  }

  mounted() {
    this.chart = new Chartist.Pie('.ct-chart', this.chartData!, {
      donut: true,
      donutWidth: 160 - this.holeRadius,
      chartPadding: 20,
      labelOffset: 60,
      labelDirection: 'explode',
      labelInterpolationFnc: (label: string, index: number) => {
        const sum = this.chartData!.series.reduce((a: number, b: number) => {
          return a + b
        })
        const ratio = (this.chartData!.series[index] / sum) * 100
        return `${label}\n${Math.round(ratio)}%`
      },
    })

    const baseWidth = 320
    const baseHeight = 447

    this.chart.on('draw', (context: any) => {
      if (context.type == 'slice') {
        const imgId = `img-${Math.random().toString(36).substr(2, 8)}`

        const holeRadius = context.radius - this.chart.options.donutWidth / 2
        const radius = context.radius + this.chart.options.donutWidth / 2
        const angleList = [
          context.startAngle,
          context.endAngle,
          0,
          90,
          180,
          270,
        ]
        let minX = Number.MAX_VALUE
        let minY = Number.MAX_VALUE
        let maxX = -Number.MAX_VALUE
        let maxY = -Number.MAX_VALUE

        angleList.some((angle: number) => {
          if (angle < context.startAngle) {
            return false // continue
          }
          if (context.endAngle < angle) {
            return true // break
          }

          const outerX = Math.sin(angle * (Math.PI / 180))
          const outerY = -Math.cos(angle * (Math.PI / 180))
          const innerX = outerX * (holeRadius / radius)
          const innerY = outerY * (holeRadius / radius)
          minX = Math.min(minX, innerX, outerX)
          minY = Math.min(minY, innerY, outerY)
          maxX = Math.max(maxX, innerX, outerX)
          maxY = Math.max(maxY, innerY, outerY)
        })

        const scale = (Math.max(maxX - minX, maxY - minY) / 2) * this.scale
        const width = baseWidth * scale
        const height = baseHeight * scale
        const offsetX =
          radius * ((minX + maxX) / 2 - (scale - 1)) + 160 + this.offsetX
        const offsetY =
          radius * ((minY + maxY) / 2 - ((maxY - minY) / 2 - 1)) +
          20 +
          this.offsetY
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

        context.element._node.setAttribute(
          'style',
          `stroke-width: ${this.chart.options.donutWidth}px; stroke: url(#${imgId})`
        )
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
  padding-bottom: 56.25%;

  .ct-chart {
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
  }
}
</style>
