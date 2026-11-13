// Texto digitado pelos usuários (ID, nomes, observações...) pode conter < > & " '.
// Antes de entrar no HTML da página, esses caracteres viram entidades, para o
// navegador mostrar o texto em vez de interpretá-lo como código.

const ENTIDADES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function escaparHTML(valor) {
    if (valor === null || valor === undefined) return "";
    return String(valor).replace(/[&<>"']/g, c => ENTIDADES[c]);
}

/**
 * Cópia de um documento do Firestore pronta para exibir: todos os textos escapados,
 * números/booleanos intactos e datas (Timestamp/Date) preservadas.
 * Use SÓ para montar a tela; para gravar ou gerar arquivos, use o objeto original.
 */
export function paraExibir(valor) {
    if (typeof valor === "string") return escaparHTML(valor);
    if (Array.isArray(valor)) return valor.map(paraExibir);
    if (valor && typeof valor === "object") {
        if (typeof valor.toDate === "function" || valor instanceof Date) return valor;
        const copia = {};
        for (const [k, v] of Object.entries(valor)) copia[k] = paraExibir(v);
        return copia;
    }
    return valor;
}
