#!/usr/bin/env node

// 构建后复制静态资源到 dist 目录
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const distDir = path.join(__dirname, 'dist');
const imgSource = path.join(__dirname, 'img');
const musicSource = path.join(__dirname, 'music');

// 复制 img 目录
if (fs.existsSync(imgSource)) {
  const imgDest = path.join(distDir, 'img');
  if (!fs.existsSync(imgDest)) {
    fs.mkdirSync(imgDest, { recursive: true });
  }
  execSync(`cp -r "${imgSource}"/* "${imgDest}/"`, { stdio: 'inherit' });
  console.log('✅ 已复制 img 目录');
} else {
  console.warn('⚠️  img 目录不存在，跳过复制');
}

// 复制 music 目录
if (fs.existsSync(musicSource)) {
  const musicDest = path.join(distDir, 'music');
  if (!fs.existsSync(musicDest)) {
    fs.mkdirSync(musicDest, { recursive: true });
  }
  execSync(`cp -r "${musicSource}"/* "${musicDest}/"`, { stdio: 'inherit' });
  console.log('✅ 已复制 music 目录');
} else {
  console.warn('⚠️  music 目录不存在，跳过复制');
}

console.log('✅ 静态资源复制完成');

