import GrafoPatrones from "../models/GrafoPatrones.js";
import ClienteController from "./ClienteController.js";

class SistemaController {
  constructor() {
    this.clienteController = new ClienteController();
    this.grafoPatrones = new GrafoPatrones();
  }

  registrarTransaccionGasto(idCliente, categoria, monto) {
    const cliente = this.clienteController.obtenerCliente(idCliente);
    if (!cliente) return "Cliente no encontrado.";

    this.grafoPatrones.agregarTransaccion(cliente.nombre, categoria, monto);
    return `Transacción de ${monto} registrada en la categoría ${categoria} para ${cliente.nombre}.`;
  }

  analizarPatrones(idCliente) {
    const cliente = this.clienteController.obtenerCliente(idCliente);
    if (!cliente) return "Cliente no encontrado.";
    return this.grafoPatrones.analizarPatron(cliente.nombre);
  }
}

export default SistemaController;
