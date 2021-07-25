<template>
  <div class="ct-container">
    <div class="ct-chart" />
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch } from 'vue-property-decorator'
import Chartist from 'chartist'
import '../../node_modules/chartist/dist/chartist.min.css'

export interface IImageChartData extends Chartist.IChartistData {
  labels: Array<string>
  series: Array<number>
  images: Array<string>
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
  @Prop({ type: Object, required: true }) chartData!: IImageChartData | null
  @Prop({ type: Number, default: 1.25 }) scale!: number
  @Prop({ type: Number, default: 0 }) offsetX!: number
  @Prop({ type: Number, default: -20 }) offsetY!: number
  @Prop({ type: Number, default: 60 }) holeRadius!: number

  private chart: any = null

  @Watch('chartData')
  onChangeData(newValue: IImageChartData) {
    this.chart?.update(newValue)
  }

  private drawText(
    parent: HTMLElement,
    text: string,
    attributes?: {
      x?: string
      y?: string
      dx?: string
      dy?: string
      class?: string
    }
  ) {
    const svgNS = 'http://www.w3.org/2000/svg'
    const tspan = document.createElementNS(svgNS, 'tspan')

    if (attributes) {
      Object.entries(attributes).forEach(([name, value]) => {
        tspan.setAttribute(name, value!)
      })
    }

    tspan.textContent = text
    parent.appendChild(tspan)
  }

  mounted() {
    this.chart = new Chartist.Pie('.ct-chart', this.chartData!, {
      donut: true,
      donutSolid: true,
      donutWidth: 160 - this.holeRadius,
      chartPadding: 20,
      labelOffset: 30,
      labelDirection: 'explode',
      labelInterpolationFnc: (label: string, index: number) => {
        const sum = this.chartData!.series.reduce((a: number, b: number) => {
          return a + b
        })
        const ratio = (this.chartData!.series[index] / sum) * 100
        return `${label}\n${ratio.toFixed(1)}%`
      },
    })

    const baseWidth = 320
    const baseHeight = 447

    this.chart.on(
      'draw',
      (context: IChartDrawSliceData | IChartDrawLabelData) => {
        console.log(context)

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
            const innerX = outerX * (this.holeRadius / context.radius)
            const innerY = outerY * (this.holeRadius / context.radius)
            minX = Math.min(minX, innerX, outerX)
            minY = Math.min(minY, innerY, outerY)
            maxX = Math.max(maxX, innerX, outerX)
            maxY = Math.max(maxY, innerY, outerY)
          })

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
        } else if (context.type == 'label') {
          const lines = context.text.replace(/&amp;/g, '&').split('\n')

          context.element._node.textContent = ''
          context.element._node.setAttribute('x', `${context.x}`)
          context.element._node.setAttribute('y', `${context.y}`)
          context.element._node.setAttribute('dy', `${1 - lines.length}em`)
          context.element._node.removeAttribute('dx')

          lines.forEach((line) => {
            // emphasize percentage text
            const matches = line.match(/^([0-9]{1,3})(\.[0-9]%)$/)
            if (matches?.length == 3) {
              this.drawText(context.element._node, matches[1], {
                x: `${context.x}`,
                dy: '1.1em',
                class: 'ct-label-border ct-label-strong',
              })
              this.drawText(context.element._node, matches[2], {
                class: 'ct-label-border',
              })
              this.drawText(context.element._node, matches[1], {
                x: `${context.x}`,
                class: 'ct-label-strong',
              })
              this.drawText(context.element._node, matches[2])
            } else {
              this.drawText(context.element._node, line, {
                x: `${context.x}`,
                dy: '1.1em',
                class: 'ct-label-border',
              })
              this.drawText(context.element._node, line, {
                x: `${context.x}`,
              })
            }
          })

          const firstChild = context.element._node.firstChild as SVGElement
          firstChild.removeAttribute('x')
          firstChild.removeAttribute('dy')
        }
      }
    )
  }
}
</script>

<style lang="scss">
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
