import { browser, Tabs } from 'webextension-polyfill-ts'

const showOrHidePageAction = async (tab: Tabs.Tab) => {
  if (tab.url && tab.id) {
    if (tab.url.match(/^https:\/\/www\.pokemon-card\.com\/deck\/deck\.html/)) {
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

browser.runtime.onConnect.addListener(async (port) => {
  const response = await browser.tabs
    .executeScript({
      code: `Array.from(document.querySelectorAll('#cardImagesView > div > div > table > tbody')).map((el) => { const imageEl = el.querySelector('tr.imgBlockArea > td > a > img'); countEl = el.querySelector('tr:nth-child(3) > td.cPos.nowrap > span > span'); return { name: imageEl.alt, imageSrc: imageEl.src, count: parseInt(countEl?.innerText) } }).filter((data) => data.count > 0)`,
    })
    .catch((e) => console.error(e))
  if (response != null) {
    port.postMessage(response[0])
  }
})
