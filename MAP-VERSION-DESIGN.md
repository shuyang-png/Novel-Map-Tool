# 地图版本管理方案

## 设计目标

- **JSON 单一数据源**（后续做成 skill）
- **增量版本**（不存完整快照，省 token）
- **基底与变更分离**（地图文件 + 版本文件）
- **AI 与作者共用同一套数据**
- **版本时间轴**（可回看任意章节的战况）

---

## 文件命名规则

```
{地图名}.json                  ← 地图本体
{地图名}.versions.json         ← 版本变更流
```

---

## 地图文件 schema

基于工具现有字段，新增 `faction` 和 `factions` 用于领地归属追踪。

```jsonc
{
  // 基础信息（工具已有字段）
  "mapName": "深水秘境",
  "scale": 0.2,
  "mapSize": 2000,
  "unit": { "name": "里", "desc": "1里=500米" },
  "createTime": "2026/3/27 14:03:35",
  "lastSaved": "2026/3/27 14:03:35",

  // 势力定义（新增）
  "factions": [
    { "id": "fac_001", "name": "蛟龙族", "color": "#1e88e5" },
    { "id": "fac_002", "name": "水月宫", "color": "#ab47bc" }
  ],

  // 地点（工具已有，新增 faction 字段）
  "notes": [
    {
      "id": "note_001",
      "name": "龙王祭坛",
      "x": 655,
      "y": 668,
      "content": "深水秘境核心",
      "faction": "fac_001"          // 新增：归属势力 id
    }
  ],

  // 范围（工具已有，新增 faction 字段）
  "rangeMarkers": [
    {
      "id": "range_001",
      "name": "蛟龙族领海",
      "shape": "circle",
      "cx": 655, "cy": 668, "r": 300,
      "color": "#1e88e5",
      "faction": "fac_001"          // 新增
    }
  ],

  // 连接（工具已有）
  "mapRelations": [
    { "id": "rel_001", "from": "note_001", "to": "note_002", "label": "水路" }
  ]
}
```

### 字段说明

| 字段 | 类型 | 说明 |
|---|---|---|
| `mapName` | string | 地图名称 |
| `scale` | number | 比例尺 |
| `mapSize` | number | 画布尺寸（像素） |
| `unit.name` | string | 距离单位 |
| `unit.desc` | string | 单位说明 |
| `factions[]` | array | 势力列表 |
| `factions[].id` | string | 势力唯一 id |
| `factions[].name` | string | 势力名称 |
| `factions[].color` | string | 显示颜色（hex） |
| `notes[]` | array | 地点/节点列表 |
| `notes[].id` | string | 地点唯一 id |
| `notes[].name` | string | 地点名称 |
| `notes[].x` | number | X 坐标 |
| `notes[].y` | number | Y 坐标 |
| `notes[].content` | string | 备注 |
| `notes[].faction` | string? | 归属势力 id（可选） |
| `rangeMarkers[]` | array | 范围标记列表 |
| `rangeMarkers[].id` | string | 唯一 id |
| `rangeMarkers[].name` | string | 名称 |
| `rangeMarkers[].shape` | string | 形状（circle/rect） |
| `rangeMarkers[].cx/cy/r` | number | 圆形：圆心+半径 |
| `rangeMarkers[].x/y/w/h` | number | 矩形：位置+宽高 |
| `rangeMarkers[].color` | string | 颜色 |
| `rangeMarkers[].faction` | string? | 归属势力 id（可选） |
| `mapRelations[]` | array | 连接关系列表 |
| `mapRelations[].id` | string | 唯一 id |
| `mapRelations[].from` | string | 起点 id |
| `mapRelations[].to` | string | 终点 id |
| `mapRelations[].label` | string | 连接类型 |

---

## 版本文件 schema

```jsonc
{
  "mapId": "深水秘境",             // 关联的地图名称
  "currentVersion": 3,             // 当前最新版本号
  "versions": [
    {
      "v": 1,                      // 版本号（从 1 开始递增）
      "chapter": 3,                // 关联章节号
      "label": "水月宫入侵秘境",    // 人类可读描述
      "delta": {
        "add": [],                 // 新增元素
        "update": [],              // 修改已有元素（patch）
        "remove": []               // 移除元素（id 数组）
      }
    }
  ]
}
```

### delta 操作语义

| 操作 | 说明 | 示例 |
|---|---|---|
| `add` | 新增一个完整对象，推入对应数组 | 新增地点、新增范围、新增连接 |
| `update` | patch 语义，按 id 匹配，只改指定字段 | 改归属、改坐标、改备注 |
| `remove` | 移除指定 id 的元素 | id 字符串数组 |

### delta 中 add 的自动归类

add 对象根据其字段自动归入对应数组：
- 含 `x,y` 且不含 `from,to`、不含 `shape` → 推入 `notes`
- 含 `shape`（circle/rect） → 推入 `rangeMarkers`
- 含 `from,to` → 推入 `mapRelations`

---

## 增量叠加算法

```
初始状态 = 地图文件（notes + rangeMarkers + mapRelations）
  ↓ 应用 v1 delta: add → update → remove
v1 状态
  ↓ 应用 v2 delta
v2 状态
  ↓ ...
目标版本状态
```

### 伪代码

```javascript
function getStateAtVersion(baseMap, versionsFile, targetV) {
  // 深拷贝基底
  const state = {
    notes:        structuredClone(baseMap.notes),
    rangeMarkers: structuredClone(baseMap.rangeMarkers),
    mapRelations: structuredClone(baseMap.mapRelations)
  };

  for (const ver of versionsFile.versions) {
    if (ver.v > targetV) break;
    const d = ver.delta;

    // add: 根据字段自动归类
    for (const item of (d.add || [])) {
      if (item.from && item.to)         state.mapRelations.push(item);
      else if (item.shape)              state.rangeMarkers.push(item);
      else                              state.notes.push(item);
    }

    // update: patch，按 id 匹配
    for (const patch of (d.update || [])) {
      const target = state.notes.find(n => n.id === patch.id)
        || state.rangeMarkers.find(r => r.id === patch.id)
        || state.mapRelations.find(r => r.id === patch.id);
      if (target) {
        for (const key of Object.keys(patch)) {
          if (key !== 'id') target[key] = patch[key];
        }
      }
    }

    // remove: 按 id 移除
    for (const id of (d.remove || [])) {
      state.notes        = state.notes.filter(n => n.id !== id);
      state.rangeMarkers = state.rangeMarkers.filter(r => r.id !== id);
      state.mapRelations = state.mapRelations.filter(r => r.id !== id);
    }
  }

  return state;
}
```

---

## 版本时间轴

### UI

```
┌──────────────────────────────────────────────────────┐
│ v0 初始 — v1 @ch3 — v2 @ch7 — v3 @ch10              │
│   ●────────────●────────────●────────────●           │ ◄─ 下拉框 / 滑块
└──────────────────────────────────────────────────────┘
```

### 查询接口

```javascript
function getTimeline(versionsFile) {
  return [
    { v: 0, chapter: null, label: "初始状态", changeCount: 0 },
    ...versionsFile.versions.map(v => ({
      v: v.v,
      chapter: v.chapter,
      label: v.label,
      changeCount: (v.delta.add?.length || 0)
                 + (v.delta.update?.length || 0)
                 + (v.delta.remove?.length || 0)
    }))
  ];
}
```

### 行为规则

| 场景 | 处理 |
|---|---|
| 选择某个版本 | 调用 `getStateAtVersion()` 渲染画布 |
| 非最新版本 | 顶部提示：`📍 正在查看 v2 @ch7 — 非最新版本` |
| 非最新版本上操作 | **禁止修改**，只能查看 |
| 版本对比 | 算出两个版本状态，高亮差异 |

### 版本对比

```javascript
function diffVersions(baseMap, versionsFile, vA, vB) {
  const stateA = getStateAtVersion(baseMap, versionsFile, vA);
  const stateB = getStateAtVersion(baseMap, versionsFile, vB);

  return {
    added:    stateB.notes.filter(b => !stateA.notes.find(a => a.id === b.id)),
    removed:  stateA.notes.filter(a => !stateB.notes.find(b => b.id === a.id)),
    modified: stateB.notes.filter(b => {
      const a = stateA.notes.find(x => x.id === b.id);
      return a && JSON.stringify(a) !== JSON.stringify(b);
    })
  };
}
```

---

## AI Prompt 注入

### 按需加载

| 场景 | 加载内容 |
|---|---|
| 只看当前状态 | 地图文件 |
| 当前 + 近期变化 | 地图文件 + versions 最后 2 条 |
| 指定章节 | 地图文件 + versions 过滤到该章 |

### 注入格式

```
【深水秘境 · v3 @ch10】

势力: 蛟龙族(#1e88e5) 水月宫(#ab47bc) 散修盟(#43a047)

地点:
  龙王祭坛 (655,668) → 蛟龙族 — 蛟龙族夺回圣地
  沉渊入口 (420,510) → 蛟龙族 — 入口被蛟龙族封锁

近期变更:
  [v2 @ch7] 散修盟争夺龙王祭坛，散修盟临时控制
  [v3 @ch10] 蛟龙族反攻夺回圣地，封锁入口，散修营地消失
```

---

## 完整示例：深水秘境（4 个版本）

### 地图文件：深水秘境.json

```json
{
  "mapName": "深水秘境",
  "scale": 0.2,
  "mapSize": 2000,
  "unit": { "name": "里", "desc": "1里=500米" },
  "createTime": "2026/3/27 14:03:35",
  "lastSaved": "2026/3/27 14:03:35",
  "factions": [
    { "id": "fac_001", "name": "蛟龙族", "color": "#1e88e5" },
    { "id": "fac_002", "name": "水月宫", "color": "#ab47bc" },
    { "id": "fac_003", "name": "散修盟", "color": "#43a047" }
  ],
  "notes": [
    {
      "id": "note_001",
      "name": "龙王祭坛",
      "x": 655, "y": 668,
      "content": "深水秘境核心，蛟龙族圣地",
      "faction": "fac_001"
    }
  ],
  "rangeMarkers": [],
  "mapRelations": []
}
```

### 版本文件：深水秘境.versions.json

```json
{
  "mapId": "深水秘境",
  "currentVersion": 3,
  "versions": [
    {
      "v": 1, "chapter": 3, "label": "水月宫入侵秘境",
      "delta": {
        "add": [
          {
            "id": "note_002", "name": "沉渊入口",
            "x": 420, "y": 510,
            "content": "水月宫打通的秘境入口",
            "faction": "fac_002"
          }
        ],
        "update": [],
        "remove": []
      }
    },
    {
      "v": 2, "chapter": 7, "label": "散修盟争夺龙王祭坛",
      "delta": {
        "add": [
          {
            "id": "note_003", "name": "散修营地",
            "x": 580, "y": 720,
            "content": "散修盟临时据点",
            "faction": "fac_003"
          }
        ],
        "update": [
          {
            "id": "note_001",
            "faction": "fac_003",
            "content": "三方混战后被散修盟暂时控制"
          }
        ],
        "remove": []
      }
    },
    {
      "v": 3, "chapter": 10, "label": "蛟龙族反攻",
      "delta": {
        "add": [],
        "update": [
          { "id": "note_001", "faction": "fac_001", "content": "蛟龙族夺回圣地" },
          { "id": "note_002", "faction": "fac_001", "content": "入口被蛟龙族封锁" }
        ],
        "remove": ["note_003"]
      }
    }
  ]
}
```

### 状态推导

```
base (v0):
  龙王祭坛 → 蛟龙族

v1 (ch3):
  + 沉渊入口 → 水月宫

v2 (ch7):
  + 散修营地 → 散修盟
  ~ 龙王祭坛 → 散修盟

v3 (ch10):
  ~ 龙王祭坛 → 蛟龙族（夺回）
  ~ 沉渊入口 → 蛟龙族（封锁）
  - 散修营地（移除）

v3 最终:
  龙王祭坛 → 蛟龙族
  沉渊入口 → 蛟龙族
```

---

## 主地图适配

主地图（数十领地、数十版本）的核心策略：

| 问题 | 策略 |
|---|---|
| 地图文件会不会膨胀 | 不会。基底数据稳定，版本信息不存这里 |
| 版本文件会不会膨胀 | 增量 delta，100 个版本约 ~50KB |
| 叠加计算慢 | 缓存 getStateAtVersion() 结果，版本数 <100 毫秒级 |
| AI token 过多 | 只加载地图文件 + 目标版本之前的最后 N 条 delta |
| 多区域地图 | 每个区域独立一个 {区域名}.json + {区域名}.versions.json |
