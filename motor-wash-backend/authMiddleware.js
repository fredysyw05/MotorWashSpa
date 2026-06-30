const jwt = require('jsonwebtoken');

// Un middleware es una función con tres parámetros: req, res y next.
// 'next' es una función que le dice a Express: "Todo está bien, continúa con la siguiente función".
const verificarToken = (req, res, next) => {
    // 1. Extraer la cabecera 'Authorization' enviada por el frontend
    const authHeader = req.header('Authorization');

    // Si no enviaron ninguna cabecera, bloqueamos el acceso
    if (!authHeader) {
        return res.status(401).json({ error: 'Acceso denegado. No se proporcionó un token de seguridad.' });
    }

    // En los estándares reales, el token se envía como: "Bearer xxxxxxx.yyyyyyy.zzzzzzz"
    // Usamos split(' ') para separar la palabra 'Bearer' del token real.
    const token = authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Formato de token inválido.' });
    }

    try {
        // 2. Verificar si el token es válido usando la misma palabra secreta del login
        const verificado = jwt.verify(token, 'CLAVE_SECRETA_SUPER_INSEGURA_PARA_PRUEBAS');
        
        // 3. PASO CLAVE: Guardamos los datos del usuario desencriptados (id, nombre, rol) 
        // dentro del objeto 'req' para que cualquier ruta que use este middleware pueda leerlos.
        req.usuario = verificado;
        
        // Le damos luz verde a Express para pasar al endpoint real
        next();
    } catch (error) {
        res.status(403).json({ error: 'Token inválido o expirado.' });
    }
};

module.exports = verificarToken;