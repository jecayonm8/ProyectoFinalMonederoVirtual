class GrafoPatrones {
    constructor() {
      this.vertices = new Map(); // Almacena clientes y categorías de gasto.
    }
  
    agregarVertice(cliente) {
      if (!this.vertices.has(cliente)) {
        this.vertices.set(cliente, new Map()); // Cada vértice tiene una lista de conexiones.
      }
    }
  
    agregarTransaccion(origen, destino, monto) {
      this.agregarVertice(origen);
      this.agregarVertice(destino);
  
      const conexionesOrigen = this.vertices.get(origen);
      conexionesOrigen.set(destino, (conexionesOrigen.get(destino) || 0) + monto);
    }
  
    obtenerPatrones(cliente) {
      if (!this.vertices.has(cliente)) {
        return {}; // Si el cliente no existe, devuelve un objeto vacío.
      }
  
      return this.vertices.get(cliente);
    }
  
    analizarPatron(cliente) {
      const patrones = this.obtenerPatrones(cliente);
      let mensaje = `Patrones de gasto para ${cliente}:\n`;
  
      patrones.forEach((monto, destino) => {
        mensaje += `  → ${cliente} ha enviado ${monto} a ${destino}.\n`;
      });
  
      return mensaje.trim();
    }
  }
  
  
  