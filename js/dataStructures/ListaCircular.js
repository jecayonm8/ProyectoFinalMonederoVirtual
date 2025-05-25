// js/dataStructures/ListaCircular.js
import Notificacion from '../models/Notificacion.js';

class ListaCircular {
    static CAPACIDAD_DEFAULT = 10;

    constructor(capacidad = ListaCircular.CAPACIDAD_DEFAULT) {
        this.capacidad = capacidad;
        this.elementos = new Array(capacidad);
        this.cabeza = 0;
        this.cola = 0;
        this.tamano = 0;
    }

    agregar(elemento) {
        if (this.tamano < this.capacidad) {
            this.elementos[this.cola] = elemento;
            this.cola = (this.cola + 1) % this.capacidad;
            this.tamano++;
        } else {
            this.elementos[this.cola] = elemento;
            this.cola = (this.cola + 1) % this.capacidad;
            this.cabeza = (this.cabeza + 1) % this.capacidad;
        }
    }

    obtenerTodos() {
        const resultados = [];
        if (this.tamano === 0) {
            return resultados;
        }

        // Iterar sobre los elementos reales, no sobre todo el array interno si hay undefined
        for (let i = 0; i < this.tamano; i++) {
            const index = (this.cabeza + i) % this.capacidad;
            resultados.push(this.elementos[index]);
        }
        return resultados;
    }

    getCapacidad() {
        return this.capacidad;
    }

    getTamano() {
        return this.tamano;
    }

    static fromPlainObject(plainObject) {
        if (!plainObject || !Array.isArray(plainObject.elementos)) {
            //console.error("fromPlainObject: Objeto plano inválido para ListaCircular", plainObject);
            return null;
        }

        const lista = new ListaCircular(plainObject.capacidad || ListaCircular.CAPACIDAD_DEFAULT);
        lista.cabeza = plainObject.cabeza || 0;
        lista.cola = plainObject.cola || 0;
        lista.tamano = plainObject.tamano || 0;

        // Rehidratar los elementos, manejando 'null' o 'undefined'
        lista.elementos = plainObject.elementos.map(e => {
            if (e === null || typeof e === 'undefined') { // Si es nulo o indefinido, mantenerlo así
                return e;
            }
            if (e instanceof Notificacion) {
                return e;
            } else if (typeof e === 'object') {
                // Usar el constructor de Notificacion para rehidratar. Asegúrate de pasar todos los parámetros.
                return new Notificacion(e.mensaje, e.tipo, e.idTransaccion, e.leida, e.fecha, e.id);
            }
            return e; // Para otros tipos de datos si los hubiera
        });

        // IMPORTANTE: Asegurarse de que el array interno 'elementos' tenga la longitud de la capacidad
        // y rellena con 'undefined' si es necesario. Esto evita problemas si la capacidad es mayor que los elementos reales.
        while (lista.elementos.length < lista.capacidad) {
            lista.elementos.push(undefined);
        }

        return lista;
    }
}

export default ListaCircular;