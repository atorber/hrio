# HTTP Remote Invocation over MQTT

## 简介

HRIO-MQTT（HTTP Remote Invocation over MQTT）是一种利用MQTT协议远程调用HTTP API的架构。该架构仿照RPC（远程过程调用）机制，包含一个本地客户端和一个远程服务器。
其工作流程如下：
1. 本地客户端将HTTP请求打包成MQTT消息后发出
2. 远程服务器接收这些消息，执行对应的HTTP请求，再将响应结果通过MQTT传回客户端。
这一流程使得本地程序能够调用任何部署在外部或本地服务器上的HTTP API，实现非公网HTTP API服务的远程访问。

## 接口文档

[在线接口文档参考](https://www.yuque.com/atorber/chatflow/tcvzdidll89m9qyq)

## 快速开始

TBD

## 请求示例

- 请求

```http
POST /mqtt?RequestTopic=my/topic&Convert={"transformed":$.original}
Headers:
  endpoint: mqtt.example.com
  username: myuser
  password: mypassword

Body:
{
  "original": "data"
}
```

- 响应

```json
{
  "error": "ok",
  "message": {
    "transformed": "data"
  }
}
```

## 百度云部署

```shell
cd examples/baidu-cfc
npm i
```

将index.js、package.json以及node_modules文件夹整理打包上传到百度云函数计算，设置http触发器

## 历史版本

### v0.0.1 

1. 初始化创建代码库
