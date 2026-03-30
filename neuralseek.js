/* 
 * NeuralSeek Browser SDK (embedcode only)
 * Endpoints supported: /seek, /maistro
 * UMD: window.NeuralSeekBrowser
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.NeuralSeekBrowser = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  class NeuralSeekError extends Error {
    constructor(message, status, data) {
      super(message);
      this.name = "NeuralSeekError";
      this.status = status;
      this.data = data;
    }
  }

  function isBrowser() {
    return typeof window !== "undefined" && typeof fetch !== "undefined";
  }

  async function safeJson(res) {
    const text = await res.text();
    try { return text ? JSON.parse(text) : null; }
    catch { return { raw: text }; }
  }

  async function parseSSEStream(response, { onEvent, signal }) {
    if (!response.body) throw new Error("Streaming not supported by this browser/runtime.");

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      if (signal?.aborted) {
        try { reader.cancel(); } catch (_) {}
        throw new DOMException("Aborted", "AbortError");
      }

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE events split by blank line
      const chunks = buffer.split(/\n\n/);
      buffer = chunks.pop() || "";

      for (const chunk of chunks) {
        let event = "message";
        let dataLines = [];

        for (const line of chunk.split("\n")) {
          if (line.startsWith("event:")) event = line.slice(6).trim();
          if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
        }

        const dataRaw = dataLines.join("\n");
        let data = dataRaw;
        try { data = JSON.parse(dataRaw); } catch (_) {}

        onEvent?.({ event, data, raw: chunk });
      }
    }
  }

  class NeuralSeekClient {
    /**
     * @param {Object} config
     * @param {string} config.instance - NeuralSeek instance id
     * @param {string} config.embedCode - NeuralSeek embed code (required in browser)
     * @param {string} [config.baseUrl] - default: https://api.neuralseek.com/v1
     * @param {number} [config.timeoutMs] - default: 60000
     */
    constructor({ instance, embedCode, baseUrl = "https://api.neuralseek.com/v1", timeoutMs = 60000 } = {}) {
      if (!isBrowser()) {
        throw new Error("NeuralSeekBrowser SDK is intended for browser environments.");
      }
      if (!instance) throw new Error("Missing required config: instance");
      if (!embedCode) throw new Error("Missing required config: embedCode");

      this.instance = instance;
      this.embedCode = embedCode;
      this.baseUrl = baseUrl.replace(/\/$/, "");
      this.timeoutMs = timeoutMs;
    }

    _url(path) {
      return `${this.baseUrl}/${encodeURIComponent(this.instance)}${path}`;
    }

    async _post(path, body, { stream = false, onEvent, signal } = {}) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      const combinedSignal = signal || controller.signal;

      const res = await fetch(this._url(path), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "embedcode": this.embedCode
        },
        body: JSON.stringify(body || {}),
        signal: combinedSignal
      }).finally(() => clearTimeout(timer));

      if (!res.ok) {
        const errData = await safeJson(res);
        throw new NeuralSeekError(`NeuralSeek request failed (${res.status})`, res.status, errData);
      }

      const contentType = res.headers.get("content-type") || "";

      if (stream || contentType.includes("text/event-stream")) {
        await parseSSEStream(res, { onEvent, signal: combinedSignal });
        return { ok: true, streamed: true };
      }

      return await safeJson(res);
    }

    /**
     * Call POST /seek
     * @param {Object} payload - seek request body
     * @param {Object} [opts]
     * @param {boolean} [opts.stream=false] - force stream parse
     * @param {(evt:{event:string,data:any,raw:string})=>void} [opts.onEvent] - SSE callback
     * @param {AbortSignal} [opts.signal]
     */
    seek(payload, opts = {}) {
      return this._post("/seek", payload, opts);
    }

    /**
     * Call POST /maistro
     * @param {Object} payload - maistro request body
     * @param {Object} [opts]
     * @param {boolean} [opts.stream=false] - force stream parse
     * @param {(evt:{event:string,data:any,raw:string})=>void} [opts.onEvent] - SSE callback
     * @param {AbortSignal} [opts.signal]
     */
    maistro(payload, opts = {}) {
      return this._post("/maistro", payload, opts);
    }
  }

  return { NeuralSeekClient, NeuralSeekError };
});
