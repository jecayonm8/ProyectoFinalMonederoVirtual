import Transaccion from './Transaccion.js';
import SistemaCanjeoPuntos from './SistemaCanjeoPuntos.js';

class SistemaPuntos {
  constructor() {
    this.puntosPorCliente = new Map();
    this.sistemaCanje = new SistemaCanjeoPuntos();
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
    
    // Aplicar multiplicador por rango
    const multiplicador = this.sistemaCanje.obtenerMultiplicadorPuntosPorRango(cliente.rango);
    puntosGenerados = Math.floor(puntosGenerados * multiplicador);
    
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

  obtenerBeneficiosRango(rango) {
    const beneficios = {
      'Bronce': {
        descripcion: 'Acceso básico al monedero',
        multiplicadorPuntos: 1.0,
        descuentoTransferencias: 0,
        beneficiosEspeciales: []
      },
      'Plata': {
        descripcion: 'Bono de puntos del 10%',
        multiplicadorPuntos: 1.1,
        descuentoTransferencias: 0,
        beneficiosEspeciales: ['Acceso a beneficios de canje mejorados']
      },
      'Oro': {
        descripcion: 'Bono de puntos del 25% y descuentos en canje',
        multiplicadorPuntos: 1.25,
        descuentoTransferencias: 0,
        beneficiosEspeciales: ['10% descuento en costos de canje', 'Beneficios premium']
      },
      'Platino': {
        descripcion: 'Bono de puntos del 50% y máximos descuentos',
        multiplicadorPuntos: 1.5,
        descuentoTransferencias: 0,
        beneficiosEspeciales: ['20% descuento en costos de canje', 'Beneficios VIP', 'Soporte prioritario']
      }
    };
    
    return beneficios[rango] || beneficios['Bronce'];
  }

  canjearPuntos(cliente, beneficioId) {
    return this.sistemaCanje.canjearBeneficio(cliente, beneficioId);
  }

  obtenerBeneficiosDisponibles(cliente) {
    return this.sistemaCanje.obtenerBeneficiosDisponibles(cliente.rango);
  }

  aplicarBeneficioEnTransaccion(cliente, tipoTransaccion, monto) {
    return this.sistemaCanje.aplicarBeneficioEnTransaccion(cliente, tipoTransaccion, monto);
  }
}

export default SistemaPuntos;
