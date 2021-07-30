import { browser, Tabs } from 'webextension-polyfill-ts'
import dayjs from 'dayjs'

let activeTab: Tabs.Tab | null = null

const showOrHidePageAction = async (tab: Tabs.Tab) => {
  const window = await browser.windows.get(tab.windowId!)
  if (window.type != 'normal') {
    return
  }

  if (tab.url && tab.id) {
    if (tab.url.match(/^https:\/\/www\.pokemon-card\.com\/deck\/deck\.html/)) {
      activeTab = tab
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
    .executeScript(activeTab?.id, {
      code: `Array.from(document.querySelectorAll('#cardImagesView > div > div > table > tbody')).map((el) => { const imageEl = el.querySelector('tr.imgBlockArea > td > a > img'); countEl = el.querySelector('tr:nth-child(3) > td.cPos.nowrap > span > span'); return { name: imageEl.alt, imageSrc: imageEl.src, count: parseInt(countEl?.innerText) } }).filter((data) => data.count > 0)`,
    })
    .catch((e) => console.error(e))
  if (response != null) {
    port.postMessage(response[0])
  }

  port.onMessage.addListener((message) => {
    // save in background to avoid quiting the popup
    const a = document.createElement('a')
    a.href = message
    a.download = `デッキ分布図_${dayjs().format('YYYYMMDDHHmmss')}.png`
    a.click()
    a.remove()
  })
})

browser.runtime.onInstalled.addListener(async () => {
  browser.contextMenus.create({
    id: 'ptcg-chart',
    title: 'デッキ分布図を作成',
    contexts: ['page'],
  })

  const [currentTab] = await browser.tabs.query({
    active: true,
    currentWindow: true,
  })
  await showOrHidePageAction(currentTab)
})

browser.contextMenus.onClicked.addListener(async (info, tab) => {
  const popupURL = browser.extension.getURL('popup.html')
  const [existingTab] = await browser.tabs.query({ url: popupURL })

  if (existingTab) {
    // reload the existing tab and bring it to front
    await browser.tabs.reload(existingTab.id!)
    await browser.windows.update(existingTab.windowId!, { focused: true })
  } else {
    // create a new tab and window
    const newTab = await browser.tabs.create({ url: popupURL, active: false })
    const windowHeight = navigator.platform.startsWith('Win') ? 478 : 445
    await browser.windows.create({
      tabId: newTab.id,
      type: 'popup',
      focused: true,
      width: 720,
      height: windowHeight,
    })
  }
})
