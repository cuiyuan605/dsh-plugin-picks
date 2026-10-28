# 精选 DSH 插件

由 [cuiyuan605](https://github.com/cuiyuan605) 维护的 DeepSeek Harness 插件精选，同时也是一个 **DSH 插件市场索引**（format 1）。

## 作为索引源使用

1. 侧栏 **插件** → **发现**（需要先在「实验性插件 → 更多」里开启 **自定义插件市场**）；
2. **添加索引源**，填入：

```text
https://cuiyuan605.github.io/dsh-plugin-picks/index.json
```

3. 在市场下拉里选择「精选 DSH 插件」，浏览并安装。

## 收录的插件

| 插件 | 说明 | 安装 |
|---|---|---|
| [消息盒子](https://github.com/cuiyuan605/dsh-message-box) | 对话完成与审批通知的浮动收件箱，可跳转、可原地审批 | `dsh-message-box` |

## 手工安装

桌面版：插件 → 添加插件 → 填包名 `dsh-message-box`。

CLI Web 版：

```sh
dsh plugin --profile web add 'dsh-message-box'
```

## 维护方式

`docs/index.json` 是发布的索引文件，`docs/index.html` 是展示页（GitHub Pages 从 `docs/` 部署）。新增插件时：

1. 把图标放进 `docs/icons/`；
2. 在 `docs/index.json` 的 `plugins` 里加一项，`versions` 里加版本记录；
3. 提交推送，Pages 会自动重建（约 1 分钟）。

## 许可

本仓库的索引与页面采用 MIT。
