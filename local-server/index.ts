/* eslint-disable sort-keys */
import 'dotenv/config.js'
import Koa from 'koa'
// import Router from 'koa-router'
import bodyParser from 'koa-bodyparser'
import * as mqtt from 'mqtt'
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

interface MqttOptions {
  endpoint: string;
  port: number;
  username: string;
  password: string;
  requestTopic: string;
  responseTopic: string;
  secretkey: string;
}

class MQTTHttpSDK {

  private mqttClient: mqtt.MqttClient
  private requestTopic: string
  private responseTopic: string
  private secretkey: string

  constructor (mqttOptions: MqttOptions) {
    console.info('mqttOptions:', mqttOptions)
    const endpoint = `mqtt://${mqttOptions.endpoint}:${mqttOptions.port}`
    console.info('endpoint:', endpoint)
    const ops = {
      password: mqttOptions.password,
      username: mqttOptions.username,
      // clientId: 'local-server',
    }
    console.info('ops:', ops)
    this.mqttClient = mqtt.connect(endpoint, ops)
    this.requestTopic = mqttOptions.requestTopic
    this.responseTopic = mqttOptions.responseTopic
    this.secretkey = getKey(mqttOptions.secretkey)

    this.mqttClient.on('connect', () => {
      console.info('Connected to MQTT server')
      this.mqttClient.subscribe(this.responseTopic, (err) => {
        console.error('Subscribe error:', err)
      })
    })

    this.mqttClient.on('error', (err) => {
      console.error('MQTT error:', err)
    })

    this.mqttClient.on('close', () => {
      console.info('MQTT connection closed')
    })
  }

  public async makeRequest (payload: any): Promise<any> {
    // Generate a unique request ID for each call
    const requestId = Math.random().toString(16).substr(2, 8)
    console.info('requestId:', requestId)
    const subTopic = this.responseTopic + '/' + requestId
    let responsePayload: any
    return new Promise<any>((resolve) => {
      // 设置30秒超时
      const timeout: any = setTimeout(() => {
        responsePayload = {
          status: 408,
          body: { error: 'Request timed out' },
        }
        this.mqttClient.unsubscribe(subTopic, (err:any) => {
          console.error('Unsubscribe error:', err)
        })
        resolve(responsePayload)
      }, 30000)
      console.info('subTopic：\n', subTopic)
      this.mqttClient.subscribe(subTopic, (err: any) => {
        if (err) {
          responsePayload = {
            status: 500,
            body: { error: 'Failed to subscribe to topic' },
          }
          console.info('subscribe error\n', responsePayload)
          this.mqttClient.unsubscribe(subTopic, (err:any) => {
            console.error('Unsubscribe error:', err)
          })
          resolve(responsePayload)
        }

        let payloadPub = JSON.stringify({ requestId, payload })

        const encrypted = encrypt(payloadPub, this.secretkey)
        payloadPub = JSON.stringify(encrypted)
        console.info('payloadPub:', payloadPub)

        const topic = this.requestTopic + '/' + requestId
        console.info('topic:', topic)

        this.mqttClient.publish(topic, payloadPub, (err) => {
          if (err) {
            responsePayload = {
              status: 500,
              body: { error: 'Failed to publish to topic' },
            }
            console.info('publish error\n', responsePayload)
            this.mqttClient.unsubscribe(subTopic, (err:any) => {
              console.error('Unsubscribe error:', err)
            })
            resolve(responsePayload)
          }
        })
      })

      this.mqttClient.on('message', (topic, message) => {
        console.info('Received message:', topic, message.toString())

        let messageText = message.toString()
        // 如果存在密钥，对收到的消息进行解密
        if (this.secretkey) {
          messageText = decrypt(JSON.parse(messageText) as DecryptedMessage, this.secretkey)
        }
        clearTimeout(timeout)
        responsePayload = JSON.parse(messageText)
        this.mqttClient.unsubscribe(subTopic, (err:any) => {
          console.error('Unsubscribe error:', err)
        })
        resolve(responsePayload)

      })

      this.mqttClient.on('error', (err) => {
        responsePayload = {
          status: 500,
          body: { error: err.message },
        }
        this.mqttClient.unsubscribe(subTopic, (err:any) => {
          console.error('Unsubscribe error:', err)
        })
        resolve(responsePayload)
      })
    })
  }

}

const ops: any = {
  http: {
    host: process.env['http_host_local'] || 'http://127.0.0.1', // 本地http服务的本地请求地址
    port: process.env['http_port_local'] || 3000, // 本地http服务的本地请求端口
  },
  mqtt: {
    endpoint: process.env['mqtt_endpoint'] || 'broker.emqx.io', // MQTT服务的接入点
    port: process.env['mqtt_port'] || '1883', // MQTT服务的端口号
    username: process.env['mqtt_username'] || '', // MQTT用户名
    password: process.env['mqtt_password'] || '', // MQTT密码
    requestTopic: process.env['mqtt_requestTopic'] || 'requestTopic',  // 请求Topic
    responseTopic: process.env['mqtt_responseTopic'] || 'responseTopic',  // 响应Topic
    secretkey: process.env['mqtt_secretkey'] || 'VmQAu7/aKEmt2iNIbg3+2HVKzpCRrdN1qelvTfK5gLo=',  // 加密密钥
  },
}

console.info('ops:', JSON.stringify(ops))

// 这里将MQTT服务器和Topic硬编码，实际上应该配置化
const mqttSdk = new MQTTHttpSDK(ops.mqtt)

const app = new Koa()

app.use(bodyParser())

// 这个中间件将捕获所有进入的HTTP请求
app.use(async (ctx) => {
  console.info('Received request:', ctx.method, ctx.url, ctx.request.body, ctx.headers)
  // 获取请求的Method, Path和Body
  const method = ctx.method
  const path = ctx.url
  const body = ctx.request.body
  const headers = ctx.headers

  const payload = {
    method,
    path,
    body,
    headers,
  }

  try {
    // 使用MQTT SDK发送请求并等待响应
    const response = await mqttSdk.makeRequest(payload)

    // 设置响应状态码和主体（这里假设响应是成功的，并且是JSON格式）
    ctx.status = 200
    ctx.body = response
  } catch (error: any) {
    // 如果出错，返回错误信息
    ctx.status = 500
    ctx.body = { error: error.message }
  }
})

app.listen(Number(ops.http.port), () => {
  console.info(`Server listening on port ${ops.http.port}`)
})
