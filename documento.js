const form = document.getElementById('documentoForm');
const documentosTableBody = document.getElementById('documentosTableBody');

const tipoDocumentoSelect = document.getElementById('tipoDocumento');
const trabajadorSelect = document.getElementById('trabajador');
const estanteSelect = document.getElementById('estante');
const cajaSelect = document.getElementById('caja');
const estatusInfo = document.getElementById('estatusInfo'); // NUEVO: ya no es un select

const idDocumentoInput = document.getElementById('idDocumento');
const btnCancelar = document.getElementById('btnCancelar');
const btnLimpiar = document.getElementById('btnLimpiar');
const btnGuardar = document.getElementById('btnGuardar');

// Dropzone y Archivos
const dropzone = document.getElementById('dropzone');
const fotoInput = document.getElementById('fotoInput');
const fileNameDisplay = document.getElementById('fileNameDisplay');
const previewArea = document.getElementById('previewArea');

// Elementos UI del sistema (Alertas y Modal)
const alertSistema = document.getElementById('alertSistema');
const alertTexto = document.getElementById('alertTexto');
const modalConfirmacion = document.getElementById('modalConfirmacion');
const modalMensaje = document.getElementById('modalMensaje');
const btnModalAceptar = document.getElementById('btnModalAceptar');
const btnModalCancelar = document.getElementById('btnModalCancelar');

let listaCajasGlobal = [];
let listaDocumentos = [];

function mostrarAlertaSistema(mensaje) {
    if (alertSistema && alertTexto) {
        alertTexto.textContent = mensaje;
        alertSistema.classList.remove('d-none');
    }
}

function ocultarAlertaSistema() {
    if (alertSistema) {
        alertSistema.classList.add('d-none');
    }
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

// Configuración de Carga de Archivos / Cámara
dropzone.addEventListener('click', () => fotoInput.click());

fotoInput.addEventListener('change', function() {
    if (this.files && this.files[0]) {
        const file = this.files[0];
        fileNameDisplay.textContent = file.name;

        if (file.type === 'application/pdf') {
            previewArea.innerHTML = `<span style="font-size: 2rem; color: #e74c3c;">📄 PDF</span>`;
        } else if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(e) {
                previewArea.innerHTML = `<img src="${e.target.result}" style="max-height: 80px; max-width: 100%; border-radius: 4px; object-fit: contain;">`;
            };
            reader.readAsDataURL(file);
        } else {
            previewArea.innerHTML = `<span style="font-size: 2rem; color: #3498db;">📎 Archivo</span>`;
        }
    }
    revisarFormulario();
});

// Soporte para arrastrar y soltar (Drag & Drop) desde la computadora
dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = '#007bff';
    dropzone.style.background = '#f8f9fa';
});

dropzone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = '#ccc';
    dropzone.style.background = '#fff';
});

dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = '#ccc';
    dropzone.style.background = '#fff';

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        fotoInput.files = e.dataTransfer.files;
        const event = new Event('change');
        fotoInput.dispatchEvent(event);
    }
});

// Carga Inicial de Selects
async function inicializarPantalla() {
    try {
        // Cargar Tipos de Documento
        const resTipos = await fetch('/api/tipos-documento');
        const tipos = await resTipos.json();
        tipoDocumentoSelect.innerHTML = '<option value="">Seleccione tipo...</option>';
        tipos.forEach(t => {
            tipoDocumentoSelect.innerHTML += `<option value="${t.idTipo_documento}">${t.Nombre}</option>`;
        });

        // Cargar Trabajadores
        const resTrab = await fetch('/api/trabajadores-completo');
        const trabajadores = await resTrab.json();
        trabajadorSelect.innerHTML = '<option value="">Seleccione trabajador...</option>';
        trabajadores.forEach(t => {
            trabajadorSelect.innerHTML += `<option value="${t.idTrabajadores}">${t.Nombre} ${t.Apellido_paterno} ${t.Apellido_materno || ''}</option>`;
        });

        // CAMBIO: ya no se carga el estatus, se asigna solo en el servidor

        // Cargar Estantes
        const resEstantes = await fetch('/api/estantes');
        const estantes = await resEstantes.json();
        estanteSelect.innerHTML = '<option value="">Seleccione estante...</option>';
        estantes.forEach(e => {
            estanteSelect.innerHTML += `<option value="${e.idEstantes}">${e.Estante} - ${e.Descripcion}</option>`;
        });

        // Cargar Cajas
        const resCajas = await fetch('/api/cajas');
        listaCajasGlobal = await resCajas.json();

        await cargarDocumentos();
    } catch (error) {
        console.error("Error al inicializar formulario de documentos:", error);
    }
}

// Filtro dependiente: Estante -> Cajas
estanteSelect.addEventListener('change', function() {
    const idEstante = this.value;
    cajaSelect.innerHTML = '<option value="">Seleccione caja...</option>';

    if (idEstante) {
        const cajasFiltradas = listaCajasGlobal.filter(c => c.Estantes_idEstantes == idEstante);
        cajasFiltradas.forEach(c => {
            cajaSelect.innerHTML += `<option value="${c.idCajas}">${c.Caja} - ${c.Descripcion}</option>`;
        });
        cajaSelect.disabled = false;
    } else {
        cajaSelect.disabled = true;
    }
    revisarFormulario();
});

[tipoDocumentoSelect, trabajadorSelect, cajaSelect].forEach(select => {
    select.addEventListener('change', revisarFormulario);
});

// ==========================================
// NUEVO: validación de duplicados
// ==========================================

// Revisa si el trabajador ya tiene un documento de ese tipo.
// Al editar, no se cuenta el mismo documento que se está editando.
function documentoRepetido() {
    if (tipoDocumentoSelect.value === '' || trabajadorSelect.value === '') return false;

    return listaDocumentos.some(d =>
        String(d.Trabajadores_idTrabajadores) === trabajadorSelect.value &&
        String(d.Tipo_documento_idTipo_documento) === tipoDocumentoSelect.value &&
        String(d.idDocumento) !== idDocumentoInput.value
    );
}

// CAMBIO: el botón Guardar solo se habilita si todo está lleno y el documento no está repetido
// CAMBIO: el botón Guardar solo se habilita si todo está lleno, no está repetido y hay un archivo seleccionado
function revisarFormulario() {
    ocultarAlertaSistema();

    const repetido = documentoRepetido();
    if (repetido) {
        const nombreTipo = tipoDocumentoSelect.selectedOptions[0].text;
        mostrarAlertaSistema(`Este trabajador ya tiene registrado un documento de tipo ${nombreTipo}.`);
    }

    // Validamos que los selects tengan valor y que el input file tenga al menos un archivo cargado
    const camposCompletos =
        tipoDocumentoSelect.value !== '' &&
        trabajadorSelect.value !== '' &&
        estanteSelect.value !== '' &&
        cajaSelect.value !== '';

    // Verificamos si hay un archivo seleccionado en el input de tipo file
    const archivoSeleccionado = fotoInput.files && fotoInput.files.length > 0;

    // Al editar, si ya tiene un archivo previo guardado en la BD no obligamos a subir uno nuevo a menos que deseen cambiarlo
    // (si estás editando y no seleccionas archivo nuevo, mantenemos habilitado si los campos están completos)
    const idEdicion = idDocumentoInput.value;
    const tieneArchivoOpcionalAlEditar = idEdicion !== '' ? true : archivoSeleccionado;

    // Condición general combinada
    const estatusValido = camposCompletos && (archivoSeleccionado || idEdicion !== '') && !repetido;

    btnGuardar.disabled = !estatusValido;
}

// Cargar Tabla de Documentos
async function cargarDocumentos() {
    try {
        const response = await fetch('/api/documentos-completo');
        listaDocumentos = await response.json();
        renderTablaDocumentos(listaDocumentos);
    } catch (error) {
        console.error("Error al cargar documentos:", error);
    }
}

// Guardar / Editar
form.addEventListener('submit', async function(e) {
    e.preventDefault();

    // NUEVO: por seguridad, si el botón está deshabilitado no se envía nada
    if (btnGuardar.disabled) return;

    const id = idDocumentoInput.value;
    const formData = new FormData();
    formData.append('cajas_idCajas', cajaSelect.value);
    formData.append('trabajadores_idTrabajadores', trabajadorSelect.value);
    formData.append('tipo_documento_idTipo_documento', tipoDocumentoSelect.value);
    // CAMBIO: ya no se manda el estatus, lo asigna el servidor

    if (fotoInput.files[0]) {
        formData.append('foto', fotoInput.files[0]);
    }

    try {
        const url = id ? `/api/documentos/${id}` : '/api/documentos';
        const method = id ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            body: formData // Al usar FormData, NO se incluye el header 'Content-Type'
        });

        if (response.ok) {
            limpiarFormulario();
            await cargarDocumentos();
        } else {
            const err = await response.json().catch(() => ({}));
            mostrarAlertaSistema(err.error || `El servidor respondió con error ${response.status}. Revisa la terminal de node.`);
        }
    } catch (error) {
        console.error("Error al guardar documento:", error);
        mostrarAlertaSistema("No se pudo conectar con el servidor. Revisa que esté encendido.");
    }
});

// Tabla con el enlace directo al archivo y la columna de estatus
function renderTablaDocumentos(docs) {
    documentosTableBody.innerHTML = '';

    if (docs.length === 0) {
        // CAMBIO: ahora son 7 columnas
        documentosTableBody.innerHTML = `<tr><td colspan="7" class="empty-message">No hay documentos registrados</td></tr>`;
        return;
    }

    docs.forEach(d => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${d.TipoDocumento || 'Documento'}</td>
            <td>${d.Trabajador}</td>
            <td>${d.Estante}</td>
            <td>${d.Caja}</td>
            <td>${d.EstatusNombre || 'N/A'}</td>
            <td style="text-align: center;">
                ${d.Foto ? `<a href="/uploads/${d.Foto}" target="_blank" title="Ver documento" style="text-decoration: none; font-size: 1.2rem;">🖼️</a>` : 'Sin archivo'}
            </td>
            <td style="text-align: center;">
                <div class="action-btns" style="justify-content: center;">
                    <button class="action-icon" onclick="editarDocumento(${d.idDocumento})" title="Editar">✏️</button>
                    <button class="action-icon" onclick="eliminarDocumento(${d.idDocumento})" title="Eliminar">🗑️</button>
                </div>
            </td>
        `;
        documentosTableBody.appendChild(tr);
    });
}

window.editarDocumento = function(id) {
    const doc = listaDocumentos.find(d => d.idDocumento == id);
    if (doc) {
        ocultarAlertaSistema();
        idDocumentoInput.value = doc.idDocumento;
        tipoDocumentoSelect.value = doc.Tipo_documento_idTipo_documento || '';
        trabajadorSelect.value = doc.Trabajadores_idTrabajadores;
        estatusInfo.value = doc.EstatusNombre || ''; // NUEVO: muestra el estatus actual
        estanteSelect.value = doc.Estantes_idEstantes;

        estanteSelect.dispatchEvent(new Event('change'));
        cajaSelect.value = doc.Cajas_idCajas;

        btnGuardar.textContent = 'Actualizar';
        revisarFormulario();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

window.eliminarDocumento = function(id) {
    solicitarConfirmacion("¿Estás seguro de que deseas eliminar este documento?", async () => {
        try {
            const response = await fetch(`/api/documentos/${id}`, { method: 'DELETE' });
            if (response.ok) {
                limpiarFormulario();
                await cargarDocumentos();
            } else {
                // CAMBIO: se muestra el motivo real que manda el servidor
                const err = await response.json().catch(() => ({}));
                mostrarAlertaSistema(err.error || "No se pudo eliminar el documento.");
            }
        } catch (error) {
            console.error("Error al eliminar:", error);
            mostrarAlertaSistema("Error de conexión al eliminar.");
        }
    });
};

function limpiarFormulario() {
    form.reset(); // el estatus regresa a "Disponible" por el value del HTML
    idDocumentoInput.value = '';
    cajaSelect.disabled = true;
    cajaSelect.innerHTML = '<option value="">Seleccione caja...</option>';
    previewArea.innerHTML = `<span style="font-size: 2.5rem; color: #bbb;">📁+</span>`;
    fileNameDisplay.textContent = '';
    btnGuardar.textContent = 'Guardar';
    ocultarAlertaSistema();
    revisarFormulario();
}

btnCancelar.addEventListener('click', limpiarFormulario);
btnLimpiar.addEventListener('click', limpiarFormulario);

inicializarPantalla();