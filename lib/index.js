// src/host/index-route.ts
var INDEX_ROUTE = "/api/plugin-store/index";
var DEFAULT_INDEX_URL = "https://cdn.jsdelivr.net/gh/yang051211/dsh-plugin-store@main/market/index.json";
var MAX_INDEX_BYTES = 8 * 1024 * 1024;
var FETCH_TIMEOUT_MS = 15e3;
var SAMPLE_PLUGIN = "dsh-chat-toc";
function pickSample(plugins) {
  const plugin = plugins.find((entry) => entry?.name === SAMPLE_PLUGIN) ?? plugins[0];
  if (!plugin || typeof plugin.name !== "string") return null;
  const latest = plugin["dist-tags"]?.latest;
  const last = Array.isArray(plugin.versions) ? plugin.versions.at(-1)?.version : void 0;
  const version = typeof latest === "string" ? latest : typeof last === "string" ? last : null;
  return version ? { name: plugin.name, version } : null;
}
async function readCapped(response, limit) {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  for (; ; ) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel();
      throw new Error(`index too large (over ${limit} bytes)`);
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}
function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}
function createIndexFetch(fetchImpl, indexUrl) {
  return async () => {
    try {
      const response = await fetchImpl(indexUrl, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      if (!response.ok) {
        await response.body?.cancel();
        throw new Error(`index answered HTTP ${response.status}`);
      }
      const text = await readCapped(response, MAX_INDEX_BYTES);
      let index;
      try {
        index = JSON.parse(text);
      } catch {
        throw new Error("index is not valid JSON");
      }
      const plugins = Array.isArray(index?.plugins) ? index.plugins : [];
      return json(200, {
        ok: true,
        title: index?.title ?? null,
        pluginCount: plugins.length,
        sample: pickSample(plugins),
        fetchedAt: Date.now()
      });
    } catch (error) {
      return json(502, { ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  };
}

// src/index.ts
var name = "plugin-store";
var inject = ["connection"];
function apply(ctx) {
  ctx.effect(() => ctx.connection.fetch.register({
    path: INDEX_ROUTE,
    methods: ["GET"],
    requestBody: "buffered",
    fetch: createIndexFetch(fetch, DEFAULT_INDEX_URL)
  }), "plugin-store: index route");
}
export {
  DEFAULT_INDEX_URL,
  FETCH_TIMEOUT_MS,
  INDEX_ROUTE,
  MAX_INDEX_BYTES,
  apply,
  createIndexFetch,
  inject,
  name
};
