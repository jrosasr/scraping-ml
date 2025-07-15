import puppeteer from 'puppeteer'
import client from './config/postgres.js'
import fetch from 'node-fetch'
import 'dotenv/config'

async function validatePriceChange () {
  console.log('Validando cambios de precios...')

  // get products from postgres client
  const { rows: incProducts } = await client.query('SELECT * FROM products WHERE available = true')

  console.log(`Found ${incProducts.length} products to check.`)

  const listProductsToUpdate = []
  let counter = 1

  for (const prod of incProducts) {
    if (prod.link && prod.link.includes('https://articulo.mercadolibre.com')) {
      try {
        const { priceContent } = await startScraping(prod.link)
        console.log(`${counter}/${incProducts.length} - Updating stock of: ${prod.name}`)
        if (priceContent > (prod.cost + 0.1) || priceContent < (prod.cost - 0.1)) {
          listProductsToUpdate.push(prod.id)
          console.log(prod.cost)
          console.log(prod.priceContent)
        }
      } catch (error) {
        console.error(error)
      }
    }
    counter++
  }

  // Actualiza el valor de la columna outdated_price a falso de todos lo productos que estan en la lista listProductsToUpdate
  await client.query('UPDATE products SET outdated_price = false WHERE id = ANY($1)', [listProductsToUpdate])

  console.log(`Productos pendientes por actualizar: ${listProductsToUpdate.length}`)

  sendWhatsappReminder(listProductsToUpdate.length)
}

async function startScraping (url) {
  const browser = await puppeteer.launch({
    headless: true, // Cambia a true para modo sin cabeza
    slowMo: 50,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--window-size=1920,1080',
      '--lang=es-ES,es'
    ]
  })

  const page = await browser.newPage()
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'es-ES,es;q=0.9'
  })
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
  })
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

async function sendWhatsappReminder (pendingCount) {
  const url = `${process.env.BOT_WHATSAPP}/${process.env.BOT_WHATSAPP_VERSION}/messages`
  const body = {
    number: '+584147389097',
    message: `*RosasStore* te recuerda que hay ${pendingCount} productos pendientes por actualizar en la plataforma.`,
    secret: process.env.BOT_WHATSAPP_TOKEN
  }
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    if (!response.ok) {
      console.error('Error enviando mensaje WhatsApp:', await response.text())
    } else {
      console.log('Mensaje de WhatsApp enviado correctamente')
    }
  } catch (err) {
    console.error('Error en la petición WhatsApp:', err)
  }
}

validatePriceChange()
