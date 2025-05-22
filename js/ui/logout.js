document.addEventListener("DOMContentLoaded", () => {
    const cerrarSesionBtn = document.getElementById("cerrarSesionBtn");

    if (cerrarSesionBtn) {
        cerrarSesionBtn.addEventListener("click", () => {
            // Eliminar la clave del cliente logueado de localStorage
            localStorage.removeItem("clienteActual");

            // Redirigir al usuario a la página de inicio
            // Desde js/ui/logout.js, para llegar a index.html (en la raíz),
            // subimos dos niveles (../..)
            window.location.href = "../../index.html";
        });
    }
});