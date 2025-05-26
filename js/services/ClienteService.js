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
            let puntosBase = 0;
            if (transaccion.tipo === "deposito") {
                puntosBase = Math.floor(transaccion.monto / 100) * 1;
            } else if (transaccion.tipo === "retiro") {
                puntosBase = Math.floor(transaccion.monto / 100) * 2;
            } else if (transaccion.tipo === "transferencia") {
                puntosBase = Math.floor(transaccion.monto / 100) * 3;
            }
            
            // Aplicar multiplicador por rango
            const multiplicador = ClienteService.obtenerMultiplicadorPuntosPorRango(cliente.rango);
            const puntosFinales = Math.floor(puntosBase * multiplicador);
            cliente.puntos += puntosFinales;
            
            ClienteService.actualizarRango(cliente);
            ClienteService.guardarClienteActualEnLocalStorage(); // Guardar cambios de puntos y rango
        } else {
            // Si es otro cliente, buscarlo y actualizarlo directamente en Storage
            const otroCliente = Storage.buscarCliente(idCliente);
            if (otroCliente) {
                let puntosBase = 0;
                if (transaccion.tipo === "deposito") {
                    puntosBase = Math.floor(transaccion.monto / 100) * 1;
                } else if (transaccion.tipo === "retiro") {
                    puntosBase = Math.floor(transaccion.monto / 100) * 2;
                } else if (transaccion.tipo === "transferencia") {
                    puntosBase = Math.floor(transaccion.monto / 100) * 3;
                }
                
                // Aplicar multiplicador por rango
                const multiplicador = ClienteService.obtenerMultiplicadorPuntosPorRango(otroCliente.rango);
                const puntosFinales = Math.floor(puntosBase * multiplicador);
                otroCliente.puntos += puntosFinales;
                
                ClienteService.actualizarRango(otroCliente);
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

    static obtenerMultiplicadorPuntosPorRango(rango) {
        switch (rango) {
            case 'Bronce': return 1.0;
            case 'Plata': return 1.1;
            case 'Oro': return 1.25;
            case 'Platino': return 1.5;
            default: return 1.0;
        }
    }

    static canjearPuntos(beneficioId) {
        const cliente = ClienteService.obtenerClienteActual();
        if (!cliente) {
            return { exito: false, mensaje: 'No hay cliente logueado.' };
        }

        // Importar dinámicamente para evitar dependencias circulares
        import('../models/SistemaPuntos.js').then(({ default: SistemaPuntos }) => {
            const sistemaPuntos = new SistemaPuntos();
            const resultado = sistemaPuntos.canjearPuntos(cliente, beneficioId);
            
            if (resultado.exito) {
                // Agregar al historial de canjes
                if (!cliente.historialCanjes) {
                    cliente.historialCanjes = [];
                }
                cliente.historialCanjes.push({
                    beneficioId,
                    fecha: new Date().toISOString(),
                    costoPuntos: resultado.beneficio ? resultado.beneficio.costoPuntos : 0
                });
                
                ClienteService.guardarClienteActualEnLocalStorage();
            }
            
            return resultado;
        });
    }

    static obtenerBeneficiosDisponibles() {
        const cliente = ClienteService.obtenerClienteActual();
        if (!cliente) return {};

        // Importar dinámicamente para evitar dependencias circulares
        return import('../models/SistemaPuntos.js').then(({ default: SistemaPuntos }) => {
            const sistemaPuntos = new SistemaPuntos();
            return sistemaPuntos.obtenerBeneficiosDisponibles(cliente);
        });
    }

    static aplicarBeneficioEnTransaccion(tipoTransaccion, monto) {
        const cliente = ClienteService.obtenerClienteActual();
        if (!cliente) return { descuento: 0, beneficioUsado: null };

        // Importar dinámicamente para evitar dependencias circulares
        return import('../models/SistemaPuntos.js').then(({ default: SistemaPuntos }) => {
            const sistemaPuntos = new SistemaPuntos();
            const resultado = sistemaPuntos.aplicarBeneficioEnTransaccion(cliente, tipoTransaccion, monto);
            
            if (resultado.beneficioUsado) {
                ClienteService.guardarClienteActualEnLocalStorage();
            }
            
            return resultado;
        });
    }

    static obtenerTodosLosClientes() {
        return Storage.obtenerTodosLosClientes();
    }


}

// Llama a inicializarClienteActual tan pronto como el script se cargue,
// pero asegúrate de que Storage ya esté inicializado (importación en la parte superior ayuda con esto).
ClienteService.inicializarClienteActual(); 

export default ClienteService;