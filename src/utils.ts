import crypto from 'crypto'

// 加密函数
export function encrypt (payload:string, keyBase64:string) {
  const key = Buffer.from(keyBase64, 'base64')
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
  let encrypted = cipher.update(payload, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return { data: encrypted, iv: iv.toString('hex') }
}

export interface DecryptedMessage {
  iv: string;
  data: string;
}

// 解密函数
export function decrypt (message: DecryptedMessage, keyBase64: string): any {
  const key = Buffer.from(keyBase64, 'base64')
  const iv = Buffer.from(message.iv, 'hex')
  const encryptedText = Buffer.from(message.data, 'hex')
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)

  // 注意这里的修改
  let decrypted = decipher.update(encryptedText, undefined, 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

// 生成密钥
export function getKey () {
  return crypto.randomBytes(32).toString('base64')
}

// 使用基础字符串生成密钥
export function getKeyByBasicString (basicString: string) {
  const hash = crypto.createHash('sha256')
  hash.update(basicString)
  const key = hash.digest('base64')
  return key
}
