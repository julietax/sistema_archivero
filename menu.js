document.addEventListener('DOMContentLoaded', () => {
    const sesionStr = localStorage.getItem('sesionArchivero');

    // 1. Verificar si el usuario inició sesión
    if (!sesionStr) {
        window.location.href = 'login.html';
        return;
    }

    const usuario = JSON.parse(sesionStr);

    // 2. Mostrar el nombre del usuario en el sidebar y en la bienvenida
    const sidebarUserName = document.getElementById('sidebarUserName');
    const welcomeSubtitle = document.getElementById('welcomeSubtitle');
    const nombreMostrar = usuario.Nombre || usuario.correo || 'Usuario';

    if (sidebarUserName) {
        sidebarUserName.textContent = nombreMostrar;
    }
    if (welcomeSubtitle) {
        welcomeSubtitle.textContent = `Bienvenido, ${nombreMostrar}. Selecciona un módulo para comenzar a trabajar.`;
    }

    // Los candados y el bloqueo de módulos según el rol los maneja permisos.js
});