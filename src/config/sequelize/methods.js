import { Product } from './index.js'

async function getAllProducts () {
  try {
    const products = await Product.findAll()
    return products
  } catch (error) {
    console.error('Error al obtener los productos:', error)
    return null
  }
}

async function updateProductStock (productId, newStock) {
  try {
    const [updatedRows] = await Product.update({ stock: newStock }, {
      where: { id: productId }
    })

    return updatedRows === 1 // Retorna true si se actualizó un registro
  } catch (error) {
    console.error('Error al actualizar el stock del producto:', error)
    return false
  }
}

export { getAllProducts, updateProductStock }
