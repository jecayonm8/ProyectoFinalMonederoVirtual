import ClienteService from "../services/ClienteService.js";

document.addEventListener("DOMContentLoaded", () => {
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
        monederoSeleccionado.innerHTML = "<option value=''>Selecciona un monedero</option>" + options;
    }

    const saldoCuentaPrincipal = document.getElementById("saldoCuentaPrincipal");
    const listaMonederos = document.getElementById("listaMonederos");
    const formNuevoMonedero = document.getElementById("formNuevoMonedero");
    const formTransferencia = document.getElementById("formTransferencia");
    const monederoOrigen = document.getElementById("monederoOrigen");
    const monederoDestino = document.getElementById("monederoDestino");
    const monederoSeleccionado = document.getElementById("monederoSeleccionado");
    const btnAgregarSaldo = document.getElementById("btnAgregarSaldo");
    const btnRetirarSaldo = document.getElementById("btnRetirarSaldo");
    const btnEliminarMonedero = document.getElementById("btnEliminarMonedero");

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

    btnAgregarSaldo.addEventListener("click", () => {
        const clienteActual = ClienteService.obtenerClienteActual();
        const idMonedero = monederoSeleccionado.value;
        if (!idMonedero) return alert("Selecciona un monedero.");
        const monto = parseFloat(prompt("¿Cuánto saldo deseas agregar?"));
        if (isNaN(monto) || monto <= 0) return alert("Monto inválido.");
        const res = ClienteService.agregarSaldoAMonedero(clienteActual.id, idMonedero, monto);
        alert(res.mensaje || (res.exito ? "Saldo agregado" : "Error"));
        render();
    });

    btnRetirarSaldo.addEventListener("click", () => {
        const clienteActual = ClienteService.obtenerClienteActual();
        const idMonedero = monederoSeleccionado.value;
        if (!idMonedero) return alert("Selecciona un monedero.");
        const monto = parseFloat(prompt("¿Cuánto saldo deseas retirar?"));
        if (isNaN(monto) || monto <= 0) return alert("Monto inválido.");
        const res = ClienteService.retirarSaldoDeMonedero(clienteActual.id, idMonedero, monto);
        alert(res.mensaje || (res.exito ? "Saldo retirado" : "Error"));
        render();
    });

    btnEliminarMonedero.addEventListener("click", () => {
        const clienteActual = ClienteService.obtenerClienteActual();
        const idMonedero = monederoSeleccionado.value;
        if (!idMonedero) return alert("Selecciona un monedero.");
        if (!confirm("¿Seguro que deseas eliminar este monedero?")) return;
        const res = ClienteService.eliminarMonedero(clienteActual.id, idMonedero);
        alert(res.mensaje || (res.exito ? "Monedero eliminado" : "Error"));
        render();
    });

    render();
});