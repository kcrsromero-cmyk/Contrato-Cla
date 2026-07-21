# Contrato-Claro 🇨🇴

> **Plataforma ciudadana para consultar, comparar y analizar la contratación pública en Colombia**

**Contrato-Claro** es una iniciativa independiente y de código abierto para la transparencia y la veeduría ciudadana. Su misión es democratizar, simplificar y hacer inteligible la información del **Sistema Electrónico de Contratación Pública (SECOP II)** de Colombia, transformando datos complejos y estructurados en visualizaciones, comparativas y análisis fáciles de comprender para cualquier ciudadano.

---

### ⚠️ AVISO IMPORTANTE: No Oficialidad
**Contrato-Claro es un proyecto 100% independiente de carácter cívico, educativo y social.**
No tiene ninguna afiliación, patrocinio, asociación ni aval oficial de la Agencia Nacional de Contratación Pública - Colombia Compra Eficiente, ni de ninguna otra entidad del Estado colombiano. Toda la información presentada proviene de los conjuntos de datos abiertos provistos por el portal oficial **Datos Abiertos Colombia (datos.gov.co)**. 

*Para consultar los términos completos y el alcance del proyecto, por favor consulte el [Descargo de Responsabilidad](DESCARGO_DE_RESPONSABILIDAD.md) y los [Términos de Uso](TERMINOS_DE_USO.md).*

---

## 🎨 Características de la Plataforma

Contrato-Claro está diseñado bajo un paradigma de diseño limpio, de alta legibilidad, intuitivo y responsivo, ofreciendo una experiencia interactiva sin complejidades innecesarias:

1. **Dashboard de Resumen General:**
   * Visualización agregada del número de contratos, valor total contratado, valor total desembolsado e importes pendientes.
   * Gráficas de tendencia temporal de contratación y desglose porcentual por estado contractual y modalidad de selección legal.
   * Filtros territoriales rápidos y selectores avanzados por rango de fechas de vigencia.

2. **Comparativa Mensual Avanzada (Evolución de Contratación):**
   * Vista comparativa detallada de tres columnas: *Mes Anterior*, *Mes Seleccionado* y *Mes Siguiente*.
   * Cálculo automático de métricas de desviación presupuestaria y volumen de contratación en relación con el promedio anual consolidado.
   * Análisis de la evolución porcentual del presupuesto y contratos firmados hacia el mes actual y desde el mes actual hacia el mes siguiente.
   * Caja de auditoría con scroll que resalta el **Contrato Mayor** de cada periodo de tiempo con su objeto correspondiente de forma clara.

3. **Métricas Avanzadas de Integridad e Inteligencia:**
   * **Objetos Idénticos:** Detección de patrones de duplicación literal u objetos idénticos adjudicados a contratistas del mismo grupo para auditorías ciudadanas.
   * **Similitud Léxica:** Agrupación algorítmica de contratos con coincidencias textuales altas en el objeto que podrían sugerir fragmentación contractual.
   * **Alertas Tempranas:** Alertas automatizadas basadas en variables operativas, como contratos con plazos inusualmente cortos o firmas en periodos de alto riesgo.

4. **Visualizador de Contratos Detallado:**
   * Listado completo con filtros fluidos (Estado, Tipo de Proceso, Modalidad de Selección y Rangos de Cuantía).
   * Búsqueda instantánea en tiempo real por objeto de contrato o nombre de contratista.
   * Modales interactivos de ficha técnica que expanden el objeto completo del contrato, supervisor a cargo, valor, forma de pago y enlaces a la documentación de origen.

---

## 🛠️ Stack Tecnológico

La arquitectura del proyecto está construida sobre tecnologías modernas, garantizando velocidad de carga y modularidad para los desarrolladores:

* **Framework:** React 18+ (con TypeScript para un tipado estricto y seguro).
* **Herramienta de Construcción:** Vite (optimizando tiempos de recarga y empaquetado de producción).
* **Diseño y Estilos:** Tailwind CSS (diseño adaptable a móviles y computadores, consistente en modos claro y oscuro).
* **Librería de Gráficas:** Recharts & D3 (visualizaciones interactivas de líneas, barras y áreas).
* **Iconografía:** Lucide React (paquete consistente de vectores geométricos de alta accesibilidad).
* **Análisis Inteligente (IA):** Google Gemini API (utilizando la SDK `@google/genai` en servidores seguros para la generación de resúmenes de contratos legales complejos y análisis asistidos).

---

## 🚀 Inicio Rápido y Configuración

Siga las siguientes instrucciones para configurar y ejecutar la aplicación en su entorno de desarrollo local:

### Requisitos Previos
* Tener instalado **Node.js** (versión 18 o superior).
* Tener un gestor de paquetes de Node instalado (`npm` o `yarn`).

### Instalación

1. Clone el repositorio principal:
   ```bash
   git clone https://github.com/tu-usuario/contrato-claro.git
   cd contrato-claro
   ```

2. Instale todas las dependencias del proyecto:
   ```bash
   npm install
   ```

3. Configure el archivo de variables de entorno:
   * Cree una copia del archivo de ejemplo:
     ```bash
     cp .env.example .env
     ```
   * Abra el archivo `.env` recién creado y agregue su clave de la API de Gemini si planea utilizar las funciones de resumen inteligente:
     ```env
     GEMINI_API_KEY=tu-clave-secreta-aqui
     ```

4. Inicie el servidor de desarrollo local:
   ```bash
   npm run dev
   ```
   Abra su navegador web en [http://localhost:3000](http://localhost:3000) para interactuar con la plataforma.

---

## 📋 Comandos Útiles

El proyecto cuenta con scripts preparados para facilitar la calidad de desarrollo:

* **Iniciar Servidor de Desarrollo:** `npm run dev`
* **Ejecutar Linter (Verificar Errores):** `npm run lint`
* **Compilar para Producción (Build):** `npm run build`
* **Iniciar Vista Previa de Producción:** `npm run preview`

---

## 🤝 Comunidad y Colaboración

¡Las contribuciones de la comunidad son invaluables! Si desea corregir una falla, sugerir mejoras visuales o proponer nuevas integraciones con APIs de datos abiertos:

1. Lea nuestro [Código de Conducta](CODE_OF_CONDUCT.md) para comprender la atmósfera pacífica e inclusiva que fomentamos en la comunidad.
2. Siga los pasos de configuración y envío descritos en la [Guía de Contribución](CONTRIBUTING.md).

---

## 📄 Licencia y Términos

Este proyecto es software libre y está bajo los términos de la **[Licencia MIT](LICENSE)** (Community Edition). Ello le permite usar, modificar, distribuir y sublicenciar el código libremente siempre que mantenga el aviso de derechos de autor correspondiente.

Para más información sobre el uso responsable de la información ciudadana, consulte nuestros **[Términos de Uso](TERMINOS_DE_USO.md)**.
