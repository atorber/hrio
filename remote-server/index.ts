/* eslint-disable sort-keys */
import * as mqtt from 'mqtt'
import axios from 'axios'

const ops = {
  http:{
    port:8888,
  },
  mqtt:{
    endpoint:'',
    port:'',
    username:'',
    password:'',
    requestTopic:'',
    responseTopic:'',
  },
}
console.info(ops)
const mqttClient = mqtt.connect('mqtt://broker.hivemq.com')
const requestTopic = 'httpRequestTopic'
const responseTopic = 'httpResponseTopic'

mqttClient.on('message', (topic, message) => {
  if (topic === requestTopic) {
    const { requestId, method, path, body } = JSON.parse(message.toString())
    try {
      // 模拟执行HTTP请求
      const response:any = axios({ method, url: path, data: body })

      // 将响应作为MQTT消息发送回去
      mqttClient.publish(`${responseTopic}/${requestId}`, JSON.stringify(response.data))
    } catch (error:any) {
      // 发送错误信息
      mqttClient.publish(`${responseTopic}/${requestId}`, JSON.stringify({ error: error.message }))
    }
  }
})

mqttClient.on('connect', () => {
  mqttClient.subscribe(requestTopic)
})
