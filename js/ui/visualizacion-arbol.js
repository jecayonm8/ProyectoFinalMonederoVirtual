// js/ui/visualizacion-arbol.js
import ClienteService from "../services/ClienteService.js";
import rangosService from "../services/RangosService.js";

document.addEventListener("DOMContentLoaded", () => {
    // Elementos del DOM
    const canvas = document.getElementById("tree-canvas");
    const ctx = canvas.getContext("2d");
    const mensajeDiv = document.getElementById("mensajeVisualizacion");
    
    // Elementos de información
    const totalNodosSpan = document.getElementById("total-nodos");
    const profundidadMaximaSpan = document.getElementById("profundidad-maxima");
    const nodosPlatino = document.getElementById("nodos-platino");
    const nodosOro = document.getElementById("nodos-oro");
    const nodosPlata = document.getElementById("nodos-plata");
    const nodosBronce = document.getElementById("nodos-bronce");
    
    // Botones de control
    const btnGenerarMuestra = document.getElementById("btn-generar-muestra");
    const btnToggleDetalles = document.getElementById("btn-toggle-detalles");
    const btnZoomIn = document.getElementById("btn-zoom-in");
    const btnZoomOut = document.getElementById("btn-zoom-out");
    const btnZoomReset = document.getElementById("btn-zoom-reset");
    
    // Variables de estado
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

    // Función para inicializar la visualización
    function inicializarVisualizacion() {
        const clienteActual = ClienteService.obtenerClienteActual();

        if (!clienteActual) {
            mensajeDiv.textContent = "No hay cliente logueado. Por favor, inicie sesión.";
            mensajeDiv.classList.add("error");
            return;
        }

        // Limpiar mensajes
        mensajeDiv.textContent = "";
        mensajeDiv.classList.remove("error", "success");
        
        // Obtener información del árbol
        actualizarInformacionArbol();
        
        // Dibujar árbol
        dibujarArbol();
        
        // Añadir oyentes de eventos para manipulación del canvas
        configurarEventosCanvas();
    }
    
    // Función para actualizar la información del árbol
    function actualizarInformacionArbol() {
        const infoArbol = rangosService.obtenerInformacionArbol();
        
        // Actualizar estadísticas
        totalNodosSpan.textContent = infoArbol.totalNodos;
        profundidadMaximaSpan.textContent = infoArbol.profundidadMaxima;
        
        // Actualizar contadores por rango
        nodosPlatino.textContent = infoArbol.estadisticas.Platino;
        nodosOro.textContent = infoArbol.estadisticas.Oro;
        nodosPlata.textContent = infoArbol.estadisticas.Plata;
        nodosBronce.textContent = infoArbol.estadisticas.Bronce;
    }
    
    // Función para dibujar el árbol AVL
    function dibujarArbol() {
        // Limpiar el canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        
        // Aplicar zoom y desplazamiento
        ctx.translate(offsetX, offsetY);
        ctx.scale(zoomLevel, zoomLevel);
        
        // Obtener la estructura del árbol
        const estructura = rangosService.obtenerEstructuraArbol();
        
        if (!estructura) {
            ctx.font = "20px Arial";
            ctx.fillStyle = "#333";
            ctx.textAlign = "center";
            ctx.fillText("No hay datos para mostrar. Genera datos de muestra o agrega clientes.", canvas.width / 2 / zoomLevel, canvas.height / 2 / zoomLevel);
            ctx.restore();
            return;
        }
        
        // Calcular propiedades para dibujo
        const profundidad = rangosService.arbolClientes.obtenerProfundidadMaxima();
        const nodeRadius = 30;
        const horizontalSpacing = 50;
        const verticalSpacing = 80;
        
        // Calcular ancho total necesario basado en el número de nodos
        const totalNodos = Math.pow(2, profundidad) - 1;
        const totalWidth = totalNodos * (nodeRadius * 2 + horizontalSpacing);
        
        // Dibujar el árbol recursivamente
        dibujarNodo(estructura, canvas.width / 2 / zoomLevel, 50, totalWidth / 2, verticalSpacing, nodeRadius);
        
        ctx.restore();
    }
    
    // Función recursiva para dibujar un nodo y sus hijos
    function dibujarNodo(nodo, x, y, espacioHorizontal, espacioVertical, radio) {
        if (!nodo) return;
        
        // Dibujar conexiones a los hijos primero (para que estén detrás)
        if (nodo.izquierda) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x - espacioHorizontal, y + espacioVertical);
            ctx.strokeStyle = "#666";
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Dibujar recursivamente el hijo izquierdo
            dibujarNodo(nodo.izquierda, x - espacioHorizontal, y + espacioVertical, espacioHorizontal / 2, espacioVertical, radio);
        }
        
        if (nodo.derecha) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + espacioHorizontal, y + espacioVertical);
            ctx.strokeStyle = "#666";
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Dibujar recursivamente el hijo derecho
            dibujarNodo(nodo.derecha, x + espacioHorizontal, y + espacioVertical, espacioHorizontal / 2, espacioVertical, radio);
        }
        
        // Determinar color basado en el rango
        const rango = nodo.rango || 'Bronce';
        const colorFondo = colores[rango] || '#999';
        const colorTexto = coloresTexto[rango] || '#fff';
        
        // Dibujar círculo del nodo
        ctx.beginPath();
        ctx.arc(x, y, radio, 0, Math.PI * 2);
        ctx.fillStyle = colorFondo;
        ctx.fill();
        ctx.strokeStyle = "#333";
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Dibujar texto del nodo
        ctx.font = "bold 12px Arial";
        ctx.fillStyle = colorTexto;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
        // Mostrar puntos y/o ID según la configuración
        if (mostrarDetalles) {
            ctx.fillText(`${nodo.puntos}`, x, y - 8);
            ctx.fillText(`${nodo.rango}`, x, y + 8);
            
            // Mostrar factor de equilibrio
            ctx.font = "10px Arial";
            ctx.fillStyle = "#333";
            ctx.fillText(`FE: ${nodo.equilibrio}`, x, y + radio + 12);
        } else {
            // Versión simplificada
            ctx.fillText(`${nodo.puntos}`, x, y);
        }
    }
    
    // Configurar eventos para interacción con el canvas
    function configurarEventosCanvas() {
        // Evento de arrastre (drag)
        canvas.addEventListener('mousedown', (e) => {
            isDragging = true;
            lastX = e.clientX;
            lastY = e.clientY;
            canvas.style.cursor = 'grabbing';
        });
        
        canvas.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - lastX;
            const deltaY = e.clientY - lastY;
            
            offsetX += deltaX;
            offsetY += deltaY;
            
            lastX = e.clientX;
            lastY = e.clientY;
            
            dibujarArbol();
        });
        
        canvas.addEventListener('mouseup', () => {
            isDragging = false;
            canvas.style.cursor = 'grab';
        });
        
        canvas.addEventListener('mouseleave', () => {
            isDragging = false;
            canvas.style.cursor = 'default';
        });
        
        // Evento de rueda (zoom)
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            
            // Determinar dirección del zoom
            const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
            
            // Limitar el zoom
            if (zoomLevel * zoomFactor < 0.2 || zoomLevel * zoomFactor > 5) return;
            
            // Calcular punto de origen para zoom
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            // Aplicar zoom alrededor del punto del ratón
            offsetX = mouseX - (mouseX - offsetX) * zoomFactor;
            offsetY = mouseY - (mouseY - offsetY) * zoomFactor;
            zoomLevel *= zoomFactor;
            
            dibujarArbol();
        });
    }
    
    // Manejar click en botón de generar muestra
    btnGenerarMuestra.addEventListener('click', () => {
        // Limpiar árbol existente y crear datos de muestra
        rangosService.crearDatosDeMuestra();
        
        mensajeDiv.textContent = "Datos de muestra generados correctamente.";
        mensajeDiv.classList.remove("error");
        mensajeDiv.classList.add("success");
        
        // Actualizar visualización
        actualizarInformacionArbol();
        resetearVista();
        dibujarArbol();
    });
    
    // Manejar click en toggle detalles
    btnToggleDetalles.addEventListener('click', () => {
        mostrarDetalles = !mostrarDetalles;
        dibujarArbol();
    });
    
    // Manejar controles de zoom
    btnZoomIn.addEventListener('click', () => {
        if (zoomLevel < 5) {
            zoomLevel *= 1.2;
            dibujarArbol();
        }
    });
    
    btnZoomOut.addEventListener('click', () => {
        if (zoomLevel > 0.2) {
            zoomLevel *= 0.8;
            dibujarArbol();
        }
    });
    
    btnZoomReset.addEventListener('click', () => {
        resetearVista();
    });
    
    // Función para resetear la vista
    function resetearVista() {
        zoomLevel = 1;
        offsetX = 0;
        offsetY = 0;
        dibujarArbol();
    }
    
    // Inicializar la visualización
    inicializarVisualizacion();
    
    // Configurar el canvas para arrastre
    canvas.style.cursor = 'grab';
});
