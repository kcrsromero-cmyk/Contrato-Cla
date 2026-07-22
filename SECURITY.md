# 🔒 Política de Seguridad - Contrato-Claro 🇨🇴

> 👨‍💻 **Autoría e Idea Original:** **EDWIN MAURICIO CACERES ROMERO**  
> ⚖️ **Licencia:** **GNU Affero General Public License v3.0 (GNU AGPLv3)**

La seguridad, la integridad de los datos y la resiliencia tecnológica son pilares fundamentales para **Contrato-Claro**. Como plataforma cívica de fiscalización de la contratación pública, estamos comprometidos con la disponibilidad de las herramientas y la protección contra vulnerabilidades.

---

## 🛡️ Versiones Soportadas

Actualmente se brinda soporte de seguridad activo a la versión principal en este repositorio:

| Versión | Estado de Soporte |
| ------- | ----------------- |
| ≥ 1.0.0 | 🟢 Activo (Rama Principal) |
| < 1.0.0 | 🔴 Inactivo |

---

## 🚨 Reportar una Vulnerabilidad

**Por favor, no reportes vulnerabilidades de seguridad a través de issues públicos en GitHub.**

Si descubres una falla de seguridad en la aplicación, la infraestructura de datos o la sanitización de consultas, te solicitamos reportarla siguiendo estos pasos:

1. 📧 Envía un correo privado al autor y mantenedor principal: **EDWIN MAURICIO CACERES ROMERO** (`kcrsromero@gmail.com`).
2. 📝 Incluye detalles técnicos del hallazgo:
   * Tipo de vulnerabilidad (Cross-Site Scripting, fuga de credenciales, vulnerabilidades en dependencias, etc.).
   * Pasos reproducibles (Proof of Concept - PoC).
   * Impacto potencial e ideas para la remediación.

---

## 🔒 Buenas Prácticas de Seguridad en Contrato-Claro

* 🔑 **Gestión Segura de Tokens de API:** Ninguna clave privada o token sensible de la API de Socrata o Gemini se incluye en el código fuente ni se expone en el cliente.
* 🧼 **Sanitización de Consultas SoQL:** Todas las cadenas de texto ingresadas por el usuario en los parámetros de búsqueda o selección territorial son tratadas con escapado estricto (`escapeSoQL`) para prevenir inyecciones en consultas a Datos Abiertos Socrata.
* 🛡️ **Sanitización de Renderizado HTML:** Los datos provenientes del dataset gubernamental son renderizados usando componentes seguros en React para evitar inyección de scripts (XSS).
