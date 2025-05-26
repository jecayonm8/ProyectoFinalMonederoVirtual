// Script to create a new test user with known password for testing

import ClienteService from "../services/ClienteService.js";

function createTestUser() {
    const id = "testuser1";
    const nombre = "Test User 1";
    const contrasena = "password123";

    const existingUser = ClienteService.buscarClientePorId(id);
    if (existingUser) {
        console.log("Test user already exists:", id);
        return;
    }

    const result = ClienteService.agregarCliente(nombre, id, contrasena);
    console.log("Create test user result:", result);
}

createTestUser();
