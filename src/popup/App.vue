<template>
  <v-app>
    <v-card>
      <v-card-title dense>使用率グラフつくるマシーン</v-card-title>

      <v-divider />

      <image-pie-chart
        :chartData="datacollection"
        :options="{ cutoutPercentage: 0 }"
      />

      <v-card-actions>
        <v-btn depressed color="primary">テスト</v-btn>
      </v-card-actions>
    </v-card>
  </v-app>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import ImagePieChart from '@/components/ImagePieChart.vue'

@Component({
  components: {
    ImagePieChart,
  },
})
export default class App extends Vue {
  datacollection = {
    labels: [this.getRandomInt(), this.getRandomInt()],
    datasets: [
      {
        label: 'Data One',
        backgroundColor: ['#087979', '#887979', '#f87979'],
        data: [this.getRandomInt(), this.getRandomInt(), this.getRandomInt()],
      },
    ],
  }

  getRandomInt() {
    return Math.floor(Math.random() * (50 - 5 + 1)) + 5
  }
}
</script>

<style lang="scss">
html {
  width: 400px;
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
