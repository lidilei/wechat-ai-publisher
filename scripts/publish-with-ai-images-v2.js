#!/usr/bin/env node

/**
 * 微信公众号 AI 配图发布脚本（增强版）
 * 
 * 功能：
 * 1. 智能分析文章内容，生成 4-10 张配图
 * 2. 使用豆包 AI 根据内容生成高质量配图
 * 3. 自动上传并插入到正文合适位置
 * 
 * 使用：
 *   node scripts/publish-with-ai-images-v2.js
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
  },
  // 配图配置
  images: {
    min: 4,   // 最少配图数
    max: 10,  // 最多配图数
    perWords: 300  // 每多少字配一张图
  }
};

console.log('🚀 微信公众号 AI 配图发布工具（增强版）\n');
console.log('📌 配图策略：根据内容智能生成 4-10 张配图\n');

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
    
    // Step 3: 智能分析文章结构，确定配图位置
    console.log('Step 3: 智能分析文章结构，规划配图位置...');
    const imagePlan = analyzeArticleStructureIntelligent(content);
    console.log(`   ✅ 规划生成 ${imagePlan.length} 张配图：`);
    imagePlan.forEach((plan, i) => {
      console.log(`   ${i + 1}. [${plan.type}] ${plan.position}`);
      console.log(`      描述：${plan.description.substring(0, 50)}...`);
    });
    console.log('');
    
    // Step 4: 使用豆包 AI 生成图片
    console.log('Step 4: 使用豆包 AI 生成配图并上传获取 URL...');
    const coverMediaId = await generateCoverImage(accessToken, title);
    console.log(`   ✅ 封面图生成成功，Media ID: ${coverMediaId.substring(0, 30)}...`);
    
    const imageUrls = [];
    for (let i = 0; i < imagePlan.length; i++) {
      const plan = imagePlan[i];
      console.log(`\n   生成配图 ${i + 1}/${imagePlan.length}...`);
      console.log(`   类型：${plan.type}`);
      console.log(`   位置：${plan.position}`);
      console.log(`   描述：${plan.description}`);
      
      try {
        const imageUrl = await generateAndUploadArticleImage(accessToken, plan.description, `image_${i + 1}.png`);
        imageUrls.push({
          position: plan.position,
          lineIndex: plan.lineIndex,
          url: imageUrl,
          description: plan.description,
          type: plan.type
        });
        console.log(`   ✅ 配图 ${i + 1} 生成并上传成功`);
        console.log(`   URL: ${imageUrl.substring(0, 60)}...`);
      } catch (error) {
        console.log(`   ⚠️ 配图 ${i + 1} 生成失败：${error.message}`);
        // 继续生成下一张
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
    console.log(`   配图数量：${imageUrls.length} 张`);
    console.log(`   文章字数：${content.length}`);
    console.log(`   图文比例：约 ${Math.floor(content.length / imageUrls.length)} 字/图`);
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
 * 智能分析文章结构，确定配图位置（增强版）
 * 策略：
 * 1. 每个二级标题后配一张图
 * 2. 重要概念/工具单独配图
 * 3. 代码块前后配图
 * 4. 列表/对比处配图
 * 5. 保证 4-10 张图
 */
function analyzeArticleStructureIntelligent(content) {
  const lines = content.split('\n');
  const imagePlan = [];
  const usedPositions = new Set();
  
  // 关键词映射到配图描述
  const keywordPrompts = {
    // 工具类
    'GitHub': 'GitHub 标志性的章鱼猫吉祥物，深蓝色背景，科技感，简洁扁平设计，中文标注 GitHub',
    'Notion': 'Notion 应用界面，展示数据库和页面，紫色品牌色，简洁现代风格，中文标注',
    'Obsidian': '黑曜石晶体，深色背景，知识网络连接图，紫色光芒，科技感',
    'Summarize': '文档摘要过程，从长文章到简洁要点，蓝色科技风格，流程图',
    'ClawHub': '龙虾吉祥物，技能市场界面，橙色和蓝色搭配，扁平插画风格',
    'Tavily': 'AI 搜索引擎，放大镜图标，科技感蓝色背景，搜索结果展示',
    'Weather': '天气预报界面，太阳云朵图标，温馨生活场景，暖色调',
    'Feishu': '飞书应用界面，协作办公场景，蓝色品牌色，现代化设计',
    
    // 概念类
    '开发者': '程序员工作场景，多台显示器，代码编辑器，科技感蓝色调',
    '信息管理': '知识管理概念，文件夹和标签，信息分类，扁平插画',
    '效率工具': '工作效率场景，时钟和任务列表，多个应用图标环绕',
    '生活助手': '智能生活场景，手机 APP 界面，天气日历提醒',
    'AI 助手': '人工智能机器人，对话界面，科技感蓝色背景',
    '自动化': '自动化流程图，齿轮和箭头，科技蓝紫色调',
    '开源': '开源社区概念，GitHub 图标，协作开发，扁平设计',
    
    // 场景类
    '前言': '文章开篇，简洁科技背景，OpenClaw 主题，蓝色调',
    '总结': '总结回顾，清单和对勾，完成感，暖色调',
    '安装': '安装配置界面，终端窗口，代码命令，深色主题',
    '配置': '配置文件编辑，设置界面，参数调整，科技感'
  };
  
  // 第一遍：收集所有二级标题
  let lineIndex = 0;
  const sections = [];
  
  for (const line of lines) {
    lineIndex++;
    
    if (line.startsWith('## ')) {
      const sectionTitle = line.replace(/^##\s+/, '').trim();
      sections.push({
        title: sectionTitle,
        lineIndex: lineIndex,
        type: 'section'
      });
    }
  }
  
  // 第二遍：为每个章节生成配图计划
  for (const section of sections) {
    if (usedPositions.has(section.title)) continue;
    
    let prompt = generateSmartPrompt(section.title, keywordPrompts);
    
    imagePlan.push({
      position: section.title,
      lineIndex: section.lineIndex,
      description: prompt,
      type: '章节配图'
    });
    usedPositions.add(section.title);
  }
  
  // 第三遍：检查是否需要补充配图（如果少于 4 张）
  if (imagePlan.length < CONFIG.images.min) {
    // 为重要段落补充配图
    const extraPositions = findExtraImagePositions(content, lines, keywordPrompts, usedPositions);
    imagePlan.push(...extraPositions);
  }
  
  // 第四遍：如果还是太多，智能筛选
  if (imagePlan.length > CONFIG.images.max) {
    // 优先保留章节配图，去除补充的配图
    imagePlan.sort((a, b) => {
      if (a.type === '章节配图' && b.type !== '章节配图') return -1;
      if (a.type !== '章节配图' && b.type === '章节配图') return 1;
      return a.lineIndex - b.lineIndex;
    });
    imagePlan.splice(CONFIG.images.max);
  }
  
  // 按行号排序
  imagePlan.sort((a, b) => a.lineIndex - b.lineIndex);
  
  return imagePlan;
}

/**
 * 智能生成配图描述
 */
function generateSmartPrompt(title, keywordPrompts) {
  // 精确匹配
  for (const [key, prompt] of Object.entries(keywordPrompts)) {
    if (title === key) {
      return prompt;
    }
  }
  
  // 包含匹配
  for (const [key, prompt] of Object.entries(keywordPrompts)) {
    if (title.includes(key)) {
      return prompt;
    }
  }
  
  // 根据标题类型生成
  if (title.includes('前言') || title.includes('引言') || title.includes('概述')) {
    return '文章开篇，简洁科技背景，主题相关，蓝色调，扁平设计';
  }
  
  if (title.includes('总结') || title.includes('结语') || title.includes('结尾')) {
    return '总结回顾，清单和对勾，完成感，暖色调，扁平插画';
  }
  
  if (title.includes('安装') || title.includes('配置') || title.includes('设置')) {
    return '安装配置界面，终端窗口，代码命令，深色主题，科技感';
  }
  
  if (title.includes('使用') || title.includes('教程') || title.includes('指南')) {
    return '使用教程，步骤说明，图标和箭头，清晰指引，扁平设计';
  }
  
  if (title.includes('对比') || title.includes('比较')) {
    return '对比分析，左右分栏，优缺点列表，图表展示，商务风格';
  }
  
  if (title.includes('技巧') || title.includes('最佳实践')) {
    return '技巧提示，灯泡图标，知识分享，温馨色调，扁平插画';
  }
  
  // 默认：根据标题内容生成
  return `科技风格插图，${title}，AI 人工智能，蓝色调，简洁现代，中文标注`;
}

/**
 * 查找额外的配图位置
 */
function findExtraImagePositions(content, lines, keywordPrompts, usedPositions) {
  const extraPositions = [];
  
  // 查找包含关键词的段落
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // 跳过标题行
    if (line.startsWith('#')) continue;
    
    // 检查是否包含关键词
    for (const [key, prompt] of Object.entries(keywordPrompts)) {
      if (line.includes(key) && !usedPositions.has(`extra_${i}_${key}`)) {
        extraPositions.push({
          position: `段落：${line.substring(0, 30)}...`,
          lineIndex: i,
          description: prompt,
          type: '关键词配图'
        });
        usedPositions.add(`extra_${i}_${key}`);
        
        // 找到 2-3 个就停止
        if (extraPositions.length >= 3) {
          return extraPositions;
        }
        break;
      }
    }
  }
  
  return extraPositions;
}

/**
 * 生成封面图
 */
async function generateCoverImage(accessToken, articleTitle) {
  const tempImagePath = '/tmp/cover_' + Date.now() + '.png';
  
  try {
    const prompt = `${articleTitle.substring(0, 20)}，科技感蓝色背景，简洁现代风格，中文标注，扁平设计`;
    
    // 调用豆包 Seedream API
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
    // 调用豆包 Seedream API
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
  const lines = markdown.split('\n');
  const resultLines = [];
  let imageIndex = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    resultLines.push(line);
    
    // 检查是否是二级标题，并且有对应的配图
    if (line.startsWith('## ')) {
      const sectionTitle = line.replace(/^##\s+/, '').trim();
      const matchingImage = imageUrls.find(img => img.position.includes(sectionTitle) || sectionTitle.includes(img.position.split(':')[0]));
      
      if (matchingImage && imageIndex < imageUrls.length) {
        const imageHtml = `
<!-- IMAGE_START -->
<div style="text-align: center; margin: 35px 0;">
  <img src="${matchingImage.url}" style="max-width: 100%; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);" />
  <p style="font-size: 13px; color: #888; margin-top: 12px; font-style: italic;">图 ${imageIndex + 1}：${matchingImage.description.substring(0, 35)}...</p>
</div>
<!-- IMAGE_END -->
`;
        resultLines.push(imageHtml);
        imageIndex++;
      }
    }
  }
  
  let html = resultLines.join('\n');
  html = basicMarkdownToHtml(html);
  
  // 清理
  html = html.replace(/\n{3,}/g, '\n\n');
  html = html.replace(/>\s+</g, '><');
  html = html.replace(/>\s{2,}</g, '>');
  html = html.replace(/<!-- IMAGE_START -->/g, '');
  html = html.replace(/<!-- IMAGE_END -->/g, '');
  
  return html;
}

/**
 * 基础 Markdown 转 HTML
 */
function basicMarkdownToHtml(markdown) {
  let html = markdown;
  
  html = html.replace(/^# (.*$)/gim, '<h1 style="font-size: 20px; font-weight: bold; color: #333; margin: 25px 0 15px; border-bottom: 2px solid #07c160; padding-bottom: 10px;">$1</h1>');
  html = html.replace(/^## (.*$)/gim, '<h2 style="font-size: 18px; font-weight: bold; color: #07c160; margin: 22px 0 12px;">$1</h2>');
  html = html.replace(/^### (.*$)/gim, '<h3 style="font-size: 16px; font-weight: bold; color: #333; margin: 18px 0 10px;">$1</h3>');
  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong style="font-weight: bold;">$1</strong>');
  html = html.replace(/\*(.*?)\*/gim, '<em style="font-style: italic;">$1</em>');
  
  html = html.replace(/```(\w*)\n([\s\S]*?)```/gim, (match, lang, code) => {
    return `<div style="background: #f6f8fa; border-radius: 6px; padding: 16px; margin: 15px 0; overflow-x: auto; font-family: Consolas, Monaco, monospace; font-size: 13px; line-height: 1.5;">
      <div style="color: #999; font-size: 12px; margin-bottom: 8px;">${lang || 'code'}</div>
      <pre style="margin: 0;"><code style="color: #24292e;">${escapeHtml(code.trim())}</code></pre>
    </div>`;
  });
  
  html = html.replace(/`([^`]+)`/gim, '<code style="background: #f6f8fa; padding: 2px 6px; border-radius: 3px; font-family: Consolas, Monaco, monospace; font-size: 13px; color: #e96900;">$1</code>');
  html = html.replace(/^> (.*$)/gim, '<blockquote style="border-left: 4px solid #07c160; padding: 12px 16px; margin: 15px 0; background: #f6f8fa; color: #666; border-radius: 0 6px 6px 0;">$1</blockquote>');
  html = html.replace(/^\- (.*$)/gim, '<li style="margin: 8px 0; padding-left: 8px;">$1</li>');
  html = html.replace(/^\* (.*$)/gim, '<li style="margin: 8px 0; padding-left: 8px;">$1</li>');
  html = html.replace(/(<li style="margin: 8px 0; padding-left: 8px;">.*<\/li>)/gis, '<ul style="padding-left: 20px; margin: 15px 0;">$1</ul>');
  html = html.replace(/<\/ul>\n<ul/gim, '</ul><ul');
  html = html.replace(/\n\n/gim, '</p><p style="margin: 15px 0; line-height: 2; color: #333; font-size: 15px;">');
  html = html.replace(/^---$/gim, '<hr style="border: none; border-top: 1px solid #eaecef; margin: 25px 0;">');
  
  html = `<section style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 2; color: #333; padding: 15px; max-width: 677px; margin: 0 auto;">
    <p style="margin: 15px 0; line-height: 2; color: #333; font-size: 15px;">${html}</p>
  </section>`;
  
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
  
  return html;
}

function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

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

main();
