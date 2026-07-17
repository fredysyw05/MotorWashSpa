// Botón de menú y navegación
const menuBtn = document.getElementById('menu-btn');
const navbar = document.getElementById('navbar');

// Alternar visibilidad del menú al hacer clic en ☰
menuBtn.addEventListener('click', () => {
  navbar.classList.toggle('active');
});

// ======= ESTADO DE AUTENTICACIÓN DINÁMICO =======
const authNavItem = document.getElementById('auth-nav-item');
const token = localStorage.getItem('token');
const userName = localStorage.getItem('userName');
const userRol = localStorage.getItem('usuario_rol'); // 🔥 Recuperamos el rol guardado

// Si el usuario está logueado, transformamos el menú
if (token && userName && authNavItem) {

  // 👥 Evaluamos el rol: El botón de panel SOLO se genera si es 'operario' o 'admin'
  const botonPanelHtml = (userRol === 'operario' || userRol === 'admin')
    ? `<a href="operario.html" class="btn-panel-link">
        🛠️ Panel de Trabajo
       </a>`
    : ''; // Si es 'cliente', se queda vacío

  // Inyectamos el HTML limpio (¡sin inline styles que bloqueen el CSS!)
  authNavItem.innerHTML = `
    <div class="user-nav-group">
      ${botonPanelHtml}
      
      <a href="cliente.html" class="user-name-link">
        👨🏻‍💼 ${userName}
      </a>
      
      <button id="nav-logout-btn" class="btn-danger">
        Cerrar Sesión
      </button>
    </div>
  `;

  // Lógica para cerrar sesión
  document.getElementById('nav-logout-btn').addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.clear();
    window.location.href = 'index.html';
  });
}

// Cerrar menú al hacer clic en un enlace (Captura los botones dinámicos perfectamente)
const navLinks = navbar.querySelectorAll('a');
navLinks.forEach(link => {
  link.addEventListener('click', () => {
    navbar.classList.remove('active');
  });
});

// ======= Resaltar menú activo =======
const currentPage = window.location.pathname.split("/").pop();
const navLinks2 = document.querySelectorAll(".site-nav a");

navLinks2.forEach(link => {
  const linkPage = link.getAttribute("href");

  if (linkPage === currentPage) {
    link.classList.add("active");
  }
});

// ======= Preseleccionar servicio desde la URL =======
const params = new URLSearchParams(window.location.search);
const servicio = params.get("service");

if (servicio) {
  const select = document.getElementById("servicio-select");
  if (select) {
    select.value = servicio;
  }
}

// ======= ANIMACIONES AL HACER SCROLL =======
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("show");
    }
  });
});

// observar todos los elementos con clases animadas
document.querySelectorAll(".fade-in, .slide-left, .slide-right")
  .forEach(el => observer.observe(el));