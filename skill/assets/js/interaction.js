// 鼠标交互 + Canvas 点击 + 手动坐标点
        function handleWheel(e) {
            e.preventDefault();
            // 计算新缩放比例（每次调整0.1）
            const delta = e.deltaY < 0 ? 0.1 : -0.1;
            let newScale = state.scale + delta;
            // 限制缩放范围（0.1~2）
            newScale = Math.max(0.1, Math.min(2, newScale));
            // 更新缩放比例并重新渲染
            state.scale = newScale;
            renderMap();
        }

        /**
         * 3. 拖拽处理（鼠标）- 允许滑动到任意地方
         */
        function handleMouseDown(e) {
            state.isDragging = true;
            state.dragMoved = false; // 重置拖拽移动标记
            // 记录初始鼠标位置和当前偏移量
            state.dragStartX = e.clientX;
            state.dragStartY = e.clientY;
            state.lastOffsetX = state.offsetX;
            state.lastOffsetY = state.offsetY;
        }

        function handleMouseMove(e) {
            if (!state.isDragging) return;
            
            // 计算偏移差值
            const deltaX = e.clientX - state.dragStartX;
            const deltaY = e.clientY - state.dragStartY;
            
            // 只有移动超过 5px 才算拖拽（避免微小偏移误触发）
            if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
                state.dragMoved = true;
            }
            
            // 更新偏移量（基于当前缩放比例调整拖拽速度）
            let newOffsetX = state.lastOffsetX + deltaX / state.scale;
            let newOffsetY = state.lastOffsetY + deltaY / state.scale;
            
            // 移除严格的边界限制，允许滑动到任意地方
            // 只保留基本的合理性限制
            const maxOffset = canvas.width * 3;
            const minOffset = -canvas.width * 3;
            
            newOffsetX = Math.max(minOffset, Math.min(maxOffset, newOffsetX));
            newOffsetY = Math.max(minOffset, Math.min(maxOffset, newOffsetY));
            
            // 更新偏移量并重新渲染
            state.offsetX = newOffsetX;
            state.offsetY = newOffsetY;
            renderMap();
        }

        function handleMouseUp() {
            state.isDragging = false;
        }

        /**
         * 4. 地图点击（添加坐标点）- 只有非拖拽才触发
         */
        function handleCanvasClick(e) {
            // 如果发生了拖拽移动，则不触发添加坐标点
            if (state.dragMoved) return;

            // 非最新版本禁止编辑
            if (state.viewingVersion !== null) return;

            // 计算点击位置在地图上的原始坐标
            const rect2 = canvas.getBoundingClientRect();
            const clickX2 = (e.clientX - rect2.left - canvas.width / 2) / state.scale + canvas.width / 2 - state.offsetX;
            const clickY2 = (e.clientY - rect2.top - canvas.height / 2) / state.scale + canvas.height / 2 - state.offsetY;
            const x = Math.max(0, Math.min(state.mapSize, Math.round(clickX2)));
            const y = Math.max(0, Math.min(state.mapSize, Math.round(clickY2)));

            // 输入坐标点名称
            const name = prompt('请输入坐标点名称：', '');
            if (!name || !name.trim()) return;
            
            // 输入坐标点备注
            const content = prompt('请输入备注说明（≤200字）：', '');
            if (content !== null) {
                if (content.length > 200) {
                    alert('备注字数不能超过200字！');
                    return;
                }
                
                // 检查坐标是否已存在
                const existing = state.notes.find(n => n.x === x && n.y === y);
                if (existing) {
                    alert(`坐标 (${x}, ${y}) 已存在坐标点「${existing.name}」，不可重复添加！`);
                    return;
                }
                
                // 添加新坐标点
                const newNote = {
                    id: `note_${Date.now()}`,
                    name: name.trim(),
                    x,
                    y,
                    content: content.trim() || '无备注'
                };
                state.notes.push(newNote);
                // 更新列表和渲染
                updateNoteList();
                renderMap();
            }
        }

        /**
         * 5. 手动添加坐标点（通过输入坐标）
         */
        function addManualNote() {
            // 非最新版本禁止编辑
            if (state.viewingVersion !== null) {
                alert('当前正在查看历史版本，无法编辑！请先回到最新版本。');
                return;
            }
            const name = manualNoteName.value.trim();
            const x = parseInt(manualNoteX.value);
            const y = parseInt(manualNoteY.value);
            const content = manualNoteContent.value.trim() || '无备注';
            
            // 验证输入
            if (!name) {
                alert('坐标点名称不能为空！');
                return;
            }
            
            if (isNaN(x) || x < 0 || x > 2000) {
                alert('X坐标必须是0~2000的整数！');
                return;
            }
            
            if (isNaN(y) || y < 0 || y > 2000) {
                alert('Y坐标必须是0~2000的整数！');
                return;
            }
            
            if (content.length > 200) {
                alert('备注字数不能超过200字！');
                return;
            }
            
            // 检查坐标是否已存在
            const existing = state.notes.find(n => n.x === x && n.y === y);
            if (existing) {
                alert(`坐标 (${x}, ${y}) 已存在坐标点「${existing.name}」，不可重复添加！`);
                return;
            }
            
            // 添加新坐标点
            const newNote = {
                id: `note_${Date.now()}`,
                name,
                x,
                y,
                content
            };
            state.notes.push(newNote);
            
            // 清空输入框
            manualNoteContent.value = '';
            
            // 更新列表和渲染
            updateNoteList();
            renderMap();
            
            alert('坐标点添加成功！');
        }
                /**
         * 6. 保存元素到地图文件（覆盖或创建）
         */
