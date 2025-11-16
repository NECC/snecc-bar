import pkg from 'pg'
const { Client } = pkg

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('Missing DATABASE_URL environment variable. Please check your .env file.')
}

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
})

export const connectDB = async () => {
  await client.connect()
}

export const query = async (text: string, params?: any[]) => {
  const res = await client.query(text, params)
  return res.rows
}

export const disconnectDB = async () => {
  await client.end()
}
