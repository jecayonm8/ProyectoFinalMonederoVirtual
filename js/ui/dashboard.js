import ClienteService from "../services/ClienteService.js";
import SistemaPuntos from "../models/SistemaPuntos.js";
import rangosService from "../services/RangosService.js";

document.addEventListener("DOMContentLoaded", () => {
    const saldoClienteSpan = document.getElementById("saldoCliente");
    const puntosClienteSpan = document.getElementById("puntosCliente");
    const rangoClienteSpan = document.getElementById("rangoCliente");
    const beneficiosContainer = document.getElementById("beneficiosContainer");
    const listaBeneficiosActivos = document.getElementById("listaBeneficiosActivos");
    
    // Elementos para la visualización del árbol
    const canvas = document.getElementById("tree-canvas");
    const ctx = canvas.getContext("2d");
    const totalNodosSpan = document.getElementById("total-nodos");
    const profundidadMaximaSpan = document.getElementById("profundidad-maxima");
    const nodosPlatino = document.getElementById("nodos-platino");
    const nodosOro = document.getElementById("nodos-oro");
    const nodosPlata = document.getElementById("nodos-plata");
    const nodosBronce = document.getElementById("nodos-bronce");
    
    // Botones de control del árbol
    const btnGenerarMuestra = document.getElementById("btn-generar-muestra");
    const btnToggleDetalles = document.getElementById("btn-toggle-detalles");
    const btnZoomIn = document.getElementById("btn-zoom-in");
    const btnZoomOut = document.getElementById("btn-zoom-out");
    const btnZoomReset = document.getElementById("btn-zoom-reset");

    const sistemaPuntos = new SistemaPuntos();
    
    // Variables de estado para la visualización del árbol
    let mostrarDetalles = true;
    let zoomLevel = 1;
    let offsetX = 0;
    let offsetY = 0;
    let isDragging = false;
    let lastX, lastY;
    
    // Colores para los rangos
    const colores = {
        'Platino': '#e5e4e2',
        'Oro': '#ffd700',
        'Plata': '#c0c0c0',
        'Bronce': '#cd7f32'
    };
    
    // Colores de texto para los rangos
    const coloresTexto = {
        'Platino': '#333333',
        'Oro': '#333333',
        'Plata': '#333333',
        'Bronce': '#ffffff'
    };

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

    // Funciones para la visualización del árbol AVL
    function inicializarVisualizacion() {
        if (!canvas || !ctx) {
            console.error("Error: No se pudo obtener el canvas o su contexto");
            return;
        }
        
        // Resetear la vista
        resetearVista();
        
        // Actualizar la información del árbol
        actualizarInformacionArbol();
        
        // Dibujar el árbol
        dibujarArbol();
        
        // Configurar eventos para interacción con el canvas
        configurarEventosCanvas();
    }
    
    function actualizarInformacionArbol() {
        if (!totalNodosSpan || !profundidadMaximaSpan) return;
        
        const arbol = rangosService.obtenerEstructuraArbol();
        const estadisticas = rangosService.obtenerEstadisticasArbol();
        
        if (estadisticas) {
            totalNodosSpan.textContent = estadisticas.totalNodos || 0;
            profundidadMaximaSpan.textContent = estadisticas.profundidadMaxima || 0;
            nodosPlatino.textContent = estadisticas.nodosPorRango?.Platino || 0;
            nodosOro.textContent = estadisticas.nodosPorRango?.Oro || 0;
            nodosPlata.textContent = estadisticas.nodosPorRango?.Plata || 0;
            nodosBronce.textContent = estadisticas.nodosPorRango?.Bronce || 0;
        }
    }
    
    function dibujarArbol() {
        if (!canvas || !ctx) return;
        
        // Limpiar canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Aplicar transformaciones para zoom y desplazamiento
        ctx.save();
        ctx.translate(offsetX, offsetY);
        ctx.scale(zoomLevel, zoomLevel);
        
        const arbol = rangosService.obtenerEstructuraArbol();
        
        if (!arbol || !arbol.raiz) {
            // Si no hay árbol, mostrar un mensaje
            ctx.font = "20px Arial";
            ctx.fillStyle = "#333";
            ctx.textAlign = "center";
            ctx.fillText("No hay clientes en el árbol", canvas.width / (2 * zoomLevel) - offsetX / zoomLevel, canvas.height / (2 * zoomLevel) - offsetY / zoomLevel);
            ctx.restore();
            return;
        }
        
        // Parámetros para el dibujo
        const radioNodo = 30;
        const espacioVertical = 100;
        const espacioHorizontal = canvas.width / 4;
        
        // Dibujar el árbol desde la raíz
        dibujarNodo(arbol.raiz, canvas.width / (2 * zoomLevel) - offsetX / zoomLevel, 50, espacioHorizontal / zoomLevel, espacioVertical, radioNodo);
        
        ctx.restore();
    }
    
    function dibujarNodo(nodo, x, y, espacioHorizontal, espacioVertical, radio) {
        if (!nodo) return;
        
        // Determinar color según el rango
        const color = colores[nodo.rango] || '#999';
        const colorTexto = coloresTexto[nodo.rango] || '#fff';
        
        // Dibujar líneas a los nodos hijos
        ctx.beginPath();
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 2;
        
        if (nodo.izquierda) {
            ctx.moveTo(x, y);
            ctx.lineTo(x - espacioHorizontal, y + espacioVertical);
            ctx.stroke();
        }
        
        if (nodo.derecha) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + espacioHorizontal, y + espacioVertical);
            ctx.stroke();
        }
        
        // Dibujar el nodo
        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.arc(x, y, radio, 0, Math.PI * 2);
        ctx.fill();
        
        // Dibujar borde
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Dibujar texto (puntos)
        ctx.fillStyle = colorTexto;
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        if (mostrarDetalles) {
            // Puntos y rango
            ctx.fillText(`${nodo.puntos}`, x, y - 8);
            ctx.fillText(`${nodo.rango.substring(0, 3)}`, x, y + 8);
            
            // Factor de equilibrio
            if (nodo.fe !== undefined) {
                ctx.fillStyle = '#fff';
                ctx.font = '10px Arial';
                ctx.beginPath();
                ctx.arc(x + radio - 8, y - radio + 8, 8, 0, Math.PI * 2);
                ctx.fillStyle = '#333';
                ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.fillText(nodo.fe, x + radio - 8, y - radio + 8);
            }
        } else {
            // Solo rango
            ctx.fillText(`${nodo.rango.substring(0, 3)}`, x, y);
        }
        
        // Dibujar recursivamente los hijos
        if (nodo.izquierda) {
            dibujarNodo(nodo.izquierda, x - espacioHorizontal, y + espacioVertical, espacioHorizontal / 2, espacioVertical, radio);
        }
        
        if (nodo.derecha) {
            dibujarNodo(nodo.derecha, x + espacioHorizontal, y + espacioVertical, espacioHorizontal / 2, espacioVertical, radio);
        }
    }
    
    function configurarEventosCanvas() {
        if (!canvas) return;
        
        // Evento de rueda para zoom
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            zoomLevel = Math.max(0.5, Math.min(2, zoomLevel + delta));
            dibujarArbol();
        });
        
        // Eventos para arrastrar el canvas
        canvas.addEventListener('mousedown', (e) => {
            isDragging = true;
            lastX = e.clientX;
            lastY = e.clientY;
        });
        
        canvas.addEventListener('mousemove', (e) => {
            if (isDragging) {
                const deltaX = e.clientX - lastX;
                const deltaY = e.clientY - lastY;
                offsetX += deltaX;
                offsetY += deltaY;
                lastX = e.clientX;
                lastY = e.clientY;
                dibujarArbol();
            }
        });
        
        canvas.addEventListener('mouseup', () => {
            isDragging = false;
        });
        
        canvas.addEventListener('mouseleave', () => {
            isDragging = false;
        });
        
        // Hacer el canvas receptivo al tamaño de la ventana
        window.addEventListener('resize', () => {
            dibujarArbol();
        });
    }
    
    function resetearVista() {
        zoomLevel = 1;
        offsetX = 0;
        offsetY = 0;
        dibujarArbol();
    }
    
    // Configurar los botones de control del árbol
    if (btnGenerarMuestra) {
        // Cambiar el texto del botón para reflejar su función real
        btnGenerarMuestra.textContent = "Actualizar Árbol";
        
        btnGenerarMuestra.addEventListener('click', () => {
            // Recargar el árbol con los clientes actuales del sistema
            rangosService.recargarArbol();
            actualizarInformacionArbol();
            dibujarArbol();
        });
    }
    
    if (btnToggleDetalles) {
        btnToggleDetalles.addEventListener('click', () => {
            mostrarDetalles = !mostrarDetalles;
            dibujarArbol();
        });
    }
    
    if (btnZoomIn) {
        btnZoomIn.addEventListener('click', () => {
            zoomLevel = Math.min(2, zoomLevel + 0.1);
            dibujarArbol();
        });
    }
    
    if (btnZoomOut) {
        btnZoomOut.addEventListener('click', () => {
            zoomLevel = Math.max(0.5, zoomLevel - 0.1);
            dibujarArbol();
        });
    }
    
    if (btnZoomReset) {
        btnZoomReset.addEventListener('click', resetearVista);
    }
    
    function inicializar() {
        cargarInformacionCliente();
        cargarBeneficiosDisponibles();
        cargarBeneficiosActivos();
        
        // Recargar el árbol AVL con los clientes actuales antes de inicializar la visualización
        rangosService.recargarArbol();
        inicializarVisualizacion();
    }
    
    inicializar();

    // Opcional: Actualizar cada cierto tiempo
    setInterval(async () => {
        cargarInformacionCliente();
        await cargarBeneficiosDisponibles();
        cargarBeneficiosActivos();
    }, 10000); // Cada 10 segundos
});
