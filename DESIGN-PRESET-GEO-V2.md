# 预设类型系统 V2 — 设计方案

> **目标**：合并「范围标识」和「地理标识」为统一入口；用「基础形状 + 内部几何符号」两层机制实现丰富的视觉区分度，兼顾 AI 识别和作者绘制便捷性。

---

## 一、rangeMarkers 与 geoMarkers 合并

### 现状问题

| 模块 | 支持图形 | 问题 |
|------|---------|------|
| 范围标识 (rangeMarkers) | rect（四顶点）、circle | 红色实线无样式，与地理标识功能重合 |
| 地理标识 (geoMarkers) | polyline、polygon、circle、pin | 需手动填顶点+颜色，操作繁琐 |

### 合并方案

**统一到 `geoMarkers`**，`rangeMarkers` 降级为兼容字段。升级为一次性操作，无用户可回退需求（项目未上线）。

```javascript
function migrateGeoData(data) {
    let geoMarkers = data.geoMarkers || [];
    const rangeMarkers = data.rangeMarkers || [];

    // 第一步：迁移 rangeMarkers → geoMarkers
    for (const m of rangeMarkers) {
        if (m.type === 'rect') {
            const ps = m.params;
            const xs = [ps.x1, ps.x2, ps.x3, ps.x4];
            const ys = [ps.y1, ps.y2, ps.y3, ps.y4];
            const minX = Math.min(...xs), maxX = Math.max(...xs);
            const minY = Math.min(...ys), maxY = Math.max(...ys);
            geoMarkers.push({
                id: m.id.replace('marker_', 'geo_migrated_'),
                presetType: 'custom_rect',
                type: 'rect',
                name: m.name,
                x: minX, y: minY,
                width: maxX - minX,
                height: maxY - minY,
                style: defaultStyle()
            });
        } else if (m.type === 'circle') {
            const { cx, cy, r } = m.params;
            geoMarkers.push({
                id: m.id.replace('marker_', 'geo_migrated_'),
                presetType: null,
                type: 'ellipse',
                name: m.name,
                cx, cy,
                rx: r, ry: r,
                style: defaultStyle()
            });
        }
    }

    // 第二步：迁移 geoMarkers 中已有的 circle 类型 → ellipse
    for (const geo of geoMarkers) {
        if (geo.type === 'circle' && geo.center) {
            geo.type = 'ellipse';
            geo.cx = geo.center.x;
            geo.cy = geo.center.y;
            geo.rx = geo.radius || 100;
            geo.ry = geo.radius || 100;
            delete geo.center;
            delete geo.radius;
        }
        // 补充缺失字段
        if (!geo.style) geo.style = defaultStyle();
        if (geo.presetType === undefined) geo.presetType = null;
        // 清理不再需要的旧字段
        delete geo.arrowEnd;
    }

    return geoMarkers;
}
```

**保存时**：`rangeMarkers: []`（保留空数组兼容旧版本加载），所有数据存 `geoMarkers`。

**UI 上**：隐藏旧「范围标识」面板，统一用「地理标识」入口。

---

## 二、底层图形类型（5 种）

| 类型 | 参数 | Canvas 渲染 | 新增？ |
|------|------|------------|--------|
| `polyline` | `points: [{x,y}, ...]` | moveTo/lineTo + stroke | 已有 |
| `polygon` | `points: [{x,y}, ...]` | moveTo/lineTo + closePath + fill + stroke | 已有 |
| `rect` | `x, y, width, height` | strokeRect + fillRect | **新增** |
| `ellipse` | `cx, cy, rx, ry` | ctx.ellipse() + fill + stroke | **新增** |
| `pin` | `x, y` | 几何符号 + 名称文字 | 已有 |

> `circle` 保留兼容（`ellipse` 的 `rx=ry` 特例），不单独列为类型。

---

## 三、渲染架构：基础形状 + 内部符号

### 核心思路

每个预设由两层组成：
1. **基础形状**：rect / ellipse / polygon / polyline — 定义区域边界和填充色
2. **内部符号**：预设绑定的几何符号绘制函数 — 在形状内部画特征符号，标识地理类型

```javascript
// 渲染流程伪代码
function renderGeoMarker(ctx, geo) {
    // 第一层：画基础形状（描边+填充）
    drawShape(ctx, geo);

    // 第二层：如果有预设符号，在内部画
    const preset = GEO_PRESETS[geo.presetType];
    if (preset && preset.symbol) {
        preset.symbol(ctx, geo);  // 调用符号绘制函数
    }

    // 第三层：画名称
    drawName(ctx, geo);
}
```

### 符号绘制函数签名

所有符号函数接收 shape 的**包围盒信息**，在包围盒内绘制：

```javascript
/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} bbox - 包围盒 {x, y, width, height, cx, cy}
 * @param {Object} style - { strokeColor, fillColor, ... }
 */
function drawForestSymbol(ctx, bbox, style) { ... }
```

---

## 四、符号库（25 种预设）

每个符号用 Canvas 2D 原语（moveTo/lineTo/arc/ellipse）绘制，**跨平台完全一致，无字体依赖**。

### 4.1 水域（4 种）

| # | key | 名称 | shape | 内部符号 | 符号画法 |
|---|-----|------|-------|---------|---------|
| 1 | `river` | 河流 | polyline | 沿线箭头 ▷ | 每 200px 画一个方向三角形 |
| 2 | `lake` | 湖泊 | ellipse | 水平波浪线 ～～ | 椭圆内画 3 条 bezier 曲线 |
| 3 | `ocean` | 海洋 | polygon | 45° 斜波浪 ∿∿ | 区域内画斜向 bezier 曲线 |
| 4 | `spring` | 瀑布/泉眼 | pin | 水滴形 | 弧线 + 下方尖角组成水滴轮廓 |

### 4.2 植被（5 种）

| # | key | 名称 | shape | 内部符号 | 符号画法 |
|---|-----|------|-------|---------|---------|
| 5 | `forest` | 森林 | polygon | 小树 🌲 | △三角形 + 底部短竖线，区域内散布 |
| 6 | `swamp` | 沼泽 | ellipse | 交叉斜线 × | 区域内画均匀交叉线纹理 |
| 7 | `grassland` | 草原 | rect | 短竖线 ‖ | 区域内画均匀短竖线阵列 |
| 8 | `desert` | 沙漠 | polygon | 点阵 · | 区域内画均匀点阵 |
| 9 | `bamboo` | 竹林 | polygon | 竖线+横节 ‖ | 竖线 + 中间短横线，区域内散布 |

### 4.3 地形（5 种）

| # | key | 名称 | shape | 内部符号 | 符号画法 |
|---|-----|------|-------|---------|---------|
| 10 | `mountain` | 山脉 | polyline | 锯齿三角 ▲ | 沿折线一侧画连续等距三角 |
| 11 | `cliff` | 悬崖 | polyline | T 形止标 ┤ | 沿线段方向画 T 形短标记 |
| 12 | `volcano` | 火山 | pin | 火山形 | △三角 + 底部半圆弧 |
| 13 | `snow_peak` | 雪山 | pin | 雪山形 | △白色填充 + 蓝色描边 + 顶部短线 |
| 14 | `cave` | 洞穴 | pin | 拱门形 ⊔ | 半圆弧 + 底部横线 |

### 4.4 建筑/人文（5 种）

| # | key | 名称 | shape | 内部符号 | 符号画法 |
|---|-----|------|-------|---------|---------|
| 15 | `city` | 城市 | rect | 十字街道 + | 区域内画等距横竖线网格 |
| 16 | `castle` | 城堡 | rect | 四角方块 □ | 矩形四角画小方块（角楼） |
| 17 | `village` | 村庄 | pin | 人字屋顶 | ▽ + 下方矩形 = 小屋轮廓 |
| 18 | `temple` | 庙宇/圣地 | pin | 宝塔形 | 多层三角 + 横线堆叠 |
| 19 | `ruin` | 废墟 | pin | 断柱形 | 矩形 + 断裂线 |

### 4.5 道路/边界（4 种）

| # | key | 名称 | shape | 内部符号 | 符号画法 |
|---|-----|------|-------|---------|---------|
| 20 | `road` | 道路 | polyline | 等距竖标 ╪ | 沿线画等距「十」字形短标记 |
| 21 | `wall` | 城墙 | polyline | 双线+连接 ┃┃ | 画两道平行线 + 等距短竖线连接 |
| 22 | `route` | 行军路线 | polyline | 末端箭头 + 等距菱形 ◇ | 虚线 + 末端三角 + 沿线菱形标记 |
| 23 | `bridge` | 桥梁 | polyline | 桥拱弧 | 线段中间画上凸弧线 = 桥拱 |

### 4.6 范围/区域（2 种）

| # | key | 名称 | shape | 内部符号 | 符号画法 |
|---|-----|------|-------|---------|---------|
| 24 | `kingdom` | 王国/领土 | polygon | 沿边线皇冠形 ♛ | 三角 + 底座 + 两侧小三角，沿边线等距标注 |
| 25 | `camp` | 营地 | ellipse | 帐篷形 △ | 大三角 + 顶部旗子短线 |

---

## 五、符号绘制函数示例

### 树（森林）

```javascript
function drawTree(ctx, x, y, size, color) {
    // 树冠：三角
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x - size * 0.6, y);
    ctx.lineTo(x + size * 0.6, y);
    ctx.closePath();
    ctx.fill();
    // 树干：短竖线
    ctx.strokeStyle = '#5D4037';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + size * 0.4);
    ctx.stroke();
}
```

### 波浪线（湖泊）

```javascript
function drawWaves(ctx, bbox, waveColor, count) {
    ctx.strokeStyle = waveColor;
    ctx.lineWidth = 1.5;
    const spacing = bbox.height / (count + 1);
    for (let i = 1; i <= count; i++) {
        const wy = bbox.y + spacing * i;
        ctx.beginPath();
        ctx.moveTo(bbox.x + bbox.width * 0.15, wy);
        // 用 quadraticCurveTo 画一个波浪周期
        const hw = bbox.width * 0.35;
        ctx.quadraticCurveTo(bbox.x + bbox.width * 0.35, wy - 6,
                             bbox.x + bbox.width * 0.5, wy);
        ctx.quadraticCurveTo(bbox.x + bbox.width * 0.65, wy + 6,
                             bbox.x + bbox.width * 0.85, wy);
        ctx.stroke();
    }
}
```

### 人字屋顶（村庄）

```javascript
function drawHouse(ctx, x, y, size, color) {
    // 屋顶：三角
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y - size * 0.6);
    ctx.lineTo(x - size * 0.7, y);
    ctx.lineTo(x + size * 0.7, y);
    ctx.closePath();
    ctx.fill();
    // 墙体：矩形
    ctx.fillRect(x - size * 0.5, y, size, size * 0.5);
}
```

### 沿线箭头（河流）

```javascript
function drawArrowsAlongPath(ctx, points, spacing, size, color) {
    ctx.fillStyle = color;
    let dist = 0;
    for (let i = 1; i < points.length; i++) {
        const dx = points[i].x - points[i-1].x;
        const dy = points[i].y - points[i-1].y;
        const segLen = Math.sqrt(dx*dx + dy*dy);
        const angle = Math.atan2(dy, dx);

        while (dist < segLen) {
            const px = points[i-1].x + dx * dist / segLen;
            const py = points[i-1].y + dy * dist / segLen;
            // 画方向三角
            ctx.beginPath();
            ctx.moveTo(px + size * Math.cos(angle), py + size * Math.sin(angle));
            ctx.lineTo(px + size * Math.cos(angle + 2.5), py + size * Math.sin(angle + 2.5));
            ctx.lineTo(px + size * Math.cos(angle - 2.5), py + size * Math.sin(angle - 2.5));
            ctx.closePath();
            ctx.fill();
            dist += spacing;
        }
        dist -= segLen;
    }
}
```

---

## 六、默认样式表

| 预设 key | shape | 描边色 | 填充色 | 线宽 | 虚线 | 粗线 |
|----------|-------|--------|--------|------|------|------|
| river | polyline | `#5dade2` | — | 3 | — | false |
| lake | ellipse | `#2e86c1` | `rgba(46,134,193,0.25)` | 2 | — | false |
| ocean | polygon | `#1a5276` | `rgba(26,82,118,0.2)` | 2 | — | false |
| spring | pin | `#5dade2` | — | 2 | — | false |
| forest | polygon | `#27ae60` | `rgba(39,174,96,0.2)` | 2 | — | false |
| swamp | ellipse | `#6b8e23` | `rgba(107,142,35,0.25)` | 2 | — | false |
| grassland | rect | `#82e0aa` | `rgba(130,224,170,0.1)` | 2 | — | false |
| desert | polygon | `#f0b429` | `rgba(240,180,41,0.2)` | 2 | — | false |
| bamboo | polygon | `#a8d08d` | `rgba(168,208,141,0.2)` | 2 | — | false |
| mountain | polyline | `#7f8c8d` | — | 5 | — | true |
| cliff | polyline | `#8d6e63` | — | 3 | — | false |
| volcano | pin | `#d32f2f` | — | 2 | — | false |
| snow_peak | pin | `#3498db` | — | 2 | — | false |
| cave | pin | `#8d6e63` | — | 2 | — | false |
| city | rect | `#e74c3c` | `rgba(231,76,60,0.12)` | 2 | — | true |
| castle | rect | `#c0392b` | `rgba(192,57,43,0.1)` | 4 | — | true |
| village | pin | `#f39c12` | — | 2 | — | false |
| temple | pin | `#f1c40f` | — | 2 | — | false |
| ruin | pin | `#95a5a6` | — | 2 | — | false |
| road | polyline | `#95a5a6` | — | 2 | — | false |
| wall | polyline | `#616161` | — | 3 | — | true |
| route | polyline | `#8e44ad` | — | 2 | `[8,4]` | false |
| bridge | polyline | `#8d6e63` | — | 3 | — | false |
| kingdom | polygon | `#c0392b` | `rgba(192,57,43,0.1)` | 2 | — | true |
| camp | ellipse | `#f39c12` | `rgba(243,156,18,0.2)` | 2 | — | false |

---

## 七、UI 设计

### 7.1 地理标识面板（合并后唯一入口）

```
┌─────────────────────────────────────┐
│ 地理标识                              │
│                                      │
│ 分组 [水域 ▾]    类型 [河流 ▾]        │
│                                      │
│ 标识名称 [_______________]           │
│                                      │
│ ─── 参数区（根据类型自动切换）───      │
│                                      │
│ 顶点坐标（每行一个 x,y）              │
│ ┌──────────────────────────┐         │
│ │ 200,100                  │         │
│ │ 350,250                  │         │
│ │ 500,300                  │         │
│ └──────────────────────────┘         │
│                                      │
│ ─── 样式（已预填，可覆盖）───         │
│ 描边色 [■] [#5dade2]                  │
│ 填充色 [■] [rgba(46,134,193,0.25)]   │
│ 线宽   [3]  □ 粗线                   │
│                                      │
│ [添加地理标识]                        │
│                                      │
│ ─── 已添加 ───                        │
│ 🏔 青龙河（河流）[编辑][删除]          │
│ 🌿 迷雾森林（森林）[编辑][删除]        │
│ 🔵 镜湖（湖泊）[编辑][删除]            │
└─────────────────────────────────────┘
```

### 7.2 参数区动态切换

| 类型 shape | 参数区显示 |
|-----------|----------|
| `polyline` | textarea：N 个顶点 x,y（≥2 行） |
| `polygon` | textarea：N 个顶点 x,y（≥3 行） |
| `rect` | 4 个 number 输入：X, Y, 宽, 高 |
| `ellipse` | 4 个 number 输入：中心 X, 中心 Y, rx, ry |
| `pin` | 2 个 number：X, Y（或「点击地图放置」按钮） |

### 7.3 快速放置（pin 类型）

选了村庄/庙宇/废墟等 pin 预设后，按钮变「点击地图放置」，用户在地图上点一下即可。

---

## 八、数据结构

### 8.1 geoMarker 统一结构

```json
{
  "id": "geo_1700000001",
  "presetType": "river",
  "type": "polyline",
  "name": "青龙河",
  "points": [{"x": 200, "y": 100}, {"x": 350, "y": 250}, {"x": 500, "y": 300}],
  "style": {
    "strokeColor": "#5dade2",
    "lineWidth": 3,
    "lineDash": null,
    "fillColor": null,
    "bold": false
  }
}
```

### 8.2 style 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `strokeColor` | `string` | 描边颜色 hex，如 `"#5dade2"` |
| `lineWidth` | `number` | 线宽，像素 |
| `lineDash` | `number[] \| null` | 虚线样式，如 `[8,4]`；`null` = 实线 |
| `fillColor` | `string \| null` | 填充颜色，使用 rgba 格式（如 `"rgba(46,134,193,0.25)"`）内含透明度；`null` = 无填充 |
| `bold` | `boolean` | 粗线，渲染时 lineWidth × 2 |

> 透明度直接编码在 `fillColor` 的 rgba 字符串中（如 `0.25`），不单独存 `fillOpacity` 字段。

### 8.2 rect 类型

```json
{
  "id": "geo_1700000010",
  "presetType": "city",
  "type": "rect",
  "name": "长安城",
  "x": 800, "y": 600,
  "width": 200, "height": 150,
  "style": {
    "strokeColor": "#e74c3c", "lineWidth": 2,
    "lineDash": null,
    "fillColor": "rgba(231,76,60,0.12)",
    "bold": true
  }
}
```

### 8.3 ellipse 类型

```json
{
  "id": "geo_1700000020",
  "presetType": "lake",
  "type": "ellipse",
  "name": "镜湖",
  "cx": 500, "cy": 800,
  "rx": 180, "ry": 120,
  "style": {
    "strokeColor": "#2e86c1", "lineWidth": 2,
    "lineDash": null,
    "fillColor": "rgba(46,134,193,0.25)",
    "bold": false
  }
}
```

---

## 九、向后兼容

迁移在 `applyMapData` 中自动执行，每次加载 JSON 时触发。

| 场景 | 处理 |
|------|------|
| 旧 JSON 无 geoMarkers | 初始化空数组 |
| 旧 geoMarkers 缺 style | 补充默认样式 |
| 旧 geoMarkers 缺 presetType | 设为 `null` |
| 旧 geoMarkers 中 circle 类型 | `center`+`radius` → `cx,cy,rx,ry`，type 改为 `ellipse` |
| 旧 rangeMarkers 的 rect（四顶点） | 用 `Math.min/max` 计算包围盒 → `x,y,width,height` |
| 旧 rangeMarkers 的 circle | `cx,cy,r` → `cx,cy,rx=r,ry=r`，type 设为 `ellipse` |
| 旧 geoMarkers 的 arrowEnd 字段 | 删除（项目未上线，无需兼容） |
| 保存时 | `rangeMarkers: []` 保留空数组，所有数据存 `geoMarkers` |

---

## 十、实现优先级

| 优先级 | 任务 |
|--------|------|
| **P0 必须** | 新增 `rect`/`ellipse` 底层图形 + Canvas 渲染 |
| **P0 必须** | 预设类型选择器（分组下拉框）+ 参数区动态切换 |
| **P0 必须** | 25 种预设默认样式自动填充 |
| **P0 必须** | rangeMarkers → geoMarkers 迁移函数 |
| **P1 重要** | 符号绘制函数库（树、波浪、箭头、人字屋顶等） |
| **P1 重要** | pin 类型快速放置（点击地图） |
| **P1 重要** | 列表显示预设中文名 + 符号图标 |
| **P2 可选** | 城堡四角方块、宝塔堆叠、皇冠沿边标注 |
| **P2 可选** | 符号密度自适应（区域小则少画，区域大则多画） |
