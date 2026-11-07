let trabajadores = [];
let departamentosDisponibles = [];
let estatusDisponibles = [];
 
const form = document.getElementById('workerForm');
const workersTableBody = document.getElementById('workersTableBody');
const resultCount = document.getElementById('resultCount');
const idTrabajadoresInput = document.getElementById('idTrabajadores');
const nombreInput = document.getElementById('nombre');
const apellidoPaternoInput = document.getElementById('apellidoPaterno');
const apellidoMaternoInput = document.getElementById('apellidoMaterno');
const noTrabajadorInput = document.getElementById('noTrabajador');
const departamentoSelect = document.getElementById('departamento');
const fechaIngresoInput = document.getElementById('fechaIngreso');
const estatusSelect = document.getElementById('estatus');
const btnCancelar = document.getElementById('btnCancelar');
const btnLimpiar = document.getElementById('btnLimpiar');
const btnGuardar = document.getElementById('btnGuardar');

// Campos obligatorios para validar el botón guardar
const camposRequeridosTrabajador = [
    nombreInput,
    apellidoPaternoInput,
    noTrabajadorInput,
    departamentoSelect,
    fechaIngresoInput,
    estatusSelect
];

function validarFormularioTrabajador() {
    let todosLlenos = true;
    camposRequeridosTrabajador.forEach(campo => {
        if (!campo || !campo.value.trim()) {
            todosLlenos = false;
        }
    });
    btnGuardar.disabled = !todosLlenos;
}

// Escuchar cambios para habilitar/deshabilitar botón
camposRequeridosTrabajador.forEach(campo => {
    if (campo) {
        campo.addEventListener('input', validarFormularioTrabajador);
        campo.addEventListener('change', validarFormularioTrabajador);
    }
});

// Fecha de hoy local
function fechaHoyLocal() {
    const f = new Date();
    const mes = String(f.getMonth() + 1).padStart(2, '0');
    const dia = String(f.getDate()).padStart(2, '0');
    return `${f.getFullYear()}-${mes}-${dia}`;
}

const hoy = fechaHoyLocal();
document.getElementById('fechaIngreso').setAttribute('max', hoy);

// Validaciones de entrada
nombreInput.addEventListener('input', function() {
    this.value = this.value.replace(/[0-9]/g, '');
    validarFormularioTrabajador();
});

apellidoPaternoInput.addEventListener('input', function() {
    this.value = this.value.replace(/[0-9]/g, '');
    validarFormularioTrabajador();
});

apellidoMaternoInput.addEventListener('input', function() {
    this.value = this.value.replace(/[0-9]/g, '');
});
 
noTrabajadorInput.addEventListener('input', function() {
    this.value = this.value.replace(/\D/g, '');
    validarFormularioTrabajador();
});
 
// Cargar selects (departamentos y estatus desde MySQL)
async function inicializarPantallaTrabajadores() {
    try {
        const resDeptos = await fetch('/api/departamentos');
        departamentosDisponibles = await resDeptos.json();
        departamentoSelect.innerHTML = '<option value="">Seleccione un departamento...</option>';
        departamentosDisponibles.forEach(d => {
            departamentoSelect.innerHTML += `<option value="${d.idDepartamentos}">${d.Nombre}</option>`;
        });
 
        const resEstatus = await fetch('/api/estatus');
        estatusDisponibles = await resEstatus.json();
        estatusSelect.innerHTML = '<option value="">Seleccione un estatus...</option>';
        estatusDisponibles.forEach(e => {
            estatusSelect.innerHTML += `<option value="${e.idEstatus}">${e.Estatus}</option>`;
        });
    } catch (error) {
        console.error("Error al cargar departamentos/estatus:", error);
    }
 
    cargarTrabajadores();
}
 
async function cargarTrabajadores() {
    try {
        const response = await fetch('/api/trabajadores-completo');
        trabajadores = await response.json();
        renderTableTrabajadores();
    } catch (error) {
        console.error("Error al cargar trabajadores:", error);
    }
}
 
function formatearFecha(fecha) {
    if (!fecha) return '';
    const [anio, mes, dia] = fecha.slice(0, 10).split('-');
    return `${dia}/${mes}/${anio.slice(-2)}`;
}
 
function renderTableTrabajadores() {
    workersTableBody.innerHTML = '';
 
    resultCount.textContent = trabajadores.length === 1
        ? '1 resultado'
        : `${trabajadores.length} resultados`;
 
    if (trabajadores.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="6" class="empty-message">No hay trabajadores registrados</td>`;
        workersTableBody.appendChild(tr);
        return;
    }
 
    trabajadores.forEach(t => {
        const tr = document.createElement('tr');
        const nombreCompleto = `${t.Nombre} ${t.Apellido_paterno} ${t.Apellido_materno || ''}`.trim();
        tr.innerHTML = `
            <td>${nombreCompleto}</td>
            <td>${t.No_trabajador}</td>
            <td>${t.Departamento || 'N/A'}</td>
            <td>${formatearFecha(t.Fecha_ingreso)}</td>
            <td>${t.Estatus || 'N/A'}</td>
            <td style="text-align: center;">
                <div class="action-btns" style="justify-content: center;">
                    <button class="action-icon" onclick="editarTrabajador(${t.idTrabajadores})" title="Editar">✏️</button>
                    <button class="action-icon" onclick="eliminarTrabajador(${t.idTrabajadores})" title="Eliminar">🗑️</button>
                </div>
            </td>
        `;
        workersTableBody.appendChild(tr);
    });
}
 
// Creación o Edición
form.addEventListener('submit', async function(e) {
    e.preventDefault();
    const id = idTrabajadoresInput.value;
    const nombre = nombreInput.value.trim();
    const apellido_paterno = apellidoPaternoInput.value.trim();
    const apellido_materno = apellidoMaternoInput.value.trim();
    const no_trabajador = noTrabajadorInput.value.trim();
    const departamentos_idDepartamentos = departamentoSelect.value; 
    const fecha_ingreso = fechaIngresoInput.value;
    const estatus_idEstatus = estatusSelect.value;
 
    if (!nombre || !apellido_paterno || !no_trabajador || !departamentos_idDepartamentos || !fecha_ingreso || !estatus_idEstatus) {
        mostrarAlertaSistema("Completa todos los campos obligatorios.");
        return;
    }
 
    if (no_trabajador.length !== 4 || isNaN(no_trabajador)) {
        mostrarAlertaSistema("El número de trabajador debe ser exactamente de 4 dígitos.");
        return;
    }

    if (fecha_ingreso > hoy) {
        mostrarAlertaSistema("La fecha de ingreso no puede ser mayor al día de hoy.");
        return;
    }

    const dataTrabajador = {
        departamentos_idDepartamentos,
        estatus_idEstatus,
        nombre,
        apellido_paterno,
        apellido_materno,
        fecha_ingreso,
        no_trabajador
    };
 
    const url = id ? `/api/trabajadores/${id}` : '/api/trabajadores';
    const method = id ? 'PUT' : 'POST';
 
    try {
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataTrabajador)
        });
 
        if (response.ok) {
            limpiarFormulario();
            cargarTrabajadores();
        } else {
            const datos = await response.json().catch(() => ({}));
            mostrarAlertaSistema(datos.error || `No se pudo guardar (error ${response.status}).`);
        }
    } catch (error) {
        console.error("Error al guardar trabajador:", error);
        mostrarAlertaSistema("No se pudo conectar con el servidor.");
    }
});
 
window.editarTrabajador = function(id) {
    const t = trabajadores.find(x => x.idTrabajadores == id);
    if (t) {
        ocultarAlertaSistema();
        idTrabajadoresInput.value = t.idTrabajadores;
        nombreInput.value = t.Nombre;
        apellidoPaternoInput.value = t.Apellido_paterno;
        apellidoMaternoInput.value = t.Apellido_materno || '';
        noTrabajadorInput.value = t.No_trabajador;
        departamentoSelect.value = t.Departamentos_idDepartamentos;
        fechaIngresoInput.value = t.Fecha_ingreso ? t.Fecha_ingreso.slice(0, 10) : '';
        estatusSelect.value = t.Estatus_idEstatus;
        btnGuardar.textContent = 'Actualizar';
        validarFormularioTrabajador();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}
 
window.eliminarTrabajador = async function(id) {
    const acepto = await confirmarAccion("¿Estás seguro de que deseas eliminar este trabajador?");
    if (!acepto) return;

    try {
        const response = await fetch(`/api/trabajadores/${id}`, { method: 'DELETE' });
        if (response.ok) {
            limpiarFormulario();
            cargarTrabajadores();
        } else {
            mostrarAlertaSistema("No se pudo eliminar. Puede que tenga documentos asociados.");
        }
    } catch (error) {
        console.error("Error al eliminar trabajador:", error);
        mostrarAlertaSistema("No se pudo conectar con el servidor.");
    }
}
 
btnCancelar.addEventListener('click', limpiarFormulario);
btnLimpiar.addEventListener('click', limpiarFormulario);
 
function limpiarFormulario() {
    form.reset();
    idTrabajadoresInput.value = '';
    btnGuardar.textContent = 'Guardar';
    ocultarAlertaSistema();
    validarFormularioTrabajador();
}
 
inicializarPantallaTrabajadores();