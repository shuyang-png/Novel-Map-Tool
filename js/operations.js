// 地图关联 + 备注编辑
        function addMapRelation() {
            if (state.viewingVersion !== null) {
                alert('当前正在查看历史版本，无法编辑！请先回到最新版本。');
                return;
            }
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
            if (state.viewingVersion !== null) {
                alert('当前正在查看历史版本，无法编辑！请先回到最新版本。');
                return;
            }
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
         * 24a. 坐标点：平滑定位到坐标点
         */
        function panToNote(noteId, duration = 300) {
            const note = state.notes.find(n => n.id === noteId);
            if (!note) return;
            
            // 渲染变换推导（与 renderer.js 一致）:
            // screenX = (wx - canvas.width/2 + offsetX) * scale + canvas.width/2
            // 居中 → offsetX = canvas.width/2 - wx  (与 scale 无关)
            const targetOffsetX = canvas.width / 2 - note.x;
            const targetOffsetY = canvas.height / 2 - note.y;
            const startOffsetX = state.offsetX;
            const startOffsetY = state.offsetY;
            const startTime = performance.now();
            const dx = targetOffsetX - startOffsetX;
            const dy = targetOffsetY - startOffsetY;
            
            // 如果偏移很小，直接跳转不动画
            if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
                state.offsetX = targetOffsetX;
                state.offsetY = targetOffsetY;
                renderMap();
                return;
            }
            
            function animatePan(now) {
                const elapsed = now - startTime;
                const progress = Math.min(elapsed / duration, 1);
                // ease-out 缓动
                const t = 1 - (1 - progress) * (1 - progress);
                state.offsetX = startOffsetX + dx * t;
                state.offsetY = startOffsetY + dy * t;
                renderMap();
                if (progress < 1) {
                    requestAnimationFrame(animatePan);
                }
            }
            requestAnimationFrame(animatePan);
        }

        /**
         * 25a. 地理标识：平滑定位到地理标识
         */
        function panToGeo(geoId, duration = 300) {
            const geo = state.geoMarkers.find(g => g.id === geoId);
            if (!geo) return;
            
            // 计算地理标识中心点（不同类型）
            let cx, cy;
            if (geo.type === 'rect') {
                cx = geo.x + geo.width / 2; cy = geo.y + geo.height / 2;
            } else if (geo.type === 'ellipse') {
                cx = geo.cx; cy = geo.cy;
            } else if (geo.type === 'pin') {
                cx = geo.x; cy = geo.y;
            } else if (geo.type === 'circle' && geo.center) {
                cx = geo.center.x; cy = geo.center.y;
            } else if (geo.type === 'polygon' && geo.points?.length >= 3) {
                cx = geo.points.reduce((s, p) => s + p.x, 0) / geo.points.length;
                cy = geo.points.reduce((s, p) => s + p.y, 0) / geo.points.length;
            } else if (geo.type === 'polyline' && geo.points?.length >= 2) {
                cx = geo.points.reduce((s, p) => s + p.x, 0) / geo.points.length;
                cy = geo.points.reduce((s, p) => s + p.y, 0) / geo.points.length;
            } else return;

            const targetOffsetX = canvas.width / 2 - cx;
            const targetOffsetY = canvas.height / 2 - cy;
            const startOffsetX = state.offsetX;
            const startOffsetY = state.offsetY;
            const startTime = performance.now();
            const dx = targetOffsetX - startOffsetX;
            const dy = targetOffsetY - startOffsetY;
            if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
                state.offsetX = targetOffsetX; state.offsetY = targetOffsetY;
                renderMap(); return;
            }
            function animatePan(now) {
                const elapsed = now - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const t = 1 - (1 - progress) * (1 - progress);
                state.offsetX = startOffsetX + dx * t;
                state.offsetY = startOffsetY + dy * t;
                renderMap();
                if (progress < 1) requestAnimationFrame(animatePan);
            }
            requestAnimationFrame(animatePan);
        }

        /**
         * 25b. 地理标识：查看地理标识详情
         */
        function showGeoBox(geoId) {
            const geo = state.geoMarkers.find(g => g.id === geoId);
            if (!geo) return;
            
            // 先平移
            panToGeo(geoId);
            
            // 弹窗信息复用坐标点的 noteBox，填充 geo 信息
            state.currentNoteId = geoId; state.isEditingNote = false;
            noteNameDisplay.textContent = geo.name;
            noteContentDisplay.textContent = _getGeoInfo(geo);
            noteContentTextarea.value = '';
            toggleNoteEditMode(false);
            
            setTimeout(() => {
                // 居中计算
                const containerRect = canvas.parentElement.getBoundingClientRect();
                noteBox.style.left = `${(containerRect.width - 260) / 2}px`;
                noteBox.style.top = `${(containerRect.height - 160) / 2}px`;
                noteBox.style.display = 'block';
            }, 320);
        }
        
        function _getGeoInfo(geo) {
            let info = `类型: ${geo.presetType || '通用'} | 形状: ${geo.type}`;
            if (geo.type === 'rect') info += `\n位置: (${geo.x}, ${geo.y}) ${geo.width}×${geo.height}`;
            if (geo.type === 'ellipse') info += `\n中心: (${geo.cx}, ${geo.cy}) rx=${geo.rx} ry=${geo.ry}`;
            if (geo.type === 'pin') info += `\n坐标: (${geo.x}, ${geo.y})`;
            if (geo.type === 'polyline' && geo.points) info += `\n顶点数: ${geo.points.length} 个`;
            if (geo.type === 'polygon' && geo.points) info += `\n顶点数: ${geo.points.length} 个`;
            if (geo.metrics?.areaDesc) info += `\n面积: ${geo.metrics.areaDesc}`;
            if (geo.metrics?.lengthDesc) info += `\n长度: ${geo.metrics.lengthDesc}`;
            return info;
        }

        /**
         * 24. 坐标点：查看坐标点详情
         */
        function showNoteBox(noteId) {
            const note = state.notes.find(n => n.id === noteId);
            if (!note) return;
            
            state.currentNoteId = noteId;
            state.isEditingNote = false;
            
            // 先平移地图到坐标点
            panToNote(noteId);
            
            // 延迟显示备注框，等平移动画完成后计算正确位置
            setTimeout(() => {
                // 填充坐标点信息
                noteNameDisplay.textContent = note.name;
                noteContentDisplay.textContent = note.content;
                noteContentTextarea.value = note.content;
                state.originalNoteContent = note.content;
                
                // 计算备注框位置（noteBox在map-container内，用相对坐标）
                const rect = canvas.getBoundingClientRect();
                const containerRect = canvas.parentElement.getBoundingClientRect();
                // note在canvas上的像素位置（相对canvas左上角）
                const px = (note.x - state.offsetX) * state.scale + canvas.width / 2 - state.mapSize * state.scale / 2;
                const py = (note.y - state.offsetY) * state.scale + canvas.height / 2 - state.mapSize * state.scale / 2;
                // 转为相对map-container的坐标（canvas在container内有padding）
                const cx = px + (rect.left - containerRect.left);
                const cy = py + (rect.top - containerRect.top);
                // 限制在container范围内
                const boxW = 260, boxH = 160;
                const cw = containerRect.width, ch = containerRect.height;
                noteBox.style.left = `${Math.max(0, Math.min(cx + 20, cw - boxW))}px`;
                noteBox.style.top = `${Math.max(0, Math.min(cy + 20, ch - boxH))}px`;
                
                // 切换到查看模式
                toggleNoteEditMode(false);
                
                // 显示备注框
                noteBox.style.display = 'block';
            }, 320);
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
            if (state.viewingVersion !== null) {
                alert('当前正在查看历史版本，无法编辑！请先回到最新版本。');
                return;
            }
            
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
