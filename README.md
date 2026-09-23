# Atelier WÉI 网站

这是从最终线上版本 `https://atelier-wei-website.pages.dev/` 保存的可编辑副本。

## 文件说明

- `index.html`：页面结构和文字
- `styles.css`：布局、颜色、响应式样式
- `app.js`：图片画廊、动画和交互
- `data.js`：图片清单
- `images/`：当前网站图片的本地备份

## 图片管理

生产环境图片使用 Cloudflare R2：

`https://images.atelier-wei.com/`

因此 `data.js` 中保留的是 R2 图片地址。新增图片时，应先上传到 Cloudflare R2 存储桶 `atelier-wei-images`，再把图片 URL 添加到 `data.js`。

## 编辑和发布

1. 修改 `index.html`、`styles.css`、`app.js` 或 `data.js`。
2. 在本地预览并检查桌面端和手机端。
3. 确认图片地址可以正常打开。
4. 发布到 Cloudflare Pages 项目 `atelier-wei-website`。

当前线上域名：

- 网站：`https://atelier-wei-website.pages.dev/`
- 图片：`https://images.atelier-wei.com/`
