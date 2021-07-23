import { Browser } from 'webextension-polyfill-ts'

declare module 'vue/types/vue' {
  interface Vue {
    $browser: Browser
  }
}
