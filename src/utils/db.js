import { openDB } from 'idb';

const DB_NAME = 'SewaSahayakDB';
const DB_VERSION = 3; // Bumped to fix VersionError (browser had stale v2)
const STORE_NAME = 'media_captures';

export const initDB = async () => {
    return openDB(DB_NAME, DB_VERSION, {
        upgrade(db, oldVersion) {
            // Safe migration: create the store if it doesn't exist at any version
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                store.createIndex('timestamp', 'timestamp');
                store.createIndex('synced', 'synced');
            }
        },
        blocked() {
            // Another tab is open on an old version — tell user to refresh
            console.warn('DB upgrade blocked. Please close other tabs of this app and refresh.');
        },
        blocking() {
            // This tab is blocking a newer version — close and let the new one win
            console.warn('DB is blocking a newer version. Closing connection.');
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
