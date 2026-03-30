## Quick Start

### 1) Include SDK in your webpage

```html
<script src="https://cdn.jsdelivr.net/gh/CerebralBlue/neuralseek-browser-sdk@refs/heads/main/neuralseek.js"></script>
```

### 2) Initialize client

```html
<script>
  const ns = new NeuralSeekBrowser.NeuralSeekClient({
    baseUrl: "https://api.neuralseek.com/v1",   // your environment url 
    instance: "demo",                           // your instance
    embedCode: "YOUR_EMBED_CODE_HERE"           // browser-safe credential
  });
</script>
```

### 3) Call `seek`

```js
const result = await ns.seek({
  question: "What are your support hours?",
  user_session: {
    metadata: { user_id: "user-123" },
    system: { session_id: "session-abc" }
  }
});

console.log(result.answer);
```

### 4) Call `maistro`

```js
const result = await ns.maistro({
  agent: "support_agent",
  params: [{ name: "topic", value: "billing" }]
});

console.log(result.answer);
```

---

## Streaming Example (SSE)

For browser streaming, set request options that trigger streaming on your backend (for example `options.streaming = true` for mAIstro), then pass `stream: true` and `onEvent`.

```js
await ns.maistro(
  {
    agent: "support_agent",
    options: { streaming: true }
  },
  {
    stream: true,
    onEvent: ({ event, data }) => {
      console.log("SSE event:", event, data);
    }
  }
);
```

---

## API Reference

### `new NeuralSeekClient(config)`

- `instance` **(required)**: NeuralSeek instance ID
- `embedCode` **(required)**: embed code sent in `embedcode` header
- `baseUrl` *(optional)*: defaults to `https://api.neuralseek.com/v1`
- `timeoutMs` *(optional)*: request timeout, default `60000`

### `client.seek(payload, opts?)`
Calls `POST /seek`.

### `client.maistro(payload, opts?)`
Calls `POST /maistro`.

### `opts`
- `stream?: boolean` – parse response as SSE stream
- `onEvent?: (evt) => void` – callback for each SSE event
- `signal?: AbortSignal` – optional cancellation

### Errors
Throws `NeuralSeekError` with:
- `message`
- `status` (HTTP status)
- `data` (parsed error body if available)

---

## Notes / Best Practices

- This SDK intentionally supports **only** `seek` and `maistro`.
- In browser environments, use **embed code only** — never expose API keys client-side.
- If your app needs cancellation, pass an `AbortController().signal`.
- If CORS is restricted, ensure your domain is allowed by your NeuralSeek setup.

---
