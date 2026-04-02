---
name: novel-map-tool
description: 纯前端小说地图编辑工具。用户需要创建、编辑、查看小说地图时触发——包括添加坐标点、绘制地理标识（河流/森林/城市等）、管理地图关联、版本回溯等。触发词包括"地图""小说地图""地图工具""编辑地图""地图元素"等。
---

# 小说地图工具

## 核心认知

纯前端工具，HTML + JS，零依赖。地图数据 = 一个 JSON 文件。Agent 通过**直接操作 JSON** 来编辑地图，如同人手工操作。

## 快速部署

启动 HTTP 服务让用户在浏览器中使用工具：

```bash
python3 scripts/serve.py [端口号]   # 默认 8765
```

或手动：

```bash
cd assets && python3 -m http.server 8765
# 浏览器打开 http://localhost:8765/小说地图工具.html
```

## 数据格式速查

详细 JSON 结构见 [references/data-format.md](references/data-format.md)。

核心：地图数据是一个 JSON 对象，包含 `notes`（坐标点）、`geoMarkers`（地理标识）、`mapRelations`（地图关联）三个数组。

## Agent 编辑地图的流程

### 1. 找到或创建地图 JSON

```bash
# 在用户工作目录中查找
find <工作目录> -name "*.json" | head -20
```

如果不存在，创建空白地图：

```json
{
  "mapName": "地图名称",
  "scale": 1, "offsetX": 0, "offsetY": 0, "mapSize": 2000,
  "unit": { "name": "里", "desc": "1里=500米" },
  "notes": [], "geoMarkers": [], "mapRelations": [], "versions": null
}
```

### 2. 直接修改 JSON

用 `read` 读取 JSON → 修改数据 → 用 `write` 写回。

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

**添加地理标识（示例：矩形城市）：**

```json
{
  "id": "geo_<当前时间戳>",
  "presetType": "城市",
  "type": "rect",
  "name": "洛阳",
  "x": 600, "y": 400,
  "width": 200, "height": 150,
  "style": {
    "strokeColor": "#e74c3c",
    "lineWidth": 2,
    "lineDash": null,
    "fillColor": "rgba(231,76,60,0.12)",
    "bold": true,
    "symbol": "grid"
  }
}
```

**添加地理标识（示例：折线河流）：**

```json
{
  "id": "geo_<当前时间戳>",
  "presetType": "河流",
  "type": "polyline",
  "name": "青龙河",
  "points": [{"x": 200, "y": 100}, {"x": 500, "y": 300}, {"x": 800, "y": 250}],
  "style": {
    "strokeColor": "#5dade2",
    "lineWidth": 3,
    "lineDash": null,
    "fillColor": null,
    "bold": false,
    "symbol": "arrows"
  }
}
```

### 3. 让用户预览

启动 HTTP 服务或让用户直接用浏览器打开 HTML。用户刷新页面后在工具中加载地图 JSON 即可看到效果。

## 编辑规则

- ID 用 `Date.now()` 生成，格式：`note_<ms>` / `geo_<ms>` / `relation_<ms>`
- 坐标范围：0~2000 整数
- 备注 ≤ 200 字
- 预设样式默认值见 geo.js 中 `GEO_PRESETS`，一般直接用默认即可
- `lineOnly` 预设（河流、山脉、道路等）只能用 `polyline`
- 面状预设（森林、城市、王国等）不能用 `polyline`，可用 `rect`/`ellipse`/`polygon`
- 删除元素：从对应数组中移除即可

## 不做的事

- 不需要 Node.js、npm 或任何构建工具
- 不要修改 HTML/JS 源码（除非用户明确要求改功能）
- 地图关联只做文字标识，不做跳转
