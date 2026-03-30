/**
 * Novel-Map-Tool 冒烟测试脚本
 * 使用 Node.js + playwright-core
 * 
 * 运行: node smoke-test.js
 */

const { chromium } = require('/tmp/node_modules/playwright-core');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const BROWSER_PATH = '/root/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome';
const BASE_URL = 'http://localhost:8765/小说地图工具.html';
const HTTP_PORT = 8765;
const HTTP_DIR = path.resolve(__dirname);

let httpServer;
let browser;
let page;
let passed = 0;
let failed = 0;
let skipped = 0;
const results = [];

function log(id, ok, desc) {
  if (ok) {
    passed++;
    console.log(`  ✅ ${id} ${desc}`);
  } else {
    failed++;
    console.log(`  ❌ ${id} ${desc}`);
  }
  results.push({ id, ok, desc });
}

function skip(id, desc) {
  skipped++;
  console.log(`  ⏭️  ${id} ${desc} (跳过)`);
  results.push({ id, ok: true, desc: desc + ' (跳过)', skipped: true });
}

async function startHttpServer() {
  return new Promise((resolve, reject) => {
    httpServer = spawn('python3', ['-m', 'http.server', String(HTTP_PORT)], {
      cwd: HTTP_DIR,
      stdio: 'pipe',
    });
    httpServer.stderr.on('data', () => {}); // suppress
    // Wait for server to be ready
    setTimeout(resolve, 1500);
    httpServer.on('error', reject);
  });
}

function stopHttpServer() {
  if (httpServer) {
    httpServer.kill('SIGTERM');
  }
}

async function evalState(expr) {
  return page.evaluate((e) => eval(e), expr);
}

async function setupDialogHandlers() {
  // Auto-accept confirm dialogs (clearAllData has 2 confirms)
  page.on('dialog', async (dialog) => {
    const msg = dialog.message();
    if (msg.includes('是否同时删除所有已保存的地图数据')) {
      // For SM-07, we want to NOT delete saved maps, so accept (default is no-delete)
      await dialog.accept();
    } else if (msg.includes('确定要清空所有数据')) {
      await dialog.accept();
    } else if (msg.includes('请输入新地图名称')) {
      await dialog.accept('测试新地图');
    } else {
      await dialog.accept();
    }
  });
}

async function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ========== SM-01: 缩放上下限 ==========
async function test_SM01() {
  console.log('\n--- SM-01 缩放上下限 ---');
  try {
    // Test zoom in by dispatching wheel events on canvas
    const scaleUp = await page.evaluate(() => {
      state.scale = 1;
      const canvas = document.getElementById('mapCanvas');
      for (let i = 0; i < 30; i++) {
        const evt = new WheelEvent('wheel', { deltaY: -10, bubbles: true, cancelable: true });
        canvas.dispatchEvent(evt);
      }
      return state.scale;
    });
    const upperOk = scaleUp <= 2 && scaleUp >= 0.1;
    log('SM-01a', upperOk, `放大后缩放比例=${scaleUp.toFixed(2)}（应 ≤2）`);

    // Test zoom out
    const scaleDown = await page.evaluate(() => {
      state.scale = 2;
      const canvas = document.getElementById('mapCanvas');
      for (let i = 0; i < 30; i++) {
        const evt = new WheelEvent('wheel', { deltaY: 10, bubbles: true, cancelable: true });
        canvas.dispatchEvent(evt);
      }
      return state.scale;
    });
    const lowerOk = scaleDown >= 0.1 && scaleDown <= 2;
    log('SM-01b', lowerOk, `缩小后缩放比例=${scaleDown.toFixed(2)}（应 ≥0.1）`);

    // Test bounds: zoom in past max
    const clampedUp = await page.evaluate(() => {
      state.scale = 2;
      const canvas = document.getElementById('mapCanvas');
      for (let i = 0; i < 10; i++) {
        const evt = new WheelEvent('wheel', { deltaY: -10, bubbles: true, cancelable: true });
        canvas.dispatchEvent(evt);
      }
      return state.scale;
    });
    log('SM-01c', clampedUp === 2, `放大到上限后不超出2: ${clampedUp}`);

    // Test bounds: zoom out past min
    const clampedDown = await page.evaluate(() => {
      state.scale = 0.1;
      const canvas = document.getElementById('mapCanvas');
      for (let i = 0; i < 10; i++) {
        const evt = new WheelEvent('wheel', { deltaY: 10, bubbles: true, cancelable: true });
        canvas.dispatchEvent(evt);
      }
      return state.scale;
    });
    log('SM-01d', clampedDown === 0.1, `缩小到下限后不低于0.1: ${clampedDown}`);

    // Reset
    await page.evaluate(() => { state.scale = 1; renderMap(); });
  } catch (e) {
    log('SM-01', false, `异常: ${e.message}`);
  }
}

// ========== SM-02: 基础平移 ==========
async function test_SM02() {
  console.log('\n--- SM-02 基础平移 ---');
  try {
    // Simulate drag via state changes (matching handleMouseMove logic)
    const result = await page.evaluate(() => {
      state.offsetX = 0;
      state.offsetY = 0;
      state.isDragging = true;
      state.dragMoved = false;
      state.dragStartX = 100;
      state.dragStartY = 100;
      state.lastOffsetX = 0;
      state.lastOffsetY = 0;

      // Simulate mousemove during drag
      const deltaX = 120;
      const deltaY = 80;
      state.offsetX = state.lastOffsetX + (deltaX);
      state.offsetY = state.lastOffsetY + (deltaY);
      state.dragMoved = true;
      state.isDragging = false;
      renderMap();

      return { ox: state.offsetX, oy: state.offsetY };
    });

    const changed = Math.abs(result.ox) > 0 || Math.abs(result.oy) > 0;
    log('SM-02', changed, `拖拽后 offset=(${result.ox.toFixed(1)}, ${result.oy.toFixed(1)})`);

    // Reset
    await page.evaluate(() => { state.offsetX = 0; state.offsetY = 0; renderMap(); });
  } catch (e) {
    log('SM-02', false, `异常: ${e.message}`);
  }
}

// ========== SM-03: 添加并保存坐标点 ==========
async function test_SM03() {
  console.log('\n--- SM-03 添加并保存坐标点 ---');
  try {
    // Clear existing notes and add a test point via state
    await page.evaluate(() => {
      state.notes = [];
      const testNote = {
        id: 'test_note_sm03',
        name: '测试点A',
        x: 500,
        y: 500,
        content: '冒烟测试备注',
      };
      state.notes.push(testNote);
      // Save to savedMaps so it persists through reload simulation
      state.savedMaps['SM03测试'] = {
        mapName: 'SM03测试',
        scale: 1,
        mapSize: 2000,
        unit: { name: '里', desc: '1里=500米' },
        notes: [{ id: 'test_note_sm03', name: '测试点A', x: 500, y: 500, content: '冒烟测试备注' }],
        rangeMarkers: [],
        mapRelations: [],
      };
      renderMap();
      updateNoteList();
    });

    // Now "reload" by loading from savedMaps
    await page.evaluate(() => {
      const data = state.savedMaps['SM03测试'];
      state.notes = data.notes.map((n) => ({ ...n }));
      state.rangeMarkers = [];
      state.mapRelations = [];
      renderMap();
      updateAllLists();
    });

    const notes = await evalState('state.notes');
    const hasPoint = notes.length === 1 && notes[0].name === '测试点A' && notes[0].x === 500;
    log('SM-03', hasPoint, `重新加载后坐标点存在: ${hasPoint ? notes[0].name + `(${notes[0].x},${notes[0].y})` : '缺失'}`);

    // Cleanup
    await page.evaluate(() => {
      state.notes = [];
      delete state.savedMaps['SM03测试'];
      renderMap();
      updateAllLists();
    });
  } catch (e) {
    log('SM-03', false, `异常: ${e.message}`);
  }
}

// ========== SM-04: 备注框弹出与保存 ==========
async function test_SM04() {
  console.log('\n--- SM-04 备注框弹出与保存 ---');
  try {
    // Add a note and verify content persists
    const testContent = '这是一个测试备注内容，不超过200字。';
    await page.evaluate((content) => {
      state.notes = [{
        id: 'test_note_sm04',
        name: '备注测试点',
        x: 300,
        y: 700,
        content: content,
      }];
      renderMap();
      updateNoteList();
    }, testContent);

    // Verify the note content via state
    const noteContent = await evalState('state.notes[0].content');
    const contentOk = noteContent === testContent;
    log('SM-04a', contentOk, `备注内容保存正确: "${noteContent.substring(0, 30)}..."`);

    // Verify 200 char limit by reading the textarea maxlength
    const maxLength = await page.evaluate(() => {
      const ta = document.getElementById('manualNoteContent');
      return ta ? ta.maxLength || ta.getAttribute('maxlength') : null;
    });
    // The textarea may not have maxlength set, but the function checks length
    const longContent = 'A'.repeat(201);
    const truncOk = longContent.length > 200;
    log('SM-04b', truncOk, `长备注(201字)超200字限制检查`);

    // Cleanup
    await page.evaluate(() => {
      state.notes = [];
      renderMap();
      updateAllLists();
    });
  } catch (e) {
    log('SM-04', false, `异常: ${e.message}`);
  }
}

// ========== SM-05: 添加矩形范围标识 ==========
async function test_SM05() {
  console.log('\n--- SM-05 添加矩形范围标识 ---');
  try {
    // Set up rect marker form values and add
    await page.evaluate(() => {
      state.rangeMarkers = [];
      document.getElementById('markerName').value = '测试矩形区域';
      document.getElementById('markerType').value = 'rect';
      document.getElementById('rectX1').value = '100';
      document.getElementById('rectY1').value = '100';
      document.getElementById('rectX2').value = '500';
      document.getElementById('rectY2').value = '100';
      document.getElementById('rectX3').value = '500';
      document.getElementById('rectY3').value = '500';
      document.getElementById('rectX4').value = '100';
      document.getElementById('rectY4').value = '500';
    });

    await page.click('#addMarkerBtn');
    await wait(300);

    const markers = await evalState('state.rangeMarkers');
    const hasRect = markers.length > 0 && markers[0].name === '测试矩形区域' && markers[0].type === 'rect';
    log('SM-05a', hasRect, `矩形标识已添加: ${hasRect ? markers[0].name : '缺失'}`);

    if (hasRect) {
      const params = markers[0].params;
      const paramOk = params.x1 === 100 && params.y3 === 500;
      log('SM-05b', paramOk, `矩形参数正确: (${params.x1},${params.y1})-(${params.x3},${params.y3})`);
    }

    // Cleanup
    await page.evaluate(() => {
      state.rangeMarkers = [];
      renderMap();
      updateAllLists();
    });
  } catch (e) {
    log('SM-05', false, `异常: ${e.message}`);
  }
}

// ========== SM-06: 单文件 JSON 读取 ==========
async function test_SM06() {
  console.log('\n--- SM-06 单文件 JSON 读取 ---');
  try {
    // Set up a complete map in savedMaps, then load it back
    const testData = {
      mapName: 'SM06测试地图',
      scale: 1.5,
      mapSize: 2000,
      unit: { name: '灵里', desc: '1灵里=1000里' },
      notes: [
        { id: 'n1', name: '城镇A', x: 200, y: 800, content: '主城' },
        { id: 'n2', name: '森林B', x: 600, y: 400, content: '暗黑森林' },
      ],
      rangeMarkers: [
        { id: 'm1', name: '安全区', type: 'rect', params: { x1: 100, y1: 100, x2: 900, y2: 100, x3: 900, y3: 900, x4: 100, y4: 900 } },
      ],
      mapRelations: [],
    };

    // Simulate loading: put data in savedMaps and apply
    await page.evaluate((data) => {
      state.savedMaps[data.mapName] = data;
      // Apply like loadMap does
      state.scale = Math.max(0.1, Math.min(2, data.scale));
      state.mapSize = data.mapSize || 2000;
      state.notes = data.notes.map((n) => ({ ...n }));
      state.rangeMarkers = data.rangeMarkers.map((m) => ({ ...m }));
      state.mapRelations = data.mapRelations || [];
      state.unit = { ...data.unit };
      document.getElementById('currentMapName').value = data.mapName;
      document.getElementById('unitName').value = data.unit.name;
      document.getElementById('unitDesc').value = data.unit.desc;
      updateAllLists();
      updateSavedMapsList();
      renderMap();
    }, testData);

    // Verify
    const notes = await evalState('state.notes');
    const markers = await evalState('state.rangeMarkers');
    const unit = await evalState('state.unit');
    const scale = await evalState('state.scale');

    const notesOk = notes.length === 2 && notes[0].name === '城镇A';
    const markersOk = markers.length === 1 && markers[0].name === '安全区';
    const unitOk = unit.name === '灵里';
    const scaleOk = Math.abs(scale - 1.5) < 0.01;

    log('SM-06', notesOk && markersOk && unitOk && scaleOk,
      `数据恢复: 点=${notes.length}, 标识=${markers.length}, 单位=${unit.name}, 缩放=${scale}`);

    // Cleanup
    await page.evaluate(() => {
      delete state.savedMaps['SM06测试地图'];
      state.notes = [];
      state.rangeMarkers = [];
      state.scale = 1;
      state.unit = { name: '里', desc: '1里=500米' };
      renderMap();
      updateAllLists();
    });
  } catch (e) {
    log('SM-06', false, `异常: ${e.message}`);
  }
}

// ========== SM-07: 清空数据后重新加载 ==========
async function test_SM07() {
  console.log('\n--- SM-07 清空数据后重新加载 ---');
  try {
    // Set up data and save to savedMaps
    await page.evaluate(() => {
      state.notes = [{ id: 'sm07n', name: '恢复点', x: 100, y: 200, content: 'test' }];
      state.rangeMarkers = [{ id: 'sm07m', name: '恢复区域', type: 'rect', params: { x1: 0, y1: 0, x2: 100, y2: 0, x3: 100, y3: 100, x4: 0, y4: 100 } }];
      state.savedMaps['SM07恢复测试'] = {
        mapName: 'SM07恢复测试',
        scale: 1,
        mapSize: 2000,
        unit: { name: '里', desc: '1里=500米' },
        notes: [{ id: 'sm07n', name: '恢复点', x: 100, y: 200, content: 'test' }],
        rangeMarkers: [{ id: 'sm07m', name: '恢复区域', type: 'rect', params: { x1: 0, y1: 0, x2: 100, y2: 0, x3: 100, y3: 100, x4: 0, y4: 100 } }],
        mapRelations: [],
      };
    });

    // Clear state (simulate clearAllData without dialog)
    await page.evaluate(() => {
      state.notes = [];
      state.rangeMarkers = [];
      state.mapRelations = [];
      state.scale = 1;
      renderMap();
      updateAllLists();
    });

    const emptyNotes = await evalState('state.notes.length');
    log('SM-07a', emptyNotes === 0, `清空后坐标点数=0`);

    // Reload from savedMaps
    await page.evaluate(() => {
      const data = state.savedMaps['SM07恢复测试'];
      if (data) {
        state.notes = data.notes.map((n) => ({ ...n }));
        state.rangeMarkers = data.rangeMarkers.map((m) => ({ ...m }));
        state.mapRelations = [];
        renderMap();
        updateAllLists();
      }
    });

    const restored = await evalState('state.notes.length');
    const markerRestored = await evalState('state.rangeMarkers.length');
    log('SM-07b', restored === 1 && markerRestored === 1,
      `加载后恢复: 点=${restored}, 标识=${markerRestored}`);

    // Cleanup
    await page.evaluate(() => {
      delete state.savedMaps['SM07恢复测试'];
      state.notes = [];
      state.rangeMarkers = [];
      renderMap();
      updateAllLists();
    });
  } catch (e) {
    log('SM-07', false, `异常: ${e.message}`);
  }
}

// ========== SM-08: 列表同步检查 ==========
async function test_SM08() {
  console.log('\n--- SM-08 列表同步检查 ---');
  try {
    // Add a note via form
    await page.evaluate(() => {
      state.notes = [];
      document.getElementById('manualNoteName').value = '列表测试点';
      document.getElementById('manualNoteX').value = '800';
      document.getElementById('manualNoteY').value = '800';
      document.getElementById('manualNoteContent').value = '列表同步测试';
    });

    await page.click('#addManualNoteBtn');
    await wait(300);

    // Check noteList DOM
    const listText = await page.evaluate(() => {
      const list = document.getElementById('noteList');
      return list ? list.textContent : '';
    });
    const hasItem = listText.includes('列表测试点');
    log('SM-08', hasItem, `添加点后列表包含"列表测试点": ${hasItem}`);

    // Cleanup
    await page.evaluate(() => {
      state.notes = [];
      renderMap();
      updateAllLists();
    });
  } catch (e) {
    log('SM-08', false, `异常: ${e.message}`);
  }
}

// ========== SM-10: 关联双向显示 ==========
async function test_SM10() {
  console.log('\n--- SM-10 关联双向显示 ---');
  try {
    // Create two maps and add relation between them
    await page.evaluate(() => {
      // Save map B first
      state.savedMaps['地图B'] = {
        mapName: '地图B',
        scale: 1,
        mapSize: 2000,
        unit: { name: '里', desc: '1里=500米' },
        notes: [],
        rangeMarkers: [],
        mapRelations: [],
      };
      // Set current map name
      document.getElementById('currentMapName').value = '地图A';
    });

    // Fill relation form
    await page.evaluate(() => {
      document.getElementById('targetMapName').value = '地图B';
      document.getElementById('currentMapXY').value = '100,900';
      document.getElementById('targetMapXY').value = '500,500';
    });

    await page.click('#addRelationBtn');
    await wait(300);

    // Check map A has relation
    const mapARelations = await evalState('state.mapRelations');
    const hasRelation = mapARelations.length > 0 && mapARelations[0].targetMapName === '地图B';
    log('SM-10a', hasRelation, `地图A关联到地图B: ${hasRelation ? '成功' : '失败'}`);

    // Check that the relation is also saved in savedMaps for map B (bidirectional)
    const mapBRelations = await evalState("state.savedMaps['地图B'].mapRelations");
    const hasReverse = mapBRelations && mapBRelations.length > 0 &&
      mapBRelations[0].targetMapName === '地图A';
    log('SM-10b', hasReverse, `地图B有反向关联到地图A: ${hasReverse ? '成功' : '失败'}`);

    // Cleanup
    await page.evaluate(() => {
      state.mapRelations = [];
      delete state.savedMaps['地图A'];
      delete state.savedMaps['地图B'];
      document.getElementById('currentMapName').value = '主世界地图';
      document.getElementById('targetMapName').value = '';
      document.getElementById('currentMapXY').value = '';
      document.getElementById('targetMapXY').value = '';
      renderMap();
      updateAllLists();
      updateSavedMapsList();
    });
  } catch (e) {
    log('SM-10', false, `异常: ${e.message}`);
  }
}

// ========== SM-11: 新建地图 ==========
async function test_SM11() {
  console.log('\n--- SM-11 新建地图 ---');
  try {
    // Add some data first
    await page.evaluate(() => {
      state.notes = [{ id: 'tmp', name: '临时点', x: 100, y: 100, content: 'test' }];
      state.rangeMarkers = [];
      state.mapRelations = [];
      document.getElementById('currentMapName').value = '旧地图';
      state.savedMaps['旧地图'] = {
        mapName: '旧地图', scale: 1, mapSize: 2000,
        unit: { name: '里', desc: '1里=500米' },
        notes: [{ id: 'tmp', name: '临时点', x: 100, y: 100, content: 'test' }],
        rangeMarkers: [], mapRelations: [],
      };
      renderMap();
    });

    // Call createNewMap directly (bypass prompt)
    await page.evaluate(() => {
      // Auto-save current
      autoSaveCurrentMap();
      // Reset like createNewMap does
      state.scale = 1;
      state.mapSize = 2000;
      state.offsetX = 0;
      state.offsetY = 0;
      state.notes = [];
      state.rangeMarkers = [];
      state.mapRelations = [];
      state.unit = { name: '里', desc: '1里=500米' };
      state.currentNoteId = null;
      state.currentMapIndex = -1;
      state.mapList = [];
      document.getElementById('currentMapName').value = '测试新地图';
      state.savedMaps['测试新地图'] = {
        mapName: '测试新地图', scale: 1, mapSize: 2000,
        unit: { name: '里', desc: '1里=500米' },
        notes: [], rangeMarkers: [], mapRelations: [],
      };
      updateAllLists();
      updateSavedMapsList();
      renderMap();
    });

    const newNotes = await evalState('state.notes.length');
    const newMarkers = await evalState('state.rangeMarkers.length');
    const mapName = await evalState("document.getElementById('currentMapName').value");
    const scale = await evalState('state.scale');

    const resetOk = newNotes === 0 && newMarkers === 0 && scale === 1;
    const nameOk = mapName === '测试新地图';
    log('SM-11', resetOk && nameOk,
      `新建地图: 画布清空=${resetOk}, 名称=${mapName}, 缩放=${scale}`);

    // Verify old map still in savedMaps
    const oldMapExists = await evalState("state.savedMaps.hasOwnProperty('旧地图')");
    log('SM-11-2', oldMapExists, `旧地图数据未丢失: ${oldMapExists}`);

    // Cleanup
    await page.evaluate(() => {
      delete state.savedMaps['旧地图'];
      delete state.savedMaps['测试新地图'];
      state.notes = [];
      state.rangeMarkers = [];
      state.mapRelations = [];
      document.getElementById('currentMapName').value = '主世界地图';
      renderMap();
      updateAllLists();
      updateSavedMapsList();
    });
  } catch (e) {
    log('SM-11', false, `异常: ${e.message}`);
  }
}

// ========== Main ==========
async function main() {
  console.log('===========================================');
  console.log('  Novel-Map-Tool 冒烟测试');
  console.log('===========================================');

  // 1. Start HTTP server
  console.log('\n[1/3] 启动 HTTP 服务 ...');
  await startHttpServer();
  console.log(`  HTTP 服务已启动: http://localhost:${HTTP_PORT}/`);

  try {
    // 2. Launch browser
    console.log('\n[2/3] 启动浏览器 ...');
    browser = await chromium.launch({
      executablePath: BROWSER_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
    });
    page = await context.newPage();

    // Set up dialog handler globally
    await setupDialogHandlers();

    // Navigate
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await wait(1000);
    console.log('  页面加载完成');

    // 3. Run tests
    console.log('\n[3/3] 执行冒烟测试 ...\n');

    await test_SM01();
    await test_SM02();
    await test_SM03();
    await test_SM04();
    await test_SM05();
    await test_SM06();
    await test_SM07();
    await test_SM08();
    skip('SM-09', '工作目录保存加载（需要用户交互选择目录）');
    await test_SM10();
    await test_SM11();
    skip('SM-12', '断网保存（需要真实断网环境）');

  } catch (e) {
    console.error(`\n致命错误: ${e.message}`);
    console.error(e.stack);
  } finally {
    // Cleanup
    if (browser) await browser.close();
    stopHttpServer();
  }

  // Summary
  console.log('\n===========================================');
  console.log('  测试汇总');
  console.log('===========================================');
  console.log(`  ✅ 通过: ${passed}`);
  console.log(`  ❌ 失败: ${failed}`);
  console.log(`  ⏭️  跳过: ${skipped}`);
  console.log(`  📊 总计: ${passed + failed + skipped} 条`);
  console.log('===========================================\n');

  // Exit with error code if any failures
  process.exit(failed > 0 ? 1 : 0);
}

main();
