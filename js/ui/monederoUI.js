import GrafoMonederos from "../dataStructures/grafoMonederos.js";
import ClienteService from "../services/ClienteService.js";
import grafoTransaccionesService from "../services/GrafoTransaccionesService.js";
import Storage from "../../database/storage.js";

document.addEventListener("DOMContentLoaded", () => {
    function render() {
        const clienteActual = ClienteService.obtenerClienteActual();
        if (!clienteActual) {
            mostrarMensaje("Debe iniciar sesión.", "error");
            window.location.href = "login.html";
            return;
        }
        saldoCuentaPrincipal.textContent = `Saldo cuenta principal: $${clienteActual.saldo.toFixed(2)}`;
        listaMonederos.innerHTML = clienteActual.monederos.map(m =>
            `<div>
                <span>${m.nombre} (${m.tipo})</span>
                <span class="saldo">$${m.saldo.toFixed(2)}</span>
            </div>`
        ).join("");
        const options = clienteActual.monederos.map(m =>
            `<option value="${m.id}">${m.nombre} - $${m.saldo.toFixed(2)}</option>`
        ).join("");
        monederoOrigen.innerHTML = "<option value=''>Origen</option>" + options;
        monederoDestino.innerHTML = "<option value=''>Destino</option>" + options;
        monederoSeleccionado.innerHTML = "<option value=''>Selecciona un monedero</option>" + options;
<<<<<<< Updated upstream
        
        // Ocultar mensaje de operación al actualizar la interfaz
        ocultarMensaje();
    }
    
    // Función para mostrar mensajes de operación
    function mostrarMensaje(mensaje, tipo) {
        mensajeOperacion.textContent = mensaje;
        mensajeOperacion.className = "mensaje-operacion";
        mensajeOperacion.classList.add(tipo);
    }
    
    // Función para ocultar el mensaje
    function ocultarMensaje() {
        mensajeOperacion.className = "mensaje-operacion";
    }
    
    // Función para mostrar un formulario flotante
    function mostrarFormulario(form) {
        form.classList.add("visible");
    }
    
    // Función para ocultar un formulario flotante
    function ocultarFormulario(form) {
        form.classList.remove("visible");
=======

        renderizarGrafoMonederos(clienteActual);
    }

    function renderizarGrafoMonederos(clienteActual) {
        const container = document.getElementById("grafoMonederos");
        if (!container) return;

        // Suponiendo que guardas las transferencias en clienteActual.transferenciasMonederos
        // Si no, usa el arreglo donde guardas las transferencias entre monederos
        const grafo = new GrafoMonederos();
        if (clienteActual.transferenciasMonederos) {
            clienteActual.transferenciasMonederos.forEach(t => {
                grafo.agregarTransferencia(t.origen, t.destino, t.monto);
            });
        }

        const nodes = clienteActual.monederos.map(m => ({
            id: m.id,
            label: `${m.nombre}\n$${m.saldo.toFixed(2)}`,
            shape: "box",
            color: "#4d78c1",
            font: { color: "#fff", size: 16 }
        }));

        const edges = [];
        for (const [origen, destinos] of grafo.obtenerRelaciones()) {
            for (const [destino, monto] of destinos) {
                edges.push({
                    from: origen,
                    to: destino,
                    label: `$${monto.toFixed(2)}`,
                    arrows: "to",
                    color: "#2196f3",
                    font: { align: "middle" }
                });
            }
        }

        container.innerHTML = "";
        if (nodes.length === 0) return;

        const data = { nodes: new vis.DataSet(nodes), edges: new vis.DataSet(edges) };
        const options = {
            layout: { hierarchical: false },
            nodes: { borderWidth: 2, shadow: true },
            edges: { smooth: true, arrows: { to: { enabled: true } } },
            physics: { enabled: true }
        };
        new vis.Network(container, data, options);
>>>>>>> Stashed changes
    }

    const saldoCuentaPrincipal = document.getElementById("saldoCuentaPrincipal");
    const listaMonederos = document.getElementById("listaMonederos");
    const formNuevoMonedero = document.getElementById("formNuevoMonedero");
    const formTransferencia = document.getElementById("formTransferencia");
    const monederoOrigen = document.getElementById("monederoOrigen");
    const monederoDestino = document.getElementById("monederoDestino");
    const monederoSeleccionado = document.getElementById("monederoSeleccionado");
    const btnAgregarSaldo = document.getElementById("btnAgregarSaldo");
    const btnRetirarSaldo = document.getElementById("btnRetirarSaldo");
    const btnEliminarMonedero = document.getElementById("btnEliminarMonedero");
    
    // Elementos de formularios flotantes
    const formAgregarSaldoElement = document.getElementById("formAgregarSaldo");
    const formRetirarSaldoElement = document.getElementById("formRetirarSaldo");
    const formEliminarMonederoElement = document.getElementById("formEliminarMonedero");
    const mensajeOperacion = document.getElementById("mensajeOperacionMonedero");

    formNuevoMonedero.addEventListener("submit", e => {
        e.preventDefault();
        const clienteActual = ClienteService.obtenerClienteActual();
        const nombre = document.getElementById("nombreMonedero").value.trim();
        const tipo = document.getElementById("tipoMonedero").value;
        const monto = parseFloat(document.getElementById("montoInicial").value);
        const res = ClienteService.crearMonederoParaCliente(clienteActual.id, nombre, tipo, monto);
        
        if (res.exito) {
            mostrarMensaje(res.mensaje || "Monedero creado exitosamente", "exito");
        } else {
            mostrarMensaje(res.mensaje || "Error al crear el monedero", "error");
        }
        
        render();
        formNuevoMonedero.reset();
    });

    formTransferencia.addEventListener("submit", e => {
        e.preventDefault();
        const clienteActual = ClienteService.obtenerClienteActual();
        const idOrigen = monederoOrigen.value;
        const idDestino = monederoDestino.value;
        const monto = parseFloat(document.getElementById("montoTransferencia").value);
        const res = ClienteService.transferirEntreMonederos(clienteActual.id, idOrigen, idDestino, monto);
        
        if (res.exito) {
            mostrarMensaje(res.mensaje || "Transferencia realizada exitosamente", "exito");
            
            // Añadir la transferencia directamente al grafo
            grafoTransaccionesService.añadirTransferenciaEntreMonederos(clienteActual.id, idOrigen, idDestino, monto);
            
            // Renderizar el grafo actualizado
            renderNetworkGraph();
            renderTopWallets();
            renderTopPaths();
        } else {
            mostrarMensaje(res.mensaje || "Error al realizar la transferencia", "error");
        }
        
        render();
        formTransferencia.reset();
    });

    // Manejar apertura del formulario de agregar saldo
    btnAgregarSaldo.addEventListener("click", () => {
        const idMonedero = monederoSeleccionado.value;
        if (!idMonedero) {
            mostrarMensaje("Selecciona un monedero antes de continuar", "error");
            return;
        }
        mostrarFormulario(formAgregarSaldoElement);
        document.getElementById("montoAgregar").focus();
    });
    
    // Cancelar agregar saldo
    document.getElementById("cancelarAgregarSaldo").addEventListener("click", () => {
        ocultarFormulario(formAgregarSaldoElement);
        document.getElementById("montoAgregar").value = "";
    });
    
    // Confirmar agregar saldo
    document.getElementById("confirmarAgregarSaldo").addEventListener("click", () => {
        const clienteActual = ClienteService.obtenerClienteActual();
        const idMonedero = monederoSeleccionado.value;
        const monto = parseFloat(document.getElementById("montoAgregar").value);
        
        if (isNaN(monto) || monto <= 0) {
            mostrarMensaje("El monto debe ser un valor positivo", "error");
            return;
        }
        
        const res = ClienteService.agregarSaldoAMonedero(clienteActual.id, idMonedero, monto);
        
        if (res.exito) {
            mostrarMensaje(res.mensaje || `Se agregaron $${monto.toFixed(2)} al monedero`, "exito");
            document.getElementById("montoAgregar").value = "";
            ocultarFormulario(formAgregarSaldoElement);
            render();
        } else {
            mostrarMensaje(res.mensaje || "Error al agregar saldo", "error");
        }
    });

    // Manejar apertura del formulario de retirar saldo
    btnRetirarSaldo.addEventListener("click", () => {
        const idMonedero = monederoSeleccionado.value;
        if (!idMonedero) {
            mostrarMensaje("Selecciona un monedero antes de continuar", "error");
            return;
        }
        mostrarFormulario(formRetirarSaldoElement);
        document.getElementById("montoRetirar").focus();
    });
    
    // Cancelar retirar saldo
    document.getElementById("cancelarRetirarSaldo").addEventListener("click", () => {
        ocultarFormulario(formRetirarSaldoElement);
        document.getElementById("montoRetirar").value = "";
    });
    
    // Confirmar retirar saldo
    document.getElementById("confirmarRetirarSaldo").addEventListener("click", () => {
        const clienteActual = ClienteService.obtenerClienteActual();
        const idMonedero = monederoSeleccionado.value;
        const monto = parseFloat(document.getElementById("montoRetirar").value);
        
        if (isNaN(monto) || monto <= 0) {
            mostrarMensaje("El monto debe ser un valor positivo", "error");
            return;
        }
        
        const res = ClienteService.retirarSaldoDeMonedero(clienteActual.id, idMonedero, monto);
        
        if (res.exito) {
            mostrarMensaje(res.mensaje || `Se retiraron $${monto.toFixed(2)} del monedero`, "exito");
            document.getElementById("montoRetirar").value = "";
            ocultarFormulario(formRetirarSaldoElement);
            render();
        } else {
            mostrarMensaje(res.mensaje || "Error al retirar saldo", "error");
        }
    });

    // Manejar apertura del formulario de eliminar monedero
    btnEliminarMonedero.addEventListener("click", () => {
        const idMonedero = monederoSeleccionado.value;
        if (!idMonedero) {
            mostrarMensaje("Selecciona un monedero antes de continuar", "error");
            return;
        }
        mostrarFormulario(formEliminarMonederoElement);
    });
    
    // Cancelar eliminar monedero
    document.getElementById("cancelarEliminarMonedero").addEventListener("click", () => {
        ocultarFormulario(formEliminarMonederoElement);
    });
    
    // Confirmar eliminar monedero
    document.getElementById("confirmarEliminarMonedero").addEventListener("click", () => {
        const clienteActual = ClienteService.obtenerClienteActual();
        const idMonedero = monederoSeleccionado.value;
        
        const res = ClienteService.eliminarMonedero(clienteActual.id, idMonedero);
        
        if (res.exito) {
            mostrarMensaje(res.mensaje || "Monedero eliminado exitosamente", "exito");
            ocultarFormulario(formEliminarMonederoElement);
            render();
        } else {
            mostrarMensaje(res.mensaje || "Error al eliminar el monedero", "error");
            ocultarFormulario(formEliminarMonederoElement);
        }
    });

    // Manejar tecla Escape para cerrar los formularios flotantes
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            ocultarFormulario(formAgregarSaldoElement);
            ocultarFormulario(formRetirarSaldoElement);
            ocultarFormulario(formEliminarMonederoElement);
        }
    });
    
    // Inicializar la interfaz
    render();
    
    // Elementos para el grafo y estadísticas
    const networkGraphDiv = document.getElementById("networkGraph");
    const topWalletsList = document.getElementById("topWallets");
    const topPathsList = document.getElementById("topPaths");

    // --- Función para renderizar el grafo visual ---
    function renderNetworkGraph() {
        // Limpiar el contenedor antes de renderizar
        console.log("Renderizando grafo de transacciones...");
        
        // Asegurarse de que el grafo de transacciones esté inicializado
        grafoTransaccionesService.inicializar();
        const grafoInterno = grafoTransaccionesService.obtenerGrafoCliente();
        console.log("Grafo interno:", grafoInterno);

        const nodes = [];
        const edges = [];
        const nodeIds = new Set(); // Para evitar nodos duplicados

        // Recorrer todos los nodos del grafo y añadirlos a la lista de nodos de Vis.js
        grafoInterno.getNodes().forEach(nodeId => {
            if (!nodeIds.has(nodeId)) {
                // Formato: ClienteID-MonederoID
                const [clienteId, monederoId] = nodeId.split('-');
                
                let label = `Monedero ${monederoId}`;
                let color = '#97C2E0'; // Color por defecto para monederos
                
                // Buscar información adicional del monedero
                const cliente = Storage.buscarCliente(clienteId);
                if (cliente && cliente.monederos && Array.isArray(cliente.monederos)) {
                    const monedero = cliente.monederos.find(m => m.id === monederoId);
                    if (monedero) {
                        label = monedero.nombre;
                        
                        // Colores según el tipo de monedero
                        if (monedero.tipo === 'ahorro') {
                            color = '#4CAF50';
                        } else if (monedero.tipo === 'gastos') {
                            color = '#FF9800';
                        }
                    }
                }
                
                nodes.push({ id: nodeId, label: label, color: color });
                nodeIds.add(nodeId);
                console.log(`Nodo añadido: ${nodeId} (${label})`);
            }
        });

        // Recorrer todas las aristas del grafo y añadirlas a la lista de aristas de Vis.js
        grafoInterno.getNodes().forEach(origen => {
            const adyacentes = grafoInterno.getAdjacentNodes(origen);
            if (adyacentes) {
                for (let [destino, peso] of adyacentes) {
                    // Asegurarse de que el nodo destino también esté en la lista de nodos
                    if (!nodeIds.has(destino)) {
                        const [clienteId, monederoId] = destino.split('-');
                        
                        let label = `Monedero ${monederoId}`;
                        let color = '#97C2E0';
                        
                        const cliente = Storage.buscarCliente(clienteId);
                        if (cliente && cliente.monederos && Array.isArray(cliente.monederos)) {
                            const monedero = cliente.monederos.find(m => m.id === monederoId);
                            if (monedero) {
                                label = monedero.nombre;
                                if (monedero.tipo === 'ahorro') {
                                    color = '#4CAF50';
                                } else if (monedero.tipo === 'gastos') {
                                    color = '#FF9800';
                                }
                            }
                        }
                        
                        nodes.push({ id: destino, label: label, color: color });
                        nodeIds.add(destino);
                        console.log(`Nodo añadido: ${destino} (${label})`);
                    }

                    // Crear la arista exactamente como en análisis de gastos
                    edges.push({
                        from: origen,
                        to: destino,
                        value: peso, // El peso para el grosor de la arista
                        label: `$${peso.toFixed(2)}`, // Etiqueta en la arista
                        arrows: 'to', // Flecha en la dirección del flujo
                        color: { color: '#848484', highlight: '#000000' }
                    });
                    console.log(`Arista añadida: ${origen} -> ${destino} ($${peso.toFixed(2)})`);
                }
            }
        });
        
        console.log(`Total nodos: ${nodes.length}, Total aristas: ${edges.length}`);
        
        // Si no hay nodos, mostrar mensaje
        if (nodes.length === 0) {
            networkGraphDiv.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100%;"><p>No hay transferencias entre monederos para mostrar.</p></div>';
            return;
        }

        // Crear un objeto de datos de Vis.js
        const data = {
            nodes: new vis.DataSet(nodes),
            edges: new vis.DataSet(edges)
        };
        
        // Mostrar el grafo aunque esté vacío para debugging
        if (nodes.length === 0 && edges.length === 0) {
            console.warn("El grafo está vacío. Creando un grafo de prueba para visualización.");
            // Simular nodos y aristas para depuración
            const clienteActual = ClienteService.obtenerClienteActual();
            if (clienteActual && clienteActual.monederos && clienteActual.monederos.length >= 2) {
                const monedero1 = clienteActual.monederos[0];
                const monedero2 = clienteActual.monederos[1];
                console.log("Monederos disponibles:", monedero1, monedero2);
            }            
        }

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
            },
            // Establecer fondo blanco para el grafo
            background: {
                color: '#ffffff' // Fondo blanco
            }
        };

        // Crear la red de Vis.js
        const network = new vis.Network(networkGraphDiv, data, options);
    }
    
    // --- Renderizar Monederos con Más Transferencias ---
    function renderTopWallets() {
        topWalletsList.innerHTML = ''; // Limpiar lista
        const topMonederos = grafoTransaccionesService.obtenerMonederosConMasTransferencias(5);
        
        if (topMonederos.length === 0) {
            topWalletsList.innerHTML = '<li>No hay datos disponibles.</li>';
        } else {
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
                
                const li = document.createElement('li');
                li.innerHTML = `<span>${nombreMonedero} (${nombreCliente}):</span> $${monedero.totalSaliente.toFixed(2)}`;
                topWalletsList.appendChild(li);
            });
        }
    }
    
    // --- Renderizar Caminos de Transferencia Más Frecuentes ---
    function renderTopPaths() {
        topPathsList.innerHTML = ''; // Limpiar lista
        const topCaminos = grafoTransaccionesService.obtenerCaminosMasFrecuentes(5);
        
        if (topCaminos.length === 0) {
            topPathsList.innerHTML = '<li>No hay datos disponibles.</li>';
        } else {
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
                
                const li = document.createElement('li');
                li.innerHTML = `<span>${origenMonedero} → ${destinoMonedero}:</span> $${camino.volumen.toFixed(2)}`;
                topPathsList.appendChild(li);
            });
        }
    }
    
    // Llamar a las funciones de renderizado al cargar la página
    renderNetworkGraph();
    renderTopWallets();
    renderTopPaths();
});