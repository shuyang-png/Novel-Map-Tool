# 小说地图工具 - 需求文档 v2（基于代码实际实现）

> 以 GitHub 拉取的 `Novel-Map-Tool/小说地图工具.html` 最终迭代版本为准。

---

## 1. 核心功能模块

### 缩放功能（必须）

- **触发方式**：鼠标滚轮事件 `handleWheel(e)`
- **实现逻辑**：每次滚动 `scale` 增减 `0.1`（即 10%），范围强制限制在 `0.1 ~ 2`（10%~200%）
- **同步显示**：调整 `state.scale` 后立即调用 `renderMap()` 重新绘制，所有元素等比例变化

### 地图平移/滑动（必须）

- **触发方式**：鼠标按下→拖动，`handleMouseDown / handleMouseMove / handleMouseUp`
- **实现逻辑**：
  - 按下时记录 `dragStartX/Y` 与当前偏移 `offsetX/Y`
  - 移动时 `offsetX/Y += delta / state.scale`
  - 边界限制宽松：`maxOffset = canvas.width * 3`，防止数值溢出，无硬性 0~1000 边界约束
  - `dragMoved` 标记用于区分点击与拖拽

### 坐标点/备注功能（必须）

- **添加方式**：
  - ① 点击地图（非拖拽）：`handleCanvasClick`，逆向计算真实地图坐标，通过 `prompt` 获取名称与备注
  - ② 手动输入表单：`addManualNote`
- **数据结构**：`{id, name, x, y, content}`，推入 `state.notes`
- **备注框**：`showNoteBox(noteId)` 支持查看/编辑/删除，编辑最多 200 字
- **显示**：右侧列表实时更新，Canvas 绘制红点与名称
- **存储**：`saveCurrentMap` 包含 `notes`，`loadMap` 恢复

### 范围标识功能（必须）

- **类型**：矩形 (`rect`) 或圆形 (`circle`)，通过表单 `addRangeMarker` 提交
- **矩形参数**：四个顶点坐标 (x1-y1 ~ x4-y4)，范围 0~2000
- **圆形参数**：圆心 (cx, cy) 范围 0~2000，半径 r 范围 0~1000
- **数据结构**：`{id, name, type, params}`，存入 `state.rangeMarkers`
- **样式**：红色实线，矩形名称显示在中心，圆形名称显示在圆心下方 20px
- **编辑**：`editMarker(markerId)` 填表单后删除旧对象再重新添加
- **删除**：`deleteMarker(markerId)`

### 地理标识扩展（预设图案系统）

> **状态：设计完成，待实现。** 详见 `DESIGN-PRESET-GEO-V2.md`。

#### 架构：基础形状 + 内部几何符号

每个预设由两层组成：
1. **基础形状**：rect / ellipse / polygon / polyline — 定义区域边界和填充色
2. **内部符号**：预设绑定的几何符号绘制函数 — 在形状内部画特征符号，标识地理类型

渲染流程：画基础形状 → 调用符号绘制函数 → 画名称

#### 底层图形类型（5 种）

| 类型 | 参数 | 说明 |
|------|------|------|
| `polyline` | `points: [{x,y}, ...]` | 折线，用于河流/道路/山脉/城墙 |
| `polygon` | `points: [{x,y}, ...]` | 多边形，用于森林/海洋/沙漠/王国 |
| `rect` | `x, y, width, height` | **新增**，矩形，用于城市/城堡/草原 |
| `ellipse` | `cx, cy, rx, ry` | **新增**，椭圆，用于湖泊/沼泽/营地 |
| `pin` | `x, y` | 标注点，用于村庄/庙宇/废墟 |

#### 预设类型列表（25 种）

| 分组 | key | 名称 | shape | 内部符号 |
|------|-----|------|-------|---------|
| 水域 | `river` | 河流 | polyline | 沿线箭头 ▷ |
| 水域 | `lake` | 湖泊 | ellipse | 水平波浪线 ～～ |
| 水域 | `ocean` | 海洋 | polygon | 45° 斜波浪 ∿∿ |
| 水域 | `spring` | 瀑布/泉眼 | pin | 水滴形 |
| 植被 | `forest` | 森林 | polygon | 小树 △+竖线 |
| 植被 | `swamp` | 沼泽 | ellipse | 交叉斜线 × |
| 植被 | `grassland` | 草原 | rect | 短竖线 ‖ |
| 植被 | `desert` | 沙漠 | polygon | 点阵 · |
| 植被 | `bamboo` | 竹林 | polygon | 竖线+横节 |
| 地形 | `mountain` | 山脉 | polyline | 锯齿三角 ▲ |
| 地形 | `cliff` | 悬崖 | polyline | T 形止标 ┤ |
| 地形 | `volcano` | 火山 | pin | △+半圆 |
| 地形 | `snow_peak` | 雪山 | pin | 白色△+蓝描边 |
| 地形 | `cave` | 洞穴 | pin | 拱门 ⊔ |
| 建筑 | `city` | 城市 | rect | 十字街道 + |
| 建筑 | `castle` | 城堡 | rect | 四角方块 □ |
| 建筑 | `village` | 村庄 | pin | 人字屋顶 |
| 建筑 | `temple` | 庙宇/圣地 | pin | 宝塔堆叠 |
| 建筑 | `ruin` | 废墟 | pin | 断柱形 |
| 道路 | `road` | 道路 | polyline | 等距十字标 ╪ |
| 道路 | `wall` | 城墙 | polyline | 双线+连接 |
| 道路 | `route` | 行军路线 | polyline | 虚线+箭头+菱形 |
| 道路 | `bridge` | 桥梁 | polyline | 桥拱弧 |
| 区域 | `kingdom` | 王国/领土 | polygon | 沿边线皇冠形 |
| 区域 | `camp` | 营地 | ellipse | 帐篷形 △ |

#### 默认配色方案

| 预设 key | 默认颜色 | 填充色 | 备注 |
|----------|---------|--------|------|
| river | `#5dade2` 浅蓝 | — | 线宽 3 |
| lake | `#2e86c1` 深蓝 | `rgba(46,134,193,0.25)` | 波浪符号 |
| ocean | `#1a5276` 深蓝 | `rgba(26,82,118,0.2)` | 斜波浪符号 |
| forest | `#27ae60` 绿色 | `rgba(39,174,96,0.2)` | 树形符号 |
| swamp | `#6b8e23` 橄榄绿 | `rgba(107,142,35,0.25)` | 交叉线符号 |
| desert | `#f0b429` 黄色 | `rgba(240,180,41,0.2)` | 点阵符号 |
| mountain | `#7f8c8d` 灰色 | — | 线宽 5，粗线 |
| city | `#e74c3c` 红色 | `rgba(231,76,60,0.12)` | 粗线 |
| castle | `#c0392b` 深红 | `rgba(192,57,43,0.1)` | 线宽 4，粗线 |
| road | `#95a5a6` 浅灰 | — | |
| wall | `#616161` 深灰 | — | 粗线 |
| route | `#8e44ad` 紫色 | — | 虚线 `[8,4]` |
| kingdom | `#c0392b` 深红 | `rgba(192,57,43,0.1)` | 粗线 |
| 其他预设 | 参见 DESIGN-PRESET-GEO-V2.md §六 | | |

#### 新增字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `presetType` | `string \| null` | 预设 key，如 `"river"`；`null` = 自定义 |
| `type` | `string` | 底层图形：`polyline`/`polygon`/`rect`/`ellipse`/`pin` |

#### 跨类型属性

##### 粗线属性（bold）
- **场景**：用视觉线宽表达语义重要性。例如都市小说中，"粗线"绘制的城市代表经济/军事能力更强
- **实现方式**：在 style 对象中增加 `bold: true` 选项，渲染时将 lineWidth 乘以系数（2x）
- **用户操作**：在标识表单中增加"粗线"复选框
- **适用于所有标识类型**

#### 向后兼容

加载旧 JSON 时自动转换：
- `rangeMarkers` 的 `rect`（四顶点）→ `geoMarkers` 的 `rect`（x/y/w/h）
- `rangeMarkers` 的 `circle` → `geoMarkers` 的 `ellipse`（rx=ry=原半径）
- `geoMarkers` 缺 `style` 字段时使用默认值
- `geoMarkers` 缺 `presetType` 时设为 `null`
- 保存时保留 `rangeMarkers: []` 空数组兼容旧版本

#### JSON 存储格式（扩展后）

```json
{
  "mapName": "字符串",
  "scale": 1,
  "mapSize": 2000,
  "unit": {"name": "里", "desc": "1里=500米"},
  "notes": [...],
  "rangeMarkers": [],
  "geoMarkers": [
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
    },
    {
      "id": "geo_1700000002",
      "presetType": "forest",
      "type": "polygon",
      "name": "迷雾森林",
      "points": [{"x": 100, "y": 400}, {"x": 300, "y": 350}, {"x": 350, "y": 550}, {"x": 150, "y": 600}],
      "style": {
        "strokeColor": "#27ae60",
        "lineWidth": 2,
        "lineDash": null,
        "fillColor": "rgba(39,174,96,0.2)",
        "bold": false
      }
    },
    {
      "id": "geo_1700000003",
      "presetType": "lake",
      "type": "ellipse",
      "name": "镜湖",
      "cx": 500, "cy": 800,
      "rx": 180, "ry": 120,
      "style": {
        "strokeColor": "#2e86c1",
        "lineWidth": 2,
        "lineDash": null,
        "fillColor": "rgba(46,134,193,0.25)",
        "bold": false
      }
    },
    {
      "id": "geo_1700000004",
      "presetType": "city",
      "type": "rect",
      "name": "长安城",
      "x": 800, "y": 600,
      "width": 200, "height": 150,
      "style": {
        "strokeColor": "#e74c3c",
        "lineWidth": 2,
        "lineDash": null,
        "fillColor": "rgba(231,76,60,0.12)",
        "bold": true
      }
    },
    {
      "id": "geo_1700000005",
      "presetType": "village",
      "type": "pin",
      "name": "枯木村",
      "x": 280,
      "y": 420,
      "style": {
        "strokeColor": "#f39c12",
        "lineWidth": 2,
        "lineDash": null,
        "fillColor": null,
        "bold": false
      }
    }
  ],
  "mapRelations": [...],
  "createTime": "2024-01-01 12:00:00",
  "lastSaved": "2024-01-01 12:00:00"
}
```

---

### 量化单位功能（必须）

- **设置**：表单提交 `saveUnitSetting`，输入单位名称与说明文字（如 `1里=500米`）
- **存储**：`state.unit = {name, desc}`，显示在右下角 `unitDescDisplay`
- **持久化**：与地图数据一起序列化到 JSON

### 地图关联功能（必须）

- **创建**：表单提交 `addMapRelation`
- **必填字段**：当前地图名称、目标地图名称、两侧坐标 (x,y)
- **坐标格式**：`数字,数字`，范围 0~2000
- **目标校验**：目标地图必须已在 `state.savedMaps` 中
- **双向关联**：创建正向关系对象加入 `state.mapRelations`，同时在目标地图 `savedMaps[target].mapRelations` 中创建反向关系，并直接写入目标地图的 JSON 文件
- **显示**：Canvas 在 `currentXY` 位置绘制 🚪 emoji + 目标地图名称标签
- **删除**：`deleteRelation(relationId)` 同时删除正向和对应反向关联，并更新目标地图的 JSON 文件

### JSON 存储功能（必须）

- **保存方式**：
  - 💾 保存地图 — 保存当前地图（有工作目录时直接写文件，无目录时降级下载）
  - 📦 导出所有地图 — 导出全部已保存地图为一个 JSON 文件
- **工作目录（File System Access API）**：
  - 支持选择本地目录作为工作目录，目录句柄存入 IndexedDB 持久化
  - 有工作目录时：保存直接写 `{mapName}.json`，加载显示目录文件列表
  - 无工作目录时：降级到原生 `saveAs`（URL.createObjectURL + a.download）+ `<input type="file">` 加载
  - 兼容性：Chrome/Edge 86+，不支持时自动降级
  - 切换目录时自动清空当前数据并确认
- **读取**：`loadMap`（单文件）/ `loadMapFromDir`（从目录读取），校验必需字段 `scale, unit, notes, rangeMarkers, mapRelations`
- **批量导入**：`batchLoadMaps` 多文件读取、校验、添加至 `state.mapList` 与 `state.savedMaps`
- **工作目录切换**：切换前清空当前数据并确认，防止旧数据污染新目录

### 批量导入功能（可选）

- **触发**："批量导入地图（可选）"按钮 → 多文件选择
- **实现**：`batchLoadMaps` 读取多个 JSON，校验后存入 `state.mapList` 与 `state.savedMaps`
- **展示**：右上角列表，点击 `switchMap(index)` 切换显示
- **关联支持**：导入后自动保存至 `savedMaps`，供后续地图关联使用

### 新建地图功能（重要）

- **触发**："新建地图"按钮
- **实现**：不刷新页面，调用 `clearAllData()` 重置当前状态为空白地图，同时重置 `mapName` 为空让用户输入新名称
- **与批量导入的区别**：新建是创建一张空白地图，批量导入是从文件加载已有地图
- **注意事项**：新建前检查当前是否有未保存的修改，如有则提示保存

### 地图关联坐标去重检查（重要）

- **触发**：`addMapRelation()` 执行时
- **校验逻辑**：检查当前地图中 `currentXY` 坐标是否已被其他关联占用，检查目标地图中 `targetXY` 坐标是否已被占用
- **冲突处理**：如发现重复坐标，弹出提示 "该坐标已存在关联，坐标: (x,y) → 目标地图: xxx"，阻止创建
- **覆盖规则**：同一源坐标允许指向不同目标坐标（多出口），但同一目标坐标不允许被多个关联指向（防传送混乱）

### 切换工作目录时清空旧数据（重要）

- **触发**：再次点击"选择工作目录"选择新目录时（`selectWorkDir`）
- **实现**：切换目录前，调用 `clearAllData()` 清空当前画布、坐标点、范围标识、关联等所有数据
- **重新加载**：切换后自动列出新目录下的 .json 文件列表，用户可选择加载
- **提示**：切换前弹出确认框 "切换工作目录将清空当前未保存的数据，是否继续？"

### 完全离线化（必须）

- **目标**：移除所有 CDN 依赖，工具可完全离线运行
- **FileSaver.js 替代**：使用原生 JS 实现 `saveAs` 功能：
  ```javascript
  function nativeSaveAs(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  ```
- **移除内容**：删除 `<script src="https://...FileSaver.js">` CDN 引用
- **验证**：断网状态下打开 HTML 文件，所有功能正常工作

### 数据清空功能（重要）

- **触发**："清空所有数据"按钮 `clearAllData`
- **实现**：重置 `state` 所有字段为默认值，可额外确认是否一并删除 `savedMaps`，UI 各输入框恢复默认占位

### 列表同步更新（必须）

- **函数**：`updateNoteList / updateMarkerList / updateRelationList / updateMapList`
- **实现**：每次数据变动后调用，动态生成功能区 HTML 列表，提供查看/编辑/删除快捷按钮

---

## 2. JSON 存储格式（代码实际使用）

```json
{
  "mapName": "字符串（用户输入的地图名称）",
  "scale": 1,
  "mapSize": 2000,
  "unit": {
    "name": "里",
    "desc": "1里=500米"
  },
  "notes": [
    {
      "id": "note_时间戳",
      "name": "坐标点名称",
      "x": 500,
      "y": 500,
      "content": "备注内容（≤200字符）"
    }
  ],
  "rangeMarkers": [
    {
      "id": "marker_时间戳",
      "name": "标识名称",
      "type": "rect",
      "params": {
        "x1": 100, "y1": 100,
        "x2": 300, "y2": 100,
        "x3": 300, "y3": 300,
        "x4": 100, "y4": 300
      }
    },
    {
      "id": "marker_时间戳",
      "name": "圆形标识",
      "type": "circle",
      "params": {
        "cx": 500, "cy": 500, "r": 100
      }
    }
  ],
  "mapRelations": [
    {
      "id": "relation_时间戳",
      "currentMapName": "主世界",
      "currentXY": "100,900",
      "targetMapName": "火焰秘境",
      "targetXY": "100,900"
    }
  ],
  "createTime": "2024-01-01 12:00:00",
  "lastSaved": "2024-01-01 12:00:00"
}
```

---

## 3. 功能优先级（基于代码实现）

| 优先级 | 功能 |
|--------|------|
| **必须** | 缩放、滑动、坐标点（含备注框）、范围标识、量化单位、地图关联（双向，JSON 双写）、JSON 存储与读取（File System Access API + 原生 saveAs 降级）、列表同步更新、交互细节（备注≤200字、数值0~2000、备注框外点击关闭等）、完全离线化（零 CDN 依赖） |
| **重要** | 批量导入（多地图管理）、数据清空（快速复位）、新建地图（不刷新创建空白地图）、地图关联坐标去重检查、切换工作目录清空旧数据 |
| **可选** | UI 美化、样式自定义、更多导出格式等（当前代码未实现） |

---

## 4. 技术实现概览

### 技术栈

- **HTML5 + CSS3**：单文件结构，样式写在 `<style>` 中
- **原生 JavaScript (ES6+)**：Canvas 2D 绘制地图与标记
- **原生 saveAs 实现**：替代 FileSaver.js，使用 `URL.createObjectURL` + `<a download>` 实现客户端 JSON 下载
- **浏览器原生 API**：FileReader、Blob、prompt、alert
- **零外部依赖**：无 CDN 引用，完全离线可用

### 整体架构

```
小说地图工具.html
│
├─ <head>：CSS 样式（无外部脚本引用）
└─ <body>
   ├─ .header            → 固定顶部导航栏
   ├─ .main-container    → flex 布局
   │   ├─ .func-panel    → 左侧功能面板（文件操作、坐标点、范围标识、单位、关联、批量导入）
   │   └─ .map-container → 右侧地图面板（canvas + 备注框 + 单位显示 + 地图列表）
   └─ <script>            → 所有业务逻辑
```

### 状态管理

全局 `state` 对象，存放所有运行时数据：`scale`、`offsetX/Y`、`notes`、`rangeMarkers`、`mapRelations`、`unit`、`savedMaps`、拖拽状态等。

### 关键函数

| 函数 | 模块 | 作用 |
|------|------|------|
| `renderMap()` | 渲染 | 根据 `state` 绘制完整地图（网格、坐标轴、标识、关联、点） |
| `handleWheel(e)` | 缩放 | 计算 delta（±0.1），限制 scale 在 [0.1, 2]，重绘 |
| `handleMouseDown/Move/Up(e)` | 平移 | 记录拖拽起点、计算位移、更新 offset、重绘 |
| `handleCanvasClick(e)` | 添加坐标点 | 非拖拽时逆向计算地图坐标，prompt 获取信息，创建 note |
| `addManualNote()` | 手动添加 | 从表单读取并校验，生成 note |
| `showNoteBox(noteId)` | 备注框 | 根据坐标弹出备注框，支持编辑/删除 |
| `saveUnitSetting()` | 量化单位 | 读取表单，更新 `state.unit` 并显示 |
| `addRangeMarker()` | 范围标识 | 校验参数，生成 marker 并加入 `state.rangeMarkers` |
| `editMarker(id)` / `deleteMarker(id)` | 范围标识编辑 | 填表单后删除原对象或直接删除 |
| `addMapRelation()` | 地图关联 | 校验字段、目标地图，创建正向与反向关联 |
| `deleteRelation(id)` | 关联删除 | 同时删除正向和反向关联 |
| `saveCurrentMap()` / `exportAllMaps()` | JSON 导出 | 有工作目录时 `saveToDir` 直写文件，否则原生 `saveAs` 下载 |
| `selectWorkDir()` / `listMapFiles()` / `loadMapFromDir()` | 工作目录 | File System Access API 目录选择、文件列表、直接加载 |
| `loadMap(e)` | JSON 读取 | FileReader 读取、parse、校验、写入 state |
| `batchLoadMaps(e)` | 批量导入 | 多文件读取、校验、加入 mapList 和 savedMaps |
| `switchMap(index)` | 地图切换 | 从 mapList 读取数据覆盖当前 state |
| `clearAllData()` | 数据清空 | 重置 state 所有字段 |
| `createNewMap()` | 新建地图 | 不刷新页面创建空白地图，重置状态 |
| `nativeSaveAs(blob, filename)` | 离线下载 | 原生实现替代 FileSaver.js |
