class Monedero {
    constructor(id,nombre, tipo, saldo = 0) {
      this.id = id;
      this.tipo = tipo;  // Ej: "Ahorros", "Gastos"
      this.saldo = saldo;
      this.nombre = nombre;
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
  