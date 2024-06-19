/* eslint-disable sort-keys */
import 'dotenv/config.js'
import Koa from 'koa'
// import Router from 'koa-router'
import bodyParser from 'koa-bodyparser'
import MQTTHttpSDK from './sdk.js'

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
