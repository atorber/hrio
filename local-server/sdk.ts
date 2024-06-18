/* eslint-disable sort-keys */
import * as mqtt from 'mqtt'

interface MqttOptions {
  endpoint: string;
  port: number;
  username: string;
  password: string;
  requestTopic: string;
  responseTopic: string;
}

class MQTTHttpSDK {

  private mqttClient: mqtt.MqttClient
  private requestTopic: string
  private responseTopic: string

  constructor (mqttOptions: MqttOptions) {
    console.info('mqttOptions:', mqttOptions)
    this.mqttClient = mqtt.connect(`mqtt://${mqttOptions.endpoint}:${mqttOptions.port}`, {
      password: mqttOptions.password,
      username: mqttOptions.username,
    })
    this.requestTopic = mqttOptions.requestTopic
    this.responseTopic = mqttOptions.responseTopic

    this.mqttClient.on('connect', () => {
      console.info('Connected to MQTT server')
      this.mqttClient.subscribe(this.responseTopic, (err) => {
        console.error('Subscribe error:', err)
      })
    })
  }

  public async makeRequest (payload: any): Promise<any> {
    // Generate a unique request ID for each call
    const requestId = Math.random().toString(16).substr(2, 8)
    console.info('requestId:', requestId)
    const subTopic = this.responseTopic + '/' + requestId
    let responsePayload: any
    return new Promise<any>((resolve) => {
      // 设置15秒超时
      const timeout: any = setTimeout(() => {
        responsePayload = {
          status: 408,
          body: { error: 'Request timed out' },
        }
        this.mqttClient.unsubscribe(subTopic, (err:any) => {
          console.error('Unsubscribe error:', err)
        })
        resolve(responsePayload)
      }, 15000)

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

        this.mqttClient.publish(this.requestTopic + '/' + requestId, JSON.stringify({ requestId, payload }), (err) => {
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

        const messageText = message.toString()
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

export default MQTTHttpSDK
