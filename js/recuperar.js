const recuperarForm = document.getElementById('recuperar-form');

if (recuperarForm) {
    recuperarForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const correo = document.getElementById('recuperar-correo').value.trim();
        const contenedorMensaje = document.getElementById('recuperar-mensaje');

        contenedorMensaje.innerText = '';

        try {
            const respuesta = await fetch('http://127.0.0.1:3000/api/usuarios/recuperar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ correo: correo })
            });

            const datos = await respuesta.json();

            if (respuesta.ok) {
                contenedorMensaje.style.color = 'green';
                contenedorMensaje.innerText = '✨ Solicitud procesada. Te enviaremos un enlace de recuperación si tu correo es válido.';
                recuperarForm.reset();
            } else {
                contenedorMensaje.style.color = 'red';
                contenedorMensaje.innerText = datos.error || 'No se pudo procesar la solicitud.';
            }
        } catch (error) {
            console.error('Error:', error);
            contenedorMensaje.style.color = 'red';
            contenedorMensaje.innerText = 'Sin conexión con el servidor.';
        }
    });
}