let usuarios = [];
let rolesDisponibles = [];

const form = document.getElementById('userForm');
const usersTableBody = document.getElementById('usersTableBody');
const idUsuariosInput = document.getElementById('idUsuarios');
const rolesIdRolesSelect = document.getElementById('rolesIdRoles');
const nombreInput = document.getElementById('nombre');
const apellidoPaternoInput = document.getElementById('apellidoPaterno');
const apellidoMaternoInput = document.getElementById('apellidoMaterno');
const correoInput = document.getElementById('correo');
const contrasenaInput = document.getElementById('contrasena');
const btnCancelar = document.getElementById('btnCancelar');
const btnLimpiar = document.getElementById('btnLimpiar');
const btnGuardar = document.getElementById('btnGuardar');
const togglePassword = document.getElementById('togglePassword');

// Funcionalidad del ojito para mostrar/ocultar contraseña
togglePassword.addEventListener('click', () => {
    const isPassword = contrasenaInput.getAttribute('type') === 'password';
    
    if (isPassword) {
        contrasenaInput.setAttribute('type', 'text');
        togglePassword.classList.remove('fa-eye-slash');
        togglePassword.classList.add('fa-eye');
    } else {
        contrasenaInput.setAttribute('type', 'password');
        togglePassword.classList.remove('fa-eye');
        togglePassword.classList.add('fa-eye-slash');
    }
});

// Validación en tiempo real: Solo letras y espacios en nombres y apellidos
function validarSoloLetras(input) {
    input.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ\s]/g, '');
    });
}
validarSoloLetras(nombreInput);
validarSoloLetras(apellidoPaternoInput);
validarSoloLetras(apellidoMaternoInput);

async function inicializarPantallaUsuarios() {
    try {
        const resRoles = await fetch('/api/roles');
        rolesDisponibles = await resRoles.json();
        
        rolesIdRolesSelect.innerHTML = '<option value="">Seleccione un rol...</option>';
        rolesDisponibles.forEach(r => {
            rolesIdRolesSelect.innerHTML += `<option value="${r.idRoles}">${r.Nombre}</option>`;
        });

        cargarUsuarios();
    } catch (error) {
        console.error("Error al cargar roles:", error);
    }
}

async function cargarUsuarios() {
    try {
        const response = await fetch('/api/usuarios-completo');
        usuarios = await response.json();
        renderTableUsuarios();
    } catch (error) {
        console.error("Error al cargar usuarios:", error);
    }
}

function renderTableUsuarios() {
    usersTableBody.innerHTML = '';
    
    if (usuarios.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="4" class="empty-message">No hay usuarios registrados</td>`;
        usersTableBody.appendChild(tr);
        return;
    }

    usuarios.forEach(u => {
        const tr = document.createElement('tr');
        const nombreCompleto = `${u.Nombre} ${u.Apellido_paterno} ${u.Apellido_materno || ''}`.trim();
        tr.innerHTML = `
            <td>${nombreCompleto}</td>
            <td>${u.Correo_electronico || 'N/A'}</td>
            <td>${u.NombreRol || 'N/A'}</td>
            <td style="text-align: center;">
                <div class="action-btns" style="justify-content: center;">
                    <button class="action-icon" onclick="editarUsuario(${u.idUsuarios})" title="Editar">✏️</button>
                    <button class="action-icon" onclick="eliminarUsuario(${u.idUsuarios})" title="Eliminar">🗑️</button>
                </div>
            </td>
        `;
        usersTableBody.appendChild(tr);
    });
}

form.addEventListener('submit', async function(e) {
    e.preventDefault();
    const id = idUsuariosInput.value;
    const roles_idRoles = rolesIdRolesSelect.value;
    const nombre = nombreInput.value.trim();
    const apellido_paterno = apellidoPaternoInput.value.trim();
    const apellido_materno = apellidoMaternoInput.value.trim();
    const correo_electronico = correoInput.value.trim();
    const contrasena = contrasenaInput.value.trim();

    if (!roles_idRoles || !nombre || !apellido_paterno || !correo_electronico || !contrasena) {
        mostrarAlertaSistema("Por favor completa todos los campos obligatorios.");
        return;
    }

    const dataUsuario = { roles_idRoles, nombre, apellido_paterno, apellido_materno, correo_electronico, contrasena };

    try {
        const url = id ? `/api/usuarios/${id}` : '/api/usuarios';
        const method = id ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataUsuario)
        });

        const resultado = await response.json();

        if (!response.ok) {
            mostrarAlertaSistema(resultado.error || "Ocurrió un error al guardar el usuario.");
            return;
        }

        limpiarFormulario();
        cargarUsuarios();
    } catch (error) {
        console.error("Error al guardar usuario:", error);
        mostrarAlertaSistema("No se pudo conectar con el servidor.");
    }
});

window.editarUsuario = function(id) {
    const usuario = usuarios.find(u => u.idUsuarios == id);
    if (usuario) {
        ocultarAlertaSistema();
        idUsuariosInput.value = usuario.idUsuarios;
        nombreInput.value = usuario.Nombre;
        apellidoPaternoInput.value = usuario.Apellido_paterno;
        apellidoMaternoInput.value = usuario.Apellido_materno || '';
        
        // Habilitar rol porque ya tiene nombre al editar
        rolesIdRolesSelect.disabled = false;
        rolesIdRolesSelect.value = usuario.Roles_idRoles;
        
        correoInput.value = usuario.Correo_electronico || '';
        contrasenaInput.value = usuario.Contrasena;
        
        validarEstadoFormulario();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

window.eliminarUsuario = async function(id) {
    const acepto = await confirmarAccion("¿Estás seguro de que deseas eliminar este usuario?");
    if (!acepto) return;

    try {
        const response = await fetch(`/api/usuarios/${id}`, { method: 'DELETE' });
        if (response.ok) {
            ocultarAlertaSistema();
            cargarUsuarios();
        } else {
            mostrarAlertaSistema("No se pudo eliminar el usuario (puede estar vinculado a un préstamo).");
        }
    } catch (error) {
        console.error("Error al eliminar usuario:", error);
        mostrarAlertaSistema("No se pudo conectar con el servidor.");
    }
}

btnCancelar.addEventListener('click', function() {
    limpiarFormulario();
});

btnLimpiar.addEventListener('click', function() {
    limpiarFormulario();
});

function limpiarFormulario() {
    form.reset();
    idUsuariosInput.value = '';
    contrasenaInput.setAttribute('type', 'password');
    togglePassword.classList.remove('fa-eye');
    togglePassword.classList.add('fa-eye-slash');
    ocultarAlertaSistema();
    validarEstadoFormulario();
}

// Lógica para validar campos requeridos, bloqueo de rol y botón guardar
const camposRequeridos = [nombreInput, apellidoPaternoInput, rolesIdRolesSelect, correoInput, contrasenaInput];

function validarEstadoFormulario() {
    // 1. Bloquear o desbloquear el Rol dependiendo de si hay texto en Nombre
    if (nombreInput.value.trim().length > 0) {
        rolesIdRolesSelect.disabled = false;
    } else {
        rolesIdRolesSelect.disabled = true;
        rolesIdRolesSelect.value = ""; 
    }

    // 2. Habilitar o deshabilitar el botón Guardar según los campos requeridos
    let todosLlenos = true;
    camposRequeridos.forEach(campo => {
        if (!campo || !campo.value.trim()) {
            todosLlenos = false;
        }
    });

    btnGuardar.disabled = !todosLlenos;
}

// Escuchar eventos en los campos
camposRequeridos.forEach(campo => {
    if (campo) {
        campo.addEventListener('input', validarEstadoFormulario);
        campo.addEventListener('change', validarEstadoFormulario);
    }
});

// Inicializar estado al cargar
validarEstadoFormulario();
inicializarPantallaUsuarios();