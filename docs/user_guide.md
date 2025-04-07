# Guía de Usuario: Herramienta de Análisis de Calidad de Metadatos

Esta guía proporciona instrucciones detalladas sobre cómo utilizar la Herramienta de Análisis de Calidad de Metadatos basada en la metodología MQA (Metadata Quality Assessment) del Portal Europeo de Datos.

## Contenido

1. [Introducción](#introducción)
2. [Acceso a la Herramienta](#acceso-a-la-herramienta)
3. [Validación de un Catálogo](#validación-de-un-catálogo)
4. [Interpretación de Resultados](#interpretación-de-resultados)
5. [Visualización de Históricos](#visualización-de-históricos)
6. [Dashboard Analítico](#dashboard-analítico)
7. [Descarga de Informes](#descarga-de-informes)
8. [Uso de la API](#uso-de-la-api)
9. [Solución de Problemas Comunes](#solución-de-problemas-comunes)
10. [Glosario](#glosario)

## Introducción

La Herramienta de Análisis de Calidad de Metadatos evalúa la calidad de los metadatos de catálogos de datos abiertos basándose en los principios FAIR+C:

- **F**indability (Descubrimiento)
- **A**ccessibility (Accesibilidad)
- **I**nteroperability (Interoperabilidad)
- **R**eusability (Reusabilidad)
- **C**ontextuality (Contexto)

Esta herramienta genera informes detallados que permiten a los publicadores de datos mejorar la calidad de sus metadatos y a los consumidores de datos evaluar la calidad de los catálogos disponibles.

## Acceso a la Herramienta

La herramienta está disponible como una aplicación web y como una API REST.

### Acceso Web

La interfaz web está disponible en:

```
http://localhost:8501
```

Por defecto, cuando el servicio está instalado localmente, o en la URL proporcionada por el administrador del sistema.

### Acceso API

La API REST está disponible en:

```
http://localhost:80
```

Por defecto, cuando el servicio está instalado localmente, o en la URL proporcionada por el administrador del sistema.

## Validación de un Catálogo

Para validar un catálogo de datos, siga estos pasos:

1. Acceda a la interfaz web de la herramienta.
2. En la navegación lateral, seleccione `MQA validation`.
3. En el campo `URL of the catalog in RDF/TTL format`, introduzca la URL completa del `RDF` que desea analizar.
   - La URL debe apuntar a un archivo en formato `RDF/XML`, `Turtle`, `JSON-LD`, o `N3`.
   - Ejemplo, un *dataset*: `https://datos.gob.es/es/catalogo/u00200001-indicadores-demanda-universitaria-2025.rdf`
4. Haga clic en el botón `Validate`.
5. La herramienta procesará el `RDF` y mostrará los resultados del análisis.

>[!NOTE]
> El tiempo de procesamiento puede variar dependiendo del tamaño de la serialización `RDF` y la complejidad de los metadatos.

## Interpretación de Resultados

Una vez completado el análisis, la herramienta muestra los resultados en varias secciones:

### 1. Resumen General

- **Total Score**: Puntuación total obtenida sobre los 405 puntos posibles de la [metodología](https://data.europa.eu/mqa/methodology?locale=es).
- **Rating**: Calificación global (`Excellent`, `Good`, `Sufficient`, `Bad`).
- **Assessment Date**: Fecha en que se realizó el análisis.
- **Download Report**: Descarga del fichero con el informe de validación en formato `JSON` o serializado en `JSON-LD` conforme al vocabulario *Data Quality Vocabulary* ([DQV](https://www.w3.org/TR/vocab-dqv/))

### 2. Puntuaciones por Dimensión

Un gráfico de barras muestra la puntuación porcentual obtenida en cada una de las cinco dimensiones:

- **Findability**: Capacidad para encontrar los datos (máximo 100 puntos).
- **Accessibility**: Facilidad de acceso a los datos (máximo 100 puntos).
- **Interoperability**: Capacidad para interoperar con los datos (máximo 110 puntos).
- **Reusability**: Facilidad para reutilizar los datos (máximo 75 puntos).
- **Contextuality**: Contextualización adecuada de los datos (máximo 20 puntos).

### 3. Métricas Detalladas

En esta sección, disponible desplegando cada dimensión, se muestra información detallada sobre las métricas específicas evaluadas:

- **Metric**: Nombre de la métrica evaluada.
- **Count**: Número de elementos que cumplen con la métrica.
- **Total**: Número total de elementos evaluados.
- **Percentage (%)**: Porcentaje de cumplimiento.
- **Points**: Puntos obtenidos en esta métrica.
- **Max Points**: Puntos máximos posibles para esta métrica.

## Visualización de Históricos

Para visualizar la evolución de la calidad de los metadatos de un catálogo a lo largo del tiempo:

1. Acceda a la interfaz web de la herramienta.
2. En la navegación lateral, seleccione "MQA validation".
3. En el campo "URL of the catalog in RDF/TTL format", introduzca la URL del catálogo.
4. Haga clic en el botón "Show History".
5. La herramienta mostrará gráficos de evolución temporal para:
   - Puntuación total a lo largo del tiempo
   - Puntuaciones por dimensión a lo largo del tiempo
   - Listado detallado de todos los informes históricos

Esta funcionalidad le permite identificar tendencias, mejoras y áreas de oportunidad en la calidad de los metadatos a lo largo del tiempo.

## Dashboard Analítico

El dashboard analítico proporciona una visión global de la calidad de metadatos en múltiples catálogos:

1. Acceda a la interfaz web de la herramienta.
2. En la navegación lateral, seleccione "Analytics Dashboard".
3. Use los controles de fecha para filtrar el rango temporal de análisis.

El dashboard incluye:

- **Estadísticas Generales**: Número de catálogos analizados, evaluaciones totales, puntuación media.
- **Distribución de Calificaciones**: Gráfico con la distribución de calificaciones (Excellent, Good, Sufficient, Bad).
- **Puntuaciones Medias por Dimensión**: Comparativa de puntuaciones medias en cada dimensión.
- **Mejores y Peores Catálogos**: Tablas con los catálogos de mayor y menor puntuación.
- **Correlaciones entre Dimensiones**: Matriz de correlación que muestra relaciones entre las distintas dimensiones.

## Descarga de Informes

Para descargar un informe de calidad:

1. Después de validar un catálogo, desplácese hasta el final del informe.
2. Haga clic en el botón `Download Report (JSON)`.
3. El informe se descargará en formato JSON con toda la información detallada del análisis.

Este informe descargado puede ser útil para:
- Archivar resultados históricos
- Compartir los resultados con otros miembros del equipo
- Procesar los resultados con herramientas externas
- Generar informes personalizados

## Uso de la API

La herramienta ofrece una API REST para integración con otras aplicaciones o para uso automatizado.

### Endpoints Principales

1. **Validar un catálogo**:
   ```
   POST /validate?url={url}
   ```
   Ejemplo:
   ```
   POST /validate?url=https://datos.gob.es/catalog.rdf
   ```

2. **Obtener el informe más reciente**:
   ```
   GET /report/{url_encoded}
   ```
   Donde `url_encoded` es la URL del catálogo codificada.

3. **Obtener el historial de informes**:
   ```
   GET /history/{url_encoded}
   ```

4. **Obtener informes por rango de fechas**:
   ```
   GET /reports/by-date?start_date={start_date}&end_date={end_date}
   ```
   Ejemplo:
   ```
   GET /reports/by-date?start_date=2025-01-01&end_date=2025-03-23
   ```

5. **Obtener informes por calificación**:
   ```
   GET /reports/by-rating/{rating}
   ```
   Donde `rating` puede ser "Excellent", "Good", "Sufficient" o "Bad".

**Nota**: Existe un límite de 5 solicitudes por minuto para el endpoint de validación.

### Ejemplo de uso con curl

```bash
# Validar un catálogo
curl -X POST "http://localhost:80/validate?url=https://datos.gob.es/catalog.rdf"

# Obtener el informe más reciente
curl "http://localhost:80/report/https%3A%2F%2Fdatos.gob.es%2Fcatalog.rdf"
```

## Solución de Problemas Comunes

### El catálogo no puede ser analizado

**Problema**: La herramienta muestra un error al intentar analizar un catálogo.

**Soluciones**:
1. Verifique que la URL sea correcta y esté accesible públicamente.
2. Asegúrese de que el archivo esté en uno de los formatos soportados (RDF/XML, Turtle, JSON-LD, N3).
3. Compruebe que el catálogo no esté protegido por autenticación.
4. Verifique que el archivo no esté corrupto descargándolo manualmente.

### No se muestra el historial

**Problema**: Al hacer clic en "Show History", no aparece ningún dato.

**Soluciones**:
1. Asegúrese de que ha analizado previamente el catálogo al menos una vez.
2. Verifique que está introduciendo exactamente la misma URL utilizada anteriormente.
3. Compruebe si hay algún mensaje de error que indique un problema con la base de datos.

### Resultados de análisis inesperados

**Problema**: Los resultados del análisis no coinciden con lo esperado.

**Soluciones**:
1. Revise los detalles de cada métrica para entender qué aspectos están siendo evaluados.
2. Compare el catálogo con las recomendaciones de DCAT-AP/DCAT-AP-ES.
3. Verifique si ha habido cambios recientes en el catálogo.

## Glosario

- **DCAT**: Data Catalog Vocabulary, estándar del W3C para describir catálogos de datos.
- **DCAT-AP**: Perfil de aplicación de DCAT para portales de datos en Europa.
- **DCAT-AP-ES**: Perfil de aplicación de DCAT-AP adaptado para España.
- **DQV**: Data Quality Vocabulary, estándar para describir la calidad de los datos.
- **FAIR**: Principios de Findability, Accessibility, Interoperability y Reusability.
- **MQA**: Metadata Quality Assessment, metodología de evaluación de calidad de metadatos.
- **NTI-RISP**: Norma Técnica de Interoperabilidad de Reutilización de Información del Sector Público.
- **RDF**: Resource Description Framework, modelo estándar para intercambio de datos en la web.
- **SHACL**: Shapes Constraint Language, lenguaje para validar grafos RDF.