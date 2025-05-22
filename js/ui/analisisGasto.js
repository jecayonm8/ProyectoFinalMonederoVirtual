// js/ui/analisisGasto.js

import ClienteService from "../services/ClienteService.js";
import AnalisisGastoService from "../services/AnalisisGastoService.js";

document.addEventListener("DOMContentLoaded", () => {
    const clienteActualInfoDiv = document.getElementById("clienteActualInfo");
    const gastosPorCategoriaList = document.getElementById("gastosPorCategoriaList");
    const transferenciasSalientesList = document.getElementById("transferenciasSalientesList");
    const clientesMasInteraccionList = document.getElementById("clientesMasInteraccionList");
    const categoriasMasPopularesList = document.getElementById("categoriasMasPopularesList");
    const networkGraphDiv = document.getElementById("networkGraph"); // <-- Nuevo elemento para el grafo

    const clienteLogueado = ClienteService.obtenerClienteActual();

    if (!clienteLogueado) {
        clienteActualInfoDiv.innerHTML = "<p class='error'>No hay cliente logueado. Por favor, inicie sesión.</p>";
        // Opcional: Redirigir al login
        // window.location.href = '../index.html';
        return;
    }

    clienteActualInfoDiv.innerHTML = `
        <p>Cliente: <strong>${clienteLogueado.nombre}</strong> (ID: ${clienteLogueado.id})</p>
    `;

    // --- Renderizar Gastos por Categoría del cliente actual ---
    function renderGastosPorCategoria() {
        gastosPorCategoriaList.innerHTML = ''; // Limpiar lista
        const gastos = AnalisisGastoService.obtenerGastosPorCategoria(clienteLogueado.id);
        if (gastos.size === 0) {
            gastosPorCategoriaList.innerHTML = '<li>No se han registrado gastos por categoría para este cliente.</li>';
        } else {
            gastos.forEach((monto, categoria) => {
                const li = document.createElement('li');
                li.innerHTML = `<span>${categoria}:</span> $${monto.toFixed(2)}`;
                gastosPorCategoriaList.appendChild(li);
            });
        }
    }

    // --- Renderizar Transferencias Salientes del cliente actual ---
    function renderTransferenciasSalientes() {
        transferenciasSalientesList.innerHTML = ''; // Limpiar lista
        const transferencias = AnalisisGastoService.obtenerTransferenciasPorCliente(clienteLogueado.id);
        if (transferencias.size === 0) {
            transferenciasSalientesList.innerHTML = '<li>No se han registrado transferencias salientes para este cliente.</li>';
        } else {
            transferencias.forEach((monto, idDestino) => {
                const li = document.createElement('li');
                li.innerHTML = `<span>A Cliente ${idDestino}:</span> $${monto.toFixed(2)}`;
                transferenciasSalientesList.appendChild(li);
            });
        }
    }

    // --- Renderizar Clientes con Más Interacción ---
    function renderClientesMasInteraccion() {
        clientesMasInteraccionList.innerHTML = ''; // Limpiar lista
        const clientesTop = AnalisisGastoService.obtenerClientesConMasInteraccion(5); // Top 5
        if (clientesTop.length === 0) {
            clientesMasInteraccionList.innerHTML = '<li>No hay datos de interacción de clientes.</li>';
        } else {
            clientesTop.forEach(item => {
                const li = document.createElement('li');
                li.innerHTML = `<span>Cliente ${item.idCliente}:</span> $${item.montoTotal.toFixed(2)} total`;
                clientesMasInteraccionList.appendChild(li);
            });
        }
    }

    // --- Renderizar Categorías Más Populares ---
    function renderCategoriasMasPopulares() {
        categoriasMasPopularesList.innerHTML = ''; // Limpiar lista
        const categoriasTop = AnalisisGastoService.obtenerCategoriasMasPopulares(5); // Top 5
        if (categoriasTop.length === 0) {
            categoriasMasPopularesList.innerHTML = '<li>No hay datos de categorías de gasto populares.</li>';
        } else {
            categoriasTop.forEach(item => {
                const li = document.createElement('li');
                li.innerHTML = `<span>${item.categoria}:</span> $${item.montoTotal.toFixed(2)} total`;
                categoriasMasPopularesList.appendChild(li);
            });
        }
    }

    // --- Función para renderizar el grafo visual ---
    function renderNetworkGraph() {
        // Asegurarse de que el grafo de AnalisisGastoService esté construido
        AnalisisGastoService.construirGrafoDeGastos();
        const grafoInterno = AnalisisGastoService.grafoGastos;

        const nodes = [];
        const edges = [];
        const nodeIds = new Set(); // Para evitar nodos duplicados

        // Recorrer todos los nodos del grafo y añadirlos a la lista de nodos de Vis.js
        grafoInterno.getNodes().forEach(nodeId => {
            if (!nodeIds.has(nodeId)) {
                let label = nodeId;
                let color = '#97C2E0'; // Color por defecto para clientes
                if (nodeId.startsWith("Categoria:")) {
                    label = nodeId.replace("Categoria: ", "");
                    color = '#FFA500'; // Naranja para categorías
                } else {
                    // Puedes buscar el nombre del cliente si lo necesitas
                    const cliente = ClienteService.buscarClientePorId(nodeId);
                    if (cliente) {
                        label = cliente.nombre + " (ID: " + nodeId + ")";
                    }
                }
                nodes.push({ id: nodeId, label: label, color: color });
                nodeIds.add(nodeId);
            }
        });

        // Recorrer todas las aristas del grafo y añadirlas a la lista de aristas de Vis.js
        grafoInterno.getNodes().forEach(origen => {
            const adyacentes = grafoInterno.getAdjacentNodes(origen);
            if (adyacentes) {
                for (let [destino, peso] of adyacentes) {
                    // Asegurarse de que el nodo destino también esté en la lista de nodos
                    if (!nodeIds.has(destino)) {
                        let label = destino;
                        let color = '#97C2E0';
                        if (destino.startsWith("Categoria:")) {
                            label = destino.replace("Categoria: ", "");
                            color = '#FFA500';
                        } else {
                            const cliente = ClienteService.buscarClientePorId(destino);
                            if (cliente) {
                                label = cliente.nombre + " (ID: " + destino + ")";
                            }
                        }
                        nodes.push({ id: destino, label: label, color: color });
                        nodeIds.add(destino);
                    }

                    edges.push({
                        from: origen,
                        to: destino,
                        value: peso, // El peso para el grosor de la arista
                        label: `$${peso.toFixed(2)}`, // Etiqueta en la arista
                        arrows: 'to', // Flecha en la dirección del flujo
                        color: { color: '#848484', highlight: '#000000' }
                    });
                }
            }
        });

        // Crear un objeto de datos de Vis.js
        const data = {
            nodes: new vis.DataSet(nodes),
            edges: new vis.DataSet(edges)
        };

        // Opciones para la visualización del grafo
        const options = {
            nodes: {
                shape: 'dot',
                size: 20,
                font: {
                    size: 12,
                    color: '#333'
                },
                borderWidth: 2
            },
            edges: {
                width: 2, // Grosor por defecto
                arrows: {
                    to: {
                        enabled: true,
                        scaleFactor: 0.7
                    }
                },
                font: {
                    size: 10,
                    align: 'middle'
                },
                smooth: {
                    enabled: true,
                    type: "dynamic"
                }
            },
            physics: {
                enabled: true,
                barnesHut: {
                    gravitationalConstant: -2000,
                    centralGravity: 0.3,
                    springLength: 95,
                    springConstant: 0.04,
                    damping: 0.09,
                    avoidOverlap: 1
                },
                solver: 'barnesHut'
            },
            interaction: {
                navigationButtons: true,
                keyboard: true
                // Puedes añadir más interacciones como zoom, arrastrar, etc.
            }
        };

        // Crear la red de Vis.js
        const network = new vis.Network(networkGraphDiv, data, options);

        // Opcional: Centrar el grafo en algún nodo al cargar
        // network.fit();
    }

    // Llamar a las funciones de renderizado al cargar la página
    renderGastosPorCategoria();
    renderTransferenciasSalientes();
    renderClientesMasInteraccion();
    renderCategoriasMasPopulares();
    renderNetworkGraph(); // <-- ¡Llamar para renderizar el grafo!
});