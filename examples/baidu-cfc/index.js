/* eslint-disable no-undef */
/* eslint-disable sort-keys */
const { Http2Mqtt } = require('http2mqtt')

exports.handler = async (event, context, callback) => {
  const method = event.httpMethod
  const path = event.path
  const headers = event.headers
  const query = event.queryStringParameters
  const bodyString = event.body || '{}'
  const body = JSON.parse(bodyString)
  const ops = { body, headers, query, method, path }

  try {
    const http2mqtt = new Http2Mqtt(ops)
    const res = await http2mqtt.pubMessage()

    callback(null, res.body)
  } catch (err) {
    console.error(err)
    callback(err, JSON.stringify({ error: err }))
  }
}

// const get = {
//   resource: '/api/{resource+}',
//   path: '/api/room/123',
//   httpMethod: 'GET',
//   headers: {
//     Accept: '*/*',
//     'Accept-Encoding': 'gzip, deflate, br',
//     Connection: 'close',
//     'Postman-Token': '67006d25-56ad-475f-bf01-989d91ef52a1',
//     'User-Agent': 'PostmanRuntime/7.36.1',
//     'X-Bce-Request-Id': 'c702bb0a-da44-41c8-8c1b-246ff44f1af3',
//   },
//   queryStringParameters: {
//     id: '999999',
//   },
//   pathParameters: {
//     resource: 'room/123',
//   },
//   requestContext: {
//     stage: 'cfc',
//     requestId: 'c702bb0a-da44-41c8-8c1b-246ff44f1af3',
//     resourcePath: '/api/{resource+}',
//     httpMethod: 'GET',
//     apiId: '3sewxanjdvsbp',
//     sourceIp: '111.206.214.40',
//   },
//   body: '',
//   isBase64Encoded: false,
// }

// const post = {
//   resource: '/api/{resource+}',
//   path: '/api/room/123',
//   httpMethod: 'POST',
//   headers: {
//     Accept: '*/*',
//     'Accept-Encoding': 'gzip, deflate, br',
//     Connection: 'close',
//     'Content-Length': '19',
//     'Content-Type': 'application/json',
//     'Postman-Token': 'fd4e69e5-dc07-4d06-98cb-87cba9b9b599',
//     'User-Agent': 'PostmanRuntime/7.36.1',
//     'X-Bce-Request-Id': '7e99b78e-bd68-4556-9d58-4b36525bf0b8',
//   },
//   queryStringParameters: {},
//   pathParameters: {
//     resource: 'room/123',
//   },
//   requestContext: {
//     stage: 'cfc',
//     requestId: '7e99b78e-bd68-4556-9d58-4b36525bf0b8',
//     resourcePath: '/api/{resource+}',
//     httpMethod: 'POST',
//     apiId: '3sewxanjdvsbp',
//     sourceIp: '111.206.214.40',
//   },
//   body: '{\n    "id":999999\n}',
//   isBase64Encoded: false,
// }
