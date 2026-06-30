const token = localStorage.getItem('token');
const rol = localStorage.getItem('usuario_rol');

if (!token || (rol !== 'operario' && rol !== 'admin')) {
    alert('Acceso no autorizado.');
    window.location.href = 'login.html';
}

document.addEventListener('DOMContentLoaded', cargarTareas);

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

            listaTareas.innerHTML = '';
            tareas.forEach(tarea => {
                const fechaFormateada = tarea.fecha_reserva.split('T')[0];

                // Definimos dinámicamente qué botón mostrar según el estado actual de la base de datos
                let botonAccion = '';
                if (tarea.estado === 'pendiente') {
                    botonAccion = `<button class="btn" style="background:#28a745; color:white; padding:5px 10px; font-size:0.85em;" onclick="actualizarEstado(${tarea.reserva_id}, 'en curso')">Iniciar</button>`;
                } else if (tarea.estado === 'en curso') {
                    botonAccion = `<button class="btn" style="background:#007bff; color:white; padding:5px 10px; font-size:0.85em;" onclick="actualizarEstado(${tarea.reserva_id}, 'finalizado')">Terminar</button>`;
                }

                const fila = `
                    <tr style="border-bottom: 1px solid #ddd;">
                        <td style="padding: 12px; font-weight: bold; color: #007bff;">${tarea.hora_reserva}</td>
                        <td style="padding: 12px;">${fechaFormateada}</td>
                        <td style="padding: 12px;">${tarea.cliente_nombre}</td>
                        <td style="padding: 12px;">${tarea.nombre_servicio}</td>
                        <td style="padding: 12px;"><span style="background: #ffeeba; color: #856404; padding: 4px 8px; border-radius: 4px; font-size: 0.9em;">${tarea.estado}</span></td>
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

//FUNCIÓN INTERACTIVA: Envía el cambio de estado mediante un método PUT

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

            // --- CANDADO DE REGLA DE NEGOCIO ---
            // Revisamos si el operario YA TIENE alguna tarea con estado 'en curso'
            const operarioOcupado = tareas.some(tarea => tarea.estado === 'en curso');

            listaTareas.innerHTML = '';
            tareas.forEach(tarea => {
                const fechaFormateada = tarea.fecha_reserva.split('T')[0];

                let botonAccion = '';
                if (tarea.estado === 'pendiente') {
                    // Si el operario está ocupado con otro carro, deshabilitamos (disabled) este botón
                    if (operarioOcupado) {
                        botonAccion = `<button class="btn btn-action btn-success" disabled title="Debes terminar tu servicio actual primero">Iniciar</button>`;
                    } else {
                        botonAccion = `<button class="btn btn-action btn-success" onclick="actualizarEstado(${tarea.reserva_id}, 'en curso')">Iniciar</button>`;
                    }
                } else if (tarea.estado === 'en curso') {
                    // El botón de terminar siempre estará activo para que pueda liberarse
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

document.getElementById('btn-cerrar-sesion').addEventListener('click', () => {
    localStorage.clear();
    window.location.href = 'login.html';
});