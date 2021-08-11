import { browser, Runtime, Tabs } from 'webextension-polyfill-ts'
import dayjs from 'dayjs'

let activeTab: Tabs.Tab | null = null
let activePorts: Runtime.Port[] = []

const injectElementCode = async () => {
  const options = await browser.storage.local.get({
    cardNames: {},
  })
  return `
    globalCardNames = JSON.parse('${JSON.stringify(options.cardNames)}')
    Array.from(document.querySelectorAll('#cardImagesView > div > div > table > tbody'))
      .forEach((el) => {
        // do nothing if elements have been already injected
        if (el.querySelector('tr:last-child > td > input[type=text]')) {
          return
        }
        const imageEl = el.querySelector('tr.imgBlockArea > td > a > img')
        const cardId = parseInt(imageEl.id.replace(/^img_([0-9]+)$/, '$1'), 10)
        imageEl.alt = globalCardNames[cardId] || imageEl.alt.replace(/&amp;/g, '&')
        {
          const countEl = el.querySelector('tr > td.cPos.nowrap > span')
          if (countEl?.querySelector('span')) {
            const inputEl = document.createElement('input')
            inputEl.type = 'text'
            inputEl.pattern = '^[0-9]+$'
            inputEl.value = parseInt(countEl.innerText, 10)
            inputEl.style['width'] = 'calc(100% - 56px)'
            inputEl.style['margin-right'] = '4px'
            inputEl.style['padding'] = '3px 6px'
            inputEl.style['box-sizing'] = 'border-box'
            inputEl.style['border'] = 'solid 2px #ddd'
            inputEl.style['background-color'] = '#fff'
            inputEl.style['border-radius'] = '4px'
            inputEl.oninput = () => {
              // allow only half-width numbers
              inputEl.value = inputEl.value
                .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 65248))
                .replace(/[^0-9]/g, '')

              // update global variable
              const deckType =
                countEl.querySelector('a').getAttribute('onclick').replace(/^javascript:PCGDECK\\.cardCntChange\\('(deck_[^']+)', '[0-9]+', [0-9]\\); return false;$/, '$1')
              const scriptEl = document.createElement('script')
              scriptEl.append(\`
                PCGDECK.cardCntSet("\${deckType}", \${cardId}, \${parseInt(inputEl.value, 10) || 0})
                $("#cardCntImagesArea").text("現在のデッキ内には "+PCGDECK.cardViewCnt+" 枚のカードが選択されています")
                $("#cardCntImagesArea").append($("<div />").text("削除したカードは「調整用カード」枠に入ります ").addClass("Text-annotation"));
              \`)
              document.body.append(scriptEl)
              scriptEl.remove()
            }
            countEl.prepend(inputEl)
            countEl.querySelector('span').remove()
            countEl.querySelector('br').remove()
          }
        }
        const trEl = document.createElement('tr')
        const tdEl = document.createElement('td')
        tdEl.setAttribute('colspan', 2)
        const inputEl = document.createElement('input')
        inputEl.type = 'text'
        inputEl.value = globalCardNames[cardId] || imageEl.alt.replace(/&amp;/g, '&')
        inputEl.placeholder = imageEl.alt.replace(/&amp;/g, '&')
        inputEl.style['width'] = '100%'
        inputEl.style['padding'] = '3px 6px'
        inputEl.style['box-sizing'] = 'border-box'
        inputEl.style['border'] = 'solid 2px #ddd'
        inputEl.style['background-color'] = '#fff'
        inputEl.style['border-radius'] = '4px'
        inputEl.oninput = () => {
          // update global variable
          const scriptEl = document.createElement('script')
          scriptEl.append(\`
            PCGDECK.searchItemNameAlt[\${cardId}] = "\${inputEl.value}"
          \`)
          document.body.append(scriptEl)
          scriptEl.remove()
          // update alt in editing
          imageEl.alt = inputEl.value
        }
        tdEl.append(inputEl)
        trEl.append(tdEl)
        el.append(trEl)
      })

      if (typeof globalScriptEl === 'undefined') {
        // update global variable
        globalScriptEl = document.createElement('script')
        globalScriptEl.append(\`
          PCGDECK.cardCntChange=function(f,e,k){var l=$("#"+f).val();if(l!=""){var h=l.split("-");var i=h.length;var g=[];for(ii=0;ii<i;ii++){var j=h[ii].split("_");if(j[0]==e){j[1]=parseInt(j[1],10)+k;if(j[1]<=0){j[1]=0}g.push(j.join("_"));PCGDECK.errorItemClear(j[0])}else{g.push(h[ii])}}$("#"+f).val(g.join("-"));PCGDECK.cardTableViewCall(1)}return false};
          PCGDECK.cardCntSet=function(f,e,k){var l=$("#"+f).val();if(l!=""){var h=l.split("-");var i=h.length;var g=[];for(ii=0;ii<i;ii++){var j=h[ii].split("_");if(j[0]==e){m=parseInt(j[1],10);j[1]=k;if(j[1]<=0){j[1]=0}PCGDECK.cardViewCnt+=j[1]-m;g.push(j.join("_"));PCGDECK.errorItemClear(j[0])}else{g.push(h[ii])}}$("#"+f).val(g.join("-"));PCGDECK.setCookieCall(f)}return false};
        \`)
        document.body.append(globalScriptEl)
        globalScriptEl.remove()
      }
    `
}

const injectObserverCode = async () => {
  return `
    if (typeof globalObserver === 'undefined') {
      // global define
      globalObserver = new MutationObserver((mutations) => {
        ${await injectElementCode()}
      })
      globalObserver.observe(
        document.querySelector('#cardImagesView'),
        { childList: true }
      )
    }
  `
}

const injectObserver = async () => {
  await browser.tabs
    .executeScript(activeTab?.id, { code: await injectObserverCode() })
    .catch((e) => console.error(e))
}

const injectElement = async () => {
  await browser.tabs
    .executeScript(activeTab?.id, { code: await injectElementCode() })
    .catch((e) => console.error(e))
}

const fetchCards = async () => {
  const response = await browser.tabs
    .executeScript(activeTab?.id, {
      code: `
        Array.from(document.querySelectorAll('#cardImagesView > div > div > table > tbody'))
          .map((el) => {
            const imageEl = el.querySelector('tr.imgBlockArea > td > a > img')
            const cardId = parseInt(imageEl.id.replace(/^img_([0-9]+)$/, '$1'), 10)
            const countEl = el.querySelector('tr > td.cPos.nowrap > span')
            const inputEl = countEl?.querySelector('input[type="text"]')
            return {
              id: cardId,
              name: imageEl.alt,
              imageSrc: imageEl.src,
              count: parseInt(inputEl?.value || countEl?.innerText, 10),
            }
          })
          .filter((data) => data.count > 0)
      `,
    })
    .catch((e) => console.error(e))
  if (response != null && response.length > 0) {
    // save card names into the storage
    const options = await browser.storage.local.get({
      cardNames: {},
    })
    response[0].forEach((data: any) => {
      options.cardNames[data.id] = data.name
    })
    await browser.storage.local.set(options)

    activePorts.forEach((activePort) => activePort.postMessage(response[0]))
  }
}

const showOrHidePageAction = async (tab: Tabs.Tab) => {
  const window = await browser.windows.get(tab.windowId!)
  if (window.type != 'normal') {
    return
  }

  if (tab.url && tab.id) {
    const pattern = /^https:\/\/www\.pokemon-card\.com\/deck\/(deck.html(\?deckID=[0-9A-Za-z]{6}-[0-9A-Za-z]{6}-[0-9A-Za-z]{6})?|[^.]+.html\/deckID\/[0-9A-Za-z]{6}-[0-9A-Za-z]{6}-[0-9A-Za-z]{6}\/?)$/
    if (pattern.test(tab.url)) {
      activeTab = tab
      await injectElement()
      await injectObserver()
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
  activePorts.push(port)
  await fetchCards()

  port.onDisconnect.addListener(() => {
    activePorts = activePorts.filter((activePort) => activePort != port)
  })

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
    documentUrlPatterns: [
      'https://www.pokemon-card.com/deck/deck.html',
      'https://www.pokemon-card.com/deck/deck.html?deckID=*',
      'https://www.pokemon-card.com/deck/*.html/deckID/*',
    ],
  })

  const [currentTab] = await browser.tabs.query({
    active: true,
    currentWindow: true,
  })
  if (currentTab) {
    await showOrHidePageAction(currentTab)
  }
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
