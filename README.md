# Metadata Quality Stack
[![ES](https://img.shields.io/badge/lang-ES-yellow.svg)](README.es.md) [![EN](https://img.shields.io/badge/lang-EN-blue.svg)](README.md) [![Static Demo](https://img.shields.io/badge/demo-GitHub%20Pages-green.svg)](https://mjanez.github.io/metadata-quality-stack/)

A comprehensive toolkit for analyzing the quality of open data metadata. Based on the European Data Portal's Metadata Quality Assessment ([MQA](https://data.europa.eu/mqa/methodology?locale=en)) methodology and [SHACL validation](https://www.w3.org/TR/shacl/) for [DCAT-AP](https://semiceu.github.io/DCAT-AP/), [DCAT-AP-ES](https://datosgobes.github.io/DCAT-AP-ES/) and [NTI-RISP (2013)](https://www.boe.es/eli/es/res/2013/02/19/(4)). profiles.

## Quick Start

### **Try the simply static Version** (No Installation Required)
Try the simplified browser version (**no installation needed**), more info at [react-app/README.md](react-app/README.md).
> [!TIP]
> **Live Demo**: [https://mjanez.github.io/metadata-quality-stack/](https://mjanez.github.io/metadata-quality-stack/)
> This edition runs entirely client-side and includes the core MQA and SHACL validator for instant metadata quality checks in your browser.

### **Full docker deployment** (Recommended for Production)
For complete features including historical tracking and API access:
```bash
git clone https://github.com/your-organization/metadata-quality-stack.git
cd metadata-quality-stack
docker-compose up
```

## Overview

This tool helps data publishers and consumers evaluate and improve the quality of metadata in open data catalogs. It analyzes metadata against the [FAIR+C principles](https://www.ccsd.cnrs.fr/en/fair-guidelines/) (Findability, Accessibility, Interoperability, Reusability, and Contextuality) and provides detailed reports on quality metrics.

## Features

### **Two Deployment Options**
1. **[Static Version](static/)** - GitHub Pages compatible, no backend required
2. **[Docker Version](#installation)** - Full-featured with database and API

### **Core Capabilities**
- **Quality Assessment**: Evaluate metadata according to the [MQA methodology](https://data.europa.eu/mqa/methodology?locale=en)
- **Multiple Profiles**: Support for DCAT-AP, DCAT-AP-ES, and NTI-RISP standards
- **Real-time Validation**: Instant feedback on metadata quality
- **Interactive Visualizations**: Radar charts and detailed metrics breakdown
- **Multilingual Support**: English and Spanish interfaces
- **API Integration**: REST API for programmatic access (Docker version)
- **Historical Tracking**: Store and visualize quality evolution over time (Docker version)
- **[SHACL](https://www.w3.org/TR/shacl/) Validation**: Check compliance with official shapes from:
  - **[DCAT-AP](https://github.com/SEMICeu/DCAT-AP)**: European data portal standard
  - **[DCAT-AP-ES](https://github.com/datosgobes/DCAT-AP-ES)**: Spanish national profile  
  - **[NTI-RISP](https://github.com/datosgobes/NTI-RISP)**: Spanish interoperability standard


### Static version
![Home](/docs/img/app_1.png)
![Home](/docs/img/app_2.png)

### Docker version
![Home](/docs/img/app_1.png)
![Home](/docs/img/app_2.png)
![Home](/docs/img/app_3.png)
![Home](/docs/img/app_4.png)
![Home](/docs/img/app_5.png)
![Home](/docs/img/openapi.png)

## Architecture

### **Deployment Options**

#### **1. Static Version** (Client-Side Only)
- **Location**: [`/static`](static/) directory
- **Technology**: HTML, CSS, JavaScript with N3.js and Chart.js  
- **Deployment**: GitHub Pages, any static hosting
- **Features**: Full metadata validation, visualization, no backend required
- **Use Case**: Quick deployment, demo environments, edge cases

#### **2. Docker Version** (Full Stack)
- **Technology**: FastAPI backend + Streamlit frontend + nginx proxy
- **Features**: Complete functionality + database + API + historical tracking
- **Use Case**: Production environments, enterprise deployment

The project consists of these main components:

1. **API**: [FastAPI](https://fastapi.tiangolo.com/)-based [backend](#backend-api) that validates metadata and generates reports
2. **Frontend**: [Streamlit](https://streamlit.io/)-based [web interface](#frontend-web-interface) for visualizing reports
3. **Static Version**: Client-side implementation for easy deployment

## Installation

### **Static Version** (Quick Start)

For immediate testing and development:

```bash
# Clone the repository
git clone https://github.com/your-organization/metadata-quality-stack.git
cd metadata-quality-stack/static

# Start local development server (choose one)
python3 -m http.server 8000
# OR
npx serve .
# OR use VS Code Live Server extension

# Open browser
open http://localhost:8000
```

**Features**: Full metadata validation, SHACL compliance checking with official shapes, no backend required.

### 🐳 **Docker Version** (Production)

For complete functionality with database and API:

1. Clone the repository:
   ```bash
   git clone https://github.com/your-organization/metadata-quality-stack.git
   cd metadata-quality-stack
   ```

2. Start the services using Docker Compose:
   ```bash
   docker-compose up
   ```

### 🔧 **Manual Installation**

1. Clone the repository:
   ```bash
   git clone https://github.com/your-organization/metadata-quality-stack.git
   cd metadata-quality-stack
   ```

2. Install dependencies:
   ```bash
   pip install -e .
   ```

3. Start the API:
   ```bash
   uvicorn src.api.main:app --host 0.0.0.0 --port 8000
   ```

4. Start the frontend (in a separate terminal):
   ```bash
   streamlit run src/frontend/app.py
   ```

## Usage

### Backend (API)
The API provides the following endpoints:

- **Base API**: `http://localhost:80/`
- **Swagger UI Documentation**. Interactive interface to test the API: `http://localhost:80/docs`
- **ReDoc Documentation**. Detailed documentation in more readable format: `http://localhost:80/redoc`
- **Endpoints**:
  - `POST` `/validate`: Validate metadata from a URL
  - `POST` `/validate-content`: Validate metadata provided directly as content
  - `GET` `/report/{url}`: Get the most recent report for a URL
  - `GET` `/history/{url}`: Get report history for a URL
  - `GET` `/reports/by-date`: Fetch reports within a specified date range
  - `GET` `/reports/by-rating/{rating}`: Get reports with a specific quality rating

### Frontend (Web Interface)

- **Web Interface**: `http://localhost:8501/`
- **Main sections**:
  1. **Validation Options**:
     - Enter a URL to a catalog ()`RDF/XML`, `TTL`, `JSON-LD` and `N3` formats)
     - Paste RDF content directly for validation
     - Select different compliance profiles ([DCAT-AP](https://interoperable-europe.ec.europa.eu/collection/semic-support-centre/dcat-ap), [DCAT-AP-ES](https://github.com/datosgobes/DCAT-AP-ES), [NTI-RISP](https://github.com/datosgobes/NTI-RISP))

  2. **Visualization Features**:
     - Hierarchical chart showing dimension and metric relationships
     - Radar chart displaying performance across [FAIR+C dimensions](https://data.europa.eu/mqa/methodology?locale=en)
     - Detailed metrics breakdown with counts and percentages

  3. **Report Management**:
     - View historical reports and track quality evolution over time
     - Export reports in both JSON and JSON-LD (DQV vocabulary) formats
     - Score evolution charts for long-term quality tracking

  4. **Analytics Dashboard**:
     - Overview statistics of catalogs evaluated
     - Distribution of quality ratings
     - Comparison of dimension averages
     - Top and bottom performing catalogs
     - Dimension correlation analysis

  5. **Multilingual Support**:
     - Toggle between English and Spanish interfaces
     - Localized metric descriptions and labels

## Development

For development, we recommend using VS Code with the Dev Container configuration provided:

1. Install the VS Code Remote - Containers extension
2. Open the project in VS Code
3. Click on "Reopen in Container" when prompted
4. Wait for the container to build and configure

### Translation
After updating the translation file (`mqa.po`), don't forget to compile it to generate the `.mo` file, e.g spanish:

```sh
cd metadata-quality-stack

# Extract i18n texts and update POT of apps (e.g. app.py)
xgettext -d mqa --from-code=UTF-8 -o locales/mqa.pot src/frontend/app.py

# Compile MO files (Spanish)
msgfmt -o locale/es/LC_MESSAGES/mqa.mo locale/es/LC_MESSAGES/mqa.po
``` 

## Extending Profile Metrics

The system is designed to be modular, allowing you to easily extend or customize metrics for specific profiles (DCAT-AP, DCAT-AP-ES, NTI-RISP, etc.). Follow these steps to extend or create metrics for a profile:

### 1. Define Your Metrics in `config.py`

Each metric is defined as a dictionary with ID, dimension, and weight. To add metrics for a new or existing profile:

```python
# Define specific metrics for your profile
MY_PROFILE_SPECIFIC_METRICS = [
    {"id": "my_new_metric", "dimension": "interoperability", "weight": 20},
    {"id": "another_metric", "dimension": "reusability", "weight": 15}
]

# Add your metrics to the METRICS_BY_PROFILE dictionary
METRICS_BY_PROFILE["my_profile"] = COMMON_METRICS + MY_PROFILE_SPECIFIC_METRICS
```

### 2. Create Checkers for Your Metrics in `validators.py`

For each new metric, create a checker that implements the validation logic:

```python
# Create a checker class if existing ones don't fit your needs
class MyCustomChecker(MetricChecker):
    def __init__(self, property_uri: URIRef):
        self.property_uri = property_uri
    
    def check(self, g: Graph, resources: List[URIRef], context: Dict[str, Any] = None) -> Tuple[int, int]:
        # Implement your checking logic here
        # Return a tuple of (successful count, total count)
        return (count, total)

# Add your checker to the CHECKER_DEFINITIONS dictionary
CHECKER_DEFINITIONS.update({
    "my_new_metric": lambda: MyCustomChecker(MY_PROPERTY_URI),
    "another_metric": lambda: ExistingCheckerClass(MY_OTHER_PROPERTY)
})
```

### 3. Update Dimension Scores (If Needed)

If you're adding metrics to a new dimension, ensure the dimension is registered in the DimensionType enum in `models.py` and update the `calculate_dimension_scores` function in `validators.py` to include your new dimension.

### 4. Register Your Profile in Frontend (Optional)

To make your profile selectable in the UI, update the `PROFILES` dictionary in `frontend/config.py`:

```python
PROFILES = {
    "dcat_ap": "DCAT-AP 2.0",
    "dcat_ap_es": "DCAT-AP-ES 2.0",
    "nti_risp": "NTI-RISP",
    "my_profile": "My Custom Profile"
}
```

### Example: Adding Label-Based Format Checker for NTI-RISP

Here's an example of extending NTI-RISP with a label-based format checker:

1. Create the specialized checker class:

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

2. Add to `CHECKER_DEFINITIONS`:

```python
CHECKER_DEFINITIONS.update({
    "dct_format_nonproprietary_nti": lambda: VocabularyLabelComplianceChecker(
        [DCTERMS.format], MQA_VOCABS['non_proprietary']
    )
})
```

3. Add the metric to `NTI_RISP_SPECIFIC_METRICS`:

```python
NTI_RISP_SPECIFIC_METRICS.append(
    {"id": "dct_format_nonproprietary_nti", "dimension": "interoperability", "weight": 25}
)

## Update SSL Certificate
To update the local SSL certificate, follow these steps:

1. Generate a new certificate and private key:
```sh
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/setup/metadata-quality-stack.key \
  -out nginx/setup/metadata-quality-stack.crt \
  -subj "/C=ES/ST=Madrid/L=Madrid/O=Development/CN=localhost"
```

2. Verify that the files have been created correctly:
```sh
ls -l nginx/setup/metadata-quality-stack.*
```

3. Restart the `nginx` container to apply the changes:
```sh
docker compose restart nginx
```

> [!CAUTION]
> This certificate is for local development only. In production, use a valid certificate from a certificate authority.

## Licence

See the [LICENSE](/LICENSE) file for license rights and limitations (MIT).