/* eslint-disable sort-keys */
import Koa from 'koa'
import bodyParser from 'koa-bodyparser'
import MQTTHttpSDK from './sdk.js'

const ops = {
  http:{
    port:8888,
    host:'',
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

// 这里将MQTT服务器和Topic硬编码，实际上应该配置化
const mqttSdk = new MQTTHttpSDK('mqtt://broker.hivemq.com', 'httpRequestTopic', 'httpResponseTopic')

const app = new Koa()

app.use(bodyParser())

// 这个中间件将捕获所有进入的HTTP请求
app.use(async (ctx) => {
  // 获取请求的Method, Path和Body
  const method = ctx.method
  const path = ctx.url
  const body = ctx.request.body

  try {
    // 使用MQTT SDK发送请求并等待响应
    const response = await mqttSdk.makeRequest(method, path, body)

    // 设置响应状态码和主体（这里假设响应是成功的，并且是JSON格式）
    ctx.status = 200
    ctx.body = response
  } catch (error:any) {
    // 如果出错，返回错误信息
    ctx.status = 500
    ctx.body = { error: error.message }
  }
})

const port = 3000
app.listen(port, () => {
  console.info(`Server listening on port ${port}`)
})
