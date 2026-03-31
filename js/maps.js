// 地图保存/加载/导出/管理
        function saveElementsToFile() {
            const currentMapName = document.getElementById('currentMapName').value.trim();
            if (!currentMapName) {
                alert('请先输入当前地图名称！');
                return;
            }
            
            const mapData = {
                mapName: currentMapName,
                scale: state.scale,
                mapSize: state.mapSize,
                unit: state.unit,
                notes: [...state.notes],
                rangeMarkers: [], // 已合并到geoMarkers，保留空数组兼容旧版本
                geoMarkers: [...state.geoMarkers],
                mapRelations: [...state.mapRelations],
                lastSaved: new Date().toLocaleString()
            };
            
            state.savedMaps[currentMapName] = mapData;
            const fileName = `${currentMapName}_elements.json`;
            
            if (state.workDirHandle) {
                saveToDir(mapData, fileName).then(ok => {
                    if (ok) showToast(`已保存到目录：${fileName}`);
                    else fallbackDownload(mapData, fileName);
                });
                alert(`已保存【${currentMapName}】的元素到地图文件！`);
            } else {
                if (Object.keys(state.savedMaps).includes(currentMapName)) {
                    if (confirm(`【${currentMapName}】地图已存在，是否覆盖保存？`)) {
                        fallbackDownload(mapData, fileName);
                        alert(`已保存【${currentMapName}】的元素到地图文件！`);
                    }
                } else {
                    fallbackDownload(mapData, fileName);
                    alert(`已创建并保存【${currentMapName}】的地图文件！`);
                }
            }
            updateSavedMapsList();
        }

        /**
         * 7. 保存当前地图（新建文件）
         */
        function saveCurrentMap() {
            const currentMapName = document.getElementById('currentMapName').value.trim() || '未命名地图';
            
            const mapData = {
                mapName: currentMapName,
                scale: state.scale,
                mapSize: state.mapSize,
                unit: state.unit,
                notes: [...state.notes],
                rangeMarkers: [], // 已合并到geoMarkers，保留空数组兼容旧版本
                geoMarkers: [...state.geoMarkers],
                mapRelations: [...state.mapRelations],
                createTime: new Date().toLocaleString(),
                lastSaved: new Date().toLocaleString()
            };
            
            state.savedMaps[currentMapName] = mapData;
            const fileName = `${currentMapName}.json`;
            
            // 优先写入工作目录
            if (state.workDirHandle) {
                saveToDir(mapData, fileName).then(ok => {
                    if (ok) showToast(`已保存到目录：${fileName}`);
                    else { fallbackDownload(mapData, fileName); }
                });
            } else {
                fallbackDownload(mapData, fileName);
            }
            updateSavedMapsList();
        }

        function fallbackDownload(data, fileName) {
            const jsonStr = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        /**
         * 9. 加载已保存的地图元素
         */
        function loadSavedMap(mapName) {
            autoSaveCurrentMap(); // 切换前自动保存当前地图
            if (!state.savedMaps[mapName]) {
                alert(`未找到【${mapName}】地图数据！`);
                return;
            }
            
            const mapData = state.savedMaps[mapName];
            
            // 更新全局状态
            state.scale = Math.max(0.1, Math.min(2, mapData.scale));
            state.mapSize = mapData.mapSize || 2000;
            state.offsetX = 0;
            state.offsetY = 0;
            state.notes = mapData.notes || [];
            state.rangeMarkers = mapData.rangeMarkers || [];
            state.geoMarkers = migrateGeoData(mapData);
            state.mapRelations = mapData.mapRelations || [];
            state.unit = mapData.unit || { name: '里', desc: '1里=500米' };
            
            // 更新页面显示
            document.getElementById('currentMapName').value = mapData.mapName || mapName;
            document.getElementById('unitName').value = state.unit.name;
            document.getElementById('unitDesc').value = state.unit.desc;
            unitDescDisplay.textContent = state.unit.desc;
            
            updateAllLists();
            renderMap();
            
            alert(`已加载【${mapName}】地图的所有元素！`);
        }

        /**
         * 10. 删除已保存的地图
         */
        function deleteSavedMap(mapName) {
            if (confirm(`确定要删除【${mapName}】地图的保存数据吗？`)) {
                delete state.savedMaps[mapName];
                updateSavedMapsList();
                
                // 如果当前显示的是该地图，清空显示
                if (document.getElementById('currentMapName').value === mapName) {
                    document.getElementById('currentMapName').value = '主世界地图';
                }
                
                alert(`已删除【${mapName}】地图的保存数据！`);
            }
        }

        /**
         * 11. 更新已保存地图列表显示
         */
        function updateSavedMapsList() {
            if (Object.keys(state.savedMaps).length === 0) {
                savedMapsList.innerHTML = '暂无保存的地图';
                return;
            }
            
            savedMapsList.innerHTML = '';
            Object.keys(state.savedMaps).forEach(mapName => {
                const mapData = state.savedMaps[mapName];
                const item = document.createElement('div');
                item.className = 'saved-map-item';
                item.innerHTML = `
                    <span>${mapName}</span>
                    <div>
                        <button class="list-btn saved-map-btn" onclick="loadSavedMap('${mapName}')">加载</button>
                        <button class="list-btn btn-danger saved-map-btn" onclick="deleteSavedMap('${mapName}')">删除</button>
                    </div>
                `;
                savedMapsList.appendChild(item);
            });
        }

        /**
         * 12. 空白处点击关闭备注框
         */
        function handleDocumentClick(e) {
            if (!noteBox.contains(e.target) && e.target !== canvas && !e.target.classList.contains('list-btn')) {
                noteBox.style.display = 'none';
                state.currentNoteId = null;
                state.isEditingNote = false;
                toggleNoteEditMode(false);
            }
        }

        /**
         * 13. 清空所有数据
         */
        function clearAllData() {
            if (confirm('确定要清空所有数据吗？此操作不可恢复！')) {
                state.scale = 1;
                state.mapSize = 2000;
                state.offsetX = 0;
                state.offsetY = 0;
                state.notes = [];
                state.rangeMarkers = [];
                state.geoMarkers = [];
                state.mapRelations = [];
                state.unit = { name: '里', desc: '1里=500米' };
                state.currentNoteId = null;
                
                // 询问是否同时删除已保存的地图
                if (confirm('是否同时删除所有已保存的地图数据？')) {
                    state.savedMaps = {};
                }
                
                // 更新页面显示
                document.getElementById('unitName').value = '里';
                document.getElementById('unitDesc').value = '1里=500米';
                unitDescDisplay.textContent = '1里=500米';
                document.getElementById('currentMapName').value = '主世界地图';
                manualNoteName.value = '新坐标点';
                manualNoteX.value = '1000';
                manualNoteY.value = '1000';
                manualNoteContent.value = '';
                
                updateAllLists();
                updateSavedMapsList();
                renderMap();
            }
        }

        /**
         * 自动保存当前地图到 state.savedMaps（草稿模式，不触发文件下载）
         */
        function autoSaveCurrentMap() {
            const currentMapName = document.getElementById('currentMapName').value.trim();
            if (!currentMapName) return;
            const hasContent = state.notes.length > 0 || state.rangeMarkers.length > 0 || state.mapRelations.length > 0;
            if (!hasContent && !state.savedMaps.hasOwnProperty(currentMapName)) return;
            state.savedMaps[currentMapName] = {
                mapName: currentMapName,
                scale: state.scale,
                mapSize: state.mapSize,
                unit: { ...state.unit },
                notes: state.notes.map(n => ({...n})),
                rangeMarkers: [],
                geoMarkers: state.geoMarkers.map(g => ({...g, style: {...g.style}})),
                mapRelations: state.mapRelations.map(r => ({...r})),
                lastSaved: new Date().toLocaleString()
            };
            updateSavedMapsList();
        }

        /**
         * 17. 新建空白地图（不刷新页面）
         */
        function createNewMap() {
            // 1. 输入地图名称
            const mapName = prompt('请输入新地图名称：', '');
            if (!mapName || !mapName.trim()) return;
            const name = mapName.trim();

            // 2. 名称冲突检查
            if (state.savedMaps.hasOwnProperty(name)) {
                if (!confirm(`地图「${name}」已存在，是否覆盖创建？`)) return;
            }

            // 2.5 自动保存当前地图草稿（防止丢失）
            autoSaveCurrentMap();

            // 3. 重置 state
            state.scale = 1;
            state.mapSize = 2000;
            state.offsetX = 0;
            state.offsetY = 0;
            state.notes = [];
            state.rangeMarkers = [];
            state.geoMarkers = [];
            state.mapRelations = [];
            state.unit = { name: '里', desc: '1里=500米' };
            state.currentNoteId = null;

            // 4. 重置表单
            document.getElementById('currentMapName').value = name;
            document.getElementById('unitName').value = '里';
            document.getElementById('unitDesc').value = '1里=500米';
            unitDescDisplay.textContent = '1里=500米';
            manualNoteName.value = '新坐标点';
            manualNoteX.value = '1000';
            manualNoteY.value = '1000';
            manualNoteContent.value = '';

            // 5. 关闭备注弹窗
            noteBox.style.display = 'none';
            state.isEditingNote = false;
            toggleNoteEditMode(false);

            // 6. 更新所有列表和渲染
            updateAllLists();
            renderMap();

            // 7. 自动保存新创建的空白地图
            state.savedMaps[name] = {
                mapName: name,
                scale: state.scale,
                mapSize: state.mapSize,
                unit: { ...state.unit },
                notes: [],
                rangeMarkers: [],
                geoMarkers: [],
                mapRelations: [],
                lastSaved: new Date().toLocaleString()
            };
            updateSavedMapsList();

            showToast(`已创建空白地图「${name}」`);
        }





        /**
         * 21. 量化单位：保存设置
         */
        function saveUnitSetting() {
            const name = document.getElementById('unitName').value.trim();
            const desc = document.getElementById('unitDesc').value.trim();
            if (!name || !desc) {
                alert('单位名称和说明不能为空！');
                return;
            }
            // 更新状态和显示
            state.unit = { name, desc };
            unitDescDisplay.textContent = desc;
            alert('单位设置保存成功！');
        }

        /**
         * 22. 地图关联：添加双向关联（完整实现）
         */
