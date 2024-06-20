/* eslint-disable sort-keys */
import 'dotenv/config.js'
import * as mqtt from 'mqtt'
import axios from 'axios'
import crypto from 'crypto'

const ops: any = {
  http: {
    host: process.env['http_host_remote'] || 'http://127.0.0.1', // 远程http服务的本地请求地址
    port: process.env['http_port_remote'] || 19088, // 远程http服务的本地请求端口
  },
  mqtt: {
    endpoint: process.env['mqtt_endpoint'] || 'broker.emqx.io', // MQTT服务的接入点
    port: process.env['mqtt_port'] || '1883', // MQTT服务的端口号
    username: process.env['mqtt_username'] || '', // MQTT用户名
    password: process.env['mqtt_password'] || '', // MQTT密码
    requestTopic: process.env['mqtt_requestTopic'] || 'requestTopic',  // 请求Topic
    responseTopic: process.env['mqtt_responseTopic'] || 'responseTopic',  // 响应Topic
    secretkey: process.env['mqtt_secretkey'] || '123456',  // 加密密钥
  },
}

console.info('ops:', JSON.stringify(ops))

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
export function getKey (key: string): string {
  const hash = crypto.createHash('sha256')
  hash.update(key)
  return hash.digest('base64')
}

// 使用基础字符串生成密钥
export function getKeyByBasicString (basicString: string) {
  const hash = crypto.createHash('sha256')
  hash.update(basicString)
  const key = hash.digest('base64')
  return key
}

const mqttOptions = ops.mqtt
console.info('mqttOptions:', mqttOptions)
const mqttClient = mqtt.connect(`mqtt://${mqttOptions.endpoint}:${mqttOptions.port}`, {
  password: mqttOptions.password,
  username: mqttOptions.username,
})
const requestTopic = mqttOptions.requestTopic + '/+'
const responseTopic = mqttOptions.responseTopic

mqttClient.on('message', (topic, message) => {
  console.info('Received message:', topic, message.toString())
  let messageText = message.toString()

  try {
    // 对收到的消息进行解密
    messageText = decrypt(JSON.parse(messageText) as DecryptedMessage, getKey(ops.mqtt.secretkey))
    const { requestId, payload } = JSON.parse(messageText)
    const { method, path, body, headers } = payload
    console.info('requestId:', requestId)
    console.info(`${responseTopic}/${requestId}`)
    // mqttClient.publish(`${responseTopic}/${requestId}`, message.toString())
    const url = `${ops.http.host}:${ops.http.port}${path}`
    console.info('url:', url)
    axios({
      method,
      url,
      data: body,
      headers,
    })
      .then((response) => {
        let payload = JSON.stringify(response.data)
        console.info('response raw:', payload)
        // 如果存在密钥，对返回的消息进行加密
        const encrypted = encrypt(payload, getKey(ops.mqtt.secretkey))
        payload = JSON.stringify(encrypted)
        console.info('response encrypted:', payload)
        mqttClient.publish(`${responseTopic}/${requestId}`, payload)
        return response
      })
      .catch((error) => {
        console.error('Axios error:', error)
        mqttClient.publish(`${responseTopic}/${requestId}`, JSON.stringify({ error: error.message, stack: error.stack }))
      })

  } catch (parseError) {
    console.error('Error parsing message:', parseError)
  }
})

mqttClient.on('connect', () => {
  console.info('Connected to MQTT server')
  mqttClient.subscribe(requestTopic, (err: any) => {
    if (err) {
      console.error('Failed to subscribe to topic:', err)
    } else {
      console.info('Subscribed to topic:', requestTopic)
    }
  })
})

mqttClient.on('error', (error) => {
  console.error('MQTT connection error:', error)
})

mqttClient.on('close', () => {
  console.info('MQTT connection closed')
})
