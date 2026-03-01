#!/usr/bin/env node

/**
 * 微信公众号 AI 配图发布脚本（最终修复版）
 * 
 * 功能：
 * 1. 使用豆包 AI 根据文章内容生成封面图和配图
 * 2. 正确上传图片获取 URL（用于正文插入）
 * 3. 智能插入配图中，修复排版问题
 * 
 * 使用：
 *   node wechat-publisher/publish-with-ai-images-fixed.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 配置 - 从环境变量或配置文件加载
const CONFIG = {
  wechat: {
    appid: process.env.WECHAT_APPID || 'YOUR_WECHAT_APPID',
    secret: process.env.WECHAT_SECRET || 'YOUR_WECHAT_SECRET',
    author: process.env.WECHAT_AUTHOR || '你的作者名'
  },
  doubao: {
    apiKey: process.env.DOUBAO_API_KEY || 'YOUR_DOUBAO_API_KEY',
    model: process.env.DOUBAO_ENDPOINT || 'ep-YOUR_ENDPOINT_ID',
    baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
    size: '2048x2048'
  }
};

console.log('🚀 微信公众号 AI 配图发布工具（最终修复版）\n');

async function main() {
  try {
    // Step 1: 获取 access_token
    console.log('Step 1: 获取微信公众号 access_token...');
    const accessToken = getAccessToken();
    console.log('✅ Token 获取成功\n');
    
    // Step 2: 读取文章
    console.log('Step 2: 读取文章内容...');
    const articlePath = path.join('articles', 'openclaw-must-have-skills.md');
    
    if (!fs.existsSync(articlePath)) {
      throw new Error(`文章文件不存在：${articlePath}`);
    }
    
    const content = fs.readFileSync(articlePath, 'utf8');
    const lines = content.split('\n');
    const title = lines[0].replace(/^#\s+/, '').trim();
    const digest = 'OpenClaw 必装 Skills 完全指南，涵盖开发者工具、信息管理、效率办公、生活助手等场景。';
    
    console.log(`   标题：${title}`);
    console.log(`   字数：${content.length}\n`);
    
    // Step 3: 分析文章结构，确定配图位置
    console.log('Step 3: 分析文章结构，规划配图位置...');
    const imagePlan = analyzeArticleStructure(content);
    console.log(`   计划生成 ${imagePlan.length} 张配图：`);
    imagePlan.forEach((plan, i) => {
      console.log(`   ${i + 1}. ${plan.position} - ${plan.description}`);
    });
    console.log('');
    
    // Step 4: 使用豆包 AI 生成图片并获取 URL
    console.log('Step 4: 使用豆包 AI 生成配图并上传获取 URL...');
    const imageUrls = [];
    const coverMediaId = await generateCoverImage(accessToken);
    console.log(`   ✅ 封面图生成成功，Media ID: ${coverMediaId.substring(0, 30)}...`);
    
    for (let i = 0; i < imagePlan.length; i++) {
      const plan = imagePlan[i];
      console.log(`\n   生成配图 ${i + 1}/${imagePlan.length}...`);
      console.log(`   位置：${plan.position}`);
      console.log(`   描述：${plan.description}`);
      
      try {
        const imageUrl = await generateAndUploadArticleImage(accessToken, plan.description, `image_${i + 1}.png`);
        imageUrls.push({
          position: plan.position,
          url: imageUrl,
          description: plan.description
        });
        console.log(`   ✅ 配图 ${i + 1} 生成并上传成功`);
        console.log(`   URL: ${imageUrl.substring(0, 50)}...`);
      } catch (error) {
        console.log(`   ⚠️ 配图 ${i + 1} 生成失败：${error.message}`);
      }
    }
    console.log('');
    
    // Step 5: 转换 HTML（插入配图）
    console.log('Step 5: 转换 Markdown 为微信公众号 HTML（插入配图）...');
    const htmlContent = markdownToWechatHtmlWithImages(content, imageUrls);
    console.log(`   ✅ HTML 长度：${htmlContent.length}\n`);
    
    // Step 6: 创建草稿
    console.log('Step 6: 创建草稿...');
    const draftMediaId = createDraft(accessToken, {
      title: title,
      author: CONFIG.wechat.author,
      digest: digest,
      content: htmlContent,
      thumbMediaId: coverMediaId
    });
    
    console.log('\n✅ 草稿发布成功！\n');
    console.log('📊 发布结果:');
    console.log(`   标题：${title}`);
    console.log(`   草稿 ID: ${draftMediaId}`);
    console.log(`   配图数量：${imageUrls.length}`);
    console.log('');
    console.log('💡 下一步:');
    console.log('   1. 登录微信公众号后台：https://mp.weixin.qq.com');
    console.log('   2. 进入"草稿箱"');
    console.log('   3. 找到文章并预览');
    console.log('   4. 确认无误后发布');
    console.log('');
    
  } catch (error) {
    console.error('❌ 发布失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

/**
 * 分析文章结构，确定配图位置
 */
function analyzeArticleStructure(content) {
  const lines = content.split('\n');
  const imagePlan = [];
  
  // 寻找合适的配图位置（通常在章节标题后）
  let lineIndex = 0;
  
  for (const line of lines) {
    lineIndex++;
    
    // 检测二级标题（##）
    if (line.startsWith('## ')) {
      const sectionTitle = line.replace(/^##\s+/, '').trim();
      
      // 为重要章节规划配图
      if (sectionTitle.includes('GitHub') || 
          sectionTitle.includes('Notion') || 
          sectionTitle.includes('Obsidian') ||
          sectionTitle.includes('Summarize') ||
          sectionTitle.includes('ClawHub') ||
          sectionTitle.includes('效率工具') ||
          sectionTitle.includes('生活助手')) {
        
        imagePlan.push({
          position: sectionTitle,
          lineIndex: lineIndex,
          description: generateImagePrompt(sectionTitle)
        });
      }
    }
  }
  
  // 限制最多 5 张配图
  return imagePlan.slice(0, 5);
}

/**
 * 根据章节内容生成图片描述
 */
function generateImagePrompt(sectionTitle) {
  const prompts = {
    'GitHub': 'GitHub 标志性的章鱼猫吉祥物，深蓝色背景，科技感，简洁扁平设计，中文标注 GitHub',
    'Notion': 'Notion 应用界面，展示数据库和页面，紫色品牌色，简洁现代风格，中文标注',
    'Obsidian': '黑曜石晶体，深色背景，知识网络连接图，紫色光芒，科技感',
    'Summarize': '文档摘要过程，从长文章到简洁要点，蓝色科技风格，流程图',
    'ClawHub': '龙虾吉祥物，技能市场界面，橙色和蓝色搭配，扁平插画风格',
    '效率工具': '工作效率场景，多个应用图标环绕，时间管理，扁平插画',
    '生活助手': '天气预报图标，太阳云朵，温馨生活场景，暖色调插画'
  };
  
  // 查找匹配的 prompt
  for (const [key, prompt] of Object.entries(prompts)) {
    if (sectionTitle.includes(key)) {
      return prompt;
    }
  }
  
  // 默认 prompt
  return '科技风格插图，AI 人工智能，蓝色调，简洁现代，中文标注';
}

/**
 * 生成封面图
 */
async function generateCoverImage(accessToken) {
  const tempImagePath = '/tmp/cover_' + Date.now() + '.png';
  
  try {
    const prompt = 'OpenClaw 龙虾吉祥物，AI 助手，科技感蓝色背景，简洁现代风格，中文标注 OpenClaw';
    
    // 调用豆包 Seedream API（使用端点 ID）
    const curlCmd = `curl -s -X POST "${CONFIG.doubao.baseURL}/images/generations" \\
      -H "Authorization: Bearer ${CONFIG.doubao.apiKey}" \\
      -H "Content-Type: application/json" \\
      -d '{
        "model": "${CONFIG.doubao.model}",
        "prompt": "${prompt}",
        "n": 1,
        "size": "${CONFIG.doubao.size}"
      }' > /tmp/doubao_cover.json`;
    
    console.log('   调用豆包 API 生成封面图...');
    execSync(curlCmd, { timeout: 90000 });
    const response = JSON.parse(fs.readFileSync('/tmp/doubao_cover.json', 'utf8'));
    
    if (response.data && response.data[0] && response.data[0].url) {
      const imageUrl = response.data[0].url;
      console.log(`   ✅ 豆包生成成功，下载图片...`);
      execSync(`curl -s -L "${imageUrl}" -o "${tempImagePath}"`);
      
      // 上传到微信获取 media_id
      const mediaId = uploadImageForCover(accessToken, tempImagePath);
      cleanupFiles([tempImagePath, '/tmp/doubao_cover.json']);
      return mediaId;
    } else {
      throw new Error('豆包 API 返回格式异常：' + JSON.stringify(response));
    }
    
  } catch (error) {
    console.log(`   ❌ 封面图生成失败：${error.message}`);
    cleanupFiles([tempImagePath, '/tmp/doubao_cover.json']);
    throw error;
  }
}

/**
 * 生成文章配图并获取 URL
 */
async function generateAndUploadArticleImage(accessToken, description, filename) {
  const tempImagePath = '/tmp/article_' + Date.now() + '.png';
  
  try {
    // 调用豆包 Seedream API（使用端点 ID）
    const curlCmd = `curl -s -X POST "${CONFIG.doubao.baseURL}/images/generations" \\
      -H "Authorization: Bearer ${CONFIG.doubao.apiKey}" \\
      -H "Content-Type: application/json" \\
      -d '{
        "model": "${CONFIG.doubao.model}",
        "prompt": "${description}",
        "n": 1,
        "size": "${CONFIG.doubao.size}"
      }' > /tmp/doubao_article.json`;
    
    console.log('   调用豆包 API 生成配图...');
    execSync(curlCmd, { timeout: 90000 });
    const response = JSON.parse(fs.readFileSync('/tmp/doubao_article.json', 'utf8'));
    
    if (response.data && response.data[0] && response.data[0].url) {
      const imageUrl = response.data[0].url;
      console.log(`   ✅ 豆包生成成功，下载图片...`);
      execSync(`curl -s -L "${imageUrl}" -o "${tempImagePath}"`);
      
      // 上传到微信获取 URL（使用 uploadimg 接口）
      const imgUrl = uploadImageForArticle(accessToken, tempImagePath);
      cleanupFiles([tempImagePath, '/tmp/doubao_article.json']);
      return imgUrl;
    } else {
      throw new Error('豆包 API 返回格式异常：' + JSON.stringify(response));
    }
    
  } catch (error) {
    console.log(`   ❌ 配图生成失败：${error.message}`);
    cleanupFiles([tempImagePath, '/tmp/doubao_article.json']);
    throw error;
  }
}

/**
 * 上传封面图（使用 add_material 接口，返回 media_id）
 */
function uploadImageForCover(accessToken, imagePath) {
  const cmd = `curl -s -F "media=@${imagePath}" "https://api.weixin.qq.com/cgi-bin/material/add_material?access_token=${accessToken}&type=image"`;
  const response = execSync(cmd, { encoding: 'utf8' });
  const result = JSON.parse(response);
  
  if (!result.media_id) {
    throw new Error(`封面图上传失败：${JSON.stringify(result)}`);
  }
  
  return result.media_id;
}

/**
 * 上传文章配图（使用 uploadimg 接口，返回 URL）
 */
function uploadImageForArticle(accessToken, imagePath) {
  const cmd = `curl -s -F "media=@${imagePath}" "https://api.weixin.qq.com/cgi-bin/media/uploadimg?access_token=${accessToken}"`;
  const response = execSync(cmd, { encoding: 'utf8' });
  const result = JSON.parse(response);
  
  if (!result.url) {
    throw new Error(`配图上传失败：${JSON.stringify(result)}`);
  }
  
  return result.url;
}

/**
 * 清理临时文件
 */
function cleanupFiles(files) {
  files.forEach(file => {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
  });
}

/**
 * 获取 access_token（同步版本）
 */
function getAccessToken() {
  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${CONFIG.wechat.appid}&secret=${CONFIG.wechat.secret}`;
  const response = execSync(`curl -s "${url}"`, { encoding: 'utf8' });
  const result = JSON.parse(response);
  
  if (!result.access_token) {
    throw new Error(`获取 token 失败：${result.errmsg}`);
  }
  
  return result.access_token;
}

/**
 * Markdown 转微信公众号 HTML（带配图）
 */
function markdownToWechatHtmlWithImages(markdown, imageUrls) {
  // 1. 先按行分割，保留原始结构
  const lines = markdown.split('\n');
  const resultLines = [];
  let imageIndex = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    resultLines.push(line);
    
    // 检查是否是二级标题，并且有对应的配图
    if (line.startsWith('## ')) {
      const sectionTitle = line.replace(/^##\s+/, '').trim();
      
      // 查找是否有匹配的图片
      const matchingImage = imageUrls.find(img => img.position === sectionTitle);
      
      if (matchingImage && imageIndex < imageUrls.length) {
        // 在标题后插入图片
        const imageHtml = `
<!-- IMAGE_START -->
<div style="text-align: center; margin: 30px 0;">
  <img src="${matchingImage.url}" style="max-width: 100%; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />
  <p style="font-size: 12px; color: #999; margin-top: 10px;">图 ${imageIndex + 1}：${matchingImage.description.substring(0, 30)}...</p>
</div>
<!-- IMAGE_END -->
`;
        resultLines.push(imageHtml);
        imageIndex++;
      }
    }
  }
  
  // 2. 转换为 HTML
  let html = resultLines.join('\n');
  html = basicMarkdownToHtml(html);
  
  // 3. 清理多余的空行和空格
  html = html.replace(/\n{3,}/g, '\n\n');
  html = html.replace(/>\s+</g, '><');
  html = html.replace(/>\s{2,}</g, '>');
  
  return html;
}

/**
 * 基础 Markdown 转 HTML
 */
function basicMarkdownToHtml(markdown) {
  let html = markdown;
  
  // 标题
  html = html.replace(/^# (.*$)/gim, '<h1 style="font-size: 20px; font-weight: bold; color: #333; margin: 25px 0 15px; border-bottom: 2px solid #07c160; padding-bottom: 10px;">$1</h1>');
  html = html.replace(/^## (.*$)/gim, '<h2 style="font-size: 18px; font-weight: bold; color: #07c160; margin: 22px 0 12px;">$1</h2>');
  html = html.replace(/^### (.*$)/gim, '<h3 style="font-size: 16px; font-weight: bold; color: #333; margin: 18px 0 10px;">$1</h3>');
  
  // 粗体
  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong style="font-weight: bold;">$1</strong>');
  
  // 斜体
  html = html.replace(/\*(.*?)\*/gim, '<em style="font-style: italic;">$1</em>');
  
  // 代码块
  html = html.replace(/```(\w*)\n([\s\S]*?)```/gim, (match, lang, code) => {
    return `<div style="background: #f6f8fa; border-radius: 6px; padding: 16px; margin: 15px 0; overflow-x: auto; font-family: Consolas, Monaco, monospace; font-size: 13px; line-height: 1.5;">
      <div style="color: #999; font-size: 12px; margin-bottom: 8px;">${lang || 'code'}</div>
      <pre style="margin: 0;"><code style="color: #24292e;">${escapeHtml(code.trim())}</code></pre>
    </div>`;
  });
  
  // 行内代码
  html = html.replace(/`([^`]+)`/gim, '<code style="background: #f6f8fa; padding: 2px 6px; border-radius: 3px; font-family: Consolas, Monaco, monospace; font-size: 13px; color: #e96900;">$1</code>');
  
  // 引用
  html = html.replace(/^> (.*$)/gim, '<blockquote style="border-left: 4px solid #07c160; padding: 12px 16px; margin: 15px 0; background: #f6f8fa; color: #666; border-radius: 0 6px 6px 0;">$1</blockquote>');
  
  // 列表
  html = html.replace(/^\- (.*$)/gim, '<li style="margin: 8px 0; padding-left: 8px;">$1</li>');
  html = html.replace(/^\* (.*$)/gim, '<li style="margin: 8px 0; padding-left: 8px;">$1</li>');
  
  // 包裹列表
  html = html.replace(/(<li style="margin: 8px 0; padding-left: 8px;">.*<\/li>)/gis, '<ul style="padding-left: 20px; margin: 15px 0;">$1</ul>');
  html = html.replace(/<\/ul>\n<ul/gim, '</ul><ul');
  
  // 段落
  html = html.replace(/\n\n/gim, '</p><p style="margin: 15px 0; line-height: 2; color: #333; font-size: 15px;">');
  
  // 分割线
  html = html.replace(/^---$/gim, '<hr style="border: none; border-top: 1px solid #eaecef; margin: 25px 0;">');
  
  // 包裹在 section 中
  html = `<section style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 2; color: #333; padding: 15px; max-width: 677px; margin: 0 auto;">
    <p style="margin: 15px 0; line-height: 2; color: #333; font-size: 15px;">${html}</p>
  </section>`;
  
  // 清理多余的标签
  html = html.replace(/<p style="margin: 15px 0; line-height: 2; color: #333; font-size: 15px;"><\/p>/gim, '');
  html = html.replace(/<p style="margin: 15px 0; line-height: 2; color: #333; font-size: 15px;"><h/gim, '<h');
  html = html.replace(/<\/h><\/p>/gim, '</h>');
  html = html.replace(/<p style="margin: 15px 0; line-height: 2; color: #333; font-size: 15px;"><ul/gim, '<ul');
  html = html.replace(/<\/ul><\/p>/gim, '</ul>');
  html = html.replace(/<p style="margin: 15px 0; line-height: 2; color: #333; font-size: 15px;"><blockquote/gim, '<blockquote');
  html = html.replace(/<\/blockquote><\/p>/gim, '</blockquote>');
  html = html.replace(/<p style="margin: 15px 0; line-height: 2; color: #333; font-size: 15px;"><div/gim, '<div');
  html = html.replace(/<\/div><\/p>/gim, '</div>');
  html = html.replace(/<p style="margin: 15px 0; line-height: 2; color: #333; font-size: 15px;"><hr/gim, '<hr');
  html = html.replace(/\/><\/p>/gim, '/>');
  
  // 清理图片标记
  html = html.replace(/<!-- IMAGE_START -->/g, '');
  html = html.replace(/<!-- IMAGE_END -->/g, '');
  
  return html;
}

/**
 * HTML 转义
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * 创建草稿（同步版本）
 */
function createDraft(accessToken, article) {
  const draftData = {
    articles: [{
      title: article.title,
      author: article.author,
      digest: article.digest || '',
      content: article.content,
      thumb_media_id: article.thumbMediaId,
      need_open_comment: 1,
      only_fans_can_comment: 0
    }]
  };
  
  const tempJsonPath = '/tmp/wechat_draft_' + Date.now() + '.json';
  fs.writeFileSync(tempJsonPath, JSON.stringify(draftData, null, 2));
  
  try {
    const cmd = `curl -s -X POST "https://api.weixin.qq.com/cgi-bin/draft/add?access_token=${accessToken}" -H "Content-Type: application/json; charset=utf-8" -d @${tempJsonPath}`;
    const response = execSync(cmd, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
    const result = JSON.parse(response);
    
    fs.unlinkSync(tempJsonPath);
    
    if (!result.media_id) {
      throw new Error(`创建草稿失败：${JSON.stringify(result)}`);
    }
    
    return result.media_id;
  } catch (error) {
    if (fs.existsSync(tempJsonPath)) fs.unlinkSync(tempJsonPath);
    throw error;
  }
}

// 运行
main();
