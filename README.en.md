<p align="center"><img src="icon.png" alt="Startide" width="128" height="128"></p>

<h1 align="center">Startide · 生态家园</h1>

<p align="center">Discover <a href="https://github.com/deepseek-ai/deepseek-harness">DeepSeek Harness</a> (DSH) plugins that fit you</p>

<p align="center">
  <a href="https://www.npmjs.com/package/dsh-startide"><img alt="npm" src="https://img.shields.io/npm/v/dsh-startide?color=4d6bfe"></a>
  <a href="https://github.com/yang051211/dsh-startide/blob/main/market/index.json"><img alt="plugins" src="https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fyang051211%2Fdsh-startide%2Fmain%2Fmarket%2Findex.json&query=%24.plugins.length&label=plugins&color=2ea44f"></a>
  <a href="https://github.com/yang051211/dsh-startide/actions/workflows/directory.yml"><img alt="directory" src="https://github.com/yang051211/dsh-startide/actions/workflows/directory.yml/badge.svg"></a>
  <a href="https://github.com/yang051211/dsh-startide/stargazers"><img alt="Stars" src="https://img.shields.io/github/stars/yang051211/dsh-startide?style=social"></a>
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/github/license/yang051211/dsh-startide?color=d4a106"></a>
  <img alt="DSH" src="https://img.shields.io/badge/DSH-0.2.1--rc.2%2B-4d6bfe">
</p>

<p align="center"><a href="README.md">中文</a> · <b>English</b></p>

---

*Startide* is a star-lit tide, our reading of the Chinese name 辰泱: stars over wide waters.

Startide is a directory of DSH plugins. It lists every DSH plugin on npm that meets the rules below (about 6,400 today) and rebuilds itself on a schedule. Inside DSH you can browse plugins by category, popularity or release date and install one with a click.

> [!WARNING]
> **Plugins are not reviewed.** They are published by their own authors. The store only shows *automatic detection*: whether a plugin may use the network, touch files, run commands and so on. Detection comes from scanning source code; it can be wrong and is not a security review. Only install plugins you trust.

<p align="center"><img src="docs/images/home.webp" alt="Startide home" width="860"></p>

## Features

- **Complete**: finds and lists every qualifying DSH plugin on npm, and drops the ones that stop qualifying.
- **Easy to find**: trending, recently updated and new plugins on the home page; on the list page, filter by category, sort by popularity, release date, first release or stars, and hide plugins that do not support your DSH.
- **Clear**: every plugin has its README, version history, source links and automatic detection results.
- **Safe installs**: installing always goes through DSH's own install dialog; nothing installs until you confirm.
- **Manage what you have**: the Installed page lists your plugins, marks the ones with a newer version and updates them once you confirm, and lets you enable, disable, uninstall or open their settings.
- **One entry**: turn on "Keep only Startide" and the sidebar shows only Startide, while the Plugins page hides its own heading and tabs; turn it off to restore them.
- **Always current**: GitHub Actions rebuilds the directory on a schedule, and the store tells you when a new store release is out.

| All plugins | Plugin page |
|---|---|
| <img src="docs/images/list.webp" alt="All plugins" width="420"> | <img src="docs/images/detail.webp" alt="Plugin page" width="420"> |

## Install

For DSH 0.2.1-rc.2 to 0.2.x (not the 0.3 line, including its pre-releases). In DSH, open Plugins → Add plugin and enter the package name:

```text
dsh-startide
```

- Leave the install source on the npm registry or the mainland China mirror. **Do not** set a custom address: every dependency of the profile would then resolve from it, and the install fails.
- You can also enter the GitHub address `github:yang051211/dsh-startide#v<version>` to install a given release from GitHub.

Once installed, Startide appears in the DSH sidebar; it opens the Startide tab on the Plugins page. To make it your only plugins entry, turn on "Keep only Startide" in the top right corner of the Installed page.

### Upgrading from the old name

Before 0.2.0 the store was called `dsh-plugin-store`. Pressing Update in the old version installs `dsh-startide` beside it; the new version then reminds you to remove `dsh-plugin-store` in the Plugins page.

## Just the directory?

The directory the store reads is a standard DSH plugin market index, so DSH's own Discover page can use it without this plugin:

1. Plugins → Experimental plugins → More → enable *Custom plugin market*;
2. Open Discover → Add index source, and enter:

```text
https://raw.githubusercontent.com/yang051211/dsh-startide/main/market/index.json
```

If GitHub is unreachable, use jsDelivr instead (its `@main` can lag behind by a few hours):

```text
https://cdn.jsdelivr.net/gh/yang051211/dsh-startide@main/market/index.json
```

## How it works

### Listing rules

An npm package is listed when all of these hold, and drops out (and comes back) automatically:

1. It is a DSH plugin (its latest package.json declares `dsh.bundle.patch`) and is not deprecated;
2. It has a source repository or homepage;
3. Its `engines.dsh` is empty or admits the `dshVersion` in [directory/config.json](directory/config.json);
4. It released a version in the last `recentDays` (90) days.

Candidate names come from npm search (the `keywords`) plus the names other directories in `seedIndexes` list. npm search returns at most about 10,000 fuzzy matches per query, so search alone misses some plugins. Other directories only propose names; listing is always decided from the package itself.

Every listed package is rechecked at least every 7 days, so packages that were removed, deprecated or stopped being DSH plugins drop out even when search no longer returns them.

### Automatic detection

For each plugin's latest version, a program downloads the package, reads it without running anything, and marks five things: network use, file access, agent tools, running commands and install scripts.

- When a package ships prebuilt or minified code, detection cannot see inside it, and the plugin page says that "no" does not mean none.
- A new version is queued and shows *not checked yet* until it is scanned.
- A package that is too large (over 128 MB packed or 256 MB unpacked) or unreadable shows *could not be checked* after three attempts, and is tried again with its next version.

## Development

Requires Node.js 24 (the version CI uses).

```sh
npm ci
npm run build       # build lib/ (the committed lib/ is what ships; commit it with src/ changes)
npm test            # all tests
npm run verify      # build + lib/ matches src/ + directory check + tests
```

### Releasing

Every release goes to both GitHub and npm:

1. Bump `version` in `package.json`, run `npm run verify`, commit.
2. Tag and push together: `git tag v<version> && git push --atomic origin main v<version>`. The store updates itself from this tag, so the tag must land with main.
3. Export the tag to an empty directory and publish from there (the npm account needs two-factor authentication):

   ```sh
   git archive v<version> | tar -x -C <empty-dir>
   cd <empty-dir>
   npm publish --dry-run   # check the file list: only lib/, locale/, the READMEs, LICENSE, the icon and the patch file
   npm publish
   ```

   The first publish of a new package name puts up a `0.0.0-stage` placeholder; the real version appears tens of seconds later.

### Directory

[.github/workflows/directory.yml](.github/workflows/directory.yml) rebuilds the directory, currently every 6 hours. The same steps run locally:

```sh
npm run directory:discover   # search for candidate names into directory/names.json (names only grow)
npm run directory:refresh    # re-read new packages, changed versions and packages unchecked for 7 days
npm run directory:stats      # weekly downloads; a rotating slice of GitHub stars (GITHUB_TOKEN raises the limit)
npm run directory:scan       # automatic detection for latest versions not yet scanned; icons too
npm run directory:build      # write market/index.json, market/plugins/*.json, market/icons/
npm run directory:check      # market/ matches the state and passes the official index reader
```

One package failing never stops a run; it is retried next time, and an entry the official reader refuses is left out and reported. `directory/config.json` is edited by hand only.

Design notes live in [docs/superpowers/specs](docs/superpowers/specs/).

## Contributing

- Found a problem with a plugin, or have an idea: [open an issue](https://github.com/yang051211/dsh-startide/issues).
- To change categories or listing rules, edit [directory/config.json](directory/config.json) and open a pull request.

## Thanks

- Extra candidate names: [REALOIYO/dsh-plugin-market](https://github.com/REALOIYO/dsh-plugin-market).
- The store icon is an AI-generated whale maid.

## License

[MIT](LICENSE)
