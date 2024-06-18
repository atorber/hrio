/* eslint-disable sort-keys */
import * as mqtt from 'mqtt'
import axios from 'axios'

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
  try {
    const { requestId, payload } = JSON.parse(message.toString())
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
    })
      .then((response) => {
        mqttClient.publish(`${responseTopic}/${requestId}`, JSON.stringify(response.data))
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
