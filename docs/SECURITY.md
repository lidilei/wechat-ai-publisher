# 安全配置指南

## 🔐 敏感信息保护

### 本仓库的安全措施

✅ **已实现**:
- 所有 API Key 使用占位符（`YOUR_XXX`）
- 提供 `.env.example` 配置模板
- `.gitignore` 已排除 `.env` 文件
- 代码中无硬编码凭证

❌ **禁止行为**:
- 不要将真实 API Key 写入代码
- 不要将 `.env` 文件提交到 Git
- 不要在 Issue 或评论中分享凭证
- 不要截图包含敏感信息的内容

---

## 📋 配置清单

### 微信公众号

| 信息 | 是否敏感 | 处理方式 |
|------|----------|----------|
| AppID | ⚠️ 中等 | 可写在配置文件中 |
| AppSecret | 🔴 高 | 必须保密，不要公开 |
| Access Token | 🔴 高 | 动态获取，有效期 2 小时 |

### 豆包 AI

| 信息 | 是否敏感 | 处理方式 |
|------|----------|----------|
| API Key | 🔴 高 | 必须保密，定期轮换 |
| 端点 ID | ⚠️ 中等 | 可写在配置文件中 |

---

## 🛡️ 最佳实践

### 1. 使用环境变量

```bash
# 推荐：使用 .env 文件（不提交到 Git）
cp config/.env.example config/.env
vim config/.env

# 或者：使用系统环境变量
export WECHAT_APPID=xxx
export WECHAT_SECRET=xxx
```

### 2. 限制权限

- 微信公众号：只开通必要权限
- 豆包 AI：设置额度限制
- 服务器：限制 IP 白名单

### 3. 定期轮换

- API Key 建议每 3-6 个月更换
- 发现泄露立即重置

### 4. 监控使用

- 微信公众号：查看调用日志
- 豆包 AI：监控额度和调用次数

---

## 🔍 检查清单

提交代码前检查：

```bash
# 搜索可能的敏感信息
grep -r "wx[a-f0-9]\{16\}" .
grep -r "sk-[a-zA-Z0-9]\{32\}" .
grep -r "ep-[a-zA-Z0-9]\{20\}" .

# 检查 .env 是否在 .gitignore 中
cat .gitignore | grep ".env"
```

---

## 🚨 泄露应对

### 如果 API Key 泄露：

1. **立即重置**
   - 微信公众号：重置 AppSecret
   - 豆包 AI：重新生成 API Key

2. **检查日志**
   - 查看异常调用记录
   - 确认是否有未授权访问

3. **更新配置**
   - 修改所有使用该 Key 的地方
   - 通知相关人员

---

## 📚 参考资料

- [GitHub 安全最佳实践](https://docs.github.com/en/code-security)
- [微信公众号安全规范](https://developers.weixin.qq.com/doc/offiaccount/Security_Center/Security_Rules.html)
- [豆包 AI 安全指南](https://www.volcengine.com/docs/82379)

---

**安全第一！保护你的 API Key 就像保护你的银行卡密码！** 🔐
