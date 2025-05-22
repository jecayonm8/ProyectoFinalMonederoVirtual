import ClienteService from "../services/ClienteService.js";

document.addEventListener("DOMContentLoaded", () => {
    const historialTableBody = document.querySelector("#historialTable tbody");
    const mensajeHistorialDiv = document.getElementById("mensajeHistorial");

    function cargarHistorialTransacciones() {
        const clienteActual = ClienteService.obtenerClienteActual();

        if (!clienteActual) {
            mensajeHistorialDiv.textContent = "No hay cliente logueado. Por favor, inicie sesión.";
            mensajeHistorialDiv.classList.add("error");
            historialTableBody.innerHTML = '<tr><td colspan="7" class="no-transactions-message">No se pudo cargar el historial.</td></tr>';
            return;
        }

        // Obtener la versión más reciente del cliente desde el storage
        const clienteCompleto = ClienteService.buscarClientePorId(clienteActual.id);

        if (!clienteCompleto || !clienteCompleto.historialTransacciones) {
            mensajeHistorialDiv.textContent = "Error: Historial de transacciones no disponible.";
            mensajeHistorialDiv.classList.add("error");
            historialTableBody.innerHTML = '<tr><td colspan="7" class="no-transactions-message">Error al cargar el historial.</td></tr>';
            return;
        }

        const historial = clienteCompleto.historialTransacciones;

        if (historial.length === 0) {
            historialTableBody.innerHTML = '<tr><td colspan="7" class="no-transactions-message">No hay transacciones registradas.</td></tr>';
            mensajeHistorialDiv.textContent = "Tu historial de transacciones está vacío.";
            mensajeHistorialDiv.classList.remove("error", "success");
            return;
        }

        // Limpiar cualquier mensaje y contenido anterior
        mensajeHistorialDiv.textContent = "";
        mensajeHistorialDiv.classList.remove("error", "success");
        historialTableBody.innerHTML = ""; // Limpiar el tbody antes de insertar

        // Iterar sobre el historial y crear las filas de la tabla
        historial.forEach(transaccion => {
            const row = document.createElement("tr");

            // Formatear la fecha
            const fecha = new Date(transaccion.fecha);
            const fechaFormateada = fecha.toLocaleString(); // Ajusta según tu formato deseado

            let origenDestino = "";
            let tipoClase = ""; // Para aplicar estilos de color

            switch (transaccion.tipo) {
                case "deposito":
                    origenDestino = "N/A"; // No aplica origen/destino para depósito
                    tipoClase = "type-deposito";
                    break;
                case "retiro":
                    origenDestino = "N/A"; // No aplica origen/destino para retiro
                    tipoClase = "type-retiro";
                    break;
                case "transferencia": // Cuando el cliente es el que envía
                    origenDestino = `A: ${transaccion.idClienteDestino}`;
                    tipoClase = "type-transferencia";
                    break;
                case "recepcion": // Cuando el cliente es el que recibe una transferencia
                    origenDestino = `De: ${transaccion.idClienteOrigen}`;
                    tipoClase = "type-recepcion";
                    break;
                default:
                    origenDestino = "";
                    tipoClase = "";
                    break;
            }

            // Crear las celdas
            row.innerHTML = `
                <td>${transaccion.id}</td>
                <td class="${tipoClase}">${transaccion.tipo.charAt(0).toUpperCase() + transaccion.tipo.slice(1)}</td>
                <td>${transaccion.monto.toFixed(2)}</td>
                <td>${fechaFormateada}</td>
                <td>${origenDestino}</td>
                <td>${transaccion.tipoCuenta || 'N/A'}</td> <td>${transaccion.metodoPago || 'N/A'}</td> `;
            historialTableBody.appendChild(row);
        });
    }

    // Cargar el historial cuando la página se cargue
    cargarHistorialTransacciones();
});