const API = '/api/departamentos';

const inputNombre = document.getElementById('nombre');
const btnGuardar = document.getElementById('btnGuardar');
const tabla = document.getElementById('tablaDepartamentos');
const titulo = document.getElementById('tituloFormulario');
const modal = document.getElementById('modal');
const modalTitulo = document.getElementById('modalTitulo');
const modalTexto = document.getElementById('modalTexto');
const modalAceptar = document.getElementById('modalAceptar');
const modalCancelar = document.getElementById('modalCancelar');

let editandoId = null;

/* ---------- Modal propio ---------- */
function mostrarModal(tituloTxt, texto, { confirmar = false } = {}) {
  return new Promise(resolve => {
    modalTitulo.textContent = tituloTxt;
    modalTexto.textContent = texto;
    modalCancelar.classList.toggle('d-none', !confirmar);
    modal.classList.remove('d-none');
    modalAceptar.focus();
    const cerrar = valor => {
      modal.classList.add('d-none');
      modalAceptar.onclick = modalCancelar.onclick = null;
      resolve(valor);
    };
    modalAceptar.onclick = () => cerrar(true);
    modalCancelar.onclick = () => cerrar(false);
  });
}

/* ---------- Botón Guardar ---------- */
// El botón solo se habilita si el nombre tiene texto (sin contar espacios)
function actualizarBotonGuardar() {
  btnGuardar.disabled = inputNombre.value.trim() === '';
}

/* ---------- Listado ---------- */
const iconoEditar = '✏️';
const iconoEliminar = '🗑️';

async function cargarDepartamentos() {
  try {
    const res = await fetch(API);
    const datos = (await res.json()).map(r => ({ id: r.idDepartamentos, nombre: r.Nombre }));
    tabla.innerHTML = '';
    if (!datos.length) {
      tabla.innerHTML = '<tr><td colspan="2" class="empty-message">Aún no hay departamentos registrados.</td></tr>';
      return;
    }
    datos.forEach(d => {
      const tr = document.createElement('tr');
      const tdNombre = document.createElement('td');
      tdNombre.textContent = d.nombre;               // textContent evita inyección de HTML
      const tdAcc = document.createElement('td');
      tdAcc.innerHTML =
        `<div class="action-btns">` +
        `<button class="action-icon" title="Editar" aria-label="Editar">${iconoEditar}</button>` +
        `<button class="action-icon" title="Eliminar" aria-label="Eliminar">${iconoEliminar}</button>` +
        `</div>`;
      const [btnEd, btnEl] = tdAcc.querySelectorAll('button');
      btnEd.onclick = () => editar(d);
      btnEl.onclick = () => eliminar(d);
      tr.append(tdNombre, tdAcc);
      tabla.appendChild(tr);
    });
  } catch {
    mostrarModal('Sin conexión', 'No se pudo cargar la lista de departamentos. Revisa que el servidor esté encendido.');
  }
}

/* ---------- Formulario ---------- */
function limpiar() {
  inputNombre.value = '';
  actualizarBotonGuardar();   // con el campo vacío, Guardar se deshabilita
  inputNombre.focus();
}
function cancelar() {
  editandoId = null;
  titulo.textContent = 'Filtros de departamentos';
  limpiar();
}
function editar(d) {
  editandoId = d.id;
  titulo.textContent = 'Editar departamento';
  inputNombre.value = d.nombre;
  actualizarBotonGuardar();   // al editar ya hay texto, Guardar se habilita
  inputNombre.focus();
}

async function guardar() {
  // Si el botón está deshabilitado (campo vacío) no se hace nada.
  // También cubre cuando se presiona Enter con el campo vacío.
  if (btnGuardar.disabled) return;

  const nombre = inputNombre.value.trim();
  if (!nombre) return;

  try {
    const res = await fetch(editandoId ? `${API}/${editandoId}` : API, {
      method: editandoId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre })
    });
    // Error del servidor con mensaje (por ejemplo, nombre duplicado)
    if (res.status === 400) {
      const dato = await res.json();
      await mostrarModal('No se pudo guardar', dato.error);
      return;
    }
    if (!res.ok) throw new Error();
    cancelar();
    await cargarDepartamentos();
  } catch {
    mostrarModal('No se pudo guardar', 'Ocurrió un error al guardar. Inténtalo de nuevo.');
  }
}

async function eliminar(d) {
  const ok = await mostrarModal('Eliminar departamento', `¿Eliminar "${d.nombre}"?`, { confirmar: true });
  if (!ok) return;
  try {
    const res = await fetch(`${API}/${d.id}`, { method: 'DELETE' });
    if (res.status === 400) {
      const dato = await res.json();
      await mostrarModal('No se puede eliminar', dato.error);
      return;
    }
    if (!res.ok) throw new Error();
    if (editandoId === d.id) cancelar();
    cargarDepartamentos();
  } catch {
    mostrarModal('No se pudo eliminar', 'Ocurrió un error al eliminar. Inténtalo de nuevo.');
  }
}

/* ---------- Eventos ---------- */
btnGuardar.onclick = guardar;
document.getElementById('btnLimpiar').onclick = limpiar;
document.getElementById('btnCancelar').onclick = cancelar;
inputNombre.addEventListener('input', actualizarBotonGuardar);   // revisa cada vez que se escribe
inputNombre.addEventListener('keydown', e => { if (e.key === 'Enter') guardar(); });

/* ---------- Inicio ---------- */
cargarDepartamentos();
actualizarBotonGuardar();   // Guardar arranca deshabilitado