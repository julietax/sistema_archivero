let estantes = [];

const form = document.getElementById('estanteForm');
const estantesTableBody = document.getElementById('estantesTableBody');
const idEstantesInput = document.getElementById('idEstantes');
const nombreEstanteInput = document.getElementById('nombreEstante');
const descripcionEstanteInput = document.getElementById('descripcionEstante');
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
    const completo = nombreEstanteInput.value.trim() !== '' && descripcionEstanteInput.value.trim() !== '';
    btnGuardar.disabled = !completo;
}

nombreEstanteInput.addEventListener('input', revisarFormulario);
descripcionEstanteInput.addEventListener('input', revisarFormulario);

async function cargarEstantes() {
    try {
        const response = await fetch('/api/estantes');
        estantes = await response.json();
        renderTablaEstantes();
    } catch (error) {
        console.error("Error al cargar estantes:", error);
    }
}

function renderTablaEstantes() {
    estantesTableBody.innerHTML = '';

    if (estantes.length === 0) {
        estantesTableBody.innerHTML = `<tr><td colspan="4" class="empty-message">No hay estantes registrados</td></tr>`;
        return;
    }

    estantes.forEach(e => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${e.Estante}</td>
            <td>${e.Descripcion}</td>
            <td style="text-align: center;">
                <a href="caja.html?idEstante=${e.idEstantes}&nombreEstante=${encodeURIComponent(e.Estante)}" class="action-btn-link" title="Agregar caja" style="text-decoration: none; color: #007bff; font-weight: 600;">
                    Agregar caja ➕
                </a>
            </td>
            <td style="text-align: center;">
                <div class="action-btns" style="justify-content: center;">
                    <button class="action-icon" onclick="editarEstante(${e.idEstantes})" title="Editar">✏️</button>
                    <button class="action-icon" onclick="eliminarEstante(${e.idEstantes})" title="Eliminar">🗑️</button>
                </div>
            </td>
        `;
        estantesTableBody.appendChild(tr);
    });
}

form.addEventListener('submit', async function(e) {
    e.preventDefault();

    const id = idEstantesInput.value;
    const estante = nombreEstanteInput.value.trim();
    const descripcion = descripcionEstanteInput.value.trim();

    // Validación de nombres duplicados de estantes
    const normalizar = texto => texto.trim().replace(/\s+/g, ' ').toLowerCase();
    const nombreDuplicado = estantes.some(item =>
        normalizar(item.Estante) === normalizar(estante) &&
        String(item.idEstantes) !== String(id)
    );

    if (nombreDuplicado) {
        mostrarAlertaSistema('Ya existe un estante registrado con ese nombre. Elige otro.');
        nombreEstanteInput.focus();
        return;
    }

    const payload = { estante, descripcion };

    try {
        const url = id ? `/api/estantes/${id}` : '/api/estantes';
        const method = id ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            limpiarFormulario();
            await cargarEstantes();
        } else {
            const err = await response.json();
            mostrarAlertaSistema(err.error || "No se pudo guardar el estante.");
        }
    } catch (error) {
        console.error("Error al guardar estante:", error);
        mostrarAlertaSistema("Error de conexión con el servidor.");
    }
});

window.editarEstante = function(id) {
    const e = estantes.find(item => item.idEstantes == id);
    if (e) {
        ocultarAlertaSistema();
        idEstantesInput.value = e.idEstantes;
        nombreEstanteInput.value = e.Estante;
        descripcionEstanteInput.value = e.Descripcion;
        btnGuardar.textContent = 'Actualizar';
        revisarFormulario();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

window.eliminarEstante = function(id) {
    solicitarConfirmacion("¿Estás seguro de que deseas eliminar este estante?", async () => {
        try {
            const response = await fetch(`/api/estantes/${id}`, { method: 'DELETE' });
            if (response.ok) {
                limpiarFormulario();
                await cargarEstantes();
            } else {
                const err = await response.json().catch(() => ({}));
                mostrarAlertaSistema(err.error || "No se pudo eliminar el estante (puede tener cajas asociadas).");
            }
        } catch (error) {
            console.error("Error al eliminar:", error);
            mostrarAlertaSistema("Error de conexión al eliminar.");
        }
    });
};

function limpiarFormulario() {
    form.reset();
    idEstantesInput.value = '';
    btnGuardar.textContent = 'Guardar';
    ocultarAlertaSistema();
    revisarFormulario();
}

btnCancelar.addEventListener('click', limpiarFormulario);
btnLimpiar.addEventListener('click', limpiarFormulario);

cargarEstantes();
revisarFormulario();