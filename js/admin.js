// VERIFICACIÓN DE SEGURIDAD
const token = localStorage.getItem('token');
const rol = localStorage.getItem('usuario_role') || localStorage.getItem('usuario_rol'); // Soporta ambas variantes de llave

if (!token || rol !== 'admin') {
    alert('Acceso denegado. Se requieren credenciales de administrador.');
    window.location.href = 'login.html';
}

document.addEventListener('DOMContentLoaded', () => {
    establecerSaludoAdmin();
    inicializarPestañas();
    inicializarFiltrosHistorial();

    //Cargamos los operarios reales en el select apenas abra el panel
    cargarOperariosEnDropdown();

    // Carga inicial por defecto
    cargarMetricasDía();
});

function establecerSaludoAdmin() {
    const nombreAdmin = localStorage.getItem('userName') || 'Admin';
    const spanNombre = document.getElementById('nombre-admin');
    if (spanNombre) spanNombre.textContent = nombreAdmin;
}

// 2. SISTEMA INTERACTIVO DE PESTAÑAS
function inicializarPestañas() {
    const botones = document.querySelectorAll('.tab-btn');
    const secciones = document.querySelectorAll('.admin-section');

    botones.forEach(btn => {
        btn.addEventListener('click', () => {
            const objetivo = btn.getAttribute('data-target');

            // Cambiar estados activos en la navegación
            botones.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Intercambiar visibilidad de las capas
            secciones.forEach(sec => {
                if (sec.id === objetivo) {
                    sec.classList.add('active');
                    ejecutarCargasPorSeccion(objetivo);
                } else {
                    sec.classList.remove('active');
                }
            });
        });
    });
}

// Ejecución controlada según la pestaña visible
function ejecutarCargasPorSeccion(idSeccion) {
    if (idSeccion === 'sec-resumen') cargarMetricasDía();
    if (idSeccion === 'sec-monitoreo') cargarMonitoreoVivo();
    if (idSeccion === 'sec-reportes') cargarHistorialGlobal();
}

// ==========================================
// FORMULARIO: Envío seguro a tu endpoint existente
// ==========================================
const formOperario = document.getElementById('form-registro-operario');
if (formOperario) {
    formOperario.addEventListener('submit', async (e) => {
        e.preventDefault();

        const datosOperario = {
            nombre: document.getElementById('op-nombre').value,
            correo: document.getElementById('op-correo').value,
            password: document.getElementById('op-password').value,
            telefono: document.getElementById('op-telefono').value,
            direccion: document.getElementById('op-direccion').value
        };

        try {
            const respuesta = await fetch('http://127.0.0.1:3000/api/admin/registrar-operario', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(datosOperario)
            });

            const resultado = await respuesta.json();

            if (respuesta.ok) {
                mostrarNotificacion(resultado.mensaje, 'exito');
                formOperario.reset();
            } else {
                mostrarNotificacion(resultado.error, 'error');
            }
        } catch (error) {
            console.error('Error al registrar operario:', error);
            alert('Fallo en la comunicación con el servidor de Motor Wash.');
        }
    });
}

// ==========================================
// CONNECT FRONT-BACK: Funciones de Carga de Datos
// ==========================================

async function cargarMetricasDía() {
    console.log('Solicitando contadores dinámicos...');
    try {
        const respuesta = await fetch('http://127.0.0.1:3000/api/admin/resumen', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!respuesta.ok) throw new Error('Error en respuesta de métricas');
        const data = await respuesta.json();

        // Formateador de moneda colombiana integrado
        const formatearMoneda = (valor) => new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            maximumFractionDigits: 0
        }).format(valor);

        // Mapeo directo a los IDs que actualizamos en tu HTML
        document.getElementById('servicios-hoy').textContent = data.financiero.servicios_completados_hoy;
        document.getElementById('ingresos-hoy').textContent = formatearMoneda(data.financiero.ingresos_hoy);
        document.getElementById('pendientes-hoy').textContent = data.monitoreo_rapido.pendientes;
        document.getElementById('en-curso-hoy').textContent = data.monitoreo_rapido.en_curso;
        document.getElementById('total-clientes').textContent = data.comunidad.clientes_registrados;
        document.getElementById('total-operarios').textContent = data.comunidad.operarios_activos;

        // Inyección dinámica del Top 3 de Servicios
        const listaTop = document.getElementById('top-servicios-lista');
        if (listaTop) {
            listaTop.innerHTML = data.top_servicios.map((item, idx) => `
                <li style="margin-bottom: 8px; font-size: 0.95rem;">
                    <span style="background: #3B7DD8; color: white; padding: 2px 7px; border-radius: 50%; font-weight: bold; margin-right: 5px;">${idx + 1}</span>
                    <strong>${item.nombre_servicio}</strong> — 
                    <span style="color: #666;">${item.total_ventas} lavados exitosos</span>
                </li>
            `).join('');
        }

    } catch (error) {
        console.error('❌ Error al mapear métricas en el panel:', error);
    }
}

// ==========================================
// FUNCIÓN PARA CARGAR EL MONITOREO EN VIVO
// ==========================================
async function cargarMonitoreoVivo() {
    console.log('🔍 Iniciando carga de monitoreo (Estilo unificado)...');
    try {
        const respuesta = await fetch('http://127.0.0.1:3000/api/admin/monitoreo', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!respuesta.ok) throw new Error('Fallo al cargar el monitoreo');

        const reservas = await respuesta.json();
        const tablaBody = document.getElementById('lista-monitoreo');

        if (!tablaBody) return;

        tablaBody.innerHTML = '';

        if (!Array.isArray(reservas) || reservas.length === 0) {
            tablaBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">No hay vehículos en curso ni pendientes.</td></tr>';
            return;
        }

        reservas.forEach((reserva) => {
            // Lógica unificada de estados (igual que en historial)
            let claseEstado = 'badge-pendiente'; // Default
            if (reserva.estado === 'en curso') claseEstado = 'badge-en-curso';
            if (reserva.estado === 'finalizado') claseEstado = 'badge-exito';
            if (reserva.estado === 'cancelado') claseEstado = 'badge-peligro';

            const placa = reserva.placa || 'SIN PLACA';
            const operario = reserva.operario_nombre || 'Sin asignar';

            const fila = document.createElement('tr');
            fila.style.borderBottom = "1px solid #eee";

            fila.innerHTML = `
                <td style="padding: 12px;">🕒 ${reserva.hora_reserva ? reserva.hora_reserva.substring(0, 5) : '--:--'}</td>
                <td style="padding: 12px;">
                    <strong style="background: #f1c40f; color: #000; padding: 2px 8px; border-radius: 4px; border: 1px solid #d4ac0d; font-size: 0.9em;">${placa}</strong><br>
                    <small style="color: #555;">${reserva.cliente_nombre || 'Cliente Desconocido'}</small>
                </td>
                <td style="padding: 12px;">🧼 ${reserva.nombre_servicio || 'Sin servicio'}</td>
                <td style="padding: 12px;">👷‍♂️ ${operario}</td>
                <td style="padding: 12px;">
                    <!-- Usamos la misma clase y lógica que en el historial -->
                    <span class="badge ${claseEstado}">${reserva.estado.toUpperCase()}</span>
                </td>
            `;
            tablaBody.appendChild(fila);
        });
    } catch (error) {
        console.error('❌ Error crítico en cargarMonitoreoVivo:', error);
    }
}

async function cargarHistorialGlobal() {
    console.log('Solicitando logs completos de la base de datos...');
    const tablaBody = document.getElementById('tabla-historial-body');
    if (!tablaBody) return;

    // Efecto visual de carga
    tablaBody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px;">Filtrando registros en base de datos...</td></tr>`;

    // Leemos los filtros directamente desde la interfaz antes de armar la URL
    const placa = document.getElementById('filtro-placa').value;
    const estado = document.getElementById('filtro-estado').value;
    const fecha = document.getElementById('filtro-fecha').value;
    const operario = document.getElementById('filtro-operario').value;

    const parametros = new URLSearchParams();
    if (placa) parametros.append('placa', placa);
    if (estado) parametros.append('estado', estado);
    if (fecha) parametros.append('fecha', fecha);
    if (operario) parametros.append('operario_id', operario);

    const url = parametros.toString()
        ? `http://127.0.0.1:3000/api/admin/historial?${parametros.toString()}`
        : 'http://127.0.0.1:3000/api/admin/historial';

    try {
        const respuesta = await fetch(url, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!respuesta.ok) throw new Error('Error al obtener el historial');
        const registros = await respuesta.json();

        if (registros.length === 0) {
            tablaBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #888; padding: 20px;">No se encontraron órdenes con los criterios ingresados.</td></tr>`;
            return;
        }

        const formatearMoneda = (valor) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(valor);

        // Renderizado inteligente de filas
        tablaBody.innerHTML = registros.map(reg => {
            const fechaLocal = new Date(reg.fecha_reserva).toLocaleDateString('es-CO', { timeZone: 'UTC' });

            // Selector de clases dinámicas para estados visuales llamativos
            let claseEstado = 'badge-pendiente';
            if (reg.estado === 'en curso') claseEstado = 'badge-en-curso';
            if (reg.estado === 'finalizado') claseEstado = 'badge-exito';
            if (reg.estado === 'cancelado') claseEstado = 'badge-peligro';

            return `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 12px;">${fechaLocal}<br><small style="color: #666; font-weight: bold;">${reg.hora_reserva.substring(0, 5)}</small></td>
                    <td style="padding: 12px;"><strong>${reg.cliente_nombre}</strong><br><small style="color:#777;">${reg.cliente_telefono}</small></td>
                    <td style="padding: 12px;"><span class="placa-tag">${reg.cliente_placa || 'MOTO / OTRO'}</span></td>
                    <td style="padding: 12px;">${reg.nombre_servicio}</td>
                    <td style="padding: 12px; font-weight: bold; color: #2c3e50;">${formatearMoneda(reg.precio)}</td>
                    <td style="padding: 12px; color: #555;">👷‍♂️ ${reg.operario_nombre}</td>
                    <td style="padding: 12px;"><span class="badge ${claseEstado}">${reg.estado.toUpperCase()}</span></td>
                </tr>
            `;
        }).join('');

    } catch (error) {
        console.error('❌ Error al procesar render del historial:', error);
        tablaBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: red; padding: 20px;">Fallo crítico al conectar el historial.</td></tr>`;
    }
}

// ==========================================
// CONTROL: Manejador de Filtros de Búsqueda
// ==========================================
function inicializarFiltrosHistorial() {
    const btnFiltrar = document.getElementById('btn-filtrar');
    const btnLimpiar = document.getElementById('btn-limpiar-filtros');

    if (btnFiltrar) {
        btnFiltrar.addEventListener('click', () => {
            cargarHistorialGlobal(); // Reutiliza la función que lee los inputs
        });
    }

    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', () => {
            document.getElementById('filtro-placa').value = '';
            document.getElementById('filtro-estado').value = '';
            document.getElementById('filtro-fecha').value = '';
            document.getElementById('filtro-operario').value = '';
            cargarHistorialGlobal(); // Recarga la base limpia de filtros
        });
    }
}

// 4. MANEJO EXPLICITO DE LOGOUT
const btnLogout = document.getElementById('btn-cerrar-sesion');
if (btnLogout) {
    btnLogout.addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'login.html';
    });
}

// ==========================================
// FORMULARIO: Registro de Clientes Presenciales
// ==========================================
const formCliente = document.getElementById('form-registro-cliente');
if (formCliente) {
    formCliente.addEventListener('submit', async (e) => {
        e.preventDefault();

        const datosCliente = {
            nombre: document.getElementById('cl-nombre').value,
            telefono: document.getElementById('cl-telefono').value,
            correo: document.getElementById('cl-correo').value || null,
            placa: document.getElementById('cl-placa').value.toUpperCase(),
            direccion: document.getElementById('cl-direccion').value || null
        };

        try {
            const respuesta = await fetch('http://127.0.0.1:3000/api/admin/registrar-cliente', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(datosCliente)
            });

            const resultado = await respuesta.json();

            if (respuesta.ok) {
                mostrarNotificacion(resultado.mensaje, 'exito');
                formOperario.reset();
            } else {
                mostrarNotificacion(resultado.error, 'error');
            }
        } catch (error) {
            console.error('Error al registrar cliente presencial:', error);
            alert('Fallo en la comunicación con el servidor de Motor Wash.');
        }
    });
}
// ==========================================
// CARGAR OPERARIOS EN EL DROPDOWN DE FILTROS
// ==========================================

async function cargarOperariosEnDropdown() {
    const selectOperario = document.getElementById('filtro-operario');
    if (!selectOperario) return;

    try {
        const respuesta = await fetch('http://127.0.0.1:3000/api/admin/operarios', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!respuesta.ok) throw new Error('Fallo al obtener operarios');
        const operarios = await respuesta.json();

        // Dejamos la opción por defecto limpia
        selectOperario.innerHTML = '<option value="">Filtro: Todos los Operarios</option>';

        // Inyectamos cada operario de la BD con su ID real correspondiente
        operarios.forEach(op => {
            const option = document.createElement('option');
            option.value = op.id; // Su ID real de la BD (ej. 14, 25, etc.)
            option.textContent = `👷‍♂️ ${op.nombre}`;
            selectOperario.appendChild(option);
        });

    } catch (error) {
        console.error('❌ Error al poblar el selector de operarios:', error);
    }
}

// ==========================================
// NOTIFICACIONES DINÁMICAS (TOASTS)
// ==========================================
function mostrarNotificacion(mensaje, tipo = 'exito') {
    // 1. Buscamos el contenedor
    let container = document.getElementById('toast-container');

    // 2. Si NO existe, lo creamos dinámicamente
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        
        // Estilos para centrarlo perfectamente
        container.style.position = 'fixed';
        container.style.top = '50%';
        container.style.left = '50%';
        container.style.transform = 'translate(-50%, -50%)'; // ¡Esta es la magia del centrado!
        container.style.zIndex = '9999';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '10px';
        container.style.pointerEvents = 'none'; // Para que no bloquee clics en el resto de la página
        
        document.body.appendChild(container);
    }

    // 3. Creamos el elemento del mensaje
    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    toast.innerText = mensaje;
    
    // Estilos del mensaje
    toast.style.padding = '20px 40px'; // Un poco más grande para que resalte
    toast.style.borderRadius = '8px';
    toast.style.color = 'white';
    toast.style.fontWeight = 'bold';
    toast.style.fontSize = '1.1rem';
    toast.style.boxShadow = '0 10px 20px rgba(0,0,0,0.2)';
    toast.style.transition = 'opacity 0.5s ease';
    toast.style.backgroundColor = (tipo === 'exito') ? '#28a745' : '#dc3545';
    toast.style.pointerEvents = 'auto'; // Re-activamos los clics para el mensaje (si fuera necesario)

    container.appendChild(toast);

    // 4. Desaparecer después de 3 segundos
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}