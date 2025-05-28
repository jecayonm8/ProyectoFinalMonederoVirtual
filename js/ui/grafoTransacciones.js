// js/ui/grafoTransacciones.js

import ClienteService from "../services/ClienteService.js";
import grafoTransaccionesService from "../services/GrafoTransaccionesService.js";
import Storage from "../../database/storage.js";

document.addEventListener("DOMContentLoaded", () => {
    // Elementos del DOM
    const graphTypeSelect = document.getElementById("graphType");
    const minWeightInput = document.getElementById("minWeight");
    const minWeightValueSpan = document.getElementById("minWeightValue");
    const refreshGraphBtn = document.getElementById("refreshGraphBtn");
    const graphContainer = document.getElementById("graphContainer");
    const topWalletsList = document.getElementById("topWallets");
    const topPathsList = document.getElementById("topPaths");
    
    // Variables para el grafo
    let simulation = null;
    let svg = null;
    let width = graphContainer.clientWidth;
    let height = graphContainer.clientHeight;
    let minWeight = 0;
    
    /**
     * Inicializa la visualización
     */
    function inicializar() {
        // Inicializar SVG
        svg = d3.select("#graphContainer")
            .append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("viewBox", [0, 0, width, height]);
        
        // Añadir marcadores para las flechas de los enlaces
        svg.append("defs").append("marker")
            .attr("id", "arrowhead")
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 20) // Ajustar para que la flecha aparezca cerca del nodo destino
            .attr("refY", 0)
            .attr("orient", "auto")
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("xoverflow", "visible")
            .append("path")
            .attr("d", "M 0,-5 L 10,0 L 0,5")
            .attr("fill", "#fff")
            .style("stroke", "none");
        
        // Actualizar valor del rango
        minWeightInput.addEventListener("input", () => {
            minWeightValueSpan.textContent = minWeightInput.value;
            minWeight = parseInt(minWeightInput.value);
        });
        
        // Configurar el botón de actualización
        refreshGraphBtn.addEventListener("click", () => {
            actualizarGrafo();
        });
        
        // Cargar datos iniciales
        actualizarGrafo();
        actualizarEstadisticas();
    }
    
    /**
     * Actualiza la visualización del grafo según los parámetros seleccionados
     */
    function actualizarGrafo() {
        // Mostrar spinner de carga
        graphContainer.innerHTML = '<div class="loading-spinner"></div>';
        
        // Recrear el SVG
        svg = d3.select("#graphContainer")
            .html("")
            .append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("viewBox", [0, 0, width, height]);
        
        // Añadir marcadores para las flechas
        svg.append("defs").append("marker")
            .attr("id", "arrowhead")
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 20)
            .attr("refY", 0)
            .attr("orient", "auto")
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("xoverflow", "visible")
            .append("path")
            .attr("d", "M 0,-5 L 10,0 L 0,5")
            .attr("fill", "#fff")
            .style("stroke", "none");
        
        // Obtener datos del grafo según la selección
        let datosGrafo;
        if (graphTypeSelect.value === "personal") {
            // Usar solo el grafo del cliente actual
            datosGrafo = obtenerDatosGrafoPersonal();
        } else {
            // Usar el grafo global de todas las transacciones
            datosGrafo = obtenerDatosGrafoGlobal();
        }
        
        // Filtrar enlaces por peso mínimo
        datosGrafo.enlaces = datosGrafo.enlaces.filter(enlace => enlace.value >= minWeight);
        
        // Si no hay datos, mostrar mensaje
        if (datosGrafo.nodos.length === 0 || datosGrafo.enlaces.length === 0) {
            mostrarMensajeNoHayDatos();
            return;
        }
        
        // Crear la simulación de fuerzas
        crearSimulacion(datosGrafo);
    }
    
    /**
     * Obtiene los datos del grafo personal (solo del cliente actual)
     */
    function obtenerDatosGrafoPersonal() {
        const grafo = grafoTransaccionesService.obtenerGrafoCliente();
        return formatearDatosGrafo(grafo);
    }
    
    /**
     * Obtiene los datos del grafo global (todos los clientes)
     */
    function obtenerDatosGrafoGlobal() {
        const grafo = grafoTransaccionesService.obtenerGrafoGlobal();
        return formatearDatosGrafo(grafo);
    }
    
    /**
     * Formatea los datos del grafo para D3.js
     */
    function formatearDatosGrafo(grafo) {
        const nodos = [];
        const nodosMap = new Map();
        const enlaces = [];
        
        // Obtener todos los nodos del grafo
        grafo.getNodes().forEach(id => {
            const [clienteId, monederoId] = id.split('-');
            
            // Intentar obtener información adicional del nodo
            let nombreCliente = "Cliente " + clienteId;
            let nombreMonedero = "Monedero " + monederoId;
            let tipo = "desconocido";
            
            const cliente = Storage.buscarCliente(clienteId);
            if (cliente) {
                nombreCliente = cliente.nombre;
                
                if (cliente.monederos && Array.isArray(cliente.monederos)) {
                    const monedero = cliente.monederos.find(m => m.id === monederoId);
                    if (monedero) {
                        nombreMonedero = monedero.nombre;
                        tipo = monedero.tipo;
                    }
                }
            }
            
            // Crear objeto del nodo
            const nodo = {
                id,
                clienteId,
                monederoId,
                nombreCliente,
                nombreMonedero,
                tipo,
                label: `${nombreMonedero} (${nombreCliente.split(' ')[0]})`
            };
            
            nodos.push(nodo);
            nodosMap.set(id, nodo);
        });
        
        // Obtener todos los enlaces del grafo
        grafo.getNodes().forEach(origen => {
            const adyacentes = grafo.getAdjacentNodes(origen);
            if (!adyacentes) return;
            
            for (const [destino, peso] of adyacentes.entries()) {
                // Solo añadir el enlace si ambos nodos existen
                if (nodosMap.has(origen) && nodosMap.has(destino)) {
                    enlaces.push({
                        source: origen,
                        target: destino,
                        value: peso
                    });
                }
            }
        });
        
        return { nodos, enlaces };
    }
    
    /**
     * Crea la simulación de fuerzas con D3.js
     */
    function crearSimulacion(datos) {
        const { nodos, enlaces } = datos;
        
        // Definir colores según el tipo de monedero
        const color = d3.scaleOrdinal()
            .domain(["Ahorros", "Gastos", "Inversiones", "desconocido"])
            .range(["#4CAF50", "#FF9800", "#2196F3", "#9E9E9E"]);
        
        // Definir escala para el tamaño de nodos según conexiones
        const nodeSizeScale = d3.scaleLinear()
            .domain([0, d3.max(nodos, d => {
                const conexionesSalientes = enlaces.filter(l => l.source === d.id).length;
                const conexionesEntrantes = enlaces.filter(l => l.target === d.id).length;
                return conexionesSalientes + conexionesEntrantes;
            })])
            .range([5, 15])
            .clamp(true);
        
        // Definir escala para el ancho de los enlaces según el valor
        const linkWidthScale = d3.scaleLinear()
            .domain([
                d3.min(enlaces, d => d.value),
                d3.max(enlaces, d => d.value)
            ])
            .range([1, 5])
            .clamp(true);
        
        // Crear tooltip
        const tooltip = d3.select("body")
            .append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);
        
        // Crear la simulación de fuerzas
        simulation = d3.forceSimulation(nodos)
            .force("link", d3.forceLink(enlaces)
                .id(d => d.id)
                .distance(100))
            .force("charge", d3.forceManyBody().strength(-300))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collision", d3.forceCollide().radius(30));
        
        // Crear los enlaces
        const link = svg.append("g")
            .selectAll("line")
            .data(enlaces)
            .enter()
            .append("line")
            .attr("class", "link")
            .attr("stroke-width", d => linkWidthScale(d.value))
            .attr("marker-end", "url(#arrowhead)")
            .on("mouseover", function(event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr("stroke", "#FFC107")
                    .attr("stroke-opacity", 1);
                
                // Encontrar nodos fuente y destino
                const sourceNode = nodos.find(n => n.id === d.source.id || n.id === d.source);
                const targetNode = nodos.find(n => n.id === d.target.id || n.id === d.target);
                
                tooltip.transition()
                    .duration(200)
                    .style("opacity", 0.9);
                tooltip.html(`
                    <strong>Transferencia:</strong><br>
                    <span>De: ${sourceNode ? sourceNode.label : d.source}</span><br>
                    <span>A: ${targetNode ? targetNode.label : d.target}</span><br>
                    <span>Monto total: $${d.value.toFixed(2)}</span>
                `)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function() {
                d3.select(this)
                    .transition()
                    .duration(500)
                    .attr("stroke", "rgba(255, 255, 255, 0.5)")
                    .attr("stroke-opacity", 0.6);
                
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            });
        
        // Crear los nodos
        const node = svg.append("g")
            .selectAll(".node")
            .data(nodos)
            .enter()
            .append("g")
            .attr("class", "node")
            .call(d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended));
        
        // Añadir círculos a los nodos
        node.append("circle")
            .attr("r", d => {
                const conexionesSalientes = enlaces.filter(l => l.source === d.id || (l.source.id && l.source.id === d.id)).length;
                const conexionesEntrantes = enlaces.filter(l => l.target === d.id || (l.target.id && l.target.id === d.id)).length;
                return nodeSizeScale(conexionesSalientes + conexionesEntrantes);
            })
            .attr("fill", d => color(d.tipo))
            .on("mouseover", function(event, d) {
                // Conexiones de este nodo
                const conexionesSalientes = enlaces.filter(l => l.source === d.id || (l.source.id && l.source.id === d.id));
                const conexionesEntrantes = enlaces.filter(l => l.target === d.id || (l.target.id && l.target.id === d.id));
                
                // Calcular totales
                const totalSaliente = conexionesSalientes.reduce((sum, link) => sum + link.value, 0);
                const totalEntrante = conexionesEntrantes.reduce((sum, link) => sum + link.value, 0);
                
                tooltip.transition()
                    .duration(200)
                    .style("opacity", 0.9);
                tooltip.html(`
                    <strong>${d.nombreMonedero}</strong><br>
                    <span>Cliente: ${d.nombreCliente}</span><br>
                    <span>Tipo: ${d.tipo}</span><br>
                    <span>Transferencias enviadas: ${conexionesSalientes.length} ($${totalSaliente.toFixed(2)})</span><br>
                    <span>Transferencias recibidas: ${conexionesEntrantes.length} ($${totalEntrante.toFixed(2)})</span>
                `)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
                
                // Resaltar nodo y sus conexiones
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr("r", d => {
                        const size = nodeSizeScale(conexionesSalientes.length + conexionesEntrantes.length);
                        return size * 1.5;
                    })
                    .attr("fill", "#FFC107");
                
                // Resaltar enlaces conectados
                link.transition()
                    .duration(200)
                    .attr("stroke", l => {
                        if ((l.source === d.id || (l.source.id && l.source.id === d.id)) || 
                            (l.target === d.id || (l.target.id && l.target.id === d.id))) {
                            return "#FFC107";
                        }
                        return "rgba(255, 255, 255, 0.2)";
                    })
                    .attr("stroke-opacity", l => {
                        if ((l.source === d.id || (l.source.id && l.source.id === d.id)) || 
                            (l.target === d.id || (l.target.id && l.target.id === d.id))) {
                            return 1;
                        }
                        return 0.2;
                    })
                    .attr("stroke-width", l => {
                        if ((l.source === d.id || (l.source.id && l.source.id === d.id)) || 
                            (l.target === d.id || (l.target.id && l.target.id === d.id))) {
                            return linkWidthScale(l.value) * 1.5;
                        }
                        return linkWidthScale(l.value);
                    });
            })
            .on("mouseout", function(event, d) {
                d3.select(this)
                    .transition()
                    .duration(500)
                    .attr("r", d => {
                        const conexionesSalientes = enlaces.filter(l => l.source === d.id || (l.source.id && l.source.id === d.id)).length;
                        const conexionesEntrantes = enlaces.filter(l => l.target === d.id || (l.target.id && l.target.id === d.id)).length;
                        return nodeSizeScale(conexionesSalientes + conexionesEntrantes);
                    })
                    .attr("fill", d => color(d.tipo));
                
                // Restaurar enlaces
                link.transition()
                    .duration(500)
                    .attr("stroke", "rgba(255, 255, 255, 0.5)")
                    .attr("stroke-opacity", 0.6)
                    .attr("stroke-width", d => linkWidthScale(d.value));
                
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            });
        
        // Añadir etiquetas a los nodos
        node.append("text")
            .attr("dy", -15)
            .text(d => d.label)
            .attr("font-size", "10px")
            .attr("text-anchor", "middle");
        
        // Añadir comportamiento a la simulación
        simulation.on("tick", () => {
            link
                .attr("x1", d => Math.max(10, Math.min(width - 10, d.source.x)))
                .attr("y1", d => Math.max(10, Math.min(height - 10, d.source.y)))
                .attr("x2", d => Math.max(10, Math.min(width - 10, d.target.x)))
                .attr("y2", d => Math.max(10, Math.min(height - 10, d.target.y)));
                
            node
                .attr("transform", d => `translate(${Math.max(10, Math.min(width - 10, d.x))}, ${Math.max(10, Math.min(height - 10, d.y))})`);
        });
        
        // Funciones para arrastrar nodos
        function dragstarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }
        
        function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        }
        
        function dragended(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }
    }
    
    /**
     * Prepara el contenedor del grafo cuando no hay datos para mostrar
     */
    function mostrarMensajeNoHayDatos() {
        // Limpiar el contenedor sin mostrar mensaje
        graphContainer.innerHTML = `
            <div class="graph-empty-state"></div>
        `;
    }
    
    /**
     * Actualiza las estadísticas del grafo
     */
    function actualizarEstadisticas() {
        // Obtener monederos con más transferencias
        const topMonederos = grafoTransaccionesService.obtenerMonederosConMasTransferencias(5);
        
        // Obtener caminos más frecuentes
        const topCaminos = grafoTransaccionesService.obtenerCaminosMasFrecuentes(5);
        
        // Mostrar monederos con más transferencias
        topWalletsList.innerHTML = '';
        if (topMonederos.length > 0) {
            topMonederos.forEach(monedero => {
                // Obtener detalles del monedero
                let nombreMonedero = "Monedero " + monedero.monederoId;
                let nombreCliente = "Cliente " + monedero.clienteId;
                
                const cliente = Storage.buscarCliente(monedero.clienteId);
                if (cliente) {
                    nombreCliente = cliente.nombre;
                    
                    if (cliente.monederos && Array.isArray(cliente.monederos)) {
                        const monederoObj = cliente.monederos.find(m => m.id === monedero.monederoId);
                        if (monederoObj) {
                            nombreMonedero = monederoObj.nombre;
                        }
                    }
                }
                
                topWalletsList.innerHTML += `
                    <li>
                        <div>
                            <strong>${nombreMonedero}</strong>
                            <div>${nombreCliente}</div>
                            <small>Conexiones: ${monedero.conexiones}</small>
                        </div>
                        <span class="amount">$${monedero.totalSaliente.toFixed(2)}</span>
                    </li>
                `;
            });
        }
        
        // Mostrar caminos más frecuentes
        topPathsList.innerHTML = '';
        if (topCaminos.length > 0) {
            topCaminos.forEach(camino => {
                // Obtener detalles del origen
                let origenMonedero = "Monedero " + camino.origenMonederoId;
                let origenCliente = "Cliente " + camino.origenClienteId;
                
                // Obtener detalles del destino
                let destinoMonedero = "Monedero " + camino.destinoMonederoId;
                let destinoCliente = "Cliente " + camino.destinoClienteId;
                
                const clienteOrigen = Storage.buscarCliente(camino.origenClienteId);
                if (clienteOrigen) {
                    origenCliente = clienteOrigen.nombre;
                    
                    if (clienteOrigen.monederos && Array.isArray(clienteOrigen.monederos)) {
                        const monederoObj = clienteOrigen.monederos.find(m => m.id === camino.origenMonederoId);
                        if (monederoObj) {
                            origenMonedero = monederoObj.nombre;
                        }
                    }
                }
                
                const clienteDestino = Storage.buscarCliente(camino.destinoClienteId);
                if (clienteDestino) {
                    destinoCliente = clienteDestino.nombre;
                    
                    if (clienteDestino.monederos && Array.isArray(clienteDestino.monederos)) {
                        const monederoObj = clienteDestino.monederos.find(m => m.id === camino.destinoMonederoId);
                        if (monederoObj) {
                            destinoMonedero = monederoObj.nombre;
                        }
                    }
                }
                
                topPathsList.innerHTML += `
                    <li>
                        <div>
                            <strong>${origenMonedero} → ${destinoMonedero}</strong>
                            <div>${origenCliente} → ${destinoCliente}</div>
                        </div>
                        <span class="amount">$${camino.volumen.toFixed(2)}</span>
                    </li>
                `;
            });
        }
    }
    
    // Ajustar el tamaño cuando cambia el tamaño de la ventana
    window.addEventListener("resize", () => {
        width = graphContainer.clientWidth;
        height = graphContainer.clientHeight;
        
        if (simulation) {
            simulation.force("center", d3.forceCenter(width / 2, height / 2));
            simulation.alpha(0.3).restart();
        }
        
        svg.attr("viewBox", [0, 0, width, height]);
    });
    
    // Inicializar la visualización
    inicializar();
});
