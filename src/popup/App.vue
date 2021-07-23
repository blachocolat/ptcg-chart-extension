<template>
  <v-app>
    <v-card>
      <v-card-title dense>使用率グラフつくるマシーン</v-card-title>

      <v-divider />

      <v-card-actions>
        <v-btn depressed color="primary">テスト</v-btn>
      </v-card-actions>
    </v-card>
  </v-app>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'

@Component
export default class App extends Vue {}
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
