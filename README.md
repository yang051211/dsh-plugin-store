# dsh-plugin-store

[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的插件目录「生态家园」：收录 npm 上符合条件的 DSH 插件，每天自动更新，可以按分类、热度、更新时间浏览，并在 DSH 里一键安装。当前版本 0.2.0。

**插件未经审核。** 它们由各自的作者发布；商店只标出「自动检测」的结果（会不会联网、读写文件、执行命令等），这是程序扫描源码得出的提示，可能不准，不代表安全审查。请只安装你信任的插件。

适用于 DSH 0.2.1-rc.2 至 0.2.x（不含 0.3 系列，包括其预发布版）。安装：插件页 →「添加插件」→ 填写：

```text
github:yang051211/dsh-plugin-store#<tag>
```

注意：

- 必须填完整的 `github:` 地址。**不要只填 `dsh-plugin-store`**：本插件没有发布到 npm，而 npm 上同名的 `dsh-plugin-store` 是另一个作者的插件，只填包名会装成别人的。
- 对话框右侧的「安装源」保持「npm 官方源」或「中国大陆镜像源」，**不要**设成自定义地址，更不要把 GitHub 地址填进去：设成自定义地址后，整个 profile 的依赖都会改到那个源去解析，安装会失败。

## 只想要插件目录？加到官方「发现」页

商城读取的目录本身就是一份标准的 DSH 插件市场索引。不装本插件，也可以在 DSH 官方的「发现」页里使用它：

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

## 收录条件

同时满足以下条件的 npm 包都会收录，不满足的自动下架，重新满足后自动回来：

1. 是 DSH 插件包（最新版的 package.json 声明了 `dsh.bundle.patch`），且没有被废弃；
2. 有源码仓库或主页；
3. `engines.dsh` 为空，或兼容 [directory/config.json](directory/config.json) 里的 `dshVersion`；
4. 最近 `recentDays`（90）天内发布过新版本。

候选包名来自 npm 搜索（`keywords` 里的关键词），并合并 `seedIndexes` 里其他目录列出的包名。npm 搜索每个查询最多只返回约 1 万条模糊结果，单靠它会漏掉一部分插件。其他目录只提供包名，是否收录仍按上面的条件看包本身。

## 每日更新

[.github/workflows/directory.yml](.github/workflows/directory.yml) 定时运行，也可以在本地手动跑：

```sh
npm run directory:discover   # 搜索候选包名，写入 directory/names.json（只增不减）
npm run directory:refresh    # 最新版本有变化的包重新读取包信息，写入 directory/packages/
npm run directory:stats      # 周下载量；按轮换刷新一部分 GitHub 星标（可设置 GITHUB_TOKEN）
npm run directory:scan       # 对还没检测的最新版本做自动检测（只下载读取，不运行），顺带取图标
npm run directory:build      # 生成 market/index.json、market/plugins/*.json、market/icons/
npm run directory:check      # 确认 market/ 和状态文件一致，索引能被官方读取器解析
```

`directory/config.json` 只由人编辑（DSH 版本、关键词、每轮检测上限、分类和分类关键词），工具从不写它。

设计文档见 [docs/superpowers/specs](docs/superpowers/specs/)。
