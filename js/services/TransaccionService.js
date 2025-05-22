// js/services/TransaccionService.js
import ClienteService from "./ClienteService.js";
import Transaccion from "../models/Transaccion.js";
import Storage from "../../database/storage.js"; // Para guardar los datos
import NotificacionService from "./NotificacionService.js"; // <-- ¡NUEVO! Importa NotificacionService
import Notificacion from "../models/Notificacion.js";     // <-- ¡NUEVO! Importa Notificacion

class TransaccionService {
    static generarIdTransaccion() {
        return `TRX-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }

    /**
     * Realiza un depósito en la cuenta de un cliente.
     * @param {string} idCliente ID del cliente.
     * @param {number} monto Monto a depositar.
     * @param {string} tipoCuenta Tipo de cuenta (ej. 'ahorros', 'nomina').
     * @param {string} metodoPago Método de pago (ej. 'tarjeta_credito', 'transferencia_bancaria').
     * @param {string} [categoria=null] Categoría de la transacción (opcional).
     * @returns {string} Mensaje de éxito o error.
     */
    static realizarDeposito(idCliente, monto, tipoCuenta, metodoPago, categoria = null) {
        const cliente = ClienteService.buscarClientePorId(idCliente);
        if (!cliente) {
            return "Error: Cliente no encontrado.";
        }
        if (monto <= 0) {
            return "Error: El monto del depósito debe ser positivo.";
        }

        cliente.saldo += monto;
        const idTransaccion = TransaccionService.generarIdTransaccion();
        const transaccion = new Transaccion(
            idTransaccion,
            "deposito",
            monto,
            idCliente,
            new Date(),
            null, // idClienteDestino
            tipoCuenta,
            metodoPago,
            categoria
        );

        // ClienteService.agregarTransaccionACliente también guarda datos y actualiza puntos,
        // pero aquí solo nos aseguraremos de que la transacción se añada y luego manejamos las notificaciones.
        ClienteService.agregarTransaccionACliente(cliente.id, transaccion); // Ya agrega a historial y pila

        // Actualizar puntos
        ClienteService.actualizarPuntosPorTransaccion(cliente.id, transaccion);

        // Notificaciones:
        const mensajeConfirmacion = `Depósito de $${monto.toFixed(2)} realizado con éxito. Nuevo saldo: $${cliente.saldo.toFixed(2)}.`;
        NotificacionService.agregarNotificacion(cliente.id, new Notificacion(mensajeConfirmacion, 'informativo', transaccion.id));
        NotificacionService.generarAlertaSaldoBajo(cliente.id); // Verifica si necesita alerta de saldo bajo

        Storage.guardarDatos(); // Guardar explícitamente después de todas las operaciones
        return `Depósito de ${monto.toFixed(2)} realizado con éxito. Nuevo saldo: ${cliente.saldo.toFixed(2)}.`;
    }

    /**
     * Realiza un retiro de la cuenta de un cliente.
     * @param {string} idCliente ID del cliente.
     * @param {number} monto Monto a retirar.
     * @param {string} [categoria=null] Categoría del retiro (opcional).
     * @returns {string} Mensaje de éxito o error.
     */
    static realizarRetiro(idCliente, monto, categoria = null) {
        const cliente = ClienteService.buscarClientePorId(idCliente);
        if (!cliente) {
            return "Error: Cliente no encontrado.";
        }
        if (monto <= 0) {
            return "Error: El monto del retiro debe ser positivo.";
        }
        if (cliente.saldo < monto) {
            return "Error: Saldo insuficiente.";
        }

        cliente.saldo -= monto;
        const idTransaccion = TransaccionService.generarIdTransaccion();
        const transaccion = new Transaccion(
            idTransaccion,
            "retiro",
            monto,
            idCliente,
            new Date(),
            null, // idClienteDestino
            null, // tipoCuenta
            null, // metodoPago
            categoria
        );
        ClienteService.agregarTransaccionACliente(cliente.id, transaccion); // Ya agrega a historial y pila

        // Actualizar puntos
        ClienteService.actualizarPuntosPorTransaccion(cliente.id, transaccion);

        // Notificaciones:
        const mensajeConfirmacion = `Retiro de $${monto.toFixed(2)} realizado con éxito. Nuevo saldo: $${cliente.saldo.toFixed(2)}.`;
        NotificacionService.agregarNotificacion(cliente.id, new Notificacion(mensajeConfirmacion, 'informativo', transaccion.id));
        NotificacionService.generarAlertaSaldoBajo(cliente.id); // Verifica si necesita alerta de saldo bajo

        Storage.guardarDatos(); // Guardar explícitamente después de todas las operaciones
        return `Retiro de ${monto.toFixed(2)} realizado con éxito. Nuevo saldo: ${cliente.saldo.toFixed(2)}.`;
    }

    /**
     * Realiza una transferencia entre dos clientes.
     * @param {string} idClienteOrigen ID del cliente que envía.
     * @param {string} idClienteDestino ID del cliente que recibe.
     * @param {number} monto Monto a transferir.
     * @param {string} [categoria=null] Categoría de la transferencia (opcional).
     * @returns {string} Mensaje de éxito o error.
     */
    static realizarTransferencia(idClienteOrigen, idClienteDestino, monto, categoria = null) {
        if (idClienteOrigen === idClienteDestino) {
            return "Error: No se puede transferir dinero a la misma cuenta.";
        }
        if (monto <= 0) {
            return "Error: El monto de la transferencia debe ser positivo.";
        }

        const clienteOrigen = ClienteService.buscarClientePorId(idClienteOrigen);
        const clienteDestino = ClienteService.buscarClientePorId(idClienteDestino);

        if (!clienteOrigen || !clienteDestino) {
            return "Error: Cliente de origen o destino no encontrado.";
        }
        if (clienteOrigen.saldo < monto) {
            return "Error: Saldo insuficiente en la cuenta de origen.";
        }

        // Realizar la transferencia
        clienteOrigen.saldo -= monto;
        clienteDestino.saldo += monto;

        const idTransaccion = TransaccionService.generarIdTransaccion();
        const fechaTransaccion = new Date();

        // Transacción para el cliente de origen (tipo 'transferencia')
        const transaccionOrigen = new Transaccion(
            idTransaccion,
            "transferencia",
            monto,
            idClienteOrigen,
            fechaTransaccion,
            idClienteDestino,
            null,
            null,
            categoria
        );
        ClienteService.agregarTransaccionACliente(clienteOrigen.id, transaccionOrigen); // Agrega a historial y pila
        ClienteService.actualizarPuntosPorTransaccion(clienteOrigen.id, transaccionOrigen);

        // Transacción para el cliente de destino (tipo 'recepcion')
        const transaccionDestino = new Transaccion(
            idTransaccion, // Mismo ID para ambas partes de la transferencia
            "recepcion",
            monto,
            idClienteDestino,
            fechaTransaccion,
            idClienteOrigen,
            null,
            null,
            `Recibido de ${idClienteOrigen}` // Categoría automática para recepción
        );
        ClienteService.agregarTransaccionACliente(clienteDestino.id, transaccionDestino); // Agrega a historial y pila
        // No se actualizan puntos para recepciones por defecto, pero podrías añadirlo si tu lógica lo requiere.

        // Notificaciones para ambas partes de la transferencia:
        NotificacionService.agregarNotificacion(idClienteOrigen, new Notificacion(`Transferencia de $${monto.toFixed(2)} a ${clienteDestino.nombre} (ID: ${idClienteDestino}) realizada. Nuevo saldo: $${clienteOrigen.saldo.toFixed(2)}.`, 'informativo', transaccionOrigen.id));
        NotificacionService.generarAlertaSaldoBajo(idClienteOrigen); // Verifica saldo del origen

        NotificacionService.agregarNotificacion(idClienteDestino, new Notificacion(`Has recibido $${monto.toFixed(2)} de ${clienteOrigen.nombre} (ID: ${idClienteOrigen}). Nuevo saldo: $${clienteDestino.saldo.toFixed(2)}.`, 'informativo', transaccionDestino.id));
        NotificacionService.generarAlertaSaldoBajo(idClienteDestino); // Verifica saldo del destino

        Storage.guardarDatos(); // Guardar explícitamente después de todas las operaciones
        return `Transferencia de ${monto.toFixed(2)} a ${idClienteDestino} realizada con éxito.`;
    }

    /**
     * Intenta revertir la última transacción de un cliente.
     * @param {string} idCliente ID del cliente.
     * @returns {string} Mensaje de éxito o error.
     */
    static revertirUltimaTransaccion(idCliente) {
        const cliente = ClienteService.buscarClientePorId(idCliente);
        if (!cliente) {
            return "Error: Cliente no encontrado.";
        }

        const transaccionARevertir = cliente.pilaTransaccionesReversibles.pop();

        if (!transaccionARevertir) {
            return "No hay transacciones reversibles para este cliente.";
        }

        let mensajeReversion = "";
        let reversionExitosa = false;

        switch (transaccionARevertir.tipo) {
            case "deposito":
                if (cliente.saldo >= transaccionARevertir.monto) {
                    cliente.saldo -= transaccionARevertir.monto;
                    mensajeReversion = `Depósito de ${transaccionARevertir.monto.toFixed(2)} revertido.`;
                    reversionExitosa = true;
                } else {
                    cliente.pilaTransaccionesReversibles.push(transaccionARevertir);
                    mensajeReversion = "Error: Saldo insuficiente para revertir depósito. La transacción no fue revertida.";
                }
                break;
            case "retiro":
                cliente.saldo += transaccionARevertir.monto;
                mensajeReversion = `Retiro de ${transaccionARevertir.monto.toFixed(2)} revertido.`;
                reversionExitosa = true;
                break;
            case "transferencia":
                const clienteDestino = ClienteService.buscarClientePorId(transaccionARevertir.idClienteDestino);
                if (clienteDestino && clienteDestino.saldo >= transaccionARevertir.monto) {
                    cliente.saldo += transaccionARevertir.monto;
                    clienteDestino.saldo -= transaccionARevertir.monto;

                    // NOTA: Revertir la transacción de 'recepcion' del cliente destino
                    // Requiere que tengas los IDs de transaccion únicos por cada 'lado'
                    // o una forma de encontrar la transacción de recepción por su ID de transferencia compartido.
                    // Si 'idTransaccion' es el mismo para origen y destino, puedes buscarlo así:
                    clienteDestino.historialTransacciones = clienteDestino.historialTransacciones.filter(
                        (t) => t.id !== transaccionARevertir.id || t.tipo !== 'recepcion' // Asegura que solo borras la 'recepcion' asociada
                    );
                    // También, si la recepción fue reversible, quítala de su pila
                    if (clienteDestino.pilaTransaccionesReversibles instanceof PilaTransacciones) {
                        clienteDestino.pilaTransaccionesReversibles.transacciones = clienteDestino.pilaTransaccionesReversibles.transacciones.filter(
                            (t) => t.id !== transaccionARevertir.id || t.tipo !== 'recepcion'
                        );
                    }

                    mensajeReversion = `Transferencia de ${transaccionARevertir.monto.toFixed(2)} a ${transaccionARevertir.idClienteDestino} revertida.`;
                    reversionExitosa = true;
                } else {
                    cliente.pilaTransaccionesReversibles.push(transaccionARevertir);
                    mensajeReversion = "Error: No se pudo revertir la transferencia (cliente destino no encontrado o saldo insuficiente en destino). La transacción no fue revertida.";
                }
                break;
            case "recepcion":
                cliente.pilaTransaccionesReversibles.push(transaccionARevertir); // No revertir aquí
                mensajeReversion = "Error: Las transacciones de recepción no pueden ser revertidas directamente.";
                break;
            default:
                cliente.pilaTransaccionesReversibles.push(transaccionARevertir);
                mensajeReversion = "Error: Tipo de transacción desconocido para revertir.";
        }

        if (reversionExitosa) {
            // Eliminar la transacción revertida del historial del cliente de origen
            cliente.historialTransacciones = cliente.historialTransacciones.filter(
                (t) => t.id !== transaccionARevertir.id || t.tipo !== transaccionARevertir.tipo // Filtra por ID y tipo para mayor precisión
            );

            // Recalcular puntos y rango después de la reversión
            ClienteService.recalcularPuntosYRangos(cliente.id); // Asegúrate de que este método existe y funciona correctamente.

            // Notificación de reversión exitosa
            NotificacionService.agregarNotificacion(idCliente, new Notificacion(mensajeReversion, 'informativo', transaccionARevertir.id));
            NotificacionService.generarAlertaSaldoBajo(idCliente); // Verifica saldo del cliente después de la reversión

            // Si la reversión fue de una transferencia, también notificar al cliente destino
            if (transaccionARevertir.tipo === "transferencia" && transaccionARevertir.idClienteDestino) {
                NotificacionService.agregarNotificacion(transaccionARevertir.idClienteDestino, new Notificacion(`Se ha revertido una transacción recibida de $${transaccionARevertir.monto.toFixed(2)} de ${idCliente}. Tu saldo ha sido ajustado.`, 'alerta', transaccionARevertir.id));
                NotificacionService.generarAlertaSaldoBajo(transaccionARevertir.idClienteDestino);
            }
        } else {
            // Notificación de reversión fallida
            NotificacionService.agregarNotificacion(idCliente, new Notificacion(mensajeReversion, 'error', transaccionARevertir.id));
        }

        Storage.guardarDatos();
        return mensajeReversion;
    }

    // Método para procesar transacciones programadas (si lo tienes)
    static procesarTransaccionesProgramadas() {
        const clientes = ClienteService.obtenerTodosLosClientes();
        const ahora = new Date();

        clientes.forEach(cliente => {
            if (cliente.transaccionesProgramadas && cliente.transaccionesProgramadas instanceof ColaPrioridad) {
                // Generar recordatorios para transacciones próximas (ej. en las próximas 24 horas)
                NotificacionService.generarRecordatorioTransaccionesProgramadas(cliente.id);

                // Procesar transacciones que ya vencieron
                let transaccionesPendientes = cliente.transaccionesProgramadas.obtenerElementos();
                for (let i = 0; i < transaccionesPendientes.length; i++) {
                    const tp = transaccionesPendientes[i];
                    const fechaProgramada = new Date(tp.fechaProgramada);

                    if (fechaProgramada <= ahora && !tp.ejecutada) {
                        let resultado = "";
                        if (tp.tipo === "deposito") {
                            resultado = TransaccionService.realizarDeposito(tp.idClienteOrigen, tp.monto, tp.tipoCuenta, tp.metodoPago, tp.categoria);
                        } else if (tp.tipo === "retiro") {
                            resultado = TransaccionService.realizarRetiro(tp.idClienteOrigen, tp.monto, tp.categoria);
                        } else if (tp.tipo === "transferencia") {
                            resultado = TransaccionService.realizarTransferencia(tp.idClienteOrigen, tp.idClienteDestino, tp.monto, tp.categoria);
                        }

                        // Marcar transacción programada como ejecutada
                        tp.ejecutada = true;
                        // Notificar al cliente sobre la ejecución de la transacción programada
                        NotificacionService.agregarNotificacion(cliente.id, new Notificacion(`Transacción programada de $${tp.monto.toFixed(2)} (${tp.tipo}) ejecutada. Resultado: ${resultado}`, 'informativo', tp.id));
                    }
                }
                // Si la cola de prioridad no maneja "marcar como ejecutada" automáticamente,
                // necesitarías reconstruirla o limpiarla de transacciones ya procesadas.
                // Por ahora, asumimos que 'ejecutada' es suficiente para no reprocesar.
            }
        });
        Storage.guardarDatos(); // Guardar después de procesar transacciones programadas
    }
}

export default TransaccionService;