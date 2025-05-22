// js/models/Notificacion.js

/**
 * Clase para representar una notificación en el sistema.
 */
class Notificacion {
    /**
     * @param {string} mensaje El contenido del mensaje de la notificación.
     * @param {string} tipo El tipo de notificación (ej. 'alerta', 'informativo', 'recordatorio').
     * @param {string} [idTransaccion=null] Opcional: ID de la transacción relacionada, si aplica.
     * @param {boolean} [leida=false] Indica si la notificación ha sido leída.
     */
    constructor(mensaje, tipo, idTransaccion = null, leida = false) {
        this.id = Date.now().toString() + Math.random().toString(36).substring(2, 8); // ID único simple
        this.mensaje = mensaje;
        this.tipo = tipo;
        this.fecha = new Date().toISOString(); // Fecha en formato ISO para fácil almacenamiento y comparación
        this.idTransaccion = idTransaccion;
        this.leida = leida;
    }

    marcarComoLeida() {
        this.leida = true;
    }

    marcarComoNoLeida() {
        this.leida = false;
    }
}

export default Notificacion;