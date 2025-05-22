// js/models/Transaccion.js

// Definición de la Pila para Transacciones Reversibles
export class PilaTransacciones {
    constructor() {
        this.transacciones = [];
    }

    push(transaccion) {
        this.transacciones.push(transaccion);
    }

    pop() {
        if (this.estaVacia()) {
            return null;
        }
        return this.transacciones.pop();
    }

    peek() {
        if (this.estaVacia()) {
            return null;
        }
        return this.transacciones[this.transacciones.length - 1];
    }

    estaVacia() {
        return this.transacciones.length === 0;
    }

    tamano() {
        return this.transacciones.length;
    }

    clear() {
        this.transacciones = [];
    }
}

// Definición de la Clase Transaccion
class Transaccion {
    constructor(
        id,
        tipo, // 'deposito', 'retiro', 'transferencia', 'recepcion'
        monto,
        idClienteOrigen,
        fecha = new Date(),
        idClienteDestino = null, // Solo para transferencias/recepciones
        tipoCuenta = null, // Solo para depósitos
        metodoPago = null, // Solo para depósitos
        categoria = null // <-- ¡NUEVA PROPIEDAD! Para análisis de gasto
    ) {
        this.id = id;
        this.tipo = tipo;
        this.monto = monto;
        this.idClienteOrigen = idClienteOrigen;
        this.fecha = fecha.toISOString(); // Guardar como string ISO para fácil almacenamiento
        this.idClienteDestino = idClienteDestino;
        this.tipoCuenta = tipoCuenta;
        this.metodoPago = metodoPago;
        this.categoria = categoria; // Asignar la nueva propiedad
    }
}

export default Transaccion;