# Stage de build des dépendances
FROM python:3.12-slim AS builder

WORKDIR /app

# Installation des dépendances système requises pour compiler certains paquets si besoin
RUN apt-get update && apt-get install -y --no-install-recommends gcc && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# Stage final de production
FROM python:3.12-slim

WORKDIR /app

# Récupération des paquets installés depuis le builder
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

# Copie du code source
COPY main.py .

# Exposition du port standard
EXPOSE 8000

# Lancement de l'application via Uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]