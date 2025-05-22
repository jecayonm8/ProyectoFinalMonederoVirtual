class Nodo {
    constructor(cliente) {
      this.cliente = cliente;
      this.izquierda = null;
      this.derecha = null;
    }
  }
  
  class ArbolPuntos {
    constructor() {
      this.raiz = null;
    }
  
    insertar(cliente) {
      const nuevoNodo = new Nodo(cliente);
      if (!this.raiz) {
        this.raiz = nuevoNodo;
      } else {
        this._insertarRecursivo(this.raiz, nuevoNodo);
      }
    }
  
    _insertarRecursivo(actual, nuevoNodo) {
      if (nuevoNodo.cliente.puntos < actual.cliente.puntos) {
        if (!actual.izquierda) actual.izquierda = nuevoNodo;
        else this._insertarRecursivo(actual.izquierda, nuevoNodo);
      } else {
        if (!actual.derecha) actual.derecha = nuevoNodo;
        else this._insertarRecursivo(actual.derecha, nuevoNodo);
      }
    }
  }
  
  export default ArbolPuntos;
  