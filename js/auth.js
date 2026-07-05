// 🕵️‍♂️ Revisamos si la URL trae algún motivo especial
const parametrosUrl = new URLSearchParams(window.location.search);
const motivo = parametrosUrl.get('motivo');
const cajaMensaje = document.getElementById('login-mensaje');

if (motivo === 'reservar' && cajaMensaje) {
    // Pintamos un banner elegante con tus estilos nativos
    cajaMensaje.style.color = '#e67e22'; // Un tono naranja/alerta profesional
    cajaMensaje.style.background = '#fdf2e9'; // Fondo suave para que resalte
    cajaMensaje.style.padding = '10px';
    cajaMensaje.style.borderRadius = '5px';
    cajaMensaje.style.border = '1px solid #f5cba7';
    cajaMensaje.innerText = '🔒 Para agendar tu cita en Motor Wash Spa, por favor inicia sesión primero.';
}
// Capturamos el formulario de forma segura
const loginForm = document.getElementById('login-form');

// Verificación de seguridad para desarrollo
if (!loginForm) {
    console.error("❌ ERROR CRÍTICO: No se encontró ningún elemento <form> con el ID 'login-form' en tu HTML.");
} else {
    // Solo si existe el formulario, agregamos el listener
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Detiene la recarga del formulario inmediatamente

        const correo = document.getElementById('login-correo').value;
        const password = document.getElementById('login-password').value;
        const contenedorMensaje = document.getElementById('login-mensaje');

        try {
            const respuesta = await fetch('http://localhost:3000/api/usuarios/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ correo: correo, password: password })
            });

            const datos = await respuesta.json();

            if (respuesta.ok) {
                contenedorMensaje.style.color = 'green';
                contenedorMensaje.innerText = `¡Bienvenido de nuevo, ${datos.usuario.nombre}!`;

                // Guardamos los datos claves para el ecosistema frontend de Motor Wash Spa
                localStorage.setItem('token', datos.token);
                localStorage.setItem('usuario_rol', datos.usuario.role || datos.usuario.rol);
                localStorage.setItem('userName', datos.usuario.nombre);

                setTimeout(() => {
                    if (datos.usuario.rol === 'operario') {
                        window.location.href = 'operario.html'; // Redirección correcta corregida
                    } else {
                        // ... (Aquí guardas tu token, userName y usuario_rol en el localStorage) ...

                        // 🕵️‍♂️ Leemos si venía un servicio y un motivo en la URL de login
                        const parametrosUrl = new URLSearchParams(window.location.search);
                        const motivo = parametrosUrl.get('motivo');
                        const servicioId = parametrosUrl.get('service');

                        if (motivo === 'reservar') {
                            // 🔥 Si venía a reservar, lo devolvemos allá manteniendo el ID de su servicio
                            window.location.href = servicioId ? `reservations.html?service=${servicioId}` : 'reservations.html';
                        } else {
                            // Si entró al login de forma normal por el menú, va al index
                            window.location.href = 'index.html';
                        }
                    }
                }, 1500);

            } else {
                contenedorMensaje.style.color = 'red';
                contenedorMensaje.innerText = datos.error || 'Usuario o contraseña incorrectos';
            }

        } catch (error) {
            console.error('Error al conectar con la API:', error);
            if (contenedorMensaje) {
                contenedorMensaje.style.color = 'red';
                contenedorMensaje.innerText = 'No se pudo conectar con el servidor backend.';
            }
        }
    });
}

// ======= LÓGICA PARA MOSTRAR / OCULTAR CONTRASEÑA EN EL LOGIN =======
const botonOjoLogin = document.getElementById('toggle-login-pass');
const inputPassLogin = document.getElementById('login-password');

if (botonOjoLogin && inputPassLogin) {
    botonOjoLogin.addEventListener('click', () => {
        // Alternamos el tipo de input entre password y text
        if (inputPassLogin.type === 'password') {
            inputPassLogin.type = 'text';
            botonOjoLogin.innerText = '🙈'; // Cambia al monito para indicar que se puede ocultar
        } else {
            inputPassLogin.type = 'password';
            botonOjoLogin.innerText = '👁️'; // Vuelve al ojo original
        }
    });
}