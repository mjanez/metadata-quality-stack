# Metadata Quality Stack
[![ES](https://img.shields.io/badge/lang-ES-yellow.svg)](README.es.md) [![EN](https://img.shields.io/badge/lang-EN-blue.svg)](README.md) [![Demo Estático](https://img.shields.io/badge/demo-GitHub%20Pages-green.svg)](https://mjanez.github.io/metadata-quality-stack/)

Un conjunto de herramientas integral para analizar la calidad de los metadatos de datos abiertos. Basado en la metodología de Evaluación de Calidad de Metadatos ([MQA](https://data.europa.eu/mqa/methodology?locale=es)) del Portal Europeo de Datos y [validación SHACL](https://www.w3.org/TR/shacl/) para perfiles [DCAT-AP](https://semiceu.github.io/DCAT-AP/), [DCAT-AP-ES](https://datosgobes.github.io/DCAT-AP-ES/) y [NTI-RISP (2013)](https://www.boe.es/eli/es/res/2013/02/19/(4)).

## Inicio Rápido

### **Prueba la versión estática simple** (Sin instalación requerida)
Prueba la versión simplificada en el navegador (**no requiere instalación**) más información en [react-app/README.md](react-app/README.md).

> [!TIP]
> **Demo en vivo**: [https://mjanez.github.io/metadata-quality-stack/](https://mjanez.github.io/metadata-quality-stack/)
> Esta edición funciona completamente en el cliente e incluye el núcleo MQA y el validador SHACL para comprobaciones instantáneas de calidad de metadatos en tu navegador.

### **Despliegue completo con Docker** (Recomendado para producción)
Para todas las funcionalidades, incluyendo seguimiento histórico y acceso API:
```bash
git clone https://github.com/your-organization/metadata-quality-stack.git
cd metadata-quality-stack
docker-compose up
```

## Descripción general

Esta herramienta ayuda a los publicadores y consumidores de datos a evaluar y mejorar la calidad de los metadatos en catálogos de datos abiertos. Analiza los metadatos según los [principios FAIR+C](https://www.ccsd.cnrs.fr/en/fair-guidelines/) (Encontrabilidad, Accesibilidad, Interoperabilidad, Reutilización y Contextualidad) y proporciona informes detallados sobre métricas de calidad.

## Funcionalidades

### **Dos opciones de despliegue**
1. **[Versión estática](static/)** - Compatible con GitHub Pages, sin backend
2. **[Versión Docker](#installation)** - Completa, con base de datos y API

### **Capacidades principales**
- **Evaluación de calidad**: Evalúa metadatos según la [metodología MQA](https://data.europa.eu/mqa/methodology?locale=es)
- **Múltiples perfiles**: Soporte para los estándares DCAT-AP, DCAT-AP-ES y NTI-RISP
- **Validación en tiempo real**: Retroalimentación instantánea sobre la calidad de los metadatos
- **Visualizaciones interactivas**: Gráficos de radar y desglose detallado de métricas
- **Soporte multilingüe**: Interfaces en inglés y español
- **Integración API**: API REST para acceso programático (versión Docker)
- **Seguimiento histórico**: Almacena y visualiza la evolución de la calidad a lo largo del tiempo (versión Docker)
- **Validación [SHACL](https://www.w3.org/TR/shacl/)**: Verifica el cumplimiento con shapes oficiales de:
   - **[DCAT-AP](https://github.com/SEMICeu/DCAT-AP)**: Estándar del portal europeo de datos
   - **[DCAT-AP-ES](https://github.com/datosgobes/DCAT-AP-ES)**: Perfil nacional español  
   - **[NTI-RISP](https://github.com/datosgobes/NTI-RISP)**: Estándar español de interoperabilidad

### Versión estática
![React](/docs/img/react_app_1.png)
![React](/docs/img/react_app_2.png)
![React](/docs/img/react_app_3.png)
![React](/docs/img/react_app_4.png)

### Versión Docker
![Docker Compose](/docs/img/app_1.png)
![Docker Compose](/docs/img/app_2.png)
![Docker Compose](/docs/img/app_3.png)
![Docker Compose](/docs/img/app_4.png)
![Docker Compose](/docs/img/app_5.png)
![Docker Compose](/docs/img/openapi.png)
