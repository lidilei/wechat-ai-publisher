#!/usr/bin/env node

/**
 * 微信公众号发布脚本（实用版）
 * 
 * 功能：
 * 1. 使用高质量网络图片作为封面（适合公众号）
 * 2. 自动上传到微信素材库
 * 3. 发布到草稿箱
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// 配置 - 从环境变量或配置文件加载
const CONFIG = {
  wechat: {
    appid: process.env.WECHAT_APPID || 'YOUR_WECHAT_APPID',
    secret: process.env.WECHAT_SECRET || 'YOUR_WECHAT_SECRET',
    author: process.env.WECHAT_AUTHOR || '你的作者名'
  }
};

// 公众号封面图资源（高质量，适合科技类文章）
const COVER_IMAGES = [
  'https://images.unsplash.com/photo-1518770660439-4636190af475?w=900&h=500&fit=crop',  // 科技芯片
  'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=900&h=500&fit=crop',  // 网络安全
  'https://images.unsplash.com/photo-1558494949-efc535b5c47c?w=900&h=500&fit=crop',  // 云服务
  'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=900&h=500&fit=crop',  // 编程代码
  'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=900&h=500&fit=crop'   // 团队协作
];

console.log('🚀 微信公众号发布工具（实用版）\n');

async function main() {
  try {
    // Step 1: 获取 access_token
    console.log('Step 1: 获取微信公众号 access_token...');
    const accessToken = await getAccessToken();
    console.log('✅ Token 获取成功\n');
    
    // Step 2: 下载封面图
    console.log('Step 2: 下载公众号封面图...');
    const coverUrl = COVER_IMAGES[Math.floor(Math.random() * COVER_IMAGES.length)];
    console.log(`   使用图片：${coverUrl.substring(0, 50)}...`);
    
    const coverBuffer = await downloadImage(coverUrl);
    console.log(`✅ 封面图下载成功 (${(coverBuffer.length / 1024).toFixed(2)} KB)\n`);
    
    // Step 3: 上传封面图
    console.log('Step 3: 上传封面图到微信素材库...');
    const coverMediaId = await uploadImage(accessToken, coverBuffer, 'cover.png');
    if (!coverMediaId) {
      throw new Error('封面图上传失败');
    }
    console.log(`✅ 封面图上传成功`);
    console.log(`   Media ID: ${coverMediaId}\n`);
    
    // Step 4: 读取文章
    console.log('Step 4: 读取文章内容...');
    const articlePath = path.join('wechat-article-orchestrator', 'drafts', 'article_openclaw_best_practices.md');
    
    if (!fs.existsSync(articlePath)) {
      throw new Error('文章文件不存在');
    }
    
    const content = fs.readFileSync(articlePath, 'utf8');
    const title = content.split('\n')[0].replace(/^#\s+/, '');
    console.log(`   标题：${title}`);
    console.log(`   字数：${content.length}\n`);
    
    // Step 5: 转换 HTML
    console.log('Step 5: 转换 Markdown 为微信公众号 HTML...');
    const htmlContent = markdownToWechatHtml(content);
    console.log(`   ✅ HTML 长度：${htmlContent.length}\n`);
    
    // Step 6: 创建草稿
    console.log('Step 6: 创建草稿...');
    const draftMediaId = await createDraft(accessToken, {
      title: title,
      author: CONFIG.wechat.author,
      content: htmlContent,
      thumbMediaId: coverMediaId
    });
    
    console.log('✅ 草稿发布成功！\n');
    console.log('📊 发布结果:');
    console.log(`   草稿 ID: ${draftMediaId}`);
    console.log(`   封面图：${coverMediaId.substring(0, 30)}...`);
    console.log(`   封面来源：Unsplash（高质量科技图片）`);
    console.log('');
    console.log('💡 下一步:');
    console.log('   1. 登录微信公众号后台：https://mp.weixin.qq.com');
    console.log('   2. 进入"草稿箱"');
    console.log('   3. 找到文章并预览');
    console.log('   4. 确认无误后发布');
    console.log('');
    
    // 保存结果
    const resultPath = path.join('wechat-article-orchestrator', 'drafts', 'publish_result.json');
    fs.writeFileSync(resultPath, JSON.stringify({
      success: true,
      draftMediaId: draftMediaId,
      coverMediaId: coverMediaId,
      coverUrl: coverUrl,
      title: title,
      publishedAt: new Date().toISOString()
    }, null, 2));
    
    console.log(`📝 发布结果已保存：${resultPath}`);
    console.log('');
    console.log('🎉 发布完成！');
    
  } catch (error) {
    console.error('❌ 发布失败:', error.message);
    process.exit(1);
  }
}

async function getAccessToken() {
  return new Promise((resolve, reject) => {
    const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${CONFIG.wechat.appid}&secret=${CONFIG.wechat.secret}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.access_token) {
            resolve(result.access_token);
          } else {
            reject(new Error(`Token 获取失败：${result.errmsg}`));
          }
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
  });
}

async function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`下载失败：HTTP ${res.statusCode}`));
        return;
      }
      
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

async function uploadImage(accessToken, imageBuffer, filename) {
  return new Promise((resolve, reject) => {
    const boundary = '----WebKitFormBoundary' + Date.now().toString(36);
    
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\n`),
      Buffer.from(`Content-Disposition: form-data; name="media"; filename="${filename}"\r\n`),
      Buffer.from(`Content-Type: image/png\r\n\r\n`),
      imageBuffer,
      Buffer.from(`\r\n--${boundary}--\r\n`)
    ]);
    
    const url = `https://api.weixin.qq.com/cgi-bin/material/add_material?access_token=${accessToken}&type=image`;
    
    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result.media_id || null);
        } catch (error) {
          resolve(null);
        }
      });
    });
    
    req.on('error', () => resolve(null));
    req.write(body);
    req.end();
  });
}

async function createDraft(accessToken, article) {
  return new Promise((resolve, reject) => {
    const draftData = {
      articles: [{
        title: article.title,
        author: article.author,
        content: article.content,
        digest: article.content.substring(50, 150).replace(/[#*`_\[\]\(\)]/g, '').replace(/\s+/g, ' ').trim() + '...',
        thumb_media_id: article.thumbMediaId,
        show_cover_pic: 1,
        need_open_comment: 1,
        only_fans_can_comment: 0
      }]
    };
    
    const postData = JSON.stringify(draftData);
    
    const url = `https://api.weixin.qq.com/cgi-bin/draft/add?access_token=${accessToken}`;
    
    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.media_id) {
            resolve(result.media_id);
          } else {
            reject(new Error(`创建草稿失败：${result.errmsg}`));
          }
        } catch (error) {
          reject(error);
        }
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function markdownToWechatHtml(markdown) {
  let html = markdown
    .replace(/^# (.*$)/gim, '<section style="font-size: 20px; font-weight: bold; margin: 20px 0 10px; line-height: 1.4; color: #333;">$1</section>')
    .replace(/^## (.*$)/gim, '<section style="font-size: 18px; font-weight: bold; margin: 20px 0 10px; line-height: 1.4; color: #333; border-bottom: 2px solid #1890ff; padding-bottom: 8px;">$1</section>')
    .replace(/^### (.*$)/gim, '<section style="font-size: 16px; font-weight: bold; margin: 15px 0 8px; line-height: 1.4; color: #333;">$1</section>')
    .replace(/\*\*(.*)\*\*/gim, '<span style="font-weight: bold;">$1</span>')
    .replace(/\*(.*)\*/gim, '<span style="font-style: italic;">$1</span>')
    .replace(/\n/gim, '<br>')
    .replace(/^---$/gim, '<section style="border: none; border-top: 1px solid #eee; margin: 20px 0;"></section>')
    .replace(/^> (.*$)/gim, '<section style="background: #f6f8fa; border-left: 4px solid #1890ff; padding: 12px 16px; margin: 20px 0; color: #666;">$1</section>')
    .replace(/^\d+\. (.*$)/gim, '<section style="margin: 8px 0; padding-left: 20px;">$1</section>')
    .replace(/^\- (.*$)/gim, '<section style="margin: 8px 0; padding-left: 20px;">$1</section>');
  
  html = `<section style="font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', Arial, sans-serif; line-height: 1.8; color: #333; padding: 15px; font-size: 16px; word-wrap: break-word; word-break: break-all; background-color: #ffffff;">${html}</section>`;
  
  return html;
}

main().then(() => {
  console.log('\n✅ 完成！\n');
  process.exit(0);
}).catch((error) => {
  console.error('\n❌ 失败\n');
  process.exit(1);
});
