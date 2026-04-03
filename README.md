# Novel-Map-Tool

纯前端小说地图编辑工具，HTML + JS 模块，打开即用。JSON 文件为核心数据，HTML 为渲染器/编辑器。

## ⚠️ 浏览器要求

> **必须使用 Chrome 86+ 或 Edge 86+**，不支持 Firefox、Safari、移动端浏览器。
>
> 本项目使用 JS 模块化加载（多个 `<script>` 标签），依赖现代浏览器对 ES6 模块、Canvas 2D、File System Access API 的完整支持。Firefox 和 Safari 的 File System Access API 支持不完整，移动端浏览器无法处理鼠标事件。

## 功能列表

### 地图画布
- 2000×2000 像素画布，带网格线和坐标轴
- 鼠标滚轮缩放（0.1x ~ 2x）
- 鼠标拖拽平移
- 自适应窗口大小

### 坐标点
- 点击地图直接添加坐标点（名称 + 备注）
- 左侧面板手动输入坐标添加（X/Y 0~2000）
- **同一坐标 (x, y) 不能重复添加**
- 坐标点列表：查看、删除
- 点击"查看"自动平移定位：地图平滑滑动（300ms ease-out 动画）将坐标点移到画布居中，再弹出备注框

### 地理标识（V2 — 26 种预设）

**26 种预设，7 个分组：**
| 分组 | 预设 |
|------|------|
| 通用 | 通用 |
| 水域 | 河流、湖泊、海洋、泉眼 |
| 植被 | 森林、沼泽、草原、沙漠、竹林 |
| 地形 | 山脉、悬崖、火山、雪峰、洞穴 |
| 建筑/人文 | 城市、城堡、村庄、庙宇、废墟 |
| 道路/边界 | 道路、城墙、行军路线、桥梁 |
| 范围/区域 | 王国、营地 |

**5 种底层形状：** 折线、多边形、矩形、椭圆、标注点（pin）

**交互体验：**
- **鼠标悬停弹窗**：鼠标移到任何标识上弹出名称浮窗 + 类型 + 坐标/尺寸信息
- **地理标识定位**：每个标识的"定位"按钮可平移地图使其居中
- **Pin 标注点**：列表中显示 (x,y) 坐标

### 地图关联
- 双向关联，自动在目标地图创建反向关联
- 关联点在地图上以 🚪 传送门标记显示

### 剧情回溯
- 创建版本、版本时间轴、版本查看模式
- createVersion 自动计算 delta，无变更返回 null

### 文件操作
- 新建/保存/加载地图、清空数据
- 工作目录（File System Access API，Chrome/Edge 86+）

## 文件加载模式

| 场景 | Chrome/Edge | 其他浏览器 |
|------|-------------|-----------|
| 工作目录 | 直读直写 | ❌ 不支持 |
| 无目录 | Download | Download |

## 配套 Skill：novel-map-api

本项目包含一个 **novel-map-api** Skill，提供给支持 Skill/工具调用的 Agent 框架使用。Agent 通过编程式 API 操作地图数据，自动生成合法 JSON，无需手写。

### Skill 安装

```
skill/
├── SKILL.md               ← Skill 说明文档（Agent 读取）
├── scripts/
│   └── map-api.js         ← NovelMap API 实现（Node.js）
└── references/
    └── presets.md         ← 26 种预设模板参数说明
```

**使用方式：** 将 `skill/` 目录整个复制到你的 Agent 框架技能目录中，或让 Agent 直接读取 `SKILL.md` + `scripts/map-api.js`。

`map-api.js` 是纯 Node.js 模块，可通过 `require` 调用：

```javascript
const { NovelMap, PRESETS } = require('./skill/scripts/map-api.js');
```

### Agent 使用流程

```
用户: "创建一份玄幻小说地图"
→ Agent 调用 NovelMap → 生成 世界地图.json

用浏览器打开 小说地图工具.html，加载 JSON 查看/编辑

用户: "第2章，主角故乡被毁"
→ Agent: loadMap → searchGeo → editGeo → createVersion → saveMap
```

### Skill 关键约束

- **坐标点不重复**：同一 (x,y) 只能有一个
- **实体建筑不重叠**（城市/城堡/村庄等）
- **湖泊/海洋/王国默认椭圆**
- **版本更新：必须先 edit/add 再 createVersion**
- **添加前先判断形状**：圆形/矩形/多边形/折线按场景选用

## 技术栈

纯 HTML + CSS + JavaScript，Canvas 2D 渲染，File System Access API，IndexedDB。

## 向后兼容

- `circle` → `ellipse` 自动转换
- `rangeMarkers` → `geoMarkers` 一次性迁移
