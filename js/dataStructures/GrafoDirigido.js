// js/dataStructures/GrafoDirigido.js

/**
 * Clase para representar un Grafo Dirigido usando listas de adyacencia.
 * Permite añadir nodos (vértices) y aristas (conexiones dirigidas con peso).
 */
class GrafoDirigido {
    constructor() {
        this.adj = new Map(); // Mapa para almacenar la lista de adyacencia: { nodo -> { nodoVecino -> peso } }
    }

    /**
     * Añade un nodo al grafo. Si el nodo ya existe, no hace nada.
     * @param {string} nodo El identificador único del nodo a añadir.
     */
    addNode(nodo) {
        if (!this.adj.has(nodo)) {
            this.adj.set(nodo, new Map());
        }
    }

    /**
     * Añade una arista dirigida entre dos nodos con un peso específico.
     * Si los nodos no existen, los crea. Si la arista ya existe, suma el peso.
     * @param {string} origen El nodo de origen de la arista.
     * @param {string} destino El nodo de destino de la arista.
     * @param {number} peso El peso asociado a la arista (ej. monto, cantidad).
     */
    addEdge(origen, destino, peso = 1) {
        this.addNode(origen);
        this.addNode(destino);

        const adyacenciasOrigen = this.adj.get(origen);
        const pesoActual = adyacenciasOrigen.has(destino) ? adyacenciasOrigen.get(destino) : 0;
        adyacenciasOrigen.set(destino, pesoActual + peso);
    }

    /**
     * Obtiene los nodos adyacentes a un nodo dado y el peso de las aristas.
     * @param {string} nodo El nodo del que se quieren obtener los adyacentes.
     * @returns {Map<string, number> | undefined} Un Mapa donde la clave es el nodo adyacente y el valor es el peso,
     * o undefined si el nodo no existe.
     */
    getAdjacentNodes(nodo) {
        return this.adj.get(nodo);
    }

    /**
     * Verifica si un nodo existe en el grafo.
     * @param {string} nodo El nodo a verificar.
     * @returns {boolean} True si el nodo existe, false en caso contrario.
     */
    hasNode(nodo) {
        return this.adj.has(nodo);
    }

    /**
     * Verifica si existe una arista entre dos nodos.
     * @param {string} origen El nodo de origen.
     * @param {string} destino El nodo de destino.
     * @returns {boolean} True si la arista existe, false en caso contrario.
     */
    hasEdge(origen, destino) {
        return this.adj.has(origen) && this.adj.get(origen).has(destino);
    }

    /**
     * Obtiene el peso de una arista entre dos nodos.
     * @param {string} origen El nodo de origen.
     * @param {string} destino El nodo de destino.
     * @returns {number | undefined} El peso de la arista, o undefined si la arista no existe.
     */
    getEdgeWeight(origen, destino) {
        if (this.hasEdge(origen, destino)) {
            return this.adj.get(origen).get(destino);
        }
        return undefined;
    }

    /**
     * Obtiene todos los nodos del grafo.
     * @returns {Array<string>} Un array con todos los nodos del grafo.
     */
    getNodes() {
        return Array.from(this.adj.keys());
    }

    /**
     * Representación del grafo para depuración.
     * @returns {string} Una cadena que representa el grafo.
     */
    toString() {
        let result = "Grafo Dirigido:\n";
        for (let [nodo, adyacentes] of this.adj) {
            result += `${nodo} -> `;
            const edges = [];
            for (let [vecino, peso] of adyacentes) {
                edges.push(`${vecino} (peso: ${peso})`);
            }
            result += edges.join(", ") + "\n";
        }
        return result;
    }
}

export default GrafoDirigido;