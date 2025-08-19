
# LIGAE - Gestión de Gastos con IA

LIGAE es una aplicación web moderna diseñada para simplificar y automatizar el proceso de gestión de recibos de gastos. Utilizando inteligencia artificial, la aplicación permite a los usuarios capturar recibos, extraer datos clave automáticamente y enviarlos a través de un flujo de aprobación jerárquico.

## Características Principales

- **Captura Inteligente de Recibos**: Los usuarios pueden hacer una foto de un recibo o subir una imagen. La IA, impulsada por Gemini, analiza la imagen para extraer automáticamente el importe, la fecha y el sector del gasto.
- **Flujo de Aprobación Jerárquico**: Los recibos enviados son revisados por managers designados. La jerarquía (quién aprueba a quién) se gestiona de forma centralizada en Firestore.
- **Notificaciones por Correo Electrónico**: El sistema envía notificaciones automáticas por correo electrónico tanto a los managers (cuando hay un nuevo recibo para revisar) como a los usuarios (cuando su recibo es aprobado o denegado).
- **Roles de Usuario Flexibles**:
    - **Usuario estándar**: Puede subir y gestionar sus propios recibos.
    - **Manager**: Puede aprobar o denegar los recibos de los usuarios que tiene asignados.
    - **Exportador**: Tiene permiso para visualizar y exportar en formato CSV todos los recibos aprobados.
- **Galería Personal de Recibos**: Cada usuario tiene un historial donde puede ver todos los recibos que ha enviado y el estado en el que se encuentran (pendiente, aprobado o denegado).
- **Exportación de Datos**: Los usuarios con el rol de "Exportador" pueden filtrar los recibos aprobados por fecha, usuario o sector y descargarlos en un fichero CSV para su contabilidad.

## Arquitectura y Tecnologías

La aplicación está construida sobre una arquitectura moderna y escalable, aprovechando los servicios de Google Cloud.

- **Frontend**:
    - **Framework**: [Next.js](https://nextjs.org/) (con App Router)
    - **Lenguaje**: TypeScript
    - **UI**: [React](https://react.dev/), [ShadCN UI](https://ui.shadcn.com/) y [Tailwind CSS](https://tailwindcss.com/)
- **Backend e Inteligencia Artificial**:
    - **Orquestación de IA**: [Genkit](https://firebase.google.com/docs/genkit)
    - **Modelos de IA**: [Google Gemini 1.5 Pro](https://deepmind.google/technologies/gemini/) para la extracción de datos.
    - **Despliegue**: [Google Cloud Run](https://cloud.google.com/run)
- **Base de Datos**:
    - **Datos de Recibos y Jerarquía**: [Cloud Firestore](https://firebase.google.com/docs/firestore) (en modo Datastore)
- **Autenticación**:
    - **Proveedor**: [Firebase Authentication](https://firebase.google.com/docs/auth) (limitado a cuentas de Google del dominio `@asepeyo.es`).
- **Almacenamiento de Ficheros**:
    - **Imágenes de Recibos**: [Google Cloud Storage](https://cloud.google.com/storage)
- **Envío de Correos**:
    - **Servicio**: Nodemailer, configurado a través de un servidor SMTP (ej. Gmail).

## Configuración del Proyecto

Para que la aplicación funcione correctamente, es necesario configurar las variables de entorno y los datos iniciales en Firestore.

### 1. Variables de Entorno

El fichero `apphosting.yaml` contiene todas las claves y credenciales necesarias. Asegúrate de que los siguientes valores estén configurados:

- `GOOGLE_API_KEY`, `GEMINI_API_KEY`: Claves de API para los servicios de Google Cloud.
- `GOOGLE_SERVICE_ACCOUNT_JSON`: Credenciales de una cuenta de servicio con los permisos necesarios para acceder a Firestore y Cloud Storage.
- `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS`: Credenciales del servidor SMTP para el envío de correos.

### 2. Configuración de Firestore

La aplicación utiliza una base de datos de Firestore en modo Datastore llamada `ticketsligae`. Dentro de esta base de datos, hay una colección `manager_hierarchy` que define los roles.

- **Jerarquía de Managers (`/manager_hierarchy/main`)**:
    - Este documento define qué managers aprueban los gastos de qué usuarios. La estructura se puede ver en `src/main.json`.
- **Roles de Exportador (`/manager_hierarchy/exporters`)**:
    - Este documento contiene una lista de correos de los usuarios que tienen permiso para acceder a la página de exportación. Ver `src/exporters.json`.

Es crucial subir estos ficheros de configuración a Firestore para que los roles y permisos funcionen.

## Ejecutar la Aplicación Localmente

1.  **Instalar dependencias**:
    ```bash
    npm install
    ```

2.  **Iniciar el servidor de desarrollo**:
    - La aplicación se ejecuta en el puerto `9002` por defecto.
    ```bash
    npm run dev
    ```

3.  **Iniciar el inspector de Genkit (opcional)**:
    - Para depurar y visualizar los flujos de IA, puedes iniciar la UI de Genkit.
    ```bash
    npm run genkit:watch
    ```
    Esto abrirá una interfaz en `http://localhost:4000`.

