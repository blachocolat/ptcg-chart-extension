<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'
import Chart from 'chart.js'
import { Pie } from 'vue-chartjs'

@Component
export default class ImagePieChart extends Mixins(Pie) {
  @Prop({ type: Object, required: true }) chartData!: Chart.ChartData
  @Prop({ type: Object }) options?: Chart.ChartOptions

  mounted() {
    this.renderChart(this.chartData, this.options)
  }
}
</script>
