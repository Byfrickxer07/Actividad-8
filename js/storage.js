/**
 * Módulo para manejar el almacenamiento local usando IndexedDB y localStorage
 */

const Storage = (() => {
    // Configuración de la base de datos
    const DB_NAME = 'CertificatesDB';
    const DB_VERSION = 1;
    const CERTIFICATES_STORE = 'certificates';
    
    let db = null;
    
    /**
     * Inicializa la base de datos IndexedDB
     * @returns {Promise} - Promesa que se resuelve cuando la base de datos está lista
     */
    const initDB = () => {
        return new Promise((resolve, reject) => {
            if (db) {
                resolve(db);
                return;
            }
            
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            
            request.onerror = (event) => {
                console.error('Error al abrir la base de datos:', event.target.error);
                reject(event.target.error);
            };
            
            request.onupgradeneeded = (event) => {
                const database = event.target.result;
                
                // Crear el almacén de certificados si no existe
                if (!database.objectStoreNames.contains(CERTIFICATES_STORE)) {
                    const store = database.createObjectStore(CERTIFICATES_STORE, { keyPath: 'id' });
                    store.createIndex('participantName', 'participantName', { unique: false });
                    store.createIndex('eventName', 'eventName', { unique: false });
                    store.createIndex('date', 'date', { unique: false });
                }
            };
            
            request.onsuccess = (event) => {
                db = event.target.result;
                resolve(db);
            };
        });
    };
    
    /**
     * Genera un ID único para cada certificado
     * @returns {string} - ID generado con formato CERT-YYYYMMDD-XXXXX
     */
    const generateCertificateId = () => {
        const today = new Date();
        const datePart = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
        
        // Obtener el contador actual de localStorage o iniciar en 1
        const counter = parseInt(localStorage.getItem('certificateCounter') || '0') + 1;
        localStorage.setItem('certificateCounter', counter.toString());
        
        // Formato: CERT-YYYYMMDD-XXXXX (donde XXXXX es un número secuencial)
        return `CERT-${datePart}-${String(counter).padStart(5, '0')}`;
    };
    
    /**
     * Guarda un certificado en IndexedDB
     * @param {Object} certificateData - Datos del certificado a guardar
     * @param {string} pdfDataUrl - URL de datos del PDF generado
     * @returns {Promise} - Promesa que se resuelve cuando el certificado es guardado
     */
    const saveCertificate = async (certificateData, pdfDataUrl) => {
        try {
            await initDB();
            
            const id = certificateData.id || generateCertificateId();
            const certificate = {
                id,
                ...certificateData,
                pdfDataUrl,
                createdAt: new Date().toISOString()
            };
            
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([CERTIFICATES_STORE], 'readwrite');
                const store = transaction.objectStore(CERTIFICATES_STORE);
                
                const request = store.put(certificate);
                
                request.onsuccess = () => {
                    resolve(certificate);
                };
                
                request.onerror = (event) => {
                    console.error('Error al guardar el certificado:', event.target.error);
                    reject(event.target.error);
                };
            });
        } catch (error) {
            console.error('Error en saveCertificate:', error);
            throw error;
        }
    };
    
    /**
     * Obtiene todos los certificados guardados
     * @returns {Promise<Array>} - Promesa que se resuelve con un array de certificados
     */
    const getAllCertificates = async () => {
        try {
            await initDB();
            
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([CERTIFICATES_STORE], 'readonly');
                const store = transaction.objectStore(CERTIFICATES_STORE);
                const request = store.getAll();
                
                request.onsuccess = () => {
                    resolve(request.result);
                };
                
                request.onerror = (event) => {
                    console.error('Error al obtener certificados:', event.target.error);
                    reject(event.target.error);
                };
            });
        } catch (error) {
            console.error('Error en getAllCertificates:', error);
            throw error;
        }
    };
    
    /**
     * Busca certificados por un término de búsqueda
     * @param {string} searchTerm - Término de búsqueda
     * @returns {Promise<Array>} - Promesa que se resuelve con los certificados filtrados
     */
    const searchCertificates = async (searchTerm) => {
        try {
            const certificates = await getAllCertificates();
            
            if (!searchTerm || searchTerm.trim() === '') {
                return certificates;
            }
            
            const term = searchTerm.toLowerCase().trim();
            
            return certificates.filter(cert => 
                cert.id.toLowerCase().includes(term) ||
                cert.participantName.toLowerCase().includes(term) ||
                cert.eventName.toLowerCase().includes(term) ||
                new Date(cert.date).toLocaleDateString().includes(term)
            );
        } catch (error) {
            console.error('Error en searchCertificates:', error);
            throw error;
        }
    };
    
    /**
     * Obtiene un certificado por su ID
     * @param {string} id - ID del certificado a buscar
     * @returns {Promise<Object>} - Promesa que se resuelve con el certificado encontrado
     */
    const getCertificateById = async (id) => {
        try {
            await initDB();
            
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([CERTIFICATES_STORE], 'readonly');
                const store = transaction.objectStore(CERTIFICATES_STORE);
                const request = store.get(id);
                
                request.onsuccess = () => {
                    resolve(request.result);
                };
                
                request.onerror = (event) => {
                    console.error('Error al obtener certificado por ID:', event.target.error);
                    reject(event.target.error);
                };
            });
        } catch (error) {
            console.error('Error en getCertificateById:', error);
            throw error;
        }
    };
    
    /**
     * Elimina un certificado por su ID
     * @param {string} id - ID del certificado a eliminar
     * @returns {Promise} - Promesa que se resuelve cuando el certificado es eliminado
     */
    const deleteCertificate = async (id) => {
        try {
            await initDB();
            
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([CERTIFICATES_STORE], 'readwrite');
                const store = transaction.objectStore(CERTIFICATES_STORE);
                const request = store.delete(id);
                
                request.onsuccess = () => {
                    resolve(true);
                };
                
                request.onerror = (event) => {
                    console.error('Error al eliminar certificado:', event.target.error);
                    reject(event.target.error);
                };
            });
        } catch (error) {
            console.error('Error en deleteCertificate:', error);
            throw error;
        }
    };
    
    // Inicializar la base de datos cuando se carga el script
    initDB().catch(console.error);
    
    // API pública
    return {
        generateCertificateId,
        saveCertificate,
        getAllCertificates,
        searchCertificates,
        getCertificateById,
        deleteCertificate
    };
})();