// permisos.js
// Controla qué módulos puede usar cada rol.
// Se carga en todas las páginas (menos login.html), antes de sidebar.js.

/* ---------- Aquí se configuran los permisos ---------- */

// Páginas que solo puede abrir el Administrador
const PAGINAS_SOLO_ADMIN = ['index.html', 'usuario.html'];

// Páginas que puede abrir Personal RRHH (menu.html siempre se puede)
const PAGINAS_RRHH = ['reportetrabajador.html', 'consultadoc.html'];

// Reglas por rol (el nombre debe ser igual al de la tabla roles, sin importar mayúsculas)
const PERMISOS = {
    'administrador': () => true,                                          // todo
    'alumno': pagina => !PAGINAS_SOLO_ADMIN.includes(pagina),             // todo menos roles y usuarios
    'personal rrhh': pagina => PAGINAS_RRHH.includes(pagina)              // solo las consultas
};

/* ---------- Funciones ---------- */

// Dice si un rol puede abrir una página
function puedeEntrar(rol, pagina) {
    if (pagina === 'menu.html' || pagina === 'login.html') return true;
    const regla = PERMISOS[rol];
    // Si el rol no está en la lista (por ejemplo, un rol nuevo), no tiene acceso
    return regla ? regla(pagina) : false;
}

// Saca el nombre de la página de una dirección: "/Reportetrabajador.html" -> "reportetrabajador.html"
function nombrePagina(direccion) {
    return direccion.split('?')[0].split('#')[0].split('/').pop().toLowerCase();
}

// Pone el candado y evita que el enlace abra la página
function bloquearEnlace(enlace) {
    enlace.classList.add('bloqueado');
    enlace.setAttribute('title', 'No tienes acceso a este módulo');
    enlace.setAttribute('aria-disabled', 'true');
    enlace.setAttribute('tabindex', '-1');

    const candado = document.createElement('span');
    candado.className = 'candado';
    candado.textContent = '🔒';
    enlace.appendChild(candado);

    enlace.addEventListener('click', e => e.preventDefault());
}

/* ---------- Se ejecuta al cargar la página ---------- */

(function () {
    let usuario = null;
    try {
        usuario = JSON.parse(localStorage.getItem('sesionArchivero'));
    } catch (e) {
        usuario = null;
    }

    // 1. Si no hay sesión, se manda al login
    if (!usuario) {
        window.location.replace('login.html');
        return;
    }

    const rol = String(usuario.NombreRol || usuario.rol || '').trim().toLowerCase();

    // 2. Si escribe la dirección de una página sin permiso, se regresa al menú
    const paginaActual = nombrePagina(window.location.pathname);
    if (!puedeEntrar(rol, paginaActual)) {
        window.location.replace('menu.html');
        return;
    }

    // 3. Candados en los enlaces del menú lateral y de las tarjetas
    function ponerCandados() {
        document.querySelectorAll('.sidebar-nav a[href], .module-links a[href]').forEach(enlace => {
            const href = enlace.getAttribute('href');
            if (!href || href.startsWith('#') || /^https?:/i.test(href)) return;
            if (!puedeEntrar(rol, nombrePagina(href))) bloquearEnlace(enlace);
        });
    }

    // 4. Botón "Cerrar sesión"
    function activarCerrarSesion() {
        document.querySelectorAll('.btn-cerrar-sesion').forEach(boton => {
            boton.addEventListener('click', () => {
                localStorage.removeItem('sesionArchivero');
                window.location.href = 'login.html';
            });
        });
    }

    function iniciar() {
        ponerCandados();
        activarCerrarSesion();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', iniciar);
    } else {
        iniciar();
    }
})();
