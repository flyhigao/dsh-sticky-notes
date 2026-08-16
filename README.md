# dsh-sticky-notes

DSH 工作区便签插件。只在当前会话头部放一个紧凑的便签图标；点击后打开便签面板：
你可以为当前工作区创建多张便签，每张便签都是一个独立的 Markdown 文件，保存在当前工作区的 `dsh-notes/` 目录。

## 为什么是多张便签，而不是一张？

建议使用**多张便签**：

- 一个工作区会积累很多零散想法：待办、灵感、会议记录、临时代码片段。如果只有一张便签，所有内容会堆在一起，越来越难找。
- 多张便签更符合「便签」的直觉：每张一个主题，列表预览 + 点开编辑。
- 落盘为多个 Markdown 文件后，用户可以方便地用编辑器、Git 直接查看和管理。

## 数据格式

每个便签是一个 Markdown 文件：

```text
<工作区>/dsh-notes/<note-id>.md
```

文件内容格式：

```markdown
# 便签标题

便签正文…
```

- `note-id` 由插件生成，格式 `note-<时间戳>-<随机串>`。
- 删除即删除对应 `.md` 文件，不做额外索引，简单透明。
- 如果直接手工修改/新增 `.md` 文件，插件会在下次打开便签面板时自动列出。

## 安装

本插件是一个本地 DSH 插件包。以 web profile 为例：

1. 把 `dsh-sticky-notes` 目录放到你喜欢的位置（例如 `/home/gao/dsh/dsh-sticky-notes`）。
2. 编辑 `~/.dsh/profiles/web/package.json`：

   ```json
   {
     "dependencies": {
       "dsh-sticky-notes": "file:/home/gao/dsh/dsh-sticky-notes"
     },
     "dsh": {
       "profile": {
         "bundles": [
           "@deepseek-ai/dsh-base",
           "@deepseek-ai/dsh-web-app",
           "dshmarket",
           "dsh-sticky-notes"
         ]
       }
     }
   }
   ```

3. 在 profile 目录执行：

   ```bash
   cd ~/.dsh/profiles/web
   pnpm install
   ```

4. 重启 `dsh web`，刷新页面后当前会话头部会出现便签图标。

## HTTP API（由插件自带，浏览器端调用）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/dsh-sticky-notes/list?workspaceId=<id>` | 列出当前工作区所有便签 |
| POST | `/dsh-sticky-notes/save` | 新建/保存便签，body `{ workspaceId, note: { id?, title, content } }` |
| POST | `/dsh-sticky-notes/delete` | 删除便签，body `{ workspaceId, id }` |

服务端只通过 `workspaceRegistry` 按 workspaceId 解析真实路径，不信任浏览器传来的任意文件路径；写操作要求同源 POST。
