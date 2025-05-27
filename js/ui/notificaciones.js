// js/ui/notificaciones.js

import ClienteService from "../services/ClienteService.js";
import NotificacionService from "../services/NotificacionService.js";

document.addEventListener("DOMContentLoaded", () => {
    const clienteActualInfoDiv = document.getElementById("clienteActualInfo");
    const notificacionesList = document.getElementById("notificacionesList");
    const marcarTodasLeidasBtn = document.getElementById("marcarTodasLeidasBtn");
    const limpiarTodasNotificacionesBtn = document.getElementById("limpiarTodasNotificacionesBtn");

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

        // CAMBIO CRÍTICO AQUÍ: Llamar a la función estática con el nombre correcto
        const notificaciones = NotificacionService.obtenerNotificacionesDelClienteActual(); 

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
    // NOTA: Tu NotificacionService no tiene un método estático 'marcarTodasComoLeidas'.
    // Si quieres implementar esto, deberás añadirlo a NotificacionService.js.
    // Por ahora, si no existe, esta línea causará un error similar.
    // Podrías comentarla o implementarla en NotificacionService.
    // NotificacionService.marcarTodasComoLeidas(clienteLogueado.id);
    marcarTodasLeidasBtn.addEventListener('click', () => {
        // Implementación temporal si no tienes marcarTodasComoLeidas en NotificacionService
        // O asegúrate de que el método exista en NotificacionService
        const notificaciones = NotificacionService.obtenerNotificacionesDelClienteActual();
        notificaciones.forEach(notif => {
            if (!notif.leida) {
                NotificacionService.marcarNotificacionComoLeida(clienteLogueado.id, notif.id);
            }
        });
        renderNotificaciones(); // Volver a renderizar para actualizar el estado visual
    });

    // Manejador de eventos para el botón "Limpiar todas las notificaciones"
    limpiarTodasNotificacionesBtn.addEventListener('click', () => {
        if (confirm('¿Está seguro que desea eliminar todas las notificaciones?')) {
            const resultado = NotificacionService.limpiarTodasLasNotificaciones();
            if (resultado) {
                renderNotificaciones(); // Actualizar la interfaz
                notificacionesList.innerHTML = '<li>Se han eliminado todas las notificaciones.</li>';
            }
        }
    });


    // Llamar a la función de renderizado al cargar la página
    renderNotificaciones();

    // Generar alertas y recordatorios al cargar la página
    // Asegúrate de que estas llamadas se hagan con el cliente.id si son necesarias aquí.
    NotificacionService.generarAlertaSaldoBajo(clienteLogueado.id);
    NotificacionService.generarRecordatorioTransaccionesProgramadas(clienteLogueado.id);
});