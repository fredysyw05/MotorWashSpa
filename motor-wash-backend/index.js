const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const db = require('./db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const verificarToken = require('./authMiddleware'); // Importado limpiamente arriba

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// ==========================================
// RUTAS GET
// ==========================================
app.get('/', (req, res) => {
    res.send('¡Servidor de Motor Wash Spa encendido y funcionando!');
});

app.get('/api/servicios', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM servicios');
        res.json(rows);
    } catch (error) {
        console.error('Error al consultar la base de datos:', error);
        res.status(500).json({ error: 'Hubo un error en el servidor al obtener los servicios' });
    }
});

// ==========================================
// RUTA: Registro de Usuarios
// ==========================================
app.post('/api/usuarios/registro', async (req, res) => {
    const { nombre, correo, password, telefono, direccion, placa } = req.body;

    if (!nombre || !correo || !password || !telefono) {
        return res.status(400).json({ error: 'Faltan campos obligatorios para el registro.' });
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const passwordEncriptado = await bcrypt.hash(password, salt);
        const tokenVerificacion = crypto.randomBytes(32).toString('hex');
        //consulta SQL
        const sql = `INSERT INTO usuarios (nombre, correo, password, telefono, direccion, placa, rol, verificado, token_verificacion) 
                    VALUES (?, ?, ?, ?, ?, ?, 'cliente', FALSE, ?)`;

        //arreglo de parámetros
        await db.query(sql, [
            nombre,
            correo,
            passwordEncriptado,
            telefono,
            direccion || null,
            placa ? placa.toUpperCase() : null, // Nos aseguramos de que se guarde en mayúsculas
            tokenVerificacion
        ]);
        // 📧 SIMULACIÓN DE ENVÍO DE CORREO (Próximamente con Nodemailer)
        const enlaceVerificacion = `http://127.0.0.1:3000/api/usuarios/verificar?token=${tokenVerificacion}`;

        console.log("\n==================================================================");
        console.log(`📨 [NOTIFICACIÓN SIMULADA] Correo enviado a: ${correo}`);
        console.log(`🔗 Haz clic en este enlace para activar tu cuenta de Motor Wash Spa:`);
        console.log(`👉 ${enlaceVerificacion}`);
        console.log("==================================================================\n");

        res.status(201).json({ mensaje: 'Usuario registrado. Por favor verifica tu correo.' });

    } catch (error) {
        console.error('Error al registrar usuario:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Este correo electrónico ya está registrado.' });
        }
        res.status(500).json({ error: 'Error interno al registrar el usuario.' });
    }
});

// ==========================================
// ENDPOINT: Verificar Cuenta (Inmune a Doble Petición)
// ==========================================
app.get('/api/usuarios/verificar', async (req, res) => {
    const { token } = req.query;

    if (!token) {
        return res.status(400).send('<h1>Error</h1><p>Código de verificación inválido o ausente.</p>');
    }

    try {
        //Busqueda del usuario por el token
        const [usuarios] = await db.query('SELECT * FROM usuarios WHERE token_verificacion = ?', [token]);

        //Si no se encuentra, podría ser la segunda petición fantasma del navegador
        if (usuarios.length === 0) {
            return res.send(`
                <div style="text-align: center; font-family: sans-serif; margin-top: 50px;">
                    <h1 style="color: #2ecc71;">✨ ¡Cuenta Lista! ✨</h1>
                    <p>Tu correo ya se encuentra verificado correctamente en Motor Wash Spa.</p>
                    <p>Ya puedes proceder a iniciar sesión con tus credenciales.</p>
                    <br>
                    <a href="http://127.0.0.1:5500/login.html" style="background: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Ir al Login</a>
                </div>
            `);
        }
        await db.query('UPDATE usuarios SET verificado = TRUE, token_verificacion = NULL WHERE id = ?', [usuarios[0].id]);

        res.send(`
            <div style="text-align: center; font-family: sans-serif; margin-top: 50px;">
                <h1 style="color: #2ecc71;">✨ ¡Cuenta Activada con Éxito! ✨</h1>
                <p>Tu correo ha sido verificado correctamente en Motor Wash Spa.</p>
                <p>Ya puedes cerrar esta pestaña y proceder a iniciar sesión.</p>
                <br>
                <a href="http://127.0.0.1:5500/login.html" style="background: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Ir al Login</a>
            </div>
        `);

    } catch (error) {
        console.error('Error al verificar usuario:', error);
        res.status(500).send('<h1>Error Interno</h1><p>Hubo un problema al procesar tu solicitud.</p>');
    }
});

// ==========================================
// ENDPOINT: Inicio de Sesión (Login)
// ==========================================
app.post('/api/usuarios/login', async (req, res) => {
    const { correo, password } = req.body;

    // 📥 CHECKPOINT 1: Ver si la petición entra al servidor
    console.log("📥 [CHECKPOINT 1] Petición de login recibida en Node.js para:", correo);

    if (!correo || !password) {
        return res.status(400).json({ error: 'Faltan correo o contraseña' });
    }

    try {
        // 🔍 CHECKPOINT 2: Antes de tocar la Base de Datos
        console.log("🔍 [CHECKPOINT 2] Solicitando datos a MySQL/MariaDB...");

        const [rows] = await db.query('SELECT * FROM usuarios WHERE correo = ?', [correo]);

        // 📦 CHECKPOINT 3: Ver si la BD respondió o se quedó colgada
        console.log("📦 [CHECKPOINT 3] Base de datos respondió con éxito. Registros encontrados:", rows.length);

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Credenciales incorrectas (Correo no encontrado)' });
        }

        const usuario = rows[0];

        if (!usuario.password) {
            return res.status(401).json({ error: 'Credenciales incorrectas (Este usuario no tiene acceso digital)' });
        }
        // 🛑 VALIDACIÓN DE SEGURIDAD: ¿El usuario ya activó su cuenta?
        if (!usuario.verificado) {
            return res.status(403).json({ error: 'Tu cuenta aún no ha sido activada. Por favor, revisa tu correo electrónico.' });
        }
        // 🔐 CHECKPOINT 4: Antes de comparar con Bcrypt
        console.log("🔐 [CHECKPOINT 4] Iniciando comparación de contraseña con Bcrypt...");

        const contraseñaCorrecta = await bcrypt.compare(password, usuario.password);

        // ⚖️ CHECKPOINT 5: Ver el resultado de Bcrypt
        console.log("⚖️ [CHECKPOINT 5] Bcrypt terminó. ¿Contraseña válida?:", contraseñaCorrecta);

        if (!contraseñaCorrecta) {
            return res.status(401).json({ error: 'Credenciales incorrectas (Contraseña inválida)' });
        }

        const payload = {
            id: usuario.id,
            nombre: usuario.nombre,
            rol: usuario.rol
        };

        const token = jwt.sign(payload, 'CLAVE_SECRETA_SUPER_INSEGURA_PARA_PRUEBAS', { expiresIn: '2h' });

        // 🚀 CHECKPOINT 6: Destino final exitoso
        console.log("🚀 [CHECKPOINT 6] Token generado. Enviando respuesta JSON al navegador.");

        res.json({
            mensaje: 'Inicio de sesión exitoso',
            token: token,
            usuario: {
                id: usuario.id,
                nombre: usuario.nombre,
                rol: usuario.rol
            }
        });

    } catch (error) {
        // ❌ CHECKPOINT DE ERROR
        console.error('❌ [ERROR INTERNO EN LOGIN]:', error);
        res.status(500).json({ error: 'Error interno del servidor al iniciar sesión' });
    }
});

// ==========================================
// RUTA ADMIN: Registrar un nuevo Operario
// ==========================================
app.post('/api/admin/registrar-operario', verificarToken, async (req, res) => {
    // 🛡️ FILTRO DE SEGURIDAD: Solo el administrador puede entrar aquí
    if (req.usuario.rol !== 'admin') {
        return res.status(403).json({ error: 'Acceso denegado. No tienes permisos de administrador.' });
    }

    const { nombre, correo, password, telefono, direccion } = req.body;

    // Validamos campos mínimos obligatorios
    if (!nombre || !correo || !password || !telefono) {
        return res.status(400).json({ error: 'Faltan campos obligatorios para registrar al operario.' });
    }

    try {
        // Encriptamos la contraseña tal cual como lo haces en el registro de clientes
        const salt = await bcrypt.genSalt(10);
        const passwordEncriptado = await bcrypt.hash(password, salt);

        // Insertamos en la tabla usuarios, pero forzando el rol 'operario' 
        // Y lo dejamos como VERIFICADO = TRUE de una vez, porque lo crea el jefe
        const sql = `INSERT INTO usuarios (nombre, correo, password, telefono, direccion, rol, verificado) 
                    VALUES (?, ?, ?, ?, ?, 'operario', TRUE)`;

        await db.query(sql, [
            nombre,
            correo,
            passwordEncriptado,
            telefono,
            direccion || null
        ]);

        console.log(`👷‍♂️ [ADMIN] Nuevo operario registrado con éxito: ${nombre} (${correo})`);
        res.status(201).json({ mensaje: `El operario ${nombre} fue registrado correctamente.` });

    } catch (error) {
        console.error('Error al registrar operario por el admin:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Este correo electrónico ya está registrado en el sistema.' });
        }
        res.status(500).json({ error: 'Error interno del servidor al registrar al operario.' });
    }
});

// ==========================================
// RUTA ADMIN: Registrar Cliente Presencial (Walk-in)
// ==========================================
app.post('/api/admin/registrar-cliente', verificarToken, async (req, res) => {
    // 🛡️ FILTRO DE SEGURIDAD: Reutilizamos tu lógica exacta
    if (req.usuario.rol !== 'admin') {
        return res.status(403).json({ error: 'Acceso denegado. No tienes permisos de administrador.' });
    }

    const { nombre, telefono, correo, placa, direccion } = req.body;

    // Validamos campos mínimos obligatorios para el negocio físico
    if (!nombre || !telefono) {
        return res.status(400).json({ error: 'El nombre y el teléfono son obligatorios para el registro presencial.' });
    }

    try {
        // 🔍 VERIFICACIÓN DE EXISTENCIA: ¿Ya existe esta placa o teléfono en tu tabla usuarios?
        // Validamos la placa solo si el admin la ingresó
        const placaBuscar = placa ? placa.toUpperCase() : null;

        const [existente] = await db.query(
            'SELECT id, nombre, placa, telefono FROM usuarios WHERE telefono = ? OR (placa = ? AND placa IS NOT NULL)',
            [telefono, placaBuscar]
        );

        if (existente.length > 0) {
            const coincidencia = existente[0];
            if (placaBuscar && coincidencia.placa === placaBuscar) {
                return res.status(400).json({ error: `El vehículo con placas [${placaBuscar}] ya está registrado a nombre de ${coincidencia.nombre}.` });
            }
            if (coincidencia.telefono === telefono) {
                return res.status(400).json({ error: `El teléfono ${telefono} ya está asignado al cliente ${coincidencia.nombre}.` });
            }
        }

        // 📝 Usuarios registrados por el admin
        // password queda NULL o vacío porque este cliente no entra por login de aplicación
        const sql = `INSERT INTO usuarios (nombre, correo, password, telefono, direccion, placa, rol, verificado) 
                    VALUES (?, ?, NULL, ?, ?, ?, 'cliente', TRUE)`;

        await db.query(sql, [
            nombre,
            correo || null, // Opcional
            telefono,
            direccion || null, // Opcional
            placaBuscar // Guardado limpio en mayúsculas
        ]);

        console.log(`👤 [ADMIN] Cliente presencial registrado: ${nombre} | Vehículo: [${placaBuscar || 'Ninguno'}]`);
        res.status(201).json({ mensaje: `¡Cliente ${nombre} registrado con éxito en Motor Wash!` });

    } catch (error) {
        console.error('❌ Error al registrar cliente presencial por el admin:', error);

        // Control extra por si el correo (si se ingresó) ya existe en otro usuario de la app
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Este correo electrónico ya pertenece a un usuario registrado.' });
        }

        res.status(500).json({ error: 'Error interno del servidor al procesar el alta del cliente.' });
    }
});

// ==========================================
// RUTA ADMIN: Métricas del Tablero de Resumen
// ==========================================
app.get('/api/admin/resumen', verificarToken, async (req, res) => {
    // 🛡️ Filtro de seguridad obligatorio
    if (req.usuario.rol !== 'admin') {
        return res.status(403).json({ error: 'Acceso denegado. No tienes permisos de administrador.' });
    }

    try {
        // Se Definen los queries analíticos

        // 1. Ingresos y servicios completados el día de HOY
        const queryHoy = `
            SELECT 
                COUNT(r.id) AS servicios_hoy,
                IFNULL(SUM(s.precio), 0) AS ingresos_hoy
            FROM reservas r
            JOIN servicios s ON r.servicio_id = s.id
            WHERE r.fecha_reserva = CURDATE() AND r.estado = 'finalizado'
        `;

        // 2. Estado de la operación en tiempo real (Carga de trabajo para HOY)
        const queryOperacion = `
            SELECT 
                SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) AS pendientes_hoy,
                SUM(CASE WHEN estado = 'en curso' THEN 1 ELSE 0 END) AS en_curso_hoy
            FROM reservas
            
        `;

        // 3. Los 3 servicios más vendidos en la historia de Motor Wash (Para el Top)
        const queryTopServicios = `
            SELECT s.nombre_servicio, COUNT(r.id) AS total_ventas
            FROM reservas r
            JOIN servicios s ON r.servicio_id = s.id
            WHERE r.estado = 'finalizado'
            GROUP BY s.id, s.nombre_servicio
            ORDER BY total_ventas DESC
            LIMIT 3
        `;

        // 4. Contador general de la comunidad de Motor Wash Spa
        const queryComunidad = `
            SELECT 
                SUM(CASE WHEN rol = 'cliente' THEN 1 ELSE 0 END) AS total_clientes,
                SUM(CASE WHEN rol = 'operario' THEN 1 ELSE 0 END) AS total_operarios
            FROM usuarios
        `;

        const [rawHoy, rawOperacion, rawTop, rawComunidad] = await Promise.all([
            db.query(queryHoy),
            db.query(queryOperacion),
            db.query(queryTopServicios),
            db.query(queryComunidad)
        ]);

        // 2. Extraemos limpiamente el array de FILAS (rows) de cada respuesta
        const rowsHoy = rawHoy[0];
        const rowsOperacion = rawOperacion[0];
        const rowsTop = rawTop[0];
        const rowsComunidad = rawComunidad[0];

        // 3. Estructuramos la respuesta usando encadenamiento opcional (?.) por seguridad
        res.status(200).json({
            financiero: {
                servicios_completados_hoy: rowsHoy[0]?.servicios_hoy || 0,
                ingresos_hoy: parseFloat(rowsHoy[0]?.ingresos_hoy) || 0
            },
            monitoreo_rapido: {
                pendientes: rowsOperacion[0]?.pendientes_hoy || 0,
                en_curso: rowsOperacion[0]?.en_curso_hoy || 0
            },
            top_servicios: rowsTop, // Ahora sí viaja el array de filas limpio para el .map() del front
            comunidad: {
                clientes_registrados: rowsComunidad[0]?.total_clientes || 0,
                operarios_activos: rowsComunidad[0]?.total_operarios || 0
            }
        });

    } catch (error) {
        console.error('❌ Error al generar métricas de administrador:', error);
        res.status(500).json({ error: 'Error interno al recopilar las métricas del sistema.' });
    }
});

// ==========================================
// RUTA ADMIN: Historial Global con Filtros Dinámicos
// ==========================================
app.get('/api/admin/historial', verificarToken, async (req, res) => {
    // 🛡️ Filtro de seguridad obligatorio
    if (req.usuario.rol !== 'admin') {
        return res.status(403).json({ error: 'Acceso denegado. No tienes permisos de administrador.' });
    }

    // Capturamos los filtros que viajen por la URL (Query Params)
    // Ejemplo: /api/admin/historial?placa=XYZ123&estado=finalizado
    const { placa, estado, fecha, operario_id } = req.query;

    try {
        // Consulta base: Cruzamos la reserva con el cliente, el servicio y el operario asignado
        let sql = `
            SELECT 
                r.id AS reserva_id, 
                r.fecha_reserva, 
                r.hora_reserva, 
                r.estado,
                u_cli.nombre AS cliente_nombre, 
                u_cli.telefono AS cliente_telefono,
                u_cli.placa AS cliente_placa,
                s.nombre_servicio, 
                s.precio,
                IFNULL(u_ope.nombre, 'Sin asignar') AS operario_nombre
            FROM reservas r
            JOIN usuarios u_cli ON r.usuario_id = u_cli.id
            JOIN servicios s ON r.servicio_id = s.id
            LEFT JOIN usuarios u_ope ON r.operario_id = u_ope.id
            WHERE 1=1
        `;

        const parametros = [];

        // Inyección dinámica de filtros según lo que envíe el admin
        if (placa) {
            sql += ` AND u_cli.placa = ?`;
            parametros.push(placa.toUpperCase().trim());
        }

        if (estado) {
            sql += ` AND r.estado = ?`;
            parametros.push(estado);
        }

        if (fecha) {
            sql += ` AND r.fecha_reserva = ?`;
            parametros.push(fecha);
        }

        if (operario_id) {
        sql += ` AND r.operario_id = ?`;
        parametros.push(operario_id);
    }

        // Siempre ordenamos del más reciente al más antiguo
        sql += ` ORDER BY r.fecha_reserva DESC, r.hora_reserva DESC`;

        const [rows] = await db.query(sql, parametros);
        res.json(rows);

    } catch (error) {
        console.error('❌ Error al consultar historial global:', error);
        res.status(500).json({ error: 'Error interno del servidor al procesar el historial.' });
    }
});

// ==========================================
// ENDPOINT: Solicitar Recuperación de Contraseña
// ==========================================
app.post('/api/usuarios/recuperar', async (req, res) => {
    const { correo } = req.body;

    if (!correo) {
        return res.status(400).json({ error: 'El correo electrónico es obligatorio.' });
    }

    try {
        // 1. Verificación ¿el usuario existe en la DB?
        const [usuarios] = await db.query('SELECT * FROM usuarios WHERE correo = ?', [correo]);

        if (usuarios.length === 0) {
            return res.status(200).json({ mensaje: 'Proceso ejecutado.' });
        }

        // 2. Generamos un token temporal único de recuperación
        const tokenRecuperacion = crypto.randomBytes(32).toString('hex');

        // 3. Se guarda en la columna de la base de datos para ese usuario
        await db.query('UPDATE usuarios SET token_recuperacion = ? WHERE id = ?', [tokenRecuperacion, usuarios[0].id]);

        // 4. 📨 SIMULACIÓN DE ENVÍO DE CORREO DE RECUPERACIÓN
        // Apunta al puerto 5500 de Live Server donde se crea la vista para cambiar la clave
        const enlaceRecuperacion = `http://127.0.0.1:5500/restablecer-password.html?token=${tokenRecuperacion}`;

        console.log("\n==================================================================");
        console.log(`🔑 [SOLICITUD DE RECUPERACIÓN] Usuario: ${usuarios[0].nombre}`);
        console.log(`📧 Correo destino: ${correo}`);
        console.log(`🔗 Haz clic abajo para restablecer la contraseña de Motor Wash Spa:`);
        console.log(`👉 ${enlaceRecuperacion}`);
        console.log("==================================================================\n");

        res.status(200).json({ mensaje: 'Enlace generado con éxito.' });

    } catch (error) {
        console.error('Error en recuperación:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});
// ==========================================
// ENDPOINT: Procesar Cambio de Contraseña Real
// ==========================================
app.post('/api/usuarios/restablecer', async (req, res) => {
    const { token, password } = req.body;

    if (!token || !password) {
        return res.status(400).json({ error: 'El token y la nueva contraseña son obligatorios.' });
    }

    try {
        // 1. Validar si existe un usuario con ese token de recuperación activo
        const [usuarios] = await db.query('SELECT * FROM usuarios WHERE token_recuperacion = ?', [token]);

        if (usuarios.length === 0) {
            return res.status(400).json({ error: 'El enlace de recuperación ha expirado, es inválido o ya fue utilizado.' });
        }

        const usuarioId = usuarios[0].id;

        // 2. Encriptar la nueva contraseña con el estándar de seguridad Bcrypt
        const salt = await bcrypt.genSalt(10);
        const passwordEncriptado = await bcrypt.hash(password, salt);

        // 3. Actualizar la clave y destruir el token asignándole NULL
        await db.query(
            'UPDATE usuarios SET password = ?, token_recuperacion = NULL WHERE id = ?',
            [passwordEncriptado, usuarioId]
        );

        console.log(`🔒 [SEGURIDAD] Contraseña restablecida con éxito para el usuario ID: ${usuarioId}`);

        res.status(200).json({ mensaje: 'Contraseña actualizada correctamente.' });

    } catch (error) {
        console.error('Error al restablecer la contraseña:', error);
        res.status(500).json({ error: 'Error interno al procesar el cambio de contraseña.' });
    }
});

// ==========================================
// RUTA: Crear una Reserva (Protegido)
// ==========================================
app.post('/api/reservas', verificarToken, async (req, res) => {
    const { servicio_id, fecha_reserva, hora_reserva } = req.body;
    if (!servicio_id || !fecha_reserva || !hora_reserva) {
        return res.status(400).json({ error: 'Faltan campos obligatorios para agendar la reserva.' });
    }
    const ahoraServidor = new Date();
    const momentoReserva = new Date(`${fecha_reserva}T${hora_reserva}`);

    if (momentoReserva < ahoraServidor) {
        return res.status(400).json({ error: 'No puedes agendar una reserva en un horario que ya pasó.' });
    }
    try {
        const usuario_id = req.usuario.id;
        const sql = 'INSERT INTO reservas (usuario_id, servicio_id, fecha_reserva, hora_reserva, estado) VALUES (?, ?, ?, ?, "pendiente")';
        const [resultado] = await db.query(sql, [usuario_id, servicio_id, fecha_reserva, hora_reserva]);

        res.status(201).json({
            mensaje: '¡Tu reserva ha sido agendada con éxito!',
            reserva_id: resultado.insertId
        });
    } catch (error) {
        console.error('Error al crear la reserva:', error);
        res.status(500).json({ error: 'Error interno del servidor al procesar la reserva.' });
    }
});

// ==========================================
// ENDPOINT: OBTENER LISTA DE OPERARIOS
// ==========================================
app.get('/api/admin/operarios', verificarToken, async (req, res) => {
    // Verificamos que sea un admin
    if (req.usuario.rol !== 'admin') {
        return res.status(403).json({ error: 'Acceso denegado.' });
    }

    try {
        // Buscamos en la BD solo los usuarios que sean operarios
        const [operarios] = await db.query(
            "SELECT id, nombre FROM usuarios WHERE rol = 'operario' ORDER BY nombre ASC"
        );
        res.status(200).json(operarios);
    } catch (error) {
        console.error('❌ Error al obtener lista de operarios:', error);
        res.status(500).json({ error: 'Error interno al cargar los operarios.' });
    }
});
// ==========================================
// RUTA: Obtener reservas pendientes
// ==========================================
app.get('/api/operario/pendientes', verificarToken, async (req, res) => {
    if (req.usuario.rol !== 'operario' && req.usuario.rol !== 'admin') {
        return res.status(403).json({ error: 'Acceso denegado. No tienes permisos de operario.' });
    }
    try {
        const sql = `
            SELECT r.id AS reserva_id, r.fecha_reserva, r.hora_reserva, r.estado, r.operario_id,
            u.nombre AS cliente_nombre, s.nombre_servicio, s.precio
            FROM reservas r
            JOIN usuarios u ON r.usuario_id = u.id
            JOIN servicios s ON r.servicio_id = s.id
            WHERE r.estado = 'pendiente' OR r.estado = 'en curso'
            ORDER BY r.fecha_reserva ASC, r.hora_reserva ASC
        `;
        const [rows] = await db.query(sql);
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener tareas del operario:', error);
        res.status(500).json({ error: 'Error interno del servidor al consultar las tareas.' });
    }
});

// ==========================================
// ENDPOINT: MONITOREO EN VIVO
// ==========================================
app.get('/api/admin/monitoreo', verificarToken, async (req, res) => {
    if (req.usuario.rol !== 'admin') {
        return res.status(403).json({ error: 'Acceso denegado.' });
    }

    try {
        // Traemos solo los activos y ordenamos por estado y hora
        const sql = `
            SELECT 
                r.id AS reserva_id, r.hora_reserva, r.estado, c.placa,
                c.nombre AS cliente_nombre, 
                s.nombre_servicio, 
                o.nombre AS operario_nombre
            FROM reservas r
            JOIN usuarios c ON r.usuario_id = c.id
            JOIN servicios s ON r.servicio_id = s.id
            LEFT JOIN usuarios o ON r.operario_id = o.id
            WHERE r.estado IN ('en curso', 'pendiente')
            ORDER BY 
                CASE r.estado 
                    WHEN 'en curso' THEN 1 
                    WHEN 'pendiente' THEN 2 
                    ELSE 3 
                END, 
                r.hora_reserva ASC
        `;
        
        const [monitoreo] = await db.query(sql);
        res.status(200).json(monitoreo);
    } catch (error) {
        console.error('❌ Error en monitoreo en vivo:', error);
        res.status(500).json({ error: 'Error al cargar el monitoreo.' });
    }
});

// ==========================================
// RUTA: Obtener historial de reservas (Finalizadas Canceladas, filtrar por operario)
// ==========================================
app.get('/api/operario/historial', verificarToken, async (req, res) => {
    if (req.usuario.rol !== 'operario' && req.usuario.rol !== 'admin') {
        return res.status(403).json({ error: 'Acceso denegado. No tienes permisos de operario.' });
    }

    try {
        // 1. Dejamos la consulta base uniendo las tablas
        let sql = `
            SELECT r.id AS reserva_id, r.fecha_reserva, r.hora_reserva, r.estado,
                u.nombre AS cliente_nombre, s.nombre_servicio, s.precio
            FROM reservas r
            JOIN usuarios u ON r.usuario_id = u.id
            JOIN servicios s ON r.servicio_id = s.id
            WHERE (r.estado = 'finalizado' OR r.estado = 'cancelado')
        `;

        const parametros = [];

        // 🌟 EL TRUCO: Si el rol es operario, inyectamos el filtro de su ID obligatoriamente
        if (req.usuario.rol === 'operario') {
            sql += ` AND r.operario_id = ?`;
            parametros.push(req.usuario.id);
        }

        // Mantenemos el orden cronológico invertido (más recientes primero)
        sql += ` ORDER BY r.fecha_reserva DESC, r.hora_reserva DESC`;

        const [rows] = await db.query(sql, parametros);
        res.json(rows);

    } catch (error) {
        console.error('Error al obtener el historial del operario:', error);
        res.status(500).json({ error: 'Error interno del servidor al consultar el historial.' });
    }

});
// ==========================================
// RUTA: Actualizar estado de una reserva
// ==========================================
app.put('/api/operario/reservas/:id', verificarToken, async (req, res) => {
    if (req.usuario.rol !== 'operario' && req.usuario.rol !== 'admin') {
        return res.status(403).json({ error: 'Acceso denegado. No tienes permisos para modificar estados.' });
    }
    const reservaId = req.params.id;
    const { nuevo_estado } = req.body;
    const estadosValidos = ['pendiente', 'en curso', 'finalizado'];
    if (!estadosValidos.includes(nuevo_estado)) {
        return res.status(400).json({ error: 'Estado de reserva inválido.' });
    }
    try {
        const sql = 'UPDATE reservas SET estado = ?, operario_id = ? WHERE id = ?';
        const [resultado] = await db.query(sql, [nuevo_estado, req.usuario.id, reservaId]);
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ error: 'No se encontró la reserva especificada.' });
        }
        res.json({ mensaje: `La reserva se actualizó con éxito a: ${nuevo_estado}` });
    } catch (error) {
        console.error('Error al actualizar estado de la reserva:', error);
        res.status(500).json({ error: 'Error interno del servidor al actualizar el estado.' });
    }
});

// ==========================================
// ENDPOINT: Obtener Información del Panel de Usuario
// ==========================================
app.get('/api/usuarios/mi-panel', verificarToken, async (req, res) => {
    const usuarioId = req.usuario.id; // Obtenido del token JWT decodificado

    try {
        // 1. Buscar los datos personales del usuario
        const [usuarios] = await db.query(
            'SELECT id, nombre, correo, telefono, direccion, placa FROM usuarios WHERE id = ?',
            [usuarioId]
        );

        if (usuarios.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }

        // 2. Buscar el historial y citas pendientes del usuario
        // Unimos con la tabla de servicios para sacar nombres y precios de lo agendado
        const sqlReservas = `
            SELECT r.id, r.fecha_reserva AS fecha, r.hora_reserva AS hora, r.estado, s.nombre_servicio AS servicio_nombre, s.precio
            FROM reservas r
            JOIN servicios s ON r.servicio_id = s.id
            WHERE r.usuario_id = ?
            ORDER BY r.fecha_reserva DESC, r.hora_reserva DESC
        `;
        const [reservas] = await db.query(sqlReservas, [usuarioId]);

        // 3. Responder con el paquete estructurado
        res.status(200).json({
            perfil: usuarios[0],
            reservas: reservas
        });

    } catch (error) {
        console.error('Error al obtener datos del panel:', error);
        res.status(500).json({ error: 'Error interno del servidor al procesar el panel.' });
    }
});

// ==========================================
// ENDPOINT: Cancelar Reserva por el Cliente
// ==========================================
app.put('/api/reservas/cancelar/:id', verificarToken, async (req, res) => {
    const citaId = req.params.id;
    const usuarioId = req.usuario.id;

    try {
        // 1. Validar que la cita pertenezca al usuario antes de permitirle cancelarla (Protección extra)
        const [citas] = await db.query('SELECT * FROM reservas WHERE id = ? AND usuario_id = ?', [citaId, usuarioId]);

        if (citas.length === 0) {
            return res.status(404).json({ error: 'Cita no encontrada o no autorizada.' });
        }

        // 2. Cambiar el estado a "cancelado"
        await db.query('UPDATE reservas SET estado = "cancelado" WHERE id = ?', [citaId]);

        console.log(`❌ [RESERVAS] Cita ID ${citaId} cancelada por el usuario ID: ${usuarioId}`);
        res.status(200).json({ mensaje: 'Cita cancelada correctamente.' });

    } catch (error) {
        console.error('Error al cancelar cita:', error);
        res.status(500).json({ error: 'Error al procesar la cancelación.' });
    }
});
// 🏁 EL SERVIDOR SE ENCIENDE AL FINAL DE TODO EL ARCHIVO
app.listen(PORT, () => {
    console.log(`🚀 Servidor de Motor Wash Spa corriendo con éxito en http://127.0.0.1:${PORT}`);
});