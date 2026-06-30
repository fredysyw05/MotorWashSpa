// 1. VERIFICACIÓN DE SEGURIDAD EN EL FRONTEND
const token = localStorage.getItem('token');
const rol = localStorage.getItem('usuario_rol');

if (!token || (rol !== 'operario' && rol !== 'admin')) {
    alert('Acceso no autorizado.');
    window.location.href = 'login.html';
}

// Escuchamos el evento de carga para renderizar la tabla
document.addEventListener('DOMContentLoaded', cargarTareas);

// ==========================================
// FUNCIÓN 1: Cargar tareas de la base de datos
// ==========================================
async function cargarTareas() {
    const listaTareas = document.getElementById('lista-tareas');
    const errorTarea = document.getElementById('error-tarea');

    try {
        const respuesta = await fetch('http://localhost:3000/api/operario/pendientes', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const tareas = await respuesta.json();

        if (respuesta.ok) {
            if (tareas.length === 0) {
                listaTareas.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px;">No hay servicios pendientes en la cola. ¡Buen trabajo! 🎉</td></tr>`;
                return;
            }

            // --- REGLA DE NEGOCIO ---
            // Validamos si el operario ya tiene un vehículo 'en curso'
            const operarioOcupado = tareas.some(tarea => tarea.estado === 'en curso');

            listaTareas.innerHTML = '';
            tareas.forEach(tarea => {
                const fechaFormateada = tarea.fecha_reserva.split('T')[0];

                let botonAccion = '';
                if (tarea.estado === 'pendiente') {
                    if (operarioOcupado) {
                        // Si está ocupado, bloqueamos las otras opciones
                        botonAccion = `<button class="btn btn-action btn-success" disabled title="Debes terminar tu servicio actual primero">Iniciar</button>`;
                    } else {
                        botonAccion = `<button class="btn btn-action btn-success" onclick="actualizarEstado(${tarea.reserva_id}, 'en curso')">Iniciar</button>`;
                    }
                } else if (tarea.estado === 'en curso') {
                    botonAccion = `<button class="btn btn-action btn-info" onclick="actualizarEstado(${tarea.reserva_id}, 'finalizado')">Terminar</button>`;
                }

                const fila = `
                    <tr style="border-bottom: 1px solid #ddd;">
                        <td style="padding: 12px; font-weight: bold; color: #007bff;">${tarea.hora_reserva}</td>
                        <td style="padding: 12px;">${fechaFormateada}</td>
                        <td style="padding: 12px;">${tarea.cliente_nombre}</td>
                        <td style="padding: 12px;">${tarea.nombre_servicio}</td>
                        <td style="padding: 12px;"><span class="badge-${tarea.estado.replace(' ', '-')}">${tarea.estado}</span></td>
                        <td style="padding: 12px; text-align: center;">${botonAccion}</td>
                    </tr>
                `;
                listaTareas.innerHTML += fila;
            });
        } else {
            errorTarea.innerText = tareas.error;
        }
    } catch (error) {
        console.error('Error al conectar con la API de operarios:', error);
        errorTarea.innerText = 'Error al conectar con el servidor.';
    }
}

// ==========================================
// FUNCIÓN 2: Comunicarse con la API para actualizar (MÉTODO PUT)
// ==========================================
async function actualizarEstado(reservaId, nuevoEstado) {
    try {
        const respuesta = await fetch(`http://localhost:3000/api/operario/reservas/${reservaId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ nuevo_estado: nuevoEstado })
        });

        const datos = await respuesta.json();

        if (respuesta.ok) {
            // Refrescamos la tabla dinámicamente si el servidor responde OK
            cargarTareas(); 
        } else {
            alert(datos.error);
        }
    } catch (error) {
        console.error('Error al actualizar la tarea:', error);
        alert('No se pudo comunicar con el servidor para cambiar el estado.');
    }
}

// 3. LOGOUT
document.getElementById('btn-cerrar-sesion').addEventListener('click', () => {
    localStorage.clear();
    window.location.href = 'login.html';
});