import ClienteService from "../services/ClienteService.js";
import SistemaPuntos from "../models/SistemaPuntos.js";
import Storage from "../../database/storage.js";

document.addEventListener("DOMContentLoaded", () => {
    // Elementos del DOM
    const puntosClienteSpan = document.getElementById("puntosCliente");
    const rangoClienteSpan = document.getElementById("rangoCliente");
    const progresoRangoDiv = document.getElementById("progresoRango");
    const progresoTextoSpan = document.getElementById("progresoTexto");
    const beneficiosContainer = document.getElementById("beneficiosContainer");
    const listaBeneficiosActivos = document.getElementById("listaBeneficiosActivos");
    const filterButtons = document.querySelectorAll(".filter-btn");
    
    const sistemaPuntos = new SistemaPuntos();
    let beneficiosActuales = {};
    let filtroActual = "all";

    /**
     * Función para cargar y mostrar la información del cliente
     */
    function cargarInformacionCliente() {
        const clienteActual = ClienteService.obtenerClienteActual();

        if (clienteActual) {
            // Obtener cliente completo del storage principal
            const clienteCompleto = ClienteService.buscarClientePorId(clienteActual.id);

            if (clienteCompleto) {
                // Actualizar puntos y rango
                puntosClienteSpan.textContent = clienteCompleto.puntos;
                rangoClienteSpan.textContent = clienteCompleto.rango;
                
                // Configurar el color del badge según el rango
                setRangoBadgeColor(clienteCompleto.rango);
                
                // Calcular y mostrar el progreso hacia el siguiente rango
                actualizarProgresoRango(clienteCompleto);
            } else {
                console.error("Error: Cliente actual no encontrado en el storage principal.");
                window.location.href = "login.html";
            }
        } else {
            console.warn("No hay cliente logueado. Redirigiendo a login...");
            window.location.href = "login.html";
        }
    }

    /**
     * Establece el color del badge de rango según el rango del cliente
     */
    function setRangoBadgeColor(rango) {
        const rangoBadge = document.querySelector(".rango-badge");
        if (!rangoBadge) return;
        
        // Eliminar clases anteriores
        rangoBadge.classList.remove("bronce", "plata", "oro", "platino");
        
        // Añadir la clase correspondiente
        rangoBadge.classList.add(rango.toLowerCase());
        
        // Definir estilos según el rango
        switch(rango.toLowerCase()) {
            case "bronce":
                rangoBadge.style.background = "linear-gradient(135deg, #CD7F32, #8B4513)";
                break;
            case "plata":
                rangoBadge.style.background = "linear-gradient(135deg, #C0C0C0, #A9A9A9)";
                break;
            case "oro":
                rangoBadge.style.background = "linear-gradient(135deg, #FFD700, #FFA000)";
                break;
            case "platino":
                rangoBadge.style.background = "linear-gradient(135deg, #E5E4E2, #A0B2C6)";
                break;
        }
    }

    /**
     * Actualiza la barra de progreso hacia el siguiente rango
     */
    function actualizarProgresoRango(cliente) {
        const puntos = cliente.puntos;
        const rango = cliente.rango || 'Bronce';
        let porcentaje = 0;
        let siguienteRango = "";
        
        // Verificar si ya tenemos un progreso máximo guardado para este cliente
        if (!cliente.progresoMaximo) {
            cliente.progresoMaximo = {};
        }
        
        // Calcular porcentaje basado en el rango (que nunca disminuye)
        if (rango === "Platino") {
            // Si ya es Platino, mostrar 100%
            porcentaje = 100;
            siguienteRango = "Máximo";
            cliente.progresoMaximo['Platino'] = 100;
        } else if (rango === "Oro") {
            // Si es Oro, mostrar progreso hacia Platino
            const puntosFaltantes = Math.max(0, 5000 - puntos);
            const rangoTotal = 5000 - 1000;
            const nuevoPorcentaje = 75 + (25 * (1 - (puntosFaltantes / rangoTotal)));
            
            // Usar el máximo porcentaje alcanzado para este rango
            if (!cliente.progresoMaximo['Oro'] || nuevoPorcentaje > cliente.progresoMaximo['Oro']) {
                cliente.progresoMaximo['Oro'] = nuevoPorcentaje;
            }
            
            porcentaje = cliente.progresoMaximo['Oro'];
            // Limitar a 99% si aún no ha alcanzado Platino
            porcentaje = Math.min(porcentaje, 99);
            siguienteRango = "Platino";
        } else if (rango === "Plata") {
            // Si es Plata, mostrar progreso hacia Oro
            const puntosFaltantes = Math.max(0, 1000 - puntos);
            const rangoTotal = 1000 - 500;
            const nuevoPorcentaje = 50 + (25 * (1 - (puntosFaltantes / rangoTotal)));
            
            // Usar el máximo porcentaje alcanzado para este rango
            if (!cliente.progresoMaximo['Plata'] || nuevoPorcentaje > cliente.progresoMaximo['Plata']) {
                cliente.progresoMaximo['Plata'] = nuevoPorcentaje;
            }
            
            porcentaje = cliente.progresoMaximo['Plata'];
            // Limitar a 74% si aún no ha alcanzado Oro
            porcentaje = Math.min(porcentaje, 74);
            siguienteRango = "Oro";
        } else {
            // Si es Bronce, mostrar progreso hacia Plata
            const nuevoPorcentaje = Math.min((puntos / 500) * 50, 49);
            
            // Usar el máximo porcentaje alcanzado para este rango
            if (!cliente.progresoMaximo['Bronce'] || nuevoPorcentaje > cliente.progresoMaximo['Bronce']) {
                cliente.progresoMaximo['Bronce'] = nuevoPorcentaje;
            }
            
            porcentaje = cliente.progresoMaximo['Bronce'];
            siguienteRango = "Plata";
        }
        
        // Guardar cambios del cliente para mantener el progreso máximo
        ClienteService.guardarClienteActualEnLocalStorage();
        Storage.actualizarCliente(cliente);
        
        // Asegurar que el porcentaje sea siempre positivo y no mayor a 100
        porcentaje = Math.max(0, Math.min(porcentaje, 100));
        
        // Actualizar la barra de progreso
        progresoRangoDiv.style.width = `${porcentaje}%`;
        
        // Actualizar el texto de progreso
        if (rango !== "Platino") {
            progresoTextoSpan.textContent = `${Math.round(porcentaje)}% hacia ${siguienteRango}`;
        } else {
            progresoTextoSpan.textContent = "¡Has alcanzado el rango máximo!";
        }
    }

    /**
     * Carga y muestra los beneficios disponibles
     */
    async function cargarBeneficiosDisponibles() {
        const cliente = ClienteService.obtenerClienteActual();
        if (!cliente || !beneficiosContainer) return;

        const beneficios = sistemaPuntos.obtenerBeneficiosDisponibles(cliente.rango);
        beneficiosActuales = beneficios; // Guardar para uso en filtrado
        
        renderizarBeneficios(beneficios, cliente.puntos, filtroActual);
    }

    /**
     * Renderiza los beneficios en la interfaz según el filtro seleccionado
     */
    function renderizarBeneficios(beneficios, puntos, filtro) {
        let html = '<div class="benefits-grid">';
        const beneficiosArray = Object.entries(beneficios);
        
        // Aplicar filtro
        const beneficiosFiltrados = beneficiosArray.filter(([_, beneficio]) => {
            const puedeCanjar = puntos >= beneficio.costoPuntos;
            if (filtro === "available") return puedeCanjar;
            if (filtro === "unavailable") return !puedeCanjar;
            return true; // "all"
        });
        
        if (beneficiosFiltrados.length === 0) {
            html = '<p class="no-benefits">No hay beneficios disponibles con este filtro.</p>';
        } else {
            beneficiosFiltrados.forEach(([beneficioId, beneficio]) => {
                const puedeCanjar = puntos >= beneficio.costoPuntos;
                
                html += `
                    <div class="benefit-card ${puedeCanjar ? 'available' : 'unavailable'}">
                        <h4>${beneficio.nombre}</h4>
                        <p class="benefit-description">${beneficio.descripcion}</p>
                        <p class="benefit-cost">${beneficio.costoPuntos} puntos</p>
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
        }
        
        beneficiosContainer.innerHTML = html;
    }

    /**
     * Carga y muestra los beneficios activos del cliente
     */
    function cargarBeneficiosActivos() {
        const cliente = ClienteService.obtenerClienteActual();
        if (!cliente || !listaBeneficiosActivos) return;

        if (!cliente.beneficiosActivos || cliente.beneficiosActivos.length === 0) {
            listaBeneficiosActivos.innerHTML = '<p>No tienes beneficios activos.</p>';
            return;
        }

        let html = '<div class="active-benefits-list">';
        
        cliente.beneficiosActivos.forEach(beneficio => {
            const fechaExpiracion = beneficio.fechaExpiracion ? 
                new Date(beneficio.fechaExpiracion).toLocaleDateString() : 'No expira';
            
            // Si el beneficio tiene un tipo 'bono_saldo', no mostramos el botón de cancelar
            // ya que estos beneficios se aplican inmediatamente
            const esBeneficioCancelable = beneficio.tipo !== 'bono_saldo';
                
            html += `
                <div class="active-benefit-item" id="beneficio-${beneficio.id || Date.now()}">
                    <h5>${beneficio.nombre}</h5>
                    ${beneficio.usosRestantes ? 
                        `<p>Usos restantes: ${beneficio.usosRestantes}</p>` : 
                        `<p>Duración: ${fechaExpiracion}</p>`
                    }
                    <p class="benefit-date">Canjeado: ${new Date(beneficio.fechaCanje).toLocaleDateString()}</p>
                    ${esBeneficioCancelable ? 
                        `<button class="cancel-benefit-btn" onclick="cancelarBeneficioActivo('${beneficio.id || beneficio.nombre.replace(/\s+/g, '_').toLowerCase()}')">Cancelar beneficio</button>` : 
                        '<p class="no-cancel-note">Este beneficio no se puede cancelar.</p>'}
                </div>
            `;
        });
        
        html += '</div>';
        listaBeneficiosActivos.innerHTML = html;
    }

    /**
     * Configura los botones de filtro
     */
    function configurarFiltros() {
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Actualizar estado activo de los botones
                filterButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                // Actualizar filtro y rerenderizar
                filtroActual = button.getAttribute('data-filter');
                const cliente = ClienteService.obtenerClienteActual();
                if (cliente) {
                    renderizarBeneficios(beneficiosActuales, cliente.puntos, filtroActual);
                }
            });
        });
    }

    // Función global para canjear beneficios
    window.canjearBeneficio = async function(beneficioId) {
        const cliente = ClienteService.obtenerClienteActual();
        if (!cliente) {
            alert('Error: No hay cliente logueado.');
            return;
        }

        try {
            const sistemaPuntos = new SistemaPuntos();
            const resultado = await sistemaPuntos.canjearPuntos(cliente, beneficioId);

            if (resultado.exito) {
                // Guardar cambios en el almacenamiento para que persistan
                Storage.actualizarCliente(cliente);
                Storage.guardarDatos();
                ClienteService.guardarClienteActualEnLocalStorage();
                
                alert(resultado.mensaje);
                
                // Actualizar puntos y beneficios en la interfaz
                cargarInformacionCliente();
                await cargarBeneficiosDisponibles();
                cargarBeneficiosActivos();
            } else {
                alert(resultado.mensaje);
            }
        } catch (error) {
            console.error('Error al canjear beneficio:', error);
            alert('Error al canjear el beneficio. Por favor, inténtalo de nuevo.');
        }
    };
    
    // Función global para cancelar beneficios activos
    window.cancelarBeneficioActivo = function(beneficioId) {
        if (!confirm('¿Estás seguro de que deseas cancelar este beneficio? Esta acción no se puede deshacer.')) {
            return;
        }
        
        try {
            const cliente = ClienteService.obtenerClienteActual();
            if (!cliente) {
                alert('Error: No hay cliente logueado.');
                return;
            }
            
            const resultado = ClienteService.cancelarBeneficioActivo(beneficioId);
            
            if (resultado.exito) {
                // Guardar cambios en el almacenamiento para que persistan
                Storage.actualizarCliente(cliente);
                Storage.guardarDatos();
                ClienteService.guardarClienteActualEnLocalStorage();
                
                alert(resultado.mensaje);
                // Actualizar la lista de beneficios activos
                cargarBeneficiosActivos();
                
                // También actualizamos la información del cliente y beneficios disponibles
                cargarInformacionCliente();
            } else {
                alert(resultado.mensaje || 'No se pudo cancelar el beneficio.');
            }
        } catch (error) {
            console.error('Error al cancelar beneficio:', error);
            alert('Error al cancelar el beneficio. Por favor, inténtalo de nuevo.');
        }
    };

    // Inicializar la página
    async function inicializar() {
        cargarInformacionCliente();
        configurarFiltros();
        await cargarBeneficiosDisponibles();
        cargarBeneficiosActivos();
    }
    
    inicializar();

    // Actualizar cada cierto tiempo
    setInterval(async () => {
        cargarInformacionCliente();
        await cargarBeneficiosDisponibles();
        cargarBeneficiosActivos();
    }, 10000); // Cada 10 segundos
});
