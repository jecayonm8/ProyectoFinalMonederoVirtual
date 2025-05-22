// js/dataStructures/ColaPrioridad.js
class ColaPrioridad {
    constructor() {
        this.elementos = [];
    }

    /**
     * Agrega un elemento a la cola manteniendo el orden por fechaEjecucion (ascendente).
     * @param {Object} elemento El elemento a agregar (debe tener una propiedad `fechaEjecucion`).
     */
    encolar(elemento) {
        if (!elemento || !elemento.fechaEjecucion) {
            console.error("Error: El elemento encolado debe tener una propiedad 'fechaEjecucion'.", elemento);
            return;
        }

        const fechaNueva = new Date(elemento.fechaEjecucion).getTime(); // Convertir a timestamp para comparación

        if (this.elementos.length === 0) {
            this.elementos.push(elemento);
        } else {
            let agregado = false;
            for (let i = 0; i < this.elementos.length; i++) {
                const fechaActual = new Date(this.elementos[i].fechaEjecucion).getTime();
                if (fechaNueva < fechaActual) {
                    this.elementos.splice(i, 0, elemento); // Insertar en la posición correcta
                    agregado = true;
                    break;
                }
            }
            if (!agregado) {
                this.elementos.push(elemento); // Si es el más tardío, agregarlo al final
            }
        }
    }

    /**
     * Desencola el elemento de mayor prioridad (fechaEjecucion más temprana).
     * @returns {Object|null} El elemento de mayor prioridad, o null si la cola está vacía.
     */
    desencolar() {
        if (this.estaVacia()) {
            return null;
        }
        return this.elementos.shift(); // Elimina y devuelve el primer elemento (el de mayor prioridad)
    }

    /**
     * Retorna el elemento de mayor prioridad sin removerlo.
     * @returns {Object|null} El elemento de mayor prioridad, o null si la cola está vacía.
     */
    peek() {
        if (this.estaVacia()) {
            return null;
        }
        return this.elementos[0];
    }

    /**
     * Verifica si la cola está vacía.
     * @returns {boolean} True si la cola está vacía, false en caso contrario.
     */
    estaVacia() {
        return this.elementos.length === 0;
    }

    /**
     * Retorna el número de elementos en la cola.
     * @returns {number}
     */
    tamano() {
        return this.elementos.length;
    }

    /**
     * Retorna una copia de los elementos actuales de la cola.
     * @returns {Array}
     */
    obtenerElementos() {
        return [...this.elementos];
    }
}

export default ColaPrioridad;