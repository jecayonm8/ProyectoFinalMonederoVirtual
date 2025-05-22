import { PilaTransacciones } from "./Transaccion.js";
import ColaPrioridad from "../dataStructures/ColaPrioridad.js"; // Importar la ColaPrioridad
import ListaCircular from "../dataStructures/ListaCircular.js"; // Importa ListaCircular

class Cliente {
    constructor(id, nombre, contrasena, saldoInicial = 0) {
        this.id = id;
        this.nombre = nombre;
        this.contrasena = contrasena;
        this.saldo = saldoInicial;
        this.puntos = 0;
        this.rango = "Bronce";
        this.historialTransacciones = []; // Array simple para el historial
        this.pilaTransaccionesReversibles = new PilaTransacciones();
        this.transaccionesProgramadas = new ColaPrioridad();
        this.notificaciones = new ListaCircular(); // ¡Asegúrate de esto!
    }

    agregarTransaccionReversible(transaccion) {
      this.pilaTransaccionesReversibles.agregar(transaccion);
    }

    deshacerUltimaTransaccionReversible() {
      return this.pilaTransaccionesReversibles.deshacer();
    }
    verUltimaTransaccionReversible() {
      return this.pilaTransaccionesReversibles.peek();
    }

    agregarTransaccionProgramada(transaccionProgramada) {
      this.transaccionesProgramadas.encolar(transaccionProgramada);
    }
    desencolarTransaccionProgramada() {
      return this.transaccionesProgramadas.desencolar();
    }
    verTransaccionesProgramadas() {
      return this.transaccionesProgramadas.elementos;
    }
    agregarNotificacion(notificacion) {
      this.notificaciones.agregar(notificacion);
    }
}

export default Cliente;