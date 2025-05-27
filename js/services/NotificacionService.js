// js/services/NotificacionService.js

import ClienteService from "./ClienteService.js";
import Notificacion from "../models/Notificacion.js";
import ListaCircular from "../dataStructures/ListaCircular.js";
import ColaPrioridad from "../dataStructures/ColaPrioridad.js";
import TransaccionService from "./TransaccionService.js";
import Transaccion from "../models/Transaccion.js";
import Storage from "../../database/storage.js";


class NotificacionService {
    static CAPACIDAD_NOTIFICACIONES = 20; // Aumentamos la capacidad para mantener más notificaciones

    /**
     * Agregar una notificación al cliente, evitando duplicados
     * @param {string} clienteId - ID del cliente
     * @param {Notificacion} notificacion - Notificación a agregar
     * @returns {boolean} - True si se agregó correctamente, false en caso contrario
     */
    static agregarNotificacion(clienteId, notificacion) {
        const cliente = ClienteService.obtenerClienteActual();
        if (cliente && cliente.id === clienteId) {
            if (!(cliente.notificaciones instanceof ListaCircular)) {
                console.error("¡ERROR CRÍTICO! cliente.notificaciones no es una ListaCircular en NotificacionService. Re-inicializando.", cliente.notificaciones);
                // Si esto ocurre frecuentemente, indica un problema en la rehidratación o asignación del cliente.
                cliente.notificaciones = new ListaCircular(this.CAPACIDAD_NOTIFICACIONES);
            }
            
            // Verificar si ya existe una notificación similar (evitar duplicados)
            if (notificacion.idTransaccion) {
                const notificacionesExistentes = cliente.notificaciones.obtenerTodos();
                // Buscar una notificación con el mismo ID de transacción y del mismo tipo
                const duplicado = notificacionesExistentes.find(n => 
                    n.idTransaccion === notificacion.idTransaccion && 
                    n.tipo === notificacion.tipo);
                
                if (duplicado) {
                    // Actualizar la notificación existente en lugar de crear una nueva
                    duplicado.mensaje = notificacion.mensaje;
                    duplicado.fecha = new Date();
                    duplicado.leida = false;
                    ClienteService.guardarClienteActualEnLocalStorage();
                    return true;
                }
            }
            
            // Agregar nueva notificación
            cliente.notificaciones.agregar(notificacion);
            ClienteService.guardarClienteActualEnLocalStorage();
            return true;
        }
        console.error("No se pudo agregar la notificación: Cliente no encontrado o no es el cliente actual.");
        return false;
    }

    /**
     * Genera una alerta de saldo bajo si es necesario
     * @param {string} clienteId - ID del cliente
     * @param {number} umbral - Umbral para considerar saldo bajo (por defecto 100)
     */
    static generarAlertaSaldoBajo(clienteId, umbral = 100) {
        const cliente = ClienteService.obtenerClienteActual();
        if (cliente && cliente.id === clienteId && cliente.saldo < umbral) {
            const mensaje = `¡Alerta! Tu saldo actual es bajo: $${cliente.saldo.toFixed(2)}.`;
            // Usamos 'saldo-bajo' como idTransaccion para poder actualizar esta notificación
            NotificacionService.agregarNotificacion(clienteId, new Notificacion(mensaje, 'alerta', 'saldo-bajo'));
        }
    }

    static obtenerNotificacionesDelClienteActual() {
        const cliente = ClienteService.obtenerClienteActual();
        if (cliente && cliente.notificaciones instanceof ListaCircular) {
            return cliente.notificaciones.obtenerTodos();
        }
        return [];
    }

    static marcarNotificacionComoLeida(clienteId, notificacionId) {
        const cliente = ClienteService.obtenerClienteActual();
        if (cliente && cliente.id === clienteId && cliente.notificaciones instanceof ListaCircular) {
            const notificacion = cliente.notificaciones.obtenerTodos().find(n => n.id === notificacionId);
            if (notificacion) {
                notificacion.leida = true;
                ClienteService.guardarClienteActualEnLocalStorage();
                return true;
            }
        }
        return false;
    }

    static limpiarTodasLasNotificaciones() {
        const cliente = ClienteService.obtenerClienteActual();
        if (cliente && cliente.notificaciones instanceof ListaCircular) {
            // Reinicializamos la lista circular de notificaciones
            cliente.notificaciones = new ListaCircular(NotificacionService.CAPACIDAD_NOTIFICACIONES);
            ClienteService.guardarClienteActualEnLocalStorage();
            return true;
        }
        return false;
    }

    /**
     * Genera recordatorios para transacciones programadas
     * @param {string} idCliente - ID del cliente
     * @param {number} diasAnticipacion - Días de anticipación para el recordatorio (por defecto 1)
     */
    static generarRecordatorioTransaccionesProgramadas(idCliente, diasAnticipacion = 1) {
        let cliente = ClienteService.obtenerClienteActual(); // Usar obtenerClienteActual para la instancia viva
        if (!cliente || cliente.id !== idCliente) {
            // Si no es el cliente actual, buscarlo en Storage (ya rehidratado)
            cliente = ClienteService.buscarClientePorId(idCliente);
            if (!cliente) {
                console.warn(`Cliente ${idCliente} no encontrado para recordatorio de transacciones programadas.`);
                return;
            }
        }

        if (cliente.transaccionesProgramadas && cliente.transaccionesProgramadas instanceof ColaPrioridad) {
            const transaccionesProximas = cliente.transaccionesProgramadas.obtenerElementos();
            const ahora = new Date();
            const diasEnMs = diasAnticipacion * 24 * 60 * 60 * 1000;

            transaccionesProximas.forEach(tp => {
                const fechaProgramada = new Date(tp.fechaProgramada);
                const diferenciaTiempo = fechaProgramada.getTime() - ahora.getTime();
                
                // Verificar si la transacción está próxima a vencer y aún no ha sido notificada para este período
                if (diferenciaTiempo > 0 && diferenciaTiempo <= diasEnMs) {
                    const tiempoFormateado = diferenciaTiempo < 86400000 ? 
                        `en ${Math.ceil(diferenciaTiempo / 3600000)} horas` : 
                        `el ${fechaProgramada.toLocaleDateString()}`;
                    
                    const mensaje = `Recordatorio: Tienes una transacción programada de $${tp.monto.toFixed(2)} (${tp.tipo}) ${tiempoFormateado}.`;
                    const notificacion = new Notificacion(mensaje, 'recordatorio', tp.id);
                    NotificacionService.agregarNotificacion(idCliente, notificacion);
                    tp.notificado = true;
                    
                    // Guardamos los cambios para asegurar que el flag notificado persista
                    Storage.guardarDatos();
                }
            });
        } else {
            console.warn(`cliente.transaccionesProgramadas para cliente ${idCliente} no es una instancia de ColaPrioridad.`);
        }
    }

    /**
     * Genera una notificación relacionada con operaciones de monederos
     * @param {string} clienteId - ID del cliente
     * @param {string} monederoNombre - Nombre del monedero
     * @param {string} operacion - Tipo de operación ('creacion', 'deposito', 'retiro', 'transferencia', 'eliminacion')
     * @param {number} monto - Monto de la operación (si aplica)
     * @param {string} monederoDestino - Nombre del monedero destino (solo para transferencias)
     * @param {string} [idOperacion=null] - ID de la operación para evitar duplicados
     */
    static notificarOperacionMonedero(clienteId, monederoNombre, operacion, monto = 0, monederoDestino = null, idOperacion = null) {
        const cliente = ClienteService.obtenerClienteActual();
        if (!cliente || cliente.id !== clienteId) return false;
        
        let mensaje = "";
        let tipo = "monedero";
        const idTransaccion = idOperacion || `monedero-${Date.now()}`;
        
        switch(operacion) {
            case 'creacion':
                mensaje = `Has creado un nuevo monedero: ${monederoNombre} con saldo inicial de $${monto.toFixed(2)}.`;
                break;
            case 'deposito':
                mensaje = `Has agregado $${monto.toFixed(2)} a tu monedero ${monederoNombre}.`;
                break;
            case 'retiro':
                mensaje = `Has retirado $${monto.toFixed(2)} de tu monedero ${monederoNombre}.`;
                break;
            case 'transferencia':
                mensaje = `Has transferido $${monto.toFixed(2)} desde tu monedero ${monederoNombre} a ${monederoDestino}.`;
                break;
            case 'eliminacion':
                mensaje = `Has eliminado tu monedero ${monederoNombre}. El saldo de $${monto.toFixed(2)} ha sido devuelto a tu cuenta principal.`;
                break;
            default:
                mensaje = `Operación en monedero ${monederoNombre}.`;
        }
        
        return NotificacionService.agregarNotificacion(clienteId, new Notificacion(mensaje, tipo, idTransaccion));
    }

    /**
     * Genera una alerta de saldo bajo en un monedero
     * @param {string} clienteId - ID del cliente
     * @param {string} monederoId - ID del monedero
     * @param {string} monederoNombre - Nombre del monedero
     * @param {number} umbral - Umbral para considerar saldo bajo (por defecto 50)
     */
    static alertaSaldoBajoMonedero(clienteId, monederoId, monederoNombre, umbral = 50) {
        const cliente = ClienteService.obtenerClienteActual();
        if (!cliente || cliente.id !== clienteId) return false;
        
        const monedero = cliente.monederos.find(m => m.id === monederoId);
        if (!monedero) return false;
        
        if (monedero.saldo < umbral) {
            const mensaje = `¡Alerta! El saldo de tu monedero ${monederoNombre} es bajo: $${monedero.saldo.toFixed(2)}.`;
            return NotificacionService.agregarNotificacion(clienteId, new Notificacion(mensaje, 'alerta', `monedero-saldo-bajo-${monederoId}`));
        }
        
        return false;
    }
}

export default NotificacionService;