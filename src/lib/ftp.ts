import { Client } from 'basic-ftp'
import { Readable, Writable } from 'stream'
import { decrypt } from './encryption'

interface FTPConfig {
  host: string
  user: string
  encryptedPassword: string
  port?: number
  path?: string
}

/**
 * Create and connect an FTP client
 */
async function createFTPClient(config: FTPConfig): Promise<Client> {
  const client = new Client()
  client.ftp.verbose = process.env.NODE_ENV === 'development'
  
  const password = decrypt(config.encryptedPassword)
  
  await client.access({
    host: config.host,
    user: config.user,
    password: password,
    port: config.port || 21,
    secure: false,
  })
  
  if (config.path) {
    await client.cd(config.path)
  }
  
  return client
}

/**
 * Read a file from FTP server
 */
export async function readFile(config: FTPConfig, filePath: string): Promise<string> {
  const client = await createFTPClient(config)
  
  try {
    const chunks: Buffer[] = []
    const writable = new Writable({
      write(chunk, encoding, callback) {
        chunks.push(Buffer.from(chunk))
        callback()
      },
    })
    
    await client.downloadTo(writable, filePath)
    return Buffer.concat(chunks).toString('utf-8')
  } finally {
    client.close()
  }
}

/**
 * Write a file to FTP server
 */
export async function writeFile(
  config: FTPConfig,
  filePath: string,
  content: string
): Promise<void> {
  const client = await createFTPClient(config)
  
  try {
    const readable = Readable.from([content])
    await client.uploadFrom(readable, filePath)
  } finally {
    client.close()
  }
}

/**
 * List files in a directory
 */
export async function listFiles(config: FTPConfig, dirPath?: string): Promise<string[]> {
  const client = await createFTPClient(config)
  
  try {
    const files = await client.list(dirPath || '.')
    return files
      .filter((f) => f.type !== 2) // Exclude directories (type 2)
      .map((f) => f.name)
  } finally {
    client.close()
  }
}

/**
 * Test FTP connection
 */
export async function testConnection(config: FTPConfig): Promise<boolean> {
  try {
    const client = await createFTPClient(config)
    client.close()
    return true
  } catch (error) {
    console.error('FTP connection test failed:', error)
    return false
  }
}
