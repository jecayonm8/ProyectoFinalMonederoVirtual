// js/models/TransaccionProgramada.js
class TransaccionProgramada {
    constructor(
        id,                // ID único de la transacción programada
        tipo,              // 'deposito', 'retiro', 'transferencia'
        monto,
        idClienteOrigen,
        fechaEjecucion,    // La fecha en la que se debe ejecutar (objeto Date o string ISO)
        frecuencia = null, // 'diaria', 'semanal', 'mensual', 'anual', 'unica'
        idClienteDestino = null, // Para transferencias
        tipoCuenta = null, // Para depósitos programados
        metodoPago = null  // Para depósitos programados
    ) {
        this.id = id;
        this.tipo = tipo;
        this.monto = monto;
        this.idClienteOrigen = idClienteOrigen;
        this.fechaEjecucion = fechaEjecucion instanceof Date ? fechaEjecucion.toISOString() : fechaEjecucion;
        this.frecuencia = frecuencia;
        this.idClienteDestino = idClienteDestino;
        this.tipoCuenta = tipoCuenta;
        this.metodoPago = metodoPago;
        this.ejecutada = false; // Para marcar si ya se procesó
    }
}

export default TransaccionProgramada;