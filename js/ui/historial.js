import ClienteService from "../services/ClienteService.js";
import TransaccionService from "../services/TransaccionService.js";

document.addEventListener("DOMContentLoaded", () => {
    const historialTableBody = document.querySelector("#historialTable tbody");
    const mensajeHistorialDiv = document.getElementById("mensajeHistorial");
    const limpiarHistorialBtn = document.getElementById("limpiarHistorialBtn");

    function cargarHistorialTransacciones() {
        const clienteActual = ClienteService.obtenerClienteActual();

        if (!clienteActual) {
            mensajeHistorialDiv.textContent = "No hay cliente logueado. Por favor, inicie sesión.";
            mensajeHistorialDiv.classList.add("error");
            historialTableBody.innerHTML = '<tr><td colspan="8" class="no-transactions-message">No se pudo cargar el historial.</td></tr>';
            return;
        }

        // Obtener la versión más reciente del cliente desde el storage
        const clienteCompleto = ClienteService.buscarClientePorId(clienteActual.id);

        if (!clienteCompleto || !clienteCompleto.historialTransacciones) {
            mensajeHistorialDiv.textContent = "Error: Historial de transacciones no disponible.";
            mensajeHistorialDiv.classList.add("error");
            historialTableBody.innerHTML = '<tr><td colspan="8" class="no-transactions-message">Error al cargar el historial.</td></tr>';
            return;
        }

        const historial = clienteCompleto.historialTransacciones;

        if (historial.length === 0) {
            historialTableBody.innerHTML = '<tr><td colspan="8" class="no-transactions-message">No hay transacciones registradas.</td></tr>';
            mensajeHistorialDiv.textContent = "Tu historial de transacciones está vacío.";
            mensajeHistorialDiv.classList.remove("error", "success");
            return;
        }

        // Limpiar cualquier mensaje y contenido anterior
        mensajeHistorialDiv.textContent = "";
        mensajeHistorialDiv.classList.remove("error", "success");
        historialTableBody.innerHTML = ""; // Limpiar el tbody antes de insertar

        // Ordenar historial por fecha, de más reciente a más antigua
        const historialOrdenado = [...historial].sort((a, b) => {
            return new Date(b.fecha) - new Date(a.fecha);
        });
        
        // Verificar si ya se ha cancelado una transacción previamente
        const ultimaCancelacion = localStorage.getItem(`ultimaCancelacion_${clienteActual.id}`);
        const fechaUltimaCancelacion = ultimaCancelacion ? new Date(ultimaCancelacion) : null;
        
        // Verificar si ha habido una nueva transacción después de la última cancelación
        let permitirCancelar = true;
        if (fechaUltimaCancelacion) {
            // Buscar transacción más reciente
            const transaccionMasReciente = historialOrdenado.length > 0 ? new Date(historialOrdenado[0].fecha) : null;
            
            // Solo permitir cancelar si hay una transacción más reciente que la última cancelación
            permitirCancelar = transaccionMasReciente && transaccionMasReciente > fechaUltimaCancelacion;
        }
        
        // Iterar sobre el historial ordenado y crear las filas de la tabla
        historialOrdenado.forEach((transaccion, index) => {
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

            // Verificar si es la transacción más reciente (index === 0) y si se permite cancelar
            const esMasReciente = index === 0;
            const puedeSerCancelada = esMasReciente && permitirCancelar;
            
            // Mensaje para mostrar cuando no se puede cancelar
            let mensajeNoCancelable = "No cancelable";
            if (esMasReciente && !permitirCancelar) {
                mensajeNoCancelable = "Ya cancelaste una transacción";
            }
            
            // Crear las celdas
            row.innerHTML = `
                <td>${transaccion.id}</td>
                <td class="${tipoClase}">${transaccion.tipo.charAt(0).toUpperCase() + transaccion.tipo.slice(1)}</td>
                <td>${transaccion.monto.toFixed(2)}</td>
                <td>${fechaFormateada}</td>
                <td>${origenDestino}</td>
                <td>${transaccion.tipoCuenta || 'N/A'}</td> 
                <td>${transaccion.metodoPago || 'N/A'}</td>
                <td>
                    ${puedeSerCancelada ? 
                        `<button class="btn-cancelar-transaccion" data-id="${transaccion.id}">Cancelar</button>` : 
                        `<span class="no-cancelable">${mensajeNoCancelable}</span>`
                    }
                </td>`;
            historialTableBody.appendChild(row);
        });
        
        // Agregar manejadores de eventos a los botones de cancelar
        document.querySelectorAll('.btn-cancelar-transaccion').forEach(button => {
            button.addEventListener('click', function() {
                const idTransaccion = this.getAttribute('data-id');
                if (confirm('¿Está seguro que desea cancelar esta transacción? Esta acción devolverá los fondos correspondientes.')) {
                    const clienteActual = ClienteService.obtenerClienteActual();
                    const resultado = TransaccionService.cancelarTransaccion(clienteActual.id, idTransaccion);
                    
                    if (resultado.startsWith('Error')) {
                        mensajeHistorialDiv.textContent = resultado;
                        mensajeHistorialDiv.classList.remove('success');
                        mensajeHistorialDiv.classList.add('error');
                    } else {
                        mensajeHistorialDiv.textContent = resultado;
                        mensajeHistorialDiv.classList.remove('error');
                        mensajeHistorialDiv.classList.add('success');
                        
                        // Registrar la fecha de cancelación para bloquear futuras cancelaciones
                        localStorage.setItem(`ultimaCancelacion_${clienteActual.id}`, new Date().toISOString());
                        
                        // Recargar el historial para reflejar los cambios
                        cargarHistorialTransacciones();
                    }
                }
            });
        });
    }

    // Manejador de eventos para el botón de limpiar historial
    if (limpiarHistorialBtn) {
        limpiarHistorialBtn.addEventListener('click', () => {
            if (confirm('¿Está seguro que desea eliminar todo el historial de transacciones? Esta acción no puede deshacerse.')) {
                const resultado = ClienteService.limpiarHistorialTransacciones();
                if (resultado) {
                    // Mostrar mensaje de éxito
                    mensajeHistorialDiv.textContent = "Historial de transacciones eliminado correctamente.";
                    mensajeHistorialDiv.classList.remove("error");
                    mensajeHistorialDiv.classList.add("success");
                    // Actualizar la tabla
                    historialTableBody.innerHTML = '<tr><td colspan="8" class="no-transactions-message">No hay transacciones registradas.</td></tr>';
                } else {
                    mensajeHistorialDiv.textContent = "Error al intentar eliminar el historial.";
                    mensajeHistorialDiv.classList.remove("success");
                    mensajeHistorialDiv.classList.add("error");
                }
            }
        });
    }

    // Cargar el historial cuando la página se cargue
    cargarHistorialTransacciones();
});
