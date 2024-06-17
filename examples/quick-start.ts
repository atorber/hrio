/* eslint-disable no-console */
import { Http2Mqtt, ResponsePayload } from '../src/http-to-mqtt.js'

const main = async () => {
  const ops = {
    body: {},
    headers: {
      Authorization: 'Bearer eyJlbmRwb2ludCI6ImJyb2tlci5lbXF4LmlvIiwidXNlcm5hbWUiOiIiLCJwYXNzd29yZCI6IiIsImNsaWVudGlkIjoiaHR0cDJtcXR0IiwicG9ydCI6IjE4ODMiLCJzZWNyZXRrZXkiOiIiLCJSZXF1ZXN0VG9waWMiOiJodHRwMm1xdHQvMTIzNDU2IiwiUmVzcG9uc2VUb3BpYyI6Imh0dHAybXF0dC8xMjM0NTYvOTk5OTk5IiwiQ29udmVydCI6IiQuYWJjIn0',
      Connection: 'close',
      'Content-Length': '2',
      'Content-Type': 'application/json',
      'Rpc-Persist-Chain-Tags': '{}',
      'User-Agent': 'Coze/1.0',
      'User-Identity': 'e65c4ec176aacbb6b384bc4a2d706df4',
      'X-Aiplugin-Bot-Id': '1911414462897872',
      'X-Aiplugin-Connector-Id': '10000010',
      'X-Bce-Request-Id': 'bd6b2fba-c257-4de0-94d2-6fb2145d5e94',
      'X-Tt-Env': 'prod',
      'X-Tt-Logid': '20240205155650F8F93C1FEEEC0EA89D2E',
    },
    method: 'POST',
    path: '/api/message/send',
    query: { _topic: 'http2mqtt/test' },
  }

  // 使用Http2Mqtt类处理请求
  const http2mqtt = new Http2Mqtt(ops)
  const res: ResponsePayload = await http2mqtt.pubMessage()
  console.log('运行结果：', res)
}

void main()
