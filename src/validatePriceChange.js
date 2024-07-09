import puppeteer from 'puppeteer'
import { supabase } from './config/supabase.js'
import { Telegraf } from 'telegraf'

const BOT = new Telegraf(process.env.BOT_ID)

const CHAT_IDS = process.env.CHAT_IDS.split(', ')

async function sendNotifications (list) {
  const batchSize = 5 // Tamaño del grupo de productos a enviar por mensaje
  const chunks = []

  // Dividir la lista en grupos de batchSize
  for (let i = 0; i < list.length; i += batchSize) {
    chunks.push(list.slice(i, i + batchSize))
  }

  // Enviar el mensaje a cada chatId
  const currentDate = new Date().toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).replace(/\//g, '/')

  const html = `<b>Lista de productos que actualizaron su precio (${currentDate}):</b>\n\n`

  for (const chatId of CHAT_IDS) {
    try {
      await BOT.telegram.sendMessage(chatId, html, { parse_mode: 'HTML' })
      console.log(`Mensaje enviado a ${chatId}`)
    } catch (error) {
      console.error(`Error al enviar mensaje a ${chatId}:`, error)
    }
  }

  // Iterar sobre cada grupo y enviar los mensajes
  for (const chunk of chunks) {
    let htmlContent = ''

    for (const item of chunk) {
      htmlContent += `${item.icon} <a href="${item.link}">${item.name}</a>\n`
      htmlContent += `<strong>Antes: ${item.cost}</strong>\n`
      htmlContent += `<strong>Ahora: ${item.newCost}</strong>\n\n`
    }

    // Enviar el mensaje a cada chatId
    for (const chatId of CHAT_IDS) {
      try {
        await BOT.telegram.sendMessage(chatId, htmlContent, { parse_mode: 'HTML' })
        console.log(`Mensaje enviado a ${chatId}`)
      } catch (error) {
        console.error(`Error al enviar mensaje a ${chatId}:`, error)
      }
    }
  }
}

async function validatePriceChange () {
  const { data: incProducts } = await supabase
    .from('inc_products')
    .select('*')
    .eq('available', true)
    .eq('hidden', false)

  const list = []
  let counter = 1

  for (const prod of incProducts) {
    if (prod.link) {
      try {
        const { priceContent } = await startDownload(prod.link)
        console.log(`${counter}/${incProducts.length} - Updating stock of: ${prod.name}`)
        // console.log('---' + prod.link)
        console.log('---' + prod.cost)
        console.log('--' + priceContent)
        console.log('----------------------')
        if (priceContent > (prod.cost + 0.1) || priceContent < (prod.cost - 0.1)) {
          list.push({
            name: prod.name,
            link: prod.link,
            cost: prod.cost,
            newCost: priceContent,
            icon: priceContent > prod.cost ? '📈' : '📉'
          })
        }
      } catch (error) {
        //
      }
    }
    counter++
  }

  await sendNotifications(list)
}

async function startDownload (url) {
  const browser = await puppeteer.launch({
    headless: true, // Cambia a true para modo sin cabeza
    slowMo: 50
  })

  const page = await browser.newPage()
  await page.goto(url)

  const isQtyAvailable = await page.evaluate(() => {
    return Boolean(document.querySelector('.ui-pdp-buybox__quantity__available'))
  })

  let result = {
    priceContent: 0
  }

  if (isQtyAvailable) {
    result = await page.evaluate(() => {
      const metaElement = document.querySelector('meta[itemprop="price"]')

      // Verifica si se encontró el elemento y extrae su atributo content
      let priceContent = 0

      if (metaElement) {
        priceContent = metaElement.getAttribute('content')
      }

      return { priceContent }
    })
  }
  await browser.close()

  return result
}

validatePriceChange()
