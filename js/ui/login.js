import ClienteService from "../services/ClienteService.js";

document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");
    const mensajeLoginDiv = document.getElementById("mensajeLogin");

    loginForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const id = document.getElementById("id").value.trim();
        const contrasena = document.getElementById("contrasena").value.trim(); // Capturar la contraseña

        if (!id || !contrasena) {
            mensajeLoginDiv.textContent = "Por favor, ingrese su ID de Cliente y Contraseña.";
            mensajeLoginDiv.classList.remove("success");
            mensajeLoginDiv.classList.add("error");
            return;
        }

        const clienteAutenticado = ClienteService.autenticarCliente(id, contrasena); // Pasar la contraseña

        if (clienteAutenticado) {
            mensajeLoginDiv.textContent = "Inicio de sesión exitoso. Redirigiendo...";
            mensajeLoginDiv.classList.remove("error");
            mensajeLoginDiv.classList.add("success");
            // Redirigir al dashboard
            window.location.href = "dashboard.html";
        } else {
            mensajeLoginDiv.textContent = "ID de Cliente o Contraseña incorrectos.";
            mensajeLoginDiv.classList.remove("success");
            mensajeLoginDiv.classList.add("error");
        }
    });
});