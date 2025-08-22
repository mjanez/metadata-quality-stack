# Metadata Quality Assessment Tool - React App

> [!TIP]
> **Live Demo**: [https://mjanez.github.io/metadata-quality-stack/](https://mjanez.github.io/metadata-quality-stack/)

A modern web application for evaluating RDF metadata quality based on FAIR+C principles, built with [React](https://es.react.dev/) + TypeScript.

## Features

- ✅ **Complete MQA evaluation** with real metrics for DCAT-AP, DCAT-AP-ES and NTI-RISP
- ✅ **Multi-format support** RDF/XML, Turtle, JSON-LD, N-Triples with auto-detection
- ✅ **Remote URL processing** to validate online datasets
- ✅ **Interactive visualization** with FAIR+C radar charts and detailed tables
- ✅ **Controlled vocabularies** integrated (formats, licenses, access rights)
- ✅ **Responsive interface** with Bootstrap 5 and modern components
- ✅ **Full TypeScript** for safe and maintainable development
- ✅ **Internationalization** English/Spanish support with react-i18next
- ✅ **Dark/Light themes** with user preference persistence
- ✅ **Tabbed results** keeping original form visible during validation
- ✅ **Accordion metrics** grouped by FAIR+C dimensions

## Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 19.1.1 | UI framework with modern hooks |
| **TypeScript** | 4.9.5 | Static typing and safe development |
| **N3.js** | 1.26.0 | RDF parsing and manipulation |
| **rdfxml-streaming-parser** | 3.1.0 | RDF/XML → Turtle conversion |
| **Bootstrap** | 5.3.7 | Responsive CSS framework |
| **Chart.js** | 4.5.0 | Radar charts visualization |
| **react-i18next** | Latest | Internationalization support |
| **gh-pages** | 6.3.0 | Automated GitHub Pages deployment |

## Local Development

### Prerequisites
```bash
Node.js >= 16.x
npm >= 8.x
```

### Installation
```bash
# Clone repository
git clone https://github.com/mjanez/metadata-quality-stack.git
cd metadata-quality-stack/react-app

# Install dependencies
npm install

# Start development server
npm start
```

Application will be available at: **http://localhost:3000**

### Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| **Development** | `npm start` | Local server with hot reload |
| **Build** | `npm run build` | Optimized production build |
| **Deploy** | `npm run deploy` | Automatic deploy to GitHub Pages |
| **Test** | `npm test` | Run tests (if any) |

## 📦 Deploy to GitHub Pages

### Automatic Deploy
```bash
# Build + Deploy in one command
npm run deploy
```

### Manual Deploy
```bash
# 1. Production build
npm run build

# 2. Manual deploy
npx gh-pages -d build
```

## Architecture

```
react-app/
├── public/
│   ├── data/                    # JSONL vocabularies
│   │   ├── access_rights.jsonl
│   │   ├── file_types.jsonl
│   │   ├── licenses.jsonl
│   │   └── ...
│   ├── locales/                 # i18n translations
│   │   ├── en/
│   │   └── es/
│   └── index.html
├── src/
│   ├── components/              # React components
│   │   ├── ValidationForm.tsx   # Input form
│   │   ├── ValidationResults.tsx # Results and charts
│   │   ├── QualityChart.tsx     # FAIR+C radar chart
│   │   ├── LoadingSpinner.tsx   # Loading component
│   │   ├── ThemeToggle.tsx      # Dark/Light theme switcher
│   │   └── LanguageSelector.tsx # Language switcher
│   ├── services/                # Business logic
│   │   ├── MQAService.ts        # Main MQA engine
│   │   └── RDFService.ts        # RDF processing
│   ├── config/                  # Configuration
│   │   └── mqa-config.json      # Metrics and profiles
│   ├── types/                   # TypeScript types
│   │   └── index.ts
│   ├── i18n/                    # Internationalization
│   │   └── index.ts
│   ├── App.tsx                  # Main component
│   └── index.tsx               # Entry point
└── package.json
```

## MQA Configuration

### Supported Profiles
- **DCAT-AP 2.1.1**: 405 maximum points
- **DCAT-AP-ES 1.0.0**: 405 maximum points
- **NTI-RISP 1.0.0**: 310 maximum points

### FAIR+C Dimensions
| Dimension | Description |
|-----------|-------------|
| **F** - Findability | Ease of finding the dataset |
| **A** - Accessibility | Data accessibility |
| **I** - Interoperability | Technical interoperability |
| **R** - Reusability | Ease of reuse |
| **C** - Contextuality | Contextual information |

## Internationalization

### Languages Supported
- **English** (default)
- **Spanish** (Español)

### Adding New Languages
1. Create translation file in `public/locales/{lang}/translation.json`
2. Add language option to `LanguageSelector` component
3. Update i18n configuration in `src/i18n/index.ts`

### Translation Keys Structure
```json
{
  "common": {
    "title": "Metadata Quality Assessment",
    "loading": "Loading...",
    "validate": "Validate"
  },
  "dimensions": {
    "findability": "Findability",
    "accessibility": "Accessibility",
    "interoperability": "Interoperability",
    "reusability": "Reusability",
    "contextuality": "Contextuality"
  }
}
```

## Theming
### Customizing Styles
Edit these files:
- `src/App.css` - Main application styles
- `src/components/*.css` - Component-specific styles
- Bootstrap variables can be overridden in CSS

### Theme Variables
```css
:root {
  --bs-primary: #0d6efd;
  --mqa-chart-bg: #ffffff;
  --mqa-text-color: #212529;
}

[data-bs-theme="dark"] {
  --mqa-chart-bg: #212529;
  --mqa-text-color: #ffffff;
}
```

## Vocabularies and Data

### Location
Vocabularies are in `public/data/` as JSONL files:

```
access_rights.jsonl     # Access rights
file_types.jsonl        # File types
licenses.jsonl          # Licenses
machine_readable.jsonl  # Machine-readable formats
media_types.jsonl       # Media types
non_proprietary.jsonl   # Non-proprietary formats
```

### Updating Vocabularies
1. Launch `scripts/vocabs_csv2jsonl`
    
    python3 scripts/vocabs_csv2jsonl


## Troubleshooting

### Build Errors
```bash
# Clear cache
rm -rf node_modules/.cache
npm run build
```

### Type Errors
```bash
# Check types without build
npx tsc --noEmit
```

### Deploy Issues
```bash
# Check gh-pages branch
git checkout gh-pages
git log --oneline -5

# Force redeploy
npm run deploy -- --force
```

### i18n Issues
```bash
# Check translation files
cat public/locales/en/translation.json
cat public/locales/es/translation.json
```

## License

This project is licensed under the MIT License. See the [LICENSE](../LICENSE) file for details.

---

**Built with ❤️ for the open data community**
