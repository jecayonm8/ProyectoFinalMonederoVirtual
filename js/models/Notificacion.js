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
     * @param {string|Date} [fecha=new Date()] Opcional: La fecha de la notificación. Puede ser un string ISO o un objeto Date.
     * @param {string} [id=null] Opcional: El ID de la notificación. Útil para rehidratación.
     */
    constructor(mensaje, tipo, idTransaccion = null, leida = false, fecha = new Date(), id = null) {
        // Usa el ID proporcionado o genera uno nuevo si no se proporciona (para nuevas notificaciones)
        this.id = id || Date.now().toString() + Math.random().toString(36).substring(2, 8); 
        this.mensaje = mensaje;
        this.tipo = tipo;
        // Si la fecha es un string ISO (como viene de localStorage), conviértela a objeto Date para mayor manejabilidad en el JS
        this.fecha = (typeof fecha === 'string') ? new Date(fecha) : fecha; 
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