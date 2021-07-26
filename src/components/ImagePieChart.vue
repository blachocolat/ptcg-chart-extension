<template>
  <div class="ct-container">
    <div id="ct-chart" class="ct-chart" />

    <!-- eslint-disable-next-line prettier/prettier -->
    <div class="ct-signature">
      powered by <v-icon>mdi-twitter</v-icon>@tilanosaur
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch } from 'vue-property-decorator'
import Chartist from 'chartist'
import html2canvas from 'html2canvas'
import Utils from '@/plugins/utils'
import '../../node_modules/chartist/dist/chartist.min.css'

export type ImagePieChartData = {
  label: string
  value: number
  imageSrc?: string
}

interface IChartistImagePieChartData extends Chartist.IChartistData {
  labels: Array<string>
  series: Array<number>
  imageSrcs: Array<string | undefined>
}

interface IChartistImagePieChart extends Chartist.IChartistPieChart {
  svg: Chartist.IChartistSvg
}

interface IChartDrawSliceData {
  type: 'slice'
  center: { x: number; y: number }
  element: Chartist.IChartistSvg
  endAngle: number
  group: Chartist.IChartistSvg
  index: number
  path: Chartist.IChartistSvg
  radius: number
  series: number
  startAngle: number
  totalDataSum: number
  value: number
}

interface IChartDrawLabelData {
  type: 'label'
  element: Chartist.IChartistSvg
  group: Chartist.IChartistSvg
  index: number
  text: string
  x: number
  y: number
}

@Component
export default class ImagePieChart extends Vue {
  @Prop({ type: Array, default: [] }) chartData!: ImagePieChartData[]
  @Prop({ type: Number, default: 0.15 }) otherRatio!: number
  @Prop({ type: Number, default: 1.25 }) scale!: number
  @Prop({ type: Number, default: 0 }) offsetX!: number
  @Prop({ type: Number, default: -20 }) offsetY!: number
  @Prop({ type: Number, default: 60 }) holeRadius!: number

  private chart!: IChartistImagePieChart

  get chartistData(): IChartistImagePieChartData {
    this.chartData.sort((a, b) => {
      return b.value - a.value // order by value desc
    })
    const total =
      this.chartData.length > 0
        ? this.chartData.map((data) => data.value).reduce((a, b) => a + b)
        : 0
    let subTotal = 0
    let minValue = 0

    for (const data of this.chartData) {
      if (1 - this.otherRatio <= subTotal / total) {
        minValue = data.value
        break
      }
      subTotal += data.value
    }

    const filteredData = this.chartData.filter((data) => data.value > minValue)
    if (filteredData.length < this.chartData.length) {
      const filteredTotal =
        filteredData.length > 0
          ? filteredData.map((data) => data.value).reduce((a, b) => a + b)
          : 0
      filteredData.push({
        label: 'その他',
        value: total - filteredTotal,
      })
    }

    return {
      labels: filteredData.map((data) => data.label),
      series: filteredData.map((data) => data.value),
      imageSrcs: filteredData.map((data) => data.imageSrc),
    }
  }

  @Watch('chartistData')
  onChangeData(newValue: IChartistImagePieChartData) {
    this.chart.update(newValue)
  }

  async saveAsPNG() {
    // redraw with dataURL images
    const promises = this.chartistData.imageSrcs.map(async (url) => {
      return url ? Utils.createDataURL(url) : url
    })
    const dataURLs = await Promise.all(promises)
    const chartistData = Object.assign(this.chartistData, {
      imageSrcs: dataURLs,
    })
    this.chart.update(chartistData)

    // save as PNG
    const element = this.$el as HTMLElement
    const canvas = await html2canvas(element, { scale: 16 / 9 })
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = `デッキ分布図_${this.$dayjs().format('YYYYMMDDHHmmss')}.png`
    a.click()
    a.remove()
  }

  private drawText(
    parent: HTMLElement,
    text: string,
    attributes?: {
      x?: string
      y?: string
      dx?: string
      dy?: string
      className?: string
    }
  ) {
    const svgNS = 'http://www.w3.org/2000/svg'
    const tspan = document.createElementNS(svgNS, 'tspan')

    if (attributes) {
      Object.entries(attributes).forEach(([name, value]) => {
        tspan.setAttribute(name == 'className' ? 'class' : name, value!)
      })
    }

    tspan.textContent = text
    parent.appendChild(tspan)
  }

  mounted() {
    this.chart = new Chartist.Pie('#ct-chart', this.chartistData, {
      donut: true,
      donutSolid: true,
      donutWidth: 160 - this.holeRadius,
      chartPadding: 20,
      labelOffset: 30,
      labelDirection: 'explode',
      labelInterpolationFnc: (label: string, index: number) => {
        const total =
          this.chartistData.series.length > 0
            ? this.chartistData.series.reduce((a, b) => a + b)
            : 0
        const ratio = (this.chartistData.series[index] / total) * 100
        return `${label}\n${ratio.toFixed(1)}%`
      },
    }) as IChartistImagePieChart

    const baseWidth = 320
    const baseHeight = 447

    this.chart.on(
      'draw',
      (context: IChartDrawSliceData | IChartDrawLabelData) => {
        if (context.type == 'slice') {
          const imageSrc = this.chartistData.imageSrcs[context.index]

          if (imageSrc) {
            const imageId = `img-${Math.random().toString(36).substr(2, 8)}`

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

            for (const angle of angleList) {
              if (angle < context.startAngle) {
                continue
              }
              if (context.endAngle < angle) {
                break
              }

              const outerX = Math.sin(angle * (Math.PI / 180))
              const outerY = -Math.cos(angle * (Math.PI / 180))
              const innerX = outerX * (this.holeRadius / context.radius)
              const innerY = outerY * (this.holeRadius / context.radius)
              minX = Math.min(minX, innerX, outerX)
              minY = Math.min(minY, innerY, outerY)
              maxX = Math.max(maxX, innerX, outerX)
              maxY = Math.max(maxY, innerY, outerY)
            }

            const scale = (Math.max(maxX - minX, maxY - minY) / 2) * this.scale
            const width = baseWidth * scale
            const height = baseHeight * scale
            const offsetX =
              context.radius * ((minX + maxX) / 2 - (scale - 1)) +
              200 +
              this.offsetX
            const offsetY =
              context.radius * ((minY + maxY) / 2 - ((maxY - minY) / 2 - 1)) +
              20 +
              this.offsetY

            const svgNS = 'http://www.w3.org/2000/svg'
            const defs = document.createElementNS(svgNS, 'defs')

            const pattern = document.createElementNS(svgNS, 'pattern')
            pattern.setAttribute('id', imageId)
            pattern.setAttribute('patternUnits', 'userSpaceOnUse')
            pattern.setAttribute('x', `${offsetX}`)
            pattern.setAttribute('y', `${offsetY}`)
            pattern.setAttribute('width', `${width}`)
            pattern.setAttribute('height', `${height}`)

            const image = document.createElementNS(svgNS, 'image')
            image.setAttribute('href', imageSrc)
            image.setAttribute('width', `${width}`)
            image.setAttribute('height', `${height}`)

            pattern.appendChild(image)
            defs.appendChild(pattern)
            this.chart.svg._node.appendChild(defs)

            context.element._node.setAttribute(
              'style',
              `fill: url(#${imageId})`
            )
          } else {
            context.element._node.setAttribute(
              'style',
              `fill: rgba(0, 0, 0, 0.38)`
            )
          }
        } else if (context.type == 'label') {
          const lines = context.text.split('\n')

          context.element._node.textContent = ''
          context.element._node.setAttribute('x', `${context.x}`)
          context.element._node.setAttribute('y', `${context.y}`)
          context.element._node.setAttribute('dy', `${1 - lines.length}em`)
          context.element._node.removeAttribute('dx')

          lines.forEach((line) => {
            // emphasize the percentage
            const matches = line.match(/^([0-9]{1,3})((?:\.[0-9]+)?%)$/)

            if (matches?.length == 3) {
              this.drawText(context.element._node, matches[1], {
                x: `${context.x}`,
                dy: '1.1em',
                className: 'ct-label-border ct-label-strong',
              })
              this.drawText(context.element._node, matches[2], {
                className: 'ct-label-border',
              })
              this.drawText(context.element._node, matches[1], {
                x: `${context.x}`,
                className: 'ct-label-strong',
              })
              this.drawText(context.element._node, matches[2])
            } else {
              this.drawText(context.element._node, line, {
                x: `${context.x}`,
                dy: '1.1em',
                className: 'ct-label-border',
              })
              this.drawText(context.element._node, line, {
                x: `${context.x}`,
              })
            }
          })

          const firstChild = context.element._node.firstChild
          if (firstChild instanceof SVGElement) {
            firstChild.removeAttribute('x')
            firstChild.removeAttribute('dy')
          }
        }
      }
    )
  }
}
</script>

<style lang="scss">
.ct-chart-donut {
  .ct-series {
    stroke: #ffffff;
    stroke-width: 2px;
  }

  .ct-label {
    dominant-baseline: initial;
  }
}

.ct-label {
  fill: rgba(0, 0, 0, 0.87);
  color: rgba(0, 0, 0, 0.87);
  font-weight: bold;

  &-strong {
    font-size: 1.75em;
  }

  &-border {
    fill: #ffffff;
    stroke: #ffffff;
    stroke-width: 3px;
  }
}
</style>

<style lang="scss" scoped>
.ct-container {
  position: relative;
  width: 100%;
  height: 0;
  padding-bottom: 50%;

  .ct-chart {
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
  }
}

.ct-signature {
  position: absolute;
  right: 15px;
  bottom: 10px;
  font-size: 0.5rem;
  color: rgba(0, 0, 0, 0.38);

  .v-icon {
    font-size: 10.5px;
    color: inherit;
    vertical-align: inherit;
  }
}
</style>
