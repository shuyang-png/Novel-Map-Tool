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
         * 批量更新所有列表
         */
        function updateAllLists() {
            updateNoteList();
            updateGeoList();
            updateRelationList();
        }

        // ==================== 版本管理 UI ====================

        /**
         * 更新版本时间轴
         */
        function updateVersionTimeline() {
            const container = document.getElementById('versionTimeline');
            if (!container) return;

            const timeline = getTimeline(state.versions);
            const currentV = state.viewingVersion !== null ? state.viewingVersion : (state.versions?.currentVersion || 0);

            let html = '';
            for (const item of timeline) {
                const isActive = item.v === currentV;
                const isLatest = state.versions ? item.v === state.versions.currentVersion : item.v === 0;
                const chapterStr = item.chapter ? ` @ ${item.chapter}` : '';
                const labelStr = item.label ? ` ${item.label}` : '';
                const countStr = item.changeCount > 0 ? ` (${item.changeCount}项变更)` : '';
                const activeStyle = isActive ? 'background:#e3f2fd;border-color:#2196f3;' : '';
                const cursor = isActive ? 'default' : 'pointer';

                html += `<div style="padding:6px 8px;margin-bottom:4px;border:1px solid #e0e0e0;border-radius:4px;${activeStyle}cursor:${cursor};font-size:12px;" onclick="onVersionClick(${item.v})">`;
                html += `<span style="font-weight:600;color:${isActive ? '#1565c0' : '#333'};">`;
                html += `v${item.v}${chapterStr}</span>${labelStr}${countStr}`;
                if (isActive && isLatest && item.v > 0) html += ` <span style="color:#4caf50;">← 当前</span>`;
                if (isActive && !isLatest) html += ` <span style="color:#ff9800;">← 查看中</span>`;
                html += `</div>`;
            }

            if (timeline.length <= 1) {
                html = '<div style="font-size:12px;color:#999;padding:8px 0;">暂无版本记录</div>';
            }

            container.innerHTML = html;
        }

        /**
         * 版本时间轴点击事件
         */
        function onVersionClick(v) {
            if (state.viewingVersion === v) return; // 已经在看这个版本
            viewVersion(v);
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
        // 版本管理
        window.showCreateVersionDialog = showCreateVersionDialog;
        window.viewVersion = viewVersion;
        window.exitVersionView = exitVersionView;
        window.onVersionClick = onVersionClick;

        // ==================== 启动工具 ====================
        init();
        // v2026-03-25: Added File System Access API support
    