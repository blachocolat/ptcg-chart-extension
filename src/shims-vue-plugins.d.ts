import { Browser } from 'webextension-polyfill'
import dayjs from 'dayjs'

declare module 'vue/types/vue' {
  interface Vue {
    $browser: Browser
    $dayjs: typeof dayjs
  }
}
