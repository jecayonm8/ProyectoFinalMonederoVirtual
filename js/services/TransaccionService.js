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
        
        // Calcular cargo por retiro: $5 o 1% del monto, el que sea menor
        let cargo = Math.min(5, monto * 0.01);
        let cargoFinal = cargo;
        
        // Verificar si hay beneficios activos que reduzcan el cargo
        if (cliente.beneficiosActivos && cliente.beneficiosActivos.length > 0) {
            const resultadoBeneficio = ClienteService.aplicarBeneficioEnTransaccion('retiro', monto);
            if (resultadoBeneficio && resultadoBeneficio.descuento > 0) {
                cargoFinal = Math.max(0, cargo - resultadoBeneficio.descuento);
            }
        }
        
        // Verificar si hay saldo suficiente para el monto y el cargo
        if (cliente.saldo < (monto + cargoFinal)) {
            return `Error: Saldo insuficiente para el retiro y el cargo (Retiro: $${monto.toFixed(2)}, Cargo: $${cargoFinal.toFixed(2)}).`;
        }

        const montoTotal = monto + cargoFinal;
        cliente.saldo -= montoTotal;
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
        // Guardar el cargo en la transacción
        transaccion.cargo = cargoFinal;
        transaccion.montoTotal = montoTotal;
        
        ClienteService.agregarTransaccionACliente(cliente.id, transaccion); // Ya agrega a historial y pila

        // Actualizar puntos
        ClienteService.actualizarPuntosPorTransaccion(cliente.id, transaccion);

        // Notificaciones:
        let detallesCargo = cargoFinal > 0 ? ` (Cargo por retiro: $${cargoFinal.toFixed(2)})` : " (Sin cargo por retiro)";
        const mensajeConfirmacion = `Retiro de $${monto.toFixed(2)} realizado con éxito${detallesCargo}. Nuevo saldo: $${cliente.saldo.toFixed(2)}.`;
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
    static async realizarTransferencia(idClienteOrigen, idClienteDestino, monto, categoria = null) {
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
        
        // Calcular comisión por transferencia: 3% del monto
        // Aplicar comisión del 12% al monto de la transferencia
        const comisionBase = monto * 0.12;
        let comisionFinal = comisionBase;
        let beneficioUsado = null;
        let mensajeBeneficio = "";

        try {
            // Verificar y aplicar beneficios activos para reducir la comisión
            const resultadoBeneficio = await ClienteService.aplicarBeneficioEnTransaccion('transferencia', monto);
            if (resultadoBeneficio && resultadoBeneficio.descuento > 0) {
                const descuentoComision = resultadoBeneficio.descuento;
                // Mantener beneficioUsado para compatibilidad con código existente
                beneficioUsado = resultadoBeneficio.beneficioUsado;
                comisionFinal = Math.max(0, comisionBase - descuentoComision);
                
                // Mostrar todos los beneficios usados
                if (resultadoBeneficio.beneficiosUsados && resultadoBeneficio.beneficiosUsados.length > 0) {
                    mensajeBeneficio = ` ¡Beneficios aplicados: `;
                    
                    // Concatenar todos los beneficios aplicados
                    resultadoBeneficio.beneficiosUsados.forEach((beneficio, index) => {
                        mensajeBeneficio += `${beneficio.nombre}`;
                        // Agregar coma si no es el último beneficio
                        if (index < resultadoBeneficio.beneficiosUsados.length - 1) {
                            mensajeBeneficio += `, `;
                        }
                    });
                    
                    mensajeBeneficio += `! Ahorro total en comisión: $${descuentoComision.toFixed(2)}.`;
                }
            }
        } catch (error) {
            console.warn('Error al aplicar beneficios:', error);
        }

        // Calcular el monto total que necesita el cliente (monto + comisión)
        const montoTotal = monto + comisionFinal;

        if (clienteOrigen.saldo < montoTotal) {
            return `Error: Saldo insuficiente en la cuenta de origen para cubrir el monto y la comisión (Monto: $${monto.toFixed(2)}, Comisión: $${comisionFinal.toFixed(2)}).`;
        }

        // Realizar la transferencia con el monto y la comisión
        clienteOrigen.saldo -= montoTotal; // Monto + comisión
        clienteDestino.saldo += monto; // El destinatario recibe el monto completo
        
        // Nota: La comisión ($${comisionFinal.toFixed(2)}) se queda con el banco y no va al destinatario

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
        // Guardar la comisión en la transacción
        transaccionOrigen.comision = comisionFinal;
        transaccionOrigen.montoTotal = montoTotal;
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
        let detallesComision = comisionFinal > 0 ? ` (Comisión: $${comisionFinal.toFixed(2)})` : " (Sin comisión)";
        const mensajeOrigen = `Transferencia de $${monto.toFixed(2)} a ${clienteDestino.nombre} (ID: ${idClienteDestino}) realizada.${mensajeBeneficio}${detallesComision} Nuevo saldo: $${clienteOrigen.saldo.toFixed(2)}.`;
        NotificacionService.agregarNotificacion(idClienteOrigen, new Notificacion(mensajeOrigen, 'informativo', transaccionOrigen.id));
        NotificacionService.generarAlertaSaldoBajo(idClienteOrigen); // Verifica saldo del origen

        // Notificación mejorada para el destinatario
        const fechaHora = new Date().toLocaleString();
        const categoriaTransf = categoria ? `Categoría: ${categoria}` : 'Sin categoría';
        const mensajeDestino = `¡Has recibido una transferencia! \n\n` +
                              `• Monto: $${monto.toFixed(2)} \n` +
                              `• Remitente: ${clienteOrigen.nombre} (ID: ${idClienteOrigen}) \n` +
                              `• Fecha y hora: ${fechaHora} \n` +
                              `• ${categoriaTransf} \n` +
                              `• Nuevo saldo: $${clienteDestino.saldo.toFixed(2)}`;
                              
        // Enviamos la notificación como importante para que destaque
        NotificacionService.agregarNotificacion(idClienteDestino, new Notificacion(mensajeDestino, 'importante', transaccionDestino.id));
        
        // También actualizamos los puntos del destinatario si recibe una transferencia
        // Esto permite que gane puntos por recibir transferencias
        ClienteService.actualizarPuntosPorTransaccion(idClienteDestino, transaccionDestino);
        
        NotificacionService.generarAlertaSaldoBajo(idClienteDestino); // Verifica saldo del destino

        Storage.guardarDatos(); // Guardar explícitamente después de todas las operaciones
        
        let mensajeRetorno = `Transferencia de ${monto.toFixed(2)} a ${idClienteDestino} realizada con éxito.`;
        if (comisionFinal > 0) {
            mensajeRetorno += ` ${mensajeBeneficio} Comisión: $${comisionFinal.toFixed(2)}.`;
        }
        
        return mensajeRetorno;
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
            const clienteActualizado = ClienteService.recalcularPuntosYRangos(cliente.id);

            // Notificación de reversión exitosa
            NotificacionService.agregarNotificacion(idCliente, new Notificacion(mensajeReversion, 'informativo', transaccionARevertir.id));
            
            // Notificación sobre los puntos actualizados
            if (clienteActualizado) {
                const mensajePuntos = `Tus puntos han sido recalculados. Puntos actuales: ${clienteActualizado.puntos}. Rango: ${clienteActualizado.rango}.`;
                NotificacionService.agregarNotificacion(idCliente, new Notificacion(mensajePuntos, 'informativo', null));
            }
            
            NotificacionService.generarAlertaSaldoBajo(idCliente); // Verifica saldo del cliente después de la reversión

            // Si la reversión fue de una transferencia, también notificar y recalcular para el cliente destino
            if (transaccionARevertir.tipo === "transferencia" && transaccionARevertir.idClienteDestino) {
                // Recalcular puntos del cliente destino
                const clienteDestinoActualizado = ClienteService.recalcularPuntosYRangos(transaccionARevertir.idClienteDestino);
                
                // Notificación principal sobre la reversión
                NotificacionService.agregarNotificacion(transaccionARevertir.idClienteDestino, 
                    new Notificacion(`Se ha revertido una transacción recibida de $${transaccionARevertir.monto.toFixed(2)} de ${idCliente}. Tu saldo ha sido ajustado.`, 
                    'alerta', transaccionARevertir.id));
                
                // Notificación sobre los puntos actualizados para el cliente destino
                if (clienteDestinoActualizado) {
                    const mensajePuntosDestino = `Tus puntos han sido recalculados debido a una transacción revertida. Puntos actuales: ${clienteDestinoActualizado.puntos}. Rango: ${clienteDestinoActualizado.rango}.`;
                    NotificacionService.agregarNotificacion(transaccionARevertir.idClienteDestino, 
                        new Notificacion(mensajePuntosDestino, 'informativo', null));
                }
                
                NotificacionService.generarAlertaSaldoBajo(transaccionARevertir.idClienteDestino);
            }
        } else {
            // Notificación de reversión fallida
            NotificacionService.agregarNotificacion(idCliente, new Notificacion(mensajeReversion, 'error', transaccionARevertir.id));
        }

        Storage.guardarDatos();
        return mensajeReversion;
    }

    /**
     * Cancela una transacción específica por su ID desde el historial de un cliente
     * @param {string} idCliente - ID del cliente que desea cancelar la transacción
     * @param {string} idTransaccion - ID de la transacción a cancelar
     * @returns {string} Mensaje de éxito o error
     */
    static cancelarTransaccion(idCliente, idTransaccion) {
        const cliente = ClienteService.buscarClientePorId(idCliente);
        if (!cliente) {
            return "Error: Cliente no encontrado.";
        }

        // Buscar la transacción en el historial del cliente
        const transaccion = cliente.historialTransacciones.find(t => t.id === idTransaccion);
        if (!transaccion) {
            return "Error: Transacción no encontrada en el historial.";
        }

        // Verificar si la transacción es reciente (menos de 24 horas)
        const ahora = new Date();
        const fechaTransaccion = new Date(transaccion.fecha);
        const diferenciaHoras = (ahora - fechaTransaccion) / (1000 * 60 * 60);
        
        if (diferenciaHoras > 24) {
            return "Error: Solo se pueden cancelar transacciones realizadas en las últimas 24 horas.";
        }

        let mensajeCancelacion = "";
        let cancelacionExitosa = false;

        switch (transaccion.tipo) {
            case "deposito":
                // Verificar si hay saldo suficiente para revertir el depósito
                if (cliente.saldo >= transaccion.monto) {
                    cliente.saldo -= transaccion.monto;
                    mensajeCancelacion = `Depósito de $${transaccion.monto.toFixed(2)} cancelado exitosamente.`;
                    cancelacionExitosa = true;
                } else {
                    mensajeCancelacion = `Error: Saldo insuficiente para cancelar el depósito de $${transaccion.monto.toFixed(2)}.`;
                }
                break;

            case "retiro":
                // Devolver el dinero a la cuenta
                cliente.saldo += transaccion.monto;
                mensajeCancelacion = `Retiro de $${transaccion.monto.toFixed(2)} cancelado exitosamente.`;
                cancelacionExitosa = true;
                break;

            case "transferencia":
                const clienteDestino = ClienteService.buscarClientePorId(transaccion.idClienteDestino);
                if (!clienteDestino) {
                    mensajeCancelacion = "Error: Cliente destino no encontrado. No se puede cancelar la transferencia.";
                    break;
                }

                // Verificar si el destinatario tiene saldo suficiente para devolver
                if (clienteDestino.saldo >= transaccion.monto) {
                    // Revertir la transferencia
                    clienteDestino.saldo -= transaccion.monto;
                    
                    // Devolver el monto completo (incluida la comisión) al remitente
                    // Aquí asumimos que la comisión era el 12% al momento de la transferencia
                    const comisionEstimada = transaccion.monto * 0.12;
                    cliente.saldo += transaccion.monto + comisionEstimada;
                    
                    mensajeCancelacion = `Transferencia de $${transaccion.monto.toFixed(2)} a ${clienteDestino.nombre} cancelada exitosamente.`;
                    cancelacionExitosa = true;
                    
                    // Agregar notificación al cliente destino
                    if (NotificacionService) {
                        NotificacionService.agregarNotificacion(
                            transaccion.idClienteDestino, 
                            {
                                mensaje: `Una transferencia de $${transaccion.monto.toFixed(2)} recibida de ${cliente.nombre} ha sido cancelada.`,
                                tipo: 'alerta',
                                idReferencia: transaccion.id
                            }
                        );
                    }
                    
                    // Eliminar la transacción del historial del destinatario
                    clienteDestino.historialTransacciones = clienteDestino.historialTransacciones.filter(
                        t => !(t.tipo === 'recepcion' && t.idClienteOrigen === idCliente && t.monto === transaccion.monto && new Date(t.fecha).getTime() === fechaTransaccion.getTime())
                    );
                } else {
                    mensajeCancelacion = `Error: El destinatario no tiene saldo suficiente para devolver $${transaccion.monto.toFixed(2)}.`;
                }
                break;

            case "recepcion":
                mensajeCancelacion = "Error: Las recepciones de transferencias solo pueden ser canceladas por el remitente.";
                break;

            default:
                mensajeCancelacion = "Error: Tipo de transacción desconocido.";
        }

        if (cancelacionExitosa) {
            // Eliminar la transacción del historial
            cliente.historialTransacciones = cliente.historialTransacciones.filter(t => t.id !== idTransaccion);
            
            // Recalcular puntos y rango del cliente después de cancelar la transacción
            ClienteService.recalcularPuntosYRangos(idCliente);
            
            // Si fue una transferencia, también recalcular puntos del cliente destino
            if (transaccion.tipo === "transferencia" && transaccion.idClienteDestino) {
                ClienteService.recalcularPuntosYRangos(transaccion.idClienteDestino);
            }
            
            // Agregar notificación sobre la cancelación
            if (NotificacionService) {
                // Notificación principal sobre la cancelación
                NotificacionService.agregarNotificacion(
                    idCliente, 
                    new Notificacion(
                        mensajeCancelacion,
                        'informativo',
                        transaccion.id
                    )
                );
                
                // Notificación adicional sobre los puntos actualizados
                const clienteActualizado = ClienteService.buscarClientePorId(idCliente);
                if (clienteActualizado) {
                    const mensajePuntos = `Tus puntos han sido recalculados. Puntos actuales: ${clienteActualizado.puntos}. Rango: ${clienteActualizado.rango}.`;
                    NotificacionService.agregarNotificacion(
                        idCliente,
                        new Notificacion(
                            mensajePuntos,
                            'informativo',
                            null
                        )
                    );
                }
            }
            
            // Guardar los cambios
            Storage.guardarDatos();
        }

        return mensajeCancelacion;
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