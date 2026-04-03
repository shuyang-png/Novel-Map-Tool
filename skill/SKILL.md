---
name: novel-map-api
description: 小说地图数据构建 API。用户需要创建、编辑小说地图时触发——通过编程式 API 操作地图数据（坐标点、地理标识、关联等），自动生成合法 JSON。触发词同 novel-map-tool。实验性技能，Agent 直接调用函数操作地图，不需要手写 JSON。
---

# Novel Map API

## 核心认知

通过 JS API 操作地图数据，自动生成合法 JSON。Agent 不需要手写 JSON，不需要理解 HTML/DOM。

地图最终由 `小说地图工具.html` 渲查看。

## 快速开始

```javascript
const { NovelMap } = require('./scripts/map-api.js');

const map = new NovelMap("苍澜世界", { name: "米", desc: "1仙里=50千米" });
map.addNote("主角出生地", 1000, 800, "故事起点");
map.addGeo("城市", "凌霄城", { x: 900, y: 900, w: 200, h: 200 });
map.addGeo("河流", "忘川河", { points: [[200,400],[400,600],[600,400]] });
map.addRelation("200,1800", "火焰秘境", "1000,1000");
map.saveMap("苍澜世界.json");
```

## API 速查

### 地图

| API | 说明 |
|------|------|
| `new NovelMap(name, unit)` | 创建新地图 |
| `NovelMap.loadMap(path)` | 从 JSON 文件加载 |
| `map.saveMap(path)` | 保存到 JSON 文件 |
| `map.toJSON()` | 返回纯 JSON 对象 |
| `map.validate()` | 校验 → `{ valid, errors[] }` |
| `map.stats()` | 统计信息 |
| `map.clearAll()` | 清空所有数据 |
| `map.setUnit(name, desc)` | 设置距离单位 |

### 坐标点

| API | 说明 |
|------|------|
| `map.addNote(name, x, y, content?)` | 添加（x/y 0~2000） |
| `map.editNote(id, updates)` | 编辑 `{name?, x?, y?, content?}` |
| `map.deleteNote(id)` | 删除 |
| `map.listNotes()` | 列出所有 |
| `map.searchNote(query)` | 按名称或内容搜索 |
| `map.findNearestNote(x, y)` | 查找最近坐标点 |

### 地理标识

| API | 说明 |
|------|------|
| `map.addGeo(type, name, params)` | 添加（自动匹配形状+计算 metrics） |
| `map.addEllipse(type, name, {cx,cy,rx,ry})` | 椭圆专用 |
| `map.addPolygon(type, name, {points})` | 多边形专用 |
| `map.addPin(type, name, x, y)` | 标注点专用 |
| `map.editGeo(id, updates)` | 编辑 |
| `map.deleteGeo(id)` | 删除 |
| `map.listGeos()` | 列出所有 |
| `map.searchGeo(query)` | 按名称/预设类型搜索 |

### 地图关联

| API | 说明 |
|------|------|
| `map.addRelation(currentXY, targetMap, targetXY, bidirectional?)` | 双向或单向 |
| `map.deleteRelation(id)` | 删除（同步清理反向） |
| `map.listRelations()` | 列出所有 |

### 版本管理

| API | 说明 |
|------|------|
| `map.createVersion(chapter, label)` | 创建版本（自动 delta，无变更返回 null） |
| `map.listVersions()` | 列出时间轴 |
| `map.getStateAtVersion(v)` | 获取某版本的状态快照 |
| `map.diffVersions(vA, vB)` | 对比两版本差异 |

## addGeo 参数说明

### 面状 — 城市、城堡、森林、湖泊等

```javascript
map.addGeo("城市", "凌霄城", { x: 900, y: 900, w: 200, h: 200 });
```

### 线状 — 河流、山脉、道路等

```javascript
map.addGeo("河流", "忘川河", { points: [[200,400],[400,600],[600,400]] });
map.addGeo("山脉", "断天涯", { points: [[800,200],[1000,300],[1200,200]], geoWidth: 30 });
```

### 点状 — 洞穴、泉眼、村庄等

```javascript
map.addGeo("洞穴", "万年冰洞", { x: 1200, y: 800 });
```

### 椭圆

```javascript
map.addEllipse("湖泊", "镜湖", { cx: 1000, cy: 1000, rx: 300, ry: 250 });
```

### 多边形

```javascript
map.addPolygon("王国", "苍澜国", { points: [[200,200],[800,200],[800,800],[200,800]] });
```

## 可用预设类型（26种）

| 分组 | 预设 |
|------|------|
| 通用 | 通用 |
| 面状 | 城市、城堡、森林、湖泊、海洋、沼泽、草原、沙漠、竹林、王国、营地 |
| 线状 | 河流、山脉、悬崖、道路、城墙、行军路线、桥梁 |
| 点状 | 洞穴、泉眼、火山、雪峰、村庄、庙宇、废墟 |

## 注意事项

- **单位很重要**：`unit.name` 是坐标轴单位，2000 × unit = 世界大小
- **坐标范围**：x/y 均为 0~2000

- **坐标不能重复**：同一坐标 (x, y) 只能有一个坐标点（notes），重复会 `throw Error`。地理标识（geoMarkers）无此限制，允许势力范围/区域重叠
- **实体建筑不能重合**：城市、城堡、村庄、庙宇等人类建筑类 geoMarkers，其区域（`rect`/`polygon`）不得相互重叠。自然地理特征（河流、森林、湖泊、山脉等）允许重叠。除非作者明确要求重叠，否则应主动避开已有建筑
- **metrics 自动计算**，不需要手动填
- **ID 自动生成**，不需要手动指定
- **添加地理标识前，先判断形状**：
  - **椭圆/圆形（ellipse）**：湖泊、海洋、势力范围、王国等天然圆形的区域
  - **矩形（rect）**：城市、城堡、营地、村庄等方正的建筑或规划区域
  - **多边形（polygon）**：不规则边界（国境线、自然林区等）
  - **折线（polyline）**：河流、山脉、道路、城墙等线状特征
  - 默认预设会自动匹配类型（湖泊/海洋/王国默认 ellipse），但创建前应主动确认形状是否符合地理逻辑
- `addGeo` 会根据预设自动匹配形状，如需覆盖可用 `addEllipse()`/`addPolygon()` 专用方法
- `addRelation` 默认双向关联，传 `false` 可关闭
- `createVersion` 无变更时返回 `null`，与工具前端完全兼容

---

## 版本更新约束（重要）

当用户说剧情发展/章节更新时，**不要只堆新标记，必须反映到已有元素上**。

### 正确流程

```
1. loadMap("地图名.json")          // 先加载已有地图
2. searchGeo("关键词")             // 查找受剧情影响的已有地理标识
3. editGeo / deleteGeo             // 修改或删除受影响的元素
4. addNote / addGeo                // 再添加新标记
5. createVersion(chapter, label)    // 记录版本变化
6. saveMap("地图名.json")           // 保存最终地图
```

### 关键：必须修改已有元素

| 情节 | 错误做法 | 正确做法 |
|------|---------|---------|
| 森林被毁 | 只堆新"战毁区"标记，原森林保留 | `editGeo` 缩小/改名，或 `deleteGeo` 删除原森林 |
| 城池占领 | 添加新城池在旁边 | `editGeo` 修改所有者备注 |
| 河流改道 | 新增一条河 | `editGeo` 修改原河流 points |
| 宗门覆灭 | 加新的废墟标记 | `editGeo` 把宗门改为"废墟"预设 |

**原则：先找到已有元素，修改/删除它，再建新标记，最后 `createVersion`。`createVersion` 必须放在所有修改完成后调用，才能正确记录 delta。**

### 版本更新检查清单

1. [ ] 是否 `loadMap` 了已有地图？（不是从零开始）
2. [ ] 是否 `searchGeo` / `searchNote` 找了受影响的元素？
3. [ ] 是否 `editGeo` / `deleteGeo` 修改了受影响元素？
4. [ ] 是否 `createVersion` 放在所有修改之后？
5. [ ] 保存的文件名是否与原地图一致？（`saveMap("原名.json")`）
