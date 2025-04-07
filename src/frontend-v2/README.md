# Frontend v2
## Info
- [Astro documentation](https://astro.build/)


## Structure
```sh
frontend-v2/
├── src/
│   ├── components/
│   │   ├── RDFUploader.jsx       # Componente para cargar RDF
│   │   ├── ValidationReport.jsx  # Muestra informes de validación
│   │   ├── SunburstChart.jsx     # Gráficos sunburst de dimensiones
│   │   ├── MetricTable.jsx       # Tablas de métricas MQA
│   │   └── ValidationOptions.jsx # Opciones de validación
│   ├── lib/
│   │   ├── shacl-validator.js    # Lógica de validación SHACL
│   │   ├── mqa-processor.js      # Procesamiento de métricas MQA
│   │   └── chart-generator.js    # Generación de gráficos
│   ├── layouts/
│   │   └── Layout.astro          # Layout principal
│   └── pages/
│       ├── index.astro           # Página principal
│       └── api/
│           └── validate.ts       # Endpoint para validación (opcional)
```

## Project
### Librerías Recomendadas

Para este frontend-v2, recomendaría las siguientes bibliotecas:

1. **Astro** - Framework principal
2. **rdf-validate-shacl** - Para validación SHACL
3. **@zazuko/env-browser** - Entorno RDF.js para navegador
4. **d3.js** - Para visualizaciones avanzadas (sunburst)
5. **nanostores** - Gestión de estado liviana
6. **tailwindcss** - Estilos
7. **vega-lite** - Alternativa a D3 para visualizaciones declarativas

### Ventajas de esta Aproximación

1. **Rendimiento**: La validación se ejecuta en el cliente, lo que reduce la carga del servidor
2. **Experiencia de usuario**: Interfaz más receptiva sin recargas de página
3. **Privacidad**: Los datos no salen del navegador del usuario
4. **Escalabilidad**: El servidor maneja menos carga
5. **Flexibilidad**: Fácil adición de nuevos perfiles SHACL y reglas de validación

### Próximos Pasos

1. Definir el almacenamiento de las formas SHACL (probablemente en archivos estáticos)
2. Implementar en detalle el procesador MQA y las métricas
3. Crear visualizaciones interactivas para los resultados
4. Implementar la interfaz de usuario completa
5. Agregar la internacionalización

### Debugging

1. **Debugging en Desarrollo**:
   - Ejecutar `npm run dev` para iniciar el servidor de desarrollo
   - Usar las Chrome/Firefox DevTools para inspeccionar:
     - Consola para logs
     - Network para peticiones
     - Elements para estructura DOM
   - Usar `console.log()`, `console.debug()` para información en desarrollo

2. **Debugging RDF/SHACL**:
   - Añadir logs en `shacl-validator.js` para ver:
     - Datos RDF cargados
     - Resultados de validación
     - Errores de parseo
   - Usar la pestaña Network para verificar carga de archivos SHACL

3. **Debugging de Visualizaciones**:
   - Inspeccionar elementos SVG en DevTools
   - Verificar datos pasados a componentes de gráficos
   - Usar React Developer Tools para componentes

4. **Errores Comunes**:
   - Problemas de CORS al cargar archivos
   - Errores de parseo RDF
   - Inconsistencias en datos para visualizaciones

5. **Variables de Entorno**:
   - Crear .env para configuración local
   - Verificar con `console.log(import.meta.env)`
