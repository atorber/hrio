/* eslint-disable sort-keys */
import * as mqtt from 'mqtt'

class MQTTHttpSDK {

  private mqttClient: mqtt.MqttClient
  private requestTopic: string
  private responseTopic: string

  constructor (brokerUrl: string, requestTopic: string, responseTopic: string) {
    this.mqttClient = mqtt.connect(brokerUrl)
    this.requestTopic = requestTopic
    this.responseTopic = responseTopic

    this.mqttClient.on('connect', () => {
      this.mqttClient.subscribe(this.responseTopic, (err) => {

        console.error('Subscribe error:', err)

      })
    })
  }

  public async makeRequest (method: string, path: string, body: any): Promise<any> {
    // Generate a unique request ID for each call
    const requestId = Math.random().toString(16).substr(2, 8)

    return new Promise((resolve, reject) => {
      // Set up listener for the response
      this.mqttClient.once(this.responseTopic + '/' + requestId, (_topic: any, message: { toString: () => string }) => {
        try {
          const response = JSON.parse(message.toString())
          resolve(response)
        } catch (e) {
          reject(e)
        }
      })

      // Send the request through MQTT
      this.mqttClient.publish(this.requestTopic, JSON.stringify({ requestId, method, path, body }), (err) => {
        if (err) {
          reject(err)
        }
      })
    })
  }

}

export default MQTTHttpSDK
