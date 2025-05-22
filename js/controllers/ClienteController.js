import Cliente from "../models/Cliente.js";
import Monedero from "../models/Monedero.js";

class ClienteController {
  constructor() {
    this.clientes = new Map();
  }

  crearCliente(id, nombre) {
    if (this.clientes.has(id)) {
      return "El cliente ya existe.";
    }
    const nuevoCliente = new Cliente(id, nombre);
    this.clientes.set(id, nuevoCliente);
    return `Cliente ${nombre} creado con éxito.`;
  }

  obtenerCliente(id) {
    return this.clientes.get(id) || null;
  }

  obtenerCliente(id) {
    return Storage.buscarCliente(id);
  }

  agregarMonedero(idCliente, idMonedero, tipo) {
    const cliente = this.obtenerCliente(idCliente);
    if (!cliente) return "Cliente no encontrado.";

    const nuevoMonedero = new Monedero(idMonedero, tipo);
    cliente.monederos.push(nuevoMonedero);
    return `Monedero ${tipo} agregado al cliente ${cliente.nombre}.`;
  }

  consultarSaldo(idCliente) {
    const cliente = this.obtenerCliente(idCliente);
    if (!cliente) return "Cliente no encontrado.";
    return `El saldo de ${cliente.nombre} es: ${cliente.saldo}`;
  }


  actualizarSaldo(id, monto) {
    const cliente = this.obtenerCliente(id);
    if (!cliente) return "Cliente no encontrado.";
    Storage.actualizarSaldo(id, cliente.saldo + monto);
    return `Saldo actualizado: ${cliente.saldo + monto}`;
  }
  
}

export default ClienteController;
