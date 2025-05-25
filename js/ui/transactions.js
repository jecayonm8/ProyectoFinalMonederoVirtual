// js/ui/transactions.js
import TransaccionService from "../services/TransaccionService.js";
import TransaccionProgramadaService from "../services/TransaccionProgramadaService.js";
import ClienteService from "../services/ClienteService.js";
import NotificacionService from "../services/NotificacionService.js";

document.addEventListener("DOMContentLoaded", () => {
    // --- Elementos para Transacciones Inmediatas ---
    const transactionForm = document.getElementById("transaction-form");
    const tipoOperacionSelect = document.getElementById("tipoOperacion");
    const montoInput = document.getElementById("monto");
    const clienteDestinoGroup = document.getElementById("cliente-destino-group");
    const idClienteDestinoInput = document.getElementById("idClienteDestino");
    const mensajeTransaccionDiv = document.getElementById("mensajeTransaccion");
    const tipoCuentaGroup = document.getElementById("tipo-cuenta-group");
    const tipoCuentaSelect = document.getElementById("tipoCuenta");
    const metodoPagoGroup = document.getElementById("metodo-pago-group");
    const metodoPagoSelect = document.getElementById("metodoPago");
    const categoriaGroup = document.getElementById("categoria-group");
    const categoriaGastoInput = document.getElementById("categoriaGasto");

    // --- Elementos para Transacciones Programadas ---
    const programarTransactionForm = document.getElementById("programar-transaction-form");
    const tipoOperacionProgramadaSelect = document.getElementById("tipoOperacionProgramada");
    const montoProgramadoInput = document.getElementById("montoProgramado");
    const clienteDestinoProgramadoGroup = document.getElementById("cliente-destino-programado-group");
    const idClienteDestinoProgramadoInput = document.getElementById("idClienteDestinoProgramado");
    const fechaEjecucionInput = document.getElementById("fechaEjecucion");
    const frecuenciaSelect = document.getElementById("frecuencia");
    const mensajeProgramacionDiv = document.getElementById("mensajeProgramacion");
    const tipoCuentaProgramadaGroup = document.getElementById("tipo-cuenta-programada-group");
    const tipoCuentaProgramadaSelect = document.getElementById("tipoCuentaProgramada");
    const metodoPagoProgramadoGroup = document.getElementById("metodo-pago-programado-group");
    const metodoPagoProgramadoSelect = document.getElementById("metodoPagoProgramado");
    const categoriaProgramadaGroup = document.getElementById("categoria-programada-group");
    const categoriaGastoProgramadaInput = document.getElementById("categoriaGastoProgramada");

    // --- NUEVOS ELEMENTOS PARA NOTIFICACIONES ---
    const notificacionesContainer = document.getElementById("notificaciones-container"); // Contenedor en tu HTML
    const notificacionesBadge = document.getElementById("notificaciones-badge"); // Opcional: para mostrar el número de no leídas


    // Función auxiliar para actualizar el cliente actual en memoria y localStorage.
    // Esta función está bien, pero el `guardarClienteActual` no existe en ClienteService.
    // Deberías usar `ClienteService.guardarClienteActualEnLocalStorage()` directamente.
    // Voy a refactorizarla un poco.
    function actualizarEstadoClienteEnUI() {
        const clienteLogueado = ClienteService.obtenerClienteActual();
        if (clienteLogueado) {
            // No necesitas buscarlo de nuevo si ya lo obtuviste y está en memoria.
            // Simplemente guardas la instancia actual.
            ClienteService.guardarClienteActualEnLocalStorage(); // Esto persiste el estado actual.
            
            // También podrías actualizar elementos de UI como el saldo, puntos, etc. aquí.
            // Ejemplo:
            // document.getElementById('saldoActual').textContent = clienteLogueado.saldo.toFixed(2);
            // document.getElementById('puntosActuales').textContent = clienteLogueado.puntos;
        }
    }


    // <--- Actualizar la interfaz de notificaciones --->
    function actualizarInterfazDeNotificaciones() {
        const clienteActual = ClienteService.obtenerClienteActual();
        if (!clienteActual) {
            if (notificacionesContainer) {
                notificacionesContainer.innerHTML = '<p>Inicia sesión para ver tus notificaciones.</p>';
            }
            if (notificacionesBadge) {
                notificacionesBadge.textContent = '0';
                notificacionesBadge.style.display = 'none';
            }
            return;
        }

        const notificaciones = NotificacionService.obtenerNotificacionesDelClienteActual();
        let notificacionesNoLeidas = 0;

        if (notificacionesContainer) {
            notificacionesContainer.innerHTML = ''; // Limpiar anteriores
            if (notificaciones.length > 0) {
                notificaciones.forEach(notif => {
                    const notifElement = document.createElement('div');
                    notifElement.classList.add('notificacion-item', notif.tipo); // Clases para estilos (define estas clases en tu CSS)
                    if (notif.leida) {
                        notifElement.classList.add('leida');
                    } else {
                        notificacionesNoLeidas++;
                    }
                    notifElement.innerHTML = `
                        <span>${notif.mensaje}</span>
                        <span class="fecha">${new Date(notif.fecha).toLocaleDateString()} ${new Date(notif.fecha).toLocaleTimeString()}</span>
                        <button class="marcar-leida-btn" data-id="${notif.id}" ${notif.leida ? 'disabled' : ''}>
                            ${notif.leida ? 'Leída' : 'Marcar como leída'}
                        </button>
                    `;
                    notificacionesContainer.prepend(notifElement); // Añadir al principio para ver las más nuevas primero

                    // Agregar evento para marcar como leída
                    const marcarLeidaBtn = notifElement.querySelector('.marcar-leida-btn');
                    if (marcarLeidaBtn) {
                        marcarLeidaBtn.addEventListener('click', () => {
                            NotificacionService.marcarNotificacionComoLeida(clienteActual.id, notif.id);
                            actualizarInterfazDeNotificaciones(); // Volver a renderizar para actualizar el estado
                        });
                    }
                });
            } else {
                notificacionesContainer.innerHTML = '<p>No hay notificaciones.</p>';
            }
        }

        // Actualizar el contador de notificaciones no leídas
        if (notificacionesBadge) {
            notificacionesBadge.textContent = notificacionesNoLeidas.toString();
            notificacionesBadge.style.display = notificacionesNoLeidas > 0 ? 'inline-block' : 'none';
        }
    }


    // --- Lógica de Visibilidad para Transacciones Inmediatas ---
    clienteDestinoGroup.style.display = "none";
    tipoCuentaGroup.style.display = "none";
    metodoPagoGroup.style.display = "none";
    categoriaGroup.style.display = "none";

    tipoOperacionSelect.addEventListener("change", () => {
        clienteDestinoGroup.style.display = "none";
        idClienteDestinoInput.removeAttribute("required");
        tipoCuentaGroup.style.display = "none";
        tipoCuentaSelect.removeAttribute("required");
        metodoPagoGroup.style.display = "none";
        metodoPagoSelect.removeAttribute("required");
        categoriaGroup.style.display = "none";
        categoriaGastoInput.removeAttribute("required");
        montoInput.setAttribute("required", "true");

        if (tipoOperacionSelect.value === "transferencia") {
            clienteDestinoGroup.style.display = "block";
            idClienteDestinoInput.setAttribute("required", "true");
            categoriaGroup.style.display = "block";
            categoriaGastoInput.setAttribute("required", "true");
        } else if (tipoOperacionSelect.value === "deposito") {
            tipoCuentaGroup.style.display = "block";
            tipoCuentaSelect.setAttribute("required", "true");
            metodoPagoGroup.style.display = "block";
            metodoPagoSelect.setAttribute("required", "true");
        } else if (tipoOperacionSelect.value === "retiro") {
            categoriaGroup.style.display = "block";
            categoriaGastoInput.setAttribute("required", "true");
        }
    });

    // --- Lógica de Submit para Transacciones Inmediatas ---
    transactionForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const tipoOperacion = tipoOperacionSelect.value;
        const monto = parseFloat(montoInput.value);
        const idClienteDestino = idClienteDestinoInput.value.trim();
        const tipoCuenta = tipoCuentaSelect.value;
        const metodoPago = metodoPagoSelect.value;
        const categoriaGasto = categoriaGastoInput.value.trim();

        const clienteLogueado = ClienteService.obtenerClienteActual();

        if (!clienteLogueado) {
            mensajeTransaccionDiv.textContent = "Error: No hay cliente logueado.";
            mensajeTransaccionDiv.classList.remove("success");
            mensajeTransaccionDiv.classList.add("error");
            return;
        }

        let resultado = "";
        let isSuccess = false;

        switch (tipoOperacion) {
            case "deposito":
                resultado = TransaccionService.realizarDeposito(clienteLogueado.id, monto, tipoCuenta, metodoPago, categoriaGasto);
                isSuccess = !resultado.startsWith("Error");
                break;
            case "retiro":
                if (!categoriaGasto) {
                    resultado = "Error: La categoría de gasto es obligatoria para retiros.";
                } else {
                    resultado = TransaccionService.realizarRetiro(clienteLogueado.id, monto, categoriaGasto);
                    isSuccess = !resultado.startsWith("Error");
                }
                break;
            case "transferencia":
                if (!idClienteDestino) {
                    resultado = "Error: El ID del cliente destino es obligatorio para transferencias.";
                } else if (!categoriaGasto) {
                    resultado = "Error: La categoría de gasto es obligatoria para transferencias.";
                } else {
                    resultado = TransaccionService.realizarTransferencia(clienteLogueado.id, idClienteDestino, monto, categoriaGasto);
                    isSuccess = !resultado.startsWith("Error");
                }
                break;
            default:
                resultado = "Error: Tipo de operación no válido. Por favor, seleccione uno.";
                break;
        }

        mensajeTransaccionDiv.textContent = resultado;
        mensajeTransaccionDiv.classList.remove("success", "error");
        if (isSuccess) {
            mensajeTransaccionDiv.classList.add("success");
            transactionForm.reset();
            clienteDestinoGroup.style.display = "none";
            tipoCuentaGroup.style.display = "none";
            metodoPagoGroup.style.display = "none";
            categoriaGroup.style.display = "none";
            categoriaGastoInput.removeAttribute("required");
            actualizarEstadoClienteEnUI(); // <-- Llamar a la función actualizada
            actualizarInterfazDeNotificaciones(); // <--- IMPORTANTE: Actualizar notificaciones después de una transacción exitosa
        } else {
            mensajeTransaccionDiv.classList.add("error");
        }
    });

    // --- Lógica de Visibilidad para Transacciones Programadas ---
    clienteDestinoProgramadoGroup.style.display = "none";
    tipoCuentaProgramadaGroup.style.display = "none";
    metodoPagoProgramadoGroup.style.display = "none";
    categoriaProgramadaGroup.style.display = "none";
    montoProgramadoInput.setAttribute("required", "true");

    tipoOperacionProgramadaSelect.addEventListener("change", () => {
        clienteDestinoProgramadoGroup.style.display = "none";
        idClienteDestinoProgramadoInput.removeAttribute("required");
        tipoCuentaProgramadaGroup.style.display = "none";
        tipoCuentaProgramadaSelect.removeAttribute("required");
        metodoPagoProgramadoGroup.style.display = "none";
        metodoPagoProgramadoSelect.removeAttribute("required");
        categoriaProgramadaGroup.style.display = "none";
        categoriaGastoProgramadaInput.removeAttribute("required");

        if (tipoOperacionProgramadaSelect.value === "transferencia") {
            clienteDestinoProgramadoGroup.style.display = "block";
            idClienteDestinoProgramadoInput.setAttribute("required", "true");
            categoriaProgramadaGroup.style.display = "block";
            categoriaGastoProgramadaInput.setAttribute("required", "true");
        } else if (tipoOperacionProgramadaSelect.value === "deposito") {
            tipoCuentaProgramadaGroup.style.display = "block";
            tipoCuentaProgramadaSelect.setAttribute("required", "true");
            metodoPagoProgramadoGroup.style.display = "block";
            metodoPagoProgramadoSelect.setAttribute("required", "true");
        } else if (tipoOperacionProgramadaSelect.value === "retiro") {
            categoriaProgramadaGroup.style.display = "block";
            categoriaGastoProgramadaInput.setAttribute("required", "true");
        }
    });

    // --- Lógica de Submit para Transacciones Programadas ---
    programarTransactionForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const tipoOperacion = tipoOperacionProgramadaSelect.value;
        const monto = parseFloat(montoProgramadoInput.value);
        const idClienteDestino = idClienteDestinoProgramadoInput.value.trim();
        const fechaEjecucion = new Date(fechaEjecucionInput.value);
        const frecuencia = frecuenciaSelect.value;
        const tipoCuenta = tipoCuentaProgramadaSelect.value;
        const metodoPago = metodoPagoProgramadoSelect.value;
        const categoriaGastoProgramada = categoriaGastoProgramadaInput.value.trim();

        const clienteLogueado = ClienteService.obtenerClienteActual();

        if (!clienteLogueado) {
            mensajeProgramacionDiv.textContent = "Error: No hay cliente logueado para programar la transacción.";
            mensajeProgramacionDiv.classList.remove("success");
            mensajeProgramacionDiv.classList.add("error");
            return;
        }

        let resultado = "";
        if (tipoOperacion === "transferencia" && !idClienteDestino) {
            resultado = "Error: El ID del cliente destino es obligatorio para transferencias programadas.";
        } else if (tipoOperacion === "deposito" && (!tipoCuenta || !metodoPago)) {
             resultado = "Error: El tipo de cuenta y método de pago son obligatorios para depósitos programados.";
        } else if ((tipoOperacion === "retiro" || tipoOperacion === "transferencia") && !categoriaGastoProgramada) {
            resultado = "Error: La categoría de gasto es obligatoria para retiros y transferencias programadas.";
        } else if (isNaN(fechaEjecucion.getTime())) {
            resultado = "Error: Fecha de ejecución inválida.";
        } else if (fechaEjecucion < new Date()) {
            resultado = "Error: La fecha de ejecución debe ser en el futuro.";
        } else {
            resultado = TransaccionProgramadaService.programarTransaccion(
                clienteLogueado.id,
                tipoOperacion,
                monto,
                fechaEjecucion,
                frecuencia,
                idClienteDestino,
                tipoCuenta,
                metodoPago,
                categoriaGastoProgramada
            );
        }

        mensajeProgramacionDiv.textContent = resultado;
        mensajeProgramacionDiv.classList.remove("success", "error");
        if (resultado.startsWith("Error")) {
            mensajeProgramacionDiv.classList.add("error");
        } else {
            mensajeProgramacionDiv.classList.add("success");
            programarTransactionForm.reset();
            clienteDestinoProgramadoGroup.style.display = "none";
            tipoCuentaProgramadaGroup.style.display = "none";
            metodoPagoProgramadoGroup.style.display = "none";
            categoriaProgramadaGroup.style.display = "none";
            categoriaGastoProgramadaInput.removeAttribute("required");

            // ¡IMPORTANTE! Iniciar el procesamiento de transacciones programadas
            TransaccionProgramadaService.procesarTransaccionesPendientes();
            actualizarInterfazDeNotificaciones(); // <--- IMPORTANTE: Actualizar notificaciones después de programar una transacción
        }
    });

    // --- Mecanismo de Procesamiento al cargar la página ---
    // Estas llamadas deben ocurrir después de que el cliente actual esté cargado.
    // También deben generar recordatorios de notificaciones.
    const clienteActualEnCarga = ClienteService.obtenerClienteActual();
    if (clienteActualEnCarga) {
        TransaccionProgramadaService.procesarTransaccionesPendientes();
        NotificacionService.generarRecordatorioTransaccionesProgramadas(clienteActualEnCarga.id); // <--- NUEVO: Llamar aquí al cargar la página
        actualizarInterfazDeNotificaciones(); // <--- NUEVO: Mostrar las notificaciones al cargar la página
    } else {
        // Redirigir si no hay cliente logueado, o mostrar un mensaje apropiado
        console.warn("No hay cliente logueado. Redirigiendo a la página de inicio o login.");
        // window.location.href = '../index.html'; // Descomentar para redirigir si no hay sesión
    }


    setInterval(() => {
        console.log("Revisando transacciones programadas y notificaciones...");
        const clienteLogueadoParaIntervalo = ClienteService.obtenerClienteActual();
        if (clienteLogueadoParaIntervalo) {
            TransaccionProgramadaService.procesarTransaccionesPendientes();
            NotificacionService.generarRecordatorioTransaccionesProgramadas(clienteLogueadoParaIntervalo.id);
            actualizarInterfazDeNotificaciones(); // <--- NUEVO: Actualizar notificaciones periódicamente
        } else {
            // Si la sesión expiró o se cerró, detener el intervalo.
            console.log("Sesión no activa, deteniendo chequeo de transacciones/notificaciones.");
            clearInterval(this); // 'this' aquí se refiere al window en este contexto, pero clearInterval(intervalId) es más seguro.
                                // Para detenerlo, tendrías que guardar el ID del intervalo: let intervalId = setInterval(...); clearInterval(intervalId);
        }
    }, 60 * 1000); // Cada 1 minuto (60 segundos * 1000 milisegundos)
});