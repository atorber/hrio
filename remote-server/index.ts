/* eslint-disable sort-keys */
import * as mqtt from 'mqtt'
import axios from 'axios'
import { decrypt, encrypt, getKey, DecryptedMessage } from './utils.js'

const ops = {
  http: {
    host: 'http://127.0.0.1',
    port: 19088,
  },
  mqtt: {
    // endpoint: 'k8913def.ala.cn-hangzhou.emqxsl.cn',
    endpoint:'broker.emqx.io',
    port: '1883',
    username: 'awgnfty/ledongmao',
    password: 'DyaBAZphfcOZRuEa',
    requestTopic: 'request',
    responseTopic: 'response',
    secretkey: 'VmQAu7/aKEmt2iNIbg3+2HVKzpCRrdN1qelvTfK5gLo=',
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
  if (ops.mqtt.secretkey) {
    messageText = decrypt(JSON.parse(messageText) as DecryptedMessage, ops.mqtt.secretkey)
  }

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
        if (ops.mqtt.secretkey) {
          const encrypted = encrypt(payload, ops.mqtt.secretkey)
          payload = JSON.stringify(encrypted)
        }
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
