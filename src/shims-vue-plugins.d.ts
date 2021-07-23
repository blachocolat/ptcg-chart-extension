import { AxiosInstance } from 'axios'
import { Browser } from 'webextension-polyfill-ts'

declare module 'vue/types/vue' {
  interface Vue {
    $axios: AxiosInstance
    $browser: Browser
  }
}
