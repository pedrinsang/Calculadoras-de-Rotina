// ============================================================================
// SISTEMA DE CACHE INTELIGENTE PARA FIREBASE
// Economiza leituras mantendo dados em localStorage/sessionStorage
// ============================================================================

class CacheManager {
    constructor() {
        this.CACHE_DURATION = {
            INVENTARIO: 30 * 60 * 1000, // 30 minutos
            CONFIGURACOES: 60 * 60 * 1000, // 1 hora
            USUARIOS: 15 * 60 * 1000, // 15 minutos
            TAREFAS: 10 * 60 * 1000, // 10 minutos
            HISTORICO: 60 * 60 * 1000 // 1 hora
        };
        
        this.listeners = new Map(); // Para sincronização entre abas
        this.initializeListener();
    }

    /**
     * Inicializa listener para sincronização entre abas
     */
    initializeListener() {
        window.addEventListener('storage', (e) => {
            if (e.key?.startsWith('cache_')) {
                const collection = e.key.replace('cache_', '');
                this.notifyListeners(collection, 'external_update');
            }
        });
    }

    /**
     * Gera chave única para cache
     */
    generateCacheKey(collection, filters = {}) {
        const filterString = Object.keys(filters)
            .sort()
            .map(key => `${key}:${filters[key]}`)
            .join('|');
        
        return `cache_${collection}${filterString ? `_${btoa(filterString)}` : ''}`;
    }

    /**
     * Verifica se dados em cache são válidos
     */
    isValidCache(cacheData, collection) {
        if (!cacheData || !cacheData.timestamp) return false;
        
        const now = Date.now();
        const duration = this.CACHE_DURATION[collection.toUpperCase()] || 10 * 60 * 1000;
        
        return (now - cacheData.timestamp) < duration;
    }

    /**
     * Salva dados no cache
     */
    setCache(collection, data, filters = {}) {
        try {
            const cacheKey = this.generateCacheKey(collection, filters);
            const cacheData = {
                data: data,
                timestamp: Date.now(),
                version: this.generateVersion(),
                filters: filters,
                count: Array.isArray(data) ? data.length : 1
            };

            // Tentar localStorage primeiro, depois sessionStorage
            try {
                localStorage.setItem(cacheKey, JSON.stringify(cacheData));
                localStorage.setItem(`${cacheKey}_meta`, JSON.stringify({
                    collection,
                    lastAccess: Date.now(),
                    size: JSON.stringify(cacheData).length
                }));
            } catch (e) {
                // Se localStorage estiver cheio, usar sessionStorage
                sessionStorage.setItem(cacheKey, JSON.stringify(cacheData));
                console.warn('Cache salvo em sessionStorage (localStorage cheio)');
            }

            this.notifyListeners(collection, 'cache_updated', data);
            console.log(`✅ Cache salvo: ${collection} (${cacheData.count} itens)`);
            
        } catch (error) {
            console.error('Erro ao salvar cache:', error);
        }
    }

    /**
     * Recupera dados do cache
     */
    getCache(collection, filters = {}) {
        try {
            const cacheKey = this.generateCacheKey(collection, filters);
            
            // Tentar localStorage primeiro
            let cacheString = localStorage.getItem(cacheKey) || sessionStorage.getItem(cacheKey);
            
            if (!cacheString) return null;

            const cacheData = JSON.parse(cacheString);
            
            if (!this.isValidCache(cacheData, collection)) {
                this.clearCache(collection, filters);
                return null;
            }

            // Atualizar último acesso
            try {
                localStorage.setItem(`${cacheKey}_meta`, JSON.stringify({
                    collection,
                    lastAccess: Date.now(),
                    size: cacheString.length
                }));
            } catch (e) {
                // Ignorar erro de meta
            }

            console.log(`📦 Cache recuperado: ${collection} (${cacheData.count} itens)`);
            return cacheData.data;
            
        } catch (error) {
            console.error('Erro ao recuperar cache:', error);
            return null;
        }
    }

    /**
     * Remove cache específico
     */
    clearCache(collection, filters = {}) {
        try {
            const cacheKey = this.generateCacheKey(collection, filters);
            localStorage.removeItem(cacheKey);
            sessionStorage.removeItem(cacheKey);
            localStorage.removeItem(`${cacheKey}_meta`);
            
            console.log(`🗑️ Cache removido: ${collection}`);
            this.notifyListeners(collection, 'cache_cleared');
            
        } catch (error) {
            console.error('Erro ao limpar cache:', error);
        }
    }

    /**
     * Remove todos os caches de uma coleção
     */
    clearCollectionCache(collection) {
        try {
            const keys = Object.keys(localStorage).concat(Object.keys(sessionStorage));
            const collectionKeys = keys.filter(key => key.startsWith(`cache_${collection}`));
            
            collectionKeys.forEach(key => {
                localStorage.removeItem(key);
                sessionStorage.removeItem(key);
                localStorage.removeItem(`${key}_meta`);
            });
            
            console.log(`🗑️ Cache da coleção removido: ${collection}`);
            this.notifyListeners(collection, 'collection_cache_cleared');
            
        } catch (error) {
            console.error('Erro ao limpar cache da coleção:', error);
        }
    }

    /**
     * Remove todos os caches expirados
     */
    cleanExpiredCache() {
        try {
            const now = Date.now();
            const keys = Object.keys(localStorage).concat(Object.keys(sessionStorage));
            const cacheKeys = keys.filter(key => key.startsWith('cache_'));
            
            let cleaned = 0;
            
            cacheKeys.forEach(key => {
                try {
                    const cacheString = localStorage.getItem(key) || sessionStorage.getItem(key);
                    if (cacheString) {
                        const cacheData = JSON.parse(cacheString);
                        const collection = key.split('_')[1];
                        
                        if (!this.isValidCache(cacheData, collection)) {
                            localStorage.removeItem(key);
                            sessionStorage.removeItem(key);
                            localStorage.removeItem(`${key}_meta`);
                            cleaned++;
                        }
                    }
                } catch (e) {
                    // Remover cache corrompido
                    localStorage.removeItem(key);
                    sessionStorage.removeItem(key);
                    cleaned++;
                }
            });
            
            if (cleaned > 0) {
                console.log(`🧹 ${cleaned} caches expirados removidos`);
            }
            
        } catch (error) {
            console.error('Erro ao limpar caches expirados:', error);
        }
    }

    /**
     * Gera versão para invalidação de cache
     */
    generateVersion() {
        return `v${Date.now().toString(36)}`;
    }

    /**
     * Adiciona listener para mudanças de cache
     */
    addListener(collection, callback) {
        if (!this.listeners.has(collection)) {
            this.listeners.set(collection, new Set());
        }
        this.listeners.get(collection).add(callback);
    }

    /**
     * Remove listener
     */
    removeListener(collection, callback) {
        if (this.listeners.has(collection)) {
            this.listeners.get(collection).delete(callback);
        }
    }

    /**
     * Notifica listeners sobre mudanças
     */
    notifyListeners(collection, event, data = null) {
        if (this.listeners.has(collection)) {
            this.listeners.get(collection).forEach(callback => {
                try {
                    callback({ collection, event, data });
                } catch (error) {
                    console.error('Erro no listener de cache:', error);
                }
            });
        }
    }

    /**
     * Obtém estatísticas do cache
     */
    getCacheStats() {
        try {
            const stats = {
                total: 0,
                byCollection: {},
                totalSize: 0,
                expired: 0
            };

            const keys = Object.keys(localStorage).concat(Object.keys(sessionStorage));
            const cacheKeys = keys.filter(key => key.startsWith('cache_'));

            cacheKeys.forEach(key => {
                try {
                    const cacheString = localStorage.getItem(key) || sessionStorage.getItem(key);
                    if (cacheString) {
                        const cacheData = JSON.parse(cacheString);
                        const collection = key.split('_')[1];
                        
                        stats.total++;
                        stats.totalSize += cacheString.length;
                        
                        if (!stats.byCollection[collection]) {
                            stats.byCollection[collection] = { count: 0, size: 0, expired: 0 };
                        }
                        
                        stats.byCollection[collection].count++;
                        stats.byCollection[collection].size += cacheString.length;
                        
                        if (!this.isValidCache(cacheData, collection)) {
                            stats.expired++;
                            stats.byCollection[collection].expired++;
                        }
                    }
                } catch (e) {
                    stats.expired++;
                }
            });

            return stats;
        } catch (error) {
            console.error('Erro ao obter estatísticas:', error);
            return null;
        }
    }

    /**
     * Força limpeza por limite de tamanho
     */
    enforceStorageLimit() {
        try {
            const maxSize = 4 * 1024 * 1024; // 4MB limite aproximado
            const currentSize = JSON.stringify(localStorage).length;
            
            if (currentSize > maxSize) {
                console.warn('⚠️ Limite de storage atingido, limpando caches antigos...');
                
                // Limpar por última utilização
                const metaKeys = Object.keys(localStorage).filter(key => key.endsWith('_meta'));
                const cachesByAccess = metaKeys.map(key => {
                    try {
                        const meta = JSON.parse(localStorage.getItem(key));
                        return {
                            key: key.replace('_meta', ''),
                            lastAccess: meta.lastAccess || 0,
                            size: meta.size || 0
                        };
                    } catch (e) {
                        return null;
                    }
                }).filter(Boolean);
                
                // Ordenar por último acesso (mais antigos primeiro)
                cachesByAccess.sort((a, b) => a.lastAccess - b.lastAccess);
                
                // Remover até liberar 25% do espaço
                let removedSize = 0;
                const targetSize = maxSize * 0.25;
                
                for (const cache of cachesByAccess) {
                    if (removedSize >= targetSize) break;
                    
                    localStorage.removeItem(cache.key);
                    localStorage.removeItem(`${cache.key}_meta`);
                    removedSize += cache.size;
                }
                
                console.log(`🧹 ${removedSize} bytes liberados do cache`);
            }
        } catch (error) {
            console.error('Erro ao enforçar limite de storage:', error);
        }
    }
}

// Instância global do cache manager
const cacheManager = new CacheManager();

// Limpeza automática a cada 10 minutos
setInterval(() => {
    cacheManager.cleanExpiredCache();
    cacheManager.enforceStorageLimit();
}, 10 * 60 * 1000);

// Limpeza ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    cacheManager.cleanExpiredCache();
});

export default cacheManager;