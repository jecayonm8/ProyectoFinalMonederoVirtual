// js/services/TransaccionProgramadaService.js
import ClienteService from "./ClienteService.js";
import TransaccionProgramada from "../models/TransaccionProgramada.js";
import TransaccionService from "./TransaccionService.js"; // Para ejecutar las transacciones reales
import Storage from "../../database/storage.js"; // Para guardar los datos
import ColaPrioridad from "../dataStructures/ColaPrioridad.js"; //

class TransaccionProgramadaService {

    static generarIdTransaccionProgramada() {
        return `TP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }

    /**
     * Programa una nueva transacción para un cliente.
     * @param {string} idCliente El ID del cliente que programa la transacción.
     * @param {string} tipo Tipo de transacción ('deposito', 'retiro', 'transferencia').
     * @param {number} monto Monto de la transacción.
     * @param {Date} fechaEjecucion Fecha y hora en que se debe ejecutar.
     * @param {string} frecuencia Frecuencia de la transacción ('unica', 'diaria', 'semanal', 'mensual', 'anual').
     * @param {string} [idClienteDestino=null] ID del cliente destino (para transferencias).
     * @param {string} [tipoCuenta=null] Tipo de cuenta (para depósitos).
     * @param {string} [metodoPago=null] Método de pago (para depósitos).
     * @returns {string} Mensaje de éxito o error.
     */
    static programarTransaccion(
        idCliente,
        tipo,
        monto,
        fechaEjecucion,
        frecuencia = 'unica',
        idClienteDestino = null,
        tipoCuenta = null,
        metodoPago = null
    ) {
        const cliente = ClienteService.buscarClientePorId(idCliente);
        if (!cliente) {
            return "Error: Cliente no encontrado.";
        }
        if (monto <= 0) {
            return "Error: El monto de la transacción programada debe ser positivo.";
        }
        if (!(fechaEjecucion instanceof Date) || isNaN(fechaEjecucion)) {
            return "Error: Fecha de ejecución inválida.";
        }
        if (fechaEjecucion < new Date()) {
            return "Error: La fecha de ejecución debe ser en el futuro.";
        }

        const id = TransaccionProgramadaService.generarIdTransaccionProgramada();
        const transaccionProgramada = new TransaccionProgramada(
            id,
            tipo,
            monto,
            idCliente,
            fechaEjecucion,
            frecuencia,
            idClienteDestino,
            tipoCuenta,
            metodoPago
        );

        cliente.transaccionesProgramadas.encolar(transaccionProgramada);
        Storage.guardarDatos(); // Guardar el estado actualizado del storage
        return "Transacción programada con éxito.";
    }

    /**
     * Procesa las transacciones programadas pendientes para todos los clientes.
     * Debería llamarse periódicamente o al cargar la aplicación.
     */
    static procesarTransaccionesPendientes() {
        const clientes = Storage.obtenerTodosLosClientes(); // Suponiendo que Storage tiene este método
        const ahora = new Date();
        let transaccionesProcesadasCount = 0;

        clientes.forEach(cliente => {
            // Asegurarse de que el objeto cliente tenga la ColaPrioridad hidratada
            if (!(cliente.transaccionesProgramadas instanceof ColaPrioridad)) {
                // Esto no debería pasar si Storage.inicializar() funciona correctamente,
                // pero es una buena verificación.
                const colaTemp = new ColaPrioridad();
                if (cliente.transaccionesProgramadas && Array.isArray(cliente.transaccionesProgramadas.elementos)) {
                    cliente.transaccionesProgramadas.elementos.forEach(tp => colaTemp.encolar(tp));
                }
                cliente.transaccionesProgramadas = colaTemp;
            }

            while (!cliente.transaccionesProgramadas.estaVacia() &&
                   new Date(cliente.transaccionesProgramadas.peek().fechaEjecucion) <= ahora) {

                const tp = cliente.transaccionesProgramadas.desencolar();

                if (!tp.ejecutada) { // Para evitar doble ejecución si hay refrescos rápidos
                    let resultadoEjecucion = "";
                    switch (tp.tipo) {
                        case "deposito":
                            resultadoEjecucion = TransaccionService.realizarDeposito(
                                tp.idClienteOrigen,
                                tp.monto,
                                tp.tipoCuenta,
                                tp.metodoPago
                            );
                            break;
                        case "retiro":
                            resultadoEjecucion = TransaccionService.realizarRetiro(tp.idClienteOrigen, tp.monto);
                            break;
                        case "transferencia":
                            resultadoEjecucion = TransaccionService.realizarTransferencia(
                                tp.idClienteOrigen,
                                tp.idClienteDestino,
                                tp.monto
                            );
                            break;
                        default:
                            resultadoEjecucion = `Error: Tipo de transacción programada desconocido: ${tp.tipo}`;
                            break;
                    }
                    console.log(`Transacción programada ${tp.id} (${tp.tipo}) para ${cliente.id} ejecutada. Resultado: ${resultadoEjecucion}`);
                    transaccionesProcesadasCount++;
                    tp.ejecutada = true; // Marcar como ejecutada

                    // Si es recurrente, programar la próxima ocurrencia
                    if (tp.frecuencia !== 'unica') {
                        const proximaFecha = TransaccionProgramadaService._calcularProximaFecha(new Date(tp.fechaEjecucion), tp.frecuencia);
                        if (proximaFecha) {
                            const nuevaTp = new TransaccionProgramada(
                                TransaccionProgramadaService.generarIdTransaccionProgramada(),
                                tp.tipo,
                                tp.monto,
                                tp.idClienteOrigen,
                                proximaFecha,
                                tp.frecuencia,
                                tp.idClienteDestino,
                                tp.tipoCuenta,
                                tp.metodoPago
                            );
                            cliente.transaccionesProgramadas.encolar(nuevaTp);
                            console.log(`Programada próxima ocurrencia de ${tp.id} para ${proximaFecha.toLocaleString()}`);
                        }
                    }
                }
            }
        });
        if (transaccionesProcesadasCount > 0) {
            Storage.guardarDatos(); // Guardar cambios después de procesar
            console.log(`Se procesaron ${transaccionesProcesadasCount} transacciones programadas.`);
        }
        return transaccionesProcesadasCount;
    }

    /**
     * Calcula la próxima fecha de ejecución para una transacción recurrente.
     * @param {Date} fechaActual La fecha de la última ejecución.
     * @param {string} frecuencia La frecuencia de la transacción.
     * @returns {Date|null} La próxima fecha de ejecución o null si la frecuencia no es válida.
     */
    static _calcularProximaFecha(fechaActual, frecuencia) {
        const proximaFecha = new Date(fechaActual); // Copia la fecha para no modificar la original
        switch (frecuencia) {
            case 'diaria':
                proximaFecha.setDate(proximaFecha.getDate() + 1);
                break;
            case 'semanal':
                proximaFecha.setDate(proximaFecha.getDate() + 7);
                break;
            case 'mensual':
                proximaFecha.setMonth(proximaFecha.getMonth() + 1);
                break;
            case 'anual':
                proximaFecha.setFullYear(proximaFecha.getFullYear() + 1);
                break;
            case 'unica':
                return null; // Las transacciones únicas no tienen próxima fecha
            default:
                return null;
        }
        return proximaFecha;
    }

    /**
     * Obtiene las transacciones programadas para un cliente específico.
     * @param {string} idCliente ID del cliente.
     * @returns {Array} Lista de transacciones programadas.
     */
    static obtenerTransaccionesProgramadasDeCliente(idCliente) {
        const cliente = ClienteService.buscarClientePorId(idCliente);
        if (cliente && cliente.transaccionesProgramadas instanceof ColaPrioridad) {
            return cliente.transaccionesProgramadas.obtenerElementos();
        }
        return [];
    }

    // Puedes añadir un método para cancelar una transacción programada si es necesario
    static cancelarTransaccionProgramada(idCliente, idTransaccionProgramada) {
        const cliente = ClienteService.buscarClientePorId(idCliente);
        if (!cliente || !(cliente.transaccionesProgramadas instanceof ColaPrioridad)) {
            return "Error: Cliente o cola de transacciones programadas no encontrados.";
        }

        const elementosFiltrados = cliente.transaccionesProgramadas.obtenerElementos().filter(tp => tp.id !== idTransaccionProgramada);
        
        // Reconstruir la cola sin la transacción cancelada
        const nuevaCola = new ColaPrioridad();
        elementosFiltrados.forEach(tp => nuevaCola.encolar(tp));
        cliente.transaccionesProgramadas = nuevaCola;
        
        Storage.guardarDatos();
        return "Transacción programada cancelada con éxito.";
    }
}

export default TransaccionProgramadaService;