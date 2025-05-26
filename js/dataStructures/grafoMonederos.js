class GrafoMonederos {
    constructor() {
        this.adyacencias = new Map(); // idMonedero -> Map(idDestino -> montoTotal)
    }

    agregarTransferencia(idOrigen, idDestino, monto) {
        if (!this.adyacencias.has(idOrigen)) {
            this.adyacencias.set(idOrigen, new Map());
        }
        const ady = this.adyacencias.get(idOrigen);
        ady.set(idDestino, (ady.get(idDestino) || 0) + monto);
    }

    obtenerRelaciones() {
        return this.adyacencias;
    }
}

export default GrafoMonederos;