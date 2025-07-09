// ============================================================================
// OTIMIZADOR DE CONSULTAS FIREBASE
// Reduz número de leituras usando cache e consultas inteligentes
// ============================================================================

import cacheManager from './cache-manager.js';

class FirebaseOptimizer {
    constructor() {
        this.queryQueue = new Map();
        this.pendingQueries = new Map();
        this.readCount = parseInt(localStorage.getItem('firebase_read_count') || '0');
        this.dailyResetKey = `reset_${new Date().toDateString()}`;
        
        this.checkDailyReset();
        this.setupReadCountMonitoring();
    }

    /**
     * Reset diário do contador
     */
    checkDailyReset() {
        const lastReset = localStorage.getItem('last_reset_date');
        const today = new Date().toDateString();
        
        if (lastReset !== today) {
            this.readCount = 0;
            localStorage.setItem('firebase_read_count', '0');
            localStorage.setItem('last_reset_date', today);
            console.log('🔄 Contador de leituras resetado para o novo dia');
        }
    }

    /**
     * Monitora uso de leituras
     */
    setupReadCountMonitoring() {
        // Alertar quando próximo do limite
        if (this.readCount > 40000) {
            console.warn('⚠️ Próximo do limite de leituras diárias! Usando mais cache...');
        }
    }

    /**
     * Incrementa contador de leituras
     */
    incrementReadCount(count = 1) {
        this.readCount += count;
        localStorage.setItem('firebase_read_count', this.readCount.toString());
        
        if (this.readCount > 45000) {
            console.error('🚨 LIMITE CRÍTICO: Muito próximo do limite de 50k leituras!');
        }
        
        console.log(`📊 Leituras Firebase hoje: ${this.readCount}/50000`);
    }

    /**
     * Consulta otimizada com cache
     */
    async optimizedQuery(queryFn, collection, options = {}) {
        const {
            filters = {},
            cacheFirst = true,
            forceRefresh = false,
            onlyCache = false
        } = options;

        // Gerar ID único para a consulta
        const queryId = this.generateQueryId(collection, filters);

        // Evitar consultas duplicadas simultâneas
        if (this.pendingQueries.has(queryId)) {
            console.log(`⏳ Aguardando consulta em andamento: ${collection}`);
            return await this.pendingQueries.get(queryId);
        }

        try {
            // 1. Tentar cache primeiro (se não for refresh forçado)
            if (cacheFirst && !forceRefresh) {
                const cachedData = cacheManager.getCache(collection, filters);
                if (cachedData) {
                    console.log(`⚡ Dados obtidos do cache: ${collection}`);
                    return cachedData;
                }
            }

            // 2. Se só deve usar cache, retornar vazio
            if (onlyCache) {
                console.log(`📦 Apenas cache solicitado, mas não encontrado: ${collection}`);
                return [];
            }

            // 3. Verificar limite de leituras
            if (this.readCount >= 49000) {
                console.error('🚨 LIMITE DE LEITURAS ATINGIDO! Usando apenas cache.');
                const cachedData = cacheManager.getCache(collection, filters);
                return cachedData || [];
            }

            // 4. Fazer consulta Firebase
            console.log(`🔥 Consultando Firebase: ${collection}`);
            const queryPromise = this.executeQuery(queryFn, collection);
            this.pendingQueries.set(queryId, queryPromise);

            const result = await queryPromise;
            
            // 5. Salvar no cache
            cacheManager.setCache(collection, result, filters);
            
            // 6. Incrementar contador
            this.incrementReadCount(Array.isArray(result) ? result.length : 1);

            return result;

        } catch (error) {
            console.error(`❌ Erro na consulta otimizada ${collection}:`, error);
            
            // Em caso de erro, tentar cache como fallback
            const cachedData = cacheManager.getCache(collection, filters);
            if (cachedData) {
                console.log(`🆘 Usando cache como fallback: ${collection}`);
                return cachedData;
            }
            
            throw error;
        } finally {
            this.pendingQueries.delete(queryId);
        }
    }

    /**
     * Executa consulta Firebase e processa resultado
     */
    async executeQuery(queryFn, collection) {
        const startTime = Date.now();
        const snapshot = await queryFn();
        const endTime = Date.now();

        let result = [];
        let docCount = 0;

        if (snapshot.empty) {
            console.log(`📭 Consulta vazia: ${collection}`);
        } else {
            snapshot.forEach((doc) => {
                result.push({
                    id: doc.id,
                    ...doc.data()
                });
                docCount++;
            });
        }

        console.log(`⏱️ Consulta ${collection}: ${endTime - startTime}ms (${docCount} docs)`);
        return result;
    }

    /**
     * Gera ID único para consulta
     */
    generateQueryId(collection, filters) {
        const filterString = JSON.stringify(filters, Object.keys(filters).sort());
        return `${collection}_${btoa(filterString).substring(0, 16)}`;
    }

    /**
     * Batch de consultas para reduzir requests
     */
    async batchQuery(queries) {
        const results = {};
        const firebaseQueries = [];

        // Primeiro, verificar cache para todas as consultas
        for (const query of queries) {
            const { collection, filters = {} } = query;
            const cachedData = cacheManager.getCache(collection, filters);
            
            if (cachedData) {
                results[collection] = cachedData;
            } else {
                firebaseQueries.push(query);
            }
        }

        // Executar consultas Firebase necessárias em paralelo
        if (firebaseQueries.length > 0) {
            console.log(`🔥 Executando ${firebaseQueries.length} consultas Firebase em batch`);
            
            const firebasePromises = firebaseQueries.map(async (query) => {
                const { collection, queryFn, filters = {} } = query;
                try {
                    const result = await this.optimizedQuery(queryFn, collection, { 
                        cacheFirst: false,
                        filters 
                    });
                    return { collection, result, error: null };
                } catch (error) {
                    return { collection, result: null, error };
                }
            });

            const batchResults = await Promise.allSettled(firebasePromises);
            
            batchResults.forEach((promiseResult, index) => {
                if (promiseResult.status === 'fulfilled') {
                    const { collection, result, error } = promiseResult.value;
                    if (!error) {
                        results[collection] = result;
                    }
                }
            });
        }

        return results;
    }

    /**
     * Invalidar cache quando dados são modificados
     */
    invalidateCache(collection, filters = {}) {
        cacheManager.clearCache(collection, filters);
        console.log(`🗑️ Cache invalidado: ${collection}`);
    }

    /**
     * Pré-carregar dados comuns
     */
    async preloadCommonData() {
        try {
            console.log('🚀 Pré-carregando dados comuns...');
            
            const commonQueries = [
                {
                    collection: 'configuracoes',
                    queryFn: () => getDocs(collection(db, 'configuracoes'))
                }
            ];

            await this.batchQuery(commonQueries);
            console.log('✅ Dados comuns pré-carregados');
            
        } catch (error) {
            console.error('❌ Erro ao pré-carregar dados:', error);
        }
    }

    /**
     * Obtém estatísticas de uso
     */
    getUsageStats() {
        return {
            dailyReads: this.readCount,
            remainingReads: Math.max(0, 50000 - this.readCount),
            percentUsed: Math.round((this.readCount / 50000) * 100),
            cacheStats: cacheManager.getCacheStats()
        };
    }

    /**
     * Exibe estatísticas no console
     */
    logUsageStats() {
        const stats = this.getUsageStats();
        console.group('📊 Estatísticas Firebase');
        console.log(`📖 Leituras hoje: ${stats.dailyReads}/50000 (${stats.percentUsed}%)`);
        console.log(`⚡ Leituras restantes: ${stats.remainingReads}`);
        console.log(`📦 Caches ativos: ${stats.cacheStats?.total || 0}`);
        console.log(`💾 Tamanho total do cache: ${(stats.cacheStats?.totalSize / 1024).toFixed(2)}KB`);
        console.groupEnd();
    }
}

// Instância global do otimizador
const firebaseOptimizer = new FirebaseOptimizer();

export default firebaseOptimizer;