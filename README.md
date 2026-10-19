# dsh-plugin-store

应用商店式的 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 插件商城，配一份人工审核的插件目录。**开发中**，目前是技术验证版本。

适用于 DSH 0.2.1-rc.2 至 0.2.x（不含 0.3 系列，包括其预发布版）。安装：插件页 →「添加插件」→ 填写：

```text
github:yang051211/dsh-plugin-store#<tag>
```

注意：

- 必须填完整的 `github:` 地址。只填 `dsh-plugin-store` 会去 npm 上找，而本插件没有发布到 npm。
- 对话框右侧的「安装源」保持「npm 官方源」或「中国大陆镜像源」，**不要**设成自定义地址，更不要把 GitHub 地址填进去：设成自定义地址后，整个 profile 的依赖都会改到那个源去解析，安装会失败。

设计文档见 [docs/superpowers/specs](docs/superpowers/specs/)。
