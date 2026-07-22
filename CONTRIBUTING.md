# 🛠️ Guía de Contribución a Contrato-Claro 🇨🇴

> 👨‍💻 **Autoría e Idea Original:** **EDWIN MAURICIO CACERES ROMERO**  
> ⚖️ **Licencia:** **GNU Affero General Public License v3.0 (GNU AGPLv3)**

¡Gracias por tu interés en colaborar con **Contrato-Claro**! Tu aporte es fundamental para fortalecer la transparencia, el control social y la veeduría ciudadana en la contratación pública de Colombia.

Como proyecto de **Software Libre (GNU AGPLv3)**, damos la bienvenida a todo tipo de contribuciones: desde reportes de fallas (*bugs*), mejoras en la documentación, optimización de algoritmos de cálculo, hasta el diseño de nuevas interfaces.

---

## 🤝 ¿Cómo puedo contribuir?

### 1. 🐛 Reportar Errores o Sugerir Características
Si encuentras un error en el procesamiento de datos o tienes una propuesta de mejora:
* Revisa los *Issues* existentes para verificar si el tema ya ha sido reportado.
* Si no existe, abre un nuevo *Issue* describiendo los pasos para reproducir la falla o la nueva funcionalidad sugerida.

### 2. 💻 Contribuir con Código (Pull Requests)

#### Paso 1: Configurar el Entorno de Desarrollo
1. Realiza un **Fork** de este repositorio en tu cuenta de GitHub.
2. Clona tu fork localmente:
   ```bash
   git clone https://github.com/tu-usuario/contrato-claro.git
   cd contrato-claro
   ```
3. Instala las dependencias del proyecto:
   ```bash
   npm install
   ```

#### Paso 2: Crear una Rama de Trabajo
```bash
git checkout -b feature/nueva-grafica-metrica
# o para correcciones
git checkout -b fix/calculo-promedio-mensual
```

#### Paso 3: Respetar la Licencia GNU AGPLv3 ⚖️
Cualquier código o mejora agregada a la plataforma pasa a ser parte de la obra derivada bajo la **GNU Affero General Public License v3.0**. Si despliegas una versión modificada en la red, debes publicar el código fuente completo correspondiente.

#### Paso 4: Validar antes de Enviar 🔍
Antes de realizar tu *commit*, ejecuta el verificador estático y la compilación:
```bash
# Validar linter y tipos de TypeScript
npm run lint

# Compilar para producción
npm run build
```

#### Paso 5: Enviar tu Pull Request (PR) 🚀
Abre un **Pull Request** describiendo los cambios introducidos y referenciando el *issue* relacionado.

---

## 🧮 Lineamientos de Código y Arquitectura

* 📁 **Separación de Capas:** Los cálculos matemáticos y estadísticos deben agregarse en `src/utils/metricsEngine.ts` o archivos equivalentes en `src/utils/`, manteniendo las vistas de React libres de lógica pesada de procesamiento.
* 🧵 **Trabajadores en Segundo Plano (Web Workers):** Los cálculos de complejidad computacional superior (como similitud léxica o procesamiento de lenguaje natural) deben ejecutarse en `src/workers/similarityWorker.ts` para no bloquear el hilo principal de la UI.
* 📖 **Documentación Técnica:** Cualquier cambio en la forma de calcular métricas o consumir la API de Socrata debe reflejarse en **[`DOCUMENTACION_TECNICA.md`](DOCUMENTACION_TECNICA.md)**.
