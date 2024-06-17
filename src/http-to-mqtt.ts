/* eslint-disable sort-keys */
/* eslint-disable no-console */
import mqtt from 'mqtt'
import { decrypt, encrypt, getKey, DecryptedMessage } from './utils.js'
import jsonata from 'jsonata'
import { v4 } from 'uuid'

type MqttOptions = {
  endpoint: string;
  port?: number;
  username: string;
  password: string;
  clientid?: string;
  secretkey?: string;
}

// 定义接口：请求头部信息
type Headers = {
  [key:string]: string;
}

// 定义接口：请求查询参数
type Query = {
  _rule?: string;
  _topic?: string;
  [key:string]: string | undefined;
}

// 定义接口：请求体内容
type Body = {
  [key: string]: any;
}

// 定义接口：响应内容
type ResponsePayload = {
  status: number;
  body: any;
}

// 定义接口：请求选项
type Options = {
  headers: Headers;
  body: Body;
  query: Query;
  method:'POST'|'GET'|'PUT'|'DELETE'|string;
  path: string;
}

// 主类：处理HTTP到MQTT的转换
class Http2Mqtt {

  private responsePayload: ResponsePayload = { body: {}, status: 200 }
  private ops: Options
  private mqttOps: MqttOptions
  private configOps: {
    convert?: string;
    topic?: string;
  }

  constructor (ops: Options) {
    this.mqttOps = {} as MqttOptions
    const headers = Object.fromEntries(
      Object.entries(ops.headers).map(([ key, value ]) => [ key.toLowerCase(), value ]),
    )
    if (headers['authorization']) {
      // console.log('headers中包含authorization\n', headers)
      // 对Authorization头部进行解析，删除开头的Bearer ，并对token进行base64解密
      const authorization = headers['authorization'] as string
      // console.debug(authorization)
      const tokenJoin = authorization.split(' ')[1] as string
      // console.debug(tokenJoin)
      let mqttToken = ''
      let token = ''
      if (tokenJoin.includes('http2mqtt')) {
        mqttToken = tokenJoin.split('http2mqtt')[0] || ''
        token = tokenJoin.split('http2mqtt')[1] || ''
        ops.headers['authorization'] = `Bearer ${token}`
      } else {
        mqttToken = tokenJoin
      }
      // console.debug(mqttToken)
      let decodedToken:any = Buffer.from(mqttToken, 'base64')
      // console.log('decodedToken:', decodedToken)
      decodedToken = decodedToken.toString('utf8')
      // console.log('decodedToken.toString:', decodedToken)
      this.mqttOps = Object.fromEntries(
        Object.entries(JSON.parse(decodedToken)).map(([ key, value ]) => [ key.toLowerCase(), value ]),
      ) as MqttOptions
    } else {
      ops.headers = headers as Headers
      this.mqttOps = headers as unknown as MqttOptions
    }
    const { _topic, _rule } = ops.query
    this.configOps = {
      topic:_topic, convert:_rule,
    }
    // ops.query = Object.fromEntries(
    //   Object.entries(ops.query).map(([ key, value ]) => [ key.toLowerCase(), value ]),
    // ) as Query

    if (ops.query._rule) delete ops.query._rule
    if (ops.query._topic) delete ops.query._topic

    this.ops = ops
  }

  async pubMessage (): Promise<ResponsePayload> {
    console.debug('pubMessage this.ops\n', JSON.stringify(this.ops))
    const {
      endpoint = '',
      username = '',
      password = '',
      port = 1883,
      secretkey: key,
    } = this.mqttOps

    const { convert, topic } = this.configOps
    const reqId = v4()
    let pubTopic = `http2mqtt/request/${reqId}`
    let subTopic = `http2mqtt/response/${reqId}`

    if (topic) {
      pubTopic = `${topic}/request/${reqId}`
      subTopic = `${topic}/response/${reqId}`
    }

    if (topic === 'http2mqtt/test') {
      subTopic = `http2mqtt/test/${reqId}`
      pubTopic = `http2mqtt/test/${reqId}`
    }

    console.debug('pubTopic\n', pubTopic)
    console.debug('subTopic\n', subTopic)

    let payload: any = this.ops

    // 如果存在Convert参数，使用jsonata进行数据转换
    if (convert) {
      const expression = jsonata(convert)
      payload = await expression.evaluate(payload)
    }

    payload = JSON.stringify(payload)
    // console.debug('payload\n', payload)

    // 如果存在密钥，对消息进行加密
    if (key) {
      payload = JSON.stringify(encrypt(payload, key))
    }

    // 连接到MQTT服务器
    const client = mqtt.connect(`mqtt://${endpoint}:${port}`, {
      password,
      username,
    })

    return new Promise<ResponsePayload>((resolve) => {

      // 设置15秒超时
      const timeout: any = setTimeout(() => {
        this.responsePayload = {
          status: 408,
          body: { error: 'Request timed out' },
        }
        client.end()
        console.debug('timeout\n', this.responsePayload)
        resolve(this.responsePayload)
      }, 15000)

      client.on('connect', () => {
        console.debug('connected to mqtt server')
        client.subscribe(subTopic, (err: any) => {
          if (err) {
            this.responsePayload = {
              status: 500,
              body: { error: 'Failed to subscribe to topic' },
            }
            client.end()
            console.debug('subscribe error\n', this.responsePayload)
            resolve(this.responsePayload)
            return
          }

          client.publish(pubTopic, payload, (err) => {
            if (err) {
              this.responsePayload = {
                status: 500,
                body: { error: 'Failed to publish to topic' },
              }
              client.end()
              console.debug('publish error\n', this.responsePayload)
              resolve(this.responsePayload)
            }
          })
        })
      })

      client.on('message', (topic, message) => {
        if (topic === subTopic) {
          let messageText = message.toString()

          // 如果存在密钥，对收到的消息进行解密
          if (key) {
            messageText = decrypt(JSON.parse(messageText) as DecryptedMessage, key)
          }

          clearTimeout(timeout)
          this.responsePayload = {
            body: JSON.parse(messageText),
            status: 200,
          }
          client.end()
          resolve(this.responsePayload)
        }
      })

      client.on('error', (err) => {
        this.responsePayload = {
          status: 500,
          body: { error: err.message },
        }
        client.end()
        resolve(this.responsePayload)
      })
    })
  }

}

export {
  Http2Mqtt,
  encrypt,
  decrypt,
  getKey,
}

export type {
  Body,
  Headers,
  Query, ResponsePayload,
  Options,
}
