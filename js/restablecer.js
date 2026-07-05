const restablecerForm = document.getElementById('restablecer-form');

if (restablecerForm) {
    restablecerForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        // 1. Extraer el token directamente de la barra de direcciones de la pestaña
        const parametrosUrl = new URLSearchParams(window.location.search);
        const token = parametrosUrl.get('token');

        const nuevaPass = document.getElementById('nueva-pass').value;
        const confirmarPass = document.getElementById('confirmar-pass').value;
        const contenedorMensaje = document.getElementById('restablecer-mensaje');

        contenedorMensaje.innerText = '';

        // 🛑 Validación básica en caliente: ¿Coinciden las claves?
        if (nuevaPass !== confirmarPass) {
            contenedorMensaje.style.color = 'red';
            contenedorMensaje.innerText = '⚠️ Las contraseñas ingresadas no coinciden.';
            return;
        }

        if (!token) {
            contenedorMensaje.style.color = 'red';
            contenedorMensaje.innerText = '❌ Token de recuperación ausente o corrupto. Solicita un nuevo enlace.';
            return;
        }

        try {
            // 2. Despachar la petición POST al backend
            const respuesta = await fetch('http://127.0.0.1:3000/api/usuarios/restablecer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: token,
                    password: nuevaPass
                })
            });

            const datos = await respuesta.json();

            if (respuesta.ok) {
                contenedorMensaje.style.color = 'green';
                contenedorMensaje.innerText = '✨ ¡Contraseña actualizada con éxito! Redirigiéndote al Login...';

                // Bloqueamos el formulario
                restablecerForm.querySelector('button[type="submit"]').disabled = true;

                // Redirección amigable tras 3 segundos
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 3000);
            } else {
                contenedorMensaje.style.color = 'red';
                contenedorMensaje.innerText = datos.error || 'No se pudo restablecer la contraseña.';
            }

        } catch (error) {
            console.error('Error de red:', error);
            contenedorMensaje.style.color = 'red';
            contenedorMensaje.innerText = 'Sin respuesta del servidor de Motor Wash Spa.';
        }
    });
}