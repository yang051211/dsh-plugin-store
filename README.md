# dsh-plugin-store

应用商店式的 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 插件商城，配一份人工审核的插件目录。当前版本 0.1.5。

适用于 DSH 0.2.1-rc.2 至 0.2.x（不含 0.3 系列，包括其预发布版）。安装：插件页 →「添加插件」→ 填写：

```text
github:yang051211/dsh-plugin-store#<tag>
```

注意：

- 必须填完整的 `github:` 地址。**不要只填 `dsh-plugin-store`**：本插件没有发布到 npm，而 npm 上同名的 `dsh-plugin-store` 是另一个作者的插件，只填包名会装成别人的。
- 对话框右侧的「安装源」保持「npm 官方源」或「中国大陆镜像源」，**不要**设成自定义地址，更不要把 GitHub 地址填进去：设成自定义地址后，整个 profile 的依赖都会改到那个源去解析，安装会失败。

## 只想要插件目录？加到官方「发现」页

商城读取的插件目录本身就是一份标准的 DSH 插件市场索引。不装本插件，也可以在 DSH 官方的「发现」页里使用它：

1. 插件页 →「实验性插件」→「更多」→ 启用「自定义插件市场」；
2. 打开「发现」→「添加索引源」，填写：

```text
https://raw.githubusercontent.com/yang051211/dsh-plugin-store/main/market/index.json
```

连不上 GitHub 时改用 jsDelivr 地址。注意 jsDelivr 的 `@main` 可能要过几个小时才会跟上最新目录：

```text
https://cdn.jsdelivr.net/gh/yang051211/dsh-plugin-store@main/market/index.json
```

商城插件自己会先读 GitHub，几秒内连不上再退回 jsDelivr。

目录里的每个插件都经过人工审核，只列出审核过的版本。

## 维护插件目录

人写的内容（中文名、卖点、要点、截图、审核结论）都在 [catalog/catalog.yaml](catalog/catalog.yaml)，脚本只读不写。

```sh
npm run catalog:fetch                    # 抓取版本、图标、README、星标、周下载（可设置 GITHUB_TOKEN）
npm run catalog:scan -- <名字>@<版本>     # 只读扫描源码，列出联网、读写文件等权限证据
npm run catalog:build                    # 生成 market/index.json 和 market/plugins/*.json
npm run catalog:check                    # 校验目录，并确认 market/ 是最新的
```

首页第一个分区「本周热门」由 `catalog:build` 按 npm 最近 7 天下载量自动生成，不在 catalog.yaml 里。数字只在 `catalog:fetch` 时刷新，所以每周刷新一次：

```sh
npm run catalog:fetch && npm run catalog:build && npm run catalog:check
git add catalog market && git commit -m "catalog: weekly stats refresh" && git push
```

设计文档见 [docs/superpowers/specs](docs/superpowers/specs/)。
