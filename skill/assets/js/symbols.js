// V1 符号绘制（折线+基础面状：箭头/树/波浪/双线/标记/锯齿/点/交叉/网格/角楼/帐篷）
// 符号绘制函数（25种预设的几何符号）
        function drawArrowsAlongPath(ctx, points, spacing, size, color) {
            if (!points || points.length < 2) return;
            ctx.fillStyle = color;
            let dist = 0;
            for (let i = 1; i < points.length; i++) {
                const dx = points[i].x - points[i-1].x;
                const dy = points[i].y - points[i-1].y;
                const segLen = Math.sqrt(dx*dx + dy*dy);
                if (segLen < 1) continue;
                const angle = Math.atan2(dy, dx);

                while (dist < segLen) {
                    const px = points[i-1].x + dx * dist / segLen;
                    const py = points[i-1].y + dy * dist / segLen;
                    ctx.beginPath();
                    ctx.moveTo(px + size * Math.cos(angle), py + size * Math.sin(angle));
                    ctx.lineTo(px + size * Math.cos(angle + 2.5), py + size * Math.sin(angle + 2.5));
                    ctx.lineTo(px + size * Math.cos(angle - 2.5), py + size * Math.sin(angle - 2.5));
                    ctx.closePath();
                    ctx.fill();
                    dist += spacing;
                }
                dist -= segLen;
            }
        }

        /**
         * 绘制单棵树符号（森林内部符号）
         */
        function drawTree(ctx, x, y, size, color) {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(x, y - size);
            ctx.lineTo(x - size * 0.6, y);
            ctx.lineTo(x + size * 0.6, y);
            ctx.closePath();
            ctx.fill();
            // 树干
            ctx.strokeStyle = '#5D4037';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x, y + size * 0.4);
            ctx.stroke();
        }

        /**
         * 绘制波浪线（湖泊内部符号）
         */
        function drawWaves(ctx, bbox, waveColor, count) {
            ctx.strokeStyle = waveColor;
            ctx.lineWidth = 1.5;
            const spacing = bbox.height / (count + 1);
            for (let i = 1; i <= count; i++) {
                const wy = bbox.y + spacing * i;
                ctx.beginPath();
                ctx.moveTo(bbox.x + bbox.width * 0.15, wy);
                ctx.quadraticCurveTo(bbox.x + bbox.width * 0.35, wy - 6,
                                     bbox.x + bbox.width * 0.5, wy);
                ctx.quadraticCurveTo(bbox.x + bbox.width * 0.65, wy + 6,
                                     bbox.x + bbox.width * 0.85, wy);
                ctx.stroke();
            }
        }

        /**
         * 绘制双线符号（城墙 - 折线专用）
         */
        /**
         * 绘制城墙符号（T形止标 - 折线专用）
         * 主线 + 沿线等距T形短标记（法线方向单侧突起）
         */
        function drawDoubleLine(ctx, points, lineWidth, color) {
            if (!points || points.length < 2) return;
            ctx.save();
            ctx.strokeStyle = color;
            ctx.fillStyle = color;
            ctx.lineWidth = Math.max(2, lineWidth);

            // 画主线
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i].x, points[i].y);
            }
            ctx.stroke();

            // 沿线等距画T形标记
            const markLen = 10;  // T形横杠长度
            const spacing = 30;       // 标记间距（世界坐标，不受zoom影响）
            let dist = 0;
            for (let i = 1; i < points.length; i++) {
                const dx = points[i].x - points[i-1].x;
                const dy = points[i].y - points[i-1].y;
                const segLen = Math.sqrt(dx*dx + dy*dy);
                if (segLen < 1) continue;
                const angle = Math.atan2(dy, dx);
                // 法线方向
                const nx = -Math.sin(angle);
                const ny = Math.cos(angle);

                while (dist < segLen) {
                    const px = points[i-1].x + dx * dist / segLen;
                    const py = points[i-1].y + dy * dist / segLen;
                    // T形：沿法线方向的竖线 + 顶端横杠
                    const tx = px + nx * markLen;
                    const ty = py + ny * markLen;
                    ctx.lineWidth = 1.5;
                    // 竖线
                    ctx.beginPath();
                    ctx.moveTo(px, py);
                    ctx.lineTo(tx, ty);
                    ctx.stroke();
                    // 横杠（沿切线方向）
                    ctx.beginPath();
                    ctx.moveTo(tx - Math.cos(angle) * markLen * 0.5, ty - Math.sin(angle) * markLen * 0.5);
                    ctx.lineTo(tx + Math.cos(angle) * markLen * 0.5, ty + Math.sin(angle) * markLen * 0.5);
                    ctx.stroke();

                    dist += spacing;
                }
                dist -= segLen;
            }
            ctx.restore();
        }

        /**
         * 绘制标记符号（道路 - 折线专用）
         */
        function drawMarksAlongPath(ctx, points, spacing, size, color) {
            if (!points || points.length < 2) return;
            ctx.fillStyle = color;
            let dist = 0;
            for (let i = 1; i < points.length; i++) {
                const dx = points[i].x - points[i-1].x;
                const dy = points[i].y - points[i-1].y;
                const segLen = Math.sqrt(dx*dx + dy*dy);
                if (segLen < 1) continue;
                while (dist < segLen) {
                    const px = points[i-1].x + dx * dist / segLen;
                    const py = points[i-1].y + dy * dist / segLen;
                    ctx.beginPath();
                    ctx.arc(px, py, size, 0, Math.PI * 2);
                    ctx.fill();
                    dist += spacing;
                }
                dist -= segLen;
            }
        }

        /**
         * 绘制锯齿符号（山脉 - 折线专用）
         */
        function drawZigzagAlongPath(ctx, points, size, color) {
            if (!points || points.length < 2) return;
            ctx.save();
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) {
                const mx = (points[i-1].x + points[i].x) / 2;
                const my = (points[i-1].y + points[i].y) / 2 - size;
                ctx.lineTo(mx, my);
                ctx.lineTo(points[i].x, points[i].y);
            }
            ctx.stroke();
            ctx.restore();
        }

        /**
         * 绘制点阵符号（沙漠 - 面状专用）
         */
        function drawDotsInArea(ctx, points, color) {
            const xs = points.map(p => p.x);
            const ys = points.map(p => p.y);
            const minX = Math.min(...xs), maxX = Math.max(...xs);
            const minY = Math.min(...ys), maxY = Math.max(...ys);
            const gap = 30;
            ctx.fillStyle = color;
            for (let tx = minX + gap/2; tx < maxX; tx += gap) {
                for (let ty = minY + gap/2; ty < maxY; ty += gap) {
                    if (pointInPolygon(tx, ty, points)) {
                        ctx.beginPath();
                        ctx.arc(tx, ty, 2, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }
        }

        /**
         * 绘制交叉线符号（沼泽 - 多边形专用）
         */
        function drawCrosshatchInPolygon(ctx, points, color) {
            const xs = points.map(p => p.x);
            const ys = points.map(p => p.y);
            const minX = Math.min(...xs), maxX = Math.max(...xs);
            const minY = Math.min(...ys), maxY = Math.max(...ys);
            const gap = 20;
            ctx.save();
            ctx.strokeStyle = color;
            ctx.lineWidth = 0.8;
            const size = 6;
            for (let tx = minX + gap/2; tx < maxX; tx += gap) {
                for (let ty = minY + gap/2; ty < maxY; ty += gap) {
                    if (pointInPolygon(tx, ty, points)) {
                        ctx.beginPath();
                        ctx.moveTo(tx - size, ty - size);
                        ctx.lineTo(tx + size, ty + size);
                        ctx.moveTo(tx + size, ty - size);
                        ctx.lineTo(tx - size, ty + size);
                        ctx.stroke();
                    }
                }
            }
            ctx.restore();
        }

        /**
         * 绘制交叉线符号（沼泽 - 矩形专用）
         */
        function drawCrosshatchInRect(ctx, x, y, w, h, color) {
            const gap = 20;
            ctx.save();
            ctx.strokeStyle = color;
            ctx.lineWidth = 0.8;
            const size = 6;
            for (let tx = x + gap/2; tx < x + w; tx += gap) {
                for (let ty = y + gap/2; ty < y + h; ty += gap) {
                    ctx.beginPath();
                    ctx.moveTo(tx - size, ty - size);
                    ctx.lineTo(tx + size, ty + size);
                    ctx.moveTo(tx + size, ty - size);
                    ctx.lineTo(tx - size, ty + size);
                    ctx.stroke();
                }
            }
            ctx.restore();
        }

        /**
         * 绘制交叉线符号（沼泽 - 椭圆专用）
         */
        function drawCrosshatchInEllipse(ctx, cx, cy, rx, ry, color) {
            const gap = 20;
            ctx.save();
            ctx.strokeStyle = color;
            ctx.lineWidth = 0.8;
            const size = 6;
            for (let tx = cx - rx + gap/2; tx < cx + rx; tx += gap) {
                for (let ty = cy - ry + gap/2; ty < cy + ry; ty += gap) {
                    const dx = (tx - cx) / rx;
                    const dy = (ty - cy) / ry;
                    if (dx*dx + dy*dy < 1) {
                        ctx.beginPath();
                        ctx.moveTo(tx - size, ty - size);
                        ctx.lineTo(tx + size, ty + size);
                        ctx.moveTo(tx + size, ty - size);
                        ctx.lineTo(tx - size, ty + size);
                        ctx.stroke();
                    }
                }
            }
            ctx.restore();
        }

        /**
         * 绘制网格符号（城市 - 多边形专用）
         */
        function drawGridInPolygon(ctx, points, color) {
            const xs = points.map(p => p.x);
            const ys = points.map(p => p.y);
            const minX = Math.min(...xs), maxX = Math.max(...xs);
            const minY = Math.min(...ys), maxY = Math.max(...ys);
            const gap = 40;
            ctx.save();
            ctx.strokeStyle = color;
            ctx.lineWidth = 0.5;
            for (let tx = minX; tx <= maxX; tx += gap) {
                if (pointInPolygon(tx, (minY + maxY)/2, points)) {
                    ctx.beginPath();
                    ctx.moveTo(tx, minY);
                    ctx.lineTo(tx, maxY);
                    ctx.stroke();
                }
            }
            for (let ty = minY; ty <= maxY; ty += gap) {
                if (pointInPolygon((minX + maxX)/2, ty, points)) {
                    ctx.beginPath();
                    ctx.moveTo(minX, ty);
                    ctx.lineTo(maxX, ty);
                    ctx.stroke();
                }
            }
            ctx.restore();
        }

        /**
         * 绘制网格符号（城市 - 矩形专用）
         */
        function drawGridInRect(ctx, x, y, w, h, color) {
            const gap = 40;
            ctx.save();
            ctx.strokeStyle = color;
            ctx.lineWidth = 0.5;
            for (let tx = x; tx <= x + w; tx += gap) {
                ctx.beginPath();
                ctx.moveTo(tx, y);
                ctx.lineTo(tx, y + h);
                ctx.stroke();
            }
            for (let ty = y; ty <= y + h; ty += gap) {
                ctx.beginPath();
                ctx.moveTo(x, ty);
                ctx.lineTo(x + w, ty);
                ctx.stroke();
            }
            ctx.restore();
        }

        /**
         * 绘制角楼符号（城堡 - 矩形四角小方块）
         */
        function drawTowersInRect(ctx, x, y, w, h, color) {
            const s = Math.max(8, Math.min(20, Math.min(w, h) / 8));
            ctx.save();
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.8;
            // 左上
            ctx.fillRect(x - s * 0.3, y - s * 0.3, s, s);
            // 右上
            ctx.fillRect(x + w - s * 0.7, y - s * 0.3, s, s);
            // 左下
            ctx.fillRect(x - s * 0.3, y + h - s * 0.7, s, s);
            // 右下
            ctx.fillRect(x + w - s * 0.7, y + h - s * 0.7, s, s);
            ctx.restore();
        }

        /**
         * 绘制角楼符号（城堡 - 多边形包围盒四角小方块）
         */
        function drawTowersInPolygon(ctx, points, color) {
            const xs = points.map(p => p.x), ys = points.map(p => p.y);
            const minX = Math.min(...xs), maxX = Math.max(...xs);
            const minY = Math.min(...ys), maxY = Math.max(...ys);
            drawTowersInRect(ctx, minX, minY, maxX - minX, maxY - minY, color);
        }

        /**
         * 绘制角楼符号（城堡 - 椭圆包围盒四角小方块）
         */
        function drawTowersInEllipse(ctx, cx, cy, rx, ry, color) {
            drawTowersInRect(ctx, cx - rx, cy - ry, rx * 2, ry * 2, color);
        }

        /**
         * 绘制网格符号（城市 - 椭圆专用）
         */
        function drawGridInEllipse(ctx, cx, cy, rx, ry, color) {
            const gap = 40;
            ctx.save();
            ctx.strokeStyle = color;
            ctx.lineWidth = 0.5;
            for (let tx = cx - rx; tx <= cx + rx; tx += gap) {
                const dx = (tx - cx) / rx;
                const disc = Math.max(0, 1 - dx*dx);
                const halfH = ry * Math.sqrt(disc);
                ctx.beginPath();
                ctx.moveTo(tx, cy - halfH);
                ctx.lineTo(tx, cy + halfH);
                ctx.stroke();
            }
            for (let ty = cy - ry; ty <= cy + ry; ty += gap) {
                const dy = (ty - cy) / ry;
                const disc = Math.max(0, 1 - dy*dy);
                const halfW = rx * Math.sqrt(disc);
                ctx.beginPath();
                ctx.moveTo(cx - halfW, ty);
                ctx.lineTo(cx + halfW, ty);
                ctx.stroke();
            }
            ctx.restore();
        }

        /**
         * 绘制帐篷符号（营地 - 多边形专用）
         */
        function drawTentsInPolygon(ctx, points, color) {
            const xs = points.map(p => p.x);
            const ys = points.map(p => p.y);
            const minX = Math.min(...xs), maxX = Math.max(...xs);
            const minY = Math.min(...ys), maxY = Math.max(...ys);
            const gap = 60;
            const tSize = 10;
            for (let tx = minX + gap/2; tx < maxX; tx += gap) {
                for (let ty = minY + gap/2; ty < maxY; ty += gap) {
                    if (pointInPolygon(tx, ty, points)) {
                        // 绘制帐篷形状（三角形+旗）
                        ctx.fillStyle = color;
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
        }

        // ==================== 新增符号绘制函数（V2方案 - 25种预设） ====================

        /**
         * 绘制草原符号（短竖线 ‖ 阵列 - 多边形专用）
         * 在多边形区域内均匀散布短竖线
         */
