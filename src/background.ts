import { browser, Tabs } from 'webextension-polyfill-ts'

const showOrHidePageAction = async (tab: Tabs.Tab) => {
  if (tab.url && tab.id) {
    if (tab.url?.match(/^https:\/\/www.pokemon-card.com\/deck\/deck.html/)) {
      await browser.pageAction.show(tab.id)
    } else {
      await browser.pageAction.hide(tab.id)
    }
  }
}

browser.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await browser.tabs.get(activeInfo.tabId)
  await showOrHidePageAction(tab)
})
browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  await showOrHidePageAction(tab)
})
browser.tabs.onCreated.addListener(async (tab) => {
  await showOrHidePageAction(tab)
})
