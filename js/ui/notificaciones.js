// js/ui/notificaciones.js

import ClienteService from "../services/ClienteService.js";
import NotificacionService from "../services/NotificacionService.js";

document.addEventListener("DOMContentLoaded", () => {
    const clienteActualInfoDiv = document.getElementById("clienteActualInfo");
    const notificacionesList = document.getElementById("notificacionesList");
    const marcarTodasLeidasBtn = document.getElementById("marcarTodasLeidasBtn");

    const clienteLogueado = ClienteService.obtenerClienteActual();

    if (!clienteLogueado) {
        clienteActualInfoDiv.innerHTML = "<p class='error'>No hay cliente logueado. Por favor, inicie sesión.</p>";
        return;
    }

    clienteActualInfoDiv.innerHTML = `
        <p>Cliente: <strong>${clienteLogueado.nombre}</strong> (ID: ${clienteLogueado.id})</p>
    `;

    // Función para renderizar todas las notificaciones
    function renderNotificaciones() {
        notificacionesList.innerHTML = ''; // Limpiar la lista actual
        const notificaciones = NotificacionService.obtenerNotificaciones(clienteLogueado.id);

        if (notificaciones.length === 0) {
            notificacionesList.innerHTML = '<li>No hay notificaciones.</li>';
            return;
        }

        // Mostrar las notificaciones en orden inverso (más reciente primero)
        notificaciones.slice().reverse().forEach(notificacion => {
            const li = document.createElement('li');
            li.className = `notification-item ${notificacion.leida ? 'read' : 'unread'}`;
            li.dataset.notificationId = notificacion.id; // Guardar el ID de la notificación

            const fecha = new Date(notificacion.fecha).toLocaleString('es-CO', {
                year: 'numeric', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });

            li.innerHTML = `
                <div class="notification-content">
                    <p class="notification-message">${notificacion.mensaje}</p>
                    <p class="notification-meta">Tipo: ${notificacion.tipo} | Fecha: ${fecha}</p>
                </div>
                <div class="notification-actions">
                    ${!notificacion.leida ? `<button class="mark-as-read-btn" data-id="${notificacion.id}">Marcar como leída</button>` : ''}
                </div>
            `;
            notificacionesList.appendChild(li);
        });

        // Añadir listeners a los botones de "Marcar como leída"
        document.querySelectorAll('.mark-as-read-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                const notifId = event.target.dataset.id;
                if (NotificacionService.marcarNotificacionComoLeida(clienteLogueado.id, notifId)) {
                    renderNotificaciones(); // Volver a renderizar para actualizar el estado visual
                }
            });
        });
    }

    // Event listener para el botón "Marcar todas como leídas"
    marcarTodasLeidasBtn.addEventListener('click', () => {
        NotificacionService.marcarTodasComoLeidas(clienteLogueado.id);
        renderNotificaciones(); // Volver a renderizar para actualizar el estado visual
    });

    // Llamar a la función de renderizado al cargar la página
    renderNotificaciones();

    // Opcional: Ejecutar comprobaciones de notificaciones periódicamente
    // Esto es más un "trigger" para el backend o un servicio que corre continuamente.
    // Para una aplicación web frontend, podrías ejecutarlo al cargar la página o en un temporizador.
    // Aquí, lo llamamos al cargar. También, podrías llamar a NotificacionService.generarRecordatorioTransaccionesProgramadas
    // desde aquí o desde el dashboard para que se ejecute con frecuencia.
    NotificacionService.generarAlertaSaldoBajo(clienteLogueado.id);
    NotificacionService.generarRecordatorioTransaccionesProgramadas(clienteLogueado.id); // Asegúrate de que esta función es compatible con tu ColaPrioridad
});