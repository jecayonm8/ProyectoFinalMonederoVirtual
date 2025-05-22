class VerificadorIntegridad {
    constructor() {
      this.transaccionesValidas = [];
    }
  
    verificarTransaccion(transaccion, saldoActual) {
      if (!transaccion || typeof transaccion.monto !== "number" || transaccion.monto <= 0) {
        return false; // La transacción es inválida.
      }
  
      // Reglas de validación según el tipo de transacción
      if (transaccion.tipo === "Retiro" || transaccion.tipo === "Transferencia") {
        return saldoActual >= transaccion.monto; // Saldo suficiente para operaciones de salida.
      }
  
      if (transaccion.tipo === "Depósito") {
        return true; // Un depósito siempre es válido si el monto es positivo.
      }
  
      return false; // Cualquier otra transacción desconocida es inválida.
    }
  
    verificarHistorial(historial, saldoInicial = 0) {
      if (historial.length === 0) {
        return saldoInicial >= 0; // Base de la recursión: Si no hay transacciones, el saldo debe ser válido.
      }
  
      const [primeraTransaccion, ...restoHistorial] = historial;
      const saldoNuevo = primeraTransaccion.tipo === "Depósito"
        ? saldoInicial + primeraTransaccion.monto
        : saldoInicial - primeraTransaccion.monto;
  
      if (!this.verificarTransaccion(primeraTransaccion, saldoInicial)) {
        return false; // Si una transacción es inválida, todo el historial se considera incorrecto.
      }
  
      return this.verificarHistorial(restoHistorial, saldoNuevo); // Llamada recursiva con el nuevo saldo.
    }
  }
  
  export default VerificadorIntegridad;
  