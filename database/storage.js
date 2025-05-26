import { PilaTransacciones } from "../js/models/Transaccion.js";
import ColaPrioridad from "../js/dataStructures/ColaPrioridad.js";
import ListaCircular from "../js/dataStructures/ListaCircular.js";
import Notificacion from "../js/models/Notificacion.js";
import Cliente from "../js/models/Cliente.js";
import Monedero from "../js/models/Monedero.js";

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
                        Object.assign(clienteInstanciado, c);

                        // Rehidratar historialTransacciones
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

                        // Rehidratar monederos
                        if (Array.isArray(c.monederos)) {
                            clienteInstanciado.monederos = c.monederos.map(m =>
                                m instanceof Monedero ? m : new Monedero(m.id, m.nombre, m.tipo, m.saldo)
                            );
                        } else {
                            clienteInstanciado.monederos = [];
                        }

                        // Rehidratar ListaCircular de notificaciones
                        if (c.notificaciones) {
                            const rehydratedNotificaciones = ListaCircular.fromPlainObject(c.notificaciones);
                            if (rehydratedNotificaciones) {
                                if (Array.isArray(rehydratedNotificaciones.elementos)) {
                                    rehydratedNotificaciones.elementos = rehydratedNotificaciones.elementos.map(n => {
                                        if (n === null || typeof n === 'undefined') return n;
                                        return (n instanceof Notificacion) ? n : new Notificacion(n.mensaje, n.tipo, n.idTransaccion, n.leida, n.fecha, n.id);
                                    });
                                }
                                clienteInstanciado.notificaciones = rehydratedNotificaciones;
                            } else {
                                clienteInstanciado.notificaciones = new ListaCircular();
                            }
                        } else {
                            clienteInstanciado.notificaciones = new ListaCircular();
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
            datos = { clientes: [] };
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
                    clientePlano.transaccionesProgramadas = { elementos: cliente.transaccionesProgramadas.obtenerElementos() };
                    if (cliente.notificaciones instanceof ListaCircular) {
                        clientePlano.notificaciones = {
                            elementos: cliente.notificaciones.obtenerTodos(),
                            capacidad: cliente.notificaciones.getCapacidad(),
                            cabeza: cliente.notificaciones.cabeza,
                            cola: cliente.notificaciones.cola,
                            tamano: cliente.notificaciones.getTamano()
                        };
                    } else {
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

            // Rehidratar monederos
            if (Array.isArray(clienteEncontrado.monederos)) {
                rehydratedCliente.monederos = clienteEncontrado.monederos.map(m =>
                    m instanceof Monedero ? m : new Monedero(m.id, m.nombre, m.tipo, m.saldo)
                );
            } else {
                rehydratedCliente.monederos = [];
            }

            // Rehidratar pila y cola
            if (clienteEncontrado.pilaTransaccionesReversibles && Array.isArray(clienteEncontrado.pilaTransaccionesReversibles.transacciones)) {
                rehydratedCliente.pilaTransaccionesReversibles = new PilaTransacciones();
                rehydratedCliente.pilaTransaccionesReversibles.transacciones.push(...clienteEncontrado.pilaTransaccionesReversibles.transacciones);
            } else {
                rehydratedCliente.pilaTransaccionesReversibles = new PilaTransacciones();
            }
            if (clienteEncontrado.transaccionesProgramadas && Array.isArray(clienteEncontrado.transaccionesProgramadas.elementos)) {
                rehydratedCliente.transaccionesProgramadas = new ColaPrioridad();
                clienteEncontrado.transaccionesProgramadas.elementos.forEach(tp => rehydratedCliente.transaccionesProgramadas.encolar(tp));
            } else {
                rehydratedCliente.transaccionesProgramadas = new ColaPrioridad();
            }
            // Rehidratar notificaciones
            if (clienteEncontrado.notificaciones) {
                const rehydratedNotificaciones = ListaCircular.fromPlainObject(clienteEncontrado.notificaciones);
                if (rehydratedNotificaciones) {
                    if (Array.isArray(rehydratedNotificaciones.elementos)) {
                        rehydratedNotificaciones.elementos = rehydratedNotificaciones.elementos.map(n => {
                            if (n === null || typeof n === 'undefined') return n;
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
            // Actualizar en memoria
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
        if (!Array.isArray(nuevoCliente.monederos)) {
            nuevoCliente.monederos = [];
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