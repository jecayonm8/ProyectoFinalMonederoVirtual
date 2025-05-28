// js/services/GrafoTransaccionesService.js

import Storage from "../../database/storage.js";
import GrafoDirigido from "../dataStructures/GrafoDirigido.js";
import ClienteService from "./ClienteService.js";

/**
 * Servicio para gestionar un grafo dirigido de transacciones entre monederos.
 * Permite visualizar las relaciones entre monederos y sus transacciones.
 */
class GrafoTransaccionesService {
    constructor() {
        if (GrafoTransaccionesService.instance) {
            return GrafoTransaccionesService.instance;
        }
        
        this.grafo = new GrafoDirigido();
        this.grafoGlobal = new GrafoDirigido(); // Para todas las transacciones de todos los clientes
        
        GrafoTransaccionesService.instance = this;
    }
    
    /**
     * Inicializa el grafo con todas las transacciones existentes.
     */
    inicializar() {
        // Limpiar el grafo primero para evitar duplicados
        this.grafo = new GrafoDirigido();
        this.grafoGlobal = new GrafoDirigido();
        
        // Obtener todos los clientes y sus transacciones
        const clientes = Storage.obtenerTodosLosClientes();
        
        if (!clientes || clientes.length === 0) {
            console.log("No hay clientes para inicializar el grafo de transacciones.");
            return;
        }
        
        clientes.forEach(cliente => {
            this.construirGrafoCliente(cliente);
        });
        
        console.log(`Grafo de transacciones inicializado con ${this.grafoGlobal.getNodes().length} nodos.`);
    }
    
    /**
     * Construye el grafo para un cliente específico.
     * @param {Cliente} cliente - El cliente para el que se construirá el grafo.
     */
    construirGrafoCliente(cliente) {
        if (!cliente || !cliente.historialTransacciones) return;
        
        // Añadir todos los monederos del cliente como nodos
        if (cliente.monederos && Array.isArray(cliente.monederos)) {
            cliente.monederos.forEach(monedero => {
                // Formato: Cliente_ID-Monedero_ID (para mantener los nodos únicos)
                const nodoId = `${cliente.id}-${monedero.id}`;
                this.grafo.addNode(nodoId);
                this.grafoGlobal.addNode(nodoId);
            });
        }
        
        // Procesar todas las transacciones del cliente
        cliente.historialTransacciones.forEach(transaccion => {
            this.procesarTransaccion(cliente, transaccion);
        });
    }
    
    /**
     * Procesa una transacción y la añade al grafo.
     * @param {Cliente} cliente - El cliente propietario de la transacción.
     * @param {Transaccion} transaccion - La transacción a procesar.
     */
    procesarTransaccion(cliente, transaccion) {
        // Solo procesar transacciones de tipo transferencia
        if (transaccion.tipo !== "transferencia" && transaccion.tipo !== "recepcion") {
            return;
        }
        
        let origenId, destinoId;
        
        if (transaccion.tipo === "transferencia") {
            // Para transferencias salientes
            if (transaccion.idMonederoOrigen && transaccion.idClienteDestino) {
                origenId = `${cliente.id}-${transaccion.idMonederoOrigen}`;
                
                // Buscar el monedero destino
                const clienteDestino = Storage.buscarCliente(transaccion.idClienteDestino);
                if (clienteDestino && transaccion.idMonederoDestino) {
                    destinoId = `${clienteDestino.id}-${transaccion.idMonederoDestino}`;
                } else {
                    // Si no se encuentra el monedero destino, usar ID genérico
                    destinoId = `${transaccion.idClienteDestino}-desconocido`;
                }
                
                // Añadir la arista al grafo
                this.grafo.addEdge(origenId, destinoId, transaccion.monto);
                this.grafoGlobal.addEdge(origenId, destinoId, transaccion.monto);
            }
        } else if (transaccion.tipo === "recepcion") {
            // Para transferencias recibidas
            if (transaccion.idMonederoDestino && transaccion.idClienteOrigen) {
                destinoId = `${cliente.id}-${transaccion.idMonederoDestino}`;
                
                // Buscar el monedero origen
                const clienteOrigen = Storage.buscarCliente(transaccion.idClienteOrigen);
                if (clienteOrigen && transaccion.idMonederoOrigen) {
                    origenId = `${clienteOrigen.id}-${transaccion.idMonederoOrigen}`;
                } else {
                    // Si no se encuentra el monedero origen, usar ID genérico
                    origenId = `${transaccion.idClienteOrigen}-desconocido`;
                }
                
                // Añadir la arista al grafo
                this.grafo.addEdge(origenId, destinoId, transaccion.monto);
                this.grafoGlobal.addEdge(origenId, destinoId, transaccion.monto);
            }
        }
    }
    
    /**
     * Añade una transacción al grafo.
     * @param {Transaccion} transaccion - La transacción a añadir.
     */
    añadirTransaccion(transaccion) {
        const cliente = ClienteService.obtenerClienteActual();
        if (!cliente) return;
        
        this.procesarTransaccion(cliente, transaccion);
        console.log("Transacción añadida al grafo:", transaccion);
    }
    
    /**
     * Añade una transferencia entre monederos al grafo.
     * @param {string} clienteId - ID del cliente propietario.
     * @param {string} monederoOrigenId - ID del monedero origen.
     * @param {string} monederoDestinoId - ID del monedero destino.
     * @param {number} monto - Monto de la transferencia.
     */
    añadirTransferenciaEntreMonederos(clienteId, monederoOrigenId, monederoDestinoId, monto) {
        if (!clienteId || !monederoOrigenId || !monederoDestinoId || !monto) return;
        
        // Crear identificadores para los nodos
        const origenId = `${clienteId}-${monederoOrigenId}`;
        const destinoId = `${clienteId}-${monederoDestinoId}`;
        
        // Añadir nodos al grafo si no existen
        this.grafo.addNode(origenId);
        this.grafo.addNode(destinoId);
        this.grafoGlobal.addNode(origenId);
        this.grafoGlobal.addNode(destinoId);
        
        // Añadir la arista al grafo
        this.grafo.addEdge(origenId, destinoId, monto);
        this.grafoGlobal.addEdge(origenId, destinoId, monto);
        
        console.log(`Arista añadida al grafo: ${origenId} -> ${destinoId} (${monto})`);
    }
    
    /**
     * Obtiene el grafo de transacciones para el cliente actual.
     * @returns {GrafoDirigido} - El grafo de transacciones.
     */
    obtenerGrafoCliente() {
        const cliente = ClienteService.obtenerClienteActual();
        if (!cliente) return new GrafoDirigido();
        
        // Reconstruir el grafo para asegurar que está actualizado
        this.grafo = new GrafoDirigido();
        this.construirGrafoCliente(cliente);
        
        return this.grafo;
    }
    
    /**
     * Obtiene el grafo global de todas las transacciones.
     * @returns {GrafoDirigido} - El grafo global de transacciones.
     */
    obtenerGrafoGlobal() {
        return this.grafoGlobal;
    }
    
    /**
     * Obtiene los monederos más activos en términos de transferencias enviadas.
     * @param {number} limite - La cantidad de monederos a devolver.
     * @returns {Array} - Lista de monederos ordenados por transferencias salientes.
     */
    obtenerMonederosConMasTransferencias(limite = 5) {
        const nodos = this.grafoGlobal.getNodes();
        const resultado = [];
        
        for (const nodo of nodos) {
            const adyacentes = this.grafoGlobal.getAdjacentNodes(nodo);
            if (!adyacentes || adyacentes.size === 0) continue;
            
            let totalSaliente = 0;
            for (const peso of adyacentes.values()) {
                totalSaliente += peso;
            }
            
            // Obtener los IDs de cliente y monedero del nodo
            const [clienteId, monederoId] = nodo.split('-');
            
            resultado.push({
                nodoId: nodo,
                clienteId,
                monederoId,
                totalSaliente,
                conexiones: adyacentes.size
            });
        }
        
        // Ordenar por total saliente y limitar resultados
        return resultado
            .sort((a, b) => b.totalSaliente - a.totalSaliente)
            .slice(0, limite);
    }
    
    /**
     * Obtiene los caminos de transferencia más frecuentes entre monederos.
     * @param {number} limite - La cantidad de caminos a devolver.
     * @returns {Array} - Lista de caminos ordenados por volumen de transferencias.
     */
    obtenerCaminosMasFrecuentes(limite = 5) {
        const nodos = this.grafoGlobal.getNodes();
        const caminos = [];
        
        for (const origen of nodos) {
            const adyacentes = this.grafoGlobal.getAdjacentNodes(origen);
            if (!adyacentes) continue;
            
            for (const [destino, peso] of adyacentes.entries()) {
                // Obtener información de origen y destino
                const [origenClienteId, origenMonederoId] = origen.split('-');
                const [destinoClienteId, destinoMonederoId] = destino.split('-');
                
                caminos.push({
                    origen,
                    destino,
                    origenClienteId,
                    origenMonederoId,
                    destinoClienteId,
                    destinoMonederoId,
                    volumen: peso
                });
            }
        }
        
        // Ordenar por volumen y limitar resultados
        return caminos
            .sort((a, b) => b.volumen - a.volumen)
            .slice(0, limite);
    }
    
    /**
     * Genera datos para visualizar el grafo en un formato compatible con D3.js o similares.
     * @returns {Object} - Datos formateados para visualización.
     */
    generarDatosVisualizacion() {
        const nodos = this.grafoGlobal.getNodes().map(id => {
            const [clienteId, monederoId] = id.split('-');
            
            // Intentar obtener el nombre del cliente y monedero
            let nombreCliente = "Cliente " + clienteId;
            let nombreMonedero = "Monedero " + monederoId;
            
            const cliente = Storage.buscarCliente(clienteId);
            if (cliente) {
                nombreCliente = cliente.nombre;
                
                if (cliente.monederos && Array.isArray(cliente.monederos)) {
                    const monedero = cliente.monederos.find(m => m.id === monederoId);
                    if (monedero) {
                        nombreMonedero = monedero.nombre;
                    }
                }
            }
            
            return {
                id,
                clienteId,
                monederoId,
                label: `${nombreCliente} - ${nombreMonedero}`
            };
        });
        
        const enlaces = [];
        for (const origen of this.grafoGlobal.getNodes()) {
            const adyacentes = this.grafoGlobal.getAdjacentNodes(origen);
            if (!adyacentes) continue;
            
            for (const [destino, peso] of adyacentes.entries()) {
                enlaces.push({
                    source: origen,
                    target: destino,
                    value: peso
                });
            }
        }
        
        return { nodos, enlaces };
    }
}

// Crear una instancia única (singleton)
const grafoTransaccionesService = new GrafoTransaccionesService();
grafoTransaccionesService.inicializar(); // Inicializar al cargar

export default grafoTransaccionesService;
