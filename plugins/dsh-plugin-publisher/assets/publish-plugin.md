# 发布 DSH 插件（publish-dsh-plugin）

当用户要求“发布 / 提交 / 更新某个 DSH 插件”时，按本流程执行。脚本随本技能一起分发，位于本技能目录的 `scripts/release.mjs`（安装后是 `dsh-plugin-publisher` 包内的 `assets/scripts/release.mjs`）。

## 前置检查

1. **插件目录**：确认待发布的包目录，`package.json` 里必须有：
   - `name`（npm 包名）；
   - `dsh.bundle.patch`（bundle 补丁）；
   - 若有客户端插件，`dsh.client` 且 `client.js` 里 `window.__ModuleLoader__.load({ id: '…' })` 的 `id` **必须等于包名**。
2. **npm 凭据**：发布需要 npm token。优先读环境变量 `NPM_TOKEN`，否则读 `%USERPROFILE%\.dsh\npm-token`（一行，纯 token）。没有就提示用户去 https://www.npmjs.com/settings/~/tokens 生成 **Granular Access Token（勾选 Bypass 2FA，Read and write）** 并写入该文件，不要把 token 贴进对话。
3. **索引仓库**：确认要更新的精选索引（例如 `cuiyuan605/dsh-plugin-picks`，本地目录含 `docs/index.json`）以及 `gh` 是否已登录。

## 执行

在包目录外运行（PowerShell）：

```powershell
node "$env:DSH_PROFILE_DIR\node_modules\dsh-plugin-publisher\assets\scripts\release.mjs" `
  --dir <插件绝对路径> `
  --index <本地 docs/index.json 绝对路径> `
  --bump patch `
  --repo cuiyuan605/dsh-plugin-picks `
  --gh-bin "C:\Users\11680\Desktop\dhs\tools\bin\gh.exe" `
  --gh-config-dir "C:\Users\11680\Desktop\dhs\.gh" `
  --push
```

参数说明：

| 参数 | 作用 |
|---|---|
| `--dir` | 待发布插件目录（必填） |
| `--index` | 本地 `docs/index.json` 路径（必填） |
| `--bump` | `patch` / `minor` / `major` / `none`，默认 `patch` |
| `--no-publish` | 只更新索引，不发布 npm（调试用） |
| `--icon` | 图标文件；默认取插件目录的 `icon.svg` |
| `--repo` | `owner/name`，索引所在 GitHub 仓库 |
| `--push` | 更新完索引后通过 `gh api` 提交到仓库 |
| `--gh-bin` | `gh` 可执行文件路径（不在 PATH 时必填） |
| `--gh-config-dir` | `GH_CONFIG_DIR`（gh 登录信息所在目录） |
| `--pm` | 包管理器命令，默认 `npm` |

脚本会：

1. 读取 `package.json`，必要时执行 `npm version <bump> --no-git-tag-version`；
2. 用 token 执行 `npm publish --registry https://registry.npmjs.org/`；
3. 更新索引里该插件的 `versions`（版本、发布时间戳、`source: npm`、`engines.dsh`），没有条目就新建；
4. 复制图标到 `icons/<包名>.svg` 并写入 `icon` 字段；
5. 加 `--push` 时用 `gh api` 把索引提交到仓库（GitHub Pages 约 1 分钟后重建）。

## 完成后

把结果回报给用户：包名、新版本、npm 链接、索引提交是否成功、索引 URL。若 `--push` 失败（网络/凭据），保留本地已更新的 `index.json`，并提示用户稍后重试或用 `git` 手动提交。

## 注意事项

- 发布是公开且基本不可逆的操作；执行前必须让用户确认包名与版本。
- 不要执行 `npm login`；只用文件里的 token。
- 不要在回复里回显 token。
