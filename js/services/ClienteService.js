// js/services/ClienteService.js
import Storage from "../../database/storage.js";
import Cliente from "../models/Cliente.js";
import { PilaTransacciones } from "../models/Transaccion.js";
import ColaPrioridad from "../dataStructures/ColaPrioridad.js";
import ListaCircular from "../dataStructures/ListaCircular.js";
import NotificacionService from "./NotificacionService.js";
import Notificacion from "../models/Notificacion.js";

let clienteActualEnMemoria = null; // Esta variable mantendrá la instancia rehidratada del cliente actual

class ClienteService {
    // Método de inicialización para asegurar que clienteActualEnMemoria se carga al inicio
    static inicializarClienteActual() {
        const clienteActualId = localStorage.getItem("clienteActualId");
        if (clienteActualId) {
            const clienteDesdeStorage = Storage.buscarCliente(clienteActualId);
            if (clienteDesdeStorage) {
                clienteActualEnMemoria = clienteDesdeStorage;
                console.log("Cliente actual cargado en memoria:", clienteActualEnMemoria.id);
            } else {
                console.warn("ID de cliente actual en localStorage, pero cliente no encontrado en Storage. Limpiando.");
                localStorage.removeItem("clienteActualId");
            }
        }
    }

    static buscarClientePorId(id) {
        return Storage.buscarCliente(id);
    }

    static agregarCliente(nombre, id, contrasena) {
        if (Storage.buscarCliente(id)) {
            return "Error: El ID de cliente ya existe.";
        }
        const nuevoCliente = new Cliente(id, nombre, contrasena); // Ya es una instancia
        return Storage.agregarCliente(nuevoCliente); // Storage lo guarda correctamente
    }

    static autenticarCliente(id, contrasena) {
        const cliente = Storage.buscarCliente(id); // Obtiene una instancia rehidratada o null
        if (cliente && cliente.contrasena === contrasena) {
            clienteActualEnMemoria = cliente; // Asigna la instancia rehidratada
            localStorage.setItem("clienteActualId", cliente.id); // Solo guarda el ID
            console.log(`Cliente ${cliente.id} autenticado y cargado en memoria.`);
            return true;
        }
        return false;
    }

    static cerrarSesion() {
        clienteActualEnMemoria = null;
        localStorage.removeItem("clienteActualId");
        console.log("Sesión cerrada.");
    }

    static obtenerClienteActual() {
        // Si no está en memoria, intenta cargarlo de Storage (y del localStorage ID)
        if (!clienteActualEnMemoria) {
            ClienteService.inicializarClienteActual();
        }
        // Doble verificación: si por alguna razón no es una instancia de Cliente, rehidratar
        if (clienteActualEnMemoria && !(clienteActualEnMemoria instanceof Cliente)) {
            console.warn("clienteActualEnMemoria no es una instancia de Cliente. Forzando rehidratación.");
            clienteActualEnMemoria = Storage.buscarCliente(clienteActualEnMemoria.id);
            if (!clienteActualEnMemoria) {
                 console.error("Fallo al rehidratar clienteActualEnMemoria. Es null después de buscar en Storage.");
                 localStorage.removeItem("clienteActualId"); // Limpiar ID corrupto
            }
        }
        return clienteActualEnMemoria;
    }

    static guardarClienteActualEnLocalStorage() {
        if (clienteActualEnMemoria) {
            Storage.actualizarCliente(clienteActualEnMemoria); // Delega la persistencia a Storage
            console.log(`Cliente ${clienteActualEnMemoria.id} actualizado y guardado en localStorage.`);
        } else {
            console.warn("Intento de guardar cliente actual en localStorage, pero no hay cliente en memoria.");
        }
    }

    static agregarTransaccionACliente(idCliente, transaccion) {
        // La fuente de verdad para el cliente actual debe ser `clienteActualEnMemoria`
        const cliente = ClienteService.obtenerClienteActual();
        let exito = false;

        if (cliente && cliente.id === idCliente) {
            // Directamente modificamos la instancia en memoria
            if (!cliente.historialTransacciones) {
                cliente.historialTransacciones = [];
            }
            cliente.historialTransacciones.push(transaccion);

            if (["deposito", "retiro", "transferencia"].includes(transaccion.tipo)) {
                if (!(cliente.pilaTransaccionesReversibles instanceof PilaTransacciones)) {
                    console.warn(`PilaTransaccionesReversibles no es una instancia para el cliente ${idCliente}. Re-inicializando.`);
                    cliente.pilaTransaccionesReversibles = new PilaTransacciones();
                }
                cliente.pilaTransaccionesReversibles.push(transaccion);
            }
            exito = true;
            ClienteService.guardarClienteActualEnLocalStorage(); // Persiste la instancia actualizada
        } else {
            // Esto solo se ejecutaría si se agrega una transacción a un cliente que NO es el actualmente logueado
            // En ese caso, Storage.agregarTransaccion ya maneja la búsqueda y actualización.
            console.warn("Intentando agregar transacción a un cliente no logueado directamente a través de ClienteService. Delega a Storage.");
            exito = Storage.agregarTransaccion(idCliente, transaccion);
        }

        if (exito) {
            // Notificaciones después de que la transacción se ha manejado y guardado.
            NotificacionService.generarAlertaSaldoBajo(idCliente);
            const mensajeConfirmacion = `Transacción exitosa: ${transaccion.tipo} de $${transaccion.monto.toFixed(2)}. Nuevo saldo: $${ClienteService.buscarClientePorId(idCliente).saldo.toFixed(2)}.`;
            NotificacionService.agregarNotificacion(idCliente, new Notificacion(mensajeConfirmacion, 'informativo', transaccion.id));
        }
        return exito;
    }

    static actualizarPuntosPorTransaccion(idCliente, transaccion) {
        const cliente = ClienteService.obtenerClienteActual(); // Obtener la instancia en memoria
        if (cliente && cliente.id === idCliente) {
            // Modificar la instancia en memoria
            if (transaccion.tipo === "deposito") {
                cliente.puntos += Math.floor(transaccion.monto / 100) * 1;
            } else if (transaccion.tipo === "retiro") {
                cliente.puntos += Math.floor(transaccion.monto / 100) * 2;
            } else if (transaccion.tipo === "transferencia") {
                cliente.puntos += Math.floor(transaccion.monto / 100) * 3;
            }
            ClienteService.actualizarRango(cliente);
            ClienteService.guardarClienteActualEnLocalStorage(); // Guardar cambios de puntos y rango
        } else {
            // Si es otro cliente, buscarlo y actualizarlo directamente en Storage
            const otroCliente = Storage.buscarCliente(idCliente);
            if (otroCliente) {
                 if (transaccion.tipo === "deposito") {
                     otroCliente.puntos += Math.floor(transaccion.monto / 100) * 1;
                 } else if (transaccion.tipo === "retiro") {
                     otroCliente.puntos += Math.floor(transaccion.monto / 100) * 2;
                 } else if (transaccion.tipo === "transferencia") {
                     otroCliente.puntos += Math.floor(transaccion.monto / 100) * 3;
                 }
                 ClienteService._determinarRango(otroCliente); // Llama a la privada sin el `cliente`
                 Storage.actualizarCliente(otroCliente); // Guardar cambios del otro cliente
            }
        }
    }

    static actualizarRango(cliente) { // Este método recibe la instancia de cliente
        cliente.rango = ClienteService._determinarRango(cliente.puntos);
    }

    static _determinarRango(puntos) { // Este método es privado y solo calcula el rango
        if (puntos >= 5001) return "Platino";
        if (puntos >= 1001) return "Oro";
        if (puntos >= 501) return "Plata";
        return "Bronce";
    }

    static recalcularPuntosYRangos(idCliente) {
        const cliente = ClienteService.obtenerClienteActual(); // Obtener la instancia en memoria
        if (!cliente || cliente.id !== idCliente) {
            // Si no es el cliente actual, lo buscamos en Storage
            const clienteDesdeStorage = Storage.buscarCliente(idCliente);
            if (!clienteDesdeStorage) return;
            cliente = clienteDesdeStorage; // Usar el cliente obtenido del Storage
        }

        let puntosCalculados = 0;
        cliente.historialTransacciones.forEach(transaccion => {
            if (transaccion.tipo === "deposito") {
                puntosCalculados += Math.floor(transaccion.monto / 100) * 1;
            } else if (transaccion.tipo === "retiro") {
                puntosCalculados += Math.floor(transaccion.monto / 100) * 2;
            } else if (transaccion.tipo === "transferencia") {
                puntosCalculados += Math.floor(transaccion.monto / 100) * 3;
            }
        });
        cliente.puntos = puntosCalculados;
        cliente.rango = ClienteService._determinarRango(puntosCalculados);
        ClienteService.guardarClienteActualEnLocalStorage(); // Guardar cambios
    }

    static obtenerTodosLosClientes() {
        return Storage.obtenerTodosLosClientes();
    }
}

// Llama a inicializarClienteActual tan pronto como el script se cargue,
// pero asegúrate de que Storage ya esté inicializado (importación en la parte superior ayuda con esto).
ClienteService.inicializarClienteActual(); 

export default ClienteService;