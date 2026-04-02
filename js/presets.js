// 预设约束 + 参数区 + 地理标识增删改 + 颜色工具
        function applyPreset() {
            const presetKey = document.getElementById('geoPresetType').value;
            if (!presetKey || !GEO_PRESETS[presetKey]) return;
            const preset = GEO_PRESETS[presetKey];

            // 填充样式
            document.getElementById('geoStrokeColor').value = preset.strokeColor;
            document.getElementById('geoStrokeColorText').value = preset.strokeColor;
            document.getElementById('geoLineWidth').value = preset.lineWidth;
            document.getElementById('geoBold').checked = preset.bold;

            if (preset.fillColor) {
                const hex = rgbaToHex(preset.fillColor);
                document.getElementById('geoFillColor').value = hex;
                document.getElementById('geoFillColorText').value = preset.fillColor;
            }

            // 形状约束：
            //   lineOnly: true  → 只能折线（线状特征）
            //   lineOnly: false → 不能折线（面状/点状），其余均可
            //   无 lineOnly 字段 → 通用，全部可选
            //   标注点对所有类型开放
            const shapeEl = document.getElementById('geoShape');
            const shapeLabel = document.getElementById('geoShapeLabel');
            const hasConstraint = ('lineOnly' in preset);
            for (const opt of shapeEl.options) {
                if (!hasConstraint) {
                    opt.disabled = false;
                } else if (preset.lineOnly) {
                    opt.disabled = (opt.value !== 'polyline');
                } else {
                    opt.disabled = (opt.value === 'polyline');
                }
            }
            // 如果当前选中的被禁用了，切到第一个可用的
            if (shapeEl.selectedOptions[0] && shapeEl.selectedOptions[0].disabled) {
                for (const opt of shapeEl.options) {
                    if (!opt.disabled) { shapeEl.value = opt.value; break; }
                }
            }
            shapeEl.disabled = false;
            shapeEl.title = '';
            shapeLabel.textContent = '范围形状';
            showGeoParamSection(shapeEl.value);
        }

        /**
         * 显示对应的参数区域
         */
        function showGeoParamSection(shape) {
            document.getElementById('geoParamPoints').style.display =
                (shape === 'polyline' || shape === 'polygon') ? 'block' : 'none';
            document.getElementById('geoParamRect').style.display =
                (shape === 'rect') ? 'block' : 'none';
            document.getElementById('geoParamEllipse').style.display =
                (shape === 'ellipse') ? 'block' : 'none';
            document.getElementById('geoParamPin').style.display =
                (shape === 'pin') ? 'block' : 'none';
            document.getElementById('geoFillGroup').style.display =
                (shape === 'polygon' || shape === 'ellipse' || shape === 'rect') ? 'block' : 'none';
        }

        /**
         * 切换地理标识参数表单（根据形状选择器）
         */
        function toggleGeoParams() {
            const shape = document.getElementById('geoShape').value;
            showGeoParamSection(shape);
        }

        /**
         * 添加地理标识
         */
        function addGeoMarker() {
            if (state.viewingVersion !== null) {
                alert('当前正在查看历史版本，无法编辑！请先回到最新版本。');
                return;
            }
            const name = geoName.value.trim();
            const shape = document.getElementById('geoShape').value;
            const presetType = document.getElementById('geoPresetType').value || '通用';
            const preset = GEO_PRESETS[presetType] || GEO_PRESETS['通用'];
            const strokeColor = geoStrokeColor.value || preset.strokeColor;
            const fillColor = geoFillColorText.value || preset.fillColor || '#27ae60';
            const lineWidth = parseInt(geoLineWidth.value) || preset.lineWidth;
            const bold = geoBold.checked;

            if (!name) {
                alert('标识名称不能为空！');
                return;
            }

            let geo = {
                id: `geo_${Date.now()}`,
                presetType: presetType,
                type: shape,
                name,
                style: {
                    strokeColor,
                    lineWidth,
                    lineDash: null,
                    fillColor: null,
                    bold,
                    symbol: preset.symbol
                }
            };

            if (shape === 'polyline' || shape === 'polygon') {
                const pointsText = geoPoints.value.trim();
                const lines = pointsText.split('\n').map(l => l.trim()).filter(l => l);
                const minPts = (shape === 'polygon') ? 3 : 2;
                if (lines.length < minPts) {
                    alert(shape === 'polygon' ? '多边形至少需要3个顶点！' : '至少需要2个顶点！');
                    return;
                }
                const points = [];
                for (const line of lines) {
                    const parts = line.split(',').map(s => parseInt(s.trim()));
                    if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) {
                        alert(`坐标格式错误："${line}"，应为 "x,y"`);
                        return;
                    }
                    if (parts[0] < 0 || parts[0] > 2000 || parts[1] < 0 || parts[1] > 2000) {
                        alert(`坐标超出范围：(${parts[0]},${parts[1]})，范围 0~2000`);
                        return;
                    }
                    points.push({ x: parts[0], y: parts[1] });
                }
                geo.points = points;
                if (shape === 'polyline') {
                    geo.arrowEnd = false;
                }
                if (shape === 'polygon' && preset.fillColor) {
                    geo.style.fillColor = preset.fillColor;
                }
            } else if (shape === 'rect') {
                geo.x = parseInt(document.getElementById('geoRectX').value) || 0;
                geo.y = parseInt(document.getElementById('geoRectY').value) || 0;
                geo.width = parseInt(document.getElementById('geoRectW').value) || 100;
                geo.height = parseInt(document.getElementById('geoRectH').value) || 100;
                if (preset.fillColor) geo.style.fillColor = preset.fillColor;
            } else if (shape === 'ellipse') {
                geo.cx = parseInt(document.getElementById('geoEllipseCx').value) || 0;
                geo.cy = parseInt(document.getElementById('geoEllipseCy').value) || 0;
                geo.rx = parseInt(document.getElementById('geoEllipseRx').value) || 100;
                geo.ry = parseInt(document.getElementById('geoEllipseRy').value) || 100;
                if (preset.fillColor) geo.style.fillColor = preset.fillColor;
            } else if (shape === 'pin') {
                geo.x = parseInt(document.getElementById('geoPinX').value) || 0;
                geo.y = parseInt(document.getElementById('geoPinY').value) || 0;
            }

            calcGeoMetrics(geo);
            state.geoMarkers.push(geo);

            // 清空表单
            geoName.value = '';

            updateGeoList();
            renderMap();
        }

        /**
         * 编辑地理标识（加载到表单）
         */
        function editGeoMarker(geoId) {
            const geo = state.geoMarkers.find(g => g.id === geoId);
            if (!geo) return;

            geoName.value = geo.name || '';

            // 还原形状选择
            document.getElementById('geoShape').value = geo.type || 'polyline';

            // 还原标识类型选择
            if (geo.presetType && GEO_PRESETS[geo.presetType]) {
                document.getElementById('geoPresetType').value = geo.presetType;
            } else {
                document.getElementById('geoPresetType').value = '通用';
            }

            // 切换参数区
            showGeoParamSection(geo.type);

            // 填充参数
            if (geo.points) {
                geoPoints.value = geo.points.map(p => `${p.x},${p.y}`).join('\n');
            }
            if (geo.type === 'rect') {
                document.getElementById('geoRectX').value = geo.x || 0;
                document.getElementById('geoRectY').value = geo.y || 0;
                document.getElementById('geoRectW').value = geo.width || 100;
                document.getElementById('geoRectH').value = geo.height || 100;
            }
            if (geo.type === 'ellipse') {
                document.getElementById('geoEllipseCx').value = geo.cx || 0;
                document.getElementById('geoEllipseCy').value = geo.cy || 0;
                document.getElementById('geoEllipseRx').value = geo.rx || 100;
                document.getElementById('geoEllipseRy').value = geo.ry || 100;
            }
            if (geo.type === 'pin') {
                document.getElementById('geoPinX').value = geo.x || 0;
                document.getElementById('geoPinY').value = geo.y || 0;
            }

            // 填充样式
            const style = geo.style || {};
            if (style.strokeColor) {
                geoStrokeColor.value = style.strokeColor;
                geoStrokeColorText.value = style.strokeColor;
            }
            if (style.fillColor) {
                const hex = rgbaToHex(style.fillColor);
                geoFillColor.value = hex;
                geoFillColorText.value = style.fillColor;
            }
            geoLineWidth.value = style.lineWidth || 2;
            geoBold.checked = style.bold || false;

            // 删除原标识
            state.geoMarkers = state.geoMarkers.filter(g => g.id !== geoId);
            updateGeoList();
            renderMap();

            // 应用预设（含形状锁定）
            applyPreset();
        }

        /**
         * 删除地理标识
         */
        function deleteGeoMarker(geoId) {
            if (state.viewingVersion !== null) {
                alert('当前正在查看历史版本，无法编辑！请先回到最新版本。');
                return;
            }
            state.geoMarkers = state.geoMarkers.filter(g => g.id !== geoId);
            updateGeoList();
            renderMap();
        }

        /**
         * 更新地理标识列表
         */
        function updateGeoList() {
            if (state.geoMarkers.length === 0) {
                geoListEl.innerHTML = '暂无地理标识';
                return;
            }
            geoListEl.innerHTML = '';
            state.geoMarkers.forEach(geo => {
                const item = document.createElement('div');
                item.className = 'list-item';
                const typeLabel = { polyline: '折线', polygon: '多边形', circle: '圆形', rect: '矩形', ellipse: '椭圆', pin: '标注点' }[geo.type] || geo.type;
                const presetLabel = geo.presetType || '通用';
                let ptsInfo = '';
                if (geo.points) {
                    ptsInfo = `${geo.points.length}个顶点`;
                } else if (geo.type === 'rect') {
                    ptsInfo = `(${geo.x},${geo.y}) ${geo.width}×${geo.height}`;
                } else if (geo.type === 'ellipse') {
                    ptsInfo = `(${geo.cx},${geo.cy}) rx=${geo.rx} ry=${geo.ry}`;
                } else if (geo.center) {
                    ptsInfo = `圆心(${geo.center.x},${geo.center.y}) r=${geo.radius}`;
                }
                // metrics 显示
                const m = geo.metrics;
                let metricsInfo = '';
                if (m) {
                    if (m.lengthDesc) metricsInfo = m.lengthDesc;
                    if (m.areaDesc) metricsInfo = m.areaDesc;
                }
                if (geo.geoWidthDesc) metricsInfo = (metricsInfo ? metricsInfo + ' · ' : '') + geo.geoWidthDesc;
                item.innerHTML = `
                    <div style="flex:1;">
                        <div style="font-weight:600;">${geo.name}（${typeLabel}·${presetLabel}）</div>
                        <div style="font-size:12px; color:#666;">${ptsInfo}${metricsInfo ? ' · ' + metricsInfo : ''}</div>
                    </div>
                    <div>
                        <button class="list-btn" onclick="editGeoMarker('${geo.id}')">编辑</button>
                        <button class="list-btn btn-danger" onclick="deleteGeoMarker('${geo.id}')">删除</button>
                    </div>
                `;
                geoListEl.appendChild(item);
            });
        }

        /**
         * hex 转 rgba
         */
        function hexToRgba(hex, alpha) {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return `rgba(${r},${g},${b},${alpha})`;
        }

        /**
         * rgba 转 hex（取 RGB 部分）
         */
        function rgbaToHex(rgba) {
            const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
            if (!match) return '#27ae60';
            return '#' + [match[1], match[2], match[3]].map(c => parseInt(c).toString(16).padStart(2, '0')).join('');
        }

        /**
         * 2. 缩放处理（鼠标滚轮）
         */
