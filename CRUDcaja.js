let cajas = [];

const urlParams = new URLSearchParams(window.location.search);
const idEstantesFK = urlParams.get('idEstante');
const nombreEstante = urlParams.get('nombreEstante');

if (!idEstantesFK) {
    alert("No se especificó un estante válido.");
    window.location.href = 'estante.html';
}

document.getElementById('idEstantesFK').value = idEstantesFK;
document.getElementById('tituloEstante').textContent = `Registro de cajas del estante ${nombreEstante ? nombreEstante : ''}`;
document.getElementById('tituloTablaCajas').textContent = `LISTADO DE CAJAS DEL ESTANTE ${nombreEstante ? nombreEstante : ''}`;

const form = document.getElementById('cajaForm');
const cajasTableBody = document.getElementById('cajasTableBody');
const idCajasInput = document.getElementById('idCajas');
const nombreCajaInput = document.getElementById('nombreCaja');
const descripcionCajaInput = document.getElementById('descripcionCaja');
const btnCancelar = document.getElementById('btnCancelar');
const btnLimpiar = document.getElementById('btnLimpiar');
const btnGuardar = document.getElementById('btnGuardar');

const alertSistema = document.getElementById('alertSistema');
const alertTexto = document.getElementById('alertTexto');
const modalConfirmacion = document.getElementById('modalConfirmacion');
const modalMensaje = document.getElementById('modalMensaje');
const btnModalAceptar = document.getElementById('btnModalAceptar');
const btnModalCancelar = document.getElementById('btnModalCancelar');

function mostrarAlertaSistema(mensaje) {
    if (alertSistema && alertTexto) {
        alertTexto.textContent = mensaje;
        alertSistema.classList.remove('d-none');
    }
}

function ocultarAlertaSistema() {
    if (alertSistema) alertSistema.classList.add('d-none');
}

function solicitarConfirmacion(mensaje, callbackAceptar) {
    if (modalConfirmacion && modalMensaje) {
        modalMensaje.textContent = mensaje;
        modalConfirmacion.classList.remove('d-none');

        btnModalAceptar.onclick = () => {
            modalConfirmacion.classList.add('d-none');
            callbackAceptar();
        };
        btnModalCancelar.onclick = () => {
            modalConfirmacion.classList.add('d-none');
        };
    }
}

function revisarFormulario() {
    ocultarAlertaSistema();
    const completo = nombreCajaInput.value.trim() !== '' && descripcionCajaInput.value.trim() !== '';
    btnGuardar.disabled = !completo;
}

nombreCajaInput.addEventListener('input', revisarFormulario);
descripcionCajaInput.addEventListener('input', revisarFormulario);

async function cargarCajas() {
    try {
        const response = await fetch('/api/cajas');
        const todasLasCajas = await response.json();
        // Filtrar exclusivamente las cajas del estante actual
        cajas = todasLasCajas.filter(c => c.Estantes_idEstantes == idEstantesFK);
        renderTablaCajas();
    } catch (error) {
        console.error("Error al cargar cajas:", error);
    }
}

function renderTablaCajas() {
    cajasTableBody.innerHTML = '';

    if (cajas.length === 0) {
        cajasTableBody.innerHTML = `<tr><td colspan="3" class="empty-message">No hay cajas registradas para este estante</td></tr>`;
        return;
    }

    cajas.forEach(c => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${c.Caja}</td>
            <td>${c.Descripcion}</td>
            <td style="text-align: center;">
                <div class="action-btns" style="justify-content: center;">
                    <button class="action-icon" onclick="editarCaja(${c.idCajas})" title="Editar">✏️</button>
                    <button class="action-icon" onclick="eliminarCaja(${c.idCajas})" title="Eliminar">🗑️</button>
                </div>
            </td>
        `;
        cajasTableBody.appendChild(tr);
    });
}

form.addEventListener('submit', async function(e) {
    e.preventDefault();

    const id = idCajasInput.value;
    const caja = nombreCajaInput.value.trim();
    const idEstante = idEstantesFK;

    // Validación de nombres duplicados de cajas dentro del mismo estante
    const normalizar = texto => texto.trim().replace(/\s+/g, ' ').toLowerCase();
    const cajaDuplicada = cajas.some(item =>
        normalizar(item.Caja) === normalizar(caja) &&
        String(item.Estantes_idEstantes) === String(idEstante) &&
        String(item.idCajas) !== String(id)
    );

    if (cajaDuplicada) {
        mostrarAlertaSistema("Ya existe una caja con ese nombre en este estante. Elige otro.");
        nombreCajaInput.focus();
        return;
    }

    const descripcion = descripcionCajaInput.value.trim();
    const payload = { estantes_idEstantes: idEstantesFK, caja, descripcion };

    try {
        const url = id ? `/api/cajas/${id}` : '/api/cajas';
        const method = id ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            limpiarFormulario();
            await cargarCajas();
        } else {
            const err = await response.json();
            mostrarAlertaSistema(err.error || "No se pudo guardar la caja.");
        }
    } catch (error) {
        console.error("Error al guardar caja:", error);
        mostrarAlertaSistema("Error de conexión con el servidor.");
    }
});

window.editarCaja = function(id) {
    const c = cajas.find(item => item.idCajas == id);
    if (c) {
        ocultarAlertaSistema();
        idCajasInput.value = c.idCajas;
        nombreCajaInput.value = c.Caja;
        descripcionCajaInput.value = c.Descripcion;
        btnGuardar.textContent = 'Actualizar';
        revisarFormulario();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

window.eliminarCaja = function(id) {
    solicitarConfirmacion("¿Estás seguro de que deseas eliminar esta caja?", async () => {
        try {
            const response = await fetch(`/api/cajas/${id}`, { method: 'DELETE' });
            if (response.ok) {
                limpiarFormulario();
                await cargarCajas();
            } else {
                const err = await response.json().catch(() => ({}));
                mostrarAlertaSistema(err.error || "No se pudo eliminar la caja (puede estar asignada a un documento).");
            }
        } catch (error) {
            console.error("Error al eliminar:", error);
            mostrarAlertaSistema("Error de conexión al eliminar.");
        }
    });
};

function limpiarFormulario() {
    form.reset();
    idCajasInput.value = '';
    btnGuardar.textContent = 'Guardar';
    ocultarAlertaSistema();
    revisarFormulario();
}

btnCancelar.addEventListener('click', limpiarFormulario);
btnLimpiar.addEventListener('click', limpiarFormulario);

cargarCajas();
revisarFormulario();