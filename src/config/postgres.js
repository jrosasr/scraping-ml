import { Client } from 'pg'
import 'dotenv/config'

const client = new Client({
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USERNAME || 'test',
  password: process.env.DB_PASSWORD || 'test',
  database: process.env.DB_DATABASE || 'test'
})

client.connect()
  .then(() => console.log('Conexión a PostgreSQL exitosa'))
  .catch(err => console.error('Error de conexión a PostgreSQL:', err))

export default client
