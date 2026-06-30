// Escuchamos cuando el formulario se envíe
document.getElementById('login-form').addEventListener('submit', async (event) => {
    // 1. Evitamos que la página se recargue (comportamiento por defecto de los formularios)
    event.preventDefault();

    // 2. Capturamos los valores que el usuario escribió en las cajas de texto
    const correo = document.getElementById('login-correo').value;
    const password = document.getElementById('login-password').value;
    const contenedorMensaje = document.getElementById('login-mensaje');

    try {
        // 3. Hacemos la petición HTTP POST real a nuestro endpoint de Node.js
        const respuesta = await fetch('http://localhost:3000/api/usuarios/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json' // Le aclaramos al servidor que le enviamos un JSON
            },
            body: JSON.stringify({ correo: correo, password: password }) // Convertimos el objeto a texto JSON
        });

        const datos = await respuesta.json();

        if (respuesta.ok) {
            // ¡Login exitoso!
            contenedorMensaje.style.color = 'green';
            contenedorMensaje.innerText = `¡Bienvenido de nuevo, ${datos.usuario.nombre}!`;

            // 4. PASO CLAVE: Guardamos el Token en el almacenamiento del navegador (localStorage).
            // Esto es exactamente lo mismo que harás en Android guardándolo en las SharedPreferences.
            // El token se mantendrá guardado aunque cierres el navegador.
            localStorage.setItem('token', datos.token);
            localStorage.setItem('usuario_rol', datos.usuario.rol);

            // Redireccionar según el rol después de 1.5 segundos
            setTimeout(() => {
                if (datos.usuario.rol === 'operario') {
                    window.location.href = 'index.html'; // Aquí crearías luego la vista del operario
                } else {
                    window.location.href = 'index.html';
                }
            }, 1500);

        } else {
            // El servidor respondió con un error (ej: 401 credenciales incorrectas)
            contenedorMensaje.style.color = 'red';
            contenedorMensaje.innerText = datos.error;
        }

    } catch (error) {
        console.error('Error al conectar con la API:', error);
        contenedorMensaje.style.color = 'red';
        contenedorMensaje.innerText = 'No se pudo conectar con el servidor backend.';
    }
});