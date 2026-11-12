const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 1. Inicializar Express y middlewares
const app = express();
app.use(cors());
app.use(bodyParser.json());

// SEGURIDAD: evita que se descargue el código del servidor desde el navegador
app.use((req, res, next) => {
    if (/^\/(CRUDroles\.js|server\.js|package(-lock)?\.json|\.env|\.git|node_modules)/i.test(req.path)) {
        return res.status(404).end();
    }
    next();
});

// 2. Ruta raíz obligatoria para forzar el login
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

// 3. Archivos estáticos del proyecto (con index: false para que no cargue index.html por defecto)
app.use(express.static('.', { index: false }));
// ---- Archivos de documentos (PDF o fotos) ----
const carpetaUploads = path.join(__dirname, 'uploads');
if (!fs.existsSync(carpetaUploads)) fs.mkdirSync(carpetaUploads);

// Los archivos se abren desde /uploads/nombre-del-archivo
app.use('/uploads', express.static(carpetaUploads));

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, carpetaUploads),
    filename: (req, file, cb) => {
        const extension = path.extname(file.originalname).toLowerCase();
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + extension);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // máximo 10 MB
    fileFilter: (req, file, cb) => {
        const esValido = file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/');
        if (!esValido) return cb(new Error('Solo se permiten imágenes o archivos PDF.'));
        cb(null, true);
    }
});

function subirArchivo(req, res, next) {
    upload.single('foto')(req, res, (err) => {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'El archivo es demasiado grande (máximo 10 MB).' });
            }
            return res.status(400).json({ error: err.message });
        }
        next();
    });
}

// 2. Conexión a la Base de Datos en Railway (Producción / Azure)
if (!process.env.MYSQLPASSWORD) {
    console.error('FALTA la variable de entorno MYSQLPASSWORD: el servidor no podrá conectarse a la base de datos.');
}
const db = mysql.createConnection({
    host: process.env.MYSQLHOST || 'turntable.proxy.rlwy.net',
    user: process.env.MYSQLUSER || 'root',        
    password: process.env.MYSQLPASSWORD,   // se define en Azure > Variables de entorno
    database: process.env.MYSQLDATABASE || 'railway',
    port: process.env.MYSQLPORT || 21654
});

db.connect((err) => {
    if (err) {
        console.error('Error al conectar a la base de datos MySQL en Railway:', err);
        return;
    }
    console.log('Conectado exitosamente a la base de datos MySQL en Railway.');
});

// ==========================================
// ESTATUS DE DOCUMENTOS Y REGLAS
// ==========================================
const ESTATUS_DISPONIBLE = 'Disponible';
const ESTATUS_PRESTADO = 'Prestado';
const ESTATUS_ACTIVO = 'Activo';
const ESTATUS_INACTIVO = 'Inactivo';

function obtenerIdEstatus(nombre, callback) {
    db.query('SELECT idEstatus FROM estatus WHERE Estatus = ? LIMIT 1', [nombre], (err, filas) => {
        if (err) return callback(err);
        if (filas.length === 0) {
            return callback(new Error(`No existe el estatus "${nombre}" en la tabla estatus.`));
        }
        callback(null, filas[0].idEstatus);
    });
}

function borrarArchivoSubido(req) {
    if (req.file) fs.unlink(req.file.path, () => {});
}

/* ================= ROUTES DE ROLES ================= */
app.get('/api/roles', (req, res) => {
    db.query('SELECT idRoles, Nombre, Descripcion FROM roles', (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});

app.post('/api/roles', (req, res) => {
    const { nombre, descripcion } = req.body;
    const checkQuery = 'SELECT * FROM roles WHERE Nombre = ?';
    db.query(checkQuery, [nombre], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length > 0) return res.status(400).json({ error: 'Ya existe un rol registrado con este nombre.' });

        const insertQuery = 'INSERT INTO roles (Nombre, Descripcion) VALUES (?, ?)';
        db.query(insertQuery, [nombre, descripcion], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ message: 'Rol creado con éxito', id: result.insertId });
        });
    });
});

app.put('/api/roles/:id', (req, res) => {
    const id = req.params.id;
    const { nombre, descripcion } = req.body;
    const query = 'UPDATE roles SET Nombre = ?, Descripcion = ? WHERE idRoles = ?';
    db.query(query, [nombre, descripcion, id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Rol actualizado con éxito' });
    });
});

app.delete('/api/roles/:id', (req, res) => {
    const id = req.params.id;
    const query = 'DELETE FROM roles WHERE idRoles = ?';
    db.query(query, [id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Rol eliminado con éxito' });
    });
});


/* ================= ROUTES DE ESTATUS ================= */
app.get('/api/estatus-crud', (req, res) => {
    db.query('SELECT idEstatus, Estatus FROM estatus', (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});

app.post('/api/estatus-crud', (req, res) => {
    const { nombre } = req.body;
    const checkQuery = 'SELECT idEstatus FROM estatus WHERE Estatus = ?';
    db.query(checkQuery, [nombre], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length > 0) {
            return res.status(400).json({ error: 'Ya existe un estatus registrado con este nombre.' });
        }

        db.query('INSERT INTO estatus (Estatus) VALUES (?)', [nombre], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ message: 'Estatus creado con éxito', id: result.insertId });
        });
    });
});

app.put('/api/estatus-crud/:id', (req, res) => {
    const id = req.params.id;
    const { nombre } = req.body;
    const checkQuery = 'SELECT idEstatus FROM estatus WHERE Estatus = ? AND idEstatus <> ?';
    db.query(checkQuery, [nombre, id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length > 0) {
            return res.status(400).json({ error: 'Ya existe otro estatus registrado con este nombre.' });
        }

        db.query('UPDATE estatus SET Estatus = ? WHERE idEstatus = ?', [nombre, id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Estatus actualizado con éxito' });
        });
    });
});

app.delete('/api/estatus-crud/:id', (req, res) => {
    const id = req.params.id;
    db.query('DELETE FROM estatus WHERE idEstatus = ?', [id], (err) => {
        if (err) {
            return res.status(400).json({ error: 'No se puede eliminar el estatus: está vinculado a otros registros del sistema.' });
        }
        res.json({ message: 'Estatus eliminado con éxito' });
    });
});


/* ================= ROUTES DE USUARIOS Y LOGIN ================= */
app.get('/api/usuarios', (req, res) => {
    db.query(`
        SELECT u.idUsuarios, u.Nombre, u.Apellido_paterno 
        FROM usuarios u
        JOIN estatus e ON u.Estatus_idEstatus = e.idEstatus
        WHERE e.Estatus = 'Activo'
    `, (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});

app.get('/api/usuarios-select', (req, res) => {
    const query = `
        SELECT u.idUsuarios, 
               TRIM(CONCAT(u.Nombre, ' ', u.Apellido_paterno, ' ', IFNULL(u.Apellido_materno, ''))) AS NombreCompleto 
        FROM usuarios u
        JOIN estatus e ON u.Estatus_idEstatus = e.idEstatus
        WHERE e.Estatus = 'Activo'
    `;
    db.query(query, (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});

app.get('/api/usuarios-completo', (req, res) => {
    const query = `
        SELECT u.idUsuarios, u.Roles_idRoles, u.Estatus_idEstatus, u.Nombre, u.Apellido_paterno, u.Apellido_materno, u.Correo_electronico, u.Contrasena, r.Nombre AS NombreRol, es.Estatus AS EstatusNombre
        FROM usuarios u
        JOIN roles r ON u.Roles_idRoles = r.idRoles
        JOIN estatus es ON u.Estatus_idEstatus = es.idEstatus
        WHERE es.Estatus = 'Activo'
    `;
    db.query(query, (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});

app.post('/api/usuarios', (req, res) => {
    const { roles_idRoles, nombre, apellido_paterno, apellido_materno, correo_electronico, contrasena } = req.body;

    // Buscamos el correo y vemos en qué estatus está
    const checkQuery = `
        SELECT u.idUsuarios, e.Estatus
        FROM usuarios u
        LEFT JOIN estatus e ON u.Estatus_idEstatus = e.idEstatus
        WHERE u.Correo_electronico = ?
    `;
    db.query(checkQuery, [correo_electronico], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });

        if (results.length > 0) {
            if (results[0].Estatus === ESTATUS_INACTIVO) {
                return res.status(400).json({ error: 'Este correo pertenece a un usuario dado de baja (inactivo). Pide que lo reactiven.' });
            }
            return res.status(400).json({ error: 'Ya existe un usuario registrado con este correo electrónico.' });
        }

        // El usuario nuevo siempre se crea como Activo
        obtenerIdEstatus(ESTATUS_ACTIVO, (err, idActivo) => {
            if (err) return res.status(500).json({ error: err.message });

            const insertQuery = 'INSERT INTO usuarios (Roles_idRoles, Estatus_idEstatus, Nombre, Apellido_paterno, Apellido_materno, Correo_electronico, Contrasena) VALUES (?, ?, ?, ?, ?, ?, ?)';
            db.query(insertQuery, [roles_idRoles, idActivo, nombre, apellido_paterno, apellido_materno || null, correo_electronico, contrasena], (err, result) => {
                if (err) return res.status(500).json({ error: err.message });
                res.status(201).json({ message: 'Usuario creado con éxito', id: result.insertId });
            });
        });
    });
});

app.put('/api/usuarios/:id', (req, res) => {
    const id = req.params.id;
    const { roles_idRoles, nombre, apellido_paterno, apellido_materno, correo_electronico, contrasena } = req.body;

    const checkQuery = 'SELECT idUsuarios FROM usuarios WHERE Correo_electronico = ? AND idUsuarios <> ?';
    db.query(checkQuery, [correo_electronico, id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length > 0) {
            return res.status(400).json({ error: 'El correo electrónico ya está en uso por otro usuario.' });
        }

        // Aquí NO se toca el estatus, solo los datos del usuario
        const query = 'UPDATE usuarios SET Roles_idRoles = ?, Nombre = ?, Apellido_paterno = ?, Apellido_materno = ?, Correo_electronico = ?, Contrasena = ? WHERE idUsuarios = ?';
        db.query(query, [roles_idRoles, nombre, apellido_paterno, apellido_materno || null, correo_electronico, contrasena, id], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            if (result.affectedRows === 0) return res.status(404).json({ error: 'El usuario ya no existe.' });
            res.json({ message: 'Usuario actualizado con éxito' });
        });
    });
});

app.delete('/api/usuarios/:id', (req, res) => {
    const id = req.params.id;

    // Baja lógica: el usuario no se borra, solo pasa a Inactivo
    obtenerIdEstatus(ESTATUS_INACTIVO, (err, idInactivo) => {
        if (err) return res.status(500).json({ error: err.message });

        const query = 'UPDATE usuarios SET Estatus_idEstatus = ? WHERE idUsuarios = ?';
        db.query(query, [idInactivo, id], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            if (result.affectedRows === 0) return res.status(404).json({ error: 'El usuario ya no existe.' });
            res.json({ message: 'Usuario dado de baja del sistema (queda inactivo en la base de datos).' });
        });
    });
});

// Endpoint para validar el inicio de sesión
// Solo entran los usuarios dados de alta (estatus Activo)
app.post('/api/login', (req, res) => {
    const correo = (req.body.correo || '').trim();
    const contrasena = req.body.contrasena || '';

    if (!correo || !contrasena) {
        return res.status(400).json({ error: "Escribe tu correo y tu contraseña." });
    }

    // BINARY hace que la contraseña distinga mayúsculas y minúsculas
    const sql = `
        SELECT u.idUsuarios, u.Nombre, u.Apellido_paterno, u.Correo_electronico AS Correo, r.Nombre AS NombreRol
        FROM usuarios u
        INNER JOIN roles r ON u.Roles_idRoles = r.idRoles
        INNER JOIN estatus es ON u.Estatus_idEstatus = es.idEstatus
        WHERE u.Correo_electronico = ? AND BINARY u.Contrasena = ? AND es.Estatus = ?
    `;

    db.query(sql, [correo, contrasena, ESTATUS_ACTIVO], (err, results) => {
        if (err) {
            console.error("Error en consulta de login:", err);
            return res.status(500).json({ error: "Error en el servidor al verificar credenciales." });
        }

        if (results.length === 0) {
            return res.status(401).json({ error: "Correo o contraseña incorrectos, o el usuario está dado de baja." });
        }

        // Devuelve los datos del usuario y su rol
        res.json({
            mensaje: "Inicio de sesión exitoso",
            usuario: results[0]
        });
    });
});

/* ================= ROUTES DE PRÉSTAMOS Y EXPEDIENTES ================= */
app.get('/api/trabajadores-expedientes', (req, res) => {
    const query = `
        SELECT t.idTrabajadores, t.No_trabajador, 
               TRIM(CONCAT(t.Nombre, ' ', t.Apellido_paterno, ' ', IFNULL(t.Apellido_materno, ''))) AS NombreTrabajador,
               MIN(d.idDocumento) AS idDocumento,
               GROUP_CONCAT(DISTINCT est.Estante ORDER BY est.Estante SEPARATOR ', ') AS Estante,
               GROUP_CONCAT(DISTINCT c.Caja ORDER BY c.Caja SEPARATOR ', ') AS Caja,
               GROUP_CONCAT(DISTINCT c.Descripcion ORDER BY c.Descripcion SEPARATOR ', ') AS DescripcionCaja
        FROM trabajadores t
        JOIN documento d ON d.Trabajadores_idTrabajadores = t.idTrabajadores
        JOIN cajas c ON d.Cajas_idCajas = c.idCajas
        JOIN estantes est ON c.Estantes_idEstantes = est.idEstantes
        GROUP BY t.idTrabajadores, t.No_trabajador, t.Nombre, t.Apellido_paterno, t.Apellido_materno
    `;
    db.query(query, (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});

app.get('/api/prestamos', (req, res) => {
    const query = `
        SELECT p.idPrestamo, p.Fecha_prestamo, p.Fecha_entrega, 
               t.No_trabajador AS Expediente,
               TRIM(CONCAT(t.Nombre, ' ', t.Apellido_paterno, ' ', IFNULL(t.Apellido_materno, ''))) AS Trabajador,
               TRIM(CONCAT(u.Nombre, ' ', u.Apellido_paterno, ' ', IFNULL(u.Apellido_materno, ''))) AS Solicitante
        FROM prestamo p
        JOIN usuarios u ON p.Usuarios_idUsuarios = u.idUsuarios
        JOIN documento d ON p.Documento_idDocumento = d.idDocumento
        JOIN trabajadores t ON d.Trabajadores_idTrabajadores = t.idTrabajadores
    `;
    db.query(query, (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});

app.post('/api/prestamos', (req, res) => {
    const { usuario_id, documento_id, fecha_prestamo, fecha_entrega } = req.body;

    const getDocQuery = 'SELECT Trabajadores_idTrabajadores, Tipo_documento_idTipo_documento FROM documento WHERE idDocumento = ?';
    db.query(getDocQuery, [documento_id], (err, docs) => {
        if (err) return res.status(500).json({ error: err.message });
        if (docs.length === 0) {
            return res.status(400).json({ error: 'No se encontró el trabajador asociado al documento.' });
        }

        const trabajador_id = docs[0].Trabajadores_idTrabajadores;
        const tipo_documento_id = docs[0].Tipo_documento_idTipo_documento;

        db.query('SELECT idPrestamo FROM prestamo WHERE Trabajadores_idTrabajadores = ?', [trabajador_id], (err, existentes) => {
            if (err) return res.status(500).json({ error: err.message });
            if (existentes.length > 0) {
                return res.status(400).json({ error: 'Este expediente ya se encuentra actualmente prestado.' });
            }

            obtenerIdEstatus(ESTATUS_PRESTADO, (err, idPrestado) => {
                if (err) return res.status(500).json({ error: err.message });

                db.beginTransaction((err) => {
                    if (err) return res.status(500).json({ error: err.message });

                    const insertQuery = `
                        INSERT INTO prestamo (Usuarios_idUsuarios, Trabajadores_idTrabajadores, Tipo_documento_idTipo_documento, Documento_idDocumento, Fecha_prestamo, Fecha_entrega) 
                        VALUES (?, ?, ?, ?, ?, ?)
                    `;
                    db.query(insertQuery, [usuario_id, trabajador_id, tipo_documento_id, documento_id, fecha_prestamo, fecha_entrega], (err, result) => {
                        if (err) return db.rollback(() => res.status(500).json({ error: err.message }));

                        const updateQuery = 'UPDATE documento SET Estatus_idEstatus = ? WHERE Trabajadores_idTrabajadores = ?';
                        db.query(updateQuery, [idPrestado, trabajador_id], (err) => {
                            if (err) return db.rollback(() => res.status(500).json({ error: err.message }));

                            db.commit((err) => {
                                if (err) return db.rollback(() => res.status(500).json({ error: err.message }));
                                res.status(201).json({ message: 'Préstamo registrado con éxito', id: result.insertId });
                            });
                        });
                    });
                });
            });
        });
    });
});

app.delete('/api/prestamos/:id', (req, res) => {
    const id = req.params.id;

    db.query('SELECT Trabajadores_idTrabajadores FROM prestamo WHERE idPrestamo = ?', [id], (err, filas) => {
        if (err) return res.status(500).json({ error: err.message });
        if (filas.length === 0) return res.status(404).json({ error: 'El préstamo ya no existe.' });

        const trabajador_id = filas[0].Trabajadores_idTrabajadores;

        obtenerIdEstatus(ESTATUS_DISPONIBLE, (err, idDisponible) => {
            if (err) return res.status(500).json({ error: err.message });

            db.beginTransaction((err) => {
                if (err) return res.status(500).json({ error: err.message });

                db.query('DELETE FROM prestamo WHERE idPrestamo = ?', [id], (err) => {
                    if (err) return res.rollback(() => res.status(500).json({ error: err.message }));

                    const updateQuery = `
                        UPDATE documento SET Estatus_idEstatus = ?
                        WHERE Trabajadores_idTrabajadores = ?
                          AND NOT EXISTS (SELECT 1 FROM prestamo WHERE Trabajadores_idTrabajadores = ?)
                    `;
                    db.query(updateQuery, [idDisponible, trabajador_id, trabajador_id], (err) => {
                        if (err) return res.rollback(() => res.status(500).json({ error: err.message }));

                        db.commit((err) => {
                            if (err) return res.rollback(() => res.status(500).json({ error: err.message }));
                            res.json({ message: 'Préstamo eliminado' });
                        });
                    });
                });
            });
        });
    });
});


/* ================= ROUTES DE DEPARTAMENTOS ================= */
app.get('/api/departamentos', (req, res) => {
    db.query('SELECT idDepartamentos, Nombre FROM departamentos', (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});

app.post('/api/departamentos', (req, res) => {
    const nombre = (req.body.nombre || '').trim();
    if (!nombre) return res.status(400).json({ error: 'El nombre del departamento es obligatorio.' });
    const checkQuery = 'SELECT idDepartamentos FROM departamentos WHERE Nombre = ?';
    db.query(checkQuery, [nombre], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length > 0) return res.status(400).json({ error: 'Ya existe un departamento con este nombre.' });

        db.query('INSERT INTO departamentos (Nombre) VALUES (?)', [nombre], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ message: 'Departamento creado con éxito', id: result.insertId });
        });
    });
});

app.put('/api/departamentos/:id', (req, res) => {
    const id = req.params.id;
    const nombre = (req.body.nombre || '').trim();
    if (!nombre) return res.status(400).json({ error: 'El nombre del departamento es obligatorio.' });
    const checkQuery = 'SELECT idDepartamentos FROM departamentos WHERE Nombre = ? AND idDepartamentos <> ?';
    db.query(checkQuery, [nombre, id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length > 0) return res.status(400).json({ error: 'Ya existe otro departamento con este nombre.' });

        db.query('UPDATE departamentos SET Nombre = ? WHERE idDepartamentos = ?', [nombre, id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Departamento actualizado con éxito' });
        });
    });
});

app.delete('/api/departamentos/:id', (req, res) => {
    const id = req.params.id;
    db.query('SELECT COUNT(*) AS total FROM trabajadores WHERE Departamentos_idDepartamentos = ?', [id], (err, filas) => {
        if (err) return res.status(500).json({ error: err.message });
        if (filas[0].total > 0) {
            return res.status(400).json({ error: `No se puede eliminar: tiene ${filas[0].total} trabajador(es) asociado(s).` });
        }

        db.query('DELETE FROM departamentos WHERE idDepartamentos = ?', [id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Departamento eliminado' });
        });
    });
});


/* ================= ROUTES DE TRABAJADORES ================= */
app.get('/api/estatus', (req, res) => {
    db.query('SELECT idEstatus, Estatus FROM estatus WHERE Estatus NOT IN (?, ?)', [ESTATUS_DISPONIBLE, ESTATUS_PRESTADO], (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});

app.get('/api/trabajadores-completo', (req, res) => {
    const query = `
        SELECT t.idTrabajadores, t.Nombre, t.Apellido_paterno, t.Apellido_materno, 
               t.No_trabajador, t.Fecha_ingreso, 
               d.Nombre AS Departamento, e.Estatus,
               t.Departamentos_idDepartamentos, t.Estatus_idEstatus
        FROM trabajadores t
        JOIN departamentos d ON t.Departamentos_idDepartamentos = d.idDepartamentos
        JOIN estatus e ON t.Estatus_idEstatus = e.idEstatus
    `;
    db.query(query, (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});

app.post('/api/trabajadores', (req, res) => {
    const { departamentos_idDepartamentos, estatus_idEstatus, nombre, apellido_paterno, apellido_materno, fecha_ingreso, no_trabajador } = req.body;
    const checkQuery = 'SELECT * FROM trabajadores WHERE No_trabajador = ?';
    db.query(checkQuery, [no_trabajador], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length > 0) return res.status(400).json({ error: 'Ya existe un trabajador registrado con este número de matrícula.' });

        const insertQuery = `
            INSERT INTO trabajadores (Departamentos_idDepartamentos, Estatus_idEstatus, Nombre, Apellido_paterno, Apellido_materno, Fecha_ingreso, No_trabajador) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        db.query(insertQuery, [departamentos_idDepartamentos, estatus_idEstatus, nombre, apellido_paterno, apellido_materno || null, fecha_ingreso, no_trabajador], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ message: 'Trabajador registrado con éxito', id: result.insertId });
        });
    });
});

app.put('/api/trabajadores/:id', (req, res) => {
    const id = req.params.id;
    const { departamentos_idDepartamentos, estatus_idEstatus, nombre, apellido_paterno, apellido_materno, fecha_ingreso, no_trabajador } = req.body;
    const query = `
        UPDATE trabajadores 
        SET Departamentos_idDepartamentos = ?, Estatus_idEstatus = ?, Nombre = ?, Apellido_paterno = ?, Apellido_materno = ?, Fecha_ingreso = ?, No_trabajador = ? 
        WHERE idTrabajadores = ?
    `;
    db.query(query, [departamentos_idDepartamentos, estatus_idEstatus, nombre, apellido_paterno, apellido_materno || null, fecha_ingreso, no_trabajador, id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Trabajador actualizado con éxito' });
    });
});

app.delete('/api/trabajadores/:id', (req, res) => {
    const id = req.params.id;
    const query = 'DELETE FROM trabajadores WHERE idTrabajadores = ?';
    db.query(query, [id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Trabajador eliminado con éxito' });
    });
});


/* ================= ROUTES PARA REPORTE DE TRABAJADORES ================= */
app.get('/api/trabajadores/reporte', (req, res) => {
    const { desde, hasta, estatus, departamento } = req.query;

    // Validar fechas: formato correcto, no futuras y desde <= hasta
    const hoy = new Date().toISOString().slice(0, 10);
    const formatoFecha = /^\d{4}-\d{2}-\d{2}$/;
    if ((desde && !formatoFecha.test(desde)) || (hasta && !formatoFecha.test(hasta))) {
        return res.status(400).json({ error: 'Formato de fecha no válido.' });
    }
    if ((desde && desde > hoy) || (hasta && hasta > hoy)) {
        return res.status(400).json({ error: 'No se pueden usar fechas futuras en el periodo de ingreso.' });
    }
    if (desde && hasta && desde > hasta) {
        return res.status(400).json({ error: 'La fecha inicial no puede ser mayor que la fecha final.' });
    }
    let query = `
        SELECT t.idTrabajadores AS id, t.Nombre AS nombre, t.Apellido_paterno AS apellidoPaterno, 
               t.Apellido_materno AS apellidoMaterno, t.No_trabajador AS numero, 
               d.Nombre AS departamento, t.Fecha_ingreso AS fechaIngreso, 
               e.Estatus AS estatus
        FROM trabajadores t
        JOIN departamentos d ON t.Departamentos_idDepartamentos = d.idDepartamentos
        JOIN estatus e ON t.Estatus_idEstatus = e.idEstatus
        WHERE 1=1
    `;
    const params = [];

    if (desde) { query += ' AND t.Fecha_ingreso >= ?'; params.push(desde); }
    if (hasta) { query += ' AND t.Fecha_ingreso <= ?'; params.push(hasta); }
    if (estatus) { query += ' AND t.Estatus_idEstatus = ?'; params.push(estatus); }
    if (departamento) { query += ' AND t.Departamentos_idDepartamentos = ?'; params.push(departamento); }

    db.query(query, params, (err, results) => {
        if (err) return res.status(500).send(err);
        
        const formateados = results.map(t => {
            const f = t.fechaIngreso ? new Date(t.fechaIngreso) : null;
            const fechaCorta = f ? f.toLocaleDateString('es-MX') : '';
            const fechaLarga = f ? f.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
            return { ...t, fechaCorta, fechaLarga };
        });

        res.json(formateados);
    });
});

app.get('/api/trabajadores/:id/documentos', (req, res) => {
    const id = req.params.id;
    const qTrabajador = `
        SELECT t.Nombre AS nombre, t.Apellido_paterno AS apellidoPaterno, t.Apellido_materno AS apellidoMaterno, 
               t.No_trabajador AS numero, d.Nombre AS departamento, e.Estatus AS estatus
        FROM trabajadores t
        JOIN departamentos d ON t.Departamentos_idDepartamentos = d.idDepartamentos
        JOIN estatus e ON t.Estatus_idEstatus = e.idEstatus
        WHERE t.idTrabajadores = ?
    `;
    db.query(qTrabajador, [id], (err, tRes) => {
        if (err) return res.status(500).json({ error: err.message });
        if (tRes.length === 0) return res.status(404).json({ error: 'Trabajador no encontrado' });

        const qDocs = `
            SELECT td.Nombre AS tipo, es.Estatus AS estatus, 
                   CONCAT('Estante: ', est.Estante, ' / Caja: ', c.Caja) AS ubicacion, doc.Foto AS foto
            FROM documento doc
            JOIN tipo_documento td ON doc.Tipo_documento_idTipo_documento = td.idTipo_documento
            JOIN estatus es ON doc.Estatus_idEstatus = es.idEstatus
            JOIN cajas c ON doc.Cajas_idCajas = c.idCajas
            JOIN estantes est ON c.Estantes_idEstantes = est.idEstantes
            WHERE doc.Trabajadores_idTrabajadores = ?
        `;
        db.query(qDocs, [id], (err, dRes) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ trabajador: tRes[0], documentos: dRes });
        });
    });
});


/* ================= ROUTES DE TIPOS DE DOCUMENTO ================= */
app.get('/api/tipos-documento', (req, res) => {
    db.query('SELECT idTipo_documento, Nombre, Descripcion FROM tipo_documento', (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});

app.post('/api/tipos-documento', (req, res) => {
    const { nombre, descripcion } = req.body;
    const checkQuery = 'SELECT idTipo_documento FROM tipo_documento WHERE Nombre = ?';
    db.query(checkQuery, [nombre], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length > 0) return res.status(400).json({ error: 'Ya existe un tipo de documento registrado con este nombre.' });

        const query = 'INSERT INTO tipo_documento (Nombre, Descripcion) VALUES (?, ?)';
        db.query(query, [nombre, descripcion], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ message: 'Tipo de documento creado con éxito', id: result.insertId });
        });
    });
});

app.put('/api/tipos-documento/:id', (req, res) => {
    const id = req.params.id;
    const { nombre, descripcion } = req.body;
    const checkQuery = 'SELECT idTipo_documento FROM tipo_documento WHERE Nombre = ? AND idTipo_documento <> ?';
    db.query(checkQuery, [nombre, id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length > 0) return res.status(400).json({ error: 'Ya existe un tipo de documento registrado con este nombre.' });

        const query = 'UPDATE tipo_documento SET Nombre = ?, Descripcion = ? WHERE idTipo_documento = ?';
        db.query(query, [nombre, descripcion, id], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Tipo de documento actualizado con éxito' });
        });
    });
});

app.delete('/api/tipos-documento/:id', (req, res) => {
    const id = req.params.id;
    db.query('DELETE FROM tipo_documento WHERE idTipo_documento = ?', [id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Tipo de documento eliminado con éxito' });
    });
});


/* ================= ROUTES DE ESTANTES ================= */
app.get('/api/estantes', (req, res) => {
    db.query('SELECT idEstantes, Estante, Descripcion FROM estantes', (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});

app.post('/api/estantes', (req, res) => {
    const { estante, descripcion } = req.body;
    const query = 'INSERT INTO estantes (Estante, Descripcion) VALUES (?, ?)';
    db.query(query, [estante, descripcion], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ message: 'Estante registrado con éxito', id: result.insertId });
    });
});

app.put('/api/estantes/:id', (req, res) => {
    const id = req.params.id;
    const { estante, descripcion } = req.body;
    const query = 'UPDATE estantes SET Estante = ?, Descripcion = ? WHERE idEstantes = ?';
    db.query(query, [estante, descripcion, id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Estante actualizado con éxito' });
    });
});

app.delete('/api/estantes/:id', (req, res) => {
    const id = req.params.id;
    db.query('SELECT COUNT(*) AS total FROM cajas WHERE Estantes_idEstantes = ?', [id], (err, filas) => {
        if (err) return res.status(500).json({ error: err.message });

        if (filas[0].total > 0) {
            return res.status(400).json({
                error: `No se puede eliminar el estante: tiene ${filas[0].total} caja(s) registrada(s).`
            });
        }

        db.query('DELETE FROM estantes WHERE idEstantes = ?', [id], (err, result) => {
            if (err) {
                if (err.code === 'ER_ROW_IS_REFERENCED_2') {
                    return res.status(400).json({ error: 'No se puede eliminar el estante: tiene registros relacionados.' });
                }
                return res.status(500).json({ error: err.message });
            }
            res.json({ message: 'Estante eliminado con éxito' });
        });
    });
});


/* ================= ROUTES DE CAJAS ================= */
app.get('/api/cajas', (req, res) => {
    db.query('SELECT idCajas, Estantes_idEstantes, Caja, Descripcion FROM cajas', (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});

app.post('/api/cajas', (req, res) => {
    const { estantes_idEstantes, caja, descripcion } = req.body;
    const query = 'INSERT INTO cajas (Estantes_idEstantes, Caja, Descripcion) VALUES (?, ?, ?)';
    db.query(query, [estantes_idEstantes, caja, descripcion], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ message: 'Caja registrada con éxito', id: result.insertId });
    });
});

app.put('/api/cajas/:id', (req, res) => {
    const id = req.params.id;
    const { estantes_idEstantes, caja, descripcion } = req.body;
    const query = 'UPDATE cajas SET Estantes_idEstantes = ?, Caja = ?, Descripcion = ? WHERE idCajas = ?';
    db.query(query, [estantes_idEstantes, caja, descripcion, id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Caja actualizada con éxito' });
    });
});

app.delete('/api/cajas/:id', (req, res) => {
    const id = req.params.id;
    db.query('SELECT COUNT(*) AS total FROM documento WHERE Cajas_idCajas = ?', [id], (err, filas) => {
        if (err) return res.status(500).json({ error: err.message });

        if (filas[0].total > 0) {
            return res.status(400).json({
                error: `No se puede eliminar la caja: tiene ${filas[0].total} documento(s) registrado(s).`
            });
        }

        db.query('DELETE FROM cajas WHERE idCajas = ?', [id], (err, result) => {
            if (err) {
                if (err.code === 'ER_ROW_IS_REFERENCED_2') {
                    return res.status(400).json({ error: 'No se puede eliminar la caja: tiene registros relacionados.' });
                }
                return res.status(500).json({ error: err.message });
            }
            res.json({ message: 'Caja eliminada con éxito' });
        });
    });
});


/* ================= ROUTES DE DOCUMENTOS ================= */
app.get('/api/documentos-completo', (req, res) => {
    const query = `
    SELECT d.idDocumento, d.Cajas_idCajas, d.Estatus_idEstatus,
           d.Trabajadores_idTrabajadores, d.Tipo_documento_idTipo_documento,
           d.Foto,
           TRIM(CONCAT(t.Nombre, ' ', t.Apellido_paterno, ' ', IFNULL(t.Apellido_materno, ''))) AS Trabajador,
           t.No_trabajador AS NoTrabajador,
           dep.Nombre AS Departamento,
           c.Caja,
           est.Estante,
           est.idEstantes AS Estantes_idEstantes,
           td.Nombre AS TipoDocumento,
           es.Estatus AS EstatusNombre
    FROM documento d
    JOIN trabajadores t ON d.Trabajadores_idTrabajadores = t.idTrabajadores
    JOIN departamentos dep ON t.Departamentos_idDepartamentos = dep.idDepartamentos
    JOIN cajas c ON d.Cajas_idCajas = c.idCajas
    JOIN estantes est ON c.Estantes_idEstantes = est.idEstantes
    JOIN tipo_documento td ON d.Tipo_documento_idTipo_documento = td.idTipo_documento
    LEFT JOIN estatus es ON d.Estatus_idEstatus = es.idEstatus
`;
    db.query(query, (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});

app.post('/api/documentos', subirArchivo, (req, res) => {
    const { cajas_idCajas, trabajadores_idTrabajadores, tipo_documento_idTipo_documento } = req.body;
    const foto = req.file ? req.file.filename : null;

    const checkQuery = 'SELECT idDocumento FROM documento WHERE Trabajadores_idTrabajadores = ? AND Tipo_documento_idTipo_documento = ?';
    db.query(checkQuery, [trabajadores_idTrabajadores, tipo_documento_idTipo_documento], (err, repetidos) => {
        if (err) {
            borrarArchivoSubido(req);
            return res.status(500).json({ error: err.message });
        }
        if (repetidos.length > 0) {
            borrarArchivoSubido(req);
            return res.status(400).json({ error: 'Este trabajador ya tiene registrado un documento de este tipo.' });
        }

        obtenerIdEstatus(ESTATUS_DISPONIBLE, (err, idDisponible) => {
            if (err) {
                borrarArchivoSubido(req);
                return res.status(500).json({ error: err.message });
            }

            const insertQuery = `
                INSERT INTO documento (Cajas_idCajas, Estatus_idEstatus, Trabajadores_idTrabajadores, Tipo_documento_idTipo_documento, Foto) 
                VALUES (?, ?, ?, ?, ?)
            `;
            db.query(insertQuery, [cajas_idCajas, idDisponible, trabajadores_idTrabajadores, tipo_documento_idTipo_documento, foto], (err, result) => {
                if (err) {
                    borrarArchivoSubido(req);
                    return res.status(500).json({ error: err.message });
                }
                res.status(201).json({ message: 'Documento registrado con éxito', id: result.insertId });
            });
        });
    });
});

app.put('/api/documentos/:id', subirArchivo, (req, res) => {
    const id = req.params.id;
    const { cajas_idCajas, trabajadores_idTrabajadores, tipo_documento_idTipo_documento } = req.body;

    const checkQuery = 'SELECT idDocumento FROM documento WHERE Trabajadores_idTrabajadores = ? AND Tipo_documento_idTipo_documento = ? AND idDocumento <> ?';
    db.query(checkQuery, [trabajadores_idTrabajadores, tipo_documento_idTipo_documento, id], (err, repetidos) => {
        if (err) {
            borrarArchivoSubido(req);
            return res.status(500).json({ error: err.message });
        }
        if (repetidos.length > 0) {
            borrarArchivoSubido(req);
            return res.status(400).json({ error: 'Este trabajador ya tiene registrado un documento de este tipo.' });
        }

        let query = `
            UPDATE documento 
            SET Cajas_idCajas = ?, Trabajadores_idTrabajadores = ?, Tipo_documento_idTipo_documento = ?`;
        const valores = [cajas_idCajas, trabajadores_idTrabajadores, tipo_documento_idTipo_documento];

        if (req.file) {
            query += ', Foto = ?';
            valores.push(req.file.filename);
        }

        query += ' WHERE idDocumento = ?';
        valores.push(id);

        db.query(query, valores, (err, result) => {
            if (err) {
                borrarArchivoSubido(req);
                return res.status(500).json({ error: err.message });
            }
            res.json({ message: 'Documento actualizado con éxito' });
        });
    });
});

app.delete('/api/documentos/:id', (req, res) => {
    const id = req.params.id;
    const prestadoQuery = `
        SELECT COUNT(*) AS total
        FROM prestamo p
        JOIN documento d ON d.Trabajadores_idTrabajadores = p.Trabajadores_idTrabajadores
        WHERE d.idDocumento = ?
    `;
    db.query(prestadoQuery, [id], (err, filas) => {
        if (err) return res.status(500).json({ error: err.message });

        if (filas[0].total > 0) {
            return res.status(400).json({ error: 'No se puede eliminar el documento: el expediente de este trabajador está prestado.' });
        }

        db.query('DELETE FROM documento WHERE idDocumento = ?', [id], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Documento eliminado con éxito' });
        });
    });
});

// Iniciar servidor adaptado para entornos cloud (Azure/Railway)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor web corriendo en el puerto ${PORT}`);
});