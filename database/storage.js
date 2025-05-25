// database/storage.js
import { PilaTransacciones } from "../js/models/Transaccion.js";
import ColaPrioridad from "../js/dataStructures/ColaPrioridad.js";
import ListaCircular from "../js/dataStructures/ListaCircular.js";
import Notificacion from "../js/models/Notificacion.js";
import Cliente from "../js/models/Cliente.js";

const NOMBRE_STORAGE_CLIENTES = "monederoVirtualClientes";
let datos = { clientes: [] };

class Storage {
    static inicializar() {
        try {
            const data = localStorage.getItem(NOMBRE_STORAGE_CLIENTES);
            if (data) {
                const parsedData = JSON.parse(data);
                if (parsedData && Array.isArray(parsedData.clientes)) {
                    datos.clientes = parsedData.clientes.map(c => {
                        let clienteInstanciado = new Cliente(c.id, c.nombre, c.contrasena);
                        // Copiar propiedades planas, incluyendo saldo, puntos, rango
                        Object.assign(clienteInstanciado, c); 

                        // Rehidratar historialTransacciones (no es necesario un deep copy si solo son objetos planos aquí)
                        clienteInstanciado.historialTransacciones = Array.isArray(c.historialTransacciones) ? c.historialTransacciones : [];

                        // Rehidratar PilaTransacciones
                        if (c.pilaTransaccionesReversibles && Array.isArray(c.pilaTransaccionesReversibles.transacciones)) {
                            clienteInstanciado.pilaTransaccionesReversibles = new PilaTransacciones();
                            clienteInstanciado.pilaTransaccionesReversibles.transacciones.push(...c.pilaTransaccionesReversibles.transacciones);
                        } else {
                            clienteInstanciado.pilaTransaccionesReversibles = new PilaTransacciones();
                        }

                        // Rehidratar ColaPrioridad
                        if (c.transaccionesProgramadas && Array.isArray(c.transaccionesProgramadas.elementos)) {
                            clienteInstanciado.transaccionesProgramadas = new ColaPrioridad();
                            c.transaccionesProgramadas.elementos.forEach(tp => clienteInstanciado.transaccionesProgramadas.encolar(tp));
                        } else {
                            clienteInstanciado.transaccionesProgramadas = new ColaPrioridad();
                        }

                        // Rehidratar ListaCircular
                        if (c.notificaciones) {
                            const rehydratedNotificaciones = ListaCircular.fromPlainObject(c.notificaciones);
                            if (rehydratedNotificaciones) {
                                if (Array.isArray(rehydratedNotificaciones.elementos)) {
                                    rehydratedNotificaciones.elementos = rehydratedNotificaciones.elementos.map(n => {
                                        // AQUI EL CAMBIO: Verificar si 'n' es null/undefined antes de acceder a sus propiedades
                                        if (n === null || typeof n === 'undefined') {
                                            return n; // Devolver el elemento tal cual (null o undefined)
                                        }
                                        // Asegurarse de pasar todos los parámetros, incluyendo fecha e id
                                        return (n instanceof Notificacion) ? n : new Notificacion(n.mensaje, n.tipo, n.idTransaccion, n.leida, n.fecha, n.id);
                                    });
                                }
                                clienteInstanciado.notificaciones = rehydratedNotificaciones;
                            } else {
                                console.warn(`Fallo al rehidratar ListaCircular para cliente ${c.id}. Inicializando nueva.`);
                                clienteInstanciado.notificaciones = new ListaCircular(); // Fallback si fromPlainObject falla
                            }
                        } else {
                            clienteInstanciado.notificaciones = new ListaCircular(); // Inicializar si no existe
                        }

                        return clienteInstanciado;
                    });
                }
            } else {
                datos = { clientes: [] };
            }
            console.log("✅ Datos cargados desde localStorage.", datos.clientes);
        } catch (error) {
            console.error("Error al cargar los datos desde localStorage:", error);
            datos = { clientes: [] }; // Resetear datos para evitar errores subsiguientes
        }
    }

    static guardarDatos() {
        try {
            const datosParaGuardar = {
                clientes: datos.clientes.map(cliente => {
                    if (!(cliente instanceof Cliente)) {
                        console.error("CRÍTICO: Intentando guardar un objeto que NO ES UNA INSTANCIA de Cliente:", cliente);
                        return {};
                    }

                    const clientePlano = {};
                    for (const key in cliente) {
                        if (Object.prototype.hasOwnProperty.call(cliente, key)) {
                            if (key !== 'pilaTransaccionesReversibles' &&
                                key !== 'transaccionesProgramadas' &&
                                key !== 'notificaciones') {
                                clientePlano[key] = cliente[key];
                            }
                        }
                    }

                    clientePlano.pilaTransaccionesReversibles = { transacciones: cliente.pilaTransaccionesReversibles.transacciones };
                    clientePlano.transaccionesProgramadas = { elementos: cliente.transaccionesProgramadas.obtenerElementos() }; // Correcto

                    if (cliente.notificaciones instanceof ListaCircular) {
                        clientePlano.notificaciones = {
                            elementos: cliente.notificaciones.obtenerTodos(), // <-- ¡CAMBIADO A 'elementos' AQUI!
                            capacidad: cliente.notificaciones.getCapacidad(),
                            cabeza: cliente.notificaciones.cabeza,
                            cola: cliente.notificaciones.cola,
                            tamano: cliente.notificaciones.getTamano()
                        };
                    } else {
                        console.error("Fallo crítico: cliente.notificaciones no es una ListaCircular al guardar, a pesar de rehidratación:", cliente.notificaciones);
                        clientePlano.notificaciones = { elementos: [], capacidad: ListaCircular.CAPACIDAD_DEFAULT, cabeza: 0, cola: 0, tamano: 0 };
                    }
                    
                    return clientePlano;
                })
            };
            localStorage.setItem(NOMBRE_STORAGE_CLIENTES, JSON.stringify(datosParaGuardar));
            console.log("💾 Datos guardados en localStorage.");
        } catch (error) {
            console.error("Error al guardar los datos en localStorage:", error);
            console.error("Detalles del error al guardar:", error.message, error.stack);
        }
    }

    static buscarCliente(id) {
        let clienteEncontrado = datos.clientes.find(cliente => cliente.id === id);

        if (clienteEncontrado && !(clienteEncontrado instanceof Cliente)) {
            console.warn(`Cliente ${id} encontrado como objeto plano en 'datos.clientes'. Rehidratando.`);
            
            let rehydratedCliente = new Cliente(clienteEncontrado.id, clienteEncontrado.nombre, clienteEncontrado.contrasena);
            Object.assign(rehydratedCliente, clienteEncontrado);

            if (clienteEncontrado.pilaTransaccionesReversibles && Array.isArray(clienteEncontrado.pilaTransaccionesReversibles.transacciones)) {
                rehydratedCliente.pilaTransaccionesReversibles = new PilaTransacciones();
                rehydratedCliente.pilaTransaccionesReversibles.transacciones.push(...clienteEncontrado.pilaTransaccionesReversibles.transacciones);
            } else {
                rehydratedCliente.pilaTransaccionesReversibles = new PilaTransacciones();
            }

            if (clienteEncontrado.transaccionesProgramadas && Array.isArray(clienteEncontrado.transaccionesProgramadas.elements)) { // Usar 'elements' aquí
                rehydratedCliente.transaccionesProgramadas = new ColaPrioridad();
                clienteEncontrado.transaccionesProgramadas.elements.forEach(tp => rehydratedCliente.transaccionesProgramadas.encolar(tp));
            } else {
                rehydratedCliente.transaccionesProgramadas = new ColaPrioridad();
            }

            if (clienteEncontrado.notificaciones) {
                const rehydratedNotificaciones = ListaCircular.fromPlainObject(clienteEncontrado.notificaciones);
                if (rehydratedNotificaciones) {
                    if (Array.isArray(rehydratedNotificaciones.elementos)) {
                        rehydratedNotificaciones.elementos = rehydratedNotificaciones.elementos.map(n => {
                            // AQUI EL CAMBIO: Verificar si 'n' es null/undefined antes de acceder a sus propiedades
                            if (n === null || typeof n === 'undefined') {
                                return n; // Devolver el elemento tal cual (null o undefined)
                            }
                            // Asegurarse de pasar todos los parámetros, incluyendo fecha e id
                            return (n instanceof Notificacion) ? n : new Notificacion(n.mensaje, n.tipo, n.idTransaccion, n.leida, n.fecha, n.id);
                        });
                    }
                    rehydratedCliente.notificaciones = rehydratedNotificaciones;
                } else {
                    rehydratedCliente.notificaciones = new ListaCircular();
                }
            } else {
                rehydratedCliente.notificaciones = new ListaCircular();
            }
            
            const index = datos.clientes.findIndex(c => c.id === id);
            if (index !== -1) {
                datos.clientes[index] = rehydratedCliente;
            }
            return rehydratedCliente;
        }
        return clienteEncontrado;
    }

    static agregarCliente(nuevoCliente) {
        if (!nuevoCliente || !nuevoCliente.id) {
            return "Error: Cliente inválido.";
        }
        if (!(nuevoCliente.notificaciones instanceof ListaCircular)) {
            nuevoCliente.notificaciones = new ListaCircular(ListaCircular.CAPACIDAD_DEFAULT);
        }
        if (!(nuevoCliente.pilaTransaccionesReversibles instanceof PilaTransacciones)) {
            nuevoCliente.pilaTransaccionesReversibles = new PilaTransacciones();
        }
        if (!(nuevoCliente.transaccionesProgramadas instanceof ColaPrioridad)) {
            nuevoCliente.transaccionesProgramadas = new ColaPrioridad();
        }

        datos.clientes.push(nuevoCliente);
        Storage.guardarDatos();
        return "Cliente registrado con éxito.";
    }

    static agregarTransaccion(idCliente, transaccion) {
        const cliente = Storage.buscarCliente(idCliente);
        if (cliente) {
            if (!cliente.historialTransacciones) {
                cliente.historialTransacciones = [];
            }
            cliente.historialTransacciones.push(transaccion);

            if (["deposito", "retiro", "transferencia"].includes(transaccion.tipo)) {
                if (!(cliente.pilaTransaccionesReversibles instanceof PilaTransacciones)) {
                    console.warn(`pilaTransaccionesReversibles no es una instancia de PilaTransacciones para el cliente ${idCliente}. Re-inicializando.`);
                    cliente.pilaTransaccionesReversibles = new PilaTransacciones();
                }
                cliente.pilaTransaccionesReversibles.push(transaccion);
            }
            Storage.guardarDatos();
            return true;
        }
        return false;
    }

    static actualizarCliente(clienteActualizado) {
        const index = datos.clientes.findIndex(c => c.id === clienteActualizado.id);
        if (index !== -1) {
            datos.clientes[index] = clienteActualizado;
            Storage.guardarDatos();
            return true;
        }
        return false;
    }

    static obtenerTodosLosClientes() {
        return datos.clientes.map(c => {
             if (!(c instanceof Cliente)) {
                 return Storage.buscarCliente(c.id);
             }
             return c;
         });
    }
}

Storage.inicializar();
export default Storage;