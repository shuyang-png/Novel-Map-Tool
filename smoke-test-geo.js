/**
 * 地理标识 P0 快速冒烟测试
 * 使用方式：在浏览器控制台中执行 runSmokeTest()
 */

(function () {
  'use strict';

  const results = [];
  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      passed++;
      results.push(`✅ PASS: ${testName}`);
    } else {
      failed++;
      results.push(`❌ FAIL: ${testName}`);
      throw new Error(`FAIL: ${testName}`);
    }
  }

  function runSmokeTest() {
    results.length = 0;
    passed = 0;
    failed = 0;

    console.log('🧪 开始地理标识 P0 冒烟测试...\n');

    // ==================== 前置检查 ====================
    assert(typeof state !== 'undefined', 'state 对象存在');
    assert(Array.isArray(state.geoMarkers), 'state.geoMarkers 是数组');

    const initialCount = state.geoMarkers.length;

    // ==================== 1. 添加折线 ====================
    document.getElementById('geoName').value = '_test_河流';
    document.getElementById('geoShape').value = 'polyline';
    document.getElementById('geoShape').dispatchEvent(new Event('change'));
    document.getElementById('geoPoints').value = '100,100\n200,200\n300,150';
    document.getElementById('geoStrokeColor').value = '#ff0000';
    document.getElementById('geoStrokeColorText').value = '#ff0000';
    document.getElementById('geoLineWidth').value = '3';
    document.getElementById('geoBold').checked = false;
    document.getElementById('addGeoBtn').dispatchEvent(new MouseEvent('click', {bubbles: true}));

    assert(state.geoMarkers.length === initialCount + 1, '折线：数量 +1');

    const polyline = state.geoMarkers.find(g => g.name === '_test_河流');
    assert(!!polyline, '折线：能找到添加的标识');
    assert(polyline.type === 'polyline', '折线：type 正确');
    assert(polyline.points.length === 3, '折线：顶点数正确');
    assert(polyline.points[0].x === 100 && polyline.points[0].y === 100, '折线：第一个顶点坐标正确');
    assert(polyline.style.strokeColor === '#ff0000', '折线：边框颜色正确');
    assert(polyline.style.lineWidth === 3, '折线：线宽正确');
    assert(polyline.style.bold === false, '折线：粗线标记正确');
    assert(polyline.arrowEnd === false, '折线：箭头标记为 false');
    assert(polyline.id.startsWith('geo_'), '折线：ID 格式正确');

    // ==================== 2. 添加多边形 ====================
    document.getElementById('geoPresetType').value = '森林';
    document.getElementById('geoPresetType').dispatchEvent(new Event('change'));
    document.getElementById('geoName').value = '_test_森林';
    document.getElementById('geoShape').value = 'polygon';
    document.getElementById('geoShape').dispatchEvent(new Event('change'));
    document.getElementById('geoPoints').value = '500,500\n700,450\n750,650\n550,700';
    document.getElementById('geoStrokeColor').value = '#27ae60';
    document.getElementById('geoStrokeColorText').value = '#27ae60';
    document.getElementById('geoLineWidth').value = '2';
    document.getElementById('geoBold').checked = false;
    document.getElementById('addGeoBtn').dispatchEvent(new MouseEvent('click', {bubbles: true}));

    assert(state.geoMarkers.length === initialCount + 2, '多边形：数量 +1');

    const polygon = state.geoMarkers.find(g => g.name === '_test_森林');
    assert(!!polygon, '多边形：能找到添加的标识');
    assert(polygon.type === 'polygon', '多边形：type 正确');
    assert(polygon.points.length === 4, '多边形：顶点数正确');
    assert(polygon.style.fillColor !== null, '多边形：有填充色');
    assert(polygon.style.fillColor.includes('rgba'), '多边形：填充色为 rgba 格式');

    // ==================== 3. 粗线选项 ====================
    document.getElementById('geoName').value = '_test_粗线';
    document.getElementById('geoShape').value = 'polyline';
    document.getElementById('geoShape').dispatchEvent(new Event('change'));
    document.getElementById('geoPoints').value = '100,800\n400,900';
    document.getElementById('geoStrokeColor').value = '#000000';
    document.getElementById('geoStrokeColorText').value = '#000000';
    document.getElementById('geoLineWidth').value = '2';
    document.getElementById('geoBold').checked = true;
    document.getElementById('addGeoBtn').dispatchEvent(new MouseEvent('click', {bubbles: true}));

    const boldLine = state.geoMarkers.find(g => g.name === '_test_粗线');
    assert(!!boldLine, '粗线：能找到');
    assert(boldLine.style.bold === true, '粗线：bold 标记为 true');

    // ==================== 4. 多边形至少3个顶点校验 ====================
    document.getElementById('geoPresetType').value = '通用';
    document.getElementById('geoPresetType').dispatchEvent(new Event('change'));
    const alertMsg = [];
    const origAlert = window.alert;
    window.alert = (msg) => alertMsg.push(msg);

    document.getElementById('geoName').value = '_test_无效多边形';
    document.getElementById('geoShape').value = 'polygon';
    document.getElementById('geoShape').dispatchEvent(new Event('change'));
    document.getElementById('geoPoints').value = '100,100\n200,200'; // 只有2个点
    document.getElementById('addGeoBtn').dispatchEvent(new MouseEvent('click', {bubbles: true}));

    assert(alertMsg.some(m => m.includes('3个顶点')), '校验：多边形不足3顶点弹出提示');
    assert(state.geoMarkers.find(g => g.name === '_test_无效多边形') === undefined, '校验：无效多边形未添加');

    window.alert = origAlert;

    // ==================== 5. 折线至少2个顶点校验 ====================
    // 需要先选通用预设（无形状约束），否则面状预设会禁用polyline
    document.getElementById('geoPresetType').value = '通用';
    document.getElementById('geoPresetType').dispatchEvent(new Event('change'));
    const alertMsg2 = [];
    window.alert = (msg) => alertMsg2.push(msg);

    document.getElementById('geoName').value = '_test_无效折线';
    document.getElementById('geoShape').value = 'polyline';
    document.getElementById('geoShape').dispatchEvent(new Event('change'));
    document.getElementById('geoPoints').value = '100,100'; // 只有1个点
    document.getElementById('addGeoBtn').dispatchEvent(new MouseEvent('click', {bubbles: true}));

    assert(alertMsg2.some(m => m.includes('2个顶点')), '校验：折线不足2顶点弹出提示');

    window.alert = origAlert;

    // ==================== 6. 列表更新 ====================
    const geoListEl = document.getElementById('geoList');
    const listItems = geoListEl.querySelectorAll('.list-item');
    assert(listItems.length >= 3, '列表：显示条数正确');

    // ==================== 7. 数据序列化 ====================
    const savedData = {
      geoMarkers: state.geoMarkers.map(g => ({ ...g, style: { ...g.style } }))
    };
    const jsonStr = JSON.stringify(savedData);
    const parsed = JSON.parse(jsonStr);

    assert(Array.isArray(parsed.geoMarkers), '序列化：geoMarkers 是数组');
    assert(parsed.geoMarkers.length === state.geoMarkers.length, '序列化：数量一致');

    const parsedPolyline = parsed.geoMarkers.find(g => g.type === 'polyline' && g.name === '_test_河流');
    assert(!!parsedPolyline, '序列化：折线完整');
    assert(parsedPolyline.points.length === 3, '序列化：折线顶点完整');
    assert(parsedPolyline.style.strokeColor === '#ff0000', '序列化：折线样式完整');

    const parsedPolygon = parsed.geoMarkers.find(g => g.type === 'polygon');
    assert(!!parsedPolygon, '序列化：多边形完整');
    assert(parsedPolygon.style.fillColor !== null, '序列化：多边形填充色完整');

    // ==================== 8. 数据加载 ====================
    const testLoadData = {
      scale: 1,
      mapSize: 2000,
      unit: { name: '里', desc: '1里=500米' },
      notes: [],
      rangeMarkers: [],
      geoMarkers: [
        {
          id: 'geo_load_test',
          type: 'polyline',
          name: '_test_加载河流',
          points: [{ x: 10, y: 20 }, { x: 30, y: 40 }],
          style: { strokeColor: '#00ff00', lineWidth: 5, lineDash: null, fillColor: null, fillOpacity: 0, bold: false },
          arrowEnd: false
        }
      ],
      mapRelations: []
    };

    // 模拟 applyMapData 的核心逻辑
    const prevCount = state.geoMarkers.length;
    state.geoMarkers = testLoadData.geoMarkers || [];
    assert(state.geoMarkers.length === 1, '加载：geoMarkers 数量正确');
    assert(state.geoMarkers[0].name === '_test_加载河流', '加载：名称正确');
    assert(state.geoMarkers[0].points.length === 2, '加载：顶点正确');
    assert(state.geoMarkers[0].style.strokeColor === '#00ff00', '加载：样式正确');

    // 恢复原始数据
    state.geoMarkers = JSON.parse(jsonStr).geoMarkers;
    assert(state.geoMarkers.length === prevCount, '恢复：数据还原');

    // ==================== 9. 删除 ====================
    const delCount = state.geoMarkers.length;
    const delId = state.geoMarkers[0].id;
    deleteGeoMarker(delId);
    assert(state.geoMarkers.length === delCount - 1, '删除：数量 -1');
    assert(state.geoMarkers.find(g => g.id === delId) === undefined, '删除：目标已移除');

    // ==================== 10. editGeoMarker 加载到表单 ====================
    if (state.geoMarkers.length > 0) {
      const editTarget = state.geoMarkers[0];
      editGeoMarker(editTarget.id);
      assert(document.getElementById('geoName').value === editTarget.name, '编辑：名称加载到表单');
      assert(state.geoMarkers.find(g => g.id === editTarget.id) === undefined, '编辑：旧标识已移除（等待重新添加）');
    }

    // ==================== 11. 布局检查 ====================
    const funcPanel = document.querySelector('.func-panel');
    const mapContainer = document.querySelector('.map-container');
    assert(!!funcPanel, '布局：左侧功能面板存在');
    assert(!!mapContainer, '布局：右侧地图容器存在');

    // 检查功能面板内部各区块是否为同级（非嵌套）
    const funcGroups = funcPanel.querySelectorAll(':scope > .func-group');
    assert(funcGroups.length >= 6, `布局：功能区块数量正确（期望≥6，实际${funcGroups.length}）`);

    // 检查量化单位和地图关联是否为独立的功能区块（非嵌套在地理标识内）
    const geoGroup = Array.from(funcGroups).find(g => g.querySelector('#geoList'));
    const unitGroup = Array.from(funcGroups).find(g => g.querySelector('#saveUnitBtn'));
    const relationGroup = Array.from(funcGroups).find(g => g.querySelector('#addRelationBtn'));
    assert(!!geoGroup, '布局：地理标识是独立功能区块');
    assert(!!unitGroup, '布局：量化单位是独立功能区块（未被嵌套）');
    assert(!!relationGroup, '布局：地图关联是独立功能区块（未被嵌套）');

    // 检查地图容器有 canvas
    const canvas = mapContainer.querySelector('#mapCanvas');
    assert(!!canvas, '布局：地图画布存在');
    assert(canvas.width > 0 && canvas.height > 0, '布局：画布尺寸有效');

    // ==================== 12. 坐标点（addManualNote）====================
    const noteInitCount = state.notes.length;

    // 正常添加
    document.getElementById('manualNoteName').value = '_test_王城';
    document.getElementById('manualNoteX').value = '500';
    document.getElementById('manualNoteY').value = '600';
    document.getElementById('manualNoteContent').value = '测试备注内容';
    document.getElementById('addManualNoteBtn').click();

    assert(state.notes.length === noteInitCount + 1, '坐标点：添加后数量 +1');
    const note1 = state.notes.find(n => n.name === '_test_王城');
    assert(!!note1, '坐标点：能找到添加的点');
    if (note1) {
      assert(note1.x === 500 && note1.y === 600, '坐标点：坐标正确');
      assert(note1.content === '测试备注内容', '坐标点：备注内容正确');
      assert(note1.id.startsWith('note_'), '坐标点：ID 格式正确');
    }

    // 坐标范围校验（X 超出）
    const noteAlerts = [];
    const origNoteAlert = window.alert;
    window.alert = (msg) => noteAlerts.push(msg);

    document.getElementById('manualNoteName').value = '_test_越界';
    document.getElementById('manualNoteX').value = '3000';
    document.getElementById('manualNoteY').value = '500';
    document.getElementById('manualNoteContent').value = '';
    document.getElementById('addManualNoteBtn').click();

    assert(noteAlerts.some(m => m.includes('X坐标') || m.includes('0~2000')), '坐标点校验：X超出范围弹出提示');
    assert(state.notes.find(n => n.name === '_test_越界') === undefined, '坐标点校验：越界点未添加');

    // 名称为空校验
    noteAlerts.length = 0;
    document.getElementById('manualNoteName').value = '';
    document.getElementById('manualNoteX').value = '500';
    document.getElementById('manualNoteY').value = '500';
    document.getElementById('addManualNoteBtn').click();

    assert(noteAlerts.some(m => m.includes('名称') || m.includes('不能为空')), '坐标点校验：空名称弹出提示');

    window.alert = origNoteAlert;

    // 再添加一个坐标点（用于后续关联测试）
    document.getElementById('manualNoteName').value = '_test_要塞';
    document.getElementById('manualNoteX').value = '800';
    document.getElementById('manualNoteY').value = '400';
    document.getElementById('manualNoteContent').value = '';
    document.getElementById('addManualNoteBtn').click();
    assert(state.notes.length === noteInitCount + 2, '坐标点：第二个点添加成功');

    // 列表更新检查
    const noteListEl = document.getElementById('noteList');
    assert(noteListEl.querySelectorAll('.list-item').length >= 2, '坐标点：列表显示正确');

    // 坐标点数据包含在 save 数据中
    const noteSaveData = {
      notes: state.notes.map(n => ({...n}))
    };
    const noteParsed = JSON.parse(JSON.stringify(noteSaveData));
    assert(noteParsed.notes.find(n => n.name === '_test_王城').content === '测试备注内容', '坐标点：序列化备注完整');

    // ==================== 13. 地图关联 =====================
    // 清除已有关联，确保干净环境
    state.mapRelations = [];
    const relMapName = document.getElementById('currentMapName').value.trim() || '主世界地图';

    // 保存当前地图和目标地图到 savedMaps
    state.savedMaps[relMapName] = {
      mapName: relMapName,
      scale: state.scale,
      mapSize: state.mapSize,
      unit: state.unit,
      notes: [...state.notes],
      rangeMarkers: [...state.rangeMarkers],
      geoMarkers: [...state.geoMarkers],
      mapRelations: [...state.mapRelations]
    };
    state.savedMaps['火焰秘境'] = {
      mapName: '火焰秘境',
      scale: 1, mapSize: 2000,
      unit: { name: '里', desc: '1里=500米' },
      notes: [], rangeMarkers: [], geoMarkers: [], mapRelations: []
    };

    // 拦截 alert
    const origRelAlert = window.alert;
    let relAlertMsg = null;
    window.alert = (msg) => { relAlertMsg = msg; };

    // 添加关联
    document.getElementById('currentMapName').value = relMapName;
    document.getElementById('targetMapName').value = '火焰秘境';
    document.getElementById('currentMapXY').value = '200,1800';
    document.getElementById('targetMapXY').value = '1000,1000';
    relAlertMsg = null;
    document.getElementById('addRelationBtn').click();

    // 正向关联在 state.mapRelations 中
    const relForward = state.mapRelations.find(r => r.targetMapName === '火焰秘境' && r.currentXY === '200,1800');
    assert(!!relForward, '关联：正向关联在当前地图中');
    if (relForward) {
      assert(relForward.targetXY === '1000,1000', '关联：正向目标坐标正确');
    }

    // 反向关联在目标地图的 savedMaps 中
    const targetRels = state.savedMaps['火焰秘境'].mapRelations || [];
    const relReverse = targetRels.find(r => r.targetMapName === relMapName && r.currentXY === '1000,1000');
    assert(!!relReverse, '关联：反向关联在目标地图 savedMaps 中');
    if (relReverse) {
      assert(relReverse.targetXY === '200,1800', '关联：反向目标坐标正确');
    }

    // 重复坐标校验
    relAlertMsg = null;
    document.getElementById('currentMapXY').value = '200,1800';
    document.getElementById('addRelationBtn').click();
    assert(relAlertMsg && (relAlertMsg.includes('已关联') || relAlertMsg.includes('不可重复')), '关联校验：重复坐标弹出提示');
    assert(state.mapRelations.filter(r => r.currentXY === '200,1800').length === 1, '关联校验：重复坐标未新增');

    // 删除关联
    const beforeDel = state.mapRelations.length;
    const delRelId = relForward ? relForward.id : null;
    if (delRelId) deleteRelation(delRelId);
    assert(state.mapRelations.length === beforeDel - 1, '关联：删除后正向关联减少');
    if (delRelId) assert(state.mapRelations.find(r => r.id === delRelId) === undefined, '关联：正向已删除');

    // 反向也应被删除（从 savedMaps 目标地图中）
    const targetRelsAfter = state.savedMaps['火焰秘境'].mapRelations || [];
    assert(!targetRelsAfter.some(r => r.targetMapName === relMapName), '关联：反向也已从目标地图删除');

    // 关联数据序列化
    document.getElementById('currentMapXY').value = '500,500';
    document.getElementById('targetMapXY').value = '200,200';
    relAlertMsg = null;
    document.getElementById('addRelationBtn').click();

    const relSave = JSON.parse(JSON.stringify({ mapRelations: state.mapRelations }));
    assert(relSave.mapRelations.length > 0, '关联：序列化数量正确');
    assert(relSave.mapRelations[0].currentMapName && relSave.mapRelations[0].targetMapName, '关联：序列化字段完整');

    // 列表更新
    const relListEl = document.getElementById('relationList');
    assert(relListEl.querySelectorAll('.list-item').length > 0, '关联：列表显示正确');

    window.alert = origRelAlert;

    // ==================== 14. 矩形(rect)类型 ====================
    document.getElementById('geoName').value = '_test_矩形城市';
    document.getElementById('geoShape').value = 'rect';
    document.getElementById('geoShape').dispatchEvent(new Event('change'));
    document.getElementById('geoRectX').value = '500';
    document.getElementById('geoRectY').value = '400';
    document.getElementById('geoRectW').value = '200';
    document.getElementById('geoRectH').value = '150';
    document.getElementById('geoStrokeColor').value = '#e74c3c';
    document.getElementById('geoStrokeColorText').value = '#e74c3c';
    document.getElementById('geoLineWidth').value = '2';
    document.getElementById('geoBold').checked = false;
    document.getElementById('addGeoBtn').dispatchEvent(new MouseEvent('click', {bubbles: true}));

    const rectGeo = state.geoMarkers.find(g => g.name === '_test_矩形城市');
    assert(!!rectGeo, 'rect：能找到添加的矩形标识');
    assert(rectGeo.type === 'rect', 'rect：type 为 rect');
    assert(rectGeo.x === 500 && rectGeo.y === 400, 'rect：起点坐标正确');
    assert(rectGeo.width === 200 && rectGeo.height === 150, 'rect：宽高正确');
    assert(rectGeo.style.strokeColor === '#e74c3c', 'rect：描边色正确');

    // ==================== 15. 椭圆(ellipse)类型 ====================
    document.getElementById('geoName').value = '_test_椭圆湖泊';
    document.getElementById('geoShape').value = 'ellipse';
    document.getElementById('geoShape').dispatchEvent(new Event('change'));
    document.getElementById('geoEllipseCx').value = '600';
    document.getElementById('geoEllipseCy').value = '500';
    document.getElementById('geoEllipseRx').value = '180';
    document.getElementById('geoEllipseRy').value = '120';
    document.getElementById('geoStrokeColor').value = '#2e86c1';
    document.getElementById('geoStrokeColorText').value = '#2e86c1';
    document.getElementById('addGeoBtn').dispatchEvent(new MouseEvent('click', {bubbles: true}));

    const ellipseGeo = state.geoMarkers.find(g => g.name === '_test_椭圆湖泊');
    assert(!!ellipseGeo, 'ellipse：能找到添加的椭圆标识');
    assert(ellipseGeo.type === 'ellipse', 'ellipse：type 为 ellipse');
    assert(ellipseGeo.cx === 600 && ellipseGeo.cy === 500, 'ellipse：中心坐标正确');
    assert(ellipseGeo.rx === 180 && ellipseGeo.ry === 120, 'ellipse：双半轴正确');

    // ==================== 16. 预设类型(presetType)自动填充 ====================
    document.getElementById('geoPresetType').value = '森林';
    document.getElementById('geoPresetType').dispatchEvent(new Event('change'));
    assert(document.getElementById('geoStrokeColor').value === '#27ae60', '预设填充：森林描边色自动填入');
    assert(document.getElementById('geoBold').checked === false, '预设填充：森林粗线为false');

    document.getElementById('geoPresetType').value = '城堡';
    document.getElementById('geoPresetType').dispatchEvent(new Event('change'));
    assert(document.getElementById('geoStrokeColor').value === '#c0392b', '预设填充：城堡描边色自动填入');
    assert(document.getElementById('geoBold').checked === true, '预设填充：城堡粗线为true');

    // ==================== 17. 城堡(castle)预设 + towers符号 ====================
    // 选择城堡预设后，形状应约束为非折线（polyline被禁用）
    const shapeEl = document.getElementById('geoShape');
    const polylineOpt = Array.from(shapeEl.options).find(o => o.value === 'polyline');
    assert(polylineOpt.disabled === true, '城堡约束：polyline 被禁用（lineOnly=false）');

    // 添加城堡矩形标识
    document.getElementById('geoName').value = '_test_城堡';
    document.getElementById('geoShape').value = 'rect';
    document.getElementById('geoShape').dispatchEvent(new Event('change'));
    document.getElementById('geoPresetType').value = '城堡';
    document.getElementById('geoPresetType').dispatchEvent(new Event('change'));
    document.getElementById('geoRectX').value = '300';
    document.getElementById('geoRectY').value = '300';
    document.getElementById('geoRectW').value = '160';
    document.getElementById('geoRectH').value = '120';
    document.getElementById('addGeoBtn').dispatchEvent(new MouseEvent('click', {bubbles: true}));

    const castleGeo = state.geoMarkers.find(g => g.name === '_test_城堡');
    assert(!!castleGeo, '城堡：能找到添加的标识');
    assert(castleGeo.type === 'rect', '城堡：type 为 rect');
    assert(castleGeo.presetType === '城堡', '城堡：presetType 正确');
    assert(castleGeo.style.symbol === 'towers', '城堡：symbol 为 towers');
    assert(castleGeo.style.strokeColor === '#c0392b', '城堡：描边色为深红');
    assert(castleGeo.style.lineWidth === 4, '城堡：线宽为4');
    assert(castleGeo.style.bold === true, '城堡：粗线标记为true');

    // ==================== 18. migrateGeoData：circle → ellipse 迁移 ====================
    const mockData = {
      geoMarkers: [{
        id: 'geo_old_circle',
        type: 'circle',
        name: '_test_旧圆形',
        center: { x: 100, y: 200 },
        radius: 80
      }],
      rangeMarkers: []
    };
    const migrated = migrateGeoData(mockData);
    const migratedCircle = migrated.find(g => g.name === '_test_旧圆形');
    assert(!!migratedCircle, '迁移：旧circle被保留');
    assert(migratedCircle.type === 'ellipse', '迁移：circle → ellipse');
    assert(migratedCircle.cx === 100 && migratedCircle.cy === 200, '迁移：center → cx/cy');
    assert(migratedCircle.rx === 80 && migratedCircle.ry === 80, '迁移：radius → rx=ry');
    assert(migratedCircle.presetType === '通用', '迁移：补充默认presetType');
    assert(!!migratedCircle.style, '迁移：补充默认style');

    // ==================== 19. migrateGeoData：rangeMarkers → geoMarkers ====================
    const mockData2 = {
      geoMarkers: [],
      rangeMarkers: [
        {
          id: 'marker_test_rect',
          name: '_test_旧矩形范围',
          type: 'rect',
          params: { x1: 100, y1: 100, x2: 300, y2: 100, x3: 300, y3: 200, x4: 100, y4: 200 }
        },
        {
          id: 'marker_test_circle',
          name: '_test_旧圆形范围',
          type: 'circle',
          params: { cx: 500, cy: 500, r: 100 }
        }
      ]
    };
    const migrated2 = migrateGeoData(mockData2);
    const migratedRect = migrated2.find(g => g.name === '_test_旧矩形范围');
    assert(!!migratedRect, '迁移range→geo：矩形被迁移');
    assert(migratedRect.type === 'rect', '迁移range→geo：rect类型正确');
    assert(migratedRect.x === 100 && migratedRect.y === 100, '迁移range→geo：左上角正确');
    assert(migratedRect.width === 200 && migratedRect.height === 100, '迁移range→geo：宽高正确');

    const migratedRangeCircle = migrated2.find(g => g.name === '_test_旧圆形范围');
    assert(!!migratedRangeCircle, '迁移range→geo：圆形被迁移');
    assert(migratedRangeCircle.type === 'ellipse', '迁移range→geo：circle → ellipse');
    assert(migratedRangeCircle.rx === 100 && migratedRangeCircle.ry === 100, '迁移range→geo：r → rx=ry');

    // ==================== 20. lineOnly约束：河流只能折线 ====================
    document.getElementById('geoPresetType').value = '河流';
    document.getElementById('geoPresetType').dispatchEvent(new Event('change'));
    const riverPolylineOpt = Array.from(shapeEl.options).find(o => o.value === 'polyline');
    const riverRectOpt = Array.from(shapeEl.options).find(o => o.value === 'rect');
    assert(riverPolylineOpt.disabled === false, '河流约束：polyline 可用');
    assert(riverRectOpt.disabled === true, '河流约束：rect 被禁用（lineOnly=true）');

    // ==================== 21. 25种预设逐个添加 ====================
    const PRESET_TEST_CASES = [
      { preset: '河流',   shape: 'polyline', points: '100,200\n300,400', expectedSymbol: 'arrows' },
      { preset: '湖泊',   shape: 'ellipse',  cx: 500, cy: 500, rx: 100, ry: 80, expectedSymbol: 'waves' },
      { preset: '海洋',   shape: 'polygon',  points: '100,100\n400,100\n400,400\n100,400', expectedSymbol: 'ocean_waves' },
      { preset: '泉眼',   shape: 'pin',      px: 300, py: 300, expectedSymbol: 'spring' },
      { preset: '森林',   shape: 'polygon',  points: '500,500\n800,500\n800,800\n500,800', expectedSymbol: 'trees' },
      { preset: '沼泽',   shape: 'ellipse',  cx: 400, cy: 400, rx: 120, ry: 90, expectedSymbol: 'crosshatch' },
      { preset: '草原',   shape: 'rect',     rx: 100, ry: 100, rw: 200, rh: 150, expectedSymbol: 'grassland' },
      { preset: '沙漠',   shape: 'polygon',  points: '200,200\n600,200\n600,500\n200,500', expectedSymbol: 'dots' },
      { preset: '竹林',   shape: 'polygon',  points: '300,300\n500,300\n500,500\n300,500', expectedSymbol: 'bamboo' },
      { preset: '山脉',   shape: 'polyline', points: '0,500\n200,300\n400,500\n600,300', expectedSymbol: 'zigzag' },
      { preset: '悬崖',   shape: 'polyline', points: '100,100\n300,200\n500,100', expectedSymbol: 'cliff' },
      { preset: '火山',   shape: 'pin',      px: 400, py: 400, expectedSymbol: 'volcano' },
      { preset: '雪峰',   shape: 'pin',      px: 500, py: 300, expectedSymbol: 'snow_peak' },
      { preset: '洞穴',   shape: 'pin',      px: 200, py: 600, expectedSymbol: 'cave' },
      { preset: '城市',   shape: 'rect',     rx: 300, ry: 300, rw: 180, rh: 140, expectedSymbol: 'grid' },
      { preset: '城堡',   shape: 'rect',     rx: 400, ry: 400, rw: 160, rh: 120, expectedSymbol: 'towers' },
      { preset: '村庄',   shape: 'pin',      px: 350, py: 350, expectedSymbol: 'village' },
      { preset: '庙宇',   shape: 'pin',      px: 450, py: 250, expectedSymbol: 'temple' },
      { preset: '废墟',   shape: 'pin',      px: 150, py: 450, expectedSymbol: 'ruin' },
      { preset: '道路',   shape: 'polyline', points: '0,0\n500,500', expectedSymbol: 'marks' },
      { preset: '城墙',   shape: 'polyline', points: '100,100\n400,100\n400,400', expectedSymbol: 'doubleline' },
      { preset: '行军路线', shape: 'polyline', points: '0,500\n300,300\n600,500', expectedSymbol: 'route' },
      { preset: '桥梁',   shape: 'polyline', points: '100,400\n500,400', expectedSymbol: 'bridge' },
      { preset: '王国',   shape: 'polygon',  points: '100,100\n700,100\n700,600\n100,600', expectedSymbol: 'kingdom' },
      { preset: '营地',   shape: 'ellipse',  cx: 400, cy: 400, rx: 100, ry: 80, expectedSymbol: 'tent' }
    ];

    const presetBeforeCount = state.geoMarkers.length;
    PRESET_TEST_CASES.forEach(tc => {
      document.getElementById('geoPresetType').value = tc.preset;
      document.getElementById('geoPresetType').dispatchEvent(new Event('change'));
      document.getElementById('geoShape').value = tc.shape;
      document.getElementById('geoShape').dispatchEvent(new Event('change'));
      document.getElementById('geoName').value = '_test_preset_' + tc.preset;

      if (tc.shape === 'polyline' || tc.shape === 'polygon') {
        document.getElementById('geoPoints').value = tc.points;
      } else if (tc.shape === 'rect') {
        document.getElementById('geoRectX').value = tc.rx;
        document.getElementById('geoRectY').value = tc.ry;
        document.getElementById('geoRectW').value = tc.rw;
        document.getElementById('geoRectH').value = tc.rh;
      } else if (tc.shape === 'ellipse') {
        document.getElementById('geoEllipseCx').value = tc.cx;
        document.getElementById('geoEllipseCy').value = tc.cy;
        document.getElementById('geoEllipseRx').value = tc.rx;
        document.getElementById('geoEllipseRy').value = tc.ry;
      } else if (tc.shape === 'pin') {
        document.getElementById('geoPinX').value = tc.px;
        document.getElementById('geoPinY').value = tc.py;
      }
      document.getElementById('addGeoBtn').dispatchEvent(new MouseEvent('click', {bubbles: true}));
    });

    const presetAddedCount = state.geoMarkers.length - presetBeforeCount;
    assert(presetAddedCount === 25, `25种预设全部添加成功（实际添加${presetAddedCount}个）`);

    // 验证每个预设的 presetType 和 symbol
    PRESET_TEST_CASES.forEach(tc => {
      const geo = state.geoMarkers.find(g => g.name === '_test_preset_' + tc.preset);
      assert(!!geo, `预设[${tc.preset}]：数据存在`);
      if (geo) {
        assert(geo.presetType === tc.preset, `预设[${tc.preset}]：presetType 正确`);
        assert(geo.style.symbol === tc.expectedSymbol, `预设[${tc.preset}]：symbol=${tc.expectedSymbol}`);
      }
    });

    // ==================== 22. rect/ellipse 编辑和删除 ====================
    const editRect = state.geoMarkers.find(g => g.name === '_test_preset_城市');
    if (editRect) {
      const editRectId = editRect.id;
      editGeoMarker(editRectId);
      // 编辑后旧数据被移除，表单被填充
      assert(state.geoMarkers.find(g => g.id === editRectId) === undefined, 'rect编辑：旧数据已移除');
      assert(document.getElementById('geoName').value === '_test_preset_城市', 'rect编辑：名称加载到表单');
      assert(document.getElementById('geoShape').value === 'rect', 'rect编辑：形状加载正确');

      // 修改后重新添加
      document.getElementById('geoName').value = '_test_矩形已编辑';
      document.getElementById('geoRectW').value = '300';
      document.getElementById('addGeoBtn').dispatchEvent(new MouseEvent('click', {bubbles: true}));
      const editedRect = state.geoMarkers.find(g => g.name === '_test_矩形已编辑');
      assert(!!editedRect, 'rect编辑：重新添加成功');
      assert(editedRect.width === 300, 'rect编辑：新宽度生效');
      assert(editedRect.type === 'rect', 'rect编辑：类型保持rect');
    }

    const editEllipse = state.geoMarkers.find(g => g.name === '_test_preset_湖泊');
    if (editEllipse) {
      const editEllipseId = editEllipse.id;
      editGeoMarker(editEllipseId);
      assert(state.geoMarkers.find(g => g.id === editEllipseId) === undefined, 'ellipse编辑：旧数据已移除');
      assert(document.getElementById('geoShape').value === 'ellipse', 'ellipse编辑：形状加载正确');

      document.getElementById('geoName').value = '_test_椭圆已编辑';
      document.getElementById('geoEllipseRx').value = '250';
      document.getElementById('addGeoBtn').dispatchEvent(new MouseEvent('click', {bubbles: true}));
      const editedEllipse = state.geoMarkers.find(g => g.name === '_test_椭圆已编辑');
      assert(!!editedEllipse, 'ellipse编辑：重新添加成功');
      assert(editedEllipse.rx === 250, 'ellipse编辑：新rx生效');
    }

    // 删除 rect
    const delRectTarget = state.geoMarkers.find(g => g.name === '_test_矩形已编辑');
    if (delRectTarget) {
      const beforeDel = state.geoMarkers.length;
      deleteGeoMarker(delRectTarget.id);
      assert(state.geoMarkers.length === beforeDel - 1, 'rect删除：数量-1');
    }

    // 删除 ellipse
    const delEllipseTarget = state.geoMarkers.find(g => g.name === '_test_椭圆已编辑');
    if (delEllipseTarget) {
      const beforeDel2 = state.geoMarkers.length;
      deleteGeoMarker(delEllipseTarget.id);
      assert(state.geoMarkers.length === beforeDel2 - 1, 'ellipse删除：数量-1');
    }

    // ==================== 23. 序列化 roundtrip：rect/ellipse ====================
    // 构造含 rect 和 ellipse 的测试数据
    const roundtripData = {
      scale: 1, mapSize: 2000,
      unit: { name: '里', desc: '1里=500米' },
      notes: [],
      rangeMarkers: [],
      geoMarkers: [
        {
          id: 'rt_rect_1', presetType: '城堡', type: 'rect', name: '_test_rt_城堡',
          x: 300, y: 400, width: 200, height: 150,
          style: { strokeColor: '#c0392b', lineWidth: 4, lineDash: null, fillColor: 'rgba(192,57,43,0.1)', bold: true, symbol: 'towers' }
        },
        {
          id: 'rt_ellipse_1', presetType: '湖泊', type: 'ellipse', name: '_test_rt_湖泊',
          cx: 600, cy: 500, rx: 180, ry: 120,
          style: { strokeColor: '#2e86c1', lineWidth: 2, lineDash: null, fillColor: 'rgba(46,134,193,0.25)', bold: false, symbol: 'waves' }
        },
        {
          id: 'rt_poly_1', presetType: '河流', type: 'polyline', name: '_test_rt_河流',
          points: [{x:100,y:100},{x:300,y:250},{x:500,y:200}],
          style: { strokeColor: '#5dade2', lineWidth: 3, lineDash: null, fillColor: null, bold: false, symbol: 'arrows' }
        }
      ],
      mapRelations: []
    };

    // 序列化 → JSON → 反序列化
    const rtJson = JSON.stringify(roundtripData);
    const rtParsed = JSON.parse(rtJson);

    // rect roundtrip
    const rtRect = rtParsed.geoMarkers.find(g => g.type === 'rect');
    assert(!!rtRect, 'roundtrip：rect 存在');
    assert(rtRect.x === 300 && rtRect.y === 400, 'roundtrip：rect 坐标完整');
    assert(rtRect.width === 200 && rtRect.height === 150, 'roundtrip：rect 宽高完整');
    assert(rtRect.style.symbol === 'towers', 'roundtrip：rect symbol 完整');
    assert(rtRect.style.bold === true, 'roundtrip：rect bold 完整');

    // ellipse roundtrip
    const rtEllipse = rtParsed.geoMarkers.find(g => g.type === 'ellipse');
    assert(!!rtEllipse, 'roundtrip：ellipse 存在');
    assert(rtEllipse.cx === 600 && rtEllipse.cy === 500, 'roundtrip：ellipse 中心完整');
    assert(rtEllipse.rx === 180 && rtEllipse.ry === 120, 'roundtrip：ellipse 双半轴完整');
    assert(rtEllipse.style.fillColor === 'rgba(46,134,193,0.25)', 'roundtrip：ellipse fillColor 完整');

    // polyline roundtrip
    const rtPoly = rtParsed.geoMarkers.find(g => g.type === 'polyline');
    assert(!!rtPoly, 'roundtrip：polyline 存在');
    assert(rtPoly.points.length === 3, 'roundtrip：polyline 顶点数完整');
    assert(rtPoly.points[1].x === 300 && rtPoly.points[1].y === 250, 'roundtrip：polyline 中间顶点完整');

    // 通过 migrateGeoData 加载（模拟真实加载流程）
    const rtMigrated = migrateGeoData(rtParsed);
    assert(rtMigrated.length === 3, 'roundtrip migrate：数量不变');
    assert(rtMigrated.find(g => g.type === 'rect').x === 300, 'roundtrip migrate：rect 数据保留');
    assert(rtMigrated.find(g => g.type === 'ellipse').rx === 180, 'roundtrip migrate：ellipse 数据保留');

    // ==================== 24. pin 点击地图放置模式 ====================
    assert(state.geoPinPlacementMode === false, 'pin放置：初始状态为false');
    assert(!!document.getElementById('geoPinClickBtn'), 'pin放置：按钮存在');
    assert(!!document.getElementById('geoPinClickHint'), 'pin放置：提示元素存在');

    // 切换到pin形状并选中一个pin预设
    document.getElementById('geoPresetType').value = '村庄';
    document.getElementById('geoPresetType').dispatchEvent(new Event('change'));
    document.getElementById('geoShape').value = 'pin';
    document.getElementById('geoShape').dispatchEvent(new Event('change'));

    // 进入放置模式
    toggleGeoPinPlacement();
    assert(state.geoPinPlacementMode === true, 'pin放置：点击按钮后进入放置模式');
    assert(document.getElementById('geoPinClickHint').style.display === 'block', 'pin放置：提示显示');
    assert(document.getElementById('geoPinClickBtn').textContent.includes('取消'), 'pin放置：按钮文字变取消');
    assert(canvas.style.cursor === 'crosshair', 'pin放置：光标变十字');

    // 模拟点击地图（通过直接调用 handleCanvasClick 并传入 mock event）
    const mockEvent = {
      clientX: canvas.getBoundingClientRect().left + 400,
      clientY: canvas.getBoundingClientRect().top + 300
    };
    state.dragMoved = false;
    handleCanvasClick(mockEvent);
    assert(state.geoPinPlacementMode === false, 'pin放置：点击后自动退出放置模式');
    assert(document.getElementById('geoPinClickHint').style.display === 'none', 'pin放置：提示隐藏');
    assert(canvas.style.cursor === 'default', 'pin放置：光标恢复默认');

    const placedX = parseInt(document.getElementById('geoPinX').value);
    const placedY = parseInt(document.getElementById('geoPinY').value);
    assert(!isNaN(placedX) && !isNaN(placedY), 'pin放置：坐标已填入表单');
    assert(placedX >= 0 && placedX <= 2000 && placedY >= 0 && placedY <= 2000, 'pin放置：坐标在有效范围内');

    // 再次切换进入再取消
    toggleGeoPinPlacement();
    assert(state.geoPinPlacementMode === true, 'pin放置：再次进入');
    toggleGeoPinPlacement();
    assert(state.geoPinPlacementMode === false, 'pin放置：手动取消退出');

    // ==================== 25. rangeMarkers 清理验证 ====================
    assert(!document.getElementById('markerList'), '清理：旧markerList元素已移除');
    assert(!document.getElementById('addMarkerBtn'), '清理：旧addMarkerBtn已移除');
    assert(typeof addRangeMarker === 'undefined', '清理：addRangeMarker函数已移除');
    assert(typeof toggleMarkerParams === 'undefined', '清理：toggleMarkerParams函数已移除');
    assert(typeof updateMarkerList === 'undefined', '清理：updateMarkerList函数已移除');

    // ==================== 清理测试数据 ====================
    state.geoMarkers = state.geoMarkers.filter(g => !g.name.startsWith('_test_'));
    state.notes = state.notes.filter(n => !n.name.startsWith('_test_'));
    state.mapRelations = state.mapRelations.filter(r => {
      const tName = r.targetMapName || '';
      const cName = r.currentMapName || '';
      return !tName.startsWith('_test_') && !cName.startsWith('_test_');
    });
    delete state.savedMaps['火焰秘境'];
    updateGeoList();
    updateNoteList();
    updateRelationList();

    // ==================== 输出结果 ====================
    console.log('\n' + '='.repeat(50));
    console.log(`📊 测试结果: ${passed} 通过 / ${failed} 失败`);
    console.log('='.repeat(50));
    results.forEach(r => console.log(r));
    console.log('='.repeat(50));

    if (failed === 0) {
      console.log('🎉 全部通过！');
    } else {
      console.log('⚠️ 有失败用例，请检查。');
    }

    return { passed, failed, results: [...results] };
  }

  // 暴露到全局
  window.runSmokeTest = runSmokeTest;
  console.log('✅ 冒烟测试脚本已加载，执行 runSmokeTest() 开始测试');
})();
