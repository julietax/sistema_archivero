// reportes.js
// Generador de PDF compartido: todos los reportes usan el mismo diseño.
// Requiere jsPDF y jsPDF-AutoTable cargados antes de este archivo.

const MESES_REPORTE = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
    'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// Color azul del sistema (el mismo de los botones)
const COLOR_AZUL = [74, 144, 226];

// Fecha y hora para el encabezado: "11 de noviembre de 2026 a las 18:51:29"
function fechaHoraReporte() {
    const n = new Date();
    const p = x => String(x).padStart(2, '0');
    return `${n.getDate()} de ${MESES_REPORTE[n.getMonth()]} de ${n.getFullYear()} ` +
        `a las ${p(n.getHours())}:${p(n.getMinutes())}:${p(n.getSeconds())}`;
}

// Carga el logo y lo pasa a PNG (jsPDF no lee bien todos los formatos, como webp).
// Si no se puede cargar, regresa null y el reporte sale sin logo.
function cargarLogoReporte(src) {
    return new Promise(resolve => {
        if (!src) return resolve(null);
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            canvas.getContext('2d').drawImage(img, 0, 0);
            resolve({ data: canvas.toDataURL('image/png'), ancho: img.naturalWidth, alto: img.naturalHeight });
        };
        img.onerror = () => resolve(null);
        img.src = src;
    });
}

// opciones:
//   descripcion : texto que describe los filtros aplicados
//   columnas    : [{ titulo: 'Nombre', centro: false }, ...]
//   filas       : [[ 'dato1', 'dato2', ... ], ...]
//   archivo     : nombre del PDF, ej. 'reporte_trabajadores.pdf'
//   logoSrc     : ruta del logo (por defecto 'logo.png')
async function generarPDFReporte({ descripcion, columnas, filas, archivo, logoSrc = 'logo.png' }) {
    if (!window.jspdf) {
        alert('No se pudo cargar jsPDF. Revisa tu conexión a internet e inténtalo de nuevo.');
        return;
    }
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });

    if (typeof pdf.autoTable !== 'function') {
        alert('No se pudo cargar la herramienta de tablas del PDF. Revisa tu conexión a internet.');
        return;
    }

    const ancho = pdf.internal.pageSize.getWidth();
    const alto = pdf.internal.pageSize.getHeight();
    const margen = 15;

    /* ----- Encabezado ----- */
    const logo = await cargarLogoReporte(logoSrc);
    let xTexto = margen;
    if (logo) {
        const altoLogo = 22;
        const anchoLogo = altoLogo * logo.ancho / logo.alto;
        pdf.addImage(logo.data, 'PNG', margen, 12, anchoLogo, altoLogo);
        xTexto = margen + anchoLogo + 6;
    }

    pdf.setTextColor(30, 30, 30);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(15);
    pdf.text('ARCHIVO DE CONCENTRACIÓN', xTexto, 21);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(90, 90, 90);
    pdf.text('Instituto Tecnológico de Saltillo', xTexto, 27.5);

    pdf.setFontSize(8.5);
    pdf.setTextColor(70, 70, 70);
    pdf.text('Fecha: ' + fechaHoraReporte(), ancho - margen, 38, { align: 'right' });

    // Línea azul bajo el encabezado
    pdf.setDrawColor(...COLOR_AZUL);
    pdf.setLineWidth(0.6);
    pdf.line(margen, 41, ancho - margen, 41);

    /* ----- Descripción y total ----- */
    pdf.setTextColor(30, 30, 30);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11.5);
    const lineas = pdf.splitTextToSize(descripcion, ancho - margen * 2);
    pdf.text(lineas, margen, 52);

    const yTotal = 52 + lineas.length * 5.2 + 3;
    pdf.setFontSize(9.5);
    pdf.text('Total de resultados: ' + filas.length, margen, yTotal);

    /* ----- Tabla ----- */
    const cuerpo = filas.length
        ? filas
        : [[{ content: 'Sin resultados', colSpan: columnas.length, styles: { halign: 'center', fontStyle: 'italic' } }]];

    const estilosColumna = {};
    columnas.forEach((c, i) => {
        estilosColumna[i] = { halign: c.centro ? 'center' : 'left' };
    });

    pdf.autoTable({
        startY: yTotal + 6,
        margin: { left: margen, right: margen, top: margen, bottom: 18 },
        head: [columnas.map(c => c.titulo)],
        body: cuerpo,
        theme: 'grid',
        styles: {
            font: 'helvetica',
            fontSize: 8.5,
            textColor: [30, 30, 30],
            cellPadding: 3,
            overflow: 'linebreak',
            lineWidth: 0.1,
            lineColor: [215, 215, 215],
            valign: 'middle'
        },
        headStyles: {
            fillColor: COLOR_AZUL,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'center'
        },
        alternateRowStyles: { fillColor: [247, 248, 250] },
        columnStyles: estilosColumna
    });

    /* ----- Pie de página: "Página 1 de 2" ----- */
    const totalPaginas = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= totalPaginas; i++) {
        pdf.setPage(i);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(120, 120, 120);
        pdf.text(`Página ${i} de ${totalPaginas}`, ancho / 2, alto - 8, { align: 'center' });
    }

    pdf.save(archivo);
}