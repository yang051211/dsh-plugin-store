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
  apply: () => apply,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(client_exports);

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

// src/client.ts
var name = "plugin-store";
var NS = "pluginStore";
var inject = ["locale"];
function apply(ctx) {
  ctx.effect(() => ctx.locale.register(NS, { zh: zh_default.ui, en: en_default.ui }), "plugin-store: dictionaries");
}
return module.exports; } });
