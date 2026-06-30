const mysql = require('mysql2');
const pool = mysql.createPool({
    host: 'localhost',      // Tu servidor local (XAMPP)
    user: 'root',           // Usuario por defecto de XAMPP
    password: 'Mercury920525*',           // Contraseña por defecto de XAMPP (vacía)
    database: 'motor_wash_spa', // Nombre exacto de la BD que creamos
    waitForConnections: true,
    connectionLimit: 10,    // Máximo 10 conexiones simultáneas abiertas
    queueLimit: 0
});
module.exports = pool.promise();
