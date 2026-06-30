const express = require('express');
const cors = require('cors'); // 1. Importar CORS
const db = require('./db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3000;

app.use(cors()); // 2. Habilitar CORS para todas las rutas
app.use(express.json());
// ... (el resto de tus rutas GET y POST se quedan exactamente igual)

app.use(express.json());
app.get('/', (req, res) => {
    res.send('¡Servidor de Motor Wash Spa encendido y funcionando!');
});
app.get('/api/servicios', async (req, res) => {
    try {
        // Ejecutamos la consulta SQL. 
        // El 'await' le dice a Node: "Espera a que la BD responda antes de continuar"
        const [rows] = await db.query('SELECT * FROM servicios');

        // Respondemos al cliente con los datos en formato JSON puro
        res.json(rows);
    } catch (error) {
        console.error('Error al consultar la base de datos:', error);
        res.status(500).json({ error: 'Hubo un error en el servidor al obtener los servicios' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor backend corriendo con éxito en http://localhost:${PORT}`);
});

app.post('/api/usuarios/registro', async (req, res) => {
    const { nombre, correo, password, rol } = req.body;
    if (!nombre || !correo || !password) {
        return res.status(400).json({ error: 'Faltan campos obligatorios: nombre, correo y password' });
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const passwordEncriptado = await bcrypt.hash(password, salt);
        const sql = 'INSERT INTO usuarios (nombre, correo, password, rol) VALUES (?, ?, ?, ?)';
        await db.query(sql, [nombre, correo, passwordEncriptado, rol || 'cliente']);
        res.status(201).json({ mensaje: 'Usuario registrado con éxito en el sistema' });

    } catch (error) {
        console.error('Error al registrar usuario:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Este correo electrónico ya está registrado' });
        }

        res.status(500).json({ error: 'Error interno del servidor al registrar el usuario' });
    }
});

// ==========================================
// ENDPOINT REAL: Inicio de Sesión (Login)
// ==========================================
app.post('/api/usuarios/login', async (req, res) => {
    const { correo, password } = req.body;

    // Validación básica
    if (!correo || !password) {
        return res.status(400).json({ error: 'Faltan correo o contraseña' });
    }

    try {
        // 1. Buscar al usuario por su correo
        const [rows] = await db.query('SELECT * FROM usuarios WHERE correo = ?', [correo]);

        // Si el arreglo viene vacío, significa que el correo no existe
        if (rows.length === 0) {
            return res.status(401).json({ error: 'Credenciales incorrectas (Correo no encontrado)' });
        }

        const usuario = rows[0];

        // 2. Comparar la contraseña ingresada con la encriptada en la BD
        // bcrypt.compare() hace la magia de verificar si coinciden
        const contraseñaCorrecta = await bcrypt.compare(password, usuario.password);

        if (!contraseñaCorrecta) {
            return res.status(401).json({ error: 'Credenciales incorrectas (Contraseña inválida)' });
        }

        // 3. Si todo está OK, creamos el Token (JWT)
        // Guardamos dentro del token los datos públicos del usuario para usarlos en el Frontend
        const payload = {
            id: usuario.id,
            nombre: usuario.nombre,
            rol: usuario.rol
        };

        // Firmamos el token con una "palabra secreta" (en producción esto va en variables de entorno)
        // Le ponemos que el token expire en 2 horas por seguridad
        const token = jwt.sign(payload, 'CLAVE_SECRETA_SUPER_INSEGURA_PARA_PRUEBAS', { expiresIn: '2h' });

        // 4. Respondemos al cliente con el Token y los datos del usuario
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
        console.error('Error en el login:', error);
        res.status(500).json({ error: 'Error interno del servidor al iniciar sesión' });
    }
});
// 1. Importamos el middleware de seguridad que acabamos de crear
const verificarToken = require('./authMiddleware');

// ... (Aquí conservas tus rutas anteriores de servicios, registro y login)

// ==========================================
// ENDPOINT REAL: Crear una Reserva (Protegido con JWT)
// ==========================================
// Colocamos 'verificarToken' como segundo parámetro. 
// Express ejecutará la seguridad PRIMERO y, si pasa, ejecutará la función 'async(req, res)'
app.post('/api/reservas', verificarToken, async (req, res) => {
    // Capturamos los datos de la reserva enviados por el cliente
    const { servicio_id, fecha_reserva, hora_reserva } = req.body;

    // Validación de campos del negocio
    if (!servicio_id || !fecha_reserva || !hora_reserva) {
        return res.status(400).json({ error: 'Faltan campos obligatorios para agendar la reserva.' });
    }

    // --- CAPA DE SEGURIDAD BACKEND: VALIDAR FECHA Y HORA ---
    const ahoraServidor = new Date(); // Fecha y hora exacta actual

    // Combinamos la fecha y hora recibidas para crear un objeto Date completo
    // Ejemplo: "2026-06-29" + "T" + "14:30:00"
    const momentoReserva = new Date(`${fecha_reserva}T${hora_reserva}`);

    // Si el momento de la reserva es menor al segundo exacto de ahora, rechazamos
    if (momentoReserva < ahoraServidor) {
        return res.status(400).json({ error: 'No puedes agendar una reserva en un horario que ya pasó.' });
    }
    // --------------------------------------------------------
    try {
        const usuario_id = req.usuario.id;
        const sql = 'INSERT INTO reservas (usuario_id, servicio_id, fecha_reserva, hora_reserva, estado) VALUES (?, ?, ?, ?, "pendiente")';

        // Recuerdas que el middleware guardó los datos del usuario en 'req.usuario'?
        // De ahí extraemos el ID real del cliente de forma ultra segura.

        // Preparamos la consulta SQL para insertar la reserva
        // Nota que dejamos 'operario_id' como NULL por defecto, ya que el admin lo asignará después.

        const [resultado] = await db.query(sql, [usuario_id, servicio_id, fecha_reserva, hora_reserva]);

        // Respondemos con éxito retornando el ID de la reserva recién creada
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
// ENDPOINT REAL: Obtener reservas pendientes (Solo Operarios/Admins)
// ==========================================
app.get('/api/operario/pendientes', verificarToken, async (req, res) => {
    // 1. Filtro de Seguridad por Rol:
    // El middleware ya leyó el token e inyectó el rol en req.usuario
    if (req.usuario.rol !== 'operario' && req.usuario.rol !== 'admin') {
        return res.status(403).json({ error: 'Acceso denegado. No tienes permisos de operario.' });
    }

    try {
        // 2. Consulta SQL con JOIN:
        // Traemos los datos de la reserva, el nombre del cliente y el nombre del servicio
        const sql = `
            SELECT 
                r.id AS reserva_id,
                r.fecha_reserva,
                r.hora_reserva,
                r.estado,
                u.nombre AS cliente_nombre,
                s.nombre_servicio,
                s.precio
            FROM reservas r
            JOIN usuarios u ON r.usuario_id = u.id
            JOIN servicios s ON r.servicio_id = s.id
            WHERE r.estado = 'pendiente' OR r.estado = 'en curso'
            ORDER BY r.fecha_reserva ASC, r.hora_reserva ASC
        `;

        const [rows] = await db.query(sql);

        // 3. Responder con la lista de tareas
        res.json(rows);

    } catch (error) {
        console.error('Error al obtener tareas del operario:', error);
        res.status(500).json({ error: 'Error interno del servidor al consultar las tareas.' });
    }
});
// ==========================================
// ENDPOINT REAL: Actualizar estado de una reserva (Solo Operarios/Admins)
// ==========================================
app.put('/api/operario/reservas/:id', verificarToken, async (req, res) => {
    // 1. Filtro de Seguridad por Rol
    if (req.usuario.rol !== 'operario' && req.usuario.rol !== 'admin') {
        return res.status(403).json({ error: 'Acceso denegado. No tienes permisos para modificar estados.' });
    }

    const reservaId = req.params.id;
    const { nuevo_estado } = req.body;

    // Validamos que el estado enviado sea uno de los permitidos por el negocio
    const estadosValidos = ['pendiente', 'en curso', 'finalizado'];
    if (!estadosValidos.includes(nuevo_estado)) {
        return res.status(400).json({ error: 'Estado de reserva inválido.' });
    }

    try {
        // 2. Consulta SQL para actualizar la reserva
        // Guardamos también el ID del operario que la atendió (tomado del token)
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