// 全局状态 + DOM 元素

        // ==================== 全局状态管理 ====================
        const state = {
            scale: 1, // 缩放比例（0.1~2）
            offsetX: 0, // 地图X轴偏移量
            offsetY: 0, // 地图Y轴偏移量
            mapSize: 2000, // 地图原始尺寸（2000×2000）
            notes: [], // 坐标点列表：[{id, name, x, y, content}]
            rangeMarkers: [], // 范围标识列表：[{id, name, type, params}]
            geoMarkers: [], // 地理标识列表：[{id, type, name, points/center+radius, style, arrowEnd}]
            mapRelations: [], // 地图关联列表：[{id, currentMapName, currentXY, targetMapName, targetXY}]
            unit: { name: '里', desc: '1里=500米' }, // 量化单位
            currentNoteId: null, // 当前激活的坐标点ID
            savedMaps: {}, // 保存的地图数据（键：地图名称，值：完整地图数据）
            workDirHandle: null, // File System Access API 目录句柄
            // 拖拽状态
            isDragging: false,
            dragStartX: 0,
            dragStartY: 0,
            lastOffsetX: 0,
            lastOffsetY: 0,
            dragMoved: false, // 是否发生了拖拽移动
            // 备注编辑状态
            isEditingNote: false,
            originalNoteContent: '',
            // 版本管理
            versions: null,           // 当前加载的版本文件 {mapId, currentVersion, versions:[]}
            viewingVersion: null,     // 正在查看的版本号（null = 最新）
            _latestState: null        // 进入版本查看时保存的最新状态快照
        };

        // ==================== DOM元素获取 ====================
        const canvas = document.getElementById('mapCanvas');
        const ctx = canvas.getContext('2d');
        const noteBox = document.getElementById('noteBox');
        const noteNameDisplay = document.getElementById('noteNameDisplay');
        const noteContentDisplay = document.getElementById('noteContentDisplay');
        const noteContentEdit = document.getElementById('noteContentEdit');
        const noteContentTextarea = document.getElementById('noteContentTextarea');
        const noteCloseBtn = document.getElementById('noteCloseBtn');
        const editNoteBtn = document.getElementById('editNoteBtn');
        const saveNoteBtn = document.getElementById('saveNoteBtn');
        const cancelNoteBtn = document.getElementById('cancelNoteBtn');
        const deleteNoteBtn = document.getElementById('deleteNoteBtn');
        const unitDescDisplay = document.getElementById('unitDescDisplay');
        const savedMapsList = document.getElementById('savedMapsList');
        // 手动添加坐标点元素
        const manualNoteName = document.getElementById('manualNoteName');
        const manualNoteX = document.getElementById('manualNoteX');
        const manualNoteY = document.getElementById('manualNoteY');
        const manualNoteContent = document.getElementById('manualNoteContent');
        const addManualNoteBtn = document.getElementById('addManualNoteBtn');
        // 地理标识元素
        const geoName = document.getElementById('geoName');
        const geoPoints = document.getElementById('geoPoints');
        const geoStrokeColor = document.getElementById('geoStrokeColor');
        const geoStrokeColorText = document.getElementById('geoStrokeColorText');
        const geoFillColor = document.getElementById('geoFillColor');
        const geoFillColorText = document.getElementById('geoFillColorText');
        const geoFillGroup = document.getElementById('geoFillGroup');
        const geoLineWidth = document.getElementById('geoLineWidth');
        const geoBold = document.getElementById('geoBold');
        const addGeoBtn = document.getElementById('addGeoBtn');
        const geoListEl = document.getElementById('geoList');
        // 工作目录
        const selectDirBtn = document.getElementById('selectDirBtn');
        const dirStatus = document.getElementById('dirStatus');
        const dirFileListContainer = document.getElementById('dirFileListContainer');
        const dirFileListEl = document.getElementById('dirFileList');
