# 📜 Manual de Documentación Técnica y Motor Analítico - Contrato-Claro 🇨🇴

> **Autoría Principal e Idea Original:** 👨‍💻 **EDWIN MAURICIO CACERES ROMERO**  
> **Licencia de Software Libre:** ⚖️ **GNU Affero General Public License v3.0 (GNU AGPLv3)**  
> **Fuente de Datos Abiertos:** 🏛️ **SECOP II — Datos Abiertos Colombia (`datos.gov.co`)**

---

## 📌 Tabla de Contenidos

1. 🏛️ [Autoría, Misión y Licencia (GNU AGPLv3)](#1-autoría-misión-y-licencia-gnu-agplv3)
2. 🧮 [Motor de Cálculo Matemático y Cruces de Datos](#2-motor-de-cálculo-matemático-y-cruces-de-datos)
   * 2.1 [Agregaciones Financieras Consolidadas](#21-agregaciones-financieras-consolidadas)
   * 2.2 [Evolución Temporal y Comparativa Mensual de Contratación](#22-evolución-temporal-y-comparativa-mensual-de-contratación)
   * 2.3 [Detección de Objetos Repetidos (Copia Literal)](#23-detección-de-objetos-repetidos-copia-literal)
   * 2.4 [Análisis Algorítmico de Similitud Léxica de Objetos (Jaccard + Inverted Index)](#24-análisis-algorítmico-de-similitud-léxica-de-objetos-jaccard--inverted-index)
   * 2.5 [Indicadores de Riesgo y Control Ciudadano](#25-indicadores-de-riesgo-y-control-ciudadano)
   * 2.6 [Consolidación y Recurrencia de Contratistas](#26-consolidación-y-recurrencia-de-contratistas)
   * 2.7 [Motor de Búsqueda Predictiva en Tiempo Real y Gestión de Historial Local](#27-motor-de-búsqueda-predictiva-en-tiempo-real-y-gestión-de-historial-local)
3. 💻 [Procesamiento fuera del Hilo Principal (Web Worker)](#3-procesamiento-fuera-del-hilo-principal-web-worker)
4. 🔗 [Enlaces Oficiales y Documentación de la API Socrata (SECOP II)](#4-enlaces-oficiales-y-documentación-de-la-api-socrata-secop-ii)
5. 📋 [Campos Consumidos y Política de Minimización de Datos](#5-campos-consumidos-y-política-de-minimización-de-datos)
   * 5.1 [Tabla Detallada de Campos de la API](#51-tabla-detallada-de-campos-de-la-api)
   * 5.2 [Análisis Normativo y Política de Minimización de Datos Personales (Habeas Data)](#52-análisis-normativo-y-política-de-minimización-de-datos-personales-habeas-data)
6. 📡 [Encabezados HTTP de Socrata (SODA API v2.1)](#6-encabezados-http-de-socrata-soda-api-v21)
   * 6.1 [Encabezados Disponibles en la Plataforma Socrata](#61-encabezados-disponibles-en-la-plataforma-socrata)
   * 6.2 [Encabezados y Estrategias Utilizados por Contrato-Claro](#62-encabezados-y-estrategias-utilizados-por-contrato-claro)

---

## 1. 🏛️ Autoría, Misión y Licencia (GNU AGPLv3)

**Contrato-Claro** ha sido ideado, concebido y desarrollado bajo la dirección de **EDWIN MAURICIO CACERES ROMERO**, como una iniciativa cívica, técnica e independiente de fiscalización ciudadana, transparencia presupuestal y democratización del acceso a la información pública en Colombia.

### ⚖️ Licencia GNU Affero General Public License v3.0 (GNU AGPLv3)
Este proyecto se distribuye como **Software Libre** bajo los términos de la **GNU AGPLv3**. Esta licencia garantiza las cuatro libertades fundamentales de los usuarios y desarrolladores:
1. 🚀 **Libertad de usar** el programa para cualquier propósito.
2. 🔬 **Libertad de estudiar** cómo funciona el programa y modificarlo para que haga lo que usted desee.
3. 🤝 **Libertad de redistribuir** copias para ayudar a otros.
4. 💡 **Libertad de mejorar** el programa y publicar las mejoras, con la condición sine qua non de que cualquier persona que despliegue o provea el servicio a través de una red de computadoras (servidores web, aplicaciones SaaS) **debe hacer disponible el código fuente completo modificado bajo la misma licencia AGPLv3**.

---

## 2. 🧮 Motor de Cálculo Matemático y Cruces de Datos

El motor analítico de la aplicación (ubicado en `src/utils/metricsEngine.ts`, `src/utils/monthlyAnalysis.ts` y `src/workers/similarityWorker.ts`) consolida los registros crudos del SECOP II y ejecuta cruces de datos mediante modelos estadísticos y algoritmos de procesamiento de lenguaje natural.

### 2.1 Agregaciones Financieras Consolidadas

Dado un conjunto de contratos $C = \{c_1, c_2, \dots, c_n\}$ obtenido para un determinado ámbito territorial o filtro de vigencia:

* **Monto Total Contratado ($V_{\text{contratado}}$):**
  $$V_{\text{contratado}} = \sum_{i=1}^{n} \text{valor\_del\_contrato}(c_i)$$

* **Monto Total Pagado ($V_{\text{pagado}}$):**
  $$V_{\text{pagado}} = \sum_{i=1}^{n} \text{valor\_pagado}(c_i)$$

* **Saldo Pendiente de Pago ($V_{\text{pendiente\_pago}}$):**
  $$V_{\text{pendiente\_pago}} = \sum_{i=1}^{n} \text{valor\_pendiente\_de\_pago}(c_i)$$

* **Saldo Pendiente de Ejecución ($V_{\text{pendiente\_ejecucion}}$):**
  $$V_{\text{pendiente\_ejecucion}} = \sum_{i=1}^{n} \text{valor\_pendiente\_de\_ejecucion}(c_i)$$

* **Conteo de Actores Unívocos (Contratistas y Supervisores):**
  $$\text{Total Contratistas} = \left| \{ \text{NORMALIZAR}(\text{proveedor\_adjudicado}(c_i)) \mid c_i \in C \} \right|$$
  $$\text{Total Supervisores} = \left| \{ \text{NORMALIZAR}(\text{nombre\_supervisor}(c_i)) \mid c_i \in C \} \right|$$

---

### 2.2 Evolución Temporal y Comparativa Mensual de Contratación

Para la vista comparativa de tres columnas (*Mes Anterior* $M_{-1}$, *Mes Seleccionado* $M_0$, *Mes Siguiente* $M_{+1}$):

* **Promedio Mensual Consolidado ($\bar{V}_{\text{mensual}}$):**
  $$\bar{V}_{\text{mensual}} = \frac{V_{\text{total\_anual}}}{\text{Cantidad de Meses Activos con Registros}}$$

* **Desviación Presupuestaria Respecto al Promedio ($D_{\%}$):**
  $$D_{\%} = \left( \frac{V_{M_0} - \bar{V}_{\text{mensual}}}{\bar{V}_{\text{mensual}}} \right) \times 100$$

* **Variación Porcentual Periodo a Periodo ($\Delta_{\%}$):**
  $$\Delta_{\% (M_{-1} \to M_0)} = \left( \frac{V_{M_0} - V_{M_{-1}}}{V_{M_{-1}}} \right) \times 100$$

* **Cálculo del Valor Promedio por Contrato ($\bar{v}_{\text{contrato}}$):**
  $$\bar{v}_{\text{contrato}} = \frac{V_{M_0}}{N_{M_0}}$$

* **Identificación del Contrato Mayor (Mayor Cuantía):**
  $$c_{\text{max}} = \arg\max_{c \in M_0} (\text{valor\_del\_contrato}(c))$$

---

### 2.3 Detección de Objetos Repetidos (Copia Literal)

Identifica contratos cuyos textos de objeto coinciden exactamente carácter por carácter tras normalizar espacios y mayúsculas:

1. **Función de Normalización de Llave:**
   $$K(c) = \text{REEMPLAZAR\_ESPACIOS\_MULTIPLES}(\text{MAYUSCULAS}(\text{TRIM}(\text{objeto\_del\_contrato}(c))))$$
2. **Agrupación y Filtrado:**
   Se agrupan los contratos por $K(c)$ y se retienen únicamente aquellos grupos donde la cardinalidad $|G| > 1$.
3. **Métricas del Grupo Repetido:**
   * Cantidad de duplicados: $N_G = |G|$
   * Valor acumulado del patrón: $V_G = \sum_{c \in G} \text{valor\_del\_contrato}(c)$
   * Lista de contratistas involucrados en el mismo patrón de texto.

---

### 2.4 Análisis Algorítmico de Similitud Léxica de Objetos (Jaccard + Inverted Index)

Para detectar posibles fraccionamientos de contratos o redacciones similares con ligeras variaciones:

1. **Filtrado de Stopwords Específicas de Contratación Pública en Colombia:**
   Se remueven palabras vacías y términos genéricos frecuentes en el SECOP II mediante el conjunto estático $\mathcal{S}_{\text{stopwords}}$:
   $$\mathcal{S}_{\text{stopwords}} = \{ \text{'DE'}, \text{'EL'}, \text{'LA'}, \text{'Y'}, \text{'EN'}, \text{'CON'}, \text{'POR'}, \text{'PARA'}, \text{'CONTRATO'}, \text{'PRESTACION'}, \text{'SERVICIOS'}, \text{'MUNICIPIO'}, \text{'APOYO'}, \text{'GESTION'}, \text{'ACTIVIDADES'}, \dots \}$$

2. **Tokenización y Creación de Conjuntos de Palabras Clave ($W_c$):**
   Dado un objeto $O(c)$, se convierte a texto ASCII desprovisto de tildes y caracteres especiales, reteniendo palabras de longitud $L > 3$ no pertenecientes a $\mathcal{S}_{\text{stopwords}}$.

3. **Coeficiente de Similitud de Jaccard:**
   Para dos contratos $c_i$ y $c_j$ con conjuntos de tokens $W_{c_i}$ y $W_{c_j}$:
   $$J(W_{c_i}, W_{c_j}) = \frac{|W_{c_i} \cap W_{c_j}|}{|W_{c_i} \cup W_{c_j}|}$$

4. **Optimización con Índice Invertido (Inverted Index):**
   Para evitar la complejidad cuadrática $O(N^2)$ al comparar miles de objetos, se construye un índice invertido:
   $$\text{Index}(t) = \{ i \mid t \in W_{c_i} \}$$
   Solo se evalúa $J(W_{c_i}, W_{c_j})$ para aquellos pares que comparten al menos un token significativo en el índice invertido y cumplen la cota de longitud:
   $$0.55 \cdot |W_{c_i}| \le |W_{c_j}| \le \frac{|W_{c_i}|}{0.55}$$

5. **Criterio de Agrupamiento (Cluster Threshold):**
   Se agrupan objetos si $J(W_{c_i}, W_{c_j}) \ge 0.55$.

---

### 2.5 Indicadores de Riesgo y Control Ciudadano

El sistema calcula 5 indicadores automáticos de fiscalización cívica:

1. 🔶 **Contratos Modificados:** Estado contractual formal con etiquetas que contienen "Modificado".
2. ⏳ **Días Adicionados:** Contratos con $\text{dias\_adicionados} > 0$.
3. 🚨 **Vencidos en Ejecución:** Contratos con $\text{estado\_contrato} \subseteq \text{"Ejecución"}$ cuya $\text{fecha\_de\_fin\_del\_contrato} < \text{Fecha Referencia}$.
4. 💰 **Pago Adelantado Reportado:** Contratos con $\text{valor\_de\_pago\_adelantado} > 0$.
5. 📊 **Saldos por Ejecutar:** Contratos con $\text{valor\_pendiente\_de\_ejecucion} > 0$.

---

### 2.6 Consolidación y Recurrencia de Contratistas

Para evitar duplicidad de nombres o discrepancias de tipeo por parte de las entidades públicas:

* **Llave Unívoca de Contratista:**
  $$K_{\text{contratista}} = \text{MAYUSCULAS}(\text{proveedor\_adjudicado}) \mathbin{\Vert} \text{documento\_proveedor}$$
* **Contratistas Recurrentes:** Se agrupan los contratos por $K_{\text{contratista}}$ y se filtran aquellos con $N_{\text{contratos}} > 1$.

---

### 2.7 Motor de Búsqueda Predictiva en Tiempo Real y Gestión de Historial Local

Para facilitar la navegación acelerada y autónoma de los ciudadanos dentro del listado de contrataciones públicas, el módulo `src/components/PredictiveSearchBar.tsx` implementa un motor predictivo reactivo en tiempo real:

1. **Estructura de Indexación Predictiva Multicriterio:**
   El motor escanea los contratos cargados en memoria y extrae sugerencias dinámicas categorizadas en cuatro tipos de coincidencias:
   * **Proveedores / Adjudicatarios:** Agrupa razones sociales o nombres de contratistas coincidentes, contabilizando el número total de contratos asociados ($N_{\text{coincidencias}}$).
   * **Objetos Contractuales:** Indexa frases y resúmenes descriptivos de las contrataciones que contienen la cadena de consulta.
   * **Supervisores Asignados:** Extrae nombres de los funcionarios o contratistas de supervisión pública.
   * **Referencias e Identificadores (ID / Ref):** Identifica códigos únicos de expedientes en SECOP II.

2. **Normalización Léxica e Inmunidad a Acentos:**
   Todas las comparaciones utilizan la función de normalización unicode `NFD` para remover tildes y diacríticos, convirtiendo las cadenas a minúsculas limpias:
   $$\text{NORM}(S) = \text{REEMPLAZAR\_DIACRITICOS}(\text{MINUSCULAS}(\text{NFD}(S)))$$

3. **Arquitectura Modular de Filtros Separados:**
   La barra de herramientas del panel de control organiza los mecanismos de filtrado en capas independientes:
   * **1ª Fila — Búsqueda por Texto General & Palabras Clave:** Permite la búsqueda libre no predictiva y la adición de etiquetas de palabras clave (hasta 10 etiquetas con eliminación individual).
   * **2ª Fila — Búsqueda Predictiva Auto:** Componente dedicado con menú desplegable de sugerencias automáticas en tiempo real.
   * **3ª Fila — Barra de Estado de Filtros Activos & Reset General:** Resumen visual de filtros aplicados con opción de restablecimiento completo.

4. **Persistencia e Historial Cívico Privado (`localStorage`):**
   * Las búsquedas seleccionadas se almacenan localmente en el dispositivo del usuario bajo la clave `contrato_claro_recent_searches_v1`.
   * **Control de Privacidad del Ciudadano:** Incluye un botón explícito de **"Borrar Historial"** (`clearAllRecentSearches`) que elimina de forma inmediata la totalidad del historial guardado en el almacenamiento local del navegador.

---

## 3. 💻 Procesamiento fuera del Hilo Principal (Web Worker)

Para mantener una experiencia de usuario fluida a 60 FPS sin congelar la interfaz gráfica al procesar miles de registros:

* **Worker Dedicado:** `src/workers/similarityWorker.ts`
* **Mecanismo de Mensajería:** `postMessage` asíncrono con identificación única por petición (`requestId`).
* **Terminación Automática:** Cancelación y limpieza de trabajadores en el ciclo de vida de React (`useEffect` cleanup).

---

## 4. 🔗 Enlaces Oficiales y Documentación de la API Socrata (SECOP II)

Si cualquier ciudadano, desarrollador o investigador desea consultar la totalidad de los campos del dataset en la fuente oficial de Datos Abiertos de Colombia o en la documentación oficial de la API de Socrata, puede acceder a los siguientes enlaces públicos:

* 🏛️ **Ficha del Dataset Oficial en Datos Abiertos Colombia:**  
  [https://www.datos.gov.co/Gastos-Publicos/SECOP-II-Contratos-Electronicos/jbjy-vk9h/about_data](https://www.datos.gov.co/Gastos-Publicos/SECOP-II-Contratos-Electronicos/jbjy-vk9h/about_data)
* 📡 **Endpoint directo de la API JSON (Dataset SECOP II `jbjy-vk9h`):**  
  [https://www.datos.gov.co/resource/jbjy-vk9h.json](https://www.datos.gov.co/resource/jbjy-vk9h.json)
* 📚 **Documentación de Desarrollo para la API SECOP II en Socrata Developer Portal:**  
  [https://dev.socrata.com/foundry/www.datos.gov.co/jbjy-vk9h](https://dev.socrata.com/foundry/www.datos.gov.co/jbjy-vk9h)
* 📖 **Especificación General del Estándar SODA API (Socrata Open Data API v2.1):**  
  [https://dev.socrata.com/docs/endpoints.html](https://dev.socrata.com/docs/endpoints.html)

---

## 5. 📋 Campos Consumidos y Política de Minimización de Datos

### 5.1 Tabla Detallada de Campos de la API

La aplicación procesa y valida los siguientes campos del dataset oficial en Socrata (`jbjy-vk9h.json`):

| # | Campo en Socrata API | Campo en TypeScript (`Contrato`) | Tipo de Dato | Descripción y Uso en Contrato-Claro |
|---|----------------------|----------------------------------|--------------|-------------------------------------|
| 1 | `nombre_entidad` | `nombre_entidad` | `string` | Nombre oficial de la entidad estatal contratante. |
| 2 | `nit_entidad` | `nit_entidad` | `string` | NIT de la entidad pública contratante. |
| 3 | `codigo_entidad` | `codigo_entidad` | `string` | Identificador único de la entidad en SECOP II. Usado para filtros SoQL precisos. |
| 4 | `departamento` | `departamento` | `string` | Departamento geográfico de localización. |
| 5 | `ciudad` | `ciudad` | `string` | Municipio o ciudad de localización. |
| 6 | `id_contrato` | `id_contrato` | `string` | Código de identificación único del contrato. |
| 7 | `referencia_del_contrato` | `referencia_del_contrato` | `string` | Número o código de referencia interno del contrato. |
| 8 | `proceso_de_compra` | `proceso_de_compra` | `string` | Código del proceso de selección en SECOP II. |
| 9 | `urlproceso` | `urlproceso` | `object \| string` | Enlace directo al expediente en SECOP II. |
| 10 | `estado_contrato` | `estado_contrato` | `string` | Estado legal (Borrador, En ejecución, Modificado, Liquidado, etc.). |
| 11 | `tipo_de_contrato` | `tipo_de_contrato` | `string` | Clasificación del contrato (Prestación de Servicios, Obra, Suministro, etc.). |
| 12 | `modalidad_de_contratacion` | `modalidad_de_contratacion` | `string` | Modalidad legal (Directa, Licitación Pública, Selección Abreviada, etc.). |
| 13 | `justificacion_modalidad_de` | `justificacion_modalidad_de` | `string` | Justificación legal para la modalidad elegida. |
| 14 | `objeto_del_contrato` | `objeto_del_contrato` | `string` | Texto descriptivo del objeto a contratar (insumo de similitud léxica). |
| 15 | `descripcion_del_proceso` | `descripcion_del_proceso` | `string` | Detalle extendido de la necesidad o alcance. |
| 16 | `condiciones_de_entrega` | `condiciones_de_entrega` | `string` | Condiciones y plazos pactados para la entrega. |
| 17 | `fecha_de_firma` | `fecha_de_firma` | `string` | Fecha formal de suscripción del documento contractual (YYYY-MM-DD). |
| 18 | `fecha_de_inicio_del_contrato` | `fecha_de_inicio_del_contrato` | `string` | Fecha de inicio de ejecución o acta de inicio. |
| 19 | `fecha_de_fin_del_contrato` | `fecha_de_fin_del_contrato` | `string` | Fecha prevista o de terminación contractual. |
| 20 | `ultima_actualizacion` | `ultima_actualizacion` | `string` | Fecha de la última modificación en la plataforma SECOP II. |
| 21 | `tipodocproveedor` | `tipodocproveedor` | `string` | Tipo de documento del adjudicatario (NIT, Cédula de Ciudadanía, etc.). |
| 22 | `documento_proveedor` | `documento_proveedor` | `string` | Número de identificación tributaria o comercial del contratista adjudicado. |
| 23 | `proveedor_adjudicado` | `proveedor_adjudicado` | `string` | Razón social o nombre del contratista. |
| 24 | `codigo_proveedor` | `codigo_proveedor` | `string` | Identificador único del proveedor en el registro RUP/SECOP. |
| 25 | `valor_del_contrato` | `valor_del_contrato` | `number \| string` | Monto total en Pesos Colombianos (COP) acordado en el contrato. |
| 26 | `valor_de_pago_adelantado` | `valor_de_pago_adelantado` | `number \| string` | Importe asignado como anticipo o pago adelantado. |
| 27 | `valor_facturado` | `valor_facturado` | `number \| string` | Monto acumulado en facturación o cuentas de cobro presentadas. |
| 28 | `valor_pagado` | `valor_pagado` | `number \| string` | Monto efectivamente desembolsado y girado al contratista. |
| 29 | `valor_pendiente_de_pago` | `valor_pendiente_de_pago` | `number \| string` | Saldo facturado u obligado pendiente de pago. |
| 30 | `valor_pendiente_de_ejecucion` | `valor_pendiente_de_ejecucion` | `number \| string` | Saldo pendiente por ejecutar presupuestalmente. |
| 31 | `saldo_cdp` | `saldo_cdp` | `number \| string` | Saldo disponible del Certificado de Disponibilidad Presupuestal. |
| 32 | `nombre_supervisor` | `nombre_supervisor` | `string` | Nombre del funcionario o contratista designado como supervisor. |
| 33 | `nombre_ordenador_del_gasto` | `nombre_ordenador_del_gasto` | `string` | Nombre del funcionario ordenador de gasto. |
| 34 | `duraci_n_del_contrato` | `duraci_n_del_contrato` | `number \| string` | Duración o plazo en días o meses. |
| 35 | `dias_adicionados` | `dias_adicionados` | `number \| string` | Días agregados mediante prórroga o adición en tiempo. |
| 36 | `el_contrato_puede_ser_prorrogado` | `el_contrato_puede_ser_prorrogado` | `string` | Indicador si admite prórrogas ("Si" / "No"). |
| 37 | `direcci_n_de_ejecuci_n_del_contrato` | `direcci_n_de_ejecuci_n_del_contrato` | `string` | Dirección o sede física donde se presta el servicio. |
| 38 | `localizaci_n` | `localizaci_n` | `string` | Ubicación geográfica estandarizada. |
| 39 | `entidad_centralizada` | `entidad_centralizada` | `string` | Clasificación de descentralización. |
| 40 | `orden` | `orden` | `string` | Orden administrativo (Nacional, Territorial). |
| 41 | `sector` | `sector` | `string` | Sector de la administración pública (Educación, Salud, Hacienda, etc.). |
| 42 | `rama` | `rama` | `string` | Rama del poder público (Ejecutiva, Judicial, Legislativa, Órganos Autónomos). |

---

### 5.2 Análisis Normativo y Política de Minimización de Datos Personales (Habeas Data)

Contrato-Claro aplica de manera estricta los principios de **Minimización de Datos** y la normatividad colombiana de protección de datos personales (Ley Estatutaria 1581 de 2012 — Habeas Data y Ley 1712 de 2014 de Transparencia y Acceso a la Información Pública):

1. **Omisión de Documentos de Identidad de Supervisores y Ordenadores de Gasto:**
   * *Verificación técnica:* Los campos `tipo_de_documento_supervisor`, `documento_supervisor` y `documento_ordenador_del_gasto` **NO** se incluyen en la cláusula `$select` de las consultas a la API Socrata (`src/services/secopApi.ts`).
   * *Justificación de privacidad:* Los supervisores y ordenadores de gasto actúan como servidores públicos o contratistas en ejercicio de funciones públicas. Su nombre (`nombre_supervisor`, `nombre_ordenador_del_gasto`) es de conocimiento público para la rendición de cuentas. Sin embargo, exponer sus números de documento de identidad de persona natural carece de necesidad para el control cívico y podría vulnerar la intimidad personal o exponer a los funcionarios a riesgos de suplantación.

2. **Tratamiento del Documento del Contratista (`documento_proveedor`):**
   * El número de identificación comercial (NIT para personas jurídicas, o Cédula de Ciudadanía para personas naturales que contrataron con el Estado) es información de carácter público en el SECOP II bajo la Ley 1712 de 2014. Contrato-Claro únicamente procesa este dato para consolidar la recurrencia contractual y evitar homónimos entre contratistas.

3. **Inexistencia de Rastreo o Perfilamiento:**
   * No se almacenan cookies de seguimiento, ni se registran direcciones IP ni datos personales de los usuarios ciudadanos que consultan la plataforma.

---

## 6. 📡 Encabezados HTTP de Socrata (SODA API v2.1)

### 6.1 Encabezados Disponibles en la Plataforma Socrata

La especificación **SODA (Socrata Open Data API v2.1)** ofrece múltiples encabezados HTTP de solicitud y respuesta para el control de tráfico y metadatos:

#### 📥 Encabezados de Solicitud (Request Headers):
* **`X-App-Token`:** Clave de aplicación expedida por Socrata para evitar la restricción por throttling de IP (permite hasta 50.000 solicitudes por hora).
* **`Accept`:** Formato deseado en la respuesta (`application/json`, `text/csv`, `application/rdf+xml`).
* **`Content-Type`:** Tipo de contenido del cuerpo en peticiones POST/PUT/DELETE (`application/json`).
* **`If-Modified-Since`:** Permite validación condicional en caché HTTP (`304 Not Modified`).

#### 📤 Encabezados de Respuesta (Response Headers):
* **`X-Soda2-Fields`:** Lista serializada en JSON con los nombres exactos de los campos retornados en el conjunto de resultados.
* **`X-Soda2-Types`:** Tipos de datos nativos de las columnas en Socrata (`text`, `number`, `calendar_date`, `url`, etc.).
* **`X-Soda2-Data-Out-Of-Date`:** Indicador booleano que señala si el índice del conjunto de datos está en proceso de actualización en los servidores de Socrata.
* **`X-Total-Count`:** Conteo total de registros que coinciden con la consulta cuando se pasa `$summary=true` o `$count=true`.
* **`Link`:** Enlaces estándar RFC 5988 para paginación (`next`, `prev`, `first`, `last`).
* **`Cache-Control`:** Instrucciones de almacenamiento en caché provenientes de la CDN (Cloudflare).

---

### 6.2 Encabezados y Estrategias Utilizados por Contrato-Claro

En **Contrato-Claro**:

1. **Consultas SoQL Vía Parámetros de URL:**
   Las solicitudes se realizan mediante peticiones HTTP GET utilizando el estándar SoQL (*Socrata Query Language*):
   ```http
   GET /resource/jbjy-vk9h.json?$select=nombre_entidad,nit_entidad,codigo_entidad,departamento,ciudad,id_contrato,referencia_del_contrato,proceso_de_compra,urlproceso,estado_contrato,tipo_de_contrato,modalidad_de_contratacion,justificacion_modalidad_de,objeto_del_contrato,descripcion_del_proceso,condiciones_de_entrega,fecha_de_firma,fecha_de_inicio_del_contrato,fecha_de_fin_del_contrato,ultima_actualizacion,tipodocproveedor,documento_proveedor,proveedor_adjudicado,codigo_proveedor,valor_del_contrato,valor_de_pago_adelantado,valor_facturado,valor_pagado,valor_pendiente_de_pago,valor_pendiente_de_ejecucion,saldo_cdp,nombre_supervisor,nombre_ordenador_del_gasto,duraci_n_del_contrato,dias_adicionados,el_contrato_puede_ser_prorrogado,localizaci_n,entidad_centralizada,orden,sector,rama&$where=codigo_entidad='123' AND fecha_de_firma >= '2026-01-01'&$order=fecha_de_firma DESC&$limit=2000 HTTP/1.1
   Host: www.datos.gov.co
   Accept: application/json
   ```

2. **Uso Opcional de Token de Aplicación (`X-App-Token`):**
   Si se define la variable de entorno `VITE_SOCRATA_APP_TOKEN`, el cliente HTTP incluye automáticamente el encabezado:
   ```http
   X-App-Token: YOUR_SOCRATA_APP_TOKEN
   ```

3. **Estrategia Cívica de Caché Multinivel (IndexedDB):**
   Para evitar la saturación de los servidores gubernamentales de Datos Abiertos y garantizar una navegación instantánea, la aplicación almacena localmente en IndexedDB (`secop_transparencia_cache`):
   * **Catálogos de Departamentos y Ciudades:** TTL de 7 días.
   * **Directorio de Entidades Públicas:** TTL de 2 días.
   * **Consultas de Contratos por Periodo:** TTL de 30 minutos.

---

## 🛠️ Resumen de Créditos y Licencia

* **Autor Original y Desarrollador:** 👨‍💻 **EDWIN MAURICIO CACERES ROMERO**
* **Licencia de Código:** ⚖️ **GNU Affero General Public License v3.0 (GNU AGPLv3)**
* **Aviso de Términos:** Consulte [TERMINOS_DE_USO.md](TERMINOS_DE_USO.md) y [DESCARGO_DE_RESPONSABILIDAD.md](DESCARGO_DE_RESPONSABILIDAD.md).
