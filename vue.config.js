module.exports = {
  chainWebpack: (config) => {
    // adambullmer/vue-cli-plugin-browser-extension seems conflict with webextension-polyfill-ts
    // And browser object will be undefined
    // To support Typescript, Follow https://github.com/adambullmer/vue-cli-plugin-browser-extension#browser-polyfills to remove the webpack chain 'provide-webextension-polyfill'
    config.plugins.delete('provide-webextension-polyfill')
    config.module.rules.delete('provide-webextension-polyfill')
  },

  pages: {
    popup: {
      template: 'public/browser-extension.html',
      entry: './src/popup/main.ts',
      title: 'Popup',
    },
  },

  pluginOptions: {
    browserExtension: {
      componentOptions: {
        background: {
          entry: 'src/background.ts',
        },
      },
    },
  },

  transpileDependencies: ['vuetify'],
}
