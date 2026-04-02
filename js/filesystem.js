// 工作目录 + 工具函数
        // ==================== File System Access API ====================
        const hasFSAccess = 'showDirectoryPicker' in window;

        async function selectWorkDir() {
            if (!hasFSAccess) {
                alert('当前浏览器不支持目录读写，请使用 Chrome 86+ 或 Edge 86+');
                return;
            }
            try {
                const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
                state.workDirHandle = handle;
                await saveDirHandle(handle);
                // 清空旧目录相关数据
                state.savedMaps = {};
                state.notes = [];
                state.rangeMarkers = [];
                state.geoMarkers = [];
                state.mapRelations = [];
                state.scale = 1;
                state.offsetX = 0;
                state.offsetY = 0;
                document.getElementById('currentMapName').value = '主世界地图';
                document.getElementById('unitName').value = '里';
                document.getElementById('unitDesc').value = '1里=500米';
                unitDescDisplay.textContent = '1里=500米';
                updateAllLists();
                updateSavedMapsList();
                renderMap();
                dirStatus.textContent = `工作目录：${handle.name}`;
                dirStatus.style.color = '#2e7d32';
                await listMapFiles();
            } catch (e) {
                if (e.name !== 'AbortError') {
                    console.error('选择目录失败:', e);
                    alert('选择目录失败：' + e.message + '\n\n请确认使用 Chrome 86+ 或 Edge 86+ 浏览器。');
                }
            }
        }

        async function verifyDirPermission(handle) {
            if (!handle) return false;
            const opts = { mode: 'readwrite' };
            if ((await handle.queryPermission(opts)) === 'granted') return true;
            if ((await handle.requestPermission(opts)) === 'granted') return true;
            return false;
        }

        async function restoreWorkDir() {
            if (!hasFSAccess) {
                dirStatus.textContent = '工作目录：浏览器不支持，使用下载模式';
                return;
            }
            try {
                const handle = await loadDirHandle();
                if (handle && await verifyDirPermission(handle)) {
                    state.workDirHandle = handle;
                    dirStatus.textContent = `工作目录：${handle.name}`;
                    dirStatus.style.color = '#2e7d32';
                    await listMapFiles();
                }
            } catch (e) {
                console.warn('恢复工作目录失败:', e);
            }
        }

        async function listMapFiles() {
            if (!state.workDirHandle) {
                dirFileListContainer.style.display = 'none';
                return;
            }
            dirFileListContainer.style.display = 'block';
            dirFileListEl.innerHTML = '';
            try {
                for await (const [name, entry] of state.workDirHandle.entries()) {
                    if (entry.kind === 'file' && name.endsWith('.json')) {
                        const row = document.createElement('div');
                        row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:3px 0;border-bottom:1px solid #eee;';
                        const span = document.createElement('span');
                        span.textContent = '📄 ' + name;
                        span.style.flex = '1';
                        const btn = document.createElement('button');
                        btn.textContent = '加载';
                        btn.style.cssText = 'font-size:11px;padding:2px 8px;cursor:pointer;border:1px solid #ccc;border-radius:3px;background:#fff;';
                        btn.addEventListener('click', () => loadMapFromDir(name));
                        row.appendChild(span);
                        row.appendChild(btn);
                        dirFileListEl.appendChild(row);
                    }
                }
            } catch (e) {
                dirFileListEl.textContent = '读取目录失败: ' + e.message;
            }
        }

        async function loadMapFromDir(fileName) {
            if (!state.workDirHandle) return;
            try {
                const fileHandle = await state.workDirHandle.getFileHandle(fileName);
                const file = await fileHandle.getFile();
                const text = await file.text();
                const jsonData = JSON.parse(text);
                // 校验核心字段
                const requiredFields = ['scale', 'unit', 'notes', 'rangeMarkers', 'mapRelations'];
                const missing = requiredFields.filter(f => !jsonData.hasOwnProperty(f));
                if (missing.length > 0) throw new Error(`缺失字段：${missing.join(',')}`);
                const mapName = jsonData.mapName || fileName.replace('.json', '');
                applyMapData(jsonData, mapName);
                // 加载版本文件
                state.versions = await loadVersionsFile(mapName);
                state.viewingVersion = null;
                hideVersionBanner();
                setEditingDisabled(false);
                updateVersionTimeline();
                showToast(`已加载：${fileName}`);
            } catch (e) {
                alert(`加载失败：${e.message}`);
            }
        }

        async function saveToDir(data, fileName) {
            if (!state.workDirHandle) return false;
            try {
                const fileHandle = await state.workDirHandle.getFileHandle(fileName, { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(JSON.stringify(data, null, 2));
                await writable.close();
                await listMapFiles();
                return true;
            } catch (e) {
                console.error('写入目录失败:', e);
                return false;
            }
        }

        // Toast 提示
        function showToast(msg, duration = 2000) {
            let toast = document.getElementById('fsToast');
            if (!toast) {
                toast = document.createElement('div');
                toast.id = 'fsToast';
                toast.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:10px 24px;border-radius:8px;font-size:14px;z-index:9999;opacity:0;transition:opacity 0.3s;';
                document.body.appendChild(toast);
            }
            toast.textContent = msg;
            toast.style.opacity = '1';
            clearTimeout(toast._timer);
            toast._timer = setTimeout(() => { toast.style.opacity = '0'; }, duration);
        }

        // 统一应用地图数据到 state 和 UI
        function applyMapData(data, mapName) {
            autoSaveCurrentMap(); // 加载前自动保存当前地图
            // 退出版本查看模式
            if (state.viewingVersion !== null) exitVersionView();
            state.scale = Math.max(0.1, Math.min(2, data.scale));
            state.mapSize = data.mapSize || 2000;
            state.offsetX = 0;
            state.offsetY = 0;
            state.notes = data.notes || [];
            state.rangeMarkers = data.rangeMarkers || [];
            state.geoMarkers = migrateGeoData(data);
            state.mapRelations = data.mapRelations || [];
            state.unit = data.unit || { name: '里', desc: '1里=500米' };
            state.savedMaps[mapName] = data;
            document.getElementById('currentMapName').value = mapName;
            document.getElementById('unitName').value = state.unit.name;
            document.getElementById('unitDesc').value = state.unit.desc;
            unitDescDisplay.textContent = state.unit.desc;
            updateAllLists();
            updateSavedMapsList();
            renderMap();
        }

        // ==================== 初始化 ====================
