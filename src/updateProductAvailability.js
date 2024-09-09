import puppeteer from 'puppeteer'
import { getAllProducts, updateProductStock } from './config/sequelize/methods.js'
import { sequelize } from './config/sequelize/index.js'

async function startUpdating (url) {
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
    qty: 0
  }
  if (isQtyAvailable) {
    result = await page.evaluate(() => {
      const available = document.querySelector('.ui-pdp-buybox__quantity__available').innerText
      const qty = parseInt(available.replace(/[^0-9]+/g, ''))

      return { qty }
    })
  }

  await browser.close()

  return result
}

// updateProductAvailabilities()

async function main () {
  try {
    await sequelize.authenticate()
    console.log('Conexión a la base de datos establecida')

    // Obtener todos los productos
    const allProducts = await getAllProducts()
    // console.log(allProducts)

    const length = allProducts.length

    for (let index = 0; index < length; index++) {
      const element = allProducts[index]

      if (element.link.includes('mercadolibre')) {
        const { qty } = await startUpdating(element.link)

        const updated = await updateProductStock(element.id, qty)

        if (updated) {
          console.log(`${element.id} -  Stock actualizado (${qty}) - ${element.link}`)
        } else {
          console.log(`${element.id} -  Error al actualizar el stock`)
        }
      }
    }
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await sequelize.close()
  }
}

main()
