🏐 VolleyStats - Sistema de Gestión de Torneos

VolleyStats es una plataforma web integral diseñada para la administración, seguimiento y control de torneos de voleibol. El sistema permite desde la inscripción y validación de equipos hasta la gestión detallada de partidos y estadísticas individuales en tiempo real.

 🛠️ Arquitectura Técnica

El proyecto sigue una arquitectura basada en componentes y lógica de datos centralizada:

Frontend: HTML5, Tailwind CSS y DaisyUI para una interfaz moderna y responsiva.
Motor de Datos: `mock-data.js`: Contiene la estructura inicial y los datos de prueba (`VolleyAppData`).
 `data-manager.js`: Interfaz centralizada para la lectura y persistencia de datos en `localStorage`.


Lógica de Negocio: Scripts modulares (`estadisticas-admin.js`, `detalle-equipo.js`, etc.) que gestionan la interacción y validación de datos.

📂 Estructura del Proyecto


├── index.html              # Landing y login
├── ReadMe.txt              
├── pages/
│   ├── estadisticas.html      
│   ├── estadisticas-partido.html
│   ├── jugadores.html
│   ├── partidos.html  
│   ├──  liga.html   
│   ├──dashboard.html
│   ├── admin/
│       ├──detalle.equipo.html
│       ├──equipos-admin.html
│       ├──estadisticas-admin.html
│       ├──jugadores-admin.html
│       ├──liga.html
│       ├──partidos-admin.html
│       └──programar-partido.html       
├── js/
│   ├── mock-data.js        
│   ├── data-manager.js     
│   └── modules/  
│       ├──auth.js
│       ├──equipos.js
│       ├──estadisticas.js
│       ├──jugadores.js
│       ├──liga.js
│       ├──partidos.js
│       └──admin/
│           ├──admin.js
│          ├──admin-liga.js
│          ├──dashboard.js
│          ├──detalle-equipo.js
│          ├──equipos-admin.js
│          ├──estadisticas-admin.js
│          ├──liga-admin.js
│          └── partidos-admin.js 
├── css/     
│   └── style.css         

```

⚙️ Configuración y Uso

1. Requisitos: Solo requiere un navegador web moderno (Chrome, Firefox, Edge).
2. Instalación: Simplemente clona el repositorio o descarga los archivos y abre `index.html` en tu navegador.
3. Login:Utiliza las credenciales por defecto configuradas en `auth.js`:
* Usuario: `admin`
* Password: `1234`
o puedes usar el modo invitado.


4. Datos: El sistema cargará automáticamente los datos desde `mock-data.js` la primera vez; luego, cualquier cambio realizado será guardado en el `localStorage` del navegador.

💡 Cómo contribuir a la lógica

Agregar funciones: Siempre utiliza `DataManager.getAppData()` para obtener una copia fresca de los datos y `DataManager.save(data)` para persistir cambios.
Estadísticas: El módulo `estadisticas-admin.js` permite el cálculo dinámico de puntos totales. Si añades nuevos campos de estadística, asegúrate de actualizar la función `guardarEstadisticas()`.
Validaciones: Se ha implementado una validación de duplicados (ej. números de camiseta o participaciones) para mantener la consistencia del torneo.

---

*Desarrollado para la gestión optimizada de torneos de voleibol.*