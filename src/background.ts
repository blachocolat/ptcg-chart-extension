import { browser, Runtime, Tabs } from 'webextension-polyfill-ts'
import dayjs from 'dayjs'

let activeTab: Tabs.Tab | null = null
let activePort: Runtime.Port | null = null

const injectElementCode = `
  Array.from(document.querySelectorAll('#cardImagesView > div > div > table > tbody'))
    .forEach((el) => {
      // do nothing if elements have been already injected
      if (el.querySelector('tr:last-child > td > input[type=text]')) {
        return
      }
      const imageEl = el.querySelector('tr.imgBlockArea > td > a > img');
      const trEl = document.createElement('tr');
      const tdEl = document.createElement('td');
      tdEl.setAttribute('colspan', 2);
      const inputEl = document.createElement('input');
      inputEl.type = 'text';
      inputEl.value = imageEl.alt.replace(/&amp;/g, '&');
      inputEl.style['width'] = '100%';
      inputEl.style['padding'] = '3px 6px';
      inputEl.style['box-sizing'] = 'border-box';
      inputEl.style['border'] = 'solid 2px #ddd';
      inputEl.style['background-color'] = '#fff';
      inputEl.style['border-radius'] = '4px';
      inputEl.oninput = () => {
        // update global variable
        const imageId = imageEl.id.replace(/^img_([0-9]+)$/, '$1')
        const scriptEl = document.createElement('script');
        scriptEl.append(\`
          PCGDECK.searchItemNameAlt[\${imageId}] = '\${inputEl.value}';
        \`);
        document.body.append(scriptEl);
        scriptEl.remove();
        // update alt in editing
        imageEl.alt = inputEl.value;
      }
      tdEl.append(inputEl);
      trEl.append(tdEl);
      el.append(trEl);
    });
`
const injectObserverCode = `
  if (typeof globalObserver === 'undefined') {
    // global define
    globalObserver = new MutationObserver((mutations) => {
      ${injectElementCode}
    })
    globalObserver.observe(
      document.querySelector('#cardImagesView'),
      { childList: true }
    )
  }
`

const injectObserver = async () => {
  await browser.tabs
    .executeScript(activeTab?.id, { code: injectObserverCode })
    .catch((e) => console.error(e))
}

const injectElement = async () => {
  await browser.tabs
    .executeScript(activeTab?.id, { code: injectElementCode })
    .catch((e) => console.error(e))
}

const fetchCards = async () => {
  const response = await browser.tabs
    .executeScript(activeTab?.id, {
      code: `
        Array.from(document.querySelectorAll('#cardImagesView > div > div > table > tbody'))
          .map((el) => {
            const imageEl = el.querySelector('tr.imgBlockArea > td > a > img');
            const countEl = el.querySelector('tr > td.cPos.nowrap > span');
            return {
              name: imageEl.alt,
              imageSrc: imageEl.src,
              count: parseInt(countEl?.innerText),
            }
          })
          .filter((data) => data.count > 0)
      `,
    })
    .catch((e) => console.error(e))
  if (response != null) {
    activePort?.postMessage(response[0])
  }
}

const showOrHidePageAction = async (tab: Tabs.Tab) => {
  const window = await browser.windows.get(tab.windowId!)
  if (window.type != 'normal') {
    return
  }

  if (tab.url && tab.id) {
    const pattern = /^https:\/\/www\.pokemon-card\.com\/deck\/(deck.html(\?deckID=[0-9a-zA-Z]{6}-[0-9a-zA-Z]{6}-[0-9a-zA-Z]{6})?|result.html\/deckID\/[0-9a-zA-Z]{6}-[0-9a-zA-Z]{6}-[0-9a-zA-Z]{6}\/?)$/
    if (pattern.test(tab.url)) {
      activeTab = tab
      injectElement()
      injectObserver()
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
  activePort = port
  fetchCards()

  activePort.onMessage.addListener((message) => {
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
    documentUrlPatterns: [
      'https://www.pokemon-card.com/deck/deck.html',
      'https://www.pokemon-card.com/deck/result.html/deckID/*',
    ],
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
    // bring the existing tab to front and reload it
    await browser.windows.update(existingTab.windowId!, { focused: true })
    await fetchCards()
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
