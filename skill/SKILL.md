---
name: novel-map-tool
description: 纯前端小说地图编辑工具。用户需要创建、编辑、查看小说地图时触发——包括添加坐标点、绘制地理标识（河流/森林/城市等）、管理地图关联、版本回溯等。触发词包括"地图""小说地图""地图工具""编辑地图""地图元素"等。
---

# 小说地图工具

## 核心认知

纯前端工具，HTML + JS，零依赖，无需 Node.js。
地图数据 = 一个 JSON 文件。Agent 通过**直接操作 JSON** 来编辑地图，用户用浏览器打开 HTML 查看。

## 数据格式

详细 JSON 结构见 [references/data-format.md](references/data-format.md)。

### 空白地图模板

```json
{
  "mapName": "地图名称",
  "scale": 1, "offsetX": 0, "offsetY": 0, "mapSize": 2000,
  "unit": { "name": "里", "desc": "1里=500米" },
  "notes": [], "geoMarkers": [], "rangeMarkers": [], "mapRelations": [], "versions": null
}
```

## Agent 编辑流程

### 1. 确定世界规模，设定距离单位

**这一步必须最先做。** 根据用户描述的世界观设定合理的距离单位，修改 `unit` 字段。

| 世界观 | 推荐单位 | 示例 |
|--------|----------|------|
| 现实/古代 | 里 | `1里=500米` |
| 仙侠大世界 | 万里/仙里 | `1仙里=100里=50千米` |
| 星际/多元宇宙 | 星距 | `1星距=1光年` |
| 小型区域（城池/庄园） | 丈/步 | `1丈≈3.3米` |

单位影响地图上标注的距离感，务必根据世界观调整。

### 2. 创建或找到地图 JSON

```bash
find <工作目录> -name "*.json" | head -20
```

不存在则用上方模板创建新文件。

### 3. 直接修改 JSON

用 `read` 读取 → 修改 `notes`/`geoMarkers`/`mapRelations` 数组 → 用 `write` 写回。

### 4. 用户预览

用户用浏览器打开 `小说地图工具.html`，通过工作目录加载 JSON 即可看到效果。

## 关键决策：用坐标点还是地理标识？

**优先用地理标识（geoMarkers），坐标点（notes）只用于没有面积的纯粹标记。**

| 场景 | 用什么 | 示例 |
|------|--------|------|
| 城池、宫殿、宗门 | `geoMarkers` rect | 凌霄城、东海龙宫、天剑宗 |
| 湖泊、森林、草原 | `geoMarkers` rect/ellipse | 镜心湖、迷踪林、落日草原 |
| 山脉、河流、道路 | `geoMarkers` polyline | 昆仑山脉、忘川河 |
| 洞穴、泉眼、传送点 | `geoMarkers` pin | 万年冰洞、灵泉眼 |
| 阵法、结界、领域 | `geoMarkers` ellipse | 护山大阵 |
| 没有面积的纯粹地标 | `notes` | 古战场遗址（仅标记位置） |
| 剧情标记、事件点 | `notes` | 主角出生地、决战之地 |

**原则：有实体建筑或自然区域 → geoMarkers；纯粹的位置标记 → notes。**

### 城池/宫殿的推荐画法

用 `rect` + 预设类型 `城堡` 或 `城市`，给一个合理的范围（100~400 像素），让地图上有可视化的区域：

```json
{
  "id": "geo_<ms>",
  "presetType": "城堡",
  "type": "rect",
  "name": "凌霄城",
  "x": 900, "y": 900,
  "width": 200, "height": 200,
  "style": {
    "strokeColor": "#c0392b", "lineWidth": 4, "lineDash": null,
    "fillColor": "rgba(192,57,43,0.1)", "bold": true, "symbol": "towers"
  }
}
```

## 编辑规则

- ID 生成：`Date.now()`，格式 `note_<ms>` / `geo_<ms>` / `relation_<ms>`
- 坐标范围：0~2000 整数
- 备注 ≤ 200 字
- 预设默认样式见 geo.js 中 `GEO_PRESETS`，直接用默认值即可
- `lineOnly` 预设（河流、山脉、道路等）只能用 `polyline`
- 面状预设（森林、城市、王国等）不能用 `polyline`
- 删除元素：从对应数组中移除
- `rangeMarkers` 已废弃，保留空数组 `[]` 即可
