# DESIGN-PRESET-GEO-V2.md 方案评审报告

> 评审时间：2026-03-28
> 评审人：地图匠（功能设计工程师）
> 评审依据：REQUIREMENTS.md、TEST-CHECKLIST.md、小说地图工具.html（现有实现）、SOUL.md

---

## 总评

**结论：方案总体合理，但存在 3 个必须修复的兼容性问题和 2 个需要注意的设计细节。**

方案在架构设计（基础形状 + 内部符号两层机制）、优先级划分、UI 交互模式上都与项目约束一致。核心风险集中在现有 `geoMarkers` 数据结构的差异和向后兼容的完整性上。

---

## 逐项评审

### 1. 数据结构与现有 state.geoMarkers 兼容性 ⚠️ 有问题

**现状**（`小说地图工具.html` 第 559 行）：
```javascript
geoMarkers: [], // 地理标识列表：[{id, type, name, points/center+radius, style, arrowEnd}]
```

现有 `geoMarkers` 支持的 type 值为：`polyline`、`polygon`、`circle`、`pin`。
- `circle` 使用 `center: {x,y}` + `radius: number` 格式
- `polyline`/`polygon` 使用 `points: [{x,y},...]` 格式
- `pin` 使用 `x, y` 直接属性
- 所有类型共用 `arrowEnd: boolean` 字段

**设计方案**的 type 值为：`polyline`、`polygon`、`rect`、`ellipse`、`pin`。
- `circle` 被移除，替换为 `ellipse`（`cx, cy, rx, ry` 格式）
- `rect` 是新增类型（`x, y, width, height` 格式）
- 新增 `presetType` 字段

**问题**：

| 编号 | 问题 | 严重度 |
|------|------|--------|
| 1-1 | 现有 `geoMarkers` 中已有的 `circle` 类型使用 `center`+`radius` 格式，与设计中 `ellipse` 的 `cx,cy,rx,ry` 格式不同。迁移函数只处理了 `rangeMarkers` → `geoMarkers` 的迁移，**没有处理已有 `geoMarkers` 中 `circle` → `ellipse` 的转换** | 🔴 必须修复 |
| 1-2 | 现有 `arrowEnd` 字段在设计方案中未提及。当前实现中 polyline 类型支持 `arrowEnd: true` 绘制箭头末端（第 1037-1040 行），设计中河流的箭头改用 `drawArrowsAlongPath` 函数，但旧数据的 `arrowEnd` 字段应保留兼容 | 🟡 需确认 |
| 1-3 | 现有 `pin` 类型使用 emoji 图标（`iconMap: { city: '🏰', village: '🏘️', ... }`），设计方案改为 Canvas 几何符号绘制。两种方式的 `icon` 字段含义不一致 | 🟡 需确认 |

**建议修复**：
1. 在迁移函数中增加已有 `geoMarkers` 中 `circle` 类型的处理：
   ```javascript
   // 迁移 geoMarkers 中的旧 circle 类型
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
   }
   ```
2. `arrowEnd` 字段在渲染时保留兼容（如果 `geo.arrowEnd === true` 且无 presetType，仍绘制箭头）
3. `icon` 字段可保留但不再作为主要渲染依据，由 `presetType` 决定符号

---

### 2. 向后兼容方案覆盖度 ⚠️ 有遗漏

**设计方案覆盖的场景**（第九节）：
- ✅ 旧 JSON 无 geoMarkers → 初始化空数组
- ✅ 旧 geoMarkers 缺 style → 补充默认样式
- ✅ 旧 geoMarkers 缺 presetType → 设为 null
- ✅ 旧 rangeMarkers 的 rect（四顶点）→ geoMarkers 的 rect（x/y/w/h）
- ✅ 旧 rangeMarkers 的 circle → geoMarkers 的 ellipse（rx=ry）
- ✅ 保存时保留 rangeMarkers: [] 兼容旧版本

**遗漏的场景**：

| 编号 | 场景 | 严重度 |
|------|------|--------|
| 2-1 | 已有 `geoMarkers` 中的 `circle` 类型（center+radius）未纳入迁移 | 🔴 必须修复 |
| 2-2 | 已有 `geoMarkers` 中的 `arrowEnd` 字段未在兼容策略中说明 | 🟡 需补充 |
| 2-3 | **反向兼容风险**：设计保存时 `rangeMarkers: []` + 所有数据存 `geoMarkers`。如果用户用旧版本加载这个 JSON，旧版本只认识 `rangeMarkers`，会丢失所有范围标识数据。虽然设计说"保留空数组兼容旧版本"，但实际上**旧版本无法读取 `geoMarkers` 中的新类型（rect/ellipse）**，这是一种**单向升级**——升级后无法回退 | 🟠 需记录 |
| 2-4 | `loadMapFromDir` 的 requiredFields 校验（第 762 行）只检查 `['scale', 'unit', 'notes', 'rangeMarkers', 'mapRelations']`，不检查 `geoMarkers`。这没问题（新版本加了 `data.geoMarkers || []`），但意味着旧 JSON 确实可以不含 `geoMarkers`，兼容处理正确 | ✅ 无问题 |
| 2-5 | rangeMarkers 中 rect 的四顶点格式 `{x1,y1,x2,y2,x3,y3,x4,y4}`，迁移函数只取 `x1,y1,x3,y3`。如果旧数据的顶点不是按左上-右上-右下-左下顺序排列，迁移结果可能不正确。需在迁移时用 `Math.min/Math.max` 计算包围盒 | 🟡 建议加固 |

**建议**：
1. 补充 2-1（已有 circle 迁移）
2. 在文档中明确标注"升级后不支持回退到旧版本"的单向性
3. rect 迁移使用包围盒算法更稳健

---

### 3. Canvas 渲染性能 ⚠️ 需关注但可接受

**分析**：

设计方案的渲染流程（第三节伪代码）：
```
drawShape(ctx, geo) → preset.symbol(ctx, geo) → drawName(ctx, geo)
```

每帧对每个 `geoMarkers` 元素：
1. 一次基础形状绘制（已有逻辑，无额外开销）
2. 一次符号函数调用（if presetType 存在）
3. 一次名称绘制（已有逻辑）

**性能评估**：

| 维度 | 评估 |
|------|------|
| 符号函数数量 | 25 种预设 = ~15-20 个独立绘制函数（部分共享），代码量可控 |
| 每帧调用 | 每个 geoMarker 最多 1 次符号函数调用，开销等同于现有 drawArrowHead |
| 最重的符号 | `drawArrowsAlongPath`（河流）、`drawForestSymbol`（森林散布小树）、`drawWaves`（波浪）—— 这些涉及循环+贝塞尔曲线，但 1000×1000 地图上典型 geoMarker 数量 <50 个，不影响流畅度 |
| 网格/密集符号 | 城市（十字街道）、草原（短竖线阵列）、沙漠（点阵）—— 区域内均匀分布图案，复杂度 O(area/spacing²)。如果区域很大且间距很小，可能有性能问题 |

**潜在风险**：

| 编号 | 问题 | 严重度 |
|------|------|--------|
| 3-1 | 密集符号（城市十字街道、沙漠点阵）在大面积（如 800×800）绘制时，循环次数可能过多 | 🟡 P2 已标注"符号密度自适应" |
| 3-2 | 河流符号 `drawArrowsAlongPath` 中的 `while (dist < segLen)` 循环没有对间距做最小值保护，如果 spacing 参数传入 0 或负数会死循环 | 🟡 实现时需注意 |

**结论**：性能影响在可接受范围内。P2 的"符号密度自适应"是正确的降级策略。方案文档已在 P2 中覆盖此问题。

---

### 4. UI 交互一致性 ✅ 良好

**评估**：

| 维度 | 现有实现 | 设计方案 | 一致性 |
|------|----------|----------|--------|
| 入口 | 左侧面板"地理标识"区域 | 合并后统一"地理标识"面板 | ✅ 继承 |
| 表单模式 | 类型下拉 + 名称 + 顶点坐标 + 颜色 + 线宽 + 粗线 | 分组下拉 + 类型下拉 + 名称 + 参数区（动态切换）+ 样式预填 | ✅ 扩展，模式一致 |
| 列表显示 | 类型标签 + 顶点数 + 编辑/删除按钮 | 预设中文名 + 符号图标 + 编辑/删除 | ✅ 升级 |
| pin 快速放置 | 无（手动输入坐标）| "点击地图放置"按钮 | ✅ 新增，不冲突 |
| 参数区动态切换 | 切换类型时显示/隐藏顶点输入和圆形输入 | 根据 shape 类型显示不同参数输入 | ✅ 一致 |

**唯一建议**：现有实现中"范围标识"和"地理标识"是两个独立区域。设计方案说"隐藏旧范围标识面板"，实际代码中需要将 `addRangeMarker` 相关 UI 注释或移除，并确保 `updateMarkerList` 不再渲染 `state.rangeMarkers`。这是一个小改动，但需在实现清单中明确。

---

### 5. JSON 存储格式 ✅ 不破坏现有流程

**评估**：

| 维度 | 状态 |
|------|------|
| 保存函数 | `saveCurrentMap()` 和 `saveElementsToFile()` 都将 `state.geoMarkers` 序列化为 `geoMarkers` 字段。新增的 `presetType`、`rect`/`ellipse` 类型只是 `geoMarkers` 数组元素的新属性，不影响序列化 | ✅ |
| 加载函数 | `loadMapFromDir()` 和 `loadMap()` 都调用 `applyMapData()`，其中 `state.geoMarkers = data.geoMarkers || []`。新字段会被完整保留 | ✅ |
| requiredFields | 校验不包含 `geoMarkers`，旧 JSON 无此字段时 `|| []` 兜底正确 | ✅ |
| 批量导入 | `batchLoadMaps` 读取的 JSON 也会完整保留 `geoMarkers` | ✅ |
| 导出所有 | `exportAllMaps` 包含 `state.savedMaps` 中的所有数据 | ✅ |

**唯一注意点**：`style.fillOpacity` 字段（设计方案 8.1 节）在现有实现中不存在（现有实现从 `fillColor` 的 rgba 字符串中提取透明度）。如果同时存在 `fillColor` 和 `fillOpacity`，渲染时需决定用哪个。建议保持从 `fillColor` 提取，`fillOpacity` 仅作为冗余/元数据。

---

### 6. 优先级划分 ✅ 合理

| 优先级 | 设计方案 | 评估 |
|--------|----------|------|
| P0 必须 | rect/ellipse 底层图形 + Canvas 渲染、预设选择器、默认样式、迁移函数 | ✅ 正确。没有底层图形，上层全部无法工作 |
| P1 重要 | 符号绘制函数库、pin 快速放置、列表预设名显示 | ✅ 正确。核心功能先于视觉增强 |
| P2 可选 | 城堡四角方块等复杂符号、符号密度自适应 | ✅ 正确。非核心视觉细节 |

**建议补充**：迁移函数应归为 P0，且应在所有新功能之前执行（加载时自动迁移）。现有 `applyMapData` 函数是合适的注入点。

---

### 7. 预设类型完整性 ✅ 覆盖充分

**覆盖情况**：

| 分组 | 数量 | 覆盖评价 |
|------|------|----------|
| 水域 | 4（河/湖/海/泉）| ✅ 完整 |
| 植被 | 5（森林/沼泽/草原/沙漠/竹林）| ✅ 完整 |
| 地形 | 5（山脉/悬崖/火山/雪山/洞穴）| ✅ 完整 |
| 建筑 | 5（城市/城堡/村庄/庙宇/废墟）| ✅ 完整 |
| 道路 | 4（道路/城墙/行军路线/桥梁）| ✅ 完整 |
| 区域 | 2（王国/营地）| ✅ 最小集 |

**可考虑补充（非必须）**：
- 峡谷（polyline + 两侧竖线符号）
- 渡口/码头（pin）
- 矿山（pin）

但这些属于锦上添花，当前 25 种已满足大部分奇幻/历史小说需求。

**无冲突**：各预设 key 唯一，shape 分配合理（polyline 用于线性要素，polygon 用于面状要素，rect/ellipse 用于规整区域，pin 用于点状标注）。

---

### 8. 符合 SOUL.md 约束 ✅ 基本符合

项目级 SOUL.md 不存在（读取返回 ENOENT），以 workspace 级 SOUL.md 为准：

| 约束 | 评估 |
|------|------|
| **务实第一** | 方案给出了具体的函数签名、参数范围、默认值表，不是抽象描述。✅ |
| **优先级分明** | P0/P1/P2 划分清晰，先核心后增强。✅ |
| **控制开发难度** | 全部使用 Canvas 2D 原语，无字体/图标库依赖，无后端引入。25 种预设的符号函数虽然多，但共享基础绘制原语（三角、直线、弧线），可以抽取公共工具函数。⚠️ 开发量较大但技术栈单一。 |
| **数据完整性是红线** | 迁移函数覆盖了主要场景（见第 2 节），JSON 格式完全兼容。⚠️ 遗漏已有 `geoMarkers circle` 的迁移（见 1-1）。 |
| **交互流畅是底线** | 缩放延迟、拖拽边界等约束在现有实现中已满足，设计方案未引入额外阻塞操作。✅ |
| **不实现非必要功能** | 方案未涉及地图关联跳转、批量删除、过度样式自定义。✅ |
| **范围标识样式固定为红色实线** | 旧 `rangeMarkers` 保持红色实线。新的 `geoMarkers` 用预设配色，这是功能扩展而非违反约束。✅ |

---

## 汇总：必须修复项

| 编号 | 问题 | 修复方式 |
|------|------|----------|
| **M-1** | 已有 `geoMarkers` 中 `circle` 类型（center+radius）的迁移缺失 | 在迁移函数中增加 circle → ellipse 转换逻辑 |
| **M-2** | rect 迁移时四顶点顺序假设不稳健 | 使用 Math.min/max 计算包围盒，不依赖顶点顺序 |
| **M-3** | 升级后单向不可回退未在文档中说明 | 在"向后兼容"章节增加"⚠️ 升级后旧版本无法读取新格式"的明确警告 |

## 汇总：建议改进项

| 编号 | 建议 | 理由 |
|------|------|------|
| S-1 | `arrowEnd` 字段保留渲染兼容 | 旧数据可能依赖此字段显示箭头 |
| S-2 | `fillOpacity` 与 `fillColor` 的关系明确 | 避免渲染时歧义 |
| S-3 | 迁移函数放在 `applyMapData` 中自动执行 | 确保每次加载都触发迁移 |
| S-4 | 密集符号绘制增加间距下限保护 | 防止极端参数导致性能问题 |

---

## 测试补充建议

基于评审发现，建议在 TEST-CHECKLIST.md 中补充以下测试项：

| 编号 | 测试项 | 说明 |
|------|--------|------|
| **T-PRESET-01** | 旧 geoMarkers circle 加载 | 加载含 circle 类型的旧 JSON，验证自动转换为 ellipse |
| **T-PRESET-02** | 旧 rangeMarkers rect 迁移 | 加载含非标准顶点顺序的 rect，验证包围盒计算正确 |
| **T-PRESET-03** | 新旧混合加载 | JSON 同时含 rangeMarkers（旧）和 geoMarkers（旧 circle + 新 preset），验证全部正确迁移 |
| **T-PRESET-04** | 预设符号渲染一致性 | 25 种预设各创建一个，缩放 10%/100%/200% 三个级别验证符号显示正常 |
| **T-PRESET-05** | 保存后旧版本加载 | 用新版本保存的 JSON 在旧版本加载，验证 rangeMarkers 为空但不崩溃 |

---

_评审完毕。方案架构优秀，核心风险在数据迁移层面，修复后可进入实现阶段。_
