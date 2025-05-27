// js/dataStructures/ArbolAVL.js
// Implementación de un Árbol AVL para gestionar los clientes según sus puntos acumulados

class NodoAVL {
    constructor(cliente) {
        this.cliente = cliente;
        this.puntos = cliente.puntos;
        this.id = cliente.id;
        this.izquierda = null;
        this.derecha = null;
        this.altura = 1; // Altura inicial del nodo
    }
}

class ArbolAVL {
    constructor() {
        this.raiz = null;
        this.rangos = {
            'Bronce': { min: 0, max: 500 },
            'Plata': { min: 501, max: 1000 },
            'Oro': { min: 1001, max: 5000 },
            'Platino': { min: 5001, max: Infinity }
        };
    }

    // Obtener la altura de un nodo (null = 0)
    altura(nodo) {
        return nodo ? nodo.altura : 0;
    }

    // Calcular el factor de equilibrio de un nodo
    factorEquilibrio(nodo) {
        return nodo ? this.altura(nodo.izquierda) - this.altura(nodo.derecha) : 0;
    }

    // Actualizar la altura de un nodo basado en sus hijos
    actualizarAltura(nodo) {
        nodo.altura = Math.max(this.altura(nodo.izquierda), this.altura(nodo.derecha)) + 1;
    }

    // Rotación simple a la derecha
    rotacionDerecha(y) {
        const x = y.izquierda;
        const T2 = x.derecha;

        // Realizar rotación
        x.derecha = y;
        y.izquierda = T2;

        // Actualizar alturas
        this.actualizarAltura(y);
        this.actualizarAltura(x);

        return x;
    }

    // Rotación simple a la izquierda
    rotacionIzquierda(x) {
        const y = x.derecha;
        const T2 = y.izquierda;

        // Realizar rotación
        y.izquierda = x;
        x.derecha = T2;

        // Actualizar alturas
        this.actualizarAltura(x);
        this.actualizarAltura(y);

        return y;
    }

    // Insertar un cliente en el árbol AVL
    insertar(cliente) {
        this.raiz = this._insertar(this.raiz, cliente);
        return this.raiz;
    }

    _insertar(nodo, cliente) {
        // Paso 1: Inserción estándar de un BST
        if (!nodo) {
            return new NodoAVL(cliente);
        }

        if (cliente.puntos < nodo.puntos) {
            nodo.izquierda = this._insertar(nodo.izquierda, cliente);
        } else if (cliente.puntos > nodo.puntos) {
            nodo.derecha = this._insertar(nodo.derecha, cliente);
        } else {
            // Si los puntos son iguales, usamos el ID como desempate
            if (cliente.id < nodo.id) {
                nodo.izquierda = this._insertar(nodo.izquierda, cliente);
            } else if (cliente.id > nodo.id) {
                nodo.derecha = this._insertar(nodo.derecha, cliente);
            } else {
                // Si el cliente ya existe (mismo ID), actualizamos sus puntos
                nodo.cliente = cliente;
                nodo.puntos = cliente.puntos;
                return nodo;
            }
        }

        // Paso 2: Actualizar la altura del nodo actual
        this.actualizarAltura(nodo);

        // Paso 3: Obtener el factor de equilibrio
        const equilibrio = this.factorEquilibrio(nodo);

        // Paso 4: Reequilibrar si es necesario

        // Caso Izquierda-Izquierda
        if (equilibrio > 1 && cliente.puntos < nodo.izquierda.puntos) {
            return this.rotacionDerecha(nodo);
        }

        // Caso Derecha-Derecha
        if (equilibrio < -1 && cliente.puntos > nodo.derecha.puntos) {
            return this.rotacionIzquierda(nodo);
        }

        // Caso Izquierda-Derecha
        if (equilibrio > 1 && cliente.puntos > nodo.izquierda.puntos) {
            nodo.izquierda = this.rotacionIzquierda(nodo.izquierda);
            return this.rotacionDerecha(nodo);
        }

        // Caso Derecha-Izquierda
        if (equilibrio < -1 && cliente.puntos < nodo.derecha.puntos) {
            nodo.derecha = this.rotacionDerecha(nodo.derecha);
            return this.rotacionIzquierda(nodo);
        }

        return nodo;
    }

    // Buscar un cliente por ID
    buscarPorId(id) {
        return this._buscarPorId(this.raiz, id);
    }

    _buscarPorId(nodo, id) {
        if (!nodo) {
            return null;
        }

        if (id === nodo.id) {
            return nodo.cliente;
        }

        // Búsqueda recursiva en ambos subárboles ya que no podemos
        // saber de antemano en qué lado está el cliente basado en el ID
        const izquierda = this._buscarPorId(nodo.izquierda, id);
        if (izquierda) {
            return izquierda;
        }

        return this._buscarPorId(nodo.derecha, id);
    }

    // Actualizar los puntos de un cliente existente
    actualizarPuntos(id, nuevosPuntos) {
        // Buscar y eliminar el cliente actual
        const cliente = this.buscarPorId(id);
        if (!cliente) {
            return false;
        }

        this.eliminar(id);
        
        // Actualizar puntos y reinsertar
        cliente.puntos = nuevosPuntos;
        cliente.rango = this.determinarRango(nuevosPuntos);
        this.insertar(cliente);
        return true;
    }

    // Eliminar un cliente del árbol por ID
    eliminar(id) {
        this.raiz = this._eliminar(this.raiz, id);
    }

    _eliminar(nodo, id) {
        if (!nodo) {
            return null;
        }

        // Buscar el nodo a eliminar recursivamente
        if (id === nodo.id) {
            // Nodo con uno o ningún hijo
            if (!nodo.izquierda) {
                return nodo.derecha;
            } else if (!nodo.derecha) {
                return nodo.izquierda;
            }

            // Nodo con dos hijos: obtener el sucesor inorder (el más pequeño en el subárbol derecho)
            let sucesor = this._encontrarMinimo(nodo.derecha);
            nodo.cliente = sucesor.cliente;
            nodo.puntos = sucesor.puntos;
            nodo.id = sucesor.id;
            nodo.derecha = this._eliminar(nodo.derecha, sucesor.id);
        } else {
            // Buscar en ambos subárboles
            nodo.izquierda = this._eliminar(nodo.izquierda, id);
            nodo.derecha = this._eliminar(nodo.derecha, id);
        }

        // Si el árbol tenía solo un nodo
        if (!nodo) {
            return null;
        }

        // Actualizar altura
        this.actualizarAltura(nodo);

        // Verificar equilibrio y reequilibrar si es necesario
        const equilibrio = this.factorEquilibrio(nodo);

        // Caso Izquierda-Izquierda
        if (equilibrio > 1 && this.factorEquilibrio(nodo.izquierda) >= 0) {
            return this.rotacionDerecha(nodo);
        }

        // Caso Izquierda-Derecha
        if (equilibrio > 1 && this.factorEquilibrio(nodo.izquierda) < 0) {
            nodo.izquierda = this.rotacionIzquierda(nodo.izquierda);
            return this.rotacionDerecha(nodo);
        }

        // Caso Derecha-Derecha
        if (equilibrio < -1 && this.factorEquilibrio(nodo.derecha) <= 0) {
            return this.rotacionIzquierda(nodo);
        }

        // Caso Derecha-Izquierda
        if (equilibrio < -1 && this.factorEquilibrio(nodo.derecha) > 0) {
            nodo.derecha = this.rotacionDerecha(nodo.derecha);
            return this.rotacionIzquierda(nodo);
        }

        return nodo;
    }

    _encontrarMinimo(nodo) {
        let actual = nodo;
        while (actual.izquierda) {
            actual = actual.izquierda;
        }
        return actual;
    }

    // Determinar el rango de un cliente basado en sus puntos
    determinarRango(puntos) {
        if (puntos >= this.rangos['Platino'].min) return 'Platino';
        if (puntos >= this.rangos['Oro'].min) return 'Oro';
        if (puntos >= this.rangos['Plata'].min) return 'Plata';
        return 'Bronce';
    }

    // Obtener todos los clientes en un rango específico
    obtenerClientesPorRango(rango) {
        const clientes = [];
        this._obtenerClientesPorRango(this.raiz, this.rangos[rango].min, this.rangos[rango].max, clientes);
        return clientes;
    }

    _obtenerClientesPorRango(nodo, min, max, clientes) {
        if (!nodo) {
            return;
        }

        // Si los puntos del nodo son mayores que el mínimo, exploramos el subárbol izquierdo
        if (nodo.puntos > min) {
            this._obtenerClientesPorRango(nodo.izquierda, min, max, clientes);
        }

        // Si los puntos están en el rango, añadimos el cliente
        if (nodo.puntos >= min && nodo.puntos <= max) {
            clientes.push(nodo.cliente);
        }

        // Si los puntos son menores que el máximo, exploramos el subárbol derecho
        if (nodo.puntos < max) {
            this._obtenerClientesPorRango(nodo.derecha, min, max, clientes);
        }
    }

    // Obtener todos los clientes ordenados por puntos (recorrido inorden)
    obtenerTodosLosClientes() {
        const clientes = [];
        this._recorridoInorden(this.raiz, clientes);
        return clientes;
    }

    _recorridoInorden(nodo, clientes) {
        if (nodo) {
            this._recorridoInorden(nodo.izquierda, clientes);
            clientes.push(nodo.cliente);
            this._recorridoInorden(nodo.derecha, clientes);
        }
    }

    // Obtener un array con todos los clientes ordenados por rango y puntos
    obtenerClientesOrdenadosPorRango() {
        const platino = this.obtenerClientesPorRango('Platino');
        const oro = this.obtenerClientesPorRango('Oro');
        const plata = this.obtenerClientesPorRango('Plata');
        const bronce = this.obtenerClientesPorRango('Bronce');
        
        // Ordenar cada grupo por puntos (descendente)
        platino.sort((a, b) => b.puntos - a.puntos);
        oro.sort((a, b) => b.puntos - a.puntos);
        plata.sort((a, b) => b.puntos - a.puntos);
        bronce.sort((a, b) => b.puntos - a.puntos);
        
        // Concatenar todos los grupos
        return [...platino, ...oro, ...plata, ...bronce];
    }

    // Métodos para visualización gráfica del árbol
    
    // Obtener la estructura del árbol en formato JSON para visualización
    obtenerEstructuraParaVisualizacion() {
        return this._obtenerEstructuraRecursiva(this.raiz);
    }
    
    _obtenerEstructuraRecursiva(nodo) {
        if (!nodo) return null;
        
        return {
            id: nodo.id,
            puntos: nodo.puntos,
            nombre: nodo.cliente ? nodo.cliente.nombre : 'N/A',
            rango: nodo.cliente ? nodo.cliente.rango : 'N/A',
            altura: nodo.altura,
            equilibrio: this.factorEquilibrio(nodo),
            izquierda: this._obtenerEstructuraRecursiva(nodo.izquierda),
            derecha: this._obtenerEstructuraRecursiva(nodo.derecha)
        };
    }
    
    // Obtener la profundidad máxima del árbol
    obtenerProfundidadMaxima() {
        return this._calcularProfundidad(this.raiz);
    }
    
    _calcularProfundidad(nodo) {
        if (!nodo) return 0;
        return 1 + Math.max(
            this._calcularProfundidad(nodo.izquierda),
            this._calcularProfundidad(nodo.derecha)
        );
    }
    
    // Obtener el número total de nodos en el árbol
    obtenerTotalNodos() {
        return this._contarNodos(this.raiz);
    }
    
    _contarNodos(nodo) {
        if (!nodo) return 0;
        return 1 + this._contarNodos(nodo.izquierda) + this._contarNodos(nodo.derecha);
    }
}

export default ArbolAVL;
