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
    // Capturamos los nuevos campos que vienen del frontend
    const { nombre, correo, password, telefono, direccion } = req.body;

    if (!nombre || !correo || !password || !telefono) {
        return res.status(400).json({ error: 'Faltan campos obligatorios para el registro.' });
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const passwordEncriptado = await bcrypt.hash(password, salt);

        // 🔑 Generamos un token aleatorio único de 64 caracteres hex
        const tokenVerificacion = crypto.randomBytes(32).toString('hex');

        // Insertamos los nuevos datos. Nota que 'verificado' se pone en FALSE por defecto en la DB
        const sql = `INSERT INTO usuarios (nombre, correo, password, telefono, direccion, rol, verificado, token_verificacion) 
                    VALUES (?, ?, ?, ?, ?, 'cliente', FALSE, ?)`;

        await db.query(sql, [nombre, correo, passwordEncriptado, telefono, direccion || null, tokenVerificacion]);

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
// ENDPOINT OPTIMIZADO: Verificar Cuenta (Inmune a Doble Petición)
// ==========================================
app.get('/api/usuarios/verificar', async (req, res) => {
    const { token } = req.query;

    if (!token) {
        return res.status(400).send('<h1>Error</h1><p>Código de verificación inválido o ausente.</p>');
    }

    try {
        // 1. Buscamos al usuario por el token
        const [usuarios] = await db.query('SELECT * FROM usuarios WHERE token_verificacion = ?', [token]);

        // 🔍 Si no se encuentra, podría ser la segunda petición fantasma del navegador
        if (usuarios.length === 0) {
            // No hacemos nada drástico, simplemente asumimos que ya se procesó con éxito 
            // y le mostramos la pantalla de bienvenida para no confundir al cliente.
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

        // 2. Si es la primera petición, hacemos el flujo normal de activación
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
// ENDPOINT OPTIMIZADO: Inicio de Sesión (Login)
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
// ENDPOINT: Solicitar Recuperación de Contraseña
// ==========================================
app.post('/api/usuarios/recuperar', async (req, res) => {
    const { correo } = req.body;

    if (!correo) {
        return res.status(400).json({ error: 'El correo electrónico es obligatorio.' });
    }

    try {
        // 1. Verificamos si el usuario existe en la DB
        const [usuarios] = await db.query('SELECT * FROM usuarios WHERE correo = ?', [correo]);

        if (usuarios.length === 0) {
            // Por estándar de seguridad, no le decimos al frontend si el correo existe o no
            // para evitar rastreos de cuentas, pero devolvemos éxito simulado.
            return res.status(200).json({ mensaje: 'Proceso ejecutado.' });
        }

        // 2. Generamos un token temporal único de recuperación
        const tokenRecuperacion = crypto.randomBytes(32).toString('hex');

        // 3. Lo guardamos en la columna de la base de datos para ese usuario
        await db.query('UPDATE usuarios SET token_recuperacion = ? WHERE id = ?', [tokenRecuperacion, usuarios[0].id]);

        // 4. 📨 SIMULACIÓN DE ENVÍO DE CORREO DE RECUPERACIÓN
        // Apunta a tu puerto 5500 de Live Server donde crearemos la vista para cambiar la clave
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
// RUTA: Obtener reservas pendientes
// ==========================================
app.get('/api/operario/pendientes', verificarToken, async (req, res) => {
    if (req.usuario.rol !== 'operario' && req.usuario.rol !== 'admin') {
        return res.status(403).json({ error: 'Acceso denegado. No tienes permisos de operario.' });
    }
    try {
        const sql = `
            SELECT r.id AS reserva_id, r.fecha_reserva, r.hora_reserva, r.estado,
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

// 🏁 EL SERVIDOR SE ENCIENDE AL FINAL DE TODO EL ARCHIVO
app.listen(PORT, () => {
    console.log(`🚀 Servidor de Motor Wash Spa corriendo con éxito en http://127.0.0.1:${PORT}`);
});