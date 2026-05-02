# Demo App

A minimal Flask application used to test CloudCanary's deployment pipeline.

## Endpoints

| Route     | Description                |
|-----------|----------------------------|
| `GET /`       | Returns app info and version |
| `GET /health` | Health check endpoint      |

## Run Locally

```bash
pip install -r requirements.txt
python app.py
```

## Run with Docker

```bash
docker build -t demo-app .
docker run -p 5000:5000 demo-app
```
