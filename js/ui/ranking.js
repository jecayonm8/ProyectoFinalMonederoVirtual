// js/ui/ranking.js
import ClienteService from "../services/ClienteService.js";
import rangosService from "../services/RangosService.js";

document.addEventListener("DOMContentLoaded", () => {
    const rankingTableBody = document.querySelector("#rankingTable tbody");
    const mensajeRankingDiv = document.getElementById("mensajeRanking");
    
    // Elementos para las estadísticas
    const platinoCount = document.getElementById("platino-count");
    const oroCount = document.getElementById("oro-count");
    const plataCount = document.getElementById("plata-count");
    const bronceCount = document.getElementById("bronce-count");

    function cargarRankingClientes() {
        const clienteActual = ClienteService.obtenerClienteActual();

        if (!clienteActual) {
            mensajeRankingDiv.textContent = "No hay cliente logueado. Por favor, inicie sesión.";
            mensajeRankingDiv.classList.add("error");
            rankingTableBody.innerHTML = '<tr><td colspan="5" class="no-ranking-message">No se pudo cargar el ranking.</td></tr>';
            return;
        }

        try {
            // Obtener las estadísticas por rango
            const estadisticas = rangosService.obtenerEstadisticasPorRango();
            
            // Actualizar los contadores
            platinoCount.textContent = estadisticas['Platino'];
            oroCount.textContent = estadisticas['Oro'];
            plataCount.textContent = estadisticas['Plata'];
            bronceCount.textContent = estadisticas['Bronce'];
            
            // Obtener el ranking de clientes ordenados por rango y puntos
            const clientesOrdenados = rangosService.obtenerRanking();
            
            if (clientesOrdenados.length === 0) {
                rankingTableBody.innerHTML = '<tr><td colspan="5" class="no-ranking-message">No hay clientes registrados.</td></tr>';
                mensajeRankingDiv.textContent = "No hay datos para mostrar en el ranking.";
                mensajeRankingDiv.classList.remove("error", "success");
                return;
            }

            // Limpiar cualquier mensaje y contenido anterior
            mensajeRankingDiv.textContent = "";
            mensajeRankingDiv.classList.remove("error", "success");
            rankingTableBody.innerHTML = ""; // Limpiar el tbody antes de insertar

            // Iterar sobre los clientes y crear las filas de la tabla
            clientesOrdenados.forEach((cliente, index) => {
                const posicion = index + 1;
                const row = document.createElement("tr");
                
                // Añadir clase según el rango
                row.classList.add(`rango-${cliente.rango.toLowerCase()}`);
                
                // Determinar clase especial para las primeras 3 posiciones
                let posicionClass = '';
                if (posicion === 1) posicionClass = 'posicion-1';
                else if (posicion === 2) posicionClass = 'posicion-2';
                else if (posicion === 3) posicionClass = 'posicion-3';
                
                // Crear las celdas
                row.innerHTML = `
                    <td><span class="posicion ${posicionClass}">${posicion}</span></td>
                    <td>${cliente.nombre}</td>
                    <td>${cliente.id}</td>
                    <td>${cliente.puntos}</td>
                    <td>${cliente.rango}</td>
                `;
                
                rankingTableBody.appendChild(row);
            });
            
            // Destacar al cliente actual en el ranking
            const clienteActualFila = Array.from(rankingTableBody.querySelectorAll('tr')).find(
                row => row.children[2].textContent === clienteActual.id
            );
            
            if (clienteActualFila) {
                clienteActualFila.classList.add('cliente-actual');
                clienteActualFila.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            
        } catch (error) {
            console.error("Error al cargar el ranking:", error);
            mensajeRankingDiv.textContent = "Error al cargar el ranking de clientes.";
            mensajeRankingDiv.classList.add("error");
            rankingTableBody.innerHTML = '<tr><td colspan="5" class="no-ranking-message">Error al cargar el ranking.</td></tr>';
        }
    }

    // Cargar el ranking cuando la página se cargue
    cargarRankingClientes();
});
