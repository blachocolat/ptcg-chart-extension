<template>
  <div class="ct-container">
    <div class="ct-chart" />
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import Chartist from 'chartist'
import '../../node_modules/chartist/dist/chartist.min.css'

@Component
export default class ImagePieChart extends Vue {
  private chart: any = null

  mounted() {
    const data = {
      series: [2, 1, 1],
    }
    const sum = (a: number, b: number) => {
      return a + b
    }

    this.chart = new Chartist.Pie('.ct-chart', data, {
      labelInterpolationFnc(value: any) {
        return Math.round((value / data.series.reduce(sum)) * 100) + '%'
      },
    })

    this.chart.on('draw', (context: any) => {
      if (context.type == 'slice') {
        console.log(context)
        const imgId = `img-${Math.random().toString(36).substr(2, 8)}`
        const baseWidth = 400
        const baseHeight = 559
        const centerAngle =
          (context.endAngle - context.startAngle) / 2 + context.startAngle
        const offsetX =
          (context.radius / 2) * Math.sin(centerAngle * (Math.PI / 180)) + 5
        const offsetY =
          (context.radius / 2) * -Math.cos(centerAngle * (Math.PI / 180)) + 5
        console.log(`sin(${centerAngle}) = (${offsetX}, ${offsetY})`)

        const svgNS = 'http://www.w3.org/2000/svg'
        const defs = document.createElementNS(svgNS, 'defs')
        const pattern = document.createElementNS(svgNS, 'pattern')
        pattern.setAttribute('id', imgId)
        pattern.setAttribute('patternUnits', 'userSpaceOnUse')
        pattern.setAttribute('width', `${baseWidth}`)
        pattern.setAttribute('height', `${baseHeight}`)
        const image = document.createElementNS(svgNS, 'image')
        image.setAttribute(
          'href',
          'https://www.pokemon-card.com/assets/images/card_images/large/SM11a/036912_P_RIZADONTERUNAGX.jpg'
        )
        image.setAttribute('x', `${offsetX}`)
        image.setAttribute('y', `${offsetY}`)
        image.setAttribute('width', `${baseWidth}`)
        image.setAttribute('height', `${baseHeight}`)

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
