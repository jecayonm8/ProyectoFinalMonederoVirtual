// js/dataStructures/ListaCircular.js
class ListaCircular {
    static CAPACIDAD_DEFAULT = 10;

    constructor(capacidadMaxima = ListaCircular.CAPACIDAD_DEFAULT) {
        if (capacidadMaxima <= 0) {
            throw new Error("La capacidad máxima de la Lista Circular debe ser mayor que 0.");
        }
        this.capacidad = capacidadMaxima;
        this.elementos = new Array(this.capacidad);
        this.cabeza = 0;
        this.cola = 0;
        this.tamano = 0;
    }

    getCapacidad() { // Asegúrate de que este método existe
        return this.capacidad;
    }

    getTamano() { // Asegúrate de que este método existe
        return this.tamano;
    }

    obtenerTodos() { // Asegúrate de que este método existe
        const todos = [];
        if (this.tamano === 0) {
            return todos;
        }

        if (this.tamano < this.capacidad) {
            for (let i = 0; i < this.tamano; i++) {
                todos.push(this.elementos[i]);
            }
        } else {
            for (let i = 0; i < this.capacidad; i++) {
                todos.push(this.elementos[(this.cabeza + i) % this.capacidad]);
            }
        }
        return todos;
    }

    static fromPlainObject(objetoPlano) {
        const capacidad = objetoPlano && typeof objetoPlano.capacidad === 'number' ? objetoPlano.capacidad : ListaCircular.CAPACIDAD_DEFAULT;
        const lista = new ListaCircular(capacidad);
        if (objetoPlano && Array.isArray(objetoPlano.elementos)) {
            lista.elementos = objetoPlano.elementos;
            lista.cabeza = typeof objetoPlano.cabeza === 'number' ? objetoPlano.cabeza : 0;
            lista.cola = typeof objetoPlano.cola === 'number' ? objetoPlano.cola : 0;
            lista.tamano = typeof objetoPlano.tamano === 'number' ? objetoPlano.tamano : 0;
            if (lista.tamano > lista.capacidad) {
                 lista.tamano = lista.capacidad;
            }
        }
        return lista;
    }
}

export default ListaCircular;