// agregar-permisos.js
// Agrega <script src="permisos.js"> antes de sidebar.js en todos los .html de la carpeta
// (menos login.html). Se puede correr varias veces: no repite la línea.
// Uso:  node agregar-permisos.js
const fs = require('fs');

const archivos = fs.readdirSync('.').filter(f => f.endsWith('.html') && f.toLowerCase() !== 'login.html');

for (const archivo of archivos) {
    let texto = fs.readFileSync(archivo, 'utf8');

    if (texto.includes('permisos.js')) {
        console.log('Ya tenía permisos.js:', archivo);
        continue;
    }

    // Busca la línea de sidebar.js (con su sangría)
    const linea = texto.match(/^([ \t]*)<script src="sidebar\.js"><\/script>/m);
    if (!linea) {
        console.log('NO tiene sidebar.js, agrégalo a mano:', archivo);
        continue;
    }

    const salto = texto.includes('\r\n') ? '\r\n' : '\n';
    texto = texto.replace(linea[0], `${linea[1]}<script src="permisos.js"></script>${salto}${linea[0]}`);
    fs.writeFileSync(archivo, texto, 'utf8');
    console.log('Listo:', archivo);
}
