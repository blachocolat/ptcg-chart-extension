import Vue from 'vue'
import App from './App.vue'
import router from '@/router'
import store from '@/store'
import vuetify from '@/plugins/vuetify'
import browser from 'webextension-polyfill'
import dayjs from 'dayjs'

Vue.prototype.$browser = browser
Vue.prototype.$dayjs = dayjs

/* eslint-disable no-new */
new Vue({
  el: '#app',
  router,
  store,
  vuetify,
  render: (h) => h(App),
})
