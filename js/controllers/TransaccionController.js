import { Transaccion, PilaTransacciones } from "../models/Transaccion.js";
import VerificadorIntegridad from "../models/VerificadorIntegridad.js";
import SistemaPuntos from "../models/SistemaPuntos.js";
import Storage from "../database/storage.js";

class TransaccionController {
  constructor(clienteController) {
    this.clienteController = clienteController;
    this.verificador = new VerificadorIntegridad();
    this.sistemaPuntos = new SistemaPuntos();
  }

  ejecutarTransaccion(idCliente, tipo, monto, idDestino = null) {
    const cliente = this.clienteController.obtenerCliente(idCliente);
    if (!cliente) return "Cliente no encontrado.";

    const transaccion = new Transaccion(Date.now(), tipo, monto);

    if (!this.verificador.verificarTransaccion(transaccion, cliente.saldo)) {
      return "Transacción inválida o saldo insuficiente.";
    }

    // Aplicar cambios según el tipo de transacción
    if (tipo === "Depósito") {
      cliente.depositar(monto);
    } else if (tipo === "Retiro") {
      cliente.retirar(monto);
    } else if (tipo === "Transferencia" && idDestino) {
      const destino = this.clienteController.obtenerCliente(idDestino);
      if (!destino) return "Cliente destino no encontrado.";
      cliente.transferir(monto, destino);
    } else {
      return "Tipo de transacción desconocido.";
    }

    // Calcular y agregar puntos
    const puntosGanados = this.sistemaPuntos.calcularPuntos(cliente, transaccion);
    return `Transacción ${tipo} completada. Se generaron ${puntosGanados} puntos.`;
  }

  ejecutarTransaccion(idCliente, tipo, monto, idDestino = null) {
    const cliente = Storage.buscarCliente(idCliente);
    if (!cliente) return "Cliente no encontrado.";

    const transaccion = new Transaccion(Date.now(), tipo, monto);

    if (tipo === "Depósito") {
      Storage.actualizarSaldo(idCliente, cliente.saldo + monto);
    } else if (tipo === "Retiro") {
      if (monto > cliente.saldo) return "Saldo insuficiente.";
      Storage.actualizarSaldo(idCliente, cliente.saldo - monto);
    } else if (tipo === "Transferencia" && idDestino) {
      const destino = Storage.buscarCliente(idDestino);
      if (!destino) return "Cliente destino no encontrado.";
      Storage.actualizarSaldo(idCliente, cliente.saldo - monto);
      Storage.actualizarSaldo(idDestino, destino.saldo + monto);
    } else {
      return "Tipo de transacción desconocido.";
    }

    Storage.agregarTransaccion(idCliente, transaccion);

    // Generación de puntos
    const puntosGanados = new SistemaPuntos().calcularPuntos(cliente, transaccion);
    Storage.actualizarPuntos(idCliente, cliente.puntos + puntosGanados, new SistemaPuntos().actualizarRango(cliente.puntos + puntosGanados));

    return `✅ Transacción ${tipo} completada. Se generaron ${puntosGanados} puntos.`;
  }
}

export default TransaccionController;
