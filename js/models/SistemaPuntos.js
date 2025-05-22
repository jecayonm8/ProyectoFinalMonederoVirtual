import { Transaccion } from './Transaccion.js';

class SistemaPuntos {
  constructor() {
    this.puntosPorCliente = new Map();
  }

  calcularPuntos(cliente, transaccion) {
    let puntosGenerados = 0;
    switch (transaccion.tipo) {
      case "Depósito":
        puntosGenerados = Math.floor(transaccion.monto / 100);
        break;
      case "Retiro":
        puntosGenerados = Math.floor(transaccion.monto / 100) * 2;
        break;
      case "Transferencia":
        puntosGenerados = Math.floor(transaccion.monto / 100) * 3;
        break;
    }
    
    cliente.puntos += puntosGenerados;
    cliente.rango = this.actualizarRango(cliente.puntos);
    return puntosGenerados;
  }

  actualizarRango(puntos) {
    if (puntos >= 5000) return "Platino";
    if (puntos >= 1001) return "Oro";
    if (puntos >= 501) return "Plata";
    return "Bronce";
  }
}

export default SistemaPuntos;
