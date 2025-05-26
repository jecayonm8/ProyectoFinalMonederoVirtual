import { PilaTransacciones } from "./Transaccion.js";
import ColaPrioridad from "../dataStructures/ColaPrioridad.js"; // Importar la ColaPrioridad
import ListaCircular from "../dataStructures/ListaCircular.js"; // Importa ListaCircular

class Cliente {
    constructor(id, nombre, contrasena) {
        this.id = id;
        this.nombre = nombre;
        this.contrasena = contrasena;
        this.saldo = 0;
        this.puntos = 0;
        this.rango = "Bronce";
        this.beneficiosActivos = []; // Array para beneficios canjeados activos
        this.historialCanjes = []; // Historial de canjes realizados
        this.historialTransacciones = []; // Array simple para el historial
        this.pilaTransaccionesReversibles = new PilaTransacciones();
        this.notificaciones = new ListaCircular(ListaCircular.CAPACIDAD_DEFAULT); // Siempre inicializar
        this.transaccionesProgramadas = new ColaPrioridad();
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