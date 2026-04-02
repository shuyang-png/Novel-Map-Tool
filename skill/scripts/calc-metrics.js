#!/usr/bin/env node
/**
 * 计算 geoMarkers 的面积/长度，自动填充 metrics 和 geoWidthDesc。
 * 
 * 用法：
 *   node calc-metrics.js <地图.json>          # 输出结果到 stdout
 *   node calc-metrics.js <地图.json> -w       # 直接写回文件
 * 
 * Agent 调用示例：
 *   node skill/scripts/calc-metrics.js 地图.json -w
 */

const fs = require('fs');
const path = require('path');

// 欧氏距离
function dist(a, b) {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}

// 折线总长度
function polylineLength(points) {
  if (!points || points.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += dist(points[i - 1], points[i]);
  }
  return Math.round(total);
}

// 矩形面积
function rectArea(w, h) {
  return w * h;
}

// 椭圆面积
function ellipseArea(rx, ry) {
  return Math.round(Math.PI * rx * ry);
}

// 多边形面积（鞋带公式）
function polygonArea(points) {
  if (!points || points.length < 3) return 0;
  let area = 0;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    area += points[j].x * points[i].y;
    area -= points[i].x * points[j].y;
  }
  return Math.round(Math.abs(area / 2));
}

// 格式化数字（万）
function formatNum(n) {
  if (n >= 10000) return `约${Math.round(n / 1000) / 10}万`;
  return `约${n}`;
}

function processMarker(geo, unitName) {
  const metrics = {};
  let changed = false;

  // 计算长度（polyline）
  if (geo.type === 'polyline' && geo.points && geo.points.length >= 2) {
    const len = polylineLength(geo.points);
    if (len > 0) {
      metrics.length = len;
      metrics.lengthDesc = `${formatNum(len)}${unitName}`;
      changed = true;
    }
  }

  // 计算面积
  if (geo.type === 'rect') {
    const area = rectArea(geo.width || 0, geo.height || 0);
    if (area > 0) {
      metrics.area = area;
      metrics.areaDesc = `${formatNum(area)}平方${unitName}`;
      changed = true;
    }
  } else if (geo.type === 'ellipse') {
    const area = ellipseArea(geo.rx || 0, geo.ry || 0);
    if (area > 0) {
      metrics.area = area;
      metrics.areaDesc = `${formatNum(area)}平方${unitName}`;
      changed = true;
    }
  } else if (geo.type === 'polygon' && geo.points && geo.points.length >= 3) {
    const area = polygonArea(geo.points);
    if (area > 0) {
      metrics.area = area;
      metrics.areaDesc = `${formatNum(area)}平方${unitName}`;
      changed = true;
    }
  }

  if (changed) {
    geo.metrics = metrics;
  }
  return changed;
}

// === 主流程 ===

const args = process.argv.slice(2);
const writeBack = args.includes('-w');
const filePath = args.find(a => !a.startsWith('-'));

if (!filePath) {
  console.error('用法: node calc-metrics.js <地图.json> [-w]');
  process.exit(1);
}

const fullPath = path.resolve(filePath);
let data;
try {
  data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
} catch (e) {
  console.error(`读取失败: ${e.message}`);
  process.exit(1);
}

const unitName = data.unit?.name || '里';
let updated = 0;

for (const geo of (data.geoMarkers || [])) {
  if (processMarker(geo, unitName)) updated++;
}

// 同时为 notes 添加 metrics（仅位置，无面积/长度）
// notes 不需要 metrics

console.log(`处理完成：${updated}/${data.geoMarkers?.length || 0} 个地理标识已计算 metrics（单位：${unitName}）`);

if (writeBack) {
  fs.writeFileSync(fullPath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`已写回：${fullPath}`);
} else {
  // 输出所有 geoMarkers 的 metrics
  for (const geo of (data.geoMarkers || [])) {
    const m = geo.metrics || {};
    const parts = [];
    if (m.length != null) parts.push(`长度=${m.length}${unitName}(${m.lengthDesc})`);
    if (m.area != null) parts.push(`面积=${m.area}平方${unitName}(${m.areaDesc})`);
    if (parts.length) {
      console.log(`  ${geo.name} [${geo.type}]: ${parts.join(', ')}`);
    }
  }
}
