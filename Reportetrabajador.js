
const API = 'http://localhost:3000/api';

const vistas = {
    consulta: document.getElementById('vistaConsulta'),
    reporte: document.getElementById('vistaReporte'),
    documentos: document.getElementById('vistaDocumentos')
};

const fechaDesde = document.getElementById('fechaDesde');
const fechaHasta = document.getElementById('fechaHasta');
const filtroEstatus = document.getElementById('filtroEstatus');
const filtroDepartamento = document.getElementById('filtroDepartamento');

let resultados = []; // último resultado de la búsqueda

function mostrarVista(nombre) {
    Object.keys(vistas).forEach(k => vistas[k].classList.toggle('d-none', k !== nombre));
}

function esc(texto) {
    const d = document.createElement('div');
    d.textContent = texto ?? '';
    return d.innerHTML;
}

function formatoFecha(iso) { // 2010-01-01 -> 01/01/2010
    if (!iso) return '';
    const [a, m, d] = iso.split('-');
    return `${d}/${m}/${a}`;
}
/* ---------- Catálogos ---------- */
async function cargarCatalogos() {
    const [estatus, deptos] = await Promise.all([
        fetch(`${API}/estatus`).then(r => r.json()),
        fetch(`${API}/departamentos`).then(r => r.json())
    ]);
    console.log('estatus:', estatus, 'deptos:', deptos);

    filtroEstatus.innerHTML = '<option value="">Todos</option>' +
        estatus.map(e => `<option value="${e.idEstatus}">${esc(e.Estatus)}</option>`).join('');
    filtroDepartamento.innerHTML = '<option value="">Todos</option>' +
        deptos.map(d => `<option value="${d.idDepartamentos}">${esc(d.Departamento ?? d.Nombre)}</option>`).join('');
}

cargarCatalogos();  
/* ---------- Búsqueda ---------- */
async function buscar() {
    const params = new URLSearchParams();
    if (fechaDesde.value) params.append('desde', fechaDesde.value);
    if (fechaHasta.value) params.append('hasta', fechaHasta.value);
    if (filtroEstatus.value) params.append('estatus', filtroEstatus.value);
    if (filtroDepartamento.value) params.append('departamento', filtroDepartamento.value);

    const res = await fetch(`${API}/trabajadores/reporte?${params}`);
    resultados = await res.json();
    pintarListado();
}

function pintarListado() {
    const tbody = document.getElementById('tablaTrabajadores');
    document.getElementById('contador').textContent =
        `${resultados.length} resultado${resultados.length === 1 ? '' : 's'}`;

    if (resultados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-message">Sin resultados</td></tr>';
        return;
    }

    tbody.innerHTML = resultados.map(t => `
        <tr>
            <td>${esc(t.nombre)} ${esc(t.apellidoPaterno)} ${esc(t.apellidoMaterno)}</td>
            <td>${esc(t.numero)}</td>
            <td>${esc(t.departamento)}</td>
            <td>${esc(t.fechaCorta)}</td>
            <td class="col-centro">
                <button class="action-icon" title="Ver documentos" onclick="verDocumentos(${t.id})">📁</button>
            </td>
            <td>${esc(t.estatus)}</td>
        </tr>`).join('');
}

function limpiar() {
    fechaDesde.value = '';
    fechaHasta.value = '';
    filtroEstatus.value = '';
    filtroDepartamento.value = '';
    resultados = [];
    document.getElementById('contador').textContent = '';
    document.getElementById('tablaTrabajadores').innerHTML =
        '<tr><td colspan="6" class="empty-message">Realiza una búsqueda</td></tr>';
}

/* ---------- Reporte imprimible ---------- */
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
    'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function fechaHoraActual() {
    const n = new Date();
    const p = x => String(x).padStart(2, '0');
    return `${n.getDate()} ${MESES[n.getMonth()]} ${n.getFullYear()} ` +
        `${p(n.getHours())}:${p(n.getMinutes())}:${p(n.getSeconds())}`;
}

async function generarReporte() {
    await buscar(); // asegura que el reporte coincida con los filtros actuales

    const estatusTxt = filtroEstatus.value
        ? filtroEstatus.options[filtroEstatus.selectedIndex].text.toLowerCase() + 's'
        : '';

    let descripcion = `Reporte de trabajadores ${estatusTxt}`.trim();
    if (fechaDesde.value && fechaHasta.value) {
        descripcion += ` con fecha de ingreso del ${formatoFecha(fechaDesde.value)} al ${formatoFecha(fechaHasta.value)}.`;
    } else if (fechaDesde.value) {
        descripcion += ` con fecha de ingreso desde el ${formatoFecha(fechaDesde.value)}.`;
    } else if (fechaHasta.value) {
        descripcion += ` con fecha de ingreso hasta el ${formatoFecha(fechaHasta.value)}.`;
    } else {
        descripcion += '.';
    }

    document.getElementById('reporteFecha').textContent = `Fecha: ${fechaHoraActual()}`;
    document.getElementById('reporteDescripcion').textContent = descripcion;
    document.getElementById('reporteTotal').textContent = resultados.length;

    document.getElementById('tablaReporte').innerHTML = resultados.map(t => `
        <tr>
            <td>${esc(t.nombre)}</td>
            <td>${esc(t.apellidoPaterno)}</td>
            <td>${esc(t.apellidoMaterno)}</td>
            <td>${esc(t.numero)}</td>
            <td>${esc(t.departamento)}</td>
            <td>${esc(t.fechaLarga)}</td>
        </tr>`).join('');

    mostrarVista('reporte');
}

/* ---------- Documentos del trabajador ---------- */
async function verDocumentos(id) {
    try {
        const res = await fetch(`${API}/trabajadores/${id}/documentos`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Error ${res.status}`);

        const t = data.trabajador;
        document.getElementById('docNombre').value = `${t.nombre} ${t.apellidoPaterno} ${t.apellidoMaterno}`.trim();
        document.getElementById('docNumero').value = t.numero;
        document.getElementById('docDepartamento').value = t.departamento;
        document.getElementById('docEstatus').value = t.estatus;

        const tbody = document.getElementById('tablaDocumentos');
        if (data.documentos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-message">Sin documentos</td></tr>';
        } else {
            tbody.innerHTML = data.documentos.map(d => `
                <tr>
                    <td>${esc(d.tipo)}</td>
                    <td>${esc(d.estatus)}</td>
                    <td>${esc(d.ubicacion)}</td>
                    <td class="col-centro">
                        <button class="action-icon" title="Ver documento"
                                onclick="verArchivo('${encodeURIComponent(d.foto || '')}')">👁</button>
                    </td>
                </tr>`).join('');
        }
        mostrarVista('documentos');
    } catch (err) {
        console.error('verDocumentos:', err);
        alert('No se pudieron cargar los documentos: ' + err.message);
    }
}

function verArchivo(nombre) {
    if (!nombre) { alert('Este documento no tiene archivo adjunto.'); return; }
    window.open(`http://localhost:3000/uploads/${nombre}`, '_blank');
}

/* ---------- Eventos ---------- */
document.getElementById('btnBuscar').addEventListener('click', buscar);
document.getElementById('btnLimpiar').addEventListener('click', limpiar);
document.getElementById('btnGenerarReporte').addEventListener('click', generarReporte);
document.getElementById('btnDescargarPDF').addEventListener('click', () => {
    const hoja = document.querySelector('.reporte-hoja');

    const opciones = {
        margin: 10,
        filename: 'reporte-trabajadores.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().set(opciones).from(hoja).save();
});

document.getElementById('btnVolverReporte').addEventListener('click', () => mostrarVista('consulta'));
document.getElementById('btnVolverDocs').addEventListener('click', () => mostrarVista('consulta'));

cargarCatalogos();