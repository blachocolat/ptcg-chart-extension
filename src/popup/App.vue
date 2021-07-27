<template>
  <v-app>
    <v-card>
      <image-pie-chart
        ref="pieChart"
        :chartData="chartData"
        :holeRadius="60"
        :otherRatio="otherRatio / 100"
      />

      <v-divider />

      <v-card-actions>
        <!-- input chart title -->
        <v-text-field
          placeholder="大会名など"
          prepend-icon="mdi-format-title"
          outlined
          dense
          hide-details
          :style="{ 'flex-grow': 0.1 }"
        />

        <!-- up/down other ratio -->
        <v-slider
          v-model="otherRatio"
          dense
          hide-details
          thumb-label
          max="50"
          min="0"
          :style="{ 'flex-grow': 0.9 }"
          @start="isSliderFocused = true"
          @end="isSliderFocused = false"
        >
          <template v-slot:prepend>
            <v-icon :class="{ 'primary--text': isSliderFocused }">
              mdi-chart-arc
            </v-icon>
          </template>
        </v-slider>

        <!-- toggle show/hide labels -->
        <v-btn icon color="primary">
          <v-icon>mdi-alphabetical-variant</v-icon>
        </v-btn>

        <!-- toggle light/dark mode -->
        <v-btn icon color="primary">
          <v-icon>mdi-lightbulb-outline</v-icon>
        </v-btn>

        <!-- downlaod button -->
        <v-btn
          depressed
          color="primary"
          :disabled="isProcessing"
          :loading="isProcessing"
          @click="onClick"
        >
          <v-icon left>mdi-download</v-icon>
          ダウンロード
        </v-btn>
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
  otherRatio: number = 15
  isSliderFocused: boolean = false
  isProcessing: boolean = false

  async onClick() {
    if (this.$refs.pieChart instanceof ImagePieChart) {
      this.isProcessing = true
      await this.$refs.pieChart.saveAsPNG()
      this.isProcessing = false
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

.v-application {
  &--is-ltr {
    .v-card {
      &__actions {
        .v-input {
          &__prepend-outer {
            margin-right: 4px;
          }
        }

        .v-slider {
          &--horizontal {
            margin-left: 4px;
            margin-right: 4px;
          }
        }

        .v-text-field {
          &--filled,
          &--full-width,
          &--outlined {
            &.v-input--dense {
              &.v-text-field {
                &--single-line,
                &--outlined,
                &--outlined.v-text-field--filled {
                  & > .v-input {
                    &__control > .v-input {
                      &__slot {
                        min-height: 36px;
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
</style>

<style lang="scss" scoped>
.v-application {
  &--is-ltr {
    .v-btn {
      &__content {
        .v-icon {
          &--left {
            margin-right: 2px;
          }
          &--right {
            margin-left: 2px;
          }
        }
      }
    }

    .v-card {
      &__actions {
        & > .v-btn.v-btn {
          .v-icon {
            &--left {
              margin-left: -2px;
            }
            &--right {
              margin-right: -2px;
            }
          }
        }

        & > .v-btn--icon {
          & + .v-btn--icon {
            margin-left: 0 !important;
          }

          & + :not(.v-btn--icon) {
            margin-left: 8px !important;
          }
        }

        & > :not(.v-btn--icon) {
          & + .v-btn--icon {
            margin-left: 8px !important;
          }

          & + :not(.v-btn--icon) {
            margin-left: 12px !important;
          }
        }
      }
    }
  }
}

.v-card {
  &__subtitle,
  &__text,
  &__title {
    padding: 12px 16px;
  }

  &__actions {
    padding: 12px;

    & > .v-btn.v-btn {
      padding: 0 10px;
    }
  }
}
</style>
