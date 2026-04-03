/**
 * NovelMap API — Agent 专用地图操作接口
 *
 * 用法:
 *   const { NovelMap } = require('./map-api.js');
 *   const map = new NovelMap("苍澜世界", { name: "仙里", desc: "1仙里=50千米" });
 *   map.addGeo("城市", "凌城", { x: 900, y: 900, w: 200, h: 200 });
 *   map.saveMap("苍澜世界.json");
 */

const fs = require('fs');
const path = require('path');

// ==================== 预设模板 (与工具完全一致) ====================
const PRESETS = {
  // 通用
  '通用':  { type: 'rect', lineOnly: false, style: { strokeColor: '#5dade2', lineWidth: 2, fillColor: null, bold: false, symbol: null } },
  // 面状 (rect)
  '城市':  { type: 'rect', lineOnly: false, style: { strokeColor: '#e74c3c', lineWidth: 2, fillColor: 'rgba(231,76,60,0.12)', bold: true, symbol: 'grid' } },
  '城堡':  { type: 'rect', lineOnly: false, style: { strokeColor: '#c0392b', lineWidth: 4, fillColor: 'rgba(192,57,43,0.1)', bold: true, symbol: 'towers' } },
  '森林':  { type: 'rect', lineOnly: false, style: { strokeColor: '#27ae60', lineWidth: 2, fillColor: 'rgba(39,174,96,0.2)', bold: false, symbol: 'trees' } },
  '湖泊':  { type: 'ellipse', lineOnly: false, style: { strokeColor: '#2e86c1', lineWidth: 2, fillColor: 'rgba(46,134,193,0.25)', bold: false, symbol: 'waves' } },
  '海洋':  { type: 'ellipse', lineOnly: false, style: { strokeColor: '#1a5276', lineWidth: 2, fillColor: 'rgba(26,82,118,0.2)', bold: false, symbol: 'ocean_waves' } },
  '沼泽':  { type: 'rect', lineOnly: false, style: { strokeColor: '#6b8e23', lineWidth: 2, fillColor: 'rgba(107,142,35,0.25)', bold: false, symbol: 'crosshatch' } },
  '草原':  { type: 'rect', lineOnly: false, style: { strokeColor: '#82e0aa', lineWidth: 2, fillColor: 'rgba(130,224,170,0.1)', bold: false, symbol: 'grassland' } },
  '沙漠':  { type: 'rect', lineOnly: false, style: { strokeColor: '#f0b429', lineWidth: 2, fillColor: 'rgba(240,180,41,0.2)', bold: false, symbol: 'dots' } },
  '竹林':  { type: 'rect', lineOnly: false, style: { strokeColor: '#a8d08d', lineWidth: 2, fillColor: 'rgba(168,208,141,0.2)', bold: false, symbol: 'bamboo' } },
  '王国':  { type: 'ellipse', lineOnly: false, style: { strokeColor: '#c0392b', lineWidth: 2, fillColor: 'rgba(192,57,43,0.1)', bold: true, symbol: 'kingdom' } },
  '营地':  { type: 'rect', lineOnly: false, style: { strokeColor: '#f39c12', lineWidth: 2, fillColor: 'rgba(243,156,18,0.2)', bold: false, symbol: 'tent' } },
  // 线状 (polyline)
  '河流':     { type: 'polyline', lineOnly: true, style: { strokeColor: '#5dade2', lineWidth: 3, fillColor: null, bold: false, symbol: 'arrows' } },
  '山脉':     { type: 'polyline', lineOnly: true, style: { strokeColor: '#7f8c8d', lineWidth: 5, fillColor: null, bold: true, symbol: 'zigzag' } },
  '悬崖':     { type: 'polyline', lineOnly: true, style: { strokeColor: '#8d6e63', lineWidth: 3, fillColor: null, bold: false, symbol: 'cliff' } },
  '道路':     { type: 'polyline', lineOnly: true, style: { strokeColor: '#95a5a6', lineWidth: 2, fillColor: null, bold: false, symbol: 'marks' } },
  '城墙':     { type: 'polyline', lineOnly: true, style: { strokeColor: '#616161', lineWidth: 3, fillColor: null, bold: true, symbol: 'doubleline' } },
  '行军路线': { type: 'polyline', lineOnly: true, style: { strokeColor: '#8e44ad', lineWidth: 2, fillColor: null, bold: false, symbol: 'route' } },
  '桥梁':     { type: 'polyline', lineOnly: true, style: { strokeColor: '#8d6e63', lineWidth: 3, fillColor: null, bold: false, symbol: 'bridge' } },
  // 点状 (pin)
  '洞穴': { type: 'pin', lineOnly: false, style: { strokeColor: '#8d6e63', lineWidth: 2, fillColor: null, bold: false, symbol: 'cave' } },
  '泉眼': { type: 'pin', lineOnly: false, style: { strokeColor: '#5dade2', lineWidth: 2, fillColor: null, bold: false, symbol: 'spring' } },
  '火山': { type: 'pin', lineOnly: false, style: { strokeColor: '#d32f2f', lineWidth: 2, fillColor: null, bold: false, symbol: 'volcano' } },
  '雪峰': { type: 'pin', lineOnly: false, style: { strokeColor: '#3498db', lineWidth: 2, fillColor: null, bold: false, symbol: 'snow_peak' } },
  '村庄': { type: 'pin', lineOnly: false, style: { strokeColor: '#f39c12', lineWidth: 2, fillColor: null, bold: false, symbol: 'village' } },
  '庙宇': { type: 'pin', lineOnly: false, style: { strokeColor: '#f1c40f', lineWidth: 2, fillColor: null, bold: false, symbol: 'temple' } },
  '废墟': { type: 'pin', lineOnly: false, style: { strokeColor: '#95a5a6', lineWidth: 2, fillColor: null, bold: false, symbol: 'ruin' } },
};

// ==================== 辅助函数 ====================
function _id(prefix) { return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`; }
function _clone(obj) { return JSON.parse(JSON.stringify(obj)); }

function _fmtNum(n) {
  return n >= 10000 ? `约${Math.round(n / 1000) / 10}万` : `约${n}`;
}

function _calcMetrics(type, data, unitName) {
  const fmt = n => _fmtNum(n, unitName);
  // polyline — 长度
  if (type === 'polyline' && data.points && data.points.length >= 2) {
    let total = 0;
    for (let i = 1; i < data.points.length; i++) {
      const pts = _parsePoints(data.points);
      const dx = pts[i].x - pts[i - 1].x;
      const dy = pts[i].y - pts[i - 1].y;
      total += Math.sqrt(dx * dx + dy * dy);
    }
    const len = Math.round(total);
    return { length: len, lengthDesc: `${fmt(len)}${unitName}` };
  }
  // rect — 面积
  if (type === 'rect' && data.w && data.h) {
    const area = data.w * data.h;
    return { area, areaDesc: `${fmt(area)}平方${unitName}` };
  }
  // ellipse — 面积
  if (type === 'ellipse' && data.rx && data.ry) {
    const area = Math.round(Math.PI * data.rx * data.ry);
    return { area, areaDesc: `${fmt(area)}平方${unitName}` };
  }
  // polygon — 面积 (鞋带公式)
  if (type === 'polygon' && data.points && data.points.length >= 3) {
    let area = 0;
    const pts = _parsePoints(data.points);
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      area += pts[j].x * pts[i].y - pts[i].x * pts[j].y;
    }
    area = Math.round(Math.abs(area / 2));
    return { area, areaDesc: `${fmt(area)}平方${unitName}` };
  }
  return null;
}

function _parsePoints(pts) {
  if (!pts || pts.length === 0) return [];
  if (Array.isArray(pts[0])) return pts.map(p => ({ x: p[0], y: p[1] }));
  return pts;
}

// ==================== 版本管理辅助 ====================

function _applyDeltaState(state, delta) {
  for (const group of ['notes', 'geoMarkers', 'mapRelations']) {
    const d = delta[group];
    if (!d) continue;
    if (d.add) {
      for (const item of d.add) state[group].push(_clone(item));
    }
    if (d.update) {
      for (const patch of d.update) {
        const target = state[group].find(e => e.id === patch.id);
        if (target) {
          for (const key of Object.keys(patch)) {
            if (key !== 'id') target[key] = _clone(patch[key]);
          }
        }
      }
    }
    if (d.remove && d.remove.length) {
      state[group] = state[group].filter(e => !d.remove.includes(e.id));
    }
  }
}

function _getStateAtVersion(baseMap, versionsFile, targetV) {
  const state = { notes: _clone(baseMap.notes || []), geoMarkers: _clone(baseMap.geoMarkers || []), mapRelations: _clone(baseMap.mapRelations || []) };
  if (!versionsFile || targetV <= 0) return state;
  for (const ver of versionsFile.versions) {
    if (ver.v > targetV) break;
    _applyDeltaState(state, ver.delta);
  }
  return state;
}

function _computeDelta(oldState, newState) {
  const delta = {};
  for (const group of ['notes', 'geoMarkers', 'mapRelations']) {
    const oldMap = {};
    const newMap = {};
    for (const e of oldState[group]) oldMap[e.id] = e;
    for (const e of newState[group]) newMap[e.id] = e;
    const oldIds = new Set(Object.keys(oldMap));
    const newIds = new Set(Object.keys(newMap));

    const add = newState[group].filter(e => !oldIds.has(e.id));
    const remove = [...oldIds].filter(id => !newIds.has(id));
    const update = [];
    for (const e of newState[group]) {
      if (!oldIds.has(e.id)) continue;
      const old = oldMap[e.id];
      if (JSON.stringify(old) === JSON.stringify(e)) continue;
      const patch = { id: e.id };
      for (const key of Object.keys(e)) {
        if (key === 'id') continue;
        if (JSON.stringify(e[key]) !== JSON.stringify(old[key])) patch[key] = _clone(e[key]);
      }
      update.push(patch);
    }
    if (add.length || update.length || remove.length) {
      delta[group] = { add: add.map(e => _clone(e)), update, remove };
    }
  }
  return delta;
}

function _isDeltaEmpty(delta) {
  return Object.keys(delta).length === 0;
}

// ==================== NovelMap 类 ====================
class NovelMap {
  constructor(name, unit = { name: '里', desc: '1里=500米' }) {
    this._data = {
      mapName: name, scale: 1, offsetX: 0, offsetY: 0, mapSize: 2000,
      unit, notes: [], rangeMarkers: [], geoMarkers: [], mapRelations: [], versions: null
    };
  }

  // ==================== 地图 ====================

  /** 设置距离单位 */
  setUnit(name, desc) { this._data.unit = { name, desc }; }

  /** 获取最终 JSON 数据 */
  toJSON() { return _clone(this._data); }

  /** 校验地图数据 → { valid, errors } */
  validate() {
    const errors = [];
    const d = this._data;
    if (!d.mapName) errors.push('缺少 mapName');
    if (!d.unit || !d.unit.name) errors.push('缺少 unit');
    if (!Array.isArray(d.notes)) errors.push('notes 必须是数组');
    if (!Array.isArray(d.geoMarkers)) errors.push('geoMarkers 必须是数组');
    if (!Array.isArray(d.mapRelations)) errors.push('mapRelations 必须是数组');
    d.notes.forEach((n, i) => {
      if (!n.name) errors.push(`notes[${i}] 缺少 name 字段`);
      if (n.x === undefined || n.y === undefined) errors.push(`notes[${i}] 缺少 x/y`);
      if (n.x < 0 || n.x > 2000 || n.y < 0 || n.y > 2000) errors.push(`notes[${i}] 坐标超出范围`);
    });
    d.geoMarkers.forEach((g, i) => {
      if (!g.name) errors.push(`geoMarkers[${i}] 缺少 name`);
      if (!g.presetType) errors.push(`geoMarkers[${i}] 缺少 presetType`);
      if (!g.type) errors.push(`geoMarkers[${i}] 缺少 type`);
      if (!g.style) errors.push(`geoMarkers[${i}] 缺少 style`);
      if (g.type === 'polyline' && (!g.points || g.points.length < 2)) errors.push(`geoMarkers[${i}] (${g.name || '?'}) polyline 需要至少2个顶点`);
      if (g.type === 'polygon' && (!g.points || g.points.length < 3)) errors.push(`geoMarkers[${i}] (${g.name || '?'}) polygon 需要至少3个顶点`);
    });
    return { valid: errors.length === 0, errors };
  }

  /** 保存到文件 */
  saveMap(filePath) {
    const json = JSON.stringify(this._data, null, 2);
    const outPath = path.resolve(filePath);
    fs.writeFileSync(outPath, json, 'utf8');
    console.log(`✅ 地图已保存: ${outPath}`);
    console.log(`   ${this._data.notes.length} 个坐标点, ${this._data.geoMarkers.length} 个地理标识, ${this._data.mapRelations.length} 个关联`);
    return outPath;
  }

  /** 从文件加载 */
  static loadMap(filePath) {
    const json = fs.readFileSync(path.resolve(filePath), 'utf8');
    const data = JSON.parse(json);
    const map = new NovelMap(data.mapName, data.unit);
    map._data = data;
    console.log(`✅ 地图已加载: ${filePath}`);
    return map;
  }

  // ==================== 坐标点 ====================

  addNote(name, x, y, content = '无备注') {
    if (x < 0 || x > 2000 || y < 0 || y > 2000) throw new Error(`坐标超出范围 (0~2000): (${x}, ${y})`);
    // 坐标不能重复
    const dup = this._data.notes.find(n => n.x === x && n.y === y);
    if (dup) throw new Error(`坐标 (${x}, ${y}) 已存在坐标点「${dup.name}」，不可重复添加`);
    const note = { id: _id('note'), name, x, y, content: content || '无备注' };
    this._data.notes.push(note);
    return note;
  }

  editNote(id, updates) {
    const note = this._data.notes.find(n => n.id === id);
    if (!note) return false;
    if (updates.name !== undefined) note.name = updates.name;
    if (updates.x !== undefined) { if (updates.x < 0 || updates.x > 2000) throw new Error('x 超出范围'); note.x = updates.x; }
    if (updates.y !== undefined) { if (updates.y < 0 || updates.y > 2000) throw new Error('y 超出范围'); note.y = updates.y; }
    if (updates.content !== undefined) note.content = updates.content;
    return true;
  }

  deleteNote(id) {
    const len = this._data.notes.length;
    this._data.notes = this._data.notes.filter(n => n.id !== id);
    return this._data.notes.length < len;
  }

  /** 按名称或内容搜索坐标点 */
  searchNote(query) {
    const q = query.toLowerCase();
    return this._data.notes.filter(n =>
      n.name?.toLowerCase().includes(q) || n.content?.toLowerCase().includes(q)
    );
  }

  /** 查找距离指定坐标最近的坐标点 */
  findNearestNote(x, y) {
    let nearest = null;
    let minDist = Infinity;
    for (const n of this._data.notes) {
      const dist = Math.sqrt((n.x - x) ** 2 + (n.y - y) ** 2);
      if (dist < minDist) { minDist = dist; nearest = n; }
    }
    return nearest;
  }

  listNotes() { return this._data.notes; }

  // ==================== 地理标识 ====================

  addGeo(presetType, name, params = {}) {
    const preset = PRESETS[presetType];
    if (!preset) throw new Error(`未知预设类型: ${presetType}。可用: ${Object.keys(PRESETS).join(', ')}`);

    const geo = { id: _id('geo'), presetType, type: preset.type, name, style: { ...preset.style, lineDash: null } };

    if (preset.type === 'rect') {
      if (params.x === undefined || params.y === undefined || !params.w || !params.h) {
        throw new Error(`面状类型(${presetType})需要 x, y, w, h 参数`);
      }
      geo.x = params.x; geo.y = params.y;
      geo.width = params.w; geo.height = params.h;
      if (preset.style.fillColor) geo.style.fillColor = preset.style.fillColor;
    } else if (preset.type === 'ellipse') {
      // 支持 cx/cy/rx/ry 或 x/y/w/h 两种传参
      if (params.cx !== undefined && params.cy !== undefined && params.rx && params.ry) {
        geo.cx = params.cx; geo.cy = params.cy;
        geo.rx = params.rx; geo.ry = params.ry;
      } else if (params.x !== undefined && params.y !== undefined && params.w && params.h) {
        // 自动转换矩形参数为椭圆中心点+半径
        geo.cx = params.x + params.w / 2;
        geo.cy = params.y + params.h / 2;
        geo.rx = params.w / 2;
        geo.ry = params.h / 2;
      } else {
        throw new Error(`椭圆类型(${presetType})需要 cx, cy, rx, ry 或 x, y, w, h 参数`);
      }
      if (preset.style.fillColor) geo.style.fillColor = preset.style.fillColor;
    } else if (preset.type === 'polyline') {
      if (!params.points || params.points.length < 2) {
        throw new Error(`线状类型(${presetType})需要至少2个顶点的 points 数组`);
      }
      geo.points = _parsePoints(params.points);
    } else if (preset.type === 'pin') {
      if (params.x === undefined || params.y === undefined) {
        throw new Error(`点状类型(${presetType})需要 x, y 参数`);
      }
      geo.x = params.x; geo.y = params.y;
    }

    // 自动 metrics
    const unitName = this._data.unit.name;
    const metrics = _calcMetrics(geo.type, { ...params, points: geo.points || params.points }, unitName);
    if (metrics) geo.metrics = metrics;

    // geoWidth
    if (params.geoWidth !== undefined) {
      geo.geoWidth = params.geoWidth;
      geo.geoWidthDesc = params.geoWidthDesc || `最宽处${params.geoWidth}${unitName}`;
    }

    this._data.geoMarkers.push(geo);
    return geo;
  }

  /** 椭圆专用 */
  addEllipse(presetType, name, params) {
    if (!params.cx && params.cx !== 0 && !params.x) { throw new Error('ellipse 需要 cx, cy, rx, ry 参数'); }
    const preset = PRESETS[presetType] || PRESETS['通用'];
    const cx = params.cx !== undefined ? params.cx : (params.x + params.w / 2);
    const cy = params.cy !== undefined ? params.cy : (params.y + params.h / 2);
    const rx = params.rx !== undefined ? params.rx : (params.w / 2);
    const ry = params.ry !== undefined ? params.ry : (params.h / 2);
    const geo = {
      id: _id('geo'), presetType, type: 'ellipse', name,
      cx, cy, rx, ry,
      style: { ...preset.style, lineDash: null },
    };
    if (preset.style.fillColor) geo.style.fillColor = preset.style.fillColor;
    const metrics = _calcMetrics('ellipse', { rx, ry }, this._data.unit.name);
    if (metrics) geo.metrics = metrics;
    this._data.geoMarkers.push(geo);
    return geo;
  }

  /** 多边形专用 */
  addPolygon(presetType, name, params) {
    if (!params.points || params.points.length < 3) {
      throw new Error(`polygon 需要至少3个顶点`);
    }
    const preset = PRESETS[presetType] || PRESETS['通用'];
    const geo = {
      id: _id('geo'), presetType, type: 'polygon', name,
      points: _parsePoints(params.points),
      style: { ...preset.style, lineDash: null },
    };
    if (preset.style.fillColor) geo.style.fillColor = preset.style.fillColor;
    const metrics = _calcMetrics('polygon', { points: geo.points }, this._data.unit.name);
    if (metrics) geo.metrics = metrics;
    this._data.geoMarkers.push(geo);
    return geo;
  }

  /** 标注点专用 (与 pin 预设一致) */
  addPin(presetType, name, x, y) {
    const preset = PRESETS[presetType];
    if (!preset) throw new Error(`未知预设类型: ${presetType}`);
    if (preset.type !== 'pin') throw new Error(`预设 ${presetType} 不是 pin 类型 (type=${preset.type})`);
    return this.addGeo(presetType, name, { x, y });
  }

  editGeo(id, updates) {
    const geo = this._data.geoMarkers.find(g => g.id === id);
    if (!geo) return false;
    if (updates.presetType && !PRESETS[updates.presetType]) {
      throw new Error(`未知预设类型: ${updates.presetType}`);
    }
    Object.assign(geo, updates);
    // 如果改了 presetType，刷新 style
    if (updates.presetType) {
      geo.style = { ...PRESETS[updates.presetType].style, lineDash: null };
      geo.type = PRESETS[updates.presetType].type;
    }
    return true;
  }

  deleteGeo(id) {
    const len = this._data.geoMarkers.length;
    this._data.geoMarkers = this._data.geoMarkers.filter(g => g.id !== id);
    return this._data.geoMarkers.length < len;
  }

  /** 按预设类型或名称搜索地理标识 */
  searchGeo(query) {
    const q = query.toLowerCase();
    return this._data.geoMarkers.filter(g =>
      g.name?.toLowerCase().includes(q) || g.presetType?.toLowerCase().includes(q) || g.type?.toLowerCase().includes(q)
    );
  }

  listGeos() { return this._data.geoMarkers; }

  // ==================== 地图关联 ====================

  /**
   * 添加关联（支持自动双向）
   * @param {string} currentXY "x,y"
   * @param {string} targetMapName 目标地图名称
   * @param {string} targetXY "x,y"
   * @param {boolean} bidirectional 是否自动添加反向关联（默认 true）
   */
  addRelation(currentXY, targetMapName, targetXY, bidirectional = true) {
    const baseId = _id('relation');
    const rel = {
      id: baseId,
      currentMapName: this._data.mapName,
      currentXY, targetMapName, targetXY
    };
    this._data.mapRelations.push(rel);
    if (bidirectional) {
      // 在目标地图上添加反向关联
      // 如果目标地图 JSON 已存在，加载它并写入反向关联；否则创建新文件
      const targetPath = path.resolve(targetMapName + '.json');
      let targetMap;
      if (fs.existsSync(targetPath)) {
        targetMap = NovelMap.loadMap(targetPath);
      } else {
        targetMap = new NovelMap(targetMapName, this._data.unit);
        console.log(`📌 目标地图「${targetMapName}」不存在，自动创建空白地图`);
      }
      // 检查是否已存在相同反向关联
      const existingReverse = targetMap._data.mapRelations.find(
        r => r.currentMapName === this._data.mapName && r.currentXY === targetXY
      );
      if (!existingReverse) {
        targetMap._data.mapRelations.push({
          id: baseId + '_reverse',
          currentMapName: targetMapName,
          currentXY: targetXY,
          targetMapName: this._data.mapName,
          targetXY: currentXY
        });
        targetMap.saveMap(targetPath);
        console.log(`✅ 已自动在「${targetMapName}」添加反向传送门`);
      }
    }
    return rel;
  }

  deleteRelation(id) {
    // 找到并删除对应反向关联
    const rel = this._data.mapRelations.find(r => r.id === id);
    const len = this._data.mapRelations.length;
    if (rel && rel.id.endsWith('_reverse')) {
      // 反向关联，直接删除
      this._data.mapRelations = this._data.mapRelations.filter(r => r.id !== id);
    } else if (rel) {
      // 正向关联，删除正向 + 反向
      const reverseId = rel.id + '_reverse';
      this._data.mapRelations = this._data.mapRelations.filter(r => r.id !== id && r.id !== reverseId);
    }
    return this._data.mapRelations.length < len;
  }

  listRelations() { return this._data.mapRelations; }

  // ==================== 版本管理 ====================

  /**
   * 创建版本快照（带 delta 计算，与工具前端兼容）
   * @param {string} chapter 章节关联
   * @param {string} label 版本描述
   * @returns {number|null} 版本号，无变更返回 null
   */
  createVersion(chapter, label) {
    if (!this._data.versions) {
      // 创建空基底（v0，永远不修改）
      this._data.versions = {
        mapId: this._data.mapName,
        currentVersion: 0,
        versions: []
      };
    }

    const vf = this._data.versions;
    const baseMap = { notes: [], geoMarkers: [], mapRelations: [] };

    // 当前状态
    const current = {
      notes: _clone(this._data.notes),
      geoMarkers: _clone(this._data.geoMarkers),
      mapRelations: _clone(this._data.mapRelations),
    };

    // 与上一版本叠加状态对比
    const prevState = _getStateAtVersion(baseMap, vf, vf.currentVersion);
    const delta = _computeDelta(prevState, current);

    if (_isDeltaEmpty(delta)) return null;

    const newV = vf.currentVersion + 1;
    vf.currentVersion = newV;
    vf.versions.push({
      v: newV,
      chapter: chapter || '',
      label: label || '',
      timestamp: new Date().toLocaleString(),
      delta
    });

    return newV;
  }

  /** 回到指版本（只读快照） */
  getStateAtVersion(targetV) {
    if (!this._data.versions) return null;
    const base = this._data.versions._baseMap || { notes: [], geoMarkers: [], mapRelations: [] };
    return _getStateAtVersion(base, this._data.versions, targetV);
  }

  /** 获取版本时间轴 */
  listVersions() {
    if (!this._data.versions) return [];
    return this._data.versions.versions.map(v => ({
      v: v.v, chapter: v.chapter, label: v.label,
      changeCount: v.delta ? Object.values(v.delta).reduce((s, g) => s + (g.add?.length || 0) + (g.update?.length || 0) + (g.remove?.length || 0), 0) : 0,
      timestamp: v.timestamp
    }));
  }

  /** 对比两个版本的差异 */
  diffVersions(vA, vB) {
    if (!this._data.versions) return null;
    const base = this._data.versions._baseMap || { notes: [], geoMarkers: [], mapRelations: [] };
    const stateA = _getStateAtVersion(base, this._data.versions, vA);
    const stateB = _getStateAtVersion(base, this._data.versions, vB);
    const result = { added: {}, removed: {}, modified: {} };
    for (const group of ['notes', 'geoMarkers', 'mapRelations']) {
      const aIds = new Set(stateA[group].map(e => e.id));
      const bIds = new Set(stateB[group].map(e => e.id));
      result.added[group] = stateB[group].filter(e => !aIds.has(e.id));
      result.removed[group] = stateA[group].filter(e => !bIds.has(e.id));
      result.modified[group] = stateB[group].filter(e => {
        if (!aIds.has(e.id)) return false;
        const old = stateA[group].find(o => o.id === e.id);
        return JSON.stringify(old) !== JSON.stringify(e);
      });
    }
    return result;
  }

  // ==================== 工具方法 ====================

  /** 统计信息 */
  stats() {
    return {
      mapName: this._data.mapName,
      notes: this._data.notes.length,
      geoMarkers: this._data.geoMarkers.length,
      mapRelations: this._data.mapRelations.length,
      versions: this._data.versions?.currentVersion || 0,
      unit: this._data.unit,
    };
  }

  /** 清空所有数据 */
  clearAll() {
    this._data.notes = [];
    this._data.rangeMarkers = [];
    this._data.geoMarkers = [];
    this._data.mapRelations = [];
    this._data.versions = null;
  }

  /** 获取地图名称 */
  get mapName() { return this._data.mapName; }
  /** 获取所有数据 */
  get data() { return this._data; }
}

module.exports = { NovelMap, PRESETS };
