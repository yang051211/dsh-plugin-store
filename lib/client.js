window.__ModuleLoader__.load({ id: "dsh-plugin-store", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client.ts
var client_exports = {};
__export(client_exports, {
  NS: () => NS,
  PANEL_ID: () => PANEL_ID,
  apply: () => apply,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(client_exports);
var import_react2 = require("react");

// locale/zh.json
var zh_default = {
  meta: {
    title: "\u63D2\u4EF6\u5546\u57CE",
    description: "\u5E94\u7528\u5546\u5E97\u5F0F\u7684 DSH \u63D2\u4EF6\u5546\u57CE"
  },
  ui: {
    tab: "\u5546\u57CE"
  }
};

// locale/en.json
var en_default = {
  meta: {
    title: "Plugin Store",
    description: "An app-store style plugin store for DSH"
  },
  ui: {
    tab: "Store"
  }
};

// src/client/first-run.ts
var FIRST_RUN_KEY = "dsh-plugin-store:first-run-done";
function shouldAutoOpen(getStorage) {
  try {
    const storage = getStorage();
    if (storage.getItem(FIRST_RUN_KEY) !== null) return false;
    storage.setItem(FIRST_RUN_KEY, "1");
    return true;
  } catch {
    return false;
  }
}

// src/client/SpikeStore.tsx
var import_react = require("react");
var import_jsx_runtime = require("react/jsx-runtime");
var INDEX_ROUTE = "/api/plugin-store/index";
function titleText(title) {
  if (!title) return "\u2014";
  if (typeof title === "string") return title;
  return title.zh ?? title.en ?? Object.values(title)[0] ?? "\u2014";
}
function SpikeStore({ mode, install }) {
  const [load, setLoad] = (0, import_react.useState)({ kind: "loading" });
  const [crash, setCrash] = (0, import_react.useState)(false);
  if (crash) throw new Error("plugin-store spike crash");
  (0, import_react.useEffect)(() => {
    let live = true;
    fetch(INDEX_ROUTE).then(async (response) => {
      const summary = await response.json();
      if (live) setLoad(summary.ok ? { kind: "done", summary } : { kind: "failed", error: summary.error ?? `HTTP ${response.status}` });
    }).catch((error) => {
      if (live) setLoad({ kind: "failed", error: String(error) });
    });
    return () => {
      live = false;
    };
  }, []);
  const sample = load.kind === "done" ? load.summary.sample : null;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { padding: 24, display: "flex", flexDirection: "column", gap: 12, maxWidth: 640 }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", { style: { margin: 0 }, children: [
      "\u63D2\u4EF6\u5546\u57CE \xB7 \u6280\u672F\u9A8C\u8BC1\uFF08",
      mode === "tab" ? "\u6807\u7B7E\u9875" : "\u6574\u9875\u9762\u677F",
      "\uFF09"
    ] }),
    load.kind === "loading" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "\u6B63\u5728\u8BFB\u53D6\u7D22\u5F15\u2026" }),
    load.kind === "failed" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { style: { color: "#c62828" }, children: [
      "\u8BFB\u53D6\u7D22\u5F15\u5931\u8D25\uFF1A",
      load.error
    ] }),
    load.kind === "done" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
      "\u7D22\u5F15\uFF1A",
      titleText(load.summary.title),
      "\uFF0C\u5171 ",
      load.summary.pluginCount,
      " \u4E2A\u63D2\u4EF6"
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
      "\u5B89\u88C5\u80FD\u529B\uFF1A",
      install ? "\u6709\uFF08\u6765\u81EA\u63D2\u4EF6\u9875\uFF09" : "\u6CA1\u6709"
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", gap: 8 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
        "button",
        {
          type: "button",
          disabled: !install || !sample,
          onClick: () => {
            if (install && sample) install({ spec: `${sample.name}@${sample.version}`, title: sample.name, version: sample.version });
          },
          children: [
            "\u6D4B\u8BD5\u5B89\u88C5 ",
            sample ? `${sample.name}@${sample.version}` : ""
          ]
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: () => {
        setCrash(true);
      }, children: "\u6A21\u62DF\u5D29\u6E83" })
    ] })
  ] });
}
function StoreIcon({ size }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M5 8h14l-1 12H6L5 8z" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M9 8V6a3 3 0 0 1 6 0v2" })
  ] });
}

// src/client.ts
var name = "plugin-store";
var NS = "pluginStore";
var PANEL_ID = "plugin-store";
var inject = ["slots", "locale", "layout"];
function StoreTab(props) {
  return (0, import_react2.createElement)(SpikeStore, { mode: "tab", install: props.install });
}
function StorePanel() {
  return (0, import_react2.createElement)(SpikeStore, { mode: "panel" });
}
function apply(ctx) {
  ctx.effect(() => ctx.locale.register(NS, { zh: zh_default.ui, en: en_default.ui }), "plugin-store: dictionaries");
  const t = ctx.locale.bind(NS);
  ctx.slots.inject("plugins.tab", () => ctx.slots.register({
    name: "plugins.tab",
    id: "store",
    label: () => t("tab"),
    locale: NS
  }, StoreTab));
  ctx.slots.inject("main", () => ctx.slots.register({
    name: "main",
    key: PANEL_ID,
    locale: NS
  }, StorePanel));
  ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({
    name: "sidebar.panellist",
    id: PANEL_ID,
    order: 1,
    label: () => t("tab"),
    locale: NS
  }, StoreIcon));
  if (shouldAutoOpen(() => window.localStorage)) ctx.layout.selectPanel(PANEL_ID);
}
return module.exports; } });
