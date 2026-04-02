// Pin 类型绘制（7种）
        function drawSpringPin(ctx, x, y, size, color) {
            ctx.save();
            ctx.fillStyle = color;
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            // 水滴：上半圆弧 + 下方尖角
            ctx.arc(x, y - size * 0.3, size * 0.5, Math.PI, 0, false);
            ctx.quadraticCurveTo(x + size * 0.5, y + size * 0.2, x, y + size * 0.7);
            ctx.quadraticCurveTo(x - size * 0.5, y + size * 0.2, x - size * 0.5, y - size * 0.3);
            ctx.closePath();
            ctx.fill();
            // 内部高光小圆
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.beginPath();
            ctx.arc(x - size * 0.15, y - size * 0.35, size * 0.12, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        /**
         * 绘制火山形（△三角 + 底部半圆弧）
         */
        function drawVolcanoPin(ctx, x, y, size, color) {
            ctx.save();
            ctx.fillStyle = color;
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.5;
            // 三角形
            ctx.beginPath();
            ctx.moveTo(x, y - size);
            ctx.lineTo(x - size * 0.8, y + size * 0.3);
            ctx.lineTo(x + size * 0.8, y + size * 0.3);
            ctx.closePath();
            ctx.fill();
            // 底部半圆弧（火山口效果）
            ctx.beginPath();
            ctx.arc(x, y + size * 0.3, size * 0.4, 0, Math.PI, false);
            ctx.stroke();
            // 顶部烟雾小点
            ctx.fillStyle = '#999';
            ctx.beginPath();
            ctx.arc(x, y - size * 1.2, size * 0.15, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        /**
         * 绘制雪山形（△白色填充 + 蓝色描边 + 顶部短线）
         */
        function drawSnowPeakPin(ctx, x, y, size) {
            ctx.save();
            // 白色填充三角
            ctx.fillStyle = '#fff';
            ctx.strokeStyle = '#3498db';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x, y - size);
            ctx.lineTo(x - size * 0.8, y + size * 0.5);
            ctx.lineTo(x + size * 0.8, y + size * 0.5);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            // 顶部雪线
            ctx.strokeStyle = '#3498db';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x - size * 0.3, y - size * 0.6);
            ctx.lineTo(x + size * 0.3, y - size * 0.6);
            ctx.stroke();
            // 底部阴影
            ctx.strokeStyle = 'rgba(52,152,219,0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x - size * 0.5, y + size * 0.2);
            ctx.lineTo(x + size * 0.5, y + size * 0.2);
            ctx.stroke();
            ctx.restore();
        }

        /**
         * 绘制洞穴拱门形（半圆弧 + 底部横线 ⊔）
         */
        function drawCavePin(ctx, x, y, size, color) {
            ctx.save();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            // 半圆弧
            ctx.beginPath();
            ctx.arc(x, y, size * 0.6, Math.PI, 0, false);
            ctx.fill();
            ctx.stroke();
            // 底部横线
            ctx.beginPath();
            ctx.moveTo(x - size * 0.6, y);
            ctx.lineTo(x + size * 0.6, y);
            ctx.stroke();
            // 两侧竖线
            ctx.beginPath();
            ctx.moveTo(x - size * 0.6, y);
            ctx.lineTo(x - size * 0.6, y + size * 0.5);
            ctx.moveTo(x + size * 0.6, y);
            ctx.lineTo(x + size * 0.6, y + size * 0.5);
            ctx.stroke();
            ctx.restore();
        }

        /**
         * 绘制人字屋顶小屋（村庄 pin）
         * ▽ + 下方矩形
         */
        function drawVillagePin(ctx, x, y, size, color) {
            ctx.save();
            ctx.fillStyle = color;
            // 屋顶三角
            ctx.beginPath();
            ctx.moveTo(x, y - size * 0.7);
            ctx.lineTo(x - size * 0.7, y);
            ctx.lineTo(x + size * 0.7, y);
            ctx.closePath();
            ctx.fill();
            // 墙体矩形
            ctx.fillRect(x - size * 0.45, y, size * 0.9, size * 0.5);
            // 门
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.fillRect(x - size * 0.1, y + size * 0.15, size * 0.2, size * 0.35);
            ctx.restore();
        }

        /**
         * 绘制宝塔形（庙宇 pin）
         * 多层三角+横线堆叠
         */
        function drawTemplePin(ctx, x, y, size, color) {
            ctx.save();
            ctx.fillStyle = color;
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            const layers = 3;
            for (let i = 0; i < layers; i++) {
                const layerY = y - size * 0.8 + i * size * 0.5;
                const layerW = size * (0.3 + i * 0.25);
                const layerH = size * 0.35;
                // 每层小三角屋顶
                ctx.beginPath();
                ctx.moveTo(x, layerY - layerH);
                ctx.lineTo(x - layerW, layerY);
                ctx.lineTo(x + layerW, layerY);
                ctx.closePath();
                ctx.fill();
                // 屋檐横线
                ctx.beginPath();
                ctx.moveTo(x - layerW * 1.2, layerY);
                ctx.lineTo(x + layerW * 1.2, layerY);
                ctx.stroke();
            }
            // 底座
            ctx.fillRect(x - size * 0.3, y + size * 0.2, size * 0.6, size * 0.3);
            ctx.restore();
        }

        /**
         * 绘制断柱形（废墟 pin）
         * 高低不齐的矩形柱子
         */
        function drawRuinPin(ctx, x, y, size, color) {
            ctx.save();
            ctx.fillStyle = color;
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            // 左柱（高）
            ctx.fillRect(x - size * 0.4, y - size * 0.6, size * 0.25, size * 1.1);
            // 中柱（矮，断）
            ctx.fillRect(x - size * 0.05, y - size * 0.2, size * 0.25, size * 0.7);
            // 右柱（中等）
            ctx.fillRect(x + size * 0.3, y - size * 0.4, size * 0.25, size * 0.9);
            // 断裂线
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x - size * 0.05, y - size * 0.2);
            ctx.lineTo(x + size * 0.2, y - size * 0.35);
            ctx.stroke();
            ctx.restore();
        }

        /**
         * 选择标识类型后自动填充样式，不切换参数区
         */
