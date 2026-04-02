// 初始化 + 事件绑定 + Canvas 渲染 + 地理标识绘制
        function init() {
            // 设置Canvas尺寸适配容器
            resizeCanvas();
            window.addEventListener('resize', resizeCanvas);
            
            // 初始化Canvas
            renderMap();
            // 绑定事件监听
            bindEvents();
            // 初始化参数区显示（根据默认形状）
            showGeoParamSection('rect');
            // 更新列表显示（坐标点、标识、关联）
            updateAllLists();
            // 更新已保存地图列表
            updateSavedMapsList();
            // 恢复工作目录
            restoreWorkDir();
        }

        // 适配Canvas尺寸
        function resizeCanvas() {
            const container = canvas.parentElement;
            canvas.width = container.clientWidth;
            canvas.height = container.clientHeight;
            renderMap();
        }

        // ==================== 事件绑定 ====================
        function bindEvents() {
            // 0. 工作目录
            selectDirBtn.addEventListener('click', selectWorkDir);
            // 0a. 新建地图
            document.getElementById('newMapBtn').addEventListener('click', createNewMap);
            // 1. 缩放事件（鼠标滚轮）
            canvas.addEventListener('wheel', handleWheel);
            // 2. 拖拽事件（鼠标）
            canvas.addEventListener('mousedown', handleMouseDown);
            canvas.addEventListener('mousemove', handleMouseMove);
            canvas.addEventListener('mouseup', handleMouseUp);
            canvas.addEventListener('mouseleave', handleMouseUp);
            // 3. 地图点击事件（添加坐标点）
            canvas.addEventListener('click', handleCanvasClick);
            // 4. 空白处点击关闭备注框
            document.addEventListener('click', handleDocumentClick);
            // 5. 功能按钮事件
            document.getElementById('saveBtn').addEventListener('click', saveCurrentMap);
            document.getElementById('clearBtn').addEventListener('click', clearAllData);
            // 手动添加坐标点
            addManualNoteBtn.addEventListener('click', addManualNote);
            // 地理标识
            document.getElementById('geoShape').addEventListener('change', function() {
                toggleGeoParams();
                applyPreset();
            });
            document.getElementById('geoPresetType').addEventListener('change', applyPreset);
            addGeoBtn.addEventListener('click', addGeoMarker);
            geoStrokeColor.addEventListener('input', () => { geoStrokeColorText.value = geoStrokeColor.value; });
            geoStrokeColorText.addEventListener('input', () => { geoStrokeColor.value = geoStrokeColorText.value; });
            geoFillColor.addEventListener('input', () => { geoFillColorText.value = geoFillColor.value; });
            geoFillColorText.addEventListener('input', () => { geoFillColor.value = geoFillColorText.value; });
            // 量化单位
            document.getElementById('saveUnitBtn').addEventListener('click', saveUnitSetting);
            // 地图关联
            document.getElementById('addRelationBtn').addEventListener('click', addMapRelation);
            // 坐标点操作
            noteCloseBtn.addEventListener('click', () => {
                noteBox.style.display = 'none';
                state.currentNoteId = null;
                state.isEditingNote = false;
                toggleNoteEditMode(false);
            });
            editNoteBtn.addEventListener('click', () => startEditNote());
            saveNoteBtn.addEventListener('click', () => saveEditNote());
            cancelNoteBtn.addEventListener('click', () => cancelEditNote());
            deleteNoteBtn.addEventListener('click', () => deleteNote(state.currentNoteId));
        }

        // ==================== 核心功能实现 ====================
        /**
         * 1. 地图渲染（核心函数）：根据当前状态绘制所有元素
         */
        function renderMap() {
            if (!canvas.getContext) return;
            
            // 清空Canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // 保存当前绘图状态
            ctx.save();
            // 应用缩放和偏移（核心：所有元素基于此变换）
            ctx.translate(canvas.width / 2, canvas.height / 2); // 中心点平移
            ctx.scale(state.scale, state.scale);
            ctx.translate(-canvas.width / 2 + state.offsetX, -canvas.height / 2 + state.offsetY); // 调整偏移

            // 绘制坐标轴背景
            ctx.fillStyle = '#f9f9f9';
            ctx.fillRect(-50, -50, state.mapSize + 100, state.mapSize + 100);

            // 绘制网格线
            ctx.strokeStyle = '#eee';
            ctx.lineWidth = 0.5;
            const gridStep = 200; // 网格步长200像素
            for (let x = 0; x <= state.mapSize; x += gridStep) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, state.mapSize);
                ctx.stroke();
            }
            for (let y = 0; y <= state.mapSize; y += gridStep) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(state.mapSize, y);
                ctx.stroke();
            }

            // 绘制坐标轴
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1;
            // X轴
            ctx.beginPath();
            ctx.moveTo(0, -20);
            ctx.lineTo(state.mapSize, -20);
            ctx.stroke();
            // Y轴
            ctx.beginPath();
            ctx.moveTo(-20, 0);
            ctx.lineTo(-20, state.mapSize);
            ctx.stroke();

            // 绘制坐标刻度和数值（更大的字体）
            ctx.fillStyle = '#666';
            ctx.font = `${16}px sans-serif`; // 字体更大
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            for (let x = 0; x <= state.mapSize; x += gridStep) {
                // X轴刻度
                ctx.beginPath();
                ctx.moveTo(x, -20);
                ctx.lineTo(x, -30);
                ctx.stroke();
                // X轴数值
                ctx.fillText(x.toString(), x, -40);
            }

            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            for (let y = 0; y <= state.mapSize; y += gridStep) {
                // Y轴刻度
                ctx.beginPath();
                ctx.moveTo(-20, y);
                ctx.lineTo(-30, y);
                ctx.stroke();
                // Y轴数值
                ctx.fillText(y.toString(), -40, y);
            }

            // 绘制地图边界（2000×2000）
            ctx.strokeStyle = '#999';
            ctx.lineWidth = 1;
            ctx.strokeRect(0, 0, state.mapSize, state.mapSize);

            // ==================== 绘制地理标识（折线/多边形） ====================
            state.geoMarkers.forEach(geo => {
                const style = geo.style || {};
                const strokeColor = style.strokeColor || '#5dade2';
                const lineWidth = style.lineWidth || 2;
                const bold = style.bold || false;
                const finalLineWidth = bold ? lineWidth * 2 : lineWidth;
                const lineDash = style.lineDash || null;

                ctx.strokeStyle = strokeColor;
                ctx.lineWidth = finalLineWidth;
                if (lineDash) ctx.setLineDash(lineDash);
                else ctx.setLineDash([]);

                if (geo.type === 'polyline' && geo.points && geo.points.length >= 2) {
                    // 折线
                    ctx.beginPath();
                    ctx.moveTo(geo.points[0].x, geo.points[0].y);
                    for (let i = 1; i < geo.points.length; i++) {
                        ctx.lineTo(geo.points[i].x, geo.points[i].y);
                    }
                    ctx.stroke();

                    // 符号绘制：只在折线上绘制箭头、双线、标记、锯齿
                    const symbol = (geo.style && geo.style.symbol) || (geo.presetType && GEO_PRESETS[geo.presetType] && GEO_PRESETS[geo.presetType].symbol);
                    if (symbol === 'arrows' && geo.points.length >= 2) {
                        drawArrowsAlongPath(ctx, geo.points, 200, 10, strokeColor);
                    }
                    if (symbol === 'doubleline') {
                        drawDoubleLine(ctx, geo.points, finalLineWidth, strokeColor);
                    }
                    if (symbol === 'marks') {
                        drawMarksAlongPath(ctx, geo.points, 40, 6, strokeColor);
                    }
                    if (symbol === 'zigzag') {
                        drawZigzagAlongPath(ctx, geo.points, 8, strokeColor);
                    }
                    if (symbol === 'cliff') {
                        drawCliffAlongPath(ctx, geo.points, 10, strokeColor);
                    }
                    if (symbol === 'route') {
                        drawRouteAlongPath(ctx, geo.points, 60, 6, strokeColor);
                    }
                    if (symbol === 'bridge') {
                        drawBridgeAlongPath(ctx, geo.points, strokeColor);
                    }

                    // 箭头末端
                    if (geo.arrowEnd) {
                        const pts = geo.points;
                        const last = pts[pts.length - 1];
                        const prev = pts[pts.length - 2];
                        drawArrowHead(ctx, prev.x, prev.y, last.x, last.y, 15, strokeColor, finalLineWidth);
                    }

                    // 名称显示在第一个顶点附近
                    if (geo.name) {
                        drawMarkerName(geo.name, geo.points[0].x + 10, geo.points[0].y - 10, geo.metrics);
                    }
                } else if (geo.type === 'polygon' && geo.points && geo.points.length >= 3) {
                    // 多边形
                    const fillColor = style.fillColor || 'rgba(39,174,96,0.2)';
                    ctx.beginPath();
                    ctx.moveTo(geo.points[0].x, geo.points[0].y);
                    for (let i = 1; i < geo.points.length; i++) {
                        ctx.lineTo(geo.points[i].x, geo.points[i].y);
                    }
                    ctx.closePath();
                    ctx.fillStyle = fillColor;
                    ctx.fill();
                    ctx.stroke();

                    // 符号绘制：只在面状上绘制小树、波浪、点阵、交叉线、网格、塔、帐篷
                    const symbol = (geo.style && geo.style.symbol) || (geo.presetType && GEO_PRESETS[geo.presetType] && GEO_PRESETS[geo.presetType].symbol);
                    if (symbol === 'trees') {
                        const treeColor = style.strokeColor || '#27ae60';
                        const treeSize = 12;
                        const xs = geo.points.map(p => p.x);
                        const ys = geo.points.map(p => p.y);
                        const minX = Math.min(...xs), maxX = Math.max(...xs);
                        const minY = Math.min(...ys), maxY = Math.max(...ys);
                        const gap = 60;
                        for (let tx = minX + gap/2; tx < maxX; tx += gap) {
                            for (let ty = minY + gap/2; ty < maxY; ty += gap) {
                                if (pointInPolygon(tx, ty, geo.points)) {
                                    drawTree(ctx, tx, ty, treeSize, treeColor);
                                }
                            }
                        }
                    }
                    if (symbol === 'dots') {
                        drawDotsInArea(ctx, geo.points, strokeColor);
                    }
                    if (symbol === 'crosshatch') {
                        drawCrosshatchInPolygon(ctx, geo.points, strokeColor);
                    }
                    if (symbol === 'grid') {
                        drawGridInPolygon(ctx, geo.points, strokeColor);
                    }
                    if (symbol === 'tent') {
                        drawTentsInPolygon(ctx, geo.points, strokeColor);
                    }
                    if (symbol === 'grassland') {
                        drawGrasslandInPolygon(ctx, geo.points, strokeColor);
                    }
                    if (symbol === 'bamboo') {
                        drawBambooInPolygon(ctx, geo.points, strokeColor);
                    }
                    if (symbol === 'ocean_waves') {
                        drawOceanWavesInPolygon(ctx, geo.points, strokeColor);
                    }
                    if (symbol === 'kingdom') {
                        drawKingdomInPolygon(ctx, geo.points, strokeColor);
                    }
                    if (symbol === 'towers') {
                        drawTowersInPolygon(ctx, geo.points, strokeColor);
                    }

                    // 名称显示在多边形重心
                    if (geo.name) {
                        const cx = geo.points.reduce((s, p) => s + p.x, 0) / geo.points.length;
                        const cy = geo.points.reduce((s, p) => s + p.y, 0) / geo.points.length;
                        drawMarkerName(geo.name, cx, cy, geo.metrics);
                    }
                } else if (geo.type === 'circle' && geo.center) {
                    // 圆形地理标识（向后兼容）
                    const fillColor = style.fillColor || 'rgba(39,174,96,0.2)';
                    ctx.beginPath();
                    ctx.arc(geo.center.x, geo.center.y, geo.radius || 100, 0, Math.PI * 2);
                    ctx.fillStyle = fillColor;
                    ctx.fill();
                    ctx.stroke();
                    if (geo.name) {
                        drawMarkerName(geo.name, geo.center.x, geo.center.y + (geo.radius || 100) + 20, geo.metrics);
                    }
                } else if (geo.type === 'rect' && geo.x !== undefined) {
                    // 矩形
                    const fillColor = style.fillColor;
                    if (fillColor) {
                        ctx.fillStyle = fillColor;
                        ctx.fillRect(geo.x, geo.y, geo.width, geo.height);
                    }
                    ctx.strokeRect(geo.x, geo.y, geo.width, geo.height);
                    // 符号绘制：面状符号
                    const symbol = (geo.style && geo.style.symbol) || (geo.presetType && GEO_PRESETS[geo.presetType] && GEO_PRESETS[geo.presetType].symbol);
                    if (symbol === 'waves') {
                        drawWaves(ctx, { x: geo.x, y: geo.y, width: geo.width, height: geo.height }, strokeColor, 3);
                    }
                    if (symbol === 'trees') {
                        const treeColor = style.strokeColor || '#27ae60';
                        const treeSize = 12;
                        const gap = 60;
                        for (let tx = geo.x + gap/2; tx < geo.x + geo.width; tx += gap) {
                            for (let ty = geo.y + gap/2; ty < geo.y + geo.height; ty += gap) {
                                drawTree(ctx, tx, ty, treeSize, treeColor);
                            }
                        }
                    }
                    if (symbol === 'dots') {
                        const gap = 30;
                        ctx.fillStyle = strokeColor;
                        for (let tx = geo.x + gap/2; tx < geo.x + geo.width; tx += gap) {
                            for (let ty = geo.y + gap/2; ty < geo.y + geo.height; ty += gap) {
                                ctx.beginPath();
                                ctx.arc(tx, ty, 2, 0, Math.PI * 2);
                                ctx.fill();
                            }
                        }
                    }
                    if (symbol === 'crosshatch') {
                        drawCrosshatchInRect(ctx, geo.x, geo.y, geo.width, geo.height, strokeColor);
                    }
                    if (symbol === 'grid') {
                        drawGridInRect(ctx, geo.x, geo.y, geo.width, geo.height, strokeColor);
                    }
                    if (symbol === 'tent') {
                        const gap = 60;
                        const tSize = 10;
                        for (let tx = geo.x + gap/2; tx < geo.x + geo.width; tx += gap) {
                            for (let ty = geo.y + gap/2; ty < geo.y + geo.height; ty += gap) {
                                // 绘制帐篷形状（三角形+旗）
                                ctx.fillStyle = strokeColor;
                                ctx.beginPath();
                                ctx.moveTo(tx, ty - tSize);
                                ctx.lineTo(tx - tSize * 0.8, ty + tSize * 0.5);
                                ctx.lineTo(tx + tSize * 0.8, ty + tSize * 0.5);
                                ctx.closePath();
                                ctx.fill();
                                // 小旗
                                ctx.beginPath();
                                ctx.moveTo(tx, ty - tSize);
                                ctx.lineTo(tx + tSize * 0.6, ty - tSize * 0.5);
                                ctx.lineTo(tx, ty - tSize * 0.3);
                                ctx.fill();
                            }
                        }
                    }
                    if (symbol === 'grassland') {
                        drawGrasslandInRect(ctx, geo.x, geo.y, geo.width, geo.height, strokeColor);
                    }
                    if (symbol === 'ocean_waves') {
                        drawOceanWavesInRect(ctx, geo.x, geo.y, geo.width, geo.height, strokeColor);
                    }
                    if (symbol === 'kingdom') {
                        drawKingdomInRect(ctx, geo.x, geo.y, geo.width, geo.height, strokeColor);
                    }
                    if (symbol === 'bamboo') {
                        drawBambooInRect(ctx, geo.x, geo.y, geo.width, geo.height, strokeColor);
                    }
                    if (symbol === 'towers') {
                        drawTowersInRect(ctx, geo.x, geo.y, geo.width, geo.height, strokeColor);
                    }
                    // 名称显示在矩形中心
                    if (geo.name) {
                        drawMarkerName(geo.name, geo.x + geo.width / 2, geo.y + geo.height / 2, geo.metrics);
                    }
                } else if (geo.type === 'ellipse' && geo.cx !== undefined) {
                    // 椭圆
                    const fillColor = style.fillColor;
                    ctx.beginPath();
                    ctx.ellipse(geo.cx, geo.cy, geo.rx || 100, geo.ry || 100, 0, 0, Math.PI * 2);
                    if (fillColor) {
                        ctx.fillStyle = fillColor;
                        ctx.fill();
                    }
                    ctx.stroke();
                    // 符号绘制：面状符号
                    const symbol = (geo.style && geo.style.symbol) || (geo.presetType && GEO_PRESETS[geo.presetType] && GEO_PRESETS[geo.presetType].symbol);
                    if (symbol === 'waves') {
                        drawWaves(ctx, {
                            x: geo.cx - geo.rx, y: geo.cy - geo.ry,
                            width: geo.rx * 2, height: geo.ry * 2
                        }, strokeColor, 3);
                    }
                    if (symbol === 'trees') {
                        const treeColor = style.strokeColor || '#27ae60';
                        const treeSize = 12;
                        const gap = 60;
                        const minX = geo.cx - geo.rx, maxX = geo.cx + geo.rx;
                        const minY = geo.cy - geo.ry, maxY = geo.cy + geo.ry;
                        for (let tx = minX + gap/2; tx < maxX; tx += gap) {
                            for (let ty = minY + gap/2; ty < maxY; ty += gap) {
                                // 椭圆内部判断：((tx-cx)/rx)^2 + ((ty-cy)/ry)^2 < 1
                                const dx = (tx - geo.cx) / geo.rx;
                                const dy = (ty - geo.cy) / geo.ry;
                                if (dx*dx + dy*dy < 1) {
                                    drawTree(ctx, tx, ty, treeSize, treeColor);
                                }
                            }
                        }
                    }
                    if (symbol === 'dots') {
                        const gap = 30;
                        ctx.fillStyle = strokeColor;
                        for (let tx = geo.cx - geo.rx + gap/2; tx < geo.cx + geo.rx; tx += gap) {
                            for (let ty = geo.cy - geo.ry + gap/2; ty < geo.cy + geo.ry; ty += gap) {
                                const dx = (tx - geo.cx) / geo.rx;
                                const dy = (ty - geo.cy) / geo.ry;
                                if (dx*dx + dy*dy < 1) {
                                    ctx.beginPath();
                                    ctx.arc(tx, ty, 2, 0, Math.PI * 2);
                                    ctx.fill();
                                }
                            }
                        }
                    }
                    if (symbol === 'crosshatch') {
                        drawCrosshatchInEllipse(ctx, geo.cx, geo.cy, geo.rx, geo.ry, strokeColor);
                    }
                    if (symbol === 'grid') {
                        drawGridInEllipse(ctx, geo.cx, geo.cy, geo.rx, geo.ry, strokeColor);
                    }
                    if (symbol === 'tent') {
                        drawTentsInEllipse(ctx, geo.cx, geo.cy, geo.rx, geo.ry, strokeColor);
                    }
                    if (symbol === 'grassland') {
                        drawGrasslandInEllipse(ctx, geo.cx, geo.cy, geo.rx, geo.ry, strokeColor);
                    }
                    if (symbol === 'bamboo') {
                        drawBambooInEllipse(ctx, geo.cx, geo.cy, geo.rx, geo.ry, strokeColor);
                    }
                    if (symbol === 'ocean_waves') {
                        drawOceanWavesInEllipse(ctx, geo.cx, geo.cy, geo.rx, geo.ry, strokeColor);
                    }
                    if (symbol === 'kingdom') {
                        drawKingdomInEllipse(ctx, geo.cx, geo.cy, geo.rx, geo.ry, strokeColor);
                    }
                    if (symbol === 'towers') {
                        drawTowersInEllipse(ctx, geo.cx, geo.cy, geo.rx, geo.ry, strokeColor);
                    }
                    // 名称显示在椭圆中心
                    if (geo.name) {
                        drawMarkerName(geo.name, geo.cx, geo.cy, geo.metrics);
                    }
                } else if (geo.type === 'pin' && geo.x !== undefined) {
                    // 标注点 — 使用Canvas几何符号绘制（不依赖字体/emoji）
                    const pinColor = style.strokeColor || '#e74c3c';
                    const presetSym = (geo.style && geo.style.symbol) || (geo.presetType && GEO_PRESETS[geo.presetType] && GEO_PRESETS[geo.presetType].symbol);
                    const px = geo.x, py = geo.y;
                    const sz = 14; // 基础尺寸

                    if (presetSym === 'spring') {
                        // 水滴形
                        drawSpringPin(ctx, px, py, sz, pinColor);
                    } else if (presetSym === 'volcano') {
                        // 火山形
                        drawVolcanoPin(ctx, px, py, sz, pinColor);
                    } else if (presetSym === 'snow_peak') {
                        // 雪山形
                        drawSnowPeakPin(ctx, px, py, sz);
                    } else if (presetSym === 'cave') {
                        // 洞穴拱门形
                        drawCavePin(ctx, px, py, sz, pinColor);
                    } else if (presetSym === 'village') {
                        // 人字屋顶小屋
                        drawVillagePin(ctx, px, py, sz, pinColor);
                    } else if (presetSym === 'temple') {
                        // 宝塔形
                        drawTemplePin(ctx, px, py, sz, pinColor);
                    } else if (presetSym === 'ruin') {
                        // 断柱形
                        drawRuinPin(ctx, px, py, sz, pinColor);
                    } else {
                        // 默认：红色圆点
                        ctx.fillStyle = pinColor;
                        ctx.beginPath();
                        ctx.arc(px, py, 6, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    if (geo.name) {
                        ctx.font = `bold ${13}px sans-serif`;
                        ctx.fillStyle = pinColor;
                        ctx.textAlign = 'left';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(geo.name, geo.x + 14, geo.y);
                    }
                }
            });
            ctx.setLineDash([]); // 重置虚线

            // 绘制地图关联标识（🚪 传送门风格）
            state.mapRelations.forEach(relation => {
                const [x, y] = relation.currentXY.split(',').map(Number);

                ctx.font = `${24}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('🚪', x, y);

                ctx.font = `bold ${13}px sans-serif`;
                ctx.fillStyle = '#2c3e50';
                ctx.textAlign = 'left';
                ctx.fillText(relation.targetMapName, x + 18, y);
            });

            // 绘制坐标点标记和名称
            state.notes.forEach(note => {
                // 绘制坐标点标记（红色圆点）
                ctx.fillStyle = '#e74c3c';
                ctx.beginPath();
                ctx.arc(note.x, note.y, 8, 0, Math.PI * 2);
                ctx.fill();

                // 绘制坐标点名称（去掉方框）
                ctx.fillStyle = '#e74c3c';
                ctx.font = `${14}px sans-serif`;
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(note.name, note.x + 15, note.y);
            });

            // 恢复绘图状态
            ctx.restore();
        }

        /**
         * 绘制范围标识名称 + metrics
         */
        function drawMarkerName(name, x, y, metrics) {
            ctx.fillStyle = '#2c3e50';
            ctx.font = `${14}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(name, x, y);
            // 显示面积/长度
            if (metrics) {
                const m = metrics.lengthDesc || metrics.areaDesc;
                if (m) {
                    ctx.font = `${11}px sans-serif`;
                    ctx.fillStyle = '#888';
                    ctx.fillText(m, x, y + 16);
                }
            }
        }

        /**
         * 绘制箭头头部
         */
        function drawArrowHead(ctx, fromX, fromY, toX, toY, size, color, lineWidth) {
            const angle = Math.atan2(toY - fromY, toX - fromX);
            ctx.save();
            ctx.fillStyle = color;
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            ctx.beginPath();
            ctx.moveTo(toX, toY);
            ctx.lineTo(toX - size * Math.cos(angle - Math.PI / 6), toY - size * Math.sin(angle - Math.PI / 6));
            ctx.lineTo(toX - size * Math.cos(angle + Math.PI / 6), toY - size * Math.sin(angle + Math.PI / 6));
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

