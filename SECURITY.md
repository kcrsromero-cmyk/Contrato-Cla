# Política de Seguridad - Contrato-Claro

La seguridad y privacidad de la información son pilares fundamentales para **Contrato-Claro**. Como plataforma de veeduría y análisis de datos de contratación pública, estamos comprometidos con la integridad, disponibilidad y confidencialidad del servicio.

## Versiones Soportadas

Actualmente, solo se brinda soporte de seguridad activo a la versión en desarrollo dentro de este repositorio principal:

| Versión | Soportada |
| ------- | --------- |
| > 1.0.x | Sí (Rama Principal) |
| < 1.0.0 | No |

## Reportar una Vulnerabilidad

**Por favor, no reportes vulnerabilidades de seguridad a través de issues públicos en GitHub.**

Si descubres una falla de seguridad en este proyecto, te solicitamos que la reportes de manera responsable siguiendo estos pasos:

1. Envía un correo electrónico detallado a los mantenedores del proyecto (puedes consultar el contacto en el perfil de la organización o creadores).
2. Describe la vulnerabilidad detectada, incluyendo:
   * Tipo de vulnerabilidad (ej: XSS, divulgación de credenciales, inyección de código).
   * Pasos detallados para reproducir el problema (Proof of Concept).
   * Impacto potencial y escenarios donde podría ser explotado.
   * Si es posible, sugerencias para mitigar o solucionar la falla.

## Nuestro Compromiso de Respuesta

Una vez recibido el reporte:

* Acusaremos recibo del reporte de vulnerabilidad dentro de las **48 horas** hábiles siguientes.
* Trabajaremos de forma prioritaria en una solución o parche de seguridad.
* Mantendremos una comunicación constante y transparente contigo sobre el progreso de la resolución.
* Una vez mitigado el riesgo, realizaremos el anuncio público correspondiente y, si lo deseas, te daremos el crédito respectivo por el hallazgo en nuestras notas de versión.

## Buenas Prácticas de Seguridad en Contrato-Claro

Al ser una aplicación que utiliza datos públicos integrados y consultas enriquecidas, recordamos a los desarrolladores y usuarios locales:

* **Gestión de API Keys:** Jamás incluyas credenciales, tokens ni claves de la API de Gemini u otros servicios en el código cliente. Asegúrate de declarar las variables requeridas en el archivo `.env` local basándote en `.env.example`.
* **Sanitización de Datos:** Todas las consultas y datos cargados de SECOP II son procesados y renderizados en la interfaz de forma segura para evitar ataques de inyección (*Cross-Site Scripting* - XSS).
