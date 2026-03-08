# DORA Compliance Platform

A pragmatic DORA (Digital Operational Resilience Act) compliance platform for financial services SMEs in the Netherlands. Performs gap analysis at DORA Act Level 1 with applicability and gap status (Gap, Partial Gap, No gap), and suggests improvement steps.

## Legal Reference

- **DORA Regulation (EU) 2022/2554** – core legislative act
- **Relevant RTS/ITS** – see [The DORA Library (27 regulatory documents)](https://www.fromciso.com/p/the-dora-library-all-27-regulatory) for the full reference list

## Features

- **Gap analysis** based on DORA Act Level 1 articles
- **Applicability** – Applicable / Not Applicable (with SME proportionality)
- **Gap status** – No gap, Partial gap, Gap
- **Improvement steps** – actionable suggestions per gap with references to RTS/ITS
- **Umbra-style UI** – clean table with pill badges

## Quick Start

### 1. Run the gap analyzer

**Option A – Browser (no Python or Node required):**
1. Open `frontend/analyze.html` in your browser
2. Add policy documents (drag & drop or select)
3. Click "Run gap analysis"
4. Download `dora_gap_output.json` and load it in `index.html` to view results

**Option B – Node.js:**
```powershell
cd DORA-2.0-main
node dora_gap_analyzer.js --policies-path "C:\path\to\client\policies" --output-json dora_gap_output.json --roadmap-json dora_roadmap_output.json
```

**Option C – Python:**
```bash
cd DORA-2.0-main
python dora_gap_analyzer.py --policies-path <path-to-client-policies> --output-json dora_gap_output.json --roadmap-json dora_roadmap_output.json
```

Options:
- `--policies-path` – root folder of client policy documents (PDF, DOCX, XLSX, etc.)
- `--client-profile` – `standard` or `micro_entity` (<10 staff, ≤€2M turnover)
- `--obligations` – path to custom obligations JSON (default: `dora_level1_obligations.json`)

### 2. View the frontend

**Option A – Load JSON manually**

1. Open `frontend/index.html` in a browser
2. Click "Load gap analysis JSON" and select `dora_gap_output.json`
3. Or drag-and-drop the JSON file onto the page

**Option B – Local HTTP server**

```bash
cd frontend
python -m http.server 8080
```

Then open http://localhost:8080 – the page will auto-load `dora_gap_output.json` if present.

## Project Structure

```
DORA-2.0-main/
├── dora_gap_analyzer.js      # Backend gap analyzer (Node.js – no Python)
├── dora_gap_analyzer.py      # Backend gap analyzer (Python)
├── dora_level1_obligations.json  # DORA articles 5–21, 25, 26, 30
├── dora_gap_output.json      # Output (generated)
├── dora_roadmap_output.json  # Improvement roadmap (generated)
├── frontend/
│   ├── index.html
│   ├── styles.css
│   ├── app.js
│   └── dora_gap_output.json  # Sample/demo data
└── README.md
```

## DORA Articles Covered

| Articles | Area |
|----------|------|
| 5–10 | ICT risk management (framework, governance, identification, protection, detection, response) |
| 11–15 | Business continuity, backup, awareness, communication, incident management |
| 16–21 | Simplified framework, incident reporting, resilience testing, TLPT, internal audit |
| 25–26, 30 | ICT third-party risk, register of arrangements, contractual provisions |

## Client Profile

- **Standard** – full DORA regime
- **Micro entity** – proportional exemptions (<10 employees, turnover/balance sheet ≤ €2M per DORA Article 4(6))

## UI Design

Inspired by [Umbra Ai](https://www.umbraic.com/):
- Table: Legislation | Item | Applicability | Documentation | Gap
- Pill badges: purple (Applicable), light purple (Not Applicable), green (No gap), red (Gap), amber (Partial gap)
- Improvement roadmap with prioritized suggestions
