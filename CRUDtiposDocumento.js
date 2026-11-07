const formulario = document.getElementById('tipoDocumentoForm');
const tabla = document.getElementById('tiposDocumentoTableBody');
const idInput = document.getElementById('idTipoDocumento');
const nombreInput = document.getElementById('nombre');
const descripcionInput = document.getElementById('descripcion');
const btnGuardar = document.getElementById('btnGuardar');

let tipos = [];

// Función para validar si los campos obligatorios están llenos y habilitar/deshabilitar el botón
function validarFormularioTipos() {
    const nombreLleno = nombreInput.value.trim() !== '';
    const descripcionLlena = descripcionInput.value.trim() !== '';

    // Se habilita solo si ambos campos tienen texto
    btnGuardar.disabled = !(nombreLleno && descripcionLlena);
}

// Escuchar cambios en los inputs en tiempo real
nombreInput.addEventListener('input', validarFormularioTipos);
descripcionInput.addEventListener('input', validarFormularioTipos);

async function cargarTipos() {
    try {
        const respuesta = await fetch('/api/tipos-documento');
        if (!respuesta.ok) throw new Error('Error del servidor');

        tipos = await respuesta.json();
        mostrarTipos();
    } catch (error) {
        // La tabla permanece vacía si no hay conexión.
    }
}

function mostrarTipos() {
    tabla.innerHTML = '';

    if (tipos.length === 0) {
        tabla.innerHTML = '<tr><td colspan="3">No hay tipos de documentos registrados</td></tr>';
        return;
    }

    tipos.forEach(tipo => {
        const fila = document.createElement('tr');

        const nombre = document.createElement('td');
        nombre.textContent = tipo.Nombre;

        const descripcion = document.createElement('td');
        descripcion.textContent = tipo.Descripcion;

        const acciones = document.createElement('td');
        acciones.style.textAlign = 'center';

        const editar = document.createElement('button');
        editar.textContent = '✏️';
        editar.title = 'Editar';
        editar.className = 'action-icon';
        editar.onclick = () => editarTipo(tipo.idTipo_documento);

        const eliminar = document.createElement('button');
        eliminar.textContent = '🗑️';
        eliminar.title = 'Eliminar';
        eliminar.className = 'action-icon';
        eliminar.onclick = () => eliminarTipo(tipo.idTipo_documento);

        acciones.append(editar, eliminar);
        fila.append(nombre, descripcion, acciones);
        tabla.appendChild(fila);
    });
}

function editarTipo(id) {
    const tipo = tipos.find(t => t.idTipo_documento === id);
    if (!tipo) return;

    ocultarAlertaSistema();
    idInput.value = tipo.idTipo_documento;
    nombreInput.value = tipo.Nombre;
    descripcionInput.value = tipo.Descripcion;
    btnGuardar.textContent = 'Actualizar';
    
    validarFormularioTipos(); // Evalúa que el botón se active al editar
    nombreInput.focus();
}

function limpiarFormulario() {
    formulario.reset();
    idInput.value = '';
    btnGuardar.textContent = 'Guardar';
    ocultarAlertaSistema();
    validarFormularioTipos(); // Vuelve a deshabilitar el botón al limpiar
}

formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();

    if (btnGuardar.disabled) return;

    const id = idInput.value;
    const datos = {
        nombre: nombreInput.value.trim(),
        descripcion: descripcionInput.value.trim()
    };

    if (datos.nombre.length > 30 || datos.descripcion.length > 30) {
        mostrarAlertaSistema('El nombre y la descripción no pueden superar los 30 caracteres.');
        return;
    }

    try {
        const respuesta = await fetch(
            id ? `/api/tipos-documento/${id}` : '/api/tipos-documento',
            {
                method: id ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datos)
            }
        );

        if (!respuesta.ok) {
            const error = await respuesta.json().catch(() => ({}));
            mostrarAlertaSistema(error.error || 'Error al guardar el tipo de documento.');
            return;
        }

        limpiarFormulario();
        await cargarTipos();
    } catch (error) {
        console.error('Error al guardar tipo de documento:', error);
        mostrarAlertaSistema('No se pudo conectar con el servidor.');
    }
});

async function eliminarTipo(id) {
    const acepto = await confirmarAccion('¿Seguro que deseas eliminar este tipo de documento?');
    if (!acepto) return;

    try {
        const respuesta = await fetch(`/api/tipos-documento/${id}`, {
            method: 'DELETE'
        });

        if (!respuesta.ok) {
            mostrarAlertaSistema('No se pudo eliminar el tipo de documento (puede estar vinculado a otros registros).');
            return;
        }

        ocultarAlertaSistema();
        await cargarTipos();
    } catch (error) {
        console.error('Error al eliminar tipo de documento:', error);
        mostrarAlertaSistema('No se pudo conectar con el servidor.');
    }
}

document.getElementById('btnCancelar').onclick = limpiarFormulario;
document.getElementById('btnLimpiar').onclick = limpiarFormulario;

// Validación inicial al cargar la página
validarFormularioTipos();
cargarTipos();