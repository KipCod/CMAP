# CoachMAP

Local procedure navigation tool.

## Setup

```bash
pip install -r requirements.txt
cd frontend && npm install && npm run build
uvicorn backend.main:app --reload
```

Open http://127.0.0.1:8000

## Configuration

Edit `config.json` to change module/part/machine names and defaults.

Place CSV files in `data/csv/` as `{module}_{part}_{machine}.csv`.

Place tree files in `data/trees/` as `tree_hw_{part}_{machine}.txt` and `tree_other_{part}_{machine}.txt`.
