// 地图版本管理核心逻辑
// ==================== 版本管理 ====================

/**
 * 应用单个 delta 到 state 快照
 * @param {{notes: Array, geoMarkers: Array, mapRelations: Array}} state
 * @param {Object} delta - { notes?: {add,update,remove}, geoMarkers?: {...}, mapRelations?: {...} }
 */
function applyDelta(state, delta) {
    for (const group of ['notes', 'geoMarkers', 'mapRelations']) {
        const d = delta[group];
        if (!d) continue;
        
        // 1. add - 先添加新增项
        if (d.add) {
            for (const item of d.add) {
                state[group].push(structuredClone(item));
            }
        }
        
        // 2. update - 更新现有项（包括已在 add 中的）
        if (d.update) {
            for (const patch of d.update) {
                const target = state[group].find(e => e.id === patch.id);
                if (target) {
                    for (const key of Object.keys(patch)) {
                        if (key !== 'id') target[key] = structuredClone(patch[key]);
                    }
                }
            }
        }
        
        // 3. remove - 最后删除，会覆盖之前的 add/update
        if (d.remove && d.remove.length) {
            const removeSet = new Set(d.remove);
            state[group] = state[group].filter(e => !removeSet.has(e.id));
        }
    }
}

/**
 * 获取指定版本的状态
 * @param {Object} baseMap - 地图 JSON 数据（v0 基底）
 * @param {Object} versionsFile - 版本文件数据
 * @param {number} targetV - 目标版本号（0 = 初始状态）
 * @returns {{notes: Array, geoMarkers: Array, mapRelations: Array}}
 */
function getStateAtVersion(baseMap, versionsFile, targetV) {
    const state = {
        notes:        structuredClone(baseMap.notes || []),
        geoMarkers:   structuredClone(baseMap.geoMarkers || []),
        mapRelations: structuredClone(baseMap.mapRelations || [])
    };
    if (!versionsFile || targetV <= 0) return state;
    for (const ver of versionsFile.versions) {
        if (ver.v > targetV) break;
        applyDelta(state, ver.delta);
    }
    return state;
}

/**
 * 对比两个状态，计算 delta
 * @returns {Object} delta - { notes?: {add,update,remove}, ... }
 */
function computeDelta(oldState, newState) {
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
            // 只保留变化字段 + id
            const patch = { id: e.id };
            for (const key of Object.keys(e)) {
                if (key === 'id') continue;
                if (JSON.stringify(e[key]) !== JSON.stringify(old[key])) {
                    patch[key] = structuredClone(e[key]);
                }
            }
            update.push(patch);
        }

        if (add.length || update.length || remove.length) {
            delta[group] = {
                add: add.map(e => structuredClone(e)),
                update,
                remove
            };
        }
    }
    return delta;
}

/**
 * delta 是否为空（无任何变更）
 */
function isDeltaEmpty(delta) {
    return Object.keys(delta).length === 0;
}

/**
 * 获取版本时间轴数据
 * @param {Object} versionsFile
 * @returns {Array} [{v, chapter, label, changeCount, timestamp}]
 */
function getTimeline(versionsFile) {
    const timeline = [{
        v: 0,
        chapter: null,
        label: '初始状态',
        changeCount: 0,
        timestamp: null
    }];
    if (!versionsFile) return timeline;
    for (const ver of versionsFile.versions) {
        let count = 0;
        for (const group of ['notes', 'geoMarkers', 'mapRelations']) {
            const d = ver.delta[group];
            if (!d) continue;
            count += (d.add?.length || 0) + (d.update?.length || 0) + (d.remove?.length || 0);
        }
        timeline.push({
            v: ver.v,
            chapter: ver.chapter,
            label: ver.label,
            changeCount: count,
            timestamp: ver.timestamp
        });
    }
    return timeline;
}

/**
 * 创建新版本
 * @param {Object} baseMap - 当前地图 JSON 数据
 * @param {Object} versionsFile - 当前版本文件（可能为 null）
 * @param {string} chapter - 章节关联（自由文本）
 * @param {string} label - 叙事描述
 * @returns {{versionsFile: Object, delta: Object}|null} null = 无变更
 */
function createVersion(baseMap, versionsFile, chapter, label) {
    // 获取上一版本的状态
    const prevV = versionsFile ? versionsFile.currentVersion : 0;
    const prevState = getStateAtVersion(baseMap, versionsFile, prevV);

    // 当前 state 快照
    const currentState = {
        notes:        structuredClone(state.notes),
        geoMarkers:   structuredClone(state.geoMarkers),
        mapRelations: structuredClone(state.mapRelations)
    };

    // 计算 delta
    const delta = computeDelta(prevState, currentState);
    if (isDeltaEmpty(delta)) return null;

    // 构建版本文件
    const newV = prevV + 1;
    const verEntry = {
        v: newV,
        chapter: chapter || '',
        label: label || '',
        timestamp: new Date().toLocaleString(),
        delta
    };

    if (!versionsFile) {
        versionsFile = {
            mapId: baseMap.mapName,
            currentVersion: newV,
            versions: [verEntry]
        };
    } else {
        versionsFile.currentVersion = newV;
        versionsFile.versions.push(verEntry);
    }

    return { versionsFile, delta };
}

/**
 * 版本 diff：对比两个版本的差异
 * @returns {{added: Object, removed: Object, modified: Object}}
 *   每个对象含 {notes: [], geoMarkers: [], mapRelations: []}
 */
function diffVersions(baseMap, versionsFile, vA, vB) {
    const stateA = getStateAtVersion(baseMap, versionsFile, vA);
    const stateB = getStateAtVersion(baseMap, versionsFile, vB);
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

// ==================== 版本文件读写 ====================

/**
 * 加载版本文件（从工作目录）
 * @param {string} mapName
 * @returns {Promise<Object|null>}
 */
async function loadVersionsFile(mapName) {
    if (!state.workDirHandle) return null;
    try {
        const fileHandle = await state.workDirHandle.getFileHandle(`${mapName}.versions.json`);
        const file = await fileHandle.getFile();
        const text = await file.text();
        return JSON.parse(text);
    } catch {
        return null;
    }
}

/**
 * 保存版本文件到工作目录
 * @param {string} mapName
 * @param {Object} versionsFile
 * @returns {Promise<boolean>}
 */
async function saveVersionsFile(mapName, versionsFile) {
    if (!state.workDirHandle) return false;
    return saveToDir(versionsFile, `${mapName}.versions.json`);
}

// ==================== UI 事件 ====================

/**
 * 弹出创建版本对话框
 */
function showCreateVersionDialog() {
    if (state.viewingVersion !== null) {
        alert('当前正在查看历史版本，请先回到最新版本再创建新版本！');
        return;
    }

    const chapter = prompt('章节关联（例如：第3章 水月入侵）：', '');
    if (chapter === null) return; // 用户取消

    const label = prompt('版本描述（例如：水月宫打通沉渊入口，在祭坛附近建立据点）：', '');
    if (label === null) return;

    if (!label.trim()) {
        alert('版本描述不能为空！');
        return;
    }

    // 获取当前地图数据作为基底
    const mapName = document.getElementById('currentMapName').value.trim();
    const baseMap = state.savedMaps[mapName] || buildCurrentMapData();

    const result = createVersion(baseMap, state.versions, chapter.trim(), label.trim());
    if (!result) {
        alert('当前状态与上一版本无差异，无需创建版本。');
        return;
    }

    state.versions = result.versionsFile;
    // 更新基底地图的 currentVersion
    if (state.savedMaps[mapName]) {
        state.savedMaps[mapName].currentVersion = state.versions.currentVersion;
    }

    // 保存版本文件
    saveVersionsFile(mapName, state.versions).then(ok => {
        if (ok) {
            showToast(`版本 v${state.versions.currentVersion} 已保存`);
        } else {
            // 回退模式：下载文件
            fallbackDownload(state.versions, `${mapName}.versions.json`);
        }
    });

    // 同时保存地图本体（保持同步）
    if (state.workDirHandle) {
        saveToDir(buildCurrentMapData(), `${mapName}.json`);
    }

    updateVersionTimeline();
    showToast(`已创建 v${state.versions.currentVersion}：${label.trim()}`);
}

/**
 * 构建当前地图数据对象（与 maps.js 中 saveCurrentMap 一致）
 */
function buildCurrentMapData() {
    const mapName = document.getElementById('currentMapName').value.trim() || '未命名地图';
    return {
        mapName,
        scale: state.scale,
        mapSize: state.mapSize,
        unit: { ...state.unit },
        notes: state.notes.map(n => ({...n})),
        rangeMarkers: [],
        geoMarkers: state.geoMarkers.map(g => ({...g, style: {...g.style}})),
        mapRelations: state.mapRelations.map(r => ({...r})),
        currentVersion: state.versions ? state.versions.currentVersion : 0,
        lastSaved: new Date().toLocaleString()
    };
}

/**
 * 查看指定版本
 */
function viewVersion(targetV) {
    const mapName = document.getElementById('currentMapName').value.trim();
    const baseMap = state.savedMaps[mapName];
    if (!baseMap) {
        alert('未找到地图数据！');
        return;
    }

    if (targetV === 0 && (!state.versions || state.versions.currentVersion === 0)) {
        // 没有版本，回到最新
        exitVersionView();
        return;
    }

    const versionState = getStateAtVersion(baseMap, state.versions, targetV);

    // 保存当前状态（如果还没保存过）
    if (state.viewingVersion === null) {
        state._latestState = {
            notes:        structuredClone(state.notes),
            geoMarkers:   structuredClone(state.geoMarkers),
            mapRelations: structuredClone(state.mapRelations)
        };
    }

    state.viewingVersion = targetV;
    state.notes = versionState.notes;
    state.geoMarkers = versionState.geoMarkers;
    state.mapRelations = versionState.mapRelations;

    // 显示版本提示条
    showVersionBanner(targetV);

    // 禁用编辑面板
    setEditingDisabled(true);

    updateAllLists();
    renderMap();
    updateVersionTimeline();
}

/**
 * 退出版本查看，回到最新状态
 */
function exitVersionView() {
    if (state._latestState) {
        state.notes = state._latestState.notes;
        state.geoMarkers = state._latestState.geoMarkers;
        state.mapRelations = state._latestState.mapRelations;
        delete state._latestState;
    }
    state.viewingVersion = null;
    hideVersionBanner();
    setEditingDisabled(false);
    updateAllLists();
    renderMap();
    updateVersionTimeline();
}

/**
 * 显示版本提示条
 */
function showVersionBanner(v) {
    let banner = document.getElementById('versionBanner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'versionBanner';
        banner.style.cssText = `
            position: fixed; top: 60px; left: 0; right: 0;
            background: #fff3cd; border-bottom: 2px solid #ffc107;
            padding: 8px 20px; font-size: 14px; color: #856404;
            display: flex; justify-content: space-between; align-items: center;
            z-index: 200; box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        `;
        document.body.appendChild(banner);
    }
    const verInfo = state.versions?.versions?.find(ver => ver.v === v);
    const chapterStr = verInfo?.chapter ? ` @ ${verInfo.chapter}` : '';
    const labelStr = verInfo?.label ? ` — ${verInfo.label}` : '';
    banner.innerHTML = `
        <span>📍 正在查看 <strong>v${v}${chapterStr}</strong>${labelStr} — 非最新版本（只读）</span>
        <button onclick="exitVersionView()" style="
            padding: 4px 12px; border: 1px solid #856404; border-radius: 4px;
            background: #fff; color: #856404; cursor: pointer; font-size: 13px;
        ">回到最新版本</button>
    `;
}

/**
 * 隐藏版本提示条
 */
function hideVersionBanner() {
    const banner = document.getElementById('versionBanner');
    if (banner) banner.remove();
}

/**
 * 禁用/启用编辑面板
 */
function setEditingDisabled(disabled) {
    // 禁用添加按钮和输入
    const ids = [
        'addManualNoteBtn', 'addGeoBtn', 'addRelationBtn',
        'saveBtn', 'clearBtn', 'newMapBtn', 'saveUnitBtn',
        'manualNoteName', 'manualNoteX', 'manualNoteY', 'manualNoteContent',
        'geoName', 'geoShape', 'geoPresetType', 'geoPoints',
        'geoRectX', 'geoRectY', 'geoRectW', 'geoRectH',
        'geoEllipseCx', 'geoEllipseCy', 'geoEllipseRx', 'geoEllipseRy',
        'geoPinX', 'geoPinY',
        'geoStrokeColor', 'geoStrokeColorText', 'geoFillColor', 'geoFillColorText',
        'geoLineWidth', 'geoBold',
        'unitName', 'unitDesc',
        'currentMapName', 'targetMapName', 'currentMapXY', 'targetMapXY'
    ];
    for (const id of ids) {
        const el = document.getElementById(id);
        if (el) el.disabled = disabled;
    }
    // 禁用地图关联按钮
    const relBtn = document.getElementById('addRelationBtn');
    if (relBtn) relBtn.disabled = disabled;
}
