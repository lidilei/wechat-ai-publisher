# 微信公众号 AI 自动发布工具

🤖 基于 OpenClaw + 豆包 AI 的微信公众号自动发布解决方案

## ✨ 功能特性

- 📝 **自动撰写文章** - AI 采集热点、撰写内容
- 🎨 **AI 生成配图** - 豆包 Seedream 生成高质量配图
- 📤 **自动发布** - 一键发布到微信公众号草稿箱
- 🔧 **灵活配置** - 支持自定义主题、风格、配图数量

## ⚠️ 重要提示

**本仓库不包含任何真实的 API Key 或敏感信息！**

使用前需要自行配置微信公众号和豆包 AI 的凭证。

## 🚀 快速开始

### 前置要求

- Node.js 22+
- OpenClaw Gateway
- 微信公众号（服务号）
- 豆包 AI API Key

### 安装步骤

1. **克隆仓库**
```bash
git clone https://github.com/lidilei/wechat-ai-publisher.git
cd wechat-ai-publisher
```

2. **配置环境变量**

**方式 A: 使用 .env 文件（推荐）**
```bash
# 复制配置模板
cp config/.env.example config/.env

# 编辑配置文件，填入你的 API Key
vim config/.env
```

**方式 B: 使用系统环境变量**
```bash
export WECHAT_APPID=你的 AppID
export WECHAT_SECRET=你的 AppSecret
export DOUBAO_API_KEY=你的豆包 API Key
export DOUBAO_ENDPOINT=你的端点 ID
```

3. **获取微信公众号凭证**
   - 访问：https://mp.weixin.qq.com
   - 进入 **设置与开发** → **基本配置**
   - 复制 AppID 和 AppSecret

4. **获取豆包 AI 凭证**
   - 访问：https://console.volcengine.com/ark
   - 创建 API Key
   - 创建图像生成端点，复制端点 ID

### 使用方法

**基础发布**
```bash
node scripts/publish-with-ai-images-fixed.js
```

## 📁 项目结构

```
wechat-ai-publisher/
├── scripts/
│   ├── publish-with-ai-images-fixed.js  # 主发布脚本（豆包 AI 生图）
│   └── publish-final.js                  # 简化版发布脚本
├── config/
│   └── .env.example                      # 配置模板
├── docs/
│   └── setup-guide.md                    # 详细配置指南
├── examples/
│   └── article-sample.md                 # 文章示例
├── .gitignore                            # Git 忽略配置
├── LICENSE
└── README.md
```

## 🔑 配置说明

### 必需配置

| 变量名 | 说明 | 获取方式 |
|--------|------|----------|
| `WECHAT_APPID` | 公众号 AppID | 公众号后台 - 基本配置 |
| `WECHAT_SECRET` | 公众号 AppSecret | 公众号后台 - 基本配置 |
| `DOUBAO_API_KEY` | 豆包 API Key | 火山引擎豆包控制台 |
| `DOUBAO_ENDPOINT` | 豆包端点 ID | 豆包控制台 - 端点管理 |

### 可选配置

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `WECHAT_AUTHOR` | 你的作者名 | 文章作者署名 |
| `ARTICLE_TOPIC` | AI 工具 | 文章主题 |
| `ARTICLE_STYLE` | github | CSS 风格（purple/orangeheart/github） |
| `ARTICLE_IMAGES` | 封面 +3 张 | 配图数量 |

## 🛠️ 脚本说明

| 脚本 | 功能 | 推荐度 |
|------|------|--------|
| `publish-with-ai-images-fixed.js` | 豆包 AI 生图 + 自动发布 | ⭐⭐⭐⭐⭐ |
| `publish-final.js` | 简化版（网络图片） | ⭐⭐⭐⭐ |

## ⚠️ 注意事项

1. **图片尺寸** - 豆包 AI 要求至少 3686400 像素（如 2048x2048）
2. **API 调用** - 每次生成图片需要 30-90 秒
3. **内容审核** - AI 生成内容需人工审核后发布
4. **安全** - 不要将 `.env` 文件提交到 Git

## 🔗 相关链接

- [OpenClaw 官方文档](https://docs.openclaw.ai)
- [豆包 AI 控制台](https://console.volcengine.com/ark)
- [微信公众号开发文档](https://developers.weixin.qq.com/doc/offiagent/)
- [详细配置指南](docs/setup-guide.md)

## 📄 License

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

**作者**: 地雷 Ravi  
**创建时间**: 2026-03-01  
**最后更新**: 2026-03-02
