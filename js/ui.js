// 列表更新 + 全局暴露 + 启动
        function updateNoteList() {
            const noteListEl = document.getElementById('noteList');
            if (state.notes.length === 0) {
                noteListEl.innerHTML = '暂无坐标点，点击地图或上方添加';
                return;
            }
            noteListEl.innerHTML = '';
            state.notes.forEach(note => {
                const item = document.createElement('div');
                item.className = 'list-item';
                
                const contentText = note.content.length > 20 ? note.content.slice(0,20)+'...' : note.content;
                item.innerHTML = `
                    <div style="flex:1;">
                        <div style="font-weight:600; color:#e74c3c;">${note.name}</div>
                        <div style="font-size:12px; color:#666;">(${note.x},${note.y})：${contentText}</div>
                    </div>
                    <div>
                        <button class="list-btn" onclick="showNoteBox('${note.id}')">查看</button>
                        <button class="list-btn btn-danger" onclick="deleteNote('${note.id}')">删除</button>
                    </div>
                `;
                noteListEl.appendChild(item);
            });
        }


        /**
         * 更新地图关联列表
         */
        function updateRelationList() {
            const relationListEl = document.getElementById('relationList');
            if (state.mapRelations.length === 0) {
                relationListEl.innerHTML = '暂无关联';
                return;
            }
            relationListEl.innerHTML = '';
            state.mapRelations.forEach(relation => {
                const item = document.createElement('div');
                item.className = 'list-item';
                item.innerHTML = `
                    <span>${relation.currentMapName}(${relation.currentXY}) ↔ ${relation.targetMapName}(${relation.targetXY})</span>
                    <button class="list-btn btn-danger" onclick="deleteRelation('${relation.id}')">删除</button>
                `;
                relationListEl.appendChild(item);
            });
        }

        /**
         * 更新地图列表（批量导入）- 带选中样式
         */
        function updateMapList() {
            if (state.mapList.length === 0) {
                mapList.style.display = 'none';
                return;
            }
            mapList.style.display = 'block';
            mapListContent.innerHTML = '';
            state.mapList.forEach((map, index) => {
                const item = document.createElement('div');
                item.className = `map-list-item ${index === state.currentMapIndex ? 'active' : ''}`;
                item.textContent = map.mapName;
                item.addEventListener('click', () => switchMap(index));
                mapListContent.appendChild(item);
            });
        }

        /**
         * 批量更新所有列表
         */
        function updateAllLists() {
            updateNoteList();
            updateGeoList();
            updateRelationList();
            updateMapList();
        }

        // ==================== 全局函数暴露（供HTML调用） ====================
        window.showNoteBox = showNoteBox;
        window.editNote = startEditNote;
        window.deleteNote = deleteNote;
        window.editGeoMarker = editGeoMarker;
        window.deleteGeoMarker = deleteGeoMarker;
        window.deleteRelation = deleteRelation;
        window.loadSavedMap = loadSavedMap;
        window.deleteSavedMap = deleteSavedMap;
        window.switchMap = switchMap;

        // ==================== 启动工具 ====================
        init();
        // v2026-03-25: Added File System Access API support
    