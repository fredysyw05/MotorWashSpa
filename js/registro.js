// Capturamos el formulario de registro de forma segura
const registroForm = document.getElementById('registro-form');

if (!registroForm) {
    console.error("❌ ERROR: No se encontró el elemento <form> con el ID 'registro-form'.");
} else {
    registroForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Evita que la página se recargue

        // 1. Capturamos los valores de los inputs del formulario
        const nombre = document.getElementById('reg-nombre').value.trim();
        const correo = document.getElementById('reg-correo').value.trim();
        const telefono = document.getElementById('reg-telefono').value.trim();
        const direccion = document.getElementById('reg-direccion').value.trim();
        const placa = document.getElementById('reg-placa').value.trim().toUpperCase();
        const password = document.getElementById('reg-password').value;
        const confirmPassword = document.getElementById('reg-confirm-password').value; // 🔥 Capturado
        const contenedorMensaje = document.getElementById('registro-mensaje');

        // Limpieza de mensajes anteriores
        contenedorMensaje.innerText = '';

        // 🛑VALIDACIÓN: Detener el envío si las claves no coinciden
        if (password !== confirmPassword) {
            contenedorMensaje.style.color = 'red';
            contenedorMensaje.innerText = '⚠️ Las contraseñas ingresadas no coinciden. Por favor, verifícalas.';
            return; // Corta la ejecución aquí mismo y no envía nada al backend
        }
        // 👇 COLOQUEMOS ESTE DETECTOR AQUÍ
        try {
            const respuesta = await fetch('http://127.0.0.1:3000/api/usuarios/registro', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    nombre: nombre,
                    correo: correo,
                    telefono: telefono,
                    direccion: direccion,
                    password: password,
                    placa: placa || null
                    // El rol no se envía; el backend lo asignará como 'cliente' por defecto
                })
            });

            const datos = await respuesta.json();

            //Evaluamos la respuesta del servidor Node.js
            if (respuesta.ok) {
                contenedorMensaje.style.color = 'green';
                // Dejamos un mensaje claro sobre el estándar de verificación por correo
                contenedorMensaje.innerHTML = `✨ ¡Registro exitoso, ${nombre}!<br>Te hemos enviado un correo de verificación. Por favor revisa tu bandeja de entrada.`;

                // Se deshabila el botón para evitar múltiples envíos accidentales
                registroForm.querySelector('button[type="submit"]').disabled = true;

                //Redirección estratégica al login tras 3.5 segundos despues del aviso.
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 3500);

            } else {
                // Respuesta del backend (Correo ya registrado)
                contenedorMensaje.style.color = 'red';
                contenedorMensaje.innerText = datos.error || 'No se pudo completar el registro.';
            }

        } catch (error) {
            console.error('❌ Error de red al intentar registrar:', error);
            if (contenedorMensaje) {
                contenedorMensaje.style.color = 'red';
                contenedorMensaje.innerText = 'No hay conexión con el servidor de Motor Wash Spa.';
            }
        }
    });
}
// Función reutilizable para alternar la visibilidad de las contraseñas.
function configurarTogglePassword(idBoton, idInput) {
    const botonOjo = document.getElementById(idBoton);
    const inputPass = document.getElementById(idInput);

    if (botonOjo && inputPass) {
        botonOjo.addEventListener('click', () => {
            // Se evalua el tipo actual y se cambia al opuesto
            if (inputPass.type === 'password') {
                inputPass.type = 'text';
                botonOjo.innerText = '🙈';
            } else {
                inputPass.type = 'password';
                botonOjo.innerText = '👁️';
            }
        });
    }
}

// Activacion de la función para ambos campos de la interfaz
configurarTogglePassword('toggle-pass-1', 'reg-password');
configurarTogglePassword('toggle-pass-2', 'reg-confirm-password');