# Glancier Flow 鉴权与数据处理模式

本文档提供了编写 `flow` 阶段时的常见设计模式。每个 step 必须包含 `id` 和 `use`。

## 1. 鉴权模式 (Authentication Patterns)

当需要调用外部受保护 API 时，必须在 flow 的开头设置鉴权步骤，将其凭证存入 `secrets`，供后续步骤使用。

### A. API Key / PAT (Personal Access Token) 模式
最简单的鉴权方式，适用于提供长期 Token 的平台。

```yaml
- id: setup_auth
  use: api_key
  args:
    header_name: "Authorization"     # 请求头名称
    header_format: "Bearer {key}"    # 如何格式化（{key}会被替换为用户输入的秘钥）
    doc_url: "https://docs.example.com/api-keys"
  secrets:
    api_token: "api_key"             # 将用户输入的键值存入 secrets 的 `api_token` 中
```

### B. OAuth 2.0 (Device Flow) 模式
适用于 CLI 和桌面端。不需要重定向回调 URL，用户在浏览器中输入验证码。

```yaml
- id: authorize
  use: oauth
  args:
    oauth_flow: "device"
    device_authorization_url: "https://example.com/oauth/device/code"
    token_url: "https://example.com/oauth/token"
    scopes: ["read", "user"]
    client_id: "YOUR_CLIENT_ID"      # 必须提供
    token_request_type: "json"       # 或 "form"
    device_poll_interval: 5
  secrets:
    oauth_secrets: "oauth_secrets"   # 输出为 secrets 的 `oauth_secrets`
```

### C. OAuth 2.0 (PKCE) 模式
需要起本地 HTTP 服务器接收回调，安全性高。

```yaml
- id: authorize
  use: oauth
  args:
    oauth_flow: "pkce"
    authorization_url: "https://example.com/oauth/authorize"
    token_url: "https://example.com/oauth/token"
    scopes: ["read"]
    client_id: "YOUR_CLIENT_ID"
    pkce_method: "S256"
  secrets:
    oauth_secrets: "oauth_secrets"
```

## 2. 数据拉取与处理模式 (Data Fetching & Processing)

### A. HTTP 拉取
使用先前保存的 `secrets` 作为 Authorization 头。

```yaml
- id: fetch_data
  use: http
  args:
    url: "https://api.example.com/v1/user"
    method: "GET"
    headers:
      # 注意：从 secrets 中读取变量使用 {secrets.变量名} 或类似语法
      # 如果上方存的是 oauth_secrets，则使用 {oauth_secrets.access_token}
      Authorization: "Bearer {oauth_secrets.access_token}" 
      Accept: "application/json"
  outputs:
    raw_response: "http_response"    # 将请求结果存入上下文 `raw_response`
```

### B. Extract 提取数据
从 HTTP 返回的 JSON 中，利用 JSONPath 提取需要的字段。

```yaml
- id: parse_name
  use: extract
  args:
    source: "{raw_response}"         # 指向 HTTP 的输出变量
    type: "jsonpath"
    expr: "$.data.user.name"         # JSONPath 表达式
  outputs:
    user_name: "$.data.user.name"    # 映射为输出变量 user_name，供 SDUI 使用
```
