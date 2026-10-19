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
    description: "\u5E94\u7528\u5546\u5E97\u5F0F\u7684 DSH \u63D2\u4EF6\u5546\u57CE\uFF0C\u6536\u5F55\u4EBA\u5DE5\u5BA1\u6838\u8FC7\u7684\u63D2\u4EF6"
  },
  ui: {
    tab: "\u5546\u57CE",
    search: "\u641C\u7D22\u63D2\u4EF6",
    featured: "\u672C\u5468\u7CBE\u9009",
    viewDetails: "\u67E5\u770B\u8BE6\u60C5",
    seeAll: "\u5168\u90E8 \u203A",
    browseCategories: "\u6309\u5206\u7C7B\u6D4F\u89C8",
    allPlugins: "\u5168\u90E8\u63D2\u4EF6",
    back: "\u2039 \u8FD4\u56DE",
    searchResults: "\u641C\u7D22\uFF1A{query}",
    empty: "\u6CA1\u6709\u627E\u5230\u63D2\u4EF6",
    loading: "\u6B63\u5728\u52A0\u8F7D\u2026",
    loadFailed: "\u8BFB\u53D6\u5546\u57CE\u5931\u8D25",
    retry: "\u91CD\u8BD5",
    refresh: "\u5237\u65B0",
    staleNotice: "\u7F51\u7EDC\u6709\u95EE\u9898\uFF0C\u663E\u793A\u7684\u662F\u4E0A\u6B21\u8BFB\u53D6\u7684\u5185\u5BB9",
    install: "\u5B89\u88C5",
    installed: "\u5DF2\u5B89\u88C5",
    update: "\u6709\u65B0\u7248\u672C",
    incompatible: "\u4E0D\u517C\u5BB9",
    incompatibleHint: "\u8FD9\u4E2A\u7248\u672C\u58F0\u660E\u652F\u6301 DSH {range}\uFF0C\u4E0E\u5F53\u524D\u7684 {version} \u4E0D\u517C\u5BB9",
    reviewed: "\u5DF2\u5BA1\u6838 \xB7 {date}",
    compatible: "\u517C\u5BB9\u5F53\u524D\u7248\u672C",
    compatUnknown: "\u517C\u5BB9\u6027\u672A\u77E5",
    compatNo: "\u4E0D\u517C\u5BB9\u5F53\u524D\u7248\u672C",
    stars: "\u661F\u6807",
    weeklyDownloads: "\u5468\u4E0B\u8F7D",
    published: "\u53D1\u5E03\u4E8E",
    statsAsOf: "\u6570\u636E\u622A\u81F3 {date}",
    screenshots: "\u622A\u56FE",
    whatItDoes: "\u80FD\u505A\u4EC0\u4E48",
    permissions: "\u9700\u8981\u7684\u6743\u9650",
    verdict: "\u5BA1\u6838\u7ED3\u8BBA",
    scanResult: "\u626B\u63CF\u7ED3\u679C",
    scanNote: "\u626B\u63CF\u7ED3\u679C\u6765\u81EA\u81EA\u52A8\u626B\u63CF\u6E90\u7801\uFF0C\u4EC5\u4F9B\u53C2\u8003\uFF1B\u4EE5\u5BA1\u6838\u7ED3\u8BBA\u4E3A\u51C6\u3002",
    scanDisagrees: "\u81EA\u52A8\u626B\u63CF\u6709\u547D\u4E2D\uFF0C\u5BA1\u6838\u4EBA\u770B\u8FC7\u4EE3\u7801\u540E\u5224\u65AD\u4E3A\u300C{verdict}\u300D",
    permNetwork: "\u8054\u7F51",
    permFileSystem: "\u8BFB\u5199\u6587\u4EF6",
    permAgentTools: "\u7ED9 Agent \u6CE8\u518C\u5DE5\u5177",
    permChildProcess: "\u6267\u884C\u547D\u4EE4",
    permInstallScripts: "\u5B89\u88C5\u811A\u672C",
    yes: "\u662F",
    no: "\u5426",
    review: "\u5BA1\u6838\u7ED3\u8BBA",
    reviewer: "\u5BA1\u6838\u4EBA",
    reviewedVersion: "\u5BA1\u6838\u7248\u672C",
    reviewDate: "\u5BA1\u6838\u65E5\u671F",
    tabReadme: "\u8BE6\u7EC6\u4ECB\u7ECD",
    tabChangelog: "\u66F4\u65B0\u65E5\u5FD7",
    tabVersions: "\u7248\u672C",
    tabSource: "\u6765\u6E90",
    noChangelog: "\u4F5C\u8005\u6CA1\u6709\u63D0\u4F9B\u66F4\u65B0\u65E5\u5FD7",
    noReadme: "\u4F5C\u8005\u6CA1\u6709\u63D0\u4F9B\u8BF4\u660E",
    author: "\u4F5C\u8005",
    homepage: "\u4E3B\u9875",
    repository: "\u6E90\u4EE3\u7801",
    npmPackage: "npm \u5305",
    enginesDsh: "\u652F\u6301\u7684 DSH \u7248\u672C",
    anyVersion: "\u672A\u58F0\u660E\u9650\u5236",
    upstreamPending: "\u4E0A\u6E38\u5DF2\u53D1\u5E03 {version}\uFF0C\u5546\u57CE\u5BA1\u6838\u540E\u624D\u4F1A\u4E0A\u67B6",
    related: "\u540C\u7C7B\u63D2\u4EF6",
    detailFailed: "\u8BE6\u7EC6\u4FE1\u606F\u8BFB\u53D6\u5931\u8D25",
    confirmTitle: "\u5B89\u88C5\u63D2\u4EF6",
    confirmVersion: "\u7248\u672C",
    confirmSource: "\u6765\u6E90",
    confirmTrust: "\u63D2\u4EF6\u5B89\u88C5\u540E\u4EE5\u4F60\u7684\u6743\u9650\u8FD0\u884C\u3002\u5546\u57CE\u5BA1\u6838\u8FC7\u8FD9\u4E2A\u7248\u672C\uFF0C\u4F46\u8BF7\u53EA\u5B89\u88C5\u4F60\u4FE1\u4EFB\u7684\u63D2\u4EF6\u3002",
    cancel: "\u53D6\u6D88",
    continue: "\u7EE7\u7EED\u5B89\u88C5",
    crashTitle: "\u5546\u57CE\u51FA\u4E86\u70B9\u95EE\u9898",
    handoff: "\u8BF7\u70B9\u300C\u5546\u57CE\u300D\u6807\u7B7E\u5B8C\u6210\u5B89\u88C5\uFF1A{name}",
    dismiss: "\u5173\u95ED"
  }
};

// locale/en.json
var en_default = {
  meta: {
    title: "Plugin Store",
    description: "An app-store style DSH plugin store with hand-reviewed plugins"
  },
  ui: {
    tab: "Store",
    search: "Search plugins",
    featured: "Featured",
    viewDetails: "View details",
    seeAll: "See all \u203A",
    browseCategories: "Browse by category",
    allPlugins: "All plugins",
    back: "\u2039 Back",
    searchResults: "Search: {query}",
    empty: "No plugins found",
    loading: "Loading\u2026",
    loadFailed: "Could not load the store",
    retry: "Retry",
    refresh: "Refresh",
    staleNotice: "Network trouble: showing the last loaded catalog",
    install: "Install",
    installed: "Installed",
    update: "Update available",
    incompatible: "Incompatible",
    incompatibleHint: "This version supports DSH {range}, which excludes the running {version}",
    reviewed: "Reviewed \xB7 {date}",
    compatible: "Works with this DSH",
    compatUnknown: "Compatibility unknown",
    compatNo: "Not compatible with this DSH",
    stars: "Stars",
    weeklyDownloads: "Weekly downloads",
    published: "Published",
    statsAsOf: "Stats as of {date}",
    screenshots: "Screenshots",
    whatItDoes: "What it does",
    permissions: "Permissions",
    verdict: "Reviewer verdict",
    scanResult: "Scan result",
    scanNote: "Scan results come from an automatic source scan and are only a hint; the reviewer verdict decides.",
    scanDisagrees: 'The scan matched; after reading the code the reviewer concluded "{verdict}"',
    permNetwork: "Network",
    permFileSystem: "Reads or writes files",
    permAgentTools: "Registers agent tools",
    permChildProcess: "Runs commands",
    permInstallScripts: "Install scripts",
    yes: "Yes",
    no: "No",
    review: "Review",
    reviewer: "Reviewer",
    reviewedVersion: "Reviewed version",
    reviewDate: "Review date",
    tabReadme: "Overview",
    tabChangelog: "Changelog",
    tabVersions: "Versions",
    tabSource: "Source",
    noChangelog: "The author provides no changelog",
    noReadme: "The author provides no description",
    author: "Author",
    homepage: "Homepage",
    repository: "Source code",
    npmPackage: "npm package",
    enginesDsh: "Supported DSH versions",
    anyVersion: "No limit declared",
    upstreamPending: "Upstream released {version}; it will be listed after review",
    related: "Related plugins",
    detailFailed: "Could not load the details",
    confirmTitle: "Install plugin",
    confirmVersion: "Version",
    confirmSource: "Source",
    confirmTrust: "Plugins run with your permissions. The store reviewed this version, but only install plugins you trust.",
    cancel: "Cancel",
    continue: "Continue",
    crashTitle: "Something went wrong in the store",
    handoff: "Open the Store tab to finish installing: {name}",
    dismiss: "Dismiss"
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
