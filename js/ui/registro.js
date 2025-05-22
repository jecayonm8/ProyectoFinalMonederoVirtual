import ClienteService from "../services/ClienteService.js"; // Importamos el ClienteService
import Cliente from "../models/Cliente.js"; // Importamos la clase Cliente para crear instancias

document.addEventListener("DOMContentLoaded", () => {
    const registroForm = document.getElementById("registroForm");
    const mensajeRegistroDiv = document.getElementById("mensajeRegistro");

    registroForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const id = document.getElementById("id").value.trim();
        const nombre = document.getElementById("nombre").value.trim();
        const contrasena = document.getElementById("contrasena").value.trim(); // Capturar la contraseña

        if (!id || !nombre || !contrasena) {
            mensajeRegistroDiv.textContent = "Por favor, complete todos los campos.";
            mensajeRegistroDiv.classList.remove("success");
            mensajeRegistroDiv.classList.add("error");
            return;
        }

        const resultado = ClienteService.agregarCliente(id, nombre, contrasena); // Pasar la contraseña

        if (resultado.startsWith("Error")) {
            mensajeRegistroDiv.textContent = resultado;
            mensajeRegistroDiv.classList.remove("success");
            mensajeRegistroDiv.classList.add("error");
        } else {
            mensajeRegistroDiv.textContent = `¡Registro exitoso! Ya puedes iniciar sesión. ${resultado}`;
            mensajeRegistroDiv.classList.remove("error");
            mensajeRegistroDiv.classList.add("success");
            registroForm.reset(); // Limpiar el formulario
        }
    });
});