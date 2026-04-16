// Botón de menú y navegación
const menuBtn = document.getElementById('menu-btn');
const navbar = document.getElementById('navbar');

// Alternar visibilidad del menú al hacer clic en ☰
menuBtn.addEventListener('click', () => {
  navbar.classList.toggle('active');
});

// Cerrar menú al hacer clic en un enlace
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