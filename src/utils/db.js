import { openDB } from 'idb';

const DB_NAME = 'SewaSahayakDB';
const DB_VERSION = 6;
const STORE_NAME = 'media_captures';
const REPORTS_STORE = 'reports';

export const initDB = async () => {
    return openDB(DB_NAME, DB_VERSION, {
        upgrade(db, oldVersion) {
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                store.createIndex('timestamp', 'timestamp');
                store.createIndex('synced', 'synced');
            }
            if (!db.objectStoreNames.contains(REPORTS_STORE)) {
                const store = db.createObjectStore(REPORTS_STORE, { keyPath: 'id' });
                store.createIndex('timestamp', 'timestamp');
            }
        },
    });
};

export const saveMediaLocally = async (mediaBlob, type, metadata = {}) => {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const record = {
        blob: mediaBlob,
        type,
        timestamp: Date.now(),
        synced: false,
        ...metadata
    };

    const id = await store.add(record);
    await tx.done;
    return id;
};

export const getUnsyncedMedia = async () => {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const allRecords = await store.getAll();
    return allRecords.filter(record => !record.synced);
};

export const markMediaAsSynced = async (id) => {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const record = await store.get(id);
    if (record) {
        record.synced = true;
        await store.put(record);
    }
    await tx.done;
};

// --- Dashcam Segments ---

export const saveDashcamSegment = async (blob, metadata = {}) => {
    const db = await initDB();
    const tx = db.transaction(DASHCAM_STORE, 'readwrite');
    const store = tx.objectStore(DASHCAM_STORE);

    const record = {
        blob,
        timestamp: Date.now(),
        synced: false,
        ...metadata
    };

    const id = await store.add(record);
    await tx.done;
    return id;
};

export const getUnsyncedDashcamSegments = async () => {
    const db = await initDB();
    const tx = db.transaction(DASHCAM_STORE, 'readonly');
    const store = tx.objectStore(DASHCAM_STORE);
    const allRecords = await store.getAll();
    return allRecords.filter(record => !record.synced);
};

export const markDashcamSegmentAsSynced = async (id) => {
    const db = await initDB();
    const tx = db.transaction(DASHCAM_STORE, 'readwrite');
    const store = tx.objectStore(DASHCAM_STORE);
    const record = await store.get(id);
    if (record) {
        record.synced = true;
        await store.put(record);
    }
    await tx.done;
};
