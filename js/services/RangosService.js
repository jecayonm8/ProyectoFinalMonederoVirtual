// js/services/RangosService.js
// Servicio para gestionar los rangos de los clientes utilizando un árbol AVL

import ArbolAVL from "../dataStructures/ArbolAVL.js";
import ClienteService from "./ClienteService.js";
import Storage from "../../database/storage.js";

class RangosService {
    constructor() {
        if (RangosService.instance) {
            return RangosService.instance;
        }
        
        this.arbolClientes = new ArbolAVL();
        this.inicializar();
        
        RangosService.instance = this;
    }

    // Inicializar el árbol con todos los clientes existentes
    inicializar() {
        // Limpiar el árbol primero para evitar duplicados
        this.arbolClientes = new ArbolAVL();
        
        const clientes = Storage.obtenerTodosLosClientes();
        if (clientes && clientes.length > 0) {
            clientes.forEach(cliente => {
                // Asegurarse de que el cliente tenga un rango asignado
                if (!cliente.rango) {
                    cliente.rango = this.determinarRango(cliente.puntos || 0);
                }
                // Insertar en el árbol
                this.arbolClientes.insertar(cliente);
            });
            console.log(`Árbol AVL inicializado con ${clientes.length} clientes.`);
        } else {
            console.log("No hay clientes para inicializar el árbol AVL.");
        }
    }

    // Añadir un cliente al árbol
    agregarCliente(cliente) {
        return this.arbolClientes.insertar(cliente);
    }

    // Actualizar los puntos de un cliente y su rango
    actualizarPuntosCliente(idCliente, puntos) {
        const cliente = this.arbolClientes.buscarPorId(idCliente);
        if (!cliente) {
            console.warn(`Cliente con ID ${idCliente} no encontrado en el árbol AVL.`);
            return false;
        }

        // Actualizar puntos y rango
        const resultado = this.arbolClientes.actualizarPuntos(idCliente, puntos);
        
        // Persistir los cambios
        if (resultado) {
            const clienteActualizado = this.arbolClientes.buscarPorId(idCliente);
            if (clienteActualizado) {
                // Si es el cliente actual, actualizar en memoria
                const clienteActual = ClienteService.obtenerClienteActual();
                if (clienteActual && clienteActual.id === idCliente) {
                    clienteActual.puntos = puntos;
                    clienteActual.rango = clienteActualizado.rango;
                    ClienteService.guardarClienteActualEnLocalStorage();
                } else {
                    // Si no es el cliente actual, actualizar en storage
                    Storage.actualizarCliente(clienteActualizado);
                }
            }
        }
        
        return resultado;
    }

    // Obtener el rango de un cliente
    obtenerRangoCliente(idCliente) {
        const cliente = this.arbolClientes.buscarPorId(idCliente);
        if (!cliente) {
            console.warn(`Cliente con ID ${idCliente} no encontrado en el árbol AVL.`);
            return null;
        }
        return cliente.rango;
    }

    // Obtener todos los clientes de un rango específico
    obtenerClientesPorRango(rango) {
        return this.arbolClientes.obtenerClientesPorRango(rango);
    }

    // Obtener el ranking de clientes ordenados por rango y puntos
    obtenerRanking() {
        return this.arbolClientes.obtenerClientesOrdenadosPorRango();
    }

    // Obtener el número de clientes por rango
    obtenerEstadisticasPorRango() {
        const platino = this.arbolClientes.obtenerClientesPorRango('Platino').length;
        const oro = this.arbolClientes.obtenerClientesPorRango('Oro').length;
        const plata = this.arbolClientes.obtenerClientesPorRango('Plata').length;
        const bronce = this.arbolClientes.obtenerClientesPorRango('Bronce').length;
        
        return {
            'Platino': platino,
            'Oro': oro,
            'Plata': plata,
            'Bronce': bronce,
            'Total': platino + oro + plata + bronce
        };
    }

    // Determinar el rango según los puntos
    determinarRango(puntos) {
        return this.arbolClientes.determinarRango(puntos);
    }
    
    // Métodos para visualización gráfica
    
    // Obtener la estructura del árbol para visualización
    obtenerEstructuraArbol() {
        return this.arbolClientes.obtenerEstructuraParaVisualizacion();
    }
    
    // Obtener estadísticas del árbol
    obtenerEstadisticasArbol() {
        const estadisticas = this.obtenerEstadisticasPorRango();
        return {
            totalNodos: this.arbolClientes.obtenerTotalNodos(),
            profundidadMaxima: this.arbolClientes.obtenerProfundidadMaxima(),
            nodosPorRango: estadisticas
        };
    }
    
    // Recargar los datos del árbol con los clientes actuales
    recargarArbol() {
        // Limpiar el árbol completamente
        this.arbolClientes = new ArbolAVL();
        
        // Obtener todos los clientes del storage
        const clientes = Storage.obtenerTodosLosClientes() || [];
        
        // Asignar rangos a todos los clientes según sus puntos
        clientes.forEach(cliente => {
            if (!cliente.rango) {
                cliente.rango = this.determinarRango(cliente.puntos || 0);
            }
            // Insertar en el árbol
            this.arbolClientes.insertar(cliente);
        });
        
        console.log(`Árbol AVL recargado con ${clientes.length} clientes.`);
        
        // Devolver las estadísticas actualizadas
        return this.obtenerEstadisticasArbol();
    }
}

// Crear una instancia única (singleton)
const rangosService = new RangosService();

export default rangosService;
