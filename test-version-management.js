/**
 * 版本管理模块完整测试
 * 直接调用内部函数测试
 */
const { chromium } = require('/usr/lib/node_modules/@playwright/cli/node_modules/playwright');
const path = require('path');

const HTML_PATH = 'file://' + path.resolve(__dirname, '小说地图工具.html');

let passed = 0, failed = 0;
function assert(cond, msg) {
    if (cond) { passed++; console.log(`  ✅ ${msg}`); }
    else { failed++; console.error(`  ❌ ${msg}`); }
}

function autoWait(ms = 500) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
    const browser = await chromium.launch({
        headless: true,
        executablePath: '/root/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', err => errors.push(err.message));
    page.on('dialog', d => d.accept());

    await page.goto(HTML_PATH, { waitUntil: 'load', timeout: 10000 });
    await autoWait(500);

    // ==================== 准备测试数据 ====================
    console.log('\n📌 准备测试数据');
    
    await page.evaluate(() => {
        state.notes.push({ id: 'n1', name: '青云城', x: 100, y: 100, content: '主角出生地', type: 'location' });
        state.geoMarkers.push({ id: 'g1', name: '青云山脉', x: 200, y: 200, color: 'blue' });
    });

    const baseMap = { 
        notes: [{ id: 'n1', name: '青云城', x: 100, y: 100, content: '主角出生地' }], 
        geoMarkers: [{ id: 'g1', name: '青云山脉', x: 200, y: 200, color: 'blue' }], 
        mapRelations: [] 
    };

    // ==================== 测试 1: createVersion 创建 v1 ====================
    console.log('\n📌 测试 1: createVersion 创建 v1');

    const v1Result = await page.evaluate((base) => {
        const versionsFile = { mapId: 'test', currentVersion: 0, versions: [] };
        return createVersion(base, versionsFile, '第1章', '初始版本');
    }, baseMap);
    assert(v1Result !== null, 'v1 创建返回非null');
    assert(v1Result.versionsFile.currentVersion === 1, 'v1 版本号为 1');
    assert(v1Result.versionsFile.versions[0].label === '初始版本', 'v1 label 正确');

    // ==================== 测试 2: 创建 v2 ====================
    console.log('\n📌 测试 2: 创建 v2');

    // 修改 state
    await page.evaluate(() => {
        state.notes[0].content = '主角已离开';
        state.notes.push({ id: 'n2', name: '天剑宗', x: 300, y: 150, content: '主角加入的宗门', type: 'location' });
        state.geoMarkers = [];
    });

    const v2Result = await page.evaluate(({base, v1}) => {
        const versionsFile = { mapId: 'test', currentVersion: 1, versions: v1.versionsFile.versions };
        return createVersion(base, versionsFile, '第2章', '增加天剑宗');
    }, {base: baseMap, v1: v1Result});
    assert(v2Result !== null, 'v2 创建返回非null');
    assert(v2Result.versionsFile.currentVersion === 2, 'v2 版本号为 2');

    const versionsFile = v2Result.versionsFile;

    // ==================== 测试 3: getStateAtVersion ====================
    console.log('\n📌 测试 3: getStateAtVersion');

    const stateV1 = await page.evaluate(({base, vf}) => getStateAtVersion(base, vf, 1), {base: baseMap, vf: versionsFile});
    assert(stateV1.notes.length === 1, 'v1 有 1 个节点');
    assert(stateV1.notes[0].content === '主角出生地', 'v1 内容正确');
    assert(stateV1.geoMarkers.length === 1, 'v1 有地理标识');

    const stateV2 = await page.evaluate(({base, vf}) => getStateAtVersion(base, vf, 2), {base: baseMap, vf: versionsFile});
    assert(stateV2.notes.length === 2, 'v2 有 2 个节点');
    assert(stateV2.notes[0].content === '主角已离开', 'v2 内容已更新');
    assert(stateV2.notes[1].name === '天剑宗', 'v2 有天剑宗');
    assert(stateV2.geoMarkers.length === 0, 'v2 无地理标识');

    // ==================== 测试 4: computeDelta 新增 ====================
    console.log('\n📌 测试 4: computeDelta 新增');

    const deltaTest = await page.evaluate(() => {
        const oldState = { notes: [{ id: '1', name: 'A', x: 10 }], geoMarkers: [], mapRelations: [] };
        const newState = { notes: [{ id: '1', name: 'A', x: 10 }, { id: '2', name: 'B', x: 20 }], geoMarkers: [{ id: 'g1', name: 'G', x: 30 }], mapRelations: [] };
        return computeDelta(oldState, newState);
    });
    assert(deltaTest.notes?.add?.length === 1, 'delta notes.add 正确');
    assert(deltaTest.notes?.add?.[0].name === 'B', '新增节点 B');

    // ==================== 测试 5: computeDelta 修改删除 ====================
    console.log('\n📌 测试 5: computeDelta 修改删除');

    const deltaModDel = await page.evaluate(() => {
        const oldState = { notes: [{ id: '1', name: 'A', content: 'old' }, { id: '2', name: 'B' }], geoMarkers: [], mapRelations: [] };
        const newState = { notes: [{ id: '1', name: 'A', content: 'new' }], geoMarkers: [], mapRelations: [] };
        return computeDelta(oldState, newState);
    });
    assert(deltaModDel.notes?.update?.length === 1, '检测到修改');
    assert(deltaModDel.notes?.update?.[0].content === 'new', '修改内容正确');
    assert(deltaModDel.notes?.remove?.includes('2'), '检测到删除');

    // ==================== 测试 6: applyDelta ====================
    console.log('\n📌 测试 6: applyDelta');

    const applyResult = await page.evaluate(() => {
        const s = { notes: [{ id: '1', name: 'A' }], geoMarkers: [], mapRelations: [] };
        const d = { notes: { add: [{ id: '2', name: 'B' }], update: [{ id: '1', content: 'updated' }], remove: ['1'] } };
        applyDelta(s, d);
        return s.notes;
    });
    assert(applyResult.length === 1, 'applyDelta 后 1 个节点');
    assert(applyResult[0].name === 'B', '新增节点 B');
    // 注：id=1 被 remove 后再 update 无效，因为已被删除

    // ==================== 测试 7: getTimeline ====================
    console.log('\n📌 测试 7: getTimeline');

    const timeline = await page.evaluate((vf) => getTimeline(vf), versionsFile);
    assert(timeline.length >= 2, '时间线至少 2 个版本');
    assert(timeline[1].label === '初始版本', 'v1 label 正确');
    assert(timeline[2].label === '增加天剑宗', 'v2 label 正确');

    // ==================== 测试 8: 版本对比 ====================
    console.log('\n📌 测试 8: 版本对比');

    const diffResult = await page.evaluate(({base, vf}) => {
        const v1 = getStateAtVersion(base, vf, 1);
        const v2 = getStateAtVersion(base, vf, 2);
        return computeDelta(v1, v2);
    }, {base: baseMap, vf: versionsFile});
    assert(diffResult.notes?.add?.length === 1, 'v1→v2 新增 1 个节点');
    assert(diffResult.notes?.update?.length === 1, 'v1→v2 修改 1 个节点');

    // ==================== 测试 9: 边界情况 ====================
    console.log('\n📌 测试 9: 边界情况');

    const boundaryTest = await page.evaluate(() => {
        const base = { notes: [{ id: '1', name: 'Test' }], geoMarkers: [], mapRelations: [] };
        
        const v0 = getStateAtVersion(base, null, 0);
        const empty = getStateAtVersion(base, { versions: [] }, 1);
        const outOfRange = getStateAtVersion(base, { versions: [{ v: 1, delta: {} }] }, 999);
        
        return { v0: v0.notes.length, empty: empty.notes.length, out: outOfRange.notes.length };
    });
    assert(boundaryTest.v0 === 1, 'v0 返回基线');
    assert(boundaryTest.empty === 1, '空版本返回基线');
    assert(boundaryTest.out === 1, '超出范围返回最新');

    // ==================== 测试 10: isDeltaEmpty ====================
    console.log('\n📌 测试 10: isDeltaEmpty');

    const isEmptyResult = await page.evaluate(() => {
        const empty = computeDelta({ notes: [], geoMarkers: [], mapRelations: [] }, { notes: [], geoMarkers: [], mapRelations: [] });
        const notEmpty = computeDelta({ notes: [{ id: '1' }], geoMarkers: [], mapRelations: [] }, { notes: [{ id: '2' }], geoMarkers: [], mapRelations: [] });
        return { empty: isDeltaEmpty(empty), notEmpty: !isDeltaEmpty(notEmpty) };
    });
    assert(isEmptyResult.empty === true, '空 delta 识别正确');
    assert(isEmptyResult.notEmpty === true, '非空 delta 识别正确');

    // ==================== 测试 11: 无变化不创建 ====================
    console.log('\n📌 测试 11: 无变化不创建版本');

    const noChangeResult = await page.evaluate(() => {
        const base = { notes: [], geoMarkers: [], mapRelations: [] };
        const vf = { mapId: 'test', currentVersion: 0, versions: [] };
        state.notes = [{ id: 'n1', name: '测试' }];  // 有变化
        state.geoMarkers = [];
        return createVersion(base, vf, '第1章', '初始');
    });
    assert(noChangeResult !== null, '首次创建返回版本');

    const noChange2 = await page.evaluate(() => {
        const base = { notes: [], geoMarkers: [], mapRelations: [] };
        const vf = { mapId: 'test', currentVersion: 1, versions: [{ v: 1, delta: { notes: { add: [] } } }] };
        state.notes = [];
        state.geoMarkers = [];
        return createVersion(base, vf, '第2章', '无变化');
    });
    assert(noChange2 === null, '无变化返回 null');

    // ==================== 测试 12: 跨版本一致性 ====================
    console.log('\n📌 测试 12: 跨版本状态一致性');

    const consistencyTest = await page.evaluate(({base, vf}) => {
        const atV1 = { notes: [...base.notes], geoMarkers: [...base.geoMarkers], mapRelations: [] };
        applyDelta(atV1, vf.versions[0].delta);
        applyDelta(atV1, vf.versions[1].delta);
        return { notes: atV1.notes.length };
    }, {base: baseMap, vf: versionsFile});
    assert(consistencyTest.notes === 2, '跨版本应用后节点数=2');

    // ==================== 总结 ====================
    console.log('\n' + '='.repeat(50));
    console.log(`📊 测试结果: ${passed} 通过, ${failed} 失败`);
    console.log('='.repeat(50));
    
    if (errors.length > 0) {
        console.log('\n⚠️ 控制台错误:');
        errors.forEach(e => console.log('  -', e));
    }

    await browser.close();
    process.exit(failed > 0 ? 1 : 0);
})();