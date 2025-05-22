class Monedero {
    constructor(id, tipo) {
      this.id = id;
      this.tipo = tipo;  // Ej: "Ahorros", "Gastos"
      this.saldo = 0;
    }
  
    depositar(monto) {
      if (monto > 0) {
        this.saldo += monto;
        return `Depósito exitoso en monedero ${this.tipo}: ${monto}`;
      }
      return "Monto inválido.";
    }
  
    retirar(monto) {
      if (monto > 0 && monto <= this.saldo) {
        this.saldo -= monto;
        return `Retiro exitoso de monedero ${this.tipo}: ${monto}`;
      }
      return "Saldo insuficiente o monto inválido.";
    }
  }
  
  export default Monedero;
  