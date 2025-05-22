import ClienteService from "../services/ClienteService.js";

document.addEventListener("DOMContentLoaded", () => {
    const saldoClienteSpan = document.getElementById("saldoCliente");
    const puntosClienteSpan = document.getElementById("puntosCliente");
    const rangoClienteSpan = document.getElementById("rangoCliente");

    /**
     * Función para cargar y mostrar la información del cliente en el dashboard.
     */
    function cargarInformacionCliente() {
        const clienteActual = ClienteService.obtenerClienteActual();

        if (clienteActual) {
            // Es vital buscar la versión más reciente del cliente desde el Storage principal
            // ya que 'clienteActual' del localStorage solo es un snapshot.
            const clienteCompleto = ClienteService.buscarClientePorId(clienteActual.id);

            if (clienteCompleto) {
                saldoClienteSpan.textContent = clienteCompleto.saldo.toFixed(2);
                puntosClienteSpan.textContent = clienteCompleto.puntos;
                rangoClienteSpan.textContent = clienteCompleto.rango;
            } else {
                console.error("Error: Cliente actual no encontrado en el storage principal.");
                // Opcional: Redirigir a login o mostrar un mensaje de error
                saldoClienteSpan.textContent = "N/A";
                puntosClienteSpan.textContent = "N/A";
                rangoClienteSpan.textContent = "N/A";
            }
        } else {
            // Si no hay cliente logueado, redirigir al login o mostrar valores predeterminados
            console.warn("No hay cliente logueado. Redirigiendo a login...");
            window.location.href = "login.html"; // O la ruta a tu página de login
        }
    }

    // Cargar la información del cliente cuando el DOM esté completamente cargado
    cargarInformacionCliente();
    
});