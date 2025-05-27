// js/ui/notification-indicator.js
import NotificacionService from "../services/NotificacionService.js";

/**
 * Este script se encarga de mostrar un indicador visual en el enlace de notificaciones
 * cuando hay notificaciones no leídas.
 */
document.addEventListener("DOMContentLoaded", () => {
    // Buscar el enlace de notificaciones en la barra de navegación
    const notificacionesLink = document.querySelector('.main-nav a[href="notificaciones.html"]');
    
    // Si no encontramos el enlace, no hacer nada
    if (!notificacionesLink) return;
    
    // Función para verificar notificaciones no leídas
    function verificarNotificacionesNoLeidas() {
        // Obtener todas las notificaciones del cliente actual
        const notificaciones = NotificacionService.obtenerNotificacionesDelClienteActual();
        
        // Verificar si hay notificaciones no leídas
        const hayNoLeidas = notificaciones.some(notificacion => !notificacion.leida);
        
        // Añadir o quitar la clase de indicador según corresponda
        if (hayNoLeidas) {
            notificacionesLink.classList.add('notification-indicator');
        } else {
            notificacionesLink.classList.remove('notification-indicator');
        }
    }
    
    // Verificar al cargar la página
    verificarNotificacionesNoLeidas();
    
    // Verificar cada 30 segundos
    setInterval(verificarNotificacionesNoLeidas, 30000);
});
