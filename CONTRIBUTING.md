# Guía de Contribución a Contrato-Claro

¡Gracias por tu interés en colaborar con **Contrato-Claro**! Tu aporte es fundamental para fortalecer la transparencia y la participación ciudadana en la contratación pública de Colombia.

Como proyecto de código abierto y enfoque cívico, damos la bienvenida a todo tipo de contribuciones: desde reportes de fallas (*bugs*), mejoras en la documentación, optimizaciones en los algoritmos de análisis, hasta el diseño de nuevas interfaces ciudadanas.

---

## ¿Cómo puedo contribuir?

### 1. Reportar Errores o Sugerir Características
Si encuentras un error en el procesamiento de datos o tienes una idea para mejorar la experiencia de usuario:
* Revisa primero los *Issues* existentes para verificar si alguien ya reportó el mismo caso.
* Si no existe, abre un nuevo *Issue* usando un título descriptivo.
* Proporciona detalles técnicos: pasos para reproducir el error, capturas de pantalla si aplica, y tu sistema operativo o navegador.

### 2. Contribuir con Código (Pull Requests)
Si deseas implementar una corrección o una funcionalidad nueva, sigue este flujo de trabajo:

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
4. Configura las variables de entorno:
   * Copia `.env.example` como `.env`:
     ```bash
     cp .env.example .env
     ```
   * Completa las variables necesarias (como `GEMINI_API_KEY` para las funciones de análisis asistido si corresponde).

#### Paso 2: Crear una Rama de Trabajo
Crea una rama específica y descriptiva para tu cambio:
```bash
git checkout -b feature/nueva-visualizacion
# o para correcciones
git checkout -b fix/error-formato-moneda
```

#### Paso 3: Escribir Código Limpio
* Sigue las convenciones de estilo del proyecto (TypeScript, React funcional y Tailwind CSS).
* Asegúrate de no incluir claves secretas ni tokens de API en el código.
* Organiza los componentes de forma modular en `src/components/`.

#### Paso 4: Validar antes de Enviar
Antes de realizar tu *commit*, ejecuta el linter para comprobar que el código cumple con las reglas estáticas y compila perfectamente:
```bash
# Validar linter y tipos TypeScript
npm run lint

# Construir la aplicación localmente
npm run build
```

#### Paso 5: Enviar tu Pull Request (PR)
1. Realiza el *commit* con un mensaje claro y en presente (ej: `feat: agrega comparativa del promedio mensual de contratación`).
2. Sube la rama a tu fork:
   ```bash
   git push origin feature/nueva-visualizacion
   ```
3. Ve al repositorio original en GitHub y abre un **Pull Request**. Describe detalladamente qué cambios introduce tu código y a qué *issue* está asociado.

---

## Lineamientos de Código y Diseño

Para garantizar la consistencia visual y de rendimiento en la plataforma, te pedimos respetar los siguientes principios:

* **Arquitectura de Componentes:** Divide la lógica en archivos separados y modulares. Evita condensar toda la visualización en un único archivo gigante para facilitar el mantenimiento.
* **Diseño e Interfaz ("Anti-Slop"):** 
  * Prioriza temas limpios, claros y sofisticados con un esquema de color claro por defecto.
  * No abuses de degradados excesivos o sombras muy pesadas.
  * Todos los textos y etiquetas en pantalla deben ser de fácil comprensión para un ciudadano del común, reduciendo la jerga legal o técnica excesiva.
* **Tipado Estricto:** Usa TypeScript de manera adecuada. Evita el uso deliberado de `any` a menos que sea estrictamente indispensable.
* **Accesibilidad:** Mantén un contraste de color adecuado para asegurar la legibilidad del texto en cualquier dispositivo y bajo normas WCAG AA.
