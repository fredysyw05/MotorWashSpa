// 1. VERIFICACIÓN DE SEGURIDAD EN EL FRONTEND
const token = localStorage.getItem('token');
const rol = localStorage.getItem('usuario_rol');

if (!token || (rol !== 'operario' && rol !== 'admin')) {
    alert('Acceso no autorizado.');
    window.location.href = 'login.html';
}

// Cambiamos el listener para ejecutar todas las cargas iniciales juntas
document.addEventListener('DOMContentLoaded', () => {
    establecerSaludo();
    cargarTareas();
    cargarHistorial();
});

// ==========================================
// FUNCIÓN DE APOYO: Mostrar nombre del operario
// ==========================================
function establecerSaludo() {
    // Intentamos extraer el nombre del operario del localStorage (si no existe, usa 'Carlos' por defecto)
    const nombreOperario = localStorage.getItem('userName') || 'Admin';
    const spanNombre = document.getElementById('nombre-operario');
    if (spanNombre) {
        spanNombre.textContent = nombreOperario;
    }
}

// ==========================================
// FUNCIÓN 1: Cargar tareas activas de la base de datos
// ==========================================
async function cargarTareas() {
    const idOperarioActual = localStorage.getItem('id');
    const listaTareas = document.getElementById('lista-tareas');
    const errorTarea = document.getElementById('error-tarea');

    try {
        const respuesta = await fetch('http://localhost:3000/api/operario/pendientes', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const tareas = await respuesta.json();

        // 🕵️‍♂️ ¡EL ESPÍA!: Abre la consola de tu navegador (F12) y mira qué columnas trae tu tabla
        console.log("Datos recibidos de la API (/pendientes):", tareas);

        if (respuesta.ok) {
            if (tareas.length === 0) {
                listaTareas.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px;">No hay servicios pendientes en la cola. ¡Buen trabajo! 🎉</td></tr>`;
                return;
            }

            // --- REGLA DE NEGOCIO SEGURA ---
            // Validamos dinámicamente buscando cualquier propiedad de ID común que traiga tu Backend
            const operarioOcupado = tareas.some(tarea => {
                const idAsignado = tarea.operario_id || tarea.id_operario || null;
                return tarea.estado === 'en curso' && String(idAsignado) === String(idOperarioActual);
            });

            listaTareas.innerHTML = '';
            tareas.forEach(tarea => {
                const fechaFormateada = tarea.fecha_reserva.split('T')[0];

                // Capturamos el ID del operario asignado a esta fila
                const idAsignado = tarea.operario_id || tarea.id_operario || null;

                let botonAccion = '';
                if (tarea.estado === 'pendiente') {
                    if (operarioOcupado) {
                        botonAccion = `<button class="btn btn-action btn-success" disabled title="Debes terminar tu servicio actual primero">Iniciar</button>`;
                    } else {
                        botonAccion = `<button class="btn btn-action btn-success" onclick="actualizarEstado(${tarea.reserva_id}, 'en curso')">INICIAR</button>`;
                    }
                } else if (tarea.estado === 'en curso') {

                    // 🕵️‍♂️ EL DETECTIVE: Abre la consola (F12) y mira qué números se están imprimiendo aquí
                    console.log(`🔍 RESERVA #${tarea.reserva_id} -> Asignado en BD: ${idAsignado} (${typeof idAsignado}) | Tu ID en Sesión: ${idOperarioActual} (${typeof idOperarioActual})`);

                    // 1️⃣ CASO A: El servicio no tiene ningún operario asignado en la BD (Viene NULL o vacío)
                    if (!idAsignado) {
                        // Por seguridad, si está en curso pero quedó huérfano, permitimos que lo termines para que no se trabe
                        botonAccion = `<button class="btn btn-action btn-info" onclick="actualizarEstado(${tarea.reserva_id}, 'finalizado')">TERMINAR</button>`;
                    } 
                    // 2️⃣ CASO B: El ID asignado coincide perfectamente con tu ID de sesión
                    else if (String(idAsignado) === String(idOperarioActual)) {
                        botonAccion = `<button class="btn btn-action btn-info" onclick="actualizarEstado(${tarea.reserva_id}, 'finalizado')">TERMINAR</button>`;
                    } 
                    // 3️⃣ CASO C: El ID le pertenece a otro compañero operario
                    else {
                        botonAccion = `<button class="btn btn-action btn-secondary" disabled title="Este servicio lo está atendiendo otro operario">OCUPADO</button>`;
                    }
                }

                const fila = `
                    <tr style="border-bottom: 1px solid #ddd;">
                        <td style="padding: 12px; font-weight: bold; color: #007bff;">${tarea.hora_reserva}</td>
                        <td style="padding: 12px;">${fechaFormateada}</td>
                        <td style="padding: 12px;">${tarea.cliente_nombre}</td>
                        <td style="padding: 12px;">${tarea.nombre_servicio}</td>
                        <td style="padding: 12px;"><span class="badge badge-${tarea.estado.replace(' ', '-')}">${tarea.estado.toUpperCase()}</span></td>
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
// FUNCIÓN 2: Cargar historial de trabajos ya realizados
// ==========================================
async function cargarHistorial() {
    const listaHistorial = document.getElementById('lista-historial');
    const errorHistorial = document.getElementById('error-historial');
    
    try {
        // Apuntamos al endpoint que manejará el historial de terminados
        const respuesta = await fetch('http://localhost:3000/api/operario/historial', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const historial = await respuesta.json();

        if (respuesta.ok) {
            if (historial.length === 0) {
                listaHistorial.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color: #666;">Aún no has registrado trabajos completados hoy.</td></tr>`;
                return;
            }

            listaHistorial.innerHTML = '';

            historial.forEach(tarea => {
                const fechaFormateada = tarea.fecha_reserva.split('T')[0];


                let claseBadge = 'badge-exito';
                if (tarea.estado === 'cancelado') {
                    claseBadge = 'badge-peligro';
                } else if (tarea.estado === 'pendiente') {
                    claseBadge = 'badge-pendiente';
                } else if (tarea.estado === 'en curso') {
                    claseBadge = 'badge-en-curso';
                }

                const fila = `
                <tr style="border-bottom: 1px solid #ddd; background-color: #fafafa;">
                    <td style="padding: 12px; color: #555;">${tarea.hora_reserva}</td>
                    <td style="padding: 12px; color: #555;">${fechaFormateada}</td>
                    <td style="padding: 12px; color: #555;">${tarea.cliente_nombre}</td>
                    <td style="padding: 12px; color: #555;">${tarea.nombre_servicio}</td>
                    <td style="padding: 12px;"><span class="badge ${claseBadge}">${tarea.estado.toUpperCase()}</span></td>
                </tr>
            `;
                listaHistorial.innerHTML += fila;
            });
        } else {
            errorHistorial.innerText = historial.error || 'No se pudo cargar el historial.';
        }
    } catch (error) {
        console.error('Error al conectar con la API de historial:', error);
        errorHistorial.innerText = 'Error al conectar con el servidor para obtener el historial.';
    }
}

// ==========================================
// FUNCIÓN 3: Comunicarse con la API para actualizar (MÉTODO PUT)
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
            // Refrescamos ambas tablas para que la tarea desaparezca de una y aparezca en la otra de inmediato
            cargarTareas();
            cargarHistorial();
        } else {
            alert(datos.error);
        }
    } catch (error) {
        console.error('Error al actualizar la tarea:', error);
        alert('No se pudo comunicar con el servidor para cambiar el estado.');
    }
}

// 4. LOGOUT
document.getElementById('btn-cerrar-sesion').addEventListener('click', () => {
    localStorage.clear();
    window.location.href = 'login.html';
});