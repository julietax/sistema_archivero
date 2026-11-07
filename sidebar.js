document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.getElementById('menuToggle');
    const closeMenu = document.getElementById('closeMenu');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    function abrirMenu(e) {
        e.preventDefault();
        if (sidebar) sidebar.classList.add('active');
        if (sidebarOverlay) sidebarOverlay.classList.add('active');
    }

    function cerrarMenu(e) {
        if (e) e.preventDefault();
        if (sidebar) sidebar.classList.remove('active');
        if (sidebarOverlay) sidebarOverlay.classList.remove('active');
    }

    if (menuToggle) {
        menuToggle.addEventListener('click', abrirMenu);
    }
    
    if (closeMenu) {
        closeMenu.addEventListener('click', cerrarMenu);
    }
    
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', cerrarMenu);
    }
});