let db;

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('ClimateControlDB', 2);
        
        request.onerror = (event) => {
            console.error("Error al abrir la base de datos:", event.target.error);
            reject("Error al abrir la base de datos");
        };
        
        request.onsuccess = (event) => {
            db = event.target.result;
            console.log("Base de datos inicializada correctamente");
            resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            if (!db.objectStoreNames.contains('climateData')) {
                const store = db.createObjectStore('climateData', { keyPath: 'timestamp' });
                store.createIndex('by_timestamp', 'timestamp', { unique: true });
                store.createIndex('by_type', 'type');
                console.log("Store climateData creado");
            }
            
            if (!db.objectStoreNames.contains('config')) {
                db.createObjectStore('config', { keyPath: 'key' });
                console.log("Store config creado");
            }
        };
    });
}

function saveClimateData(data) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['climateData'], 'readwrite');
        const store = transaction.objectStore('climateData');
        
        const record = {
            timestamp: new Date().getTime(),
            type: data.type,
            value: data.value
        };
        
        const request = store.add(record);
        
        request.onsuccess = () => {
            console.log("Datos climáticos guardados:", record);
            resolve();
        };
        
        request.onerror = (event) => {
            console.error("Error al guardar datos:", event.target.error);
            reject("Error al guardar datos");
        };
    });
}

async function getClimateStats(type, hours) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['climateData'], 'readonly');
        const store = transaction.objectStore('climateData');
        const index = store.index('by_type');
        
        const range = IDBKeyRange.only(type);
        const request = index.getAll(range);
        
        request.onsuccess = (event) => {
            const now = new Date().getTime();
            const cutoff = now - (hours * 60 * 60 * 1000);
            
            const data = event.target.result
                .filter(record => record.timestamp >= cutoff)
                .sort((a, b) => a.timestamp - b.timestamp);
            
            if (data.length === 0) {
                resolve({ 
                    min: null, 
                    max: null, 
                    avg: null, 
                    values: [], 
                    timestamps: [] 
                });
                return;
            }
            
            const values = data.map(item => item.value);
            const timestamps = data.map(item => item.timestamp);
            const min = Math.min(...values);
            const max = Math.max(...values);
            const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
            
            console.log(`Estadísticas obtenidas para ${type} (últimas ${hours} horas):`, 
                { min, max, avg, count: values.length });
            
            resolve({ 
                min, 
                max, 
                avg: parseFloat(avg.toFixed(2)), 
                values, 
                timestamps 
            });
        };
        
        request.onerror = (event) => {
            console.error("Error al leer datos:", event.target.error);
            reject("Error al leer datos");
        };
    });
}

export { 
    initDB, 
    saveClimateData, 
    getClimateStats
};