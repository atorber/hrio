/* eslint-disable no-console */
import Koa from 'koa'
import Router from 'koa-router'
import bodyParser from 'koa-bodyparser'

import { Http2Mqtt } from 'http2mqtt'

const app = new Koa()
const router = new Router()

// 使用bodyParser中间件处理请求体
app.use(bodyParser())

router.post('/mqtt', async (ctx) => {
  // 将请求的上下文打印到控制台，方便调试
  console.debug(JSON.stringify(ctx))

  // 将请求头部的键转换为小写，以确保统一性
  const headers = ctx.request.headers

  const body = ctx.request.body
  const query = ctx.request.query
  const method = ctx.request.method
  const path = ctx.request.path

  const ops = { body, headers, method, path, query }
  console.debug(JSON.stringify(ops))

  // 使用Http2Mqtt类处理请求
  const http2mqtt = new Http2Mqtt(ops)
  const res = await http2mqtt.pubMessage()

  // 设置响应的状态码和主体
  ctx.status = res.status
  ctx.body = res.body
})

// 使用路由中间件
app.use(router.routes()).use(router.allowedMethods())

// 从环境变量中获取端口号，如果没有定义，则默认为3000
const PORT = process.env.PORT || 3000

// 启动Koa服务器
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
