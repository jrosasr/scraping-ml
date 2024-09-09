import { Sequelize, DataTypes } from 'sequelize'
import dotenv from 'dotenv'

dotenv.config()

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres'
})

const Product = sequelize.define(
  'product',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    stock: {
      type: DataTypes.INTEGER
    },
    link: {
      type: DataTypes.STRING
    }
  },
  {
    timestamps: false
  }
)

export { sequelize, Product }
