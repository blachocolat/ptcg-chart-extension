<template>
  <v-app>
    <v-card>
      <v-card-title dense>デッキ分布図つくるマシーン</v-card-title>

      <v-divider />

      <image-pie-chart ref="pieChart" :chartData="chartData" :holeRadius="60" />

      <v-card-actions>
        <v-btn depressed color="primary" @click="onClick">テスト</v-btn>
      </v-card-actions>
    </v-card>
  </v-app>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import { Runtime } from 'webextension-polyfill-ts'
import ImagePieChart, {
  ImagePieChartData,
} from '@/components/ImagePieChart.vue'

@Component({
  components: { ImagePieChart },
})
export default class App extends Vue {
  chartData: ImagePieChartData[] = []
  port: Runtime.Port | null = null

  async onClick() {
    if (this.$refs.pieChart instanceof ImagePieChart) {
      await this.$refs.pieChart.saveAsPNG()
    }
  }

  mounted() {
    this.port = this.$browser.runtime.connect()
    this.port.onMessage.addListener((message: any[]) => {
      this.chartData = message.map((m) => {
        return {
          label: m.name.replace(/&amp;/g, '&'),
          value: m.count,
          imageSrc: m.imageSrc,
        }
      })
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
