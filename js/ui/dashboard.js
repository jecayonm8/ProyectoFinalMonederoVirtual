import ClienteService from "../services/ClienteService.js";
import SistemaPuntos from "../models/SistemaPuntos.js";

document.addEventListener("DOMContentLoaded", () => {
    const saldoClienteSpan = document.getElementById("saldoCliente");
    const puntosClienteSpan = document.getElementById("puntosCliente");
    const rangoClienteSpan = document.getElementById("rangoCliente");
    const beneficiosContainer = document.getElementById("beneficiosContainer");
    const listaBeneficiosActivos = document.getElementById("listaBeneficiosActivos");

    const sistemaPuntos = new SistemaPuntos();

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

    async function cargarBeneficiosDisponibles() {
        const cliente = ClienteService.obtenerClienteActual();
        if (!cliente || !beneficiosContainer) return;

        const beneficios = sistemaPuntos.obtenerBeneficiosDisponibles(cliente.rango);
        
        let html = '<div class="benefits-grid">';
        
        Object.keys(beneficios).forEach(beneficioId => {
            const beneficio = beneficios[beneficioId];
            const puedeCanjar = cliente.puntos >= beneficio.costoPuntos;
            
            html += `
                <div class="benefit-card ${puedeCanjar ? 'available' : 'unavailable'}">
                    <h4>${beneficio.nombre}</h4>
                    <p class="benefit-description">${beneficio.descripcion}</p>
                    <p class="benefit-cost">Costo: ${beneficio.costoPuntos} puntos</p>
                    <button 
                        class="benefit-btn ${puedeCanjar ? 'btn-primary' : 'btn-disabled'}" 
                        ${puedeCanjar ? '' : 'disabled'}
                        onclick="canjearBeneficio('${beneficioId}')"
                    >
                        ${puedeCanjar ? 'Canjear' : 'Puntos insuficientes'}
                    </button>
                </div>
            `;
        });
        
        html += '</div>';
        beneficiosContainer.innerHTML = html;
    }

    function cargarBeneficiosActivos() {
        const cliente = ClienteService.obtenerClienteActual();
        if (!cliente || !listaBeneficiosActivos) return;

        if (!cliente.beneficiosActivos || cliente.beneficiosActivos.length === 0) {
            listaBeneficiosActivos.innerHTML = '<p>No tienes beneficios activos.</p>';
            return;
        }

        let html = '<div class="active-benefits-list">';
        
        cliente.beneficiosActivos.forEach(beneficio => {
            html += `
                <div class="active-benefit-item">
                    <h5>${beneficio.nombre}</h5>
                    <p>Usos restantes: ${beneficio.usosRestantes}</p>
                    <p class="benefit-date">Canjeado: ${new Date(beneficio.fechaCanje).toLocaleDateString()}</p>
                </div>
            `;
        });
        
        html += '</div>';
        listaBeneficiosActivos.innerHTML = html;
    }

    // Función global para canjear beneficios
    window.canjearBeneficio = async function(beneficioId) {
        const cliente = ClienteService.obtenerClienteActual();
        if (!cliente) {
            alert('Error: No hay cliente logueado.');
            return;
        }

        const resultado = sistemaPuntos.canjearPuntos(cliente, beneficioId);
        
        if (resultado.exito) {
            alert(resultado.mensaje);
            
            // Agregar al historial de canjes
            if (!cliente.historialCanjes) {
                cliente.historialCanjes = [];
            }
            cliente.historialCanjes.push({
                beneficioId,
                fecha: new Date().toISOString(),
                nombre: resultado.beneficio.nombre
            });
            
            ClienteService.guardarClienteActualEnLocalStorage();
            
            // Actualizar la interfaz
            cargarInformacionCliente();
            await cargarBeneficiosDisponibles();
            cargarBeneficiosActivos();
        } else {
            alert('Error: ' + resultado.mensaje);
        }
    };

    // Cargar la información del cliente cuando el DOM esté completamente cargado
    async function inicializar() {
        cargarInformacionCliente();
        await cargarBeneficiosDisponibles();
        cargarBeneficiosActivos();
    }
    
    inicializar();

    // Opcional: Actualizar cada cierto tiempo
    setInterval(async () => {
        cargarInformacionCliente();
        await cargarBeneficiosDisponibles();
        cargarBeneficiosActivos();
    }, 10000); // Cada 10 segundos
});
