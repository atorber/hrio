/* eslint-disable sort-keys */
import Koa from 'koa'
// import Router from 'koa-router'
import bodyParser from 'koa-bodyparser'
import MQTTHttpSDK from './sdk.js'

const ops: any = {
  http: {
    port: 3000,
    host: '',
  },
  mqtt: {
    // endpoint:'k8913def.ala.cn-hangzhou.emqxsl.cn',
    endpoint: 'broker.emqx.io',
    port: '1883',
    username: 'awgnfty/ledongmao',
    password: 'DyaBAZphfcOZRuEa',
    requestTopic: 'request',
    responseTopic: 'response',
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

app.listen(ops.http.port, () => {
  console.info(`Server listening on port ${ops.http.port}`)
})
