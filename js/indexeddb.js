// IndexedDB 存储

        // ==================== IndexedDB（存储目录句柄） ====================
        const FS_DB = 'novelMapFS';
        const FS_STORE = 'handles';
        function openFSDB() {
            return new Promise((resolve, reject) => {
                const req = indexedDB.open(FS_DB, 1);
                req.onupgradeneeded = e => {
                    e.target.result.createObjectStore(FS_STORE);
                };
                req.onsuccess = e => resolve(e.target.result);
                req.onerror = e => reject(e.target.error);
            });
        }
        async function saveDirHandle(handle) {
            const db = await openFSDB();
            const tx = db.transaction(FS_STORE, 'readwrite');
            tx.objectStore(FS_STORE).put(handle, 'workDir');
            return new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
        }
        async function loadDirHandle() {
            const db = await openFSDB();
            const tx = db.transaction(FS_STORE, 'readonly');
            const req = tx.objectStore(FS_STORE).get('workDir');
            return new Promise((res) => {
                req.onsuccess = () => res(req.result || null);
                req.onerror = () => res(null);
            });
        }
        async function clearDirHandle() {
            const db = await openFSDB();
            const tx = db.transaction(FS_STORE, 'readwrite');
            tx.objectStore(FS_STORE).delete('workDir');
        }

