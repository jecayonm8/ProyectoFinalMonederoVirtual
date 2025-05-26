import ClienteService from "../services/ClienteService.js";

document.addEventListener("DOMContentLoaded", () => {
    // No guardes el cliente en una variable global, siempre obtén el actualizado
    function render() {
        const clienteActual = ClienteService.obtenerClienteActual();
        if (!clienteActual) {
            alert("Debe iniciar sesión.");
            window.location.href = "login.html";
            return;
        }
        saldoCuentaPrincipal.textContent = `Saldo cuenta principal: $${clienteActual.saldo.toFixed(2)}`;
        listaMonederos.innerHTML = clienteActual.monederos.map(m =>
            `<div>
                <span>${m.nombre} (${m.tipo})</span>
                <span class="saldo">$${m.saldo.toFixed(2)}</span>
            </div>`
        ).join("");
        const options = clienteActual.monederos.map(m =>
            `<option value="${m.id}">${m.nombre} - $${m.saldo.toFixed(2)}</option>`
        ).join("");
        monederoOrigen.innerHTML = "<option value=''>Origen</option>" + options;
        monederoDestino.innerHTML = "<option value=''>Destino</option>" + options;
    }

    const saldoCuentaPrincipal = document.getElementById("saldoCuentaPrincipal");
    const listaMonederos = document.getElementById("listaMonederos");
    const formNuevoMonedero = document.getElementById("formNuevoMonedero");
    const formTransferencia = document.getElementById("formTransferencia");
    const monederoOrigen = document.getElementById("monederoOrigen");
    const monederoDestino = document.getElementById("monederoDestino");

    formNuevoMonedero.addEventListener("submit", e => {
        e.preventDefault();
        const clienteActual = ClienteService.obtenerClienteActual();
        const nombre = document.getElementById("nombreMonedero").value.trim();
        const tipo = document.getElementById("tipoMonedero").value;
        const monto = parseFloat(document.getElementById("montoInicial").value);
        const res = ClienteService.crearMonederoParaCliente(clienteActual.id, nombre, tipo, monto);
        alert(res.mensaje || (res.exito ? "Monedero creado" : "Error"));
        render();
        formNuevoMonedero.reset();
    });

    formTransferencia.addEventListener("submit", e => {
        e.preventDefault();
        const clienteActual = ClienteService.obtenerClienteActual();
        const idOrigen = monederoOrigen.value;
        const idDestino = monederoDestino.value;
        const monto = parseFloat(document.getElementById("montoTransferencia").value);
        const res = ClienteService.transferirEntreMonederos(clienteActual.id, idOrigen, idDestino, monto);
        alert(res.mensaje || (res.exito ? "Transferencia realizada" : "Error"));
        render();
        formTransferencia.reset();
    });

    render();
});