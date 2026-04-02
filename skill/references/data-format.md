# 地图数据格式参考

## JSON 根结构

```json
{
  "mapName": "地图名称",
  "scale": 1,
  "offsetX": 0,
  "offsetY": 0,
  "mapSize": 2000,
  "unit": { "name": "里", "desc": "1里=500米" },
  "notes": [],
  "geoMarkers": [],
  "rangeMarkers": [],
  "mapRelations": [],
  "versions": null
}
```

## notes（坐标点）

```json
{
  "id": "note_<timestamp>",
  "name": "长安城",
  "x": 1000,
  "y": 800,
  "content": "帝都，人口百万"
}
```

- `x`, `y`: 0~2000 整数
- `content`: ≤200字

## geoMarkers（地理标识）

### 通用字段

```json
{
  "id": "geo_<timestamp>",
  "presetType": "河流",
  "type": "polyline",
  "name": "青龙河",
  "geoWidth": 8,
  "geoWidthDesc": "最宽处8里约4千米",
  "metrics": { "length": 665, "lengthDesc": "约665里" },
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

- `geoWidth` / `geoWidthDesc`（可选）：polyline 专用，地图单位宽度
- `metrics`（可选）：预计算的面积/长度，供作者参考
  - polyline → `{ length, lengthDesc }`
  - rect/polygon/ellipse → `{ area, areaDesc }`
  - pin → 不需要

### 按 type 区分的坐标字段

| type | 坐标字段 |
|------|----------|
| `polyline` | `points: [{x, y}, ...]` （≥2个顶点） |
| `polygon` | `points: [{x, y}, ...]` （≥3个顶点） |
| `rect` | `x, y, width, height` |
| `ellipse` | `cx, cy, rx, ry` |
| `pin` | `x, y` |

### 26种预设

| 分组 | 预设 | 约束 |
|------|------|------|
| 通用 | 通用 | 无约束 |
| 水域 | 河流 | lineOnly（只能折线） |
| 水域 | 湖泊 | 面状 |
| 水域 | 海洋 | 面状 |
| 水域 | 泉眼 | 无约束 |
| 植被 | 森林 | 面状 |
| 植被 | 沼泽 | 面状 |
| 植被 | 草原 | 面状 |
| 植被 | 沙漠 | 面状 |
| 植被 | 竹林 | 面状 |
| 地形 | 山脉 | lineOnly |
| 地形 | 悬崖 | lineOnly |
| 地形 | 火山 | 无约束 |
| 地形 | 雪峰 | 无约束 |
| 地形 | 洞穴 | 无约束 |
| 建筑/人文 | 城市 | 面状 |
| 建筑/人文 | 城堡 | 面状 |
| 建筑/人文 | 村庄 | 无约束 |
| 建筑/人文 | 庙宇 | 无约束 |
| 建筑/人文 | 废墟 | 无约束 |
| 道路/边界 | 道路 | lineOnly |
| 道路/边界 | 城墙 | lineOnly |
| 道路/边界 | 行军路线 | lineOnly |
| 道路/边界 | 桥梁 | lineOnly |
| 范围/区域 | 王国 | 面状 |
| 范围/区域 | 营地 | 面状 |

- `lineOnly`: 只能用折线（polyline）
- 面状：不能用折线，可用矩形/椭圆/多边形
- 无约束：所有形状都可选

### 预设默认样式

见 geo.js 中 `GEO_PRESETS` 对象，每个预设有默认 `strokeColor`、`lineWidth`、`fillColor`、`bold`、`symbol`。

## mapRelations（地图关联）

```json
{
  "id": "relation_<timestamp>",
  "currentMapName": "主世界",
  "currentXY": "200,1800",
  "targetMapName": "火焰秘境",
  "targetXY": "1000,1000"
}
```

## versions（版本管理）

```json
{
  "mapId": "主世界地图",
  "currentVersion": 1,
  "versions": [
    {
      "v": 1,
      "chapter": "第一章",
      "label": "初始版本",
      "timestamp": 1700000000000,
      "changes": [
        { "type": "note", "action": "add", "data": { "id": "note_xxx", "name": "长安城", "x": 1000, "y": 800, "content": "帝都" } }
      ]
    }
  ]
}
```

## ID 生成规则

- 坐标点: `note_<Date.now()>`
- 地理标识: `geo_<Date.now()>`
- 关联: `relation_<Date.now()>`
