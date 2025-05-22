// js/services/AnalisisGastoService.js

import GrafoDirigido from "../dataStructures/GrafoDirigido.js";
import ClienteService from "./ClienteService.js";

class AnalisisGastoService {
    static grafoGastos = new GrafoDirigido(); // Instancia del grafo

    /**
     * Reconstruye el grafo de patrones de gasto a partir de los datos actuales de todos los clientes.
     * Debe llamarse cada vez que los datos subyacentes puedan haber cambiado (ej., al cargar la app, después de transacciones).
     */
    static construirGrafoDeGastos() {
        AnalisisGastoService.grafoGastos = new GrafoDirigido(); // Reinicia el grafo
        const clientes = ClienteService.obtenerTodosLosClientes(); // Obtener todos los clientes

        clientes.forEach(cliente => {
            AnalisisGastoService.grafoGastos.addNode(cliente.id); // Cada cliente es un nodo

            cliente.historialTransacciones.forEach(transaccion => {
                const monto = transaccion.monto;
                const categoria = transaccion.categoria;
                const tipo = transaccion.tipo;
                const idClienteOrigen = transaccion.idClienteOrigen;
                const idClienteDestino = transaccion.idClienteDestino;

                // 1. Análisis de Gastos por Categoría (Retiros)
                if (tipo === "retiro" && categoria) {
                    const categoriaNodo = `Categoria: ${categoria}`;
                    AnalisisGastoService.grafoGastos.addNode(categoriaNodo);
                    // Arista: Cliente -> Categoría de Gasto (representa el gasto)
                    AnalisisGastoService.grafoGastos.addEdge(idClienteOrigen, categoriaNodo, monto);
                }

                // 2. Análisis de Transferencias entre Clientes
                if (tipo === "transferencia" && idClienteDestino) {
                    // Arista: Cliente Origen -> Cliente Destino (representa la transferencia)
                    AnalisisGastoService.grafoGastos.addEdge(idClienteOrigen, idClienteDestino, monto);
                }

                // Las transacciones de tipo 'recepcion' y 'deposito' no representan "gasto"
                // en el sentido de flujo de dinero saliente para el análisis de patrones de gasto
                // (excepto si son gastos de comisiones o algo similar, lo cual no está en el modelo actual).
                // La categoría de 'recepcion' se maneja automáticamente en TransaccionService si quieres que aparezca
                // como un nodo de categoría.
                if (tipo === "recepcion" && categoria) {
                    const categoriaNodo = `Categoria: ${categoria}`; // Ej: "Recibido de ID_ORIGEN"
                    AnalisisGastoService.grafoGastos.addNode(categoriaNodo);
                    // Arista: Categoría de Recepción -> Cliente Destino (representa el ingreso en una categoría)
                    // Esto es opcional, puedes decidir si quieres visualizar ingresos por categoría.
                    // AnalisisGastoService.grafoGastos.addEdge(categoriaNodo, idClienteDestino, monto);
                }
            });
        });
        console.log("Grafo de gastos construido/reconstruido:", AnalisisGastoService.grafoGastos.toString());
    }

    /**
     * Obtiene los gastos de un cliente agrupados por categoría.
     * @param {string} idCliente El ID del cliente.
     * @returns {Map<string, number>} Un mapa con las categorías y el total gastado en cada una.
     */
    static obtenerGastosPorCategoria(idCliente) {
        AnalisisGastoService.construirGrafoDeGastos(); // Asegurar que el grafo esté actualizado
        const gastosPorCategoria = new Map();
        const adyacentes = AnalisisGastoService.grafoGastos.getAdjacentNodes(idCliente);

        if (adyacentes) {
            for (let [nodoDestino, montoAcumulado] of adyacentes) {
                if (nodoDestino.startsWith("Categoria:")) {
                    const categoria = nodoDestino.replace("Categoria: ", "");
                    gastosPorCategoria.set(categoria, montoAcumulado);
                }
            }
        }
        return gastosPorCategoria;
    }

    /**
     * Obtiene el monto total transferido por un cliente a otros clientes.
     * @param {string} idCliente El ID del cliente.
     * @returns {Map<string, number>} Un mapa con los IDs de los clientes a los que se transfirió y el monto total.
     */
    static obtenerTransferenciasPorCliente(idCliente) {
        AnalisisGastoService.construirGrafoDeGastos(); // Asegurar que el grafo esté actualizado
        const transferenciasSalientes = new Map();
        const adyacentes = AnalisisGastoService.grafoGastos.getAdjacentNodes(idCliente);

        if (adyacentes) {
            for (let [nodoDestino, montoAcumulado] of adyacentes) {
                // Verificar si el nodo destino es un ID de cliente (no una categoría)
                // Para esto, podemos asumir que los IDs de cliente no comienzan con "Categoria:"
                if (!nodoDestino.startsWith("Categoria:")) {
                    // Podemos mejorar esta heurística si los IDs de cliente pueden ser "Categoria:Algo"
                    // Por ahora, asumiremos que no.
                    transferenciasSalientes.set(nodoDestino, montoAcumulado);
                }
            }
        }
        return transferenciasSalientes;
    }

    /**
     * Identifica los clientes con más interacciones (transacciones salientes).
     * @param {number} [topN=5] El número de clientes a devolver.
     * @returns {Array<{idCliente: string, montoTotal: number}>} Un array de objetos con el ID del cliente y el monto total transferido.
     */
    static obtenerClientesConMasInteraccion(topN = 5) {
        AnalisisGastoService.construirGrafoDeGastos(); // Asegurar que el grafo esté actualizado
        const interacciones = new Map(); // { idCliente -> monto total transferido/gastado }

        // Recorrer todos los nodos del grafo
        for (let origen of AnalisisGastoService.grafoGastos.getNodes()) {
            const adyacentes = AnalisisGastoService.grafoGastos.getAdjacentNodes(origen);
            if (adyacentes) {
                let montoTotalSaliente = 0;
                for (let [destino, peso] of adyacentes) {
                    // Sumar tanto gastos a categorías como transferencias a otros clientes
                    montoTotalSaliente += peso;
                }
                if (montoTotalSaliente > 0) {
                    interacciones.set(origen, montoTotalSaliente);
                }
            }
        }

        // Convertir a array, ordenar y obtener el top N
        const sortedInteracciones = Array.from(interacciones.entries())
            .map(([idCliente, montoTotal]) => ({ idCliente, montoTotal }))
            .sort((a, b) => b.montoTotal - a.montoTotal);

        return sortedInteracciones.slice(0, topN);
    }

    /**
     * Obtiene las categorías de gasto más populares en el sistema.
     * @param {number} [topN=5] El número de categorías a devolver.
     * @returns {Array<{categoria: string, montoTotal: number}>} Un array de objetos con la categoría y el monto total gastado en ella.
     */
    static obtenerCategoriasMasPopulares(topN = 5) {
        AnalisisGastoService.construirGrafoDeGastos(); // Asegurar que el grafo esté actualizado
        const categoriasPopulares = new Map(); // { categoria -> monto total gastado }

        // Recorrer todos los nodos (clientes)
        for (let clienteId of AnalisisGastoService.grafoGastos.getNodes()) {
            const adyacentes = AnalisisGastoService.grafoGastos.getAdjacentNodes(clienteId);
            if (adyacentes) {
                for (let [destino, peso] of adyacentes) {
                    if (destino.startsWith("Categoria:")) {
                        const categoria = destino.replace("Categoria: ", "");
                        const montoActual = categoriasPopulares.has(categoria) ? categoriasPopulares.get(categoria) : 0;
                        categoriasPopulares.set(categoria, montoActual + peso);
                    }
                }
            }
        }

        // Convertir a array, ordenar y obtener el top N
        const sortedCategorias = Array.from(categoriasPopulares.entries())
            .map(([categoria, montoTotal]) => ({ categoria, montoTotal }))
            .sort((a, b) => b.montoTotal - a.montoTotal);

        return sortedCategorias.slice(0, topN);
    }

    // Puedes añadir más métodos de análisis aquí...
    // Por ejemplo:
    // - Flujo de dinero entre un par de clientes
    // - Ruta de gasto más común (si implementas algoritmos de caminos)
}

export default AnalisisGastoService;