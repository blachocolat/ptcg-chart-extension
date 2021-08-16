<template>
  <v-app>
    <v-card>
      <image-pie-chart
        ref="pieChart"
        :chart-data="chartData"
        :title="options.title"
        :other-ratio="options.otherRatio / 100"
        :hide-label="options.label == 'hidden'"
        :transparent-background="options.background == 'transparent'"
      />

      <v-divider />

      <v-card-actions>
        <!-- input chart title -->
        <v-textarea
          v-model="options.title"
          placeholder="大会名など"
          outlined
          rows="1"
          dense
          hide-details
          :style="{ 'flex-grow': 0.1 }"
          @focus="isTextFieldFocused = true"
          @blur="isTextFieldFocused = false"
        >
          <template v-slot:prepend>
            <v-tooltip top>
              <template v-slot:activator="{ on, attrs }">
                <v-icon
                  :class="{ 'primary--text': isTextFieldFocused }"
                  v-bind="attrs"
                  v-on="on"
                >
                  mdi-format-title
                </v-icon>
              </template>
              <span>タイトル</span>
            </v-tooltip>
          </template>
        </v-textarea>

        <!-- up/down other ratio -->
        <v-slider
          v-model="options.otherRatio"
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
            <v-tooltip top>
              <template v-slot:activator="{ on, attrs }">
                <v-icon
                  :class="{ 'primary--text': isSliderFocused }"
                  v-bind="attrs"
                  v-on="on"
                >
                  mdi-chart-arc
                </v-icon>
              </template>
              <span>その他の割合</span>
            </v-tooltip>
          </template>
        </v-slider>

        <!-- toggle show/hide labels -->
        <v-btn
          v-if="options.label == 'shown'"
          icon
          color="primary"
          @click="options.label = 'hidden'"
        >
          <v-tooltip top>
            <template v-slot:activator="{ on, attrs }">
              <v-icon v-bind="attrs" v-on="on">
                mdi-alphabetical-variant
              </v-icon>
            </template>
            <span>ラベルあり</span>
          </v-tooltip>
        </v-btn>
        <v-btn v-else icon @click="options.label = 'shown'">
          <v-tooltip top>
            <template v-slot:activator="{ on, attrs }">
              <v-icon v-bind="attrs" v-on="on">
                mdi-alphabetical-variant-off
              </v-icon>
            </template>
            <span>ラベルなし</span>
          </v-tooltip>
        </v-btn>

        <!-- toggle background opacity -->
        <v-btn
          v-if="options.background == 'fill'"
          icon
          color="primary"
          @click="options.background = 'transparent'"
        >
          <v-tooltip top>
            <template v-slot:activator="{ on, attrs }">
              <v-icon v-bind="attrs" v-on="on">mdi-invert-colors</v-icon>
            </template>
            <span>背景色あり</span>
          </v-tooltip>
        </v-btn>
        <v-btn v-else icon @click="options.background = 'fill'">
          <v-tooltip top>
            <template v-slot:activator="{ on, attrs }">
              <v-icon v-bind="attrs" v-on="on">mdi-invert-colors-off</v-icon>
            </template>
            <span>背景色なし</span>
          </v-tooltip>
        </v-btn>

        <!-- downlaod button -->
        <v-btn
          depressed
          color="primary"
          :disabled="chartData.length == 0 || isProcessing"
          :loading="isProcessing"
          @click="onClickDownload"
        >
          <v-icon left>mdi-download</v-icon>
          ダウンロード
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-app>
</template>

<script lang="ts">
import { Component, Vue, Watch } from 'vue-property-decorator'
import { Runtime } from 'webextension-polyfill-ts'
import ImagePieChart, {
  ImagePieChartData,
} from '@/components/ImagePieChart.vue'

type ChartOptions = {
  title?: string
  otherRatio?: number
  label?: 'shown' | 'hidden'
  background?: 'fill' | 'transparent'
  theme?: 'light' | 'dark'
}

@Component({
  components: { ImagePieChart },
})
export default class App extends Vue {
  chartData: ImagePieChartData[] = []
  options: ChartOptions = {
    title: '',
    otherRatio: 15,
    label: 'shown',
    background: 'fill',
    theme: 'light',
  }
  port: Runtime.Port | null = null

  isTextFieldFocused: boolean = false
  isSliderFocused: boolean = false
  isProcessing: boolean = false

  @Watch('options', { deep: true })
  async onChangeOptions() {
    await this.$browser.storage.sync.set(this.options)
  }

  async onClickDownload() {
    if (this.$refs.pieChart instanceof ImagePieChart) {
      this.isProcessing = true
      const dataURL = await this.$refs.pieChart.captureAsPNG()
      this.port?.postMessage(dataURL)
      this.isProcessing = false
    }
  }

  async created() {
    // set the title for the popup window
    document.title = 'デッキ分布図つくるマシーン'

    // restore options
    this.options = await this.$browser.storage.sync.get(this.options)

    // connect to the background and receive data
    this.port = this.$browser.runtime.connect()
    this.port.onMessage.addListener(async (message: any[]) => {
      this.chartData = message.map((data) => {
        return {
          label: data.name,
          value: data.count,
          imageSrc: data.imageSrc,
        }
      })
    })
  }
}
</script>

<style lang="scss">
html {
  width: 720px;
  overflow: hidden;
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

  &--wrap {
    min-height: initial !important;
  }
}

.v-text-field {
  &--full-width,
  &--enclosed {
    &.v-input--dense:not(.v-text-field--solo).v-text-field--outlined {
      .v-input {
        &__prepend-outer,
        &__prepend-inner,
        &__append-inner,
        &__append-outer {
          margin-top: 6px !important;
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
