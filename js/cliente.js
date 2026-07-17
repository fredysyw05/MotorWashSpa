document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');

    // 🛡️ Escudo de seguridad: Si no está logueado, patitas para la calle (al login)
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // Configurar cierre de sesión en este panel
    const logoutBtn = document.getElementById('nav-logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.clear();
            window.location.href = 'index.html';
        });
    }

    try {
        // 1. Solicitar datos del panel al backend
        const respuesta = await fetch('http://127.0.0.1:3000/api/usuarios/mi-panel', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!respuesta.ok) {
            throw new Error('Sesión inválida o expirada.');
        }

        const datos = await respuesta.json();
        // 👇 AGREGA ESTA LÍNEA DE DIAGNÓSTICO temporalmente:
        const { perfil, reservas } = datos;
        console.log("RESERVAS RECIBIDAS DEL BACKEND:", reservas);

        // 2. Renderizar Datos de Perfil
        document.getElementById('perf-nombre').innerText = perfil.nombre;
        document.getElementById('perf-correo').innerText = perfil.correo;
        document.getElementById('perf-telefono').innerText = perfil.telefono;
        document.getElementById('perf-placa').innerText = perfil.placa ? perfil.placa : 'SIN PLACA';

        // 3. Separar Reservas Activas e Historial (Pendiente vs Finalizado)
        const activas = reservas.filter(r => r.estado !== 'finalizado' && r.estado !== 'cancelado');
        const completadas = reservas.filter(r => r.estado === 'finalizado' || r.estado === 'cancelado');

        renderizarReservasActivas(activas);
        renderizarHistorial(completadas);

    } catch (error) {
        console.error('Error al cargar panel:', error);
        localStorage.clear();
        window.location.href = 'login.html';
    }
});

// Función para pintar las citas programadas (con precio colombiano)
function renderizarReservasActivas(citas) {
    const contenedor = document.getElementById('reservas-activas-contenedor');
    contenedor.innerHTML = '';

    if (citas.length === 0) {
        contenedor.innerHTML = `
            <p style="color: #7f8c8d; grid-column: 1 / -1; text-align: center; padding: 20px; background: #f9f9f9; border-radius: 8px;">
                No tienes citas pendientes programadas. ¡Anímate a agendar una!
            </p>`;
        return;
    }

    citas.forEach(cita => {
        // Formatear la fecha de manera legible
        const fechaLegible = new Date(cita.fecha).toLocaleDateString('es-ES', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });

        // 💵 Formateador oficial colombiano: $25.000 COP
        const precioFormateado = cita.precio
            ? new Intl.NumberFormat('es-CO', {
                style: 'currency',
                currency: 'COP',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(cita.precio)
            : 'Precio no disponible';

        const card = document.createElement('div');
        card.style = `background: #fdfefe; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; box-shadow: 0 2px 5px rgba(0,0,0,0.02); display: flex; flex-direction: column; justify-content: space-between;`;
        card.innerHTML = `
            <div>
                <h4 style="margin: 0 0 5px 0; color: #2c3e50; font-size: 1.1rem;">🚗 ${cita.servicio_nombre}</h4>
                <p style="margin: 0; font-size: 0.85rem; color: #7f8c8d;">📅 ${fechaLegible}</p>
                <p style="margin: 5px 0 0 0; font-size: 0.85rem; color: #7f8c8d;">⏰ Hora: <strong>${cita.hora}</strong></p>
                <!-- Precio formateado al estilo colombiano -->
                <p style="margin: 5px 0 0 0; font-size: 0.85rem; color: #27ae60; font-weight: bold;">💵 Valor: ${precioFormateado}</p>
                
                <span style="display: inline-block; margin-top: 10px; padding: 3px 8px; font-size: 0.75rem; font-weight: bold; border-radius: 12px; background: #ebf5fb; color: #2980b9; text-transform: uppercase;">
                    ${cita.estado}
                </span>
            </div>
            <button onclick="cancelarCita(${cita.id})" class="btn btn-danger" style="margin-top: 15px; width: 100%; padding: 6px; font-size: 0.8rem; border-radius: 5px;">
                Cancelar Cita
            </button>
        `;
        contenedor.appendChild(card);
    });
}

// Función para pintar el historial de servicios pasados (con precio colombiano)
function renderizarHistorial(citas) {
    const contenedor = document.getElementById('historial-contenedor');
    contenedor.innerHTML = '';

    if (citas.length === 0) {
        contenedor.innerHTML = `
            <p style="color: #7f8c8d; text-align: center; padding: 20px; background: #f9f9f9; border-radius: 8px;">
                Aún no has completado servicios con nosotros.
            </p>`;
        return;
    }

    const tabla = document.createElement('table');
    tabla.style = "width: 100%; border-collapse: collapse; margin-top: 10px; text-align: left;";
    tabla.innerHTML = `
        <thead>
            <tr style="border-bottom: 2px solid #eee; color: #7f8c8d; font-size: 0.9rem;">
                <th style="padding: 12px;">Servicio</th>
                <th style="padding: 12px;">Fecha</th>
                <th style="padding: 12px;">Precio</th>
                <th style="padding: 12px;">Estado</th>
            </tr>
        </thead>
        <tbody id="tabla-historial-body"></tbody>
    `;
    contenedor.appendChild(tabla);

    const tbody = document.getElementById('tabla-historial-body');

    citas.forEach(cita => {
        const fechaLegible = new Date(cita.fecha).toLocaleDateString('es-ES');

        // 💵 Formateador oficial colombiano para la tabla del historial: $25.000 COP
        const precioFormateado = cita.precio
            ? new Intl.NumberFormat('es-CO', {
                style: 'currency',
                currency: 'COP',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(cita.precio)
            : '$0 COP';
        const fila = document.createElement('tr');
        fila.style = "border-bottom: 1px solid #f2f2f2; font-size: 0.95rem; color: #555;";

        // Ajustamos la verificación de estado por si las moscas con minúsculas
        const estadoLimpio = cita.estado ? cita.estado.toLowerCase() : '';
        const colorEstado = (estadoLimpio === 'completado' || estadoLimpio === 'finalizado') ? '#2ecc71' : '#e74c3c';
        fila.innerHTML = `
            <td style="padding: 12px; font-weight: bold;">🏍️${cita.servicio_nombre}</td>
            <td style="padding: 12px;">${fechaLegible}</td>
            <!-- Usamos el precio formateado aquí -->
            <td style="padding: 12px; font-weight: bold; color: #2c3e50;">${precioFormateado}</td>
            <td style="padding: 12px; font-weight: bold; color: ${colorEstado}; text-transform: uppercase;">
                ${cita.estado}
            </td>
        `;
        tbody.appendChild(fila);
    });
}

// Función global para cancelar reservas con SweetAlert2
async function cancelarCita(idCita) {
    // 1. Ventana de confirmación
    const resultado = await Swal.fire({
        title: '¿Estás seguro?',
        text: '¿Deseas cancelar esta reserva? Esta acción no se puede deshacer.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',    // Color rojo para el botón de confirmar
        cancelButtonColor: '#3085d6',   // Color azul para cancelar
        confirmButtonText: 'Sí, cancelar',
        cancelButtonText: 'No, mantener'
    });

    // Si el usuario le dio a "No, mantener" o cerró la ventana, paramos aquí
    if (!resultado.isConfirmed) {
        return;
    }

    const token = localStorage.getItem('token');

    try {
        const respuesta = await fetch(`http://127.0.0.1:3000/api/reservas/cancelar/${idCita}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (respuesta.ok) {
            // 2. Alerta de éxito
            await Swal.fire({
                title: '¡Cancelada!',
                text: 'La reserva ha sido cancelada con éxito.',
                icon: 'success',
                confirmButtonText: 'Aceptar'
            });

            location.reload(); // Se recarga para refrescar la lista
        } else {
            const error = await respuesta.json();
            // 3. Alerta de error (respuesta del servidor)
            Swal.fire({
                title: 'Error',
                text: error.error || 'No se pudo cancelar la cita.',
                icon: 'error',
                confirmButtonText: 'Entendido'
            });
        }
    } catch (error) {
        console.error('Error al cancelar:', error);
        // 4. Alerta de error de conexión estética
        Swal.fire({
            title: 'Error de conexión',
            text: 'No se pudo establecer conexión con el servidor.',
            icon: 'error',
            confirmButtonText: 'Cerrar'
        });
    }
}