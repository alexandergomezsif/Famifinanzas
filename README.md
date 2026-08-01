# 💰 FAMIFINANZAS - Gestión Financiera Familiar
> **Familia Gómez Rico**  
> *Desarrollado por Alex Gómez Avendaño*

Una aplicación web moderna, intuitiva y **100% offline** diseñada para la administración mensual del presupuesto, control de aportes proporcionales entre integrantes, seguimiento de pagos con comprobantes y asesoría financiera inteligente basada en reglas económicas estándar (50/30/20, DTI y tasas de ahorro).

---

## 📁 Estructura del Proyecto

```text
finanzas_familiares/
│
├── index.html               # Estructura principal y maquetación de vistas
│
├── css/
│   └── style.css            # Estilos UI, Modo Oscuro/Claro y formato de impresión (@media print)
│
├── js/
│   └── app.js               # Lógica de la SPA, Asesor Inteligente, LocalStorage y Gráficos
│
├── abrir_aplicacion.bat     # Lanzador de acceso directo para Windows
└── README.md                # Documentación del proyecto
```

---

## ✨ Características Principales

1. **🔒 100% Offline y Seguro:**
   - No requiere servidores, internet ni base de datos externa.
   - Todos los datos residen en el navegador local (`LocalStorage`).
   - Se removieron opciones peligrosas de reseteo para garantizar la persistencia de datos.

2. **💾 Botón de Respaldo JSON Siempre Visible:**
   - Ubicado en la barra superior derecha (`Guardar JSON`), disponible permanentemente desde cualquier pestaña o módulo para descargar copias de seguridad inmediatas en 1 solo clic.

3. **👥 Aportes Proporcionales de Integrantes:**
   - Cálculo automático del porcentaje de participación económica de cada integrante sobre los gastos compartidos según sus ingresos mensuales.

4. **📑 Control de Obligaciones y Pagos Mensuales:**
   - Categorización en Gastos Habituales, Deudas y Ahorros.
   - Registro de estado de pago (*Pagado / Pendiente*), fecha, hora, pagador y adjuntos de comprobantes (fotos o PDFs).

5. **🧠 Asesor Financiero Inteligente:**
   - Evaluación en tiempo real de la **Regla 50/30/20** (Necesidades, Estilo de Vida, Ahorro/Deudas).
   - Cálculo de la relación **Deuda / Ingreso (DTI)** y **Tasa de Ahorro**.
   - Detección de puntos críticos, fortalezas y plan de acción paso a paso.

6. **🖨️ Generación de Informe Imprimible (PDF):**
   - En el módulo de Estadísticas, genere reportes ejecutivos listos para imprimir o guardar como PDF en hoja limpia.

---

## 🚀 Cómo Ejecutar la Aplicación

1. Haga doble clic en el archivo `abrir_aplicacion.bat` o abra directamente `index.html` en cualquier navegador web moderno (Google Chrome, Edge, Firefox, etc.).
2. Para guardar una copia de seguridad en cualquier momento, presione el botón verde **"Guardar JSON"** en la barra superior.
