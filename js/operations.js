// 地图关联 + 备注编辑
        function addMapRelation() {
            const currentMapName = document.getElementById('currentMapName').value.trim();
            const targetMapName = document.getElementById('targetMapName').value.trim();
            const currentMapXY = document.getElementById('currentMapXY').value.trim();
            const targetMapXY = document.getElementById('targetMapXY').value.trim();

            // 验证输入
            if (!currentMapName || !targetMapName || !currentMapXY || !targetMapXY) {
                alert('所有字段不能为空！');
                return;
            }
            
            // 检查目标地图是否存在（已保存的地图中）
            const targetMapExists = state.savedMaps.hasOwnProperty(targetMapName);
            
            if (!targetMapExists) {
                alert(`错误：未找到【${targetMapName}】地图，请先保存该地图！`);
                return;
            }

            // 验证坐标格式（x,y）
            const xyRegex = /^\d{1,4},\d{1,4}$/;
            if (!xyRegex.test(currentMapXY) || !xyRegex.test(targetMapXY)) {
                alert('坐标格式错误，应为"x,y"（0~2000）');
                return;
            }
            
            // 验证坐标范围
            const [cx, cy] = currentMapXY.split(',').map(Number);
            const [tx, ty] = targetMapXY.split(',').map(Number);
            
            if (cx < 0 || cx > 2000 || cy < 0 || cy > 2000 || tx < 0 || tx > 2000 || ty < 0 || ty > 2000) {
                alert('坐标值必须在0~2000之间！');
                return;
            }

            // 检查当前坐标是否已有关联（同一坐标只能关联一个目标地图）
            const existingRelation = state.mapRelations.find(r => r.currentXY === currentMapXY);
            if (existingRelation) {
                alert(`坐标 (${currentMapXY}) 已关联地图「${existingRelation.targetMapName}」，不可重复关联！\n如需更换关联，请先删除原有关联。`);
                return;
            }

            // 添加当前地图的关联
            const newRelation = {
                id: `relation_${Date.now()}`,
                currentMapName,
                currentXY: currentMapXY,
                targetMapName,
                targetXY: targetMapXY
            };
            state.mapRelations.push(newRelation);

            // 自关联：直接在 state.mapRelations 中添加反向关联，跳过文件写入（正反向随当前地图一起保存）
            if (currentMapName === targetMapName) {
                const reverseRelation = {
                    id: `relation_${Date.now()}_reverse`,
                    currentMapName: targetMapName,
                    currentXY: targetMapXY,
                    targetMapName: currentMapName,
                    targetXY: currentMapXY
                };
                state.mapRelations.push(reverseRelation);
            }
            // 跨地图关联：在目标地图中添加反向关联
            else if (state.savedMaps[targetMapName]) {
                const reverseRelation = {
                    id: `relation_${Date.now()}_reverse`,
                    currentMapName: targetMapName,
                    currentXY: targetMapXY,
                    targetMapName: currentMapName,
                    targetXY: currentMapXY
                };
                
                // 更新已保存的目标地图数据
                state.savedMaps[targetMapName].mapRelations = state.savedMaps[targetMapName].mapRelations || [];
                state.savedMaps[targetMapName].mapRelations.push(reverseRelation);
                
                // 如果目标地图已加载到当前显示，则直接添加
                if (document.getElementById('currentMapName').value === targetMapName) {
                    state.mapRelations.push(reverseRelation);
                }

                // 同时写入目标地图的 JSON 文件
                if (state.workDirHandle) {
                    saveToDir(state.savedMaps[targetMapName], `${targetMapName}.json`);
                }
            }

            // 更新列表和渲染
            updateRelationList();
            renderMap();
            
            alert(`双向关联添加成功！已在【${currentMapName}】和【${targetMapName}】中创建关联标识。`);
        }

        /**
         * 23. 地图关联：删除关联
         */
        function deleteRelation(relationId) {
            // 删除当前地图中的关联
            const deletedRelation = state.mapRelations.find(r => r.id === relationId);
            state.mapRelations = state.mapRelations.filter(r => r.id !== relationId);
            
            // 如果有反向关联，也一并删除并写入目标地图 JSON
            if (deletedRelation && state.savedMaps[deletedRelation.targetMapName]) {
                const targetRelations = state.savedMaps[deletedRelation.targetMapName].mapRelations || [];
                state.savedMaps[deletedRelation.targetMapName].mapRelations = targetRelations.filter(
                    r => !(r.targetMapName === deletedRelation.currentMapName && r.targetXY === deletedRelation.currentXY)
                );
                if (state.workDirHandle) {
                    saveToDir(state.savedMaps[deletedRelation.targetMapName], `${deletedRelation.targetMapName}.json`);
                }
            }
            
            updateRelationList();
            renderMap();
        }

        /**
         * 24. 坐标点：查看坐标点详情
         */
        function showNoteBox(noteId) {
            const note = state.notes.find(n => n.id === noteId);
            if (!note) return;
            
            state.currentNoteId = noteId;
            state.isEditingNote = false;
            
            // 填充坐标点信息
            noteNameDisplay.textContent = note.name;
            noteContentDisplay.textContent = note.content;
            noteContentTextarea.value = note.content;
            state.originalNoteContent = note.content;
            
            // 计算备注框在页面上的位置（基于Canvas坐标和缩放偏移）
            const rect = canvas.getBoundingClientRect();
            const displayX = (note.x - state.offsetX) * state.scale + rect.left + canvas.width / 2 - state.mapSize * state.scale / 2;
            const displayY = (note.y - state.offsetY) * state.scale + rect.top + canvas.height / 2 - state.mapSize * state.scale / 2;
            
            // 设置备注框位置（避免超出可视区域）
            noteBox.style.left = `${Math.min(displayX + 20, rect.right - 270)}px`;
            noteBox.style.top = `${Math.min(displayY + 20, rect.bottom - 150)}px`;
            
            // 切换到查看模式
            toggleNoteEditMode(false);
            
            // 显示备注框
            noteBox.style.display = 'block';
        }

        /**
         * 25. 坐标点：开始编辑备注
         */
        function startEditNote() {
            if (!state.currentNoteId) return;
            
            state.isEditingNote = true;
            toggleNoteEditMode(true);
        }

        /**
         * 26. 坐标点：保存编辑的备注
         */
        function saveEditNote() {
            if (!state.currentNoteId) return;
            
            const note = state.notes.find(n => n.id === state.currentNoteId);
            if (!note) return;
            
            const newContent = noteContentTextarea.value.trim();
            if (newContent.length > 200) {
                alert('备注字数不能超过200字！');
                return;
            }
            
            note.content = newContent || '无备注';
            noteContentDisplay.textContent = note.content;
            
            state.isEditingNote = false;
            toggleNoteEditMode(false);
            
            // 更新列表和渲染
            updateNoteList();
            renderMap();
        }

        /**
         * 27. 坐标点：取消编辑备注
         */
        function cancelEditNote() {
            noteContentTextarea.value = state.originalNoteContent;
            state.isEditingNote = false;
            toggleNoteEditMode(false);
        }

        /**
         * 28. 坐标点：删除坐标点
         */
        function deleteNote(noteId) {
            if (!noteId) return;
            
            if (confirm('确定要删除此坐标点吗？')) {
                state.notes = state.notes.filter(n => n.id !== noteId);
                noteBox.style.display = 'none';
                state.currentNoteId = null;
                state.isEditingNote = false;
                updateNoteList();
                renderMap();
            }
        }

        /**
         * 切换备注编辑/查看模式
         */
        function toggleNoteEditMode(isEditing) {
            noteContentDisplay.style.display = isEditing ? 'none' : 'block';
            noteContentEdit.style.display = isEditing ? 'block' : 'none';
            editNoteBtn.style.display = isEditing ? 'none' : 'block';
            saveNoteBtn.style.display = isEditing ? 'block' : 'none';
            cancelNoteBtn.style.display = isEditing ? 'block' : 'none';
        } 
                // ==================== 列表更新函数 ====================
        /**
         * 更新坐标点列表
         */
