/* eslint-disable sort-keys */
import 'dotenv/config.js'
import * as mqtt from 'mqtt'
import axios from 'axios'
import { decrypt, encrypt, getKey, DecryptedMessage } from './utils.js'
import { get } from 'http'

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

const mqttOptions = ops.mqtt
console.info('mqttOptions:', mqttOptions)
const mqttClient = mqtt.connect(`mqtt://${mqttOptions.endpoint}:${mqttOptions.port}`, {
  password: mqttOptions.password,
  username: mqttOptions.username,
  clientId: 'remote-server',
})
const requestTopic = mqttOptions.requestTopic + '/+'
const responseTopic = mqttOptions.responseTopic

mqttClient.on('message', (topic, message) => {
  console.info('Received message:', topic, message.toString())
  let messageText = message.toString()

  // 如果存在密钥，对收到的消息进行解密
  messageText = decrypt(JSON.parse(messageText) as DecryptedMessage, getKey(ops.mqtt.secretkey))
  try {
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
        // 如果存在密钥，对返回的消息进行加密
        const encrypted = encrypt(payload, getKey(ops.mqtt.secretkey))
        payload = JSON.stringify(encrypted)

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
  mqttClient.subscribe(requestTopic)
})

mqttClient.on('error', (error) => {
  console.error('MQTT connection error:', error)
})

mqttClient.on('close', () => {
  console.info('MQTT connection closed')
})
