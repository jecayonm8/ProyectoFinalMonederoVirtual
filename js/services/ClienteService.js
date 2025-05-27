// js/services/ClienteService.js
import Storage from "../../database/storage.js";
import Cliente from "../models/Cliente.js";
import Monedero from "../models/Monedero.js";
import { PilaTransacciones } from "../models/Transaccion.js";
import grafoTransaccionesService from "./GrafoTransaccionesService.js";
import ColaPrioridad from "../dataStructures/ColaPrioridad.js";
import ListaCircular from "../dataStructures/ListaCircular.js";
import NotificacionService from "./NotificacionService.js";
import Notificacion from "../models/Notificacion.js";
import rangosService from "./RangosService.js";

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
        let clienteActualizado = null;
        
        // Función auxiliar para actualizar puntos
        const actualizarPuntos = (clienteObj) => {
            // Puntos base según el tipo de transacción
            let puntosBase = 0;
            if (transaccion.tipo === "deposito") {
                puntosBase = Math.floor(transaccion.monto / 100) * 1;
            } else if (transaccion.tipo === "retiro") {
                puntosBase = Math.floor(transaccion.monto / 100) * 2;
            } else if (transaccion.tipo === "transferencia") {
                puntosBase = Math.floor(transaccion.monto / 100) * 3;
            }
            
            // Guardar el rango actual para comparar después
            const rangoAnterior = clienteObj.rango || 'Bronce';
            
            // Aplicar multiplicador por rango exactamente como en la imagen
            const multiplicador = ClienteService.obtenerMultiplicadorPuntosPorRango(rangoAnterior);
            const puntosFinales = Math.floor(puntosBase * multiplicador);
            const nuevosPuntosTotales = clienteObj.puntos + puntosFinales;
            
            // Actualizar puntos en el cliente
            clienteObj.puntos = nuevosPuntosTotales;
            
            // Determinar nuevo rango
            const rangoNuevo = rangosService.determinarRango(nuevosPuntosTotales);
            clienteObj.rango = rangoNuevo;
            
            // Actualizar en el árbol AVL
            rangosService.actualizarPuntosCliente(clienteObj.id, nuevosPuntosTotales);
            
            // Verificar si hubo cambio de rango para notificar
            if (rangoAnterior !== rangoNuevo) {
                // El cliente subió de rango - enviar notificación
                let beneficiosTexto = '';
                
                switch(rangoNuevo) {
                    case 'Plata':
                        beneficiosTexto = '¡Obtienes un 10% extra de puntos (1.1x)!';
                        break;
                    case 'Oro':
                        beneficiosTexto = '¡Obtienes un 25% extra de puntos (1.25x) y 10% descuento en canjes!';
                        break;
                    case 'Platino':
                        beneficiosTexto = '¡Obtienes un 50% extra de puntos (1.5x) y 20% descuento en canjes!';
                        break;
                }
                
                const mensajeRango = `¡Felicidades! Has subido al rango ${rangoNuevo}. ${beneficiosTexto}`;
                NotificacionService.agregarNotificacion(clienteObj.id, new Notificacion(mensajeRango, 'importante', null));
            }
            
            // Notificar sobre los puntos ganados con el multiplicador aplicado
            const mensajePuntos = `Has ganado ${puntosFinales} puntos ${multiplicador !== 1 ? `(${puntosBase} base × ${multiplicador} por tu rango ${rangoAnterior})` : ''} por tu ${transaccion.tipo}.`;
            NotificacionService.agregarNotificacion(clienteObj.id, new Notificacion(mensajePuntos, 'informativo', transaccion.id));
            
            return clienteObj;
        };
        
        // Procesar el cliente actual si coincide con el ID
        if (cliente && cliente.id === idCliente) {
            clienteActualizado = actualizarPuntos(cliente);
            // Guardar cambios
            ClienteService.guardarClienteActualEnLocalStorage();
        } else {
            // Si es otro cliente, buscarlo y actualizarlo directamente en Storage
            const otroCliente = Storage.buscarCliente(idCliente);
            if (otroCliente) {
                clienteActualizado = actualizarPuntos(otroCliente);
                
                // Ya actualizamos el rango y los puntos en actualizarPuntos
                // Guardar cambios
                Storage.actualizarCliente(clienteActualizado);
            }
        }
    }

    static actualizarRango(cliente) { // Este método recibe la instancia de cliente
        // Usamos el RangosService con árboles AVL para determinar el rango
        cliente.rango = rangosService.determinarRango(cliente.puntos);
        // También actualizamos el cliente en el árbol AVL
        rangosService.agregarCliente(cliente);
    }

    static _determinarRango(puntos) { // Este método es privado y solo calcula el rango
        // Delegamos la determinación del rango al RangosService
        return rangosService.determinarRango(puntos);
    }

    static recalcularPuntosYRangos(idCliente) {
        let cliente = ClienteService.obtenerClienteActual(); // Obtener la instancia en memoria
        if (!cliente || cliente.id !== idCliente) {
            // Si no es el cliente actual, lo buscamos en Storage
            const clienteDesdeStorage = Storage.buscarCliente(idCliente);
            if (!clienteDesdeStorage) return;
            cliente = clienteDesdeStorage; // Usar el cliente obtenido del Storage
        }

        let puntosBase = 0;
        cliente.historialTransacciones.forEach(transaccion => {
            if (transaccion.tipo === "deposito") {
                puntosBase += Math.floor(transaccion.monto / 100) * 1;
            } else if (transaccion.tipo === "retiro") {
                puntosBase += Math.floor(transaccion.monto / 100) * 2;
            } else if (transaccion.tipo === "transferencia") {
                puntosBase += Math.floor(transaccion.monto / 100) * 3;
            }
        });
        
        // Determinar rango con los puntos base
        const rangoActual = rangosService.determinarRango(puntosBase);
        
        // Aplicar multiplicador según el rango (como se muestra en la imagen)
        const multiplicador = ClienteService.obtenerMultiplicadorPuntosPorRango(rangoActual);
        const puntosFinales = Math.floor(puntosBase * multiplicador);
        
        // Puede que el cliente suba de rango después de aplicar el multiplicador
        const rangoFinal = rangosService.determinarRango(puntosFinales);
        
        // Actualizar puntos y rango en el cliente
        cliente.puntos = puntosFinales;
        cliente.rango = rangoFinal;
        
        // Actualizar en el árbol AVL
        rangosService.actualizarPuntosCliente(cliente.id, puntosFinales);
        
        // Guardar los cambios
        Storage.actualizarCliente(cliente);
        if (cliente.id === ClienteService.obtenerClienteActual()?.id) {
            ClienteService.guardarClienteActualEnLocalStorage();
        }
        
        console.log(`Cliente ${cliente.id}: ${puntosBase} puntos base * ${multiplicador} (${rangoActual}) = ${puntosFinales} puntos finales (${rangoFinal})`);
        return cliente;
    }

    static obtenerMultiplicadorPuntosPorRango(rango) {
        // Usar los valores exactos de la imagen para los multiplicadores
        switch (rango) {
            case 'Bronce': return 1.0;  // 1.0x puntos
            case 'Plata': return 1.1;   // 1.1x puntos (10% más)
            case 'Oro': return 1.25;    // 1.25x puntos (25% más)
            case 'Platino': return 1.5; // 1.5x puntos (50% más)
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
    
    static cancelarBeneficioActivo(idBeneficio) {
        const cliente = ClienteService.obtenerClienteActual();
        if (!cliente) {
            return { exito: false, mensaje: 'No hay cliente logueado.' };
        }
        
        if (!cliente.beneficiosActivos || !Array.isArray(cliente.beneficiosActivos)) {
            return { exito: false, mensaje: 'No hay beneficios activos.' };
        }
        
        // Buscar el beneficio por su ID
        const beneficioIndex = cliente.beneficiosActivos.findIndex(b => b.id === idBeneficio);
        
        if (beneficioIndex === -1) {
            return { exito: false, mensaje: 'Beneficio no encontrado.' };
        }
        
        const beneficio = cliente.beneficiosActivos[beneficioIndex];
        
        // Verificar si el beneficio es cancelable
        if (beneficio.cancelable === false) {
            return { exito: false, mensaje: 'Este beneficio no se puede cancelar.' };
        }
        
        // Eliminar el beneficio de los activos
        cliente.beneficiosActivos.splice(beneficioIndex, 1);
        
        // Guardar los cambios
        ClienteService.guardarClienteActualEnLocalStorage();
        
        return { 
            exito: true, 
            mensaje: `Beneficio "${beneficio.nombre}" cancelado correctamente.` 
        };
    }



static guardarCliente(cliente) {
    Storage.actualizarCliente(cliente);
}

static crearMonederoParaCliente(idCliente, nombre, tipo, montoInicial = 0) {
    const cliente = Storage.buscarCliente(idCliente);
    if (!cliente) {
        return { exito: false, mensaje: "Cliente no encontrado." };
    }

    // Validar que no exista un monedero igual
    if (cliente.monederos.some(m => m.nombre === nombre && m.tipo === tipo)) {
        return { exito: false, mensaje: "Ya existe un monedero con ese nombre y tipo." };
    }

    // Validar saldo suficiente
    if (montoInicial > cliente.saldo) {
        return { exito: false, mensaje: "Saldo insuficiente en la cuenta principal." };
    }

    const monedero = new Monedero(Date.now().toString(), nombre, tipo);
    monedero.saldo = montoInicial;
    cliente.saldo -= montoInicial;
    cliente.monederos.push(monedero);
    
    // Generar notificación de creación de monedero
    NotificacionService.notificarOperacionMonedero(idCliente, nombre, 'creacion', montoInicial);

    ClienteService.guardarCliente(cliente);
    return { exito: true, monedero };
}

static transferirEntreMonederos(idCliente, idOrigen, idDestino, monto) {
    const cliente = Storage.buscarCliente(idCliente);
    if (!cliente) return { exito: false, mensaje: "Cliente no encontrado." };
    const origen = cliente.monederos.find(m => m.id === idOrigen);
    const destino = cliente.monederos.find(m => m.id === idDestino);

    if (!origen || !destino) return { exito: false, mensaje: "Monedero no encontrado." };
    if (origen.id === destino.id) return { exito: false, mensaje: "No puede transferir al mismo monedero." };
    if (monto <= 0 || monto > origen.saldo) return { exito: false, mensaje: "Monto inválido o saldo insuficiente." };

    origen.saldo -= monto;
    destino.saldo += monto;
    
    // Generar notificación de transferencia entre monederos
    const idOperacion = `transfer-monedero-${Date.now()}`;
    NotificacionService.notificarOperacionMonedero(idCliente, origen.nombre, 'transferencia', monto, destino.nombre, idOperacion);
    
    // Verificar si el saldo del monedero origen quedó bajo
    NotificacionService.alertaSaldoBajoMonedero(idCliente, origen.id, origen.nombre);
    
    // Actualizar el grafo de transacciones para mostrar la relación entre monederos
    try {
        // Añadir la transferencia al grafo
        grafoTransaccionesService.añadirTransferenciaEntreMonederos(idCliente, idOrigen, idDestino, monto);
        console.log(`Transferencia añadida al grafo: ${idCliente}-${idOrigen} -> ${idCliente}-${idDestino} ($${monto})`);
    } catch (error) {
        console.error("Error al añadir la transferencia al grafo:", error);
    }
    
    ClienteService.guardarCliente(cliente); 
    return { exito: true, mensaje: `Transferencia exitosa de ${monto} de ${origen.nombre} a ${destino.nombre}` };
}

static agregarSaldoAMonedero(idCliente, idMonedero, monto) {
    const cliente = Storage.buscarCliente(idCliente);
    if (!cliente) return { exito: false, mensaje: "Cliente no encontrado." };
    const monedero = cliente.monederos.find(m => m.id === idMonedero);
    if (!monedero) return { exito: false, mensaje: "Monedero no encontrado." };
    if (monto <= 0) return { exito: false, mensaje: "Monto inválido." };
    if (monto > cliente.saldo) return { exito: false, mensaje: "Saldo insuficiente en la cuenta principal." };

    cliente.saldo -= monto;
    monedero.saldo += monto;
    
    // Generar notificación de depósito en monedero
    NotificacionService.notificarOperacionMonedero(idCliente, monedero.nombre, 'deposito', monto);
    
    // Verificar si el saldo de la cuenta principal quedó bajo
    NotificacionService.generarAlertaSaldoBajo(idCliente);
    
    ClienteService.guardarCliente(cliente);
    return { exito: true, mensaje: "Saldo agregado correctamente." };
}

static retirarSaldoDeMonedero(idCliente, idMonedero, monto) {
    const cliente = Storage.buscarCliente(idCliente);
    if (!cliente) return { exito: false, mensaje: "Cliente no encontrado." };
    const monedero = cliente.monederos.find(m => m.id === idMonedero);
    if (!monedero) return { exito: false, mensaje: "Monedero no encontrado." };
    if (monto <= 0) return { exito: false, mensaje: "Monto inválido." };
    if (monto > monedero.saldo) return { exito: false, mensaje: "Saldo insuficiente en el monedero." };

    monedero.saldo -= monto;
    cliente.saldo += monto;
    
    // Generar notificación de retiro de monedero
    NotificacionService.notificarOperacionMonedero(idCliente, monedero.nombre, 'retiro', monto);
    
    // Verificar si el saldo del monedero quedó bajo
    NotificacionService.alertaSaldoBajoMonedero(idCliente, monedero.id, monedero.nombre);
    
    ClienteService.guardarCliente(cliente);
    return { exito: true, mensaje: "Saldo retirado correctamente." };
}

static eliminarMonedero(idCliente, idMonedero) {
    const cliente = Storage.buscarCliente(idCliente);
    if (!cliente) return { exito: false, mensaje: "Cliente no encontrado." };
    const index = cliente.monederos.findIndex(m => m.id === idMonedero);
    if (index === -1) return { exito: false, mensaje: "Monedero no encontrado." };

    // Devuelve el saldo del monedero eliminado a la cuenta principal
    const saldoADevolver = cliente.monederos[index].saldo;
    const nombreMonedero = cliente.monederos[index].nombre;
    cliente.saldo += saldoADevolver;
    cliente.monederos.splice(index, 1);
    
    // Generar notificación de eliminación de monedero
    NotificacionService.notificarOperacionMonedero(idCliente, nombreMonedero, 'eliminacion', saldoADevolver);

    ClienteService.guardarCliente(cliente);
    return { exito: true, mensaje: "Monedero eliminado y saldo devuelto a la cuenta principal." };
}


    static obtenerTodosLosClientes() {
        return Storage.obtenerTodosLosClientes();
    }
    
    static limpiarHistorialTransacciones() {
        const cliente = ClienteService.obtenerClienteActual();
        if (cliente) {
            // Limpiamos el historial de transacciones pero mantenemos el saldo actual
            cliente.historialTransacciones = [];
            // También limpiamos la pila de transacciones reversibles
            cliente.pilaTransaccionesReversibles = new PilaTransacciones();
            // Guardamos los cambios
            ClienteService.guardarClienteActualEnLocalStorage();
            return true;
        }
        return false;
    }
}

// Llama a inicializarClienteActual tan pronto como el script se cargue,
// pero asegúrate de que Storage ya esté inicializado (importación en la parte superior ayuda con esto).
ClienteService.inicializarClienteActual(); 

export default ClienteService;