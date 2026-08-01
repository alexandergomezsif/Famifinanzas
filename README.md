# 💰 Gestor de Finanzas Familiares (Personal & Family Finance App)

Una aplicación web moderna, rápida y 100% offline desarrollada exclusivamente con **HTML5, CSS3 y JavaScript Vanilla (ES6)** para el control de presupuestos, gastos compartidos, ingresos proporcionales y comprobantes del hogar.

---

## 🚀 Características Principales

- **100% Offline & Privacidad Total:** Todos los datos se almacenan exclusivamente en el `LocalStorage` de tu navegador. Sin bases de datos externas ni servidores.
- **Gestión de Personas e Ingresos:** Permite registrar los miembros de la familia con sus ingresos y calcula automáticamente el porcentaje de participación equitativo.
- **Obligaciones y Gastos Recurrentes:** Clasificación en gastos fijos, pago de deudas y metas de ahorro. Soporte para gastos asignados a una persona o compartidos proporcionalmente.
- **Control y Seguimiento de Pagos Mensuales:** Historial por mes, estado (Pendiente / Pagado), registro de fecha, hora, responsable y notas.
- **Adjuntar y Visualizar Comprobantes:** Carga de recibos/facturas en formatos JPG, PNG, WEBP y PDF (convertidos a Base64 dentro del navegador) con visor integrado y botón de descarga.
- **Estadísticas y Gráficos:** Visualización de Ingresos vs Gastos, distribución por categorías, relación ahorro/deuda y evolución histórica con Chart.js.
- **Respaldo y Restauración JSON:** Exportación e importación completa de toda la información en un único archivo JSON.
- **Tema Claro / Oscuro:** Modo oscuro y diseño responsivo adaptado para PC, tablets y smartphones.

---

## 📁 Estructura del Repositorio

```text
finanzas_familiares/
│
├── index.html            # Estructura principal, vistas y modales
├── style.css             # Sistema de diseño, temas claro/oscuro y diseño responsivo
├── app.js                # Lógica completa en Vanilla JavaScript ES6
├── abrir_aplicacion.bat  # Acceso directo para abrir la app en Windows
└── README.md             # Documentación del proyecto
```

---

## 🖥️ Cómo Ejecutar la Aplicación

No requiere instalaciones complejas ni servidores Node.js/PHP:

1. **Opción A (Doble clic):** Haz doble clic sobre el archivo `abrir_aplicacion.bat` o sobre `index.html`.
2. **Opción B (Navegador):** Abre `index.html` en Google Chrome, Microsoft Edge, Mozilla Firefox o Safari.
3. **Opción C (Live Server en VSCode):** Puedes abrir la carpeta con Visual Studio Code y usar la extensión *Live Server*.

---

## 💾 Respaldo de Datos

- Para guardar una copia de tus registros, ve a la pestaña **Ajustes** y haz clic en **Exportar Backup JSON**.
- Para transferir tus datos a otro dispositivo o navegador, usa **Restaurar Backup JSON** y selecciona tu archivo descargado.

---

*Desarrollado con ❤️ para la gestión financiera familiar organizada y sencilla.*
