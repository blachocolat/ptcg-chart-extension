<template>
  <div class="ct-container">
    <div
      :class="{
        'ct-background': true,
        'ct-background--transparent': transparentBackground,
      }"
      data-html2canvas-ignore
    />

    <div id="ct-chart" class="ct-chart" />

    <template v-if="chartData.length > 0">
      <div class="ct-title ct-title--border">{{ title }}</div>
      <div class="ct-title">{{ title }}</div>
    </template>

    <div v-else class="ct-message">
      <v-icon size="128">mdi-emoticon-cry-outline</v-icon>
      <div class="mt-1">
        [選択されたカード]&nbsp;に、カードが1枚もありません。<br />
        [デッキに入れるカードを検索]&nbsp;して、1枚以上選択してください。
      </div>
    </div>

    <!-- eslint-disable-next-line prettier/prettier -->
    <div class="ct-signature">
      powered by <v-icon>mdi-twitter</v-icon>@tilanosaur
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Emit, Prop, Watch } from 'vue-property-decorator'
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
  labels?: string[]
  series: number[]
  imageSrcs: (string | undefined)[]
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
  @Prop({ type: String, default: '' }) title!: string
  @Prop({ type: Number, default: 0.15 }) otherRatio!: number
  @Prop({ type: Boolean, default: false }) hideLabel!: boolean
  @Prop({ type: Boolean, default: false }) transparentBackground!: boolean
  @Prop({ type: Number, default: 1.5 }) scale!: number
  @Prop({ type: Number, default: 180 }) offsetX!: number
  @Prop({ type: Number, default: 30 }) offsetY!: number
  @Prop({ type: Number, default: 60 }) holeRadius!: number

  private chart!: IChartistImagePieChart

  get chartistData(): IChartistImagePieChartData {
    this.chartData.sort((a, b) => {
      return b.value - a.value // order by value desc
    })
    const total = this.chartData
      .map((data) => data.value)
      .reduce((a, b) => a + b, 0)
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
      const filteredTotal = filteredData
        .map((data) => data.value)
        .reduce((a, b) => a + b, 0)
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

  get chartistOptions(): Chartist.IPieChartOptions {
    return {
      donut: true,
      donutSolid: true,
      donutWidth: 175 - this.holeRadius,
      chartPadding: 20,
      labelOffset: 40,
      labelDirection: 'explode',
      showLabel: !this.hideLabel,
      labelInterpolationFnc: (label: string | number, index: number) => {
        const total = this.chartistData.series.reduce((a, b) => a + b, 0)
        const ratio = (this.chartistData.series[index] / total) * 100
        return typeof label == 'string'
          ? `${label}\n${ratio.toFixed(1)}%`
          : `${ratio.toFixed(1)}%`
      },
    }
  }

  @Watch('chartistData')
  onChangeData(newValue: IChartistImagePieChartData) {
    this.chart.update(newValue, this.chartistOptions)
  }

  @Watch('chartistOptions')
  onChangeOptions(newValue: Chartist.IPieChartOptions) {
    this.chart.update(this.chartistData, newValue)
  }

  @Emit('capture')
  async captureAsPNG() {
    // redraw with dataURL images
    const promises = this.chartistData.imageSrcs.map((url) => {
      return url ? Utils.createDataURL(url) : url
    })
    const dataURLs = await Promise.all(promises)
    const chartistData = Object.assign(this.chartistData, {
      imageSrcs: dataURLs,
    })
    this.chart.update(chartistData, this.chartistOptions)

    // save as PNG
    const el = this.$el as HTMLElement
    const canvas = await html2canvas(el, {
      scale: 16 / 9,
      backgroundColor: !this.transparentBackground ? '#ffffff' : null,
    })

    return canvas.toDataURL('image/png')
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
    this.chart = new Chartist.Pie(
      '#ct-chart',
      this.chartistData,
      this.chartistOptions
    ) as IChartistImagePieChart

    const baseWidth = 360 // 63 x 5.714
    const baseHeight = 503 // 88 x 5.714

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
              90,
              180,
              270,
            ]
            let minX = Number.MAX_VALUE
            let minY = Number.MAX_VALUE
            let maxX = -Number.MAX_VALUE
            let maxY = -Number.MAX_VALUE

            // calculate the ideal position (as in the unit circle)
            const holeRatio = this.holeRadius / context.radius
            for (const angle of angleList) {
              if (angle < context.startAngle) {
                continue
              }
              if (context.endAngle < angle) {
                break
              }

              const outerX = Math.sin(angle * (Math.PI / 180))
              const outerY = -Math.cos(angle * (Math.PI / 180))
              const innerX = outerX * holeRatio
              const innerY = outerY * holeRatio
              minX = Math.min(minX, innerX, outerX)
              minY = Math.min(minY, innerY, outerY)
              maxX = Math.max(maxX, innerX, outerX)
              maxY = Math.max(maxY, innerY, outerY)
            }

            // calculate the center of gravity
            const offsetTheta =
              ((context.startAngle + context.endAngle) / 2) * (Math.PI / 180)
            const theta =
              ((context.endAngle - context.startAngle) / 2) * (Math.PI / 180)
            const gravityRatio =
              (2 * (1 + holeRatio + holeRatio * holeRatio) * Math.sin(theta)) /
              (3 * (1 + holeRatio) * theta)
            const gravityX = gravityRatio * Math.sin(offsetTheta)
            const gravityY = gravityRatio * -Math.cos(offsetTheta)

            const scale = (Math.max(maxX - minX, maxY - minY) / 2) * this.scale
            const width = baseWidth * scale
            const height = baseHeight * scale
            const offsetX =
              context.radius * (gravityX - (scale - 1)) + this.offsetX
            const offsetY =
              context.radius * (gravityY - (scale - 1)) + this.offsetY

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
            context.element._node.setAttribute('style', 'fill: #9E9E9E')
          }
        } else if (context.type == 'label') {
          const lines = context.text.split('\n')

          context.element._node.textContent = ''
          context.element._node.setAttribute('x', `${context.x}`)
          context.element._node.setAttribute('y', `${context.y}`)
          context.element._node.setAttribute('dy', `${1.5 - lines.length}em`)
          context.element._node.removeAttribute('dx')

          lines.forEach((line) => {
            // emphasize the percentage
            const matches = line.match(/^([0-9]{1,3})((?:\.[0-9]+)?%)$/)

            if (matches?.length == 3) {
              this.drawText(context.element._node, matches[1], {
                x: `${context.x}`,
                dy: '1.1em',
                className: 'ct-label--border ct-label--strong',
              })
              this.drawText(context.element._node, matches[2], {
                className: 'ct-label--border',
              })
              this.drawText(context.element._node, matches[1], {
                x: `${context.x}`,
                className: 'ct-label--strong',
              })
              this.drawText(context.element._node, matches[2])
            } else {
              this.drawText(context.element._node, line, {
                x: `${context.x}`,
                dy: '1.1em',
                className: 'ct-label--border',
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
  font-weight: bold;
  fill: rgba(0, 0, 0, 0.87);
  color: rgba(0, 0, 0, 0.87);

  &--strong {
    font-size: 1.75em;
  }

  &--border {
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
  padding-bottom: 56.25%;

  .ct-background {
    position: absolute;
    width: 100%;
    height: 100%;
    background: #ffffff;

    &.ct-background--transparent {
      background: url(../../public/transparent-bg.png);
    }
  }

  .ct-chart {
    position: absolute;
    width: 100%;
    height: 100%;
  }

  .ct-title {
    position: absolute;
    width: 100%;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 1.25em;
    font-weight: bold;
    color: rgba(0, 0, 0, 0.87);
    white-space: pre-wrap;
    word-wrap: break-word;
    text-align: center;
    line-height: 1.25;

    &--border {
      color: #ffffff;
      text-stroke: 3px #ffffff;
      -webkit-text-stroke: 3px #ffffff;
    }
  }

  .ct-message {
    position: absolute;
    width: 100%;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 1.25em;
    font-weight: bold;
    color: rgba(0, 0, 0, 0.38);
    text-align: center;

    .v-icon {
      color: inherit;
    }
  }

  .ct-signature {
    position: absolute;
    right: 15px;
    bottom: 10px;
    font-size: 0.5em;
    color: rgba(0, 0, 0, 0.38);

    .v-icon {
      font-size: 10.5px;
      color: inherit;
      vertical-align: inherit;
    }
  }
}
</style>
