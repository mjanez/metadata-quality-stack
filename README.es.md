# Metadata Quality Stack
[![ES](https://img.shields.io/badge/lang-ES-yellow.svg)](README.es.md) [![EN](https://img.shields.io/badge/lang-EN-blue.svg)](README.md) [![Static Demo](https://img.shields.io/badge/demo-GitHub%20Pages-green.svg)](https://metadata-quality.mjanez.dev/)

Un conjunto de herramientas completo para analizar la calidad de los metadatos de datos abiertos. Basado en la metodología de Evaluación de Calidad de Metadatos del Portal Europeo de Datos ([MQA](https://data.europa.eu/mqa/methodology?locale=en)) y en la validación mediante [SHACL](https://www.w3.org/TR/shacl/) para los perfiles [DCAT-AP](https://semiceu.github.io/DCAT-AP/), [DCAT-AP-ES](https://datosgobes.github.io/DCAT-AP-ES/) y [NTI-RISP (2013)](https://datosgobes.github.io/NTI-RISP/).

## Inicio Rápido

### **Prueba la versión React. ¡Es para la web!**
Prueba la versión simplificada para navegador (**sin instalación**), más información en [react-app/README.md](react-app/README.md).
> [!TIP]
> **Demo en vivo**: [`metadata-quality.mjanez.dev/`](https://metadata-quality.mjanez.dev/)
><br> Esta edición se ejecuta completamente del lado del cliente e incluye el núcleo de MQA y el validador SHACL para comprobaciones instantáneas de calidad de metadatos en tu navegador.

### **Despliegue completo con Docker** (Recomendado para validaciones más complejas)
Para funcionalidades completas, incluyendo seguimiento histórico y acceso por API:
```bash
git clone https://github.com/your-organization/metadata-quality-stack.git
cd metadata-quality-stack
docker-compose up
```

## Visión General

Esta herramienta ayuda a los publicadores y consumidores de datos a evaluar y mejorar la calidad de los metadatos en catálogos de datos abiertos. Analiza los metadatos frente a los principios [FAIR+C](https://www.ccsd.cnrs.fr/en/fair-guidelines/) (Findability, Accessibility, Interoperability, Reusability y Contextuality) y ofrece informes detallados sobre métricas de calidad.

## Características

### **Dos Opciones de Despliegue**
1. **[Versión Estática](https://metadata-quality.mjanez.dev/)** - Compatible con GitHub Pages, sin backend
2. **[Versión Docker](#installation)** - Con todas las funcionalidades, base de datos y API

### **Capacidades Principales**
- **Evaluación de Calidad**: Evalúa metadatos según la [metodología MQA](https://data.europa.eu/mqa/methodology?locale=en)
- **Múltiples Perfiles**: Soporte para DCAT-AP, DCAT-AP-ES y NTI-RISP
- **Validación en Tiempo Real**: Retroalimentación instantánea sobre la calidad de los metadatos
- **Visualizaciones Interactivas**: Gráficos radar y desglose detallado de métricas
- **Soporte Multilingüe**: Interfaces en inglés y español
- **Integración API**: API REST para acceso programático (versión Docker)
- **Seguimiento Histórico**: Almacena y visualiza la evolución de la calidad a lo largo del tiempo (versión Docker)
- **Validación [SHACL](https://www.w3.org/TR/shacl/)**: Comprobación de cumplimiento con shapes oficiales de:
   - **[DCAT-AP](https://github.com/SEMICeu/DCAT-AP)**: Estándar del portal de datos europeo
   - **[DCAT-AP-ES](https://github.com/datosgobes/DCAT-AP-ES)**: Perfil nacional español  
   - **[NTI-RISP](https://github.com/datosgobes/NTI-RISP)**: Estándar de interoperabilidad español


### Versión Estática
![React](/docs/img/react_app_1.png)
![React](/docs/img/react_app_2.png)
![React](/docs/img/react_app_3.png)
![React](/docs/img/react_app_4.png)

### Versión Docker
![Home](/docs/img/app_1.png)
![Home](/docs/img/app_2.png)
![Home](/docs/img/app_3.png)
![Home](/docs/img/app_4.png)
![Home](/docs/img/app_5.png)
![Home](/docs/img/openapi.png)

## Arquitectura

### **Opciones de Despliegue**

#### **1. Versión Estática** (Solo cliente)
- **Ubicación**: directorio [https://metadata-quality.mjanez.dev/](https://metadata-quality.mjanez.dev/)
- **Tecnología**: HTML, CSS, TypeScript con [`N3.js`](https://github.com/rdfjs/N3.js), [`shacl-engine`](https://github.com/rdf-ext/shacl-engine), [`rdfxml-streaming-parser.js`](https://github.com/rdfjs/rdfxml-streaming-parser.js) y [React](https://es.react.dev/)  
- **Despliegue**: GitHub Pages, cualquier hosting estático
- **Características**: MQA y validación SHACL completas, visualización, sin backend requerido
- **Caso de uso**: Despliegues rápidos, entornos de demostración, casos de uso puntuales

#### **2. Versión Docker** (Full Stack)
- **Tecnología**: Backend con FastAPI + frontend con Streamlit + proxy nginx
- **Características**: Funcionalidad completa + base de datos + API + seguimiento histórico
- **Caso de uso**: Entornos de producción, despliegues empresariales

El proyecto consta de los siguientes componentes principales:

1. **API**: Backend basado en [FastAPI](https://fastapi.tiangolo.com/) que valida metadatos y genera informes
2. **Frontend**: Interfaz web basada en [Streamlit](https://streamlit.io/) para visualizar informes
3. **Versión Estática**: Implementación del lado del cliente para despliegue sencillo

## Instalación

### **Versión Estática** (Inicio rápido)

Usando https://metadata-quality.mjanez.dev/ 

**Características**: Validación completa de metadatos, comprobación de conformidad SHACL con shapes oficiales, sin backend requerido.

### **Versión Docker** (Producción)

Para funcionalidad completa con base de datos y API:

1. Clona el repositorio:
    ```bash
    git clone https://github.com/your-organization/metadata-quality-stack.git
    cd metadata-quality-stack
    ```

2. Inicia los servicios con Docker Compose:
    ```bash
    docker-compose up
    ```

### **Instalación Manual**

1. Clona el repositorio:
    ```bash
    git clone https://github.com/your-organization/metadata-quality-stack.git
    cd metadata-quality-stack
    ```

2. Instala dependencias:
    ```bash
    pip install -e .
    ```

3. Inicia la API:
    ```bash
    uvicorn src.api.main:app --host 0.0.0.0 --port 8000
    ```

4. Inicia el frontend (en otra terminal):
    ```bash
    streamlit run src/frontend/app.py
    ```

## Uso

### Backend (API)
La API ofrece los siguientes endpoints:

- **API base**: `http://localhost:80/`
- **Swagger UI**. Interfaz interactiva para probar la API: `http://localhost:80/docs`
- **ReDoc**. Documentación detallada: `http://localhost:80/redoc`
- **Endpoints**:
   - `POST` `/validate`: Valida metadatos desde una URL
   - `POST` `/validate-content`: Valida metadatos proporcionados directamente como contenido
   - `GET` `/report/{url}`: Obtiene el informe más reciente para una URL
   - `GET` `/history/{url}`: Obtiene el historial de informes para una URL
   - `GET` `/reports/by-date`: Recupera informes dentro de un rango de fechas especificado
   - `GET` `/reports/by-rating/{rating}`: Obtiene informes con una calificación de calidad específica

### Frontend (Interfaz Web)

- **Interfaz Web**: `http://localhost:8501/`
- **Secciones principales**:
   1. **Opciones de Validación**:
       - Introducir una URL a un catálogo (soporta `RDF/XML`, `TTL`, `JSON-LD` y `N3`)
       - Pegar contenido RDF directamente para validación
       - Seleccionar distintos perfiles de conformidad ([DCAT-AP](https://interoperable-europe.ec.europa.eu/collection/semic-support-centre/dcat-ap), [DCAT-AP-ES](https://github.com/datosgobes/DCAT-AP-ES), [NTI-RISP](https://github.com/datosgobes/NTI-RISP))

   2. **Funciones de Visualización**:
       - Gráfico jerárquico que muestra la relación entre dimensiones y métricas
       - Gráfico radar que muestra el rendimiento en las dimensiones [FAIR+C](https://data.europa.eu/mqa/methodology?locale=en)
       - Desglose detallado de métricas con conteos y porcentajes

   3. **Gestión de Informes**:
       - Ver informes históricos y seguir la evolución de la calidad
       - Exportar informes en formatos JSON y JSON-LD (vocabulario DQV)
       - Gráficos de evolución de puntuaciones para seguimiento a largo plazo

   4. **Panel de Analítica**:
       - Estadísticas generales de los catálogos evaluados
       - Distribución de calificaciones de calidad
       - Comparación de medias por dimensión
       - Catálogos mejor y peor evaluados
       - Análisis de correlación entre dimensiones

   5. **Soporte Multilingüe**:
       - Alternar entre interfaces en inglés y español
       - Descripciones y etiquetas de métricas localizadas

## Desarrollo

Para el desarrollo se recomienda usar VS Code con la configuración de Dev Container provista:

1. Instala la extensión Remote - Containers de VS Code
2. Abre el proyecto en VS Code
3. Haz clic en "Reopen in Container" cuando se solicite
4. Espera a que el contenedor se construya y configure

### Traducción
Tras actualizar el archivo de traducción (`mqa.po`), no olvides compilarlo para generar el archivo `.mo`, por ejemplo para español:

```sh
cd metadata-quality-stack

# Extraer textos i18n y actualizar el POT de las apps (p. ej. app.py)
xgettext -d mqa --from-code=UTF-8 -o locales/mqa.pot src/frontend/app.py

# Compilar archivos MO (Español)
msgfmt -o locale/es/LC_MESSAGES/mqa.mo locale/es/LC_MESSAGES/mqa.po
``` 

## Extender las Métricas de Perfiles

El sistema está diseñado de forma modular, permitiendo añadir o personalizar métricas para perfiles específicos (DCAT-AP, DCAT-AP-ES, NTI-RISP, etc.). Sigue estos pasos para extender o crear métricas para un perfil:

### 1. Define tus métricas en `config.py`

Cada métrica se define como un diccionario con ID, dimensión y peso. Para añadir métricas a un perfil nuevo o existente:

```python
# Define métricas específicas para tu perfil
MY_PROFILE_SPECIFIC_METRICS = [
      {"id": "my_new_metric", "dimension": "interoperability", "weight": 20},
      {"id": "another_metric", "dimension": "reusability", "weight": 15}
]

# Añade tus métricas al diccionario METRICS_BY_PROFILE
METRICS_BY_PROFILE["my_profile"] = COMMON_METRICS + MY_PROFILE_SPECIFIC_METRICS
```

### 2. Crea comprobadores para tus métricas en `validators.py`

Para cada nueva métrica, crea un comprobador que implemente la lógica de validación:

```python
# Crea una clase checker si las existentes no encajan
class MyCustomChecker(MetricChecker):
      def __init__(self, property_uri: URIRef):
            self.property_uri = property_uri
      
      def check(self, g: Graph, resources: List[URIRef], context: Dict[str, Any] = None) -> Tuple[int, int]:
            # Implementa la lógica de comprobación aquí
            # Retorna una tupla (count_successful, total)
            return (count, total)

# Añade tu checker al diccionario CHECKER_DEFINITIONS
CHECKER_DEFINITIONS.update({
      "my_new_metric": lambda: MyCustomChecker(MY_PROPERTY_URI),
      "another_metric": lambda: ExistingCheckerClass(MY_OTHER_PROPERTY)
})
```

### 3. Actualiza las puntuaciones por dimensión (si es necesario)

Si añades métricas a una nueva dimensión, asegúrate de registrar la dimensión en el enum DimensionType en `models.py` y actualiza la función `calculate_dimension_scores` en `validators.py` para incluir la nueva dimensión.

### 4. Registra tu perfil en el frontend (Opcional)

Para que tu perfil sea seleccionable en la UI, actualiza el diccionario `PROFILES` en `frontend/config.py`:

```python
PROFILES = {
      "dcat_ap": "DCAT-AP 2.0",
      "dcat_ap_es": "DCAT-AP-ES 2.0",
      "nti_risp": "NTI-RISP",
      "my_profile": "My Custom Profile"
}
```

### Ejemplo: Añadir un comprobador de formatos basado en etiquetas para NTI-RISP

Aquí un ejemplo de extensión de NTI-RISP con un comprobador que valida etiquetas frente a un vocabulario CSV:

1. Crea la clase checker especializada:

```python
class VocabularyLabelComplianceChecker(MetricChecker):
      """Check if property labels comply with a CSV-based vocabulary."""
      
      def __init__(self, property_uris: List[URIRef], csv_path: str, 
                         compare_column: str = None, label_property: URIRef = RDFS.label):
            self.property_uris = property_uris
            self.csv_path = csv_path
            self.compare_column = compare_column
            self.label_property = label_property
            # Initialize allowed values from CSV file
            # ...
      
      def check(self, g: Graph, resources: List[URIRef], context: Dict[str, Any] = None) -> Tuple[int, int]:
            # Check values against the allowed values, considering labels
            # ...
```

2. Añádelo a `CHECKER_DEFINITIONS`:

```python
CHECKER_DEFINITIONS.update({
      "dct_format_nonproprietary_nti": lambda: VocabularyLabelComplianceChecker(
            [DCTERMS.format], MQA_VOCABS['non_proprietary']
      )
})
```

3. Añade la métrica a `NTI_RISP_SPECIFIC_METRICS`:

```python
NTI_RISP_SPECIFIC_METRICS.append(
      {"id": "dct_format_nonproprietary_nti", "dimension": "interoperability", "weight": 25}
)
```

## Actualizar el Certificado SSL
Para actualizar el certificado SSL local, sigue estos pasos:

1. Genera un nuevo certificado y clave privada:
```sh
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
   -keyout nginx/setup/metadata-quality-stack.key \
   -out nginx/setup/metadata-quality-stack.crt \
   -subj "/C=ES/ST=Madrid/L=Madrid/O=Development/CN=localhost"
```

2. Verifica que los archivos se hayan creado correctamente:
```sh
ls -l nginx/setup/metadata-quality-stack.*
```

3. Reinicia el contenedor `nginx` para aplicar los cambios:
```sh
docker compose restart nginx
```

> [!CAUTION]
> Este certificado es solo para desarrollo local. En producción, utiliza un certificado válido emitido por una autoridad certificadora.

## Licencia

Consulta el archivo [LICENSE](/LICENSE) para los derechos y limitaciones de la licencia (MIT).