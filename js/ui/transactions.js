import TransaccionService from "../services/TransaccionService.js";
import TransaccionProgramadaService from "../services/TransaccionProgramadaService.js";
import ClienteService from "../services/ClienteService.js";

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
    const categoriaGroup = document.getElementById("categoria-group"); // <-- NUEVO
    const categoriaGastoInput = document.getElementById("categoriaGasto"); // <-- NUEVO

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
    const categoriaProgramadaGroup = document.getElementById("categoria-programada-group"); // <-- NUEVO
    const categoriaGastoProgramadaInput = document.getElementById("categoriaGastoProgramada"); // <-- NUEVO


    function actualizarClienteActualEnLocalStorage() {
        const clienteLogueado = ClienteService.obtenerClienteActual();
        if (clienteLogueado) {
            const clienteActualizado = ClienteService.buscarClientePorId(clienteLogueado.id);
            if (clienteActualizado) {
                ClienteService.guardarClienteActual(clienteActualizado);
            }
        }
    }

    // --- Lógica de Visibilidad para Transacciones Inmediatas ---
    clienteDestinoGroup.style.display = "none";
    tipoCuentaGroup.style.display = "none";
    metodoPagoGroup.style.display = "none";
    categoriaGroup.style.display = "none"; // <-- OCULTAR POR DEFECTO

    tipoOperacionSelect.addEventListener("change", () => {
        clienteDestinoGroup.style.display = "none";
        idClienteDestinoInput.removeAttribute("required");
        tipoCuentaGroup.style.display = "none";
        tipoCuentaSelect.removeAttribute("required");
        metodoPagoGroup.style.display = "none";
        metodoPagoSelect.removeAttribute("required");
        categoriaGroup.style.display = "none"; // <-- OCULTAR SI CAMBIA EL TIPO
        categoriaGastoInput.removeAttribute("required"); // <-- QUITAR REQUERIDO
        montoInput.setAttribute("required", "true"); // El monto siempre es requerido

        if (tipoOperacionSelect.value === "transferencia") {
            clienteDestinoGroup.style.display = "block";
            idClienteDestinoInput.setAttribute("required", "true");
            categoriaGroup.style.display = "block"; // <-- MOSTRAR PARA TRANSFERENCIA
            categoriaGastoInput.setAttribute("required", "true"); // <-- HACER REQUERIDO
        } else if (tipoOperacionSelect.value === "deposito") {
            tipoCuentaGroup.style.display = "block";
            tipoCuentaSelect.setAttribute("required", "true");
            metodoPagoGroup.style.display = "block";
            metodoPagoSelect.setAttribute("required", "true");
            // Para depósitos, la categoría podría ser opcional o no mostrarse
            // Si la quieres opcional, solo asegúrate de que no tenga 'required'
            // categoríaGroup.style.display = "block"; // Puedes decidir mostrarlo aquí si quieres
        } else if (tipoOperacionSelect.value === "retiro") {
            categoriaGroup.style.display = "block"; // <-- MOSTRAR PARA RETIRO
            categoriaGastoInput.setAttribute("required", "true"); // <-- HACER REQUERIDO
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
        const categoriaGasto = categoriaGastoInput.value.trim(); // <-- NUEVO

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
                resultado = TransaccionService.realizarDeposito(clienteLogueado.id, monto, tipoCuenta, metodoPago, categoriaGasto); // <-- PASAR CATEGORIA
                isSuccess = !resultado.startsWith("Error");
                break;
            case "retiro":
                if (!categoriaGasto) {
                    resultado = "Error: La categoría de gasto es obligatoria para retiros.";
                } else {
                    resultado = TransaccionService.realizarRetiro(clienteLogueado.id, monto, categoriaGasto); // <-- PASAR CATEGORIA
                    isSuccess = !resultado.startsWith("Error");
                }
                break;
            case "transferencia":
                if (!idClienteDestino) {
                    resultado = "Error: El ID del cliente destino es obligatorio para transferencias.";
                } else if (!categoriaGasto) { // <-- NUEVO
                    resultado = "Error: La categoría de gasto es obligatoria para transferencias.";
                }
                else {
                    resultado = TransaccionService.realizarTransferencia(clienteLogueado.id, idClienteDestino, monto, categoriaGasto); // <-- PASAR CATEGORIA
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
            // Reiniciar la visibilidad y requerimientos
            clienteDestinoGroup.style.display = "none";
            tipoCuentaGroup.style.display = "none";
            metodoPagoGroup.style.display = "none";
            categoriaGroup.style.display = "none"; // <-- OCULTAR AL RESETEAR
            categoriaGastoInput.removeAttribute("required"); // <-- QUITAR REQUERIDO
            actualizarClienteActualEnLocalStorage();
        } else {
            mensajeTransaccionDiv.classList.add("error");
        }
    });

    // --- Lógica de Visibilidad para Transacciones Programadas ---
    clienteDestinoProgramadoGroup.style.display = "none";
    tipoCuentaProgramadaGroup.style.display = "none";
    metodoPagoProgramadoGroup.style.display = "none";
    categoriaProgramadaGroup.style.display = "none"; // <-- OCULTAR POR DEFECTO
    montoProgramadoInput.setAttribute("required", "true"); // El monto siempre es requerido

    tipoOperacionProgramadaSelect.addEventListener("change", () => {
        clienteDestinoProgramadoGroup.style.display = "none";
        idClienteDestinoProgramadoInput.removeAttribute("required");
        tipoCuentaProgramadaGroup.style.display = "none";
        tipoCuentaProgramadaSelect.removeAttribute("required");
        metodoPagoProgramadoGroup.style.display = "none";
        metodoPagoProgramadoSelect.removeAttribute("required");
        categoriaProgramadaGroup.style.display = "none"; // <-- OCULTAR SI CAMBIA EL TIPO
        categoriaGastoProgramadaInput.removeAttribute("required"); // <-- QUITAR REQUERIDO


        if (tipoOperacionProgramadaSelect.value === "transferencia") {
            clienteDestinoProgramadoGroup.style.display = "block";
            idClienteDestinoProgramadoInput.setAttribute("required", "true");
            categoriaProgramadaGroup.style.display = "block"; // <-- MOSTRAR PARA TRANSFERENCIA
            categoriaGastoProgramadaInput.setAttribute("required", "true"); // <-- HACER REQUERIDO
        } else if (tipoOperacionProgramadaSelect.value === "deposito") {
            tipoCuentaProgramadaGroup.style.display = "block";
            tipoCuentaProgramadaSelect.setAttribute("required", "true");
            metodoPagoProgramadoGroup.style.display = "block";
            metodoPagoProgramadoSelect.setAttribute("required", "true");
            // categoríaProgramadaGroup.style.display = "block"; // Opcional, puedes decidir si los depósitos programados tienen categoría
        } else if (tipoOperacionProgramadaSelect.value === "retiro") {
            categoriaProgramadaGroup.style.display = "block"; // <-- MOSTRAR PARA RETIRO
            categoriaGastoProgramadaInput.setAttribute("required", "true"); // <-- HACER REQUERIDO
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
        const categoriaGastoProgramada = categoriaGastoProgramadaInput.value.trim(); // <-- NUEVO

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
        } else if ((tipoOperacion === "retiro" || tipoOperacion === "transferencia") && !categoriaGastoProgramada) { // <-- NUEVO
            resultado = "Error: La categoría de gasto es obligatoria para retiros y transferencias programadas.";
        }
        else if (isNaN(fechaEjecucion.getTime())) {
            resultado = "Error: Fecha de ejecución inválida.";
        } else if (fechaEjecucion < new Date()) {
            resultado = "Error: La fecha de ejecución debe ser en el futuro.";
        }
        else {
            resultado = TransaccionProgramadaService.programarTransaccion(
                clienteLogueado.id,
                tipoOperacion,
                monto,
                fechaEjecucion,
                frecuencia,
                idClienteDestino,
                tipoCuenta,
                metodoPago,
                categoriaGastoProgramada // <-- PASAR CATEGORIA
            );
        }

        mensajeProgramacionDiv.textContent = resultado;
        mensajeProgramacionDiv.classList.remove("success", "error");
        if (resultado.startsWith("Error")) {
            mensajeProgramacionDiv.classList.add("error");
        } else {
            mensajeProgramacionDiv.classList.add("success");
            programarTransactionForm.reset(); // Limpiar el formulario
            // Reiniciar la visibilidad de los campos específicos de programación
            clienteDestinoProgramadoGroup.style.display = "none";
            tipoCuentaProgramadaGroup.style.display = "none";
            metodoPagoProgramadoGroup.style.display = "none";
            categoriaProgramadaGroup.style.display = "none"; // <-- OCULTAR AL RESETEAR
            categoriaGastoProgramadaInput.removeAttribute("required"); // <-- QUITAR REQUERIDO

            // ¡IMPORTANTE! Iniciar el procesamiento de transacciones programadas
            TransaccionProgramadaService.procesarTransaccionesPendientes();
        }
    });

    // --- Mecanismo de Procesamiento al cargar la página ---
    TransaccionProgramadaService.procesarTransaccionesPendientes();

    setInterval(() => {
        console.log("Revisando transacciones programadas...");
        TransaccionProgramadaService.procesarTransaccionesPendientes();
    }, 60 * 1000); // Cada 1 minuto (60 segundos * 1000 milisegundos)
});