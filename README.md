# 🩺 Gestor de Expediente Clínico Electrónico (ECE) - Open Source

Este es un sistema de **Expediente Clínico Electrónico** ligero y moderno, desarrollado bajo estándares de seguridad avanzados para clínicas y estancias médicas. El proyecto nace como una solución digital para la **Estancia Villas Juan Pablo** en Aguascalientes, México, con el fin de profesionalizar el registro de pacientes y notas médicas.

Este software está diseñado siguiendo los lineamientos de las Normas Oficiales Mexicanas, asegurando que los expedientes generados tengan validez y seguridad:

* **NOM-004-SSA3-2012:** Garantiza la estructura obligatoria del expediente (Notas de evolución, historia clínica, signos vitales y datos demográficos).
* **NOM-024-SSA3-2012:** Implementa medidas de seguridad para Sistemas de Información de Registro Electrónico para la Salud:
    * **Integridad:** Sellado criptográfico de cada nota mediante hashing **SHA-256** (impidiendo alteraciones posteriores).
    * **Autenticidad:** Control de acceso estricto basado en roles (Admin, Médico, Enfermería, Secretaría).
    * **Trazabilidad:** Registro de auditoría (logs) para cada movimiento realizado en la base de datos.

## 🚀 Características Principales
* **Gestión Integral de Pacientes:** Registro detallado con validación de CURP y formatos NOM.
* **Notas Clínicas Especializadas:** Formatos dinámicos para Notas de Primera Vez, Evolución, Urgencias y Enfermería.
* **Catálogo CIE-10 Integrado:** Buscador rápido de diagnósticos oficiales de la OMS.
* **Generación de Documentos:** Exportación instantánea a PDF de Notas, Recetas Médicas (con cumplimiento del Art. 226 LGS) y Cartas de Consentimiento Informado.
* **Seguridad y Privacidad:** Almacenamiento local mediante SQLite. Los datos nunca viajan por internet, garantizando la privacidad absoluta de los pacientes.
* **Interfaz Moderna:** Diseño UI/UX intuitivo con Glassmorphism y modo oscuro/claro optimizado para largas jornadas de trabajo.

## 🛠️ Stack Tecnológico
* **Núcleo:** [Electron.js](https://www.electronjs.org/) (Aplicación de escritorio multiplataforma).
* **Base de Datos:** SQLite3 (Persistencia local robusta).
* **Seguridad:** Bcrypt (Hasheo de contraseñas) y Crypto (SHA-256 para sellado digital).
* **Frontend:** HTML5, CSS3 Avanzado (Variables y Flexbox) y JavaScript Vanilla (Arquitectura modular).

## 📦 Instalación y Configuración

1.  **Clona el repositorio:**
    ```bash
    git clone [https://github.com/TU_USUARIO/nombre-del-repo.git](https://github.com/TU_USUARIO/nombre-del-repo.git)
    cd nombre-del-repo
    ```
2.  **Instala las dependencias:**
    ```bash
    npm install
    ```
3.  **Inicia la aplicación:**
    ```bash
    npm start
    ```

> **Nota:** La primera vez que inicies el sistema, revisa la terminal de comandos; ahí aparecerá la contraseña temporal para el usuario `admin`. Úsala para configurar a tu personal de salud.

## 🤝 Contribuciones
Este proyecto es **Open Source**. Si quieres mejorar la salud digital en México, ¡eres bienvenido!
1. Haz un Fork.
2. Crea una rama (`git checkout -b feature/NuevaMejora`).
3. Haz un commit de tus cambios.
4. Envía un Pull Request.

## 📝 Licencia
Este proyecto está bajo la Licencia **MIT**. Eres libre de usarlo, modificarlo y distribuirlo.

---

### ⚠️ AVISO LEGAL
Este software se proporciona "tal cual", sin garantías de ningún tipo. El uso en entornos clínicos reales debe ser supervisado por el responsable sanitario de la institución, asegurando el cumplimiento local de la Ley Federal de Protección de Datos Personales (LFPDPPP).

Desarrollado con 💙 en Aguascalientes, México.
