<template>
  <v-app>
    <v-card>
      <v-card-title dense>デッキ分布図つくるマシーン</v-card-title>

      <v-divider />

      <image-pie-chart :chartData="chartData" :holeRadius="60" />

      <v-card-actions>
        <v-btn depressed color="primary" @click="onClick">テスト</v-btn>
      </v-card-actions>
    </v-card>
  </v-app>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import ImagePieChart, {
  ImagePieChartData,
} from '@/components/ImagePieChart.vue'
import { Runtime } from 'webextension-polyfill-ts'

@Component({
  components: { ImagePieChart },
})
export default class App extends Vue {
  chartData: ImagePieChartData | null = null
  port: Runtime.Port | null = null

  onClick() {
    this.port?.postMessage(Date.now())
  }

  mounted() {
    this.port = this.$browser.runtime.connect()
    this.port.onMessage.addListener((message) => {
      this.chartData = {
        labels: message.map((m) => m.name),
        series: message.map((m) => m.count),
        images: message.map((m) => m.src),
      }
    })
  }
}
</script>

<style lang="scss">
html {
  width: 720px;
}
</style>

<style lang="scss" scoped>
.v-card {
  &__subtitle,
  &__text,
  &__title {
    padding: 12px 16px;
  }

  &__actions {
    padding: 12px;
  }
}
</style>
