// js/services/NotificacionService.js

import ClienteService from "./ClienteService.js";
import Notificacion from "../models/Notificacion.js";
import ListaCircular from "../dataStructures/ListaCircular.js";
import ColaPrioridad from "../dataStructures/ColaPrioridad.js";
import TransaccionService from "./TransaccionService.js";
import Transaccion from "../models/Transaccion.js";
import Storage from "../../database/storage.js";


class NotificacionService {
    static CAPACIDAD_NOTIFICACIONES = 10;

    static agregarNotificacion(clienteId, notificacion) {
    const cliente = ClienteService.obtenerClienteActual();
    if (cliente && cliente.id === clienteId) {
        if (!(cliente.notificaciones instanceof ListaCircular)) {
            console.error("¡ERROR CRÍTICO! cliente.notificaciones no es una ListaCircular en NotificacionService. Re-inicializando.", cliente.notificaciones);
            // Si esto ocurre frecuentemente, indica un problema en la rehidratación o asignación del cliente.
            cliente.notificaciones = new ListaCircular(ListaCircular.CAPACIDAD_DEFAULT); // Usar DEFAULT si no está definido
        }

        cliente.notificaciones.agregar(notificacion);
        ClienteService.guardarClienteActualEnLocalStorage();
        return true;
    }
    console.error("No se pudo agregar la notificación: Cliente no encontrado o no es el cliente actual.");
    return false;
    }

    static generarAlertaSaldoBajo(clienteId) {
        const cliente = ClienteService.obtenerClienteActual();
        if (cliente && cliente.id === clienteId && cliente.saldo < 100) {
            const mensaje = `¡Alerta! Tu saldo actual es bajo: $${cliente.saldo.toFixed(2)}.`;
            NotificacionService.agregarNotificacion(clienteId, new Notificacion(mensaje, 'alerta'));
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

    static generarRecordatorioTransaccionesProgramadas(idCliente) {
        const cliente = ClienteService.obtenerClienteActual(); // Usar obtenerClienteActual para la instancia viva
        if (!cliente || cliente.id !== idCliente) {
            // Si no es el cliente actual, buscarlo en Storage (ya rehidratado)
            const clienteDesdeStorage = ClienteService.buscarClientePorId(idCliente);
            if (!clienteDesdeStorage) {
                console.warn(`Cliente ${idCliente} no encontrado para recordatorio de transacciones programadas.`);
                return;
            }
            cliente = clienteDesdeStorage;
        }

        if (cliente.transaccionesProgramadas && cliente.transaccionesProgramadas instanceof ColaPrioridad) {
            const transaccionesProximas = cliente.transaccionesProgramadas.obtenerElementos();
            const ahora = new Date();
            const unDiaEnMs = 24 * 60 * 60 * 1000;

            transaccionesProximas.forEach(tp => {
                const fechaProgramada = new Date(tp.fechaProgramada);
                if (fechaProgramada.getTime() - ahora.getTime() > 0 && fechaProgramada.getTime() - ahora.getTime() <= unDiaEnMs && !tp.notificado) {
                    const mensaje = `Recordatorio: Tienes una transacción programada de $${tp.monto.toFixed(2)} (${tp.tipo}) para el ${new Date(tp.fechaProgramada).toLocaleDateString()}.`;
                    const notificacion = new Notificacion(mensaje, 'recordatorio', tp.id);
                    NotificacionService.agregarNotificacion(idCliente, notificacion);
                    tp.notificado = true;
                    // No necesitas Storage.guardarDatos() aquí, ya que agregarNotificacion llama a ClienteService.guardarClienteActualEnLocalStorage()
                    // Si tp.notificado es una propiedad de la transacción programada, necesitarás un mecanismo para persistir ese cambio.
                    // Idealmente, ClienteService.guardarClienteActualEnLocalStorage() debería encargarse de todo el estado del cliente.
                }
            });
        } else {
             console.warn(`cliente.transaccionesProgramadas para cliente ${idCliente} no es una instancia de ColaPrioridad.`);
        }
    }
}

export default NotificacionService;