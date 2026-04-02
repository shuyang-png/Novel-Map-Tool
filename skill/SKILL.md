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

### 1. 创建或找到地图 JSON

```bash
find <工作目录> -name "*.json" | head -20
```

不存在则用上方模板创建新文件。

### 2. 直接修改 JSON

用 `read` 读取 → 修改 `notes`/`geoMarkers`/`mapRelations` 数组 → 用 `write` 写回。

**添加坐标点：**

```json
{
  "id": "note_<当前时间戳>",
  "name": "长安城",
  "x": 1000,
  "y": 800,
  "content": "帝都"
}
```

**添加地理标识（矩形城市）：**

```json
{
  "id": "geo_<当前时间戳>",
  "presetType": "城市",
  "type": "rect",
  "name": "洛阳",
  "x": 600, "y": 400,
  "width": 200, "height": 150,
  "style": {
    "strokeColor": "#e74c3c", "lineWidth": 2, "lineDash": null,
    "fillColor": "rgba(231,76,60,0.12)", "bold": true, "symbol": "grid"
  }
}
```

**添加地理标识（折线河流）：**

```json
{
  "id": "geo_<当前时间戳>",
  "presetType": "河流",
  "type": "polyline",
  "name": "青龙河",
  "points": [{"x": 200, "y": 100}, {"x": 500, "y": 300}],
  "style": {
    "strokeColor": "#5dade2", "lineWidth": 3, "lineDash": null,
    "fillColor": null, "bold": false, "symbol": "arrows"
  }
}
```

### 3. 用户预览

用户用浏览器打开 `小说地图工具.html`，通过工作目录加载 JSON 即可看到效果。

## 编辑规则

- ID 生成：`Date.now()`，格式 `note_<ms>` / `geo_<ms>` / `relation_<ms>`
- 坐标范围：0~2000 整数
- 备注 ≤ 200 字
- 预设默认样式见 geo.js 中 `GEO_PRESETS`，直接用默认值即可
- `lineOnly` 预设（河流、山脉、道路等）只能用 `polyline`
- 面状预设（森林、城市、王国等）不能用 `polyline`
- 删除元素：从对应数组中移除
- `rangeMarkers` 已废弃，保留空数组 `[]` 即可
