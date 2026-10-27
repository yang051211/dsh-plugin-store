<p align="center"><img src="icon.png" alt="生态家园图标" width="128" height="128"></p>

<h1 align="center">生态家园（dsh-plugin-store）</h1>

<p align="center">发现适合你自己的 <a href="https://github.com/deepseek-ai/deepseek-harness">DeepSeek Harness</a>（DSH）插件</p>

<p align="center">
  <a href="https://github.com/yang051211/dsh-plugin-store/tags"><img alt="version" src="https://img.shields.io/github/v/tag/yang051211/dsh-plugin-store?label=version&color=4d6bfe"></a>
  <a href="https://github.com/yang051211/dsh-plugin-store/blob/main/market/index.json"><img alt="plugins" src="https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fyang051211%2Fdsh-plugin-store%2Fmain%2Fmarket%2Findex.json&query=%24.plugins.length&label=plugins&color=2ea44f"></a>
  <a href="https://github.com/yang051211/dsh-plugin-store/actions/workflows/directory.yml"><img alt="directory" src="https://github.com/yang051211/dsh-plugin-store/actions/workflows/directory.yml/badge.svg"></a>
  <a href="https://github.com/yang051211/dsh-plugin-store/stargazers"><img alt="Stars" src="https://img.shields.io/github/stars/yang051211/dsh-plugin-store?style=social"></a>
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/github/license/yang051211/dsh-plugin-store?color=d4a106"></a>
  <img alt="DSH" src="https://img.shields.io/badge/DSH-0.2.1--rc.2%2B-4d6bfe">
</p>

生态家园是一个 DSH 插件目录：自动收录 npm 上所有符合条件的 DSH 插件（目前约 6400 个），定时更新，可以在 DSH 里按分类、热度、更新时间浏览，并一键安装。当前版本 0.2.0。

> **插件未经审核。** 它们由各自的作者发布。商店只显示「自动检测」的结果，也就是会不会联网、读写文件、执行命令等。这些是程序扫描源码得出的提示，可能不准，不代表安全审查。请只安装你信任的插件。

## 安装

适用于 DSH 0.2.1-rc.2 至 0.2.x（不含 0.3 系列，包括其预发布版）。在插件页 →「添加插件」里填写：

```text
github:yang051211/dsh-plugin-store#<tag>
```

注意：

- 必须填完整的 `github:` 地址。**不要只填 `dsh-plugin-store`**：本插件没有发布到 npm，而 npm 上同名的 `dsh-plugin-store` 是另一个作者的插件，只填包名会装成别人的。
- 对话框右侧的「安装源」保持「npm 官方源」或「中国大陆镜像源」。**不要**设成自定义地址，更不要把 GitHub 地址填进去：设成自定义地址后，整个 profile 的依赖都会改到那个源去解析，安装会失败。

装好后，DSH 左侧边栏和插件页都会出现「生态家园」。商店发布新版本时会提示更新，点一下就会走 DSH 官方的安装对话框。

## 商店里有什么

| 页面 | 内容 |
|---|---|
| 首页 | 搜索框；「本周热门」「最近更新」「新上架」三个区，各 8 个插件 |
| 全部插件 | 按分类筛选（带数量）；按热门、最近更新、最新上架、星标排序；可以隐藏与当前 DSH 不兼容的插件；每页 30 个 |
| 插件详情 | README、版本历史、来源链接；安装按钮和可复制的「包名@版本」；自动检测结果；同类插件 |
| 关于 | 收录规则、自动检测的含义、安装和反馈方式 |

安装始终走 DSH 官方的安装对话框，确认后才会装。

### 自动检测

程序会下载每个插件的最新版本，只读取、不运行，扫描源码里的特征，标出这五项：联网、读写文件、给 Agent 注册工具、执行命令、安装脚本。

- 插件包含预编译文件或压缩代码时，检测看不到这些内容，详情页会提醒「否」不代表没有。
- 新版本发布后会排队检测，检测完成前显示「尚未检测」。
- 包太大（压缩后超过 128 MB 或解压后超过 256 MB）或无法读取的，重试 3 次后显示「无法自动检测」；作者发布新版本后会再试。

## 只想要插件目录？加到官方「发现」页

商店读取的目录本身就是一份标准的 DSH 插件市场索引。不装本插件，也可以在 DSH 官方的「发现」页里使用它：

1. 插件页 →「实验性插件」→「更多」→ 启用「自定义插件市场」；
2. 打开「发现」→「添加索引源」，填写：

```text
https://raw.githubusercontent.com/yang051211/dsh-plugin-store/main/market/index.json
```

连不上 GitHub 时改用 jsDelivr 地址。注意 jsDelivr 的 `@main` 可能要过几个小时才会跟上最新目录：

```text
https://cdn.jsdelivr.net/gh/yang051211/dsh-plugin-store@main/market/index.json
```

商店插件自己会先读 GitHub，几秒内连不上再退回 jsDelivr。

## 收录条件

同时满足以下条件的 npm 包都会收录。不满足的自动下架，重新满足后自动回来：

1. 是 DSH 插件包（最新版的 package.json 声明了 `dsh.bundle.patch`），且没有被废弃；
2. 有源码仓库或主页；
3. `engines.dsh` 为空，或兼容 [directory/config.json](directory/config.json) 里的 `dshVersion`；
4. 最近 `recentDays`（90）天内发布过新版本。

候选包名有两个来源：一是 npm 搜索（`keywords` 里的关键词）；二是 `seedIndexes` 里其他目录列出的包名。npm 搜索每个查询最多只返回约 1 万条模糊结果，单靠它会漏掉一部分插件。其他目录只提供包名，是否收录仍按上面的条件，看包本身。

已收录的插件每 7 天至少重新检查一次。这样即使 npm 搜索不再返回它，被删除、被废弃或不再是 DSH 插件的也会及时下架。

## 更新流程

[.github/workflows/directory.yml](.github/workflows/directory.yml) 目前每 6 小时运行一次，也可以在本地手动跑：

```sh
npm run directory:discover   # 搜索候选包名，写入 directory/names.json（只增不减）
npm run directory:refresh    # 新包、有新版本的包、超过 7 天没查的包，重新读取包信息
npm run directory:stats      # 周下载量；按轮换刷新一部分 GitHub 星标（可设置 GITHUB_TOKEN）
npm run directory:scan       # 对还没检测的最新版本做自动检测，顺带取图标
npm run directory:build      # 生成 market/index.json、market/plugins/*.json、market/icons/
npm run directory:check      # 确认 market/ 和状态文件一致，索引能被官方读取器解析
```

单个包读取或检测失败不会中断整轮，下次运行会重试。官方读取器不接受的条目会被单独剔除并记录，不影响其他插件发布。

`directory/config.json` 只由人编辑（DSH 版本、关键词、重查周期、每轮检测上限、分类和分类关键词），工具从不写它。

## 致谢

- 候选包名的补充来源：[REALOIYO/dsh-plugin-market](https://github.com/REALOIYO/dsh-plugin-market)。
- 商店图标取自一幅女仆插画的头像部分，作者未知。如果你是作者，希望署名或撤下，请[开 Issue](https://github.com/yang051211/dsh-plugin-store/issues)。

设计文档见 [docs/superpowers/specs](docs/superpowers/specs/)。
