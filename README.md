# Metadata Quality Stack
[![ES](https://img.shields.io/badge/lang-ES-yellow.svg)](README.es.md) [![EN](https://img.shields.io/badge/lang-EN-blue.svg)](README.md)

A comprehensive toolkit for analyzing the quality of open data metadata. Based on the European Data Portal's Metadata Quality Assessment ([MQA](https://data.europa.eu/mqa/methodology?locale=en)) methodology.

## Overview

This tool helps data publishers and consumers evaluate and improve the quality of metadata in open data catalogs. It analyzes metadata against the [FAIR+C principles](https://www.ccsd.cnrs.fr/en/fair-guidelines/) (Findability, Accessibility, Interoperability, Reusability, and Contextuality) and provides detailed reports on quality metrics.

## Features

- **Quality Assessment**: Evaluate metadata according to the [MQA methodology](https://data.europa.eu/mqa/methodology?locale=en)
- **API Integration**: REST API for programmatic access to validation services
- **Web Interface**: User-friendly interface for non-technical users
- **Historical Tracking**: Store and visualize quality evolution over time
- **[SHACL](https://www.w3.org/TR/shacl/) Validation**: Check compliance with [DCAT-AP](https://semiceu.github.io/DCAT-AP/releases/3.0.0/), [DCAT-AP-ES](https://github.com/datosgobes/DCAT-AP-ES), and [NTI-RISP](https://github.com/datosgobes/NTI-RISP) standards.

![Home](/docs/img/app_1.png)
![Home](/docs/img/app_2.png)
![Home](/docs/img/app_3.png)
![Home](/docs/img/app_4.png)
![Home](/docs/img/app_5.png)
![Home](/docs/img/openapi.png)

## Architecture

The project consists of two main components:

1. **API**: [FastAPI](https://fastapi.tiangolo.com/)-based [backend](#backend-api) that validates metadata and generates reports
2. **Frontend**: [Streamlit](https://streamlit.io/)-based [web interface](#frontend-web-interface) for visualizing reports

## Installation

### Using Docker (Recommended)

1. Clone the repository:
   ```bash
   git clone https://github.com/your-organization/metadata-quality-stack.git
   cd metadata-quality-stack
   ```

2. Start the services using Docker Compose:
   ```bash
   docker-compose up
   ```

### Manual Installation

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