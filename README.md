# 🇨🇴 Contrato-Claro — Fiscalización y Transparencia Contractual

---

**Contrato-Claro** es una iniciativa de código abierto y desarrollo cívico para la transparencia presupuestal y la veeduría ciudadana en Colombia. Su propósito es democratizar, simplificar y hacer inteligible la información del **Sistema Electrónico de Contratación Pública (SECOP II)** de Colombia Compra Eficiente, transformando datos complejos y estructurados en visualizaciones intuitivas, comparativas mensuales y análisis algorítmicos al alcance de cualquier ciudadano.

---

## ⚠️ AVISO IMPORTANTE: No Oficialidad e Independencia 🛡️

**Contrato-Claro es un proyecto 100% independiente de carácter cívico, educativo, analítico y social.**

* **Sin Afiliación Oficial:** No tiene ninguna relación, patrocinio, asociación ni aval oficial con la Agencia Nacional de Contratación Pública — Colombia Compra Eficiente, el Departamento Nacional de Planeación (DNP) ni ninguna otra entidad gubernamental de la República de Colombia.
* **Fuente Oficial de Datos:** Toda la información provista proviene de los conjuntos de datos abiertos de la plataforma estatal **Datos Abiertos Colombia (`datos.gov.co`)** a través de la API SODA del dataset SECOP II (`jbjy-vk9h.json`).
* **Términos Completos:** Para consultar el alcance legal del proyecto, revise el [Descargo de Responsabilidad](DESCARGO_DE_RESPONSABILIDAD.md) y los [Términos de Uso](TERMINOS_DE_USO.md).

---

## 🎨 Características Principales de la Plataforma

Contrato-Claro está diseñado bajo un paradigma de alta legibilidad, respuesta en tiempo real y accesibilidad cívica:

1. 📊 **Dashboard de Resumen General:**
   * Agregación instantánea del valor total contratado, valor ejecutado/pagado y saldos pendientes.
   * Gráficas interactivas de tendencia mensual de contratación y distribución porcentual por estado del contrato y modalidad legal de selección.
   * Filtros dinámicos por departamento, municipio, entidad contratante y rangos de fechas de vigencia.

2. 📈 **Evolución y Comparativa Mensual Avanzada:**
   * Vista comparativa estructurada de tres columnas (*Mes Anterior*, *Mes Seleccionado* y *Mes Siguiente*).
   * Cálculo de desviaciones presupuestarias respecto al promedio mensual anual y variaciones periodo a periodo ($\Delta\%$).
   * Módulo de auditoría que destaca el **Contrato Mayor** de cada periodo con su objeto y cuantía oficial.

3. 🧮 **Motor Algorítmico e Indicadores de Integridad:**
   * **Objetos Repetidos (Copia Literal):** Identificación automática de contratos con redacción 100% idéntica en su objeto.
   * **Similitud Léxica de Objetos (Jaccard Index):** Agrupación algorítmica de contratos con alta coincidencia textual para detectar posible fraccionamiento de contratos.
   * **Procesamiento fuera del Hilo Principal (Web Worker):** Análisis ejecutado en segundo plano (`similarityWorker.ts`) para prevenir congelamientos de la interfaz gráfica.
   * **Alertas Cívicas:** Detección de contratos modificados, días adicionados, contratos vencidos en ejecución y adelantos de pago reportados.

4. 🔍 **Explorador y Buscador de Contratos Avanzado:**
   * **Búsqueda Predictiva en Tiempo Real (`PredictiveSearchBar`):** Sugerencias inteligentes clasificadas por proveedor, objeto contractual, supervisor y referencia/ID con navegación por teclado y etiquetas de coincidencias.
   * **Búsqueda por Texto General & Palabras Clave Separadas:** Módulos de filtrado independientes para búsqueda exacta y etiquetado múltiple de palabras clave (hasta 10 etiquetas).
   * **Gestión de Historial Cívico Privado:** Almacenamiento local de búsquedas recientes con botón de **"Borrar Historial"** para permitir la eliminación inmediata por decisión del ciudadano.
   * **Ficha Técnica Interactiva:** Ficha extendida por contrato con desglose financiero, estados y enlace directo al expediente oficial en SECOP II.

---

## 📚 Documentación Técnica, Métodos y Enlaces API Socrata 📖

Para una descripción detallada sobre la arquitectura técnica, las fórmulas matemáticas y los canales de integración con datos abiertos, consulte la **[Documentación Técnica Completa (`DOCUMENTACION_TECNICA.md`)](DOCUMENTACION_TECNICA.md)**:

* 🔗 **[Enlaces Oficiales de la API Socrata SECOP II](DOCUMENTACION_TECNICA.md#4-enlaces-oficiales-y-documentación-de-la-api-socrata-secop-ii):**
  * Dataset Oficial en Datos Abiertos: [datos.gov.co/Gastos-Publicos/SECOP-II-Contratos-Electronicos/jbjy-vk9h](https://www.datos.gov.co/Gastos-Publicos/SECOP-II-Contratos-Electronicos/jbjy-vk9h/about_data)
  * Endpoint JSON de Socrata: [datos.gov.co/resource/jbjy-vk9h.json](https://www.datos.gov.co/resource/jbjy-vk9h.json)
  * Socrata Developer Portal (Foundry API): [dev.socrata.com/foundry/www.datos.gov.co/jbjy-vk9h](https://dev.socrata.com/foundry/www.datos.gov.co/jbjy-vk9h)
  * Documentación General de Endpoints SODA: [dev.socrata.com/docs/endpoints.html](https://dev.socrata.com/docs/endpoints.html)
* 🧮 **[Motor de Cálculo Matemático](DOCUMENTACION_TECNICA.md#2-motor-de-cálculo-matemático-y-cruces-de-datos):** Fórmulas exactas para agregaciones financieras, desviaciones presupuestales, coeficiente de Jaccard ($J(A,B) = \frac{|A \cap B|}{|A \cup B|}$), filtrado de stopwords en contratación colombiana e índice invertido.
* 📋 **[Tabla de Campos Consumidos (42 campos)](DOCUMENTACION_TECNICA.md#51-tabla-detallada-de-campos-de-la-api):** Mapeo de todos los campos de la API Socrata (`jbjy-vk9h.json`) consumidos y validados por Contrato-Claro.
* 🛡️ **[Política de Minimización de Datos y Habeas Data](DOCUMENTACION_TECNICA.md#52-análisis-normativo-y-política-de-minimización-de-datos-personales-habeas-data):** Cumplimiento estricto de la Ley 1581 de 2012 y Ley 1712 de 2014. No se solicitan ni exponen números de documento de identidad de personas naturales actuando como supervisores o ordenadores de gasto.
* 📡 **[Encabezados HTTP Socrata (SODA API v2.1)](DOCUMENTACION_TECNICA.md#6-encabezados-http-de-socrata-soda-api-v21):** Detalle de encabezados HTTP disponibles en Socrata (`X-App-Token`, `X-Soda2-Fields`, `X-Soda2-Types`, `X-Total-Count`, `Cache-Control`) y la estrategia de cliente adoptada por Contrato-Claro.

---

## 🛠️ Stack Tecnológico ⚙️

La arquitectura del proyecto garantiza velocidad de procesamiento, tipado seguro y experiencia reactiva:

* ⚛️ **Framework UI:** React 18+ (TypeScript).
* ⚡ **Build Tool:** Vite (compilación ultrarrápida).
* 🎨 **Estilos:** Tailwind CSS v4 (diseño moderno y adaptativo).
* 📈 **Visualizaciones:** Recharts & D3 (gráficas interactivas).
* 🧩 **Iconografía:** Lucide React (vectores limpios y accesibles).
* 🧵 **Concurrencia:** Web Workers (cálculo de similitud léxica sin bloquear la interfaz).
* 💾 **Persistencia:** IndexedDB (caché multinivel de datos abiertos).

---

## 🚀 Inicio Rápido en Entorno Local

Siga los siguientes pasos para ejecutar la aplicación en su máquina local:

### 1. Requisitos Previos 📋
* Node.js v18.0 o superior.
* Gestor de paquetes `npm` o `yarn`.

### 2. Instalación 💻
```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/contrato-claro.git
cd contrato-claro

# Instalar dependencias
npm install
```

### 3. Ejecución en Desarrollo 🚀
```bash
npm run dev
```
Abra [http://localhost:3000](http://localhost:3000) en su navegador web.

---

## 📋 Comandos del Proyecto

* 💻 **Modo Desarrollo:** `npm run dev`
* 🔍 **Verificación de Tipos y Linter:** `npm run lint`
* 📦 **Compilación de Producción:** `npm run build`
* 👁️ **Previsualización de Producción:** `npm run preview`

---

## 🤝 Contribuciones y Comunidad 🌐

¡Las contribuciones de la ciudadanía y la comunidad de desarrolladores son bienvenidas!
Para colaborar:
1. Revisa nuestro [Código de Conducta](CODE_OF_CONDUCT.md) 🤝.
2. Consulta la [Guía de Contribución](CONTRIBUTING.md) 🛠️.

---

## 📜 Licencia de Software Libre y Créditos

* 🏛️ **Plataforma ciudadana independiente para consultar, comparar y analizar la contratación pública en Colombia**
* 👨‍💻 **Autoría e Idea Original:** **EDWIN MAURICIO CACERES ROMERO** (`kcrsromero@gmail.com`)
* 🤖 **Nota de Transparencia:** Este software fue diseñado y estructurado por **EDWIN MAURICIO CACERES ROMERO**, utilizando asistencia de inteligencia artificial (Google AI Studio) para la generación de componentes específicos.
* ⚖️ **Licencia de Software Libre:** **[GNU Affero General Public License v3.0 (GNU AGPLv3)](LICENSE)**

Este programa es software libre: usted puede redistribuirlo y/o modificarlo bajo los términos de la Licencia Pública General Affero de GNU publicada por la Free Software Foundation.
