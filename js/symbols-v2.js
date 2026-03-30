// V2 符号绘制（新增面状+折线：草原/竹林/海洋波浪/帐篷椭圆/悬崖/行军/桥梁/王国/皇冠）
        function drawGrasslandInPolygon(ctx, points, color) {
            const xs = points.map(p => p.x);
            const ys = points.map(p => p.y);
            const minX = Math.min(...xs), maxX = Math.max(...xs);
            const minY = Math.min(...ys), maxY = Math.max(...ys);
            const gap = 25;
            const barH = 8;
            ctx.save();
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.2;
            for (let tx = minX + gap/2; tx < maxX; tx += gap) {
                for (let ty = minY + gap/2; ty < maxY; ty += gap) {
                    if (pointInPolygon(tx, ty, points)) {
                        ctx.beginPath();
                        ctx.moveTo(tx - 2, ty - barH / 2);
                        ctx.lineTo(tx - 2, ty + barH / 2);
                        ctx.moveTo(tx + 2, ty - barH / 2);
                        ctx.lineTo(tx + 2, ty + barH / 2);
                        ctx.stroke();
                    }
                }
            }
            ctx.restore();
        }

        /**
         * 绘制草原符号（短竖线 ‖ 阵列 - 矩形专用）
         */
        function drawGrasslandInRect(ctx, x, y, w, h, color) {
            const gap = 25;
            const barH = 8;
            ctx.save();
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.2;
            for (let tx = x + gap/2; tx < x + w; tx += gap) {
                for (let ty = y + gap/2; ty < y + h; ty += gap) {
                    ctx.beginPath();
                    ctx.moveTo(tx - 2, ty - barH / 2);
                    ctx.lineTo(tx - 2, ty + barH / 2);
                    ctx.moveTo(tx + 2, ty - barH / 2);
                    ctx.lineTo(tx + 2, ty + barH / 2);
                    ctx.stroke();
                }
            }
            ctx.restore();
        }

        /**
         * 绘制草原符号（短竖线 ‖ 阵列 - 椭圆专用）
         */
        function drawGrasslandInEllipse(ctx, cx, cy, rx, ry, color) {
            const gap = 25;
            const barH = 8;
            ctx.save();
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.2;
            for (let tx = cx - rx + gap/2; tx < cx + rx; tx += gap) {
                for (let ty = cy - ry + gap/2; ty < cy + ry; ty += gap) {
                    const dx = (tx - cx) / rx;
                    const dy = (ty - cy) / ry;
                    if (dx*dx + dy*dy < 1) {
                        ctx.beginPath();
                        ctx.moveTo(tx - 2, ty - barH / 2);
                        ctx.lineTo(tx - 2, ty + barH / 2);
                        ctx.moveTo(tx + 2, ty - barH / 2);
                        ctx.lineTo(tx + 2, ty + barH / 2);
                        ctx.stroke();
                    }
                }
            }
            ctx.restore();
        }

        /**
         * 绘制竹林符号（竖线+横节 ‖ - 多边形专用）
         * 竖线中间加短横线表示竹节
         */
        function drawBambooInPolygon(ctx, points, color) {
            const xs = points.map(p => p.x);
            const ys = points.map(p => p.y);
            const minX = Math.min(...xs), maxX = Math.max(...xs);
            const minY = Math.min(...ys), maxY = Math.max(...ys);
            const gap = 30;
            const barH = 14;
            ctx.save();
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.5;
            for (let tx = minX + gap/2; tx < maxX; tx += gap) {
                for (let ty = minY + gap/2; ty < maxY; ty += gap) {
                    if (pointInPolygon(tx, ty, points)) {
                        // 竖线
                        ctx.beginPath();
                        ctx.moveTo(tx, ty - barH / 2);
                        ctx.lineTo(tx, ty + barH / 2);
                        ctx.stroke();
                        // 竹节横线
                        ctx.beginPath();
                        ctx.moveTo(tx - 3, ty);
                        ctx.lineTo(tx + 3, ty);
                        ctx.stroke();
                    }
                }
            }
            ctx.restore();
        }

        /**
         * 绘制竹林符号（竖线+横节 ‖ - 矩形专用）
         */
        function drawBambooInRect(ctx, x, y, w, h, color) {
            const gap = 30;
            const barH = 14;
            ctx.save();
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.5;
            for (let tx = x + gap/2; tx < x + w; tx += gap) {
                for (let ty = y + gap/2; ty < y + h; ty += gap) {
                    // 竖线
                    ctx.beginPath();
                    ctx.moveTo(tx, ty - barH / 2);
                    ctx.lineTo(tx, ty + barH / 2);
                    ctx.stroke();
                    // 竹节横线
                    ctx.beginPath();
                    ctx.moveTo(tx - 3, ty);
                    ctx.lineTo(tx + 3, ty);
                    ctx.stroke();
                }
            }
            ctx.restore();
        }

        /**
         * 绘制竹林符号（竖线+横节 ‖ - 椭圆专用）
         */
        function drawBambooInEllipse(ctx, cx, cy, rx, ry, color) {
            const gap = 30;
            const barH = 14;
            ctx.save();
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.5;
            for (let tx = cx - rx + gap/2; tx < cx + rx; tx += gap) {
                for (let ty = cy - ry + gap/2; ty < cy + ry; ty += gap) {
                    const dx = (tx - cx) / rx;
                    const dy = (ty - cy) / ry;
                    if (dx*dx + dy*dy < 1) {
                        ctx.beginPath();
                        ctx.moveTo(tx, ty - barH / 2);
                        ctx.lineTo(tx, ty + barH / 2);
                        ctx.stroke();
                        ctx.beginPath();
                        ctx.moveTo(tx - 3, ty);
                        ctx.lineTo(tx + 3, ty);
                        ctx.stroke();
                    }
                }
            }
            ctx.restore();
        }

        /**
         * 绘制海洋斜波浪（45°斜向bezier - 多边形专用）
         */
        function drawOceanWavesInPolygon(ctx, points, color) {
            const xs = points.map(p => p.x);
            const ys = points.map(p => p.y);
            const minX = Math.min(...xs), maxX = Math.max(...xs);
            const minY = Math.min(...ys), maxY = Math.max(...ys);
            ctx.save();
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.2;
            const gap = 30;
            // 45°斜向波浪线
            for (let offset = -maxX; offset < maxX + maxY; offset += gap) {
                ctx.beginPath();
                let started = false;
                for (let t = 0; t <= 1; t += 0.02) {
                    const bx = minX + t * (maxX - minX);
                    const by = minY + offset + t * (maxY - minY) * 0 - (offset) + t * offset;
                    // Simplified: draw diagonal lines within bounds
                    const lx = minX + (offset + t * (maxX - minX));
                    const ly = minY + t * (maxY - minY);
                    if (lx >= minX && lx <= maxX && ly >= minY && ly <= maxY) {
                        if (pointInPolygon(lx, ly, points)) {
                            if (!started) { ctx.moveTo(lx, ly); started = true; }
                            else ctx.lineTo(lx, ly);
                        }
                    }
                }
                if (started) ctx.stroke();
            }
            ctx.restore();
        }

        /**
         * 绘制海洋斜波浪（矩形专用）
         */
        function drawOceanWavesInRect(ctx, x, y, w, h, color) {
            ctx.save();
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.2;
            const gap = 30;
            // 45°斜线段阵列
            for (let tx = x; tx < x + w; tx += gap) {
                for (let ty = y; ty < y + h; ty += gap) {
                    ctx.beginPath();
                    ctx.moveTo(tx, ty + 8);
                    ctx.quadraticCurveTo(tx + 7, ty, tx + 14, ty + 8);
                    ctx.stroke();
                }
            }
            ctx.restore();
        }

        /**
         * 绘制海洋斜波浪（椭圆专用）
         */
        function drawOceanWavesInEllipse(ctx, cx, cy, rx, ry, color) {
            ctx.save();
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.2;
            const gap = 30;
            for (let tx = cx - rx; tx < cx + rx; tx += gap) {
                for (let ty = cy - ry; ty < cy + ry; ty += gap) {
                    const dx = (tx - cx) / rx;
                    const dy = (ty - cy) / ry;
                    if (dx*dx + dy*dy < 1) {
                        ctx.beginPath();
                        ctx.moveTo(tx, ty + 8);
                        ctx.quadraticCurveTo(tx + 7, ty, tx + 14, ty + 8);
                        ctx.stroke();
                    }
                }
            }
            ctx.restore();
        }

        /**
         * 绘制帐篷符号（营地 - 椭圆专用）
         */
        function drawTentsInEllipse(ctx, cx, cy, rx, ry, color) {
            const gap = 60;
            const tSize = 10;
            const minX = cx - rx, maxX = cx + rx;
            const minY = cy - ry, maxY = cy + ry;
            for (let tx = minX + gap/2; tx < maxX; tx += gap) {
                for (let ty = minY + gap/2; ty < maxY; ty += gap) {
                    const dx = (tx - cx) / rx;
                    const dy = (ty - cy) / ry;
                    if (dx*dx + dy*dy < 1) {
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

        /**
         * 绘制悬崖T形止标（┤ - 折线专用）
         * 沿折线方向等距画T形短标记
         */
        function drawCliffAlongPath(ctx, points, size, color) {
            if (!points || points.length < 2) return;
            ctx.save();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            let dist = 0;
            const spacing = 40;
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
                    // T形标记：垂直短线
                    ctx.beginPath();
                    ctx.moveTo(px + nx * size, py + ny * size);
                    ctx.lineTo(px - nx * size, py - ny * size);
                    ctx.stroke();
                    // 朝一侧的短横线（┤形）
                    ctx.beginPath();
                    ctx.moveTo(px + nx * size, py + ny * size);
                    ctx.lineTo(px + nx * size + dx / segLen * size * 0.8,
                               py + ny * size + dy / segLen * size * 0.8);
                    ctx.stroke();
                    dist += spacing;
                }
                dist -= segLen;
            }
            ctx.restore();
        }

        /**
         * 绘制行军路线（末端箭头+等距菱形 ◇ - 折线专用）
         * 虚线 + 沿线菱形标记
         */
        function drawRouteAlongPath(ctx, points, spacing, size, color) {
            if (!points || points.length < 2) return;
            ctx.save();
            ctx.fillStyle = color;
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
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
                    // 菱形 ◇
                    ctx.beginPath();
                    ctx.moveTo(px, py - size);
                    ctx.lineTo(px + size * 0.6, py);
                    ctx.lineTo(px, py + size);
                    ctx.lineTo(px - size * 0.6, py);
                    ctx.closePath();
                    ctx.stroke();
                    dist += spacing;
                }
                dist -= segLen;
            }
            // 末端箭头
            const last = points[points.length - 1];
            const prev = points[points.length - 2];
            const a = Math.atan2(last.y - prev.y, last.x - prev.x);
            const as = size * 2;
            ctx.beginPath();
            ctx.moveTo(last.x + as * Math.cos(a), last.y + as * Math.sin(a));
            ctx.lineTo(last.x + as * Math.cos(a + 2.5), last.y + as * Math.sin(a + 2.5));
            ctx.lineTo(last.x + as * Math.cos(a - 2.5), last.y + as * Math.sin(a - 2.5));
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

        /**
         * 绘制桥梁拱弧（折线专用）
         * 在线段中间画上凸弧线
         */
        function drawBridgeAlongPath(ctx, points, color) {
            if (!points || points.length < 2) return;
            ctx.save();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2.5;
            for (let i = 0; i < points.length - 1; i++) {
                const mx = (points[i].x + points[i+1].x) / 2;
                const my = (points[i].y + points[i+1].y) / 2;
                const dx = points[i+1].x - points[i].x;
                const dy = points[i+1].y - points[i].y;
                const segLen = Math.sqrt(dx*dx + dy*dy);
                const archH = Math.min(segLen * 0.3, 20);
                // 法线方向（向上凸）
                const nx = -dy / segLen;
                const ny = dx / segLen;
                ctx.beginPath();
                ctx.moveTo(points[i].x, points[i].y);
                ctx.quadraticCurveTo(mx + nx * archH, my + ny * archH,
                                     points[i+1].x, points[i+1].y);
                ctx.stroke();
            }
            ctx.restore();
        }

        /**
         * 绘制王国皇冠符号（沿多边形边线等距标注 ♛）
         * 三角+底座+两侧小三角
         */
        function drawKingdomInPolygon(ctx, points, color) {
            if (!points || points.length < 3) return;
            ctx.save();
            ctx.fillStyle = color;
            const crownSize = 10;
            const spacing = 80;
            // 沿每条边等距画皇冠
            for (let i = 0; i < points.length; i++) {
                const j = (i + 1) % points.length;
                const dx = points[j].x - points[i].x;
                const dy = points[j].y - points[i].y;
                const segLen = Math.sqrt(dx*dx + dy*dy);
                if (segLen < 1) continue;
                const angle = Math.atan2(dy, dx);
                const nx = -Math.sin(angle);
                const ny = Math.cos(angle);
                let dist = spacing / 2;
                while (dist < segLen) {
                    const px = points[i].x + dx * dist / segLen;
                    const py = points[i].y + dy * dist / segLen;
                    // 朝外侧画皇冠
                    drawCrownSymbol(ctx, px + nx * 5, py + ny * 5, crownSize, angle, nx, ny, color);
                    dist += spacing;
                }
            }
            ctx.restore();
        }

        /**
         * 绘制皇冠符号（矩形边线专用）
         */
        function drawKingdomInRect(ctx, x, y, w, h, color) {
            ctx.save();
            ctx.fillStyle = color;
            const crownSize = 10;
            const spacing = 80;
            // 上边
            for (let tx = x + spacing/2; tx < x + w; tx += spacing) {
                drawCrownSymbol(ctx, tx, y - 3, crownSize, 0, 0, -1, color);
            }
            // 下边
            for (let tx = x + spacing/2; tx < x + w; tx += spacing) {
                drawCrownSymbol(ctx, tx, y + h + 3, crownSize, 0, 0, 1, color);
            }
            // 左边
            for (let ty = y + spacing/2; ty < y + h; ty += spacing) {
                drawCrownSymbol(ctx, x - 3, ty, crownSize, -Math.PI/2, -1, 0, color);
            }
            // 右边
            for (let ty = y + spacing/2; ty < y + h; ty += spacing) {
                drawCrownSymbol(ctx, x + w + 3, ty, crownSize, Math.PI/2, 1, 0, color);
            }
            ctx.restore();
        }

        /**
         * 绘制皇冠符号（椭圆边线专用）
         */
        function drawKingdomInEllipse(ctx, cx, cy, rx, ry, color) {
            ctx.save();
            ctx.fillStyle = color;
            const crownSize = 10;
            const perimeter = Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)));
            const count = Math.max(4, Math.floor(perimeter / 80));
            for (let i = 0; i < count; i++) {
                const angle = (Math.PI * 2 * i) / count;
                const px = cx + rx * Math.cos(angle);
                const py = cy + ry * Math.sin(angle);
                const nx = Math.cos(angle);
                const ny = Math.sin(angle);
                drawCrownSymbol(ctx, px, py, crownSize, angle, nx, ny, color);
            }
            ctx.restore();
        }

        /**
         * 绘制单个皇冠图形
         */
        function drawCrownSymbol(ctx, x, y, size, angle, nx, ny, color) {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle);
            ctx.fillStyle = color;
            ctx.beginPath();
            // 底座矩形
            ctx.moveTo(-size * 0.6, size * 0.3);
            ctx.lineTo(-size * 0.6, 0);
            // 左三角
            ctx.lineTo(-size * 0.3, -size * 0.2);
            // 中间大三角
            ctx.lineTo(0, -size * 0.6);
            // 右三角
            ctx.lineTo(size * 0.3, -size * 0.2);
            // 右上
            ctx.lineTo(size * 0.6, 0);
            ctx.lineTo(size * 0.6, size * 0.3);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

        // ==================== Pin 类型绘制函数 ====================

        /**
         * 绘制水滴形（泉眼/瀑布 pin）
         * 弧线+下方尖角组成水滴轮廓
         */
