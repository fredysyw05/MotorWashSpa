// 1. COMPROBACIÓN DE SEGURIDAD AL CARGAR LA PÁGINA
// Revisamos si el usuario tiene un token guardado en el localStorage
const token = localStorage.getItem('token');

if (!token) {
    // Si no hay token, el usuario no se ha autenticado. Lo redirigimos al login.
    alert('Debes iniciar sesión para poder agendar una reserva.');
    window.location.href = 'login.html';
}

// ... (Aquí está tu comprobación del token)

// --- CAPA DE SEGURIDAD FRONTEND: EVITAR FECHAS PASADAS ---
const inputFecha = document.getElementById('reserva-fecha');

if (inputFecha) {
    // Obtenemos la fecha actual del sistema
    const hoy = new Date();

    // Formateamos la fecha a YYYY-MM-DD teniendo en cuenta el desfase de zona horaria
    const año = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0'); // Los meses van de 0 a 11
    const dia = String(hoy.getDate()).padStart(2, '0');

    const fechaMinima = `${año}-${mes}-${dia}`;

    // Le asignamos el valor mínimo al input del HTML
    inputFecha.min = fechaMinima;

    // Opcional: Podemos hacer que por defecto aparezca seleccionada la fecha de hoy
    inputFecha.value = fechaMinima;
}

// 2. CAPTURA DEL EVENTO DE ENVÍO DEL FORMULARIO
document.getElementById('reserva-form').addEventListener('submit', async (event) => {
    event.preventDefault(); // Evitamos que la página se recargue

    // Capturamos los datos de los inputs
    const servicioId = document.getElementById('servicio-select').value;
    const fecha = document.getElementById('reserva-fecha').value;
    const hora = document.getElementById('reserva-hora').value;
    const contenedorMensaje = document.getElementById('reserva-mensaje');
    // --- CAPA DE SEGURIDAD FRONTEND: VALIDAR HORA DE HOY ---
    const ahora = new Date();
    const añoActual = ahora.getFullYear();
    const mesActual = String(ahora.getMonth() + 1).padStart(2, '0');
    const diaActual = String(ahora.getDate()).padStart(2, '0');
    const fechaHoyString = `${añoActual}-${mesActual}-${diaActual}`;

    // Si la fecha seleccionada es HOY, comparamos las horas
    if (fecha === fechaHoyString) {
        const horaActualString = String(ahora.getHours()).padStart(2, '0') + ":" + String(ahora.getMinutes()).padStart(2, '0');

        if (hora < horaActualString) {
            contenedorMensaje.style.color = 'red';
            contenedorMensaje.innerText = 'La hora seleccionada ya pasó. Elige una hora posterior.';
            return; // Detiene el envío del formulario
        }
    }
    try {
        // 3. ENVIAR LA PETICIÓN CON EL TOKEN DE SEGURIDAD
        // Usamos fetch() apuntando al endpoint protegido que acabas de probar
        const respuesta = await fetch('http://localhost:3000/api/reservas', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // PASO ULTRA IMPORTANTE: Aquí adjuntamos el token usando el estándar Bearer
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                servicio_id: parseInt(servicioId), // Lo convertimos a entero como lo espera MySQL
                fecha_reserva: fecha,
                hora_reserva: hora + ":00" // Formateamos la hora para que MySQL la acepte (HH:MM:SS)
            })
        });

        const datos = await respuesta.json();

        if (respuesta.ok) {
            // ¡Reserva exitosa en el servidor y base de datos!
            contenedorMensaje.style.color = 'green';
            contenedorMensaje.innerText = datos.mensaje;

            // Limpiamos el formulario para que quede libre
            document.getElementById('reserva-form').reset();
        } else {
            // El servidor detectó un problema (ej: token vencido o datos incompletos)
            contenedorMensaje.style.color = 'red';
            contenedorMensaje.innerText = datos.error;
        }

    } catch (error) {
        console.error('Error al conectar con la API de reservas:', error);
        contenedorMensaje.style.color = 'red';
        contenedorMensaje.innerText = 'No se pudo conectar con el servidor backend.';
    }
});