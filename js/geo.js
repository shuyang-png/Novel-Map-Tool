// 地理标识 CRUD + 迁移 + 辅助函数
        // ==================== 地理标识功能 ====================

        // 按标识类型组织的预设
        // 25种地理标识预设（V2方案）
        // lineOnly: true = 只能折线（线状特征），false/undefined = 不能折线（面状/点状）
        // 标注点对所有类型开放
        const GEO_PRESETS = {
            '通用':    { strokeColor: '#5dade2', lineWidth: 2, fillColor: null, bold: false, symbol: null },
            '河流':    { lineOnly: true, strokeColor: '#5dade2', lineWidth: 3, fillColor: null, bold: false, symbol: 'arrows' },
            '湖泊':    { lineOnly: false, strokeColor: '#2e86c1', lineWidth: 2, fillColor: 'rgba(46,134,193,0.25)', bold: false, symbol: 'waves' },
            '海洋':    { lineOnly: false, strokeColor: '#1a5276', lineWidth: 2, fillColor: 'rgba(26,82,118,0.2)', bold: false, symbol: 'ocean_waves' },
            '泉眼':    { strokeColor: '#5dade2', lineWidth: 2, fillColor: null, bold: false, symbol: 'spring' },
            '森林':    { lineOnly: false, strokeColor: '#27ae60', lineWidth: 2, fillColor: 'rgba(39,174,96,0.2)', bold: false, symbol: 'trees' },
            '沼泽':    { lineOnly: false, strokeColor: '#6b8e23', lineWidth: 2, fillColor: 'rgba(107,142,35,0.25)', bold: false, symbol: 'crosshatch' },
            '草原':    { lineOnly: false, strokeColor: '#82e0aa', lineWidth: 2, fillColor: 'rgba(130,224,170,0.1)', bold: false, symbol: 'grassland' },
            '沙漠':    { lineOnly: false, strokeColor: '#f0b429', lineWidth: 2, fillColor: 'rgba(240,180,41,0.2)', bold: false, symbol: 'dots' },
            '竹林':    { lineOnly: false, strokeColor: '#a8d08d', lineWidth: 2, fillColor: 'rgba(168,208,141,0.2)', bold: false, symbol: 'bamboo' },
            '山脉':    { lineOnly: true, strokeColor: '#7f8c8d', lineWidth: 5, fillColor: null, bold: true, symbol: 'zigzag' },
            '悬崖':    { lineOnly: true, strokeColor: '#8d6e63', lineWidth: 3, fillColor: null, bold: false, symbol: 'cliff' },
            '火山':    { strokeColor: '#d32f2f', lineWidth: 2, fillColor: null, bold: false, symbol: 'volcano' },
            '雪峰':    { strokeColor: '#3498db', lineWidth: 2, fillColor: null, bold: false, symbol: 'snow_peak' },
            '洞穴':    { strokeColor: '#8d6e63', lineWidth: 2, fillColor: null, bold: false, symbol: 'cave' },
            '城市':    { lineOnly: false, strokeColor: '#e74c3c', lineWidth: 2, fillColor: 'rgba(231,76,60,0.12)', bold: true, symbol: 'grid' },
            '城堡':    { lineOnly: false, strokeColor: '#c0392b', lineWidth: 4, fillColor: 'rgba(192,57,43,0.1)', bold: true, symbol: 'towers' },
            '村庄':    { strokeColor: '#f39c12', lineWidth: 2, fillColor: null, bold: false, symbol: 'village' },
            '庙宇':    { strokeColor: '#f1c40f', lineWidth: 2, fillColor: null, bold: false, symbol: 'temple' },
            '废墟':    { strokeColor: '#95a5a6', lineWidth: 2, fillColor: null, bold: false, symbol: 'ruin' },
            '道路':    { lineOnly: true, strokeColor: '#95a5a6', lineWidth: 2, fillColor: null, bold: false, symbol: 'marks' },
            '城墙':    { lineOnly: true, strokeColor: '#616161', lineWidth: 3, fillColor: null, bold: true, symbol: 'doubleline' },
            '行军路线': { lineOnly: true, strokeColor: '#8e44ad', lineWidth: 2, fillColor: null, bold: false, symbol: 'route' },
            '桥梁':    { lineOnly: true, strokeColor: '#8d6e63', lineWidth: 3, fillColor: null, bold: false, symbol: 'bridge' },
            '王国':    { lineOnly: false, strokeColor: '#c0392b', lineWidth: 2, fillColor: 'rgba(192,57,43,0.1)', bold: true, symbol: 'kingdom' },
            '营地':    { lineOnly: false, strokeColor: '#f39c12', lineWidth: 2, fillColor: 'rgba(243,156,18,0.2)', bold: false, symbol: 'tent' }
        };

        /**
         * 默认样式
         */
        function defaultStyle() {
            return { strokeColor: '#5dade2', lineWidth: 2, lineDash: null, fillColor: null, bold: false, symbol: null };
        }

        /**
         * 迁移旧数据：rangeMarkers → geoMarkers，circle → ellipse，旧presetType → 新标识类型
         */
        function migrateGeoData(data) {
            let geoMarkers = data.geoMarkers || [];
            const rangeMarkers = data.rangeMarkers || [];

            // 旧预设类型 → 新标识类型映射
            const OLD_TYPE_MAP = {
                'river': '河流', 'lake': '湖泊', 'forest': '森林'
            };
            // 旧预设类型 → 默认 symbol
            const OLD_SYMBOL_MAP = {
                'river': 'arrows', 'lake': 'waves', 'forest': 'trees'
            };

            // 第一步：迁移 rangeMarkers → geoMarkers
            for (const m of rangeMarkers) {
                if (m.type === 'rect') {
                    const ps = m.params;
                    const xs = [ps.x1, ps.x2, ps.x3, ps.x4];
                    const ys = [ps.y1, ps.y2, ps.y3, ps.y4];
                    const minX = Math.min(...xs), maxX = Math.max(...xs);
                    const minY = Math.min(...ys), maxY = Math.max(...ys);
                    geoMarkers.push({
                        id: m.id.replace('marker_', 'geo_migrated_'),
                        presetType: '通用',
                        type: 'rect',
                        name: m.name,
                        x: minX, y: minY,
                        width: maxX - minX,
                        height: maxY - minY,
                        style: defaultStyle()
                    });
                } else if (m.type === 'circle') {
                    const { cx, cy, r } = m.params;
                    geoMarkers.push({
                        id: m.id.replace('marker_', 'geo_migrated_'),
                        presetType: '通用',
                        type: 'ellipse',
                        name: m.name,
                        cx, cy,
                        rx: r, ry: r,
                        style: defaultStyle()
                    });
                }
            }

            // 第二步：迁移 geoMarkers 中已有的旧格式 → 新格式
            for (const geo of geoMarkers) {
                // circle → ellipse
                if (geo.type === 'circle' && geo.center) {
                    geo.type = 'ellipse';
                    geo.cx = geo.center.x;
                    geo.cy = geo.center.y;
                    geo.rx = geo.radius || 100;
                    geo.ry = geo.radius || 100;
                    delete geo.center;
                    delete geo.radius;
                }
                // 补充缺失字段
                if (!geo.style) geo.style = defaultStyle();
                if (geo.presetType === undefined || geo.presetType === null) {
                    geo.presetType = '通用';
                }
                // 旧 presetType → 新标识类型
                if (OLD_TYPE_MAP[geo.presetType]) {
                    geo.presetType = OLD_TYPE_MAP[geo.presetType];
                }
                // 确保 style 中有 symbol 字段
                if (!geo.style.symbol) {
                    const symbol = OLD_SYMBOL_MAP[geo.presetType] || (GEO_PRESETS[geo.presetType] && GEO_PRESETS[geo.presetType].symbol) || null;
                    geo.style.symbol = symbol;
                }
                // 清理不再需要的旧字段
                delete geo.arrowEnd;
            }

            return geoMarkers;
        }

        /**
         * 判断点是否在多边形内部（射线法）
         */
        function pointInPolygon(px, py, points) {
            let inside = false;
            for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
                const xi = points[i].x, yi = points[i].y;
                const xj = points[j].x, yj = points[j].y;
                const intersect = ((yi > py) !== (yj > py)) &&
                    (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
                if (intersect) inside = !inside;
            }
            return inside;
        }

        /**
         * 沿线绘制方向箭头（河流符号）
         */
