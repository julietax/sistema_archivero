// Misma dirección del sitio (funciona en Azure y en local)
// Si el backend está en otro servicio: 'https://TU-BACKEND.azurewebsites.net/api'
const API = '/api';

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

// Evita que se inyecte HTML en la tabla
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

/* ---------- Validación de fechas ---------- */

// Fecha de hoy en formato YYYY-MM-DD usando la hora local
// (toISOString usa UTC y en la noche podría dar el día siguiente)
function hoyISO() {
    const n = new Date();
    const p = x => String(x).padStart(2, '0');
    return `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())}`;
}

// Ajusta los límites de los calendarios
function actualizarLimites() {
    const hoy = hoyISO();
    // "Hasta" no puede ser antes que "Desde" ni después de hoy
    fechaHasta.max = hoy;
    fechaHasta.min = fechaDesde.value || '';
    // "Desde" no puede ser después de "Hasta" ni después de hoy
    fechaDesde.max = (fechaHasta.value && fechaHasta.value < hoy) ? fechaHasta.value : hoy;
}

// Revisa que las fechas sean correctas (también cuando se escriben a mano)
function validarFechas() {
    const hoy = hoyISO();

    if (fechaDesde.value > hoy || fechaHasta.value > hoy) {
        alert('No se pueden seleccionar fechas futuras en el periodo de ingreso.');
        return false;
    }
    if (fechaDesde.value && fechaHasta.value && fechaDesde.value > fechaHasta.value) {
        alert('La fecha inicial no puede ser mayor que la fecha final.');
        return false;
    }
    return true;
}

// Si el usuario escribe una fecha futura, se borra ese campo
function revisarCampoFecha(input) {
    if (input.value > hoyISO()) {
        alert('No se pueden seleccionar fechas futuras en el periodo de ingreso.');
        input.value = '';
    }
    actualizarLimites();
}

/* ---------- Catálogos ---------- */
async function cargarCatalogos() {
    try {
        const [resEstatus, resDeptos] = await Promise.all([
            fetch(`${API}/estatus`),
            fetch(`${API}/departamentos`)
        ]);

        if (!resEstatus.ok || !resDeptos.ok) {
            throw new Error('Error al consultar los catálogos');
        }

        const estatus = await resEstatus.json();
        const deptos = await resDeptos.json();
        console.log('estatus:', estatus, 'deptos:', deptos);

        filtroEstatus.innerHTML = '<option value="">Todos</option>' +
            estatus.map(e => `<option value="${e.idEstatus}">${esc(e.Estatus)}</option>`).join('');
        filtroDepartamento.innerHTML = '<option value="">Todos</option>' +
            deptos.map(d => `<option value="${d.idDepartamentos}">${esc(d.Departamento ?? d.Nombre)}</option>`).join('');
    } catch (err) {
        console.error('cargarCatalogos:', err);
        // Para que al menos aparezca "Todos" aunque falle
        filtroEstatus.innerHTML = '<option value="">Todos</option>';
        filtroDepartamento.innerHTML = '<option value="">Todos</option>';
    }
}

/* ---------- Búsqueda ---------- */
// Regresa true si la búsqueda salió bien, false si no
async function buscar() {
    if (!validarFechas()) return false;

    const params = new URLSearchParams();
    if (fechaDesde.value) params.append('desde', fechaDesde.value);
    if (fechaHasta.value) params.append('hasta', fechaHasta.value);
    if (filtroEstatus.value) params.append('estatus', filtroEstatus.value);
    if (filtroDepartamento.value) params.append('departamento', filtroDepartamento.value);

    try {
        const res = await fetch(`${API}/trabajadores/reporte?${params}`);
        if (!res.ok) throw new Error(`Error ${res.status}`);
        resultados = await res.json();
        pintarListado();
        return true;
    } catch (err) {
        console.error('buscar:', err);
        alert('No se pudo realizar la búsqueda: ' + err.message);
        return false;
    }
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
    actualizarLimites(); // se reinician los límites de los calendarios
    document.getElementById('contador').textContent = '';
    document.getElementById('tablaTrabajadores').innerHTML =
        '<tr><td colspan="6" class="empty-message">Realiza una búsqueda</td></tr>';
}

/* ---------- Reporte imprimible ---------- */
const PLURAL_ESTATUS = {
    'activo': 'activos',
    'incapacidad': 'incapacitados',
    'baja': 'dados de baja',
    'licencia': 'con licencia',
    'jubilado': 'jubilados'
};

// Columnas del reporte (las mismas para la hoja en pantalla y para el PDF)
const COLUMNAS_REPORTE = [
    { titulo: 'Nombre' },
    { titulo: 'Apellido Paterno' },
    { titulo: 'Apellido Materno' },
    { titulo: 'Num. de Trabajador', centro: true },
    { titulo: 'Departamento' },
    { titulo: 'Fecha ingreso', centro: true }
];

// Arma el texto que describe los filtros aplicados
function descripcionReporte() {
    let estatusTxt = '';
    if (filtroEstatus.value) {
        const nombre = filtroEstatus.options[filtroEstatus.selectedIndex].text.trim().toLowerCase();
        estatusTxt = PLURAL_ESTATUS[nombre] || `con estatus ${nombre}`;
    }

    let deptoTxt = '';
    if (filtroDepartamento.value) {
        deptoTxt = `del departamento ${filtroDepartamento.options[filtroDepartamento.selectedIndex].text.trim()}`;
    }

    let fechasTxt = '';
    if (fechaDesde.value && fechaHasta.value) {
        fechasTxt = `con fecha de ingreso del ${formatoFecha(fechaDesde.value)} al ${formatoFecha(fechaHasta.value)}`;
    } else if (fechaDesde.value) {
        fechasTxt = `con fecha de ingreso desde el ${formatoFecha(fechaDesde.value)}`;
    } else if (fechaHasta.value) {
        fechasTxt = `con fecha de ingreso hasta el ${formatoFecha(fechaHasta.value)}`;
    }

    // Sin ningún filtro
    if (!estatusTxt && !deptoTxt && !fechasTxt) {
        return 'Reporte de todos los trabajadores.';
    }

    return ['Reporte de trabajadores', estatusTxt, deptoTxt, fechasTxt]
        .filter(parte => parte !== '')
        .join(' ') + '.';
}

// Filas del reporte (sirven para la tabla en pantalla y para el PDF)
function filasReporte() {
    return resultados.map(t => [
        t.nombre, t.apellidoPaterno, t.apellidoMaterno,
        t.numero, t.departamento, t.fechaLarga
    ]);
}

async function generarReporte() {
    // Si las fechas están mal o la búsqueda falla, no se genera el reporte
    const ok = await buscar();
    if (!ok) return;

    document.getElementById('reporteFecha').textContent = `Fecha: ${fechaHoraReporte()}`;
    document.getElementById('reporteDescripcion').textContent = descripcionReporte();
    document.getElementById('reporteTotal').textContent = resultados.length;

    if (resultados.length === 0) {
        document.getElementById('tablaReporte').innerHTML =
            `<tr><td colspan="${COLUMNAS_REPORTE.length}" class="empty-message">Sin resultados</td></tr>`;
    } else {
        document.getElementById('tablaReporte').innerHTML = filasReporte().map(fila => `
            <tr>${fila.map((dato, i) =>
                `<td${COLUMNAS_REPORTE[i].centro ? ' class="col-centro"' : ''}>${esc(dato)}</td>`
            ).join('')}</tr>`).join('');
    }

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
    window.open(`/uploads/${nombre}`, '_blank');
}

/* ---------- Eventos ---------- */
document.getElementById('btnBuscar').addEventListener('click', buscar);
document.getElementById('btnLimpiar').addEventListener('click', limpiar);
document.getElementById('btnGenerarReporte').addEventListener('click', generarReporte);

// Validación de fechas al cambiar los calendarios
fechaDesde.addEventListener('change', () => revisarCampoFecha(fechaDesde));
fechaHasta.addEventListener('change', () => revisarCampoFecha(fechaHasta));

// El PDF usa el mismo generador que el reporte de documentos (reportes.js)
document.getElementById('btnDescargarPDF').addEventListener('click', () => {
    generarPDFReporte({
        descripcion: document.getElementById('reporteDescripcion').textContent,
        columnas: COLUMNAS_REPORTE,
        filas: filasReporte(),
        archivo: 'reporte_trabajadores.pdf'
    });
});

document.getElementById('btnVolverReporte').addEventListener('click', () => mostrarVista('consulta'));
document.getElementById('btnVolverDocs').addEventListener('click', () => mostrarVista('consulta'));

/* ---------- Inicio ---------- */
actualizarLimites();  // pone el máximo (hoy) en los calendarios
cargarCatalogos();    // una sola llamada