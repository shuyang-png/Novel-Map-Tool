# 预设类型系统 — 设计方案

> **目标**：用户选择地理实体类型（如"湖泊"）后，自动填充默认图形、颜色、样式，无需手动配置。  
> **核心问题**：当前地理标识只支持 `polyline`/`polygon`/`circle`/`pin`，且每种都要手动填顶点、颜色等，操作繁琐。  
> **新增底层图形**：`rect`（矩形）、`ellipse`（椭圆）

---

## 1. 底层图形类型（Shape Types）

在 `geoMarkers` 中新增两种底层图形，与现有 `polyline/polygon/circle/pin` 并列：

| 底层类型 | 本质 | 参数 | 说明 |
|---------|------|------|------|
| `polyline` | 折线 | `points: [{x,y}, ...]` | 已有，保留 |
| `polygon` | 多边形 | `points: [{x,y}, ...]` | 已有，保留 |
| `circle` | 圆形 | `center: {x,y}, radius: number` | 已有，保留 |
| `rect` | **矩形** | `x, y, width, height` | **新增**，左上角+宽高 |
| `ellipse` | **椭圆** | `cx, cy, rx, ry` | **新增**，中心+半轴 |
| `pin` | 标注点 | `x, y, icon` | 已有，保留 |

### rect 参数说明

```json
{
  "type": "rect",
  "x": 100,        // 左上角 X
  "y": 200,        // 左上角 Y
  "width": 300,    // 宽度（X方向）
  "height": 150    // 高度（Y方向）
}
```

- **设计理由**：比当前 `rangeMarkers` 中 `rect` 的四顶点更直观。当前需要输入8个数字，改成4个（x/y/w/h）更易用。
- **渲染**：`ctx.strokeRect(x, y, w, h)` + `ctx.fillRect(x, y, w, h)`

### ellipse 参数说明

```json
{
  "type": "ellipse",
  "cx": 500,       // 中心 X
  "cy": 500,       // 中心 Y
  "rx": 200,       // X 轴半径
  "ry": 100        // Y 轴半径
}
```

- **设计理由**：椭圆比圆形更灵活，湖泊、沼泽等自然地貌通常不是正圆。复用圆形的"中心+半轴"参数模式。
- **渲染**：`ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)` — Canvas 2D 原生支持。

---

## 2. 预设类型列表与默认样式

### 预设映射表

每个 `geoMarker` 增加可选字段 `presetType`（字符串），标识用户选择的地理实体类型。`presetType` 为 `null` 或 `"custom"` 时，表示用户自定义。

```javascript
const GEO_PRESETS = {
  // ===== 水域 =====
  "river": {
    label: "河流",
    shape: "polyline",
    defaults: { strokeColor: "#5dade2", lineWidth: 3, bold: false }
  },
  "lake": {
    label: "湖泊",
    shape: "ellipse",
    defaults: { strokeColor: "#2e86c1", lineWidth: 2, fillColor: "rgba(46,134,193,0.25)", bold: false }
  },
  "ocean": {
    label: "海洋",
    shape: "polygon",
    defaults: { strokeColor: "#1a5276", lineWidth: 2, fillColor: "rgba(26,82,118,0.2)", bold: false }
  },
  "waterfall": {
    label: "瀑布/泉眼",
    shape: "pin",
    defaults: { strokeColor: "#5dade2", icon: "generic" }
  },

  // ===== 植被 =====
  "forest": {
    label: "森林",
    shape: "polygon",
    defaults: { strokeColor: "#27ae60", lineWidth: 2, fillColor: "rgba(39,174,96,0.2)", bold: false }
  },
  "swamp": {
    label: "沼泽",
    shape: "ellipse",
    defaults: { strokeColor: "#6b8e23", lineWidth: 2, fillColor: "rgba(107,142,35,0.25)", bold: false }
  },
  "grassland": {
    label: "草原",
    shape: "rect",
    defaults: { strokeColor: "#82e0aa", lineWidth: 2, fillColor: "rgba(130,224,170,0.15)", bold: false }
  },
  "desert": {
    label: "沙漠",
    shape: "polygon",
    defaults: { strokeColor: "#f0b429", lineWidth: 2, fillColor: "rgba(240,180,41,0.2)", bold: false }
  },

  // ===== 地形 =====
  "mountain_range": {
    label: "山脉",
    shape: "polyline",
    defaults: { strokeColor: "#7f8c8d", lineWidth: 3, bold: true }
  },
  "mountain_peak": {
    label: "山峰",
    shape: "pin",
    defaults: { strokeColor: "#7f8c8d", icon: "generic" }
  },
  "cliff": {
    label: "悬崖/峭壁",
    shape: "polyline",
    defaults: { strokeColor: "#8d6e63", lineWidth: 3, lineDash: [6, 3], bold: false }
  },
  "volcano": {
    label: "火山",
    shape: "pin",
    defaults: { strokeColor: "#d32f2f", icon: "generic" }
  },

  // ===== 建筑/人文 =====
  "city": {
    label: "城市",
    shape: "rect",
    defaults: { strokeColor: "#e74c3c", lineWidth: 2, fillColor: "rgba(231,76,60,0.15)", bold: true }
  },
  "village": {
    label: "村庄",
    shape: "pin",
    defaults: { strokeColor: "#f39c12", icon: "village" }
  },
  "castle": {
    label: "城堡",
    shape: "rect",
    defaults: { strokeColor: "#c0392b", lineWidth: 3, fillColor: "rgba(192,57,43,0.1)", bold: true }
  },
  "ruin": {
    label: "废墟",
    shape: "pin",
    defaults: { strokeColor: "#95a5a6", icon: "ruin" }
  },
  "temple": {
    label: "庙宇/圣地",
    shape: "pin",
    defaults: { strokeColor: "#f1c40f", icon: "castle" }
  },

  // ===== 道路/边界 =====
  "road": {
    label: "道路/官道",
    shape: "polyline",
    defaults: { strokeColor: "#95a5a6", lineWidth: 2, bold: false }
  },
  "wall": {
    label: "城墙",
    shape: "polyline",
    defaults: { strokeColor: "#616161", lineWidth: 4, bold: true }
  },
  "bridge": {
    label: "桥梁",
    shape: "polyline",
    defaults: { strokeColor: "#8d6e63", lineWidth: 3, bold: false }
  },
  "route": {
    label: "路线（行军/迁徙）",
    shape: "polyline",
    defaults: { strokeColor: "#8e44ad", lineWidth: 2, lineDash: [8, 4] }
  },

  // ===== 范围/区域 =====
  "kingdom": {
    label: "王国/领土",
    shape: "polygon",
    defaults: { strokeColor: "#c0392b", lineWidth: 2, fillColor: "rgba(192,57,43,0.1)", bold: true }
  },
  "territory": {
    label: "势力范围",
    shape: "polygon",
    defaults: { strokeColor: "#999999", lineWidth: 2, lineDash: [8, 4], fillColor: "rgba(153,153,153,0.1)", bold: false }
  },
  "disputed": {
    label: "争议区域",
    shape: "polygon",
    defaults: { strokeColor: "#e74c3c", lineWidth: 1, lineDash: [6, 4], fillColor: "rgba(231,76,60,0.08)", bold: false }
  },
  "camp": {
    label: "营地/驻扎地",
    shape: "ellipse",
    defaults: { strokeColor: "#f39c12", lineWidth: 2, fillColor: "rgba(243,156,18,0.2)", bold: false }
  },

  // ===== 自定义 =====
  "custom_polyline": {
    label: "自定义折线",
    shape: "polyline",
    defaults: { strokeColor: "#5dade2", lineWidth: 2, bold: false }
  },
  "custom_polygon": {
    label: "自定义多边形",
    shape: "polygon",
    defaults: { strokeColor: "#27ae60", lineWidth: 2, fillColor: "rgba(39,174,96,0.2)", bold: false }
  },
  "custom_rect": {
    label: "自定义矩形",
    shape: "rect",
    defaults: { strokeColor: "#3498db", lineWidth: 2, fillColor: null, bold: false }
  },
  "custom_ellipse": {
    label: "自定义椭圆",
    shape: "ellipse",
    defaults: { strokeColor: "#3498db", lineWidth: 2, fillColor: null, bold: false }
  }
};
```

### 默认样式速查

| 预设类型 | shape | strokeColor | fillColor | lineWidth | lineDash | bold |
|---------|-------|-------------|-----------|-----------|---------|------|
| 河流 | polyline | `#5dade2` 浅蓝 | - | 3 | - | false |
| 湖泊 | ellipse | `#2e86c1` 深蓝 | `rgba(46,134,193,0.25)` | 2 | - | false |
| 海洋 | polygon | `#1a5276` 深蓝 | `rgba(26,82,118,0.2)` | 2 | - | false |
| 森林 | polygon | `#27ae60` 绿 | `rgba(39,174,96,0.2)` | 2 | - | false |
| 沼泽 | ellipse | `#6b8e23` 橄榄 | `rgba(107,142,35,0.25)` | 2 | - | false |
| 草原 | rect | `#82e0aa` 浅绿 | `rgba(130,224,170,0.15)` | 2 | - | false |
| 沙漠 | polygon | `#f0b429` 黄 | `rgba(240,180,41,0.2)` | 2 | - | false |
| 山脉 | polyline | `#7f8c8d` 灰 | - | 3 | - | true |
| 悬崖 | polyline | `#8d6e63` 棕 | - | 3 | `[6,3]` | false |
| 城市 | rect | `#e74c3c` 红 | `rgba(231,76,60,0.15)` | 2 | - | true |
| 城堡 | rect | `#c0392b` 深红 | `rgba(192,57,43,0.1)` | 3 | - | true |
| 道路 | polyline | `#95a5a6` 浅灰 | - | 2 | - | false |
| 城墙 | polyline | `#616161` 深灰 | - | 4 | - | true |
| 路线 | polyline | `#8e44ad` 紫 | - | 2 | `[8,4]` | false |
| 王国 | polygon | `#c0392b` 深红 | `rgba(192,57,43,0.1)` | 2 | - | true |
| 势力范围 | polygon | `#999` 灰 | `rgba(153,153,153,0.1)` | 2 | `[8,4]` | false |
| 争议区 | polygon | `#e74c3c` 红 | `rgba(231,76,60,0.08)` | 1 | `[6,4]` | false |
| 营地 | ellipse | `#f39c12` 橙 | `rgba(243,156,18,0.2)` | 2 | - | false |

---

## 3. UI 改动方案

### 3.1 地理标识表单改造

**当前**：用户选择 `polyline`/`polygon`，然后手动填顶点、颜色、线宽。  
**改造后**：两级选择 —— 先选预设类型（或自定义），再根据预设自动填充参数。

#### 表单布局

```
┌──────────────────────────────┐
│ 地理标识                       │
│                               │
│ [预设类型 ▼]                  │
│  ├ 水域                       │
│  │  ├ 河流                    │
│  │  ├ 湖泊                    │
│  │  └ 海洋                    │
│  ├ 植被                       │
│  │  ├ 森林、沼泽、草原、沙漠    │
│  ├ 地形                       │
│  │  ├ 山脉、山峰、悬崖、火山    │
│  ├ 建筑/人文                   │
│  │  ├ 城市、村庄、城堡、废墟...  │
│  ├ 道路/边界                   │
│  │  ├ 道路、城墙、桥梁、路线    │
│  ├ 范围/区域                   │
│  │  ├ 王国、势力范围、营地      │
│  └ 自定义                      │
│     ├ 自定义折线               │
│     ├ 自定义多边形             │
│     ├ 自定义矩形               │
│     └ 自定义椭圆               │
│                               │
│ 标识名称 [____________]        │
│                               │
│ ─── 动态参数区 ───             │
│ 根据 shape 类型自动切换：       │
│ • polyline → 顶点坐标(≥2点)    │
│ • polygon  → 顶点坐标(≥3点)    │
│ • rect     → X,Y,宽,高        │
│ • ellipse  → 中心X,Y + rx,ry  │
│ • circle   → 圆心X,Y + 半径   │
│ • pin      → X,Y + 图标选择   │
│                               │
│ ─── 样式区（可覆盖默认值）───    │
│ 边框颜色 [色块] [#hex]         │
│ 填充颜色 [色块] [#hex]         │
│ 线条宽度 [2]                  │
│ □ 粗线（视觉加粗）             │
│                               │
│ [添加地理标识]                 │
│                               │
│ ─── 地理标识列表 ───           │
│ • 青龙河（河流，3顶点）[编辑][删除]│
│ • 迷雾森林（森林，4顶点）[编辑][删除]│
└──────────────────────────────┘
```

#### 关键交互逻辑

1. **预设类型选择** → `onPresetChange(presetKey)`
   - 从 `GEO_PRESETS` 读取预设
   - 自动设置 `shape` 类型，切换参数区显示
   - 自动填充边框色、填充色、线宽、粗线
   - 填充颜色区：polygon/ellipse/rect 显示，polyline/pin 隐藏
   
2. **参数区自动切换** → `toggleGeoParams(shape)`
   - `polyline`：textarea 填顶点（每行 x,y）
   - `polygon`：textarea 填顶点（每行 x,y）
   - `rect`：4 个 number 输入框 (X, Y, 宽, 高)
   - `ellipse`：4 个 number 输入框 (中心X, 中心Y, rx, ry)
   - `circle`：3 个 number 输入框 (中心X, 中心Y, 半径)
   - `pin`：2 个 number 输入框 (X, Y) + 图标选择下拉框

3. **用户可覆盖样式**：预设填入默认值后，用户仍可手动修改颜色、线宽等。

### 3.2 删除旧的「范围标识」功能模块

当前 `rangeMarkers` 中的 `rect`（四顶点）和 `circle`（圆心+半径）功能将被新系统的 `rect`/`ellipse`/`circle` 地理标识完全覆盖。

**建议**：保留 `rangeMarkers` 的数据读取能力（向后兼容），但 UI 上隐藏旧的「范围标识」表单，统一使用「地理标识」入口。

若要完全合并：旧 `rangeMarkers` 中的 `rect`（四顶点）自动转换为新 `geoMarkers` 中的 `rect`（x/y/w/h）。

### 3.3 新增 `ellipse`/`rect` 的 Canvas 渲染

在 `renderMap()` 的 `state.geoMarkers.forEach(geo => { ... })` 中新增两个分支：

```javascript
} else if (geo.type === 'rect' && geo.x !== undefined) {
    const fillColor = style.fillColor || null;
    if (fillColor) {
        ctx.fillStyle = fillColor;
        ctx.fillRect(geo.x, geo.y, geo.width, geo.height);
    }
    ctx.strokeRect(geo.x, geo.y, geo.width, geo.height);
    if (geo.name) {
        drawMarkerName(geo.name, geo.x + geo.width / 2, geo.y + geo.height / 2);
    }
} else if (geo.type === 'ellipse' && geo.cx !== undefined) {
    const fillColor = style.fillColor || null;
    ctx.beginPath();
    ctx.ellipse(geo.cx, geo.cy, geo.rx || 100, geo.ry || 80, 0, 0, Math.PI * 2);
    if (fillColor) {
        ctx.fillStyle = fillColor;
        ctx.fill();
    }
    ctx.stroke();
    if (geo.name) {
        drawMarkerName(geo.name, geo.cx, geo.cy + (geo.ry || 80) + 20 / s);
    }
}
```

---

## 4. 数据结构变更

### 4.1 geoMarker 新增字段

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
    "fillOpacity": 0,
    "bold": false
  },
  "arrowEnd": false
}
```

**新增字段说明**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `presetType` | `string \| null` | 否 | 预设类型 key，如 `"river"`、`"lake"`。`null` 或缺省表示自定义 |
| `type` | `string` | 是 | 底层图形类型：`polyline`/`polygon`/`rect`/`ellipse`/`circle`/`pin` |

### 4.2 rect 类型 geoMarker 完整示例

```json
{
  "id": "geo_1700000010",
  "presetType": "city",
  "type": "rect",
  "name": "长安城",
  "x": 800,
  "y": 600,
  "width": 200,
  "height": 150,
  "style": {
    "strokeColor": "#e74c3c",
    "lineWidth": 2,
    "lineDash": null,
    "fillColor": "rgba(231,76,60,0.15)",
    "fillOpacity": 0.15,
    "bold": true
  }
}
```

### 4.3 ellipse 类型 geoMarker 完整示例

```json
{
  "id": "geo_1700000020",
  "presetType": "lake",
  "type": "ellipse",
  "name": "镜湖",
  "cx": 500,
  "cy": 800,
  "rx": 180,
  "ry": 120,
  "style": {
    "strokeColor": "#2e86c1",
    "lineWidth": 2,
    "lineDash": null,
    "fillColor": "rgba(46,134,193,0.25)",
    "fillOpacity": 0.25,
    "bold": false
  }
}
```

### 4.4 pin 类型 geoMarker 完整示例

```json
{
  "id": "geo_1700000030",
  "presetType": "village",
  "type": "pin",
  "name": "枯木村",
  "x": 280,
  "y": 420,
  "icon": "village",
  "style": {
    "strokeColor": "#f39c12",
    "lineWidth": 2,
    "lineDash": null,
    "fillColor": null,
    "fillOpacity": 0,
    "bold": false
  }
}
```

---

## 5. 向后兼容方案

### 5.1 读取旧 JSON 的自动转换

在 `loadMap()` / `loadMapFromDir()` / `batchLoadMaps()` 中，加载数据后执行迁移函数：

```javascript
function migrateGeoMarkers(data) {
    const geoMarkers = data.geoMarkers || [];
    const rangeMarkers = data.rangeMarkers || [];
    
    // 1. 将旧 rangeMarkers 转为 geoMarkers
    for (const marker of rangeMarkers) {
        if (marker.type === 'rect') {
            // 四顶点 → x/y/w/h
            const { x1, y1, x2, y2, x3, y3 } = marker.params;
            geoMarkers.push({
                id: marker.id.replace('marker_', 'geo_migrated_'),
                presetType: null,
                type: 'rect',
                name: marker.name,
                x: Math.min(x1, x2, x3),
                y: Math.min(y1, y2, y3),
                width: Math.abs(x3 - x1),
                height: Math.abs(y3 - y1),
                style: {
                    strokeColor: '#ff0000',
                    lineWidth: 2,
                    lineDash: null,
                    fillColor: null,
                    fillOpacity: 0,
                    bold: false
                }
            });
        } else if (marker.type === 'circle') {
            const { cx, cy, r } = marker.params;
            geoMarkers.push({
                id: marker.id.replace('marker_', 'geo_migrated_'),
                presetType: null,
                type: 'circle',
                name: marker.name,
                center: { x: cx, y: cy },
                radius: r,
                style: {
                    strokeColor: '#ff0000',
                    lineWidth: 2,
                    lineDash: null,
                    fillColor: null,
                    fillOpacity: 0,
                    bold: false
                }
            });
        }
    }
    
    // 2. 为缺少 style 的旧 geoMarkers 补默认样式
    for (const geo of geoMarkers) {
        if (!geo.style) {
            geo.style = {
                strokeColor: '#5dade2',
                lineWidth: 2,
                lineDash: null,
                fillColor: null,
                fillOpacity: 0,
                bold: false
            };
        }
        if (geo.presetType === undefined) {
            geo.presetType = null;
        }
    }
    
    return geoMarkers;
}
```

### 5.2 兼容策略矩阵

| 场景 | 处理方式 |
|------|---------|
| 旧 JSON 无 `geoMarkers` | 从 `rangeMarkers` 迁移，`geoMarkers` 初始化为空数组 |
| 旧 `geoMarkers` 缺 `style` | 补充默认样式 |
| 旧 `geoMarkers` 缺 `presetType` | 设为 `null`（自定义） |
| 旧 `rangeMarkers` 的 `rect`（四顶点） | 自动转换为 `geoMarkers` 中的 `rect`（x/y/w/h） |
| 旧 `rangeMarkers` 的 `circle` | 自动转换为 `geoMarkers` 中的 `circle`（center+radius） |
| 新 JSON 读取 | 正常读取，`presetType` 有值时可用于 UI 显示预设名 |
| 保存时写入旧字段 | 保留 `rangeMarkers` 字段为空数组 `[]`（防止旧版本加载报错），数据统一存 `geoMarkers` |

### 5.3 保存兼容

保存时仍然写入 `rangeMarkers: []`（空数组），确保旧版本加载不报错。所有标识统一存 `geoMarkers`。

```javascript
function saveCurrentMap() {
    const data = {
        // ... 其他字段
        rangeMarkers: [],  // 保持兼容，实际已迁移到 geoMarkers
        geoMarkers: [...state.geoMarkers],
        // ...
    };
    // ...
}
```

---

## 6. 实现优先级

| 优先级 | 任务 | 说明 |
|--------|------|------|
| **必须** | 新增 `rect` / `ellipse` 底层图形 | renderMap 中加两个绘制分支，数据结构新增字段 |
| **必须** | 预设类型选择器（下拉框 + 分组） | `<select>` 带 `<optgroup>`，替代当前 polyline/polygon 二选一 |
| **必须** | 预设自动填充默认样式 | 选择预设后自动设置颜色/线宽/填充等 |
| **必须** | 参数区动态切换 | rect → 4个输入框，ellipse → 4个输入框 |
| **必须** | 向后兼容迁移函数 | loadMap 时自动转换旧 rangeMarkers |
| **重要** | 列表显示预设标签 | `updateGeoList` 中显示 `河流` 而非 `polyline` |
| **重要** | 编辑时还原预设 | `editGeoMarker` 能识别 presetType 并恢复下拉选择 |
| **可选** | 预设颜色一览表（帮助弹窗） | 用户可随时查看各预设的默认颜色 |
| **可选** | 用户自定义预设 | 允许用户保存自己的样式组合为新预设 |

---

## 7. 开发注意事项

1. **`rect` 用 x/y/w/h，不用四顶点**：更直观，参数量减半，与 Canvas API (`strokeRect`) 直接对应。
2. **`ellipse` 用 cx/cy/rx/ry**：与 `circle` 的 cx/cy/r 结构一致，Canvas 2D 的 `ctx.ellipse()` 原生支持。
3. **预设不影响自由度**：用户选择"湖泊"后仍可修改所有样式参数，预设只是填默认值。
4. **旧 `rangeMarkers` 保持可读不可写**：读取旧文件时迁移，保存时不再写 `rangeMarkers`（写空数组兼容）。
5. **`pin` 类型补充 style**：当前 pin 的颜色硬编码在渲染逻辑中，统一到 `style.strokeColor` 使编辑更灵活。
6. **Canvas 绘制顺序**：rect/ellipse 填充在描边之前，与现有 polygon 渲染逻辑一致。
