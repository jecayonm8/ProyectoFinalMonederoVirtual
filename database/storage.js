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
                // Asegurarse de que parsedData.clientes existe y es un array
                if (parsedData && Array.isArray(parsedData.clientes)) {
                    datos.clientes = parsedData.clientes.map(c => {
                        // C es un objeto plano, siempre lo rehidratamos a una instancia de Cliente
                        let clienteInstanciado = new Cliente(c.id, c.nombre, c.contrasena);
                        clienteInstanciado.saldo = c.saldo || 0;
                        clienteInstanciado.puntos = c.puntos || 0;
                        clienteInstanciado.rango = c.rango || "Bronce";

                        // Rehidratar historialTransacciones (si no es ya un array)
                        clienteInstanciado.historialTransacciones = Array.isArray(c.historialTransacciones) ? c.historialTransacciones : [];

                        // Rehidratar PilaTransacciones
                        if (c.pilaTransaccionesReversibles && Array.isArray(c.pilaTransaccionesReversibles.transacciones)) {
                            // Crear una nueva PilaTransacciones e insertar los elementos
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
                                // Asegurarse de que los elementos sean instancias de Notificacion
                                if (Array.isArray(rehydratedNotificaciones.elementos)) {
                                    rehydratedNotificaciones.elementos = rehydratedNotificaciones.elementos.map(n => 
                                        (n instanceof Notificacion) ? n : new Notificacion(n.mensaje, n.tipo, n.idTransaccion, n.leida)
                                    );
                                }
                                clienteInstanciado.notificaciones = rehydratedNotificaciones;
                            } else {
                                clienteInstanciado.notificaciones = new ListaCircular(); // Fallback si fromPlainObject falla
                            }
                        } else {
                            clienteInstanciado.notificaciones = new ListaCircular(); // Inicializar si no existe
                        }

                        return clienteInstanciado; // Devolver la instancia de Cliente rehidratada
                    });
                }
            } else {
                datos = { clientes: [] };
            }
            console.log("✅ Datos cargados desde localStorage.", datos.clientes); // Log para verificar
        } catch (error) {
            console.error("Error al cargar los datos desde localStorage:", error);
            datos = { clientes: [] };
        }
    }

    static guardarDatos() {
        try {
            const datosParaGuardar = {
                clientes: datos.clientes.map(cliente => {
                    // Aseguramos que 'cliente' es una instancia de Cliente con métodos
                    // antes de intentar aplanar. Si no lo es, es un error lógico en cómo se añadió.
                    if (!(cliente instanceof Cliente)) {
                        console.error("CRÍTICO: Intentando guardar un objeto que NO ES UNA INSTANCIA de Cliente:", cliente);
                        // Esto no debería ocurrir si ClienteService y Storage.agregarCliente funcionan bien
                        // Podrías lanzar un error o devolver un objeto plano vacío para evitar un crash total.
                        return {}; // Devuelve un objeto vacío o maneja el error apropiadamente
                    }

                    const clientePlano = {};
                    for (const key in cliente) { // Iterar sobre las propiedades de la instancia de Cliente
                        if (Object.prototype.hasOwnProperty.call(cliente, key)) {
                            // Excluir propiedades que son instancias de clases para aplanarlas manualmente
                            if (key !== 'pilaTransaccionesReversibles' &&
                                key !== 'transaccionesProgramadas' &&
                                key !== 'notificaciones') {
                                clientePlano[key] = cliente[key];
                            }
                        }
                    }

                    // Aplanar las estructuras de datos. En este punto, deben ser instancias válidas.
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

        // Si se encuentra, asegúrate de que sea una instancia rehidratada.
        // Si no es una instancia de Cliente, lo rehidratamos y actualizamos el array.
        if (clienteEncontrado && !(clienteEncontrado instanceof Cliente)) {
            console.warn(`Cliente ${id} encontrado como objeto plano en 'datos.clientes'. Rehidratando.`);
            
            let rehydratedCliente = new Cliente(clienteEncontrado.id, clienteEncontrado.nombre, clienteEncontrado.contrasena);
            rehydratedCliente.saldo = clienteEncontrado.saldo || 0;
            rehydratedCliente.puntos = clienteEncontrado.puntos || 0;
            rehydratedCliente.rango = clienteEncontrado.rango || "Bronce";
            rehydratedCliente.historialTransacciones = Array.isArray(clienteEncontrado.historialTransacciones) ? clienteEncontrado.historialTransacciones : [];

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

            if (clienteEncontrado.notificaciones) {
                const rehydratedNotificaciones = ListaCircular.fromPlainObject(clienteEncontrado.notificaciones);
                if (rehydratedNotificaciones) {
                    if (Array.isArray(rehydratedNotificaciones.elementos)) {
                        rehydratedNotificaciones.elementos = rehydratedNotificaciones.elementos.map(n => (n instanceof Notificacion) ? n : new Notificacion(n.mensaje, n.tipo, n.idTransaccion, n.leida));
                    }
                    rehydratedCliente.notificaciones = rehydratedNotificaciones;
                } else {
                    rehydratedCliente.notificaciones = new ListaCircular();
                }
            } else {
                rehydratedCliente.notificaciones = new ListaCircular();
            }
            
            // Reemplazar el objeto plano en 'datos.clientes' con la instancia rehidratada
            const index = datos.clientes.findIndex(c => c.id === id);
            if (index !== -1) {
                datos.clientes[index] = rehydratedCliente;
            }
            return rehydratedCliente;
        }
        return clienteEncontrado; // Si ya es una instancia de Cliente o si no se encontró
    }

    static agregarCliente(nuevoCliente) {
        if (!nuevoCliente || !nuevoCliente.id) {
            return "Error: Cliente inválido.";
        }
        // Asegurarse de que el nuevoCliente ya tiene las instancias correctas al agregarse
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
        const cliente = Storage.buscarCliente(idCliente); // Obtiene el cliente, ahora rehidratado
        if (cliente) {
            // Asegurarse de que las sub-estructuras sean instancias ANTES de usarlas
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
            // Reemplazar directamente con la instancia actualizada
            datos.clientes[index] = clienteActualizado;
            Storage.guardarDatos(); // Guardar todos los datos
            return true;
        }
        return false;
    }

    static obtenerTodosLosClientes() {
        // Asegúrate de que todos los clientes devueltos sean instancias rehidratadas
        return datos.clientes.map(c => {
             // Si por alguna razón un cliente en 'datos.clientes' no es una instancia,
             // lo rehidratamos aquí también. (Redundante si buscarCliente ya lo hace, pero seguro)
             if (!(c instanceof Cliente)) {
                 // Puedes usar el mismo proceso de rehidratación que en buscarCliente
                 return Storage.buscarCliente(c.id); // Llama a buscarCliente que ya sabe rehidratar y actualizar
             }
             return c;
         });
    }
}

Storage.inicializar();
export default Storage;