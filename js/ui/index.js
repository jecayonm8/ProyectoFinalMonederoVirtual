document.addEventListener("DOMContentLoaded", () => {
    const clienteActual = localStorage.getItem("clienteActual");

    const headerAuthenticated = document.getElementById("header-authenticated");
    const headerUnauthenticated = document.getElementById("header-unauthenticated");
    const mainSection = document.querySelector("main.bienvenida"); // Sección principal de bienvenida
    const footerSection = document.querySelector("footer"); // Pie de página

    if (clienteActual) {
        // Si el usuario ya inició sesión, ocultamos la sección de bienvenida y mostramos el header logueado
        if (headerAuthenticated) {
            headerAuthenticated.style.display = "block"; // O "flex" si tu CSS lo requiere
        }
        if (headerUnauthenticated) {
            headerUnauthenticated.style.display = "none";
        }
        if (mainSection) {
            mainSection.style.display = "none"; // Oculta la sección de bienvenida
        }
        if (footerSection) {
            footerSection.style.display = "none"; // Oculta el pie de página
        }

        // Redirige al usuario al dashboard
        window.location.href = "components/dashboard.html";
    } else {
        // Si no hay sesión, mostramos la sección de bienvenida y el header no logueado
        if (headerAuthenticated) {
            headerAuthenticated.style.display = "none";
        }
        if (headerUnauthenticated) {
            headerUnauthenticated.style.display = "block"; // O "flex"
        }
        if (mainSection) {
            mainSection.style.display = "flex"; // Asume que necesitas flex para centrar
        }
        if (footerSection) {
            footerSection.style.display = "block"; // Muestra el pie de página
        }
    }
});