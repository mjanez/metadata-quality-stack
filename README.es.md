# Conjunto de herramientas para la calidad de Metadatos
[![ES](https://img.shields.io/badge/lang-ES-yellow.svg)](README.es.md) [![EN](https://img.shields.io/badge/lang-EN-blue.svg)](README.md)

Un conjunto completo de herramientas para analizar la calidad de los metadatos de datos abiertos. Basado en la metodología de Evaluación de Calidad de Metadatos ([MQA](https://data.europa.eu/mqa/methodology?locale=es)) del Portal Europeo de Datos.

## Descripción General

Esta herramienta ayuda a los publicadores y consumidores de datos a evaluar y mejorar la calidad de los metadatos en catálogos de datos abiertos. Analiza los metadatos conforme a los [principios FAIR+C](https://www.ccsd.cnrs.fr/es/principios-fair/) (Encontrabilidad, Accesibilidad, Interoperabilidad, Reusabilidad y Contextualidad) y proporciona informes detallados sobre las métricas de calidad.

## Funcionalidades

- **Evaluación de Calidad**: Evalúa los metadatos según la [metodología MQA](https://data.europa.eu/mqa/methodology?locale=es)
- **Integración con API**: API REST para acceso programático a servicios de validación
- **Interfaz Web**: Interfaz intuitiva para usuarios no técnicos
- **Seguimiento Histórico**: Almacena y visualiza la evolución de la calidad a lo largo del tiempo
- **Validación [SHACL](https://www.w3.org/TR/shacl/)**: Verifica el cumplimiento con los estándares [DCAT-AP](https://semiceu.github.io/DCAT-AP/releases/3.0.0/), [DCAT-AP-ES](https://github.com/datosgobes/DCAT-AP-ES) y [NTI-RISP](https://github.com/datosgobes/NTI-RISP).

![Home](/docs/img/app_1.png)
![Home](/docs/img/app_2.png)
![Home](/docs/img/app_3.png)
![Home](/docs/img/app_4.png)
![Home](/docs/img/app_5.png)
![Home](/docs/img/openapi.png)

## Arquitectura

El proyecto consta de dos componentes principales:

1. **API**: [Backend](#backend-api) basado en [FastAPI](https://fastapi.tiangolo.com/) que valida metadatos y genera informes
2. **Frontend**: [Interfaz web](#frontend-interfaz-web) basada en [Streamlit](https://streamlit.io/) para visualizar informes

## Instalación

### Usando Docker (Recomendado)

1. Clona el repositorio:
   ```bash
   git clone https://github.com/your-organization/metadata-quality-stack.git
   cd metadata-quality-stack
   ```

2. Inicia los servicios usando Docker Compose:
   ```bash
   docker-compose up
   ```

### Instalación Manual

1. Clona el repositorio:
   ```bash
   git clone https://github.com/your-organization/metadata-quality-stack.git
   cd metadata-quality-stack
   ```

2. Instala las dependencias:
   ```bash
   pip install -e .
   ```

3. Inicia la API:
   ```bash
   uvicorn src.api.main:app --host 0.0.0.0 --port 8000
   ```

4. Inicia el frontend (en una terminal separada):
   ```bash
   streamlit run src/frontend/app.py
   ```

## Uso

### Backend (API)

La API proporciona los siguientes endpoints:

- **API base**: `http://localhost:80/`
- **Documentación OpenAPI**. Interfaz interactiva para probar la API: `http://localhost:80/docs`
- **Documentación ReDoc**. Documentación detallada en un formato más legible: `http://localhost:80/redoc`
- **Puntos finales**:
  - `POST` `/validate`: Validate metadata from a URL
  - `POST` `/validate-content`: Validate metadata provided directly as content
  - `GET` `/report/{url}`: Get the most recent report for a URL
  - `GET` `/history/{url}`: Get report history for a URL
  - `GET` `/reports/by-date`: Fetch reports within a specified date range
  - `GET` `/reports/by-rating/{rating}`: Get reports with a specific quality rating

### Frontend (Interfaz Web)

- **Interfaz Web**: `http://localhost:8501/`
- **Secciones principales**:
  1. **Opciones de Validación**:
     - Introducir una URL a un catálogo (formatos `RDF/XML`, `TTL`, `JSON-LD` y `N3`)
     - Pegar contenido RDF directamente para validación
     - Seleccionar diferentes perfiles de cumplimiento ([DCAT-AP](https://interoperable-europe.ec.europa.eu/collection/semic-support-centre/dcat-ap), [DCAT-AP-ES](https://github.com/datosgobes/DCAT-AP-ES), [NTI-RISP](https://github.com/datosgobes/NTI-RISP))

  2. **Características de Visualización**:
     - Gráfico jerárquico que muestra relaciones entre dimensiones y métricas
     - Gráfico de radar que muestra el rendimiento en las [dimensiones FAIR+C](https://data.europa.eu/mqa/methodology?locale=en)
     - Desglose detallado de métricas con conteos y porcentajes

  3. **Gestión de Informes**:
     - Ver informes históricos y rastrear la evolución de la calidad a lo largo del tiempo
     - Exportar informes en formatos `JSON` y `JSON-LD` con el [vocabulario DQV](https://www.w3.org/TR/vocab-dqv/)
     - Gráficos de evolución de puntuaciones para seguimiento de calidad a largo plazo

  4. **Panel de Análisis**:
     - Estadísticas generales de los catálogos evaluados
     - Distribución de calificaciones de calidad
     - Comparación de promedios por dimensión
     - Catálogos con mejor y peor desempeño
     - Análisis de correlación entre dimensiones

  5. **Soporte Multilingüe**:
     - Alternar entre interfaces en inglés y español
     - Descripciones y etiquetas de métricas localizadas

## Desarrollo

Para el desarrollo, se recomienda usar VS Code con la configuración de Dev Container provista:

1. Instala la extensión VS Code Remote - Containers
2. Abre el proyecto en VS Code
3. Haz clic en "Reopen in Container" cuando se te solicite
4. Espera a que el contenedor se construya y configure

### Traducción
Después de actualizar el archivo de traducción (`mqa.po`), no olvides compilarlo para generar el archivo `.mo`, por ejemplo, para español:

```sh
cd metadata-quality-stack
msgfmt -o locale/es/LC_MESSAGES/mqa.mo locale/es/LC_MESSAGES/mqa.po
```

## Licence

Consulte el archivo [LICENSE](/LICENSE) para conocer los derechos y limitaciones de la licencia (MIT).