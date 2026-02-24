#!/usr/bin/env bash
set -euo pipefail

BASE_URL="http://registry.woc:32000"
REGISTRY_USER="admin"
REGISTRY_PASSWORD="ijDFDfslk@!ade132"

echo "Listing repositories on ${BASE_URL}..."

# Récupération du catalogue
response=$(curl -sS -u "${REGISTRY_USER}:${REGISTRY_PASSWORD}" \
  -w "\n%{http_code}" \
  "${BASE_URL}/v2/_catalog" || true)

http_code=$(echo "${response}" | tail -n1)
body=$(echo "${response}" | sed '$d')

if [[ "${http_code}" != "200" ]]; then
  echo "Erreur : HTTP ${http_code} reçu depuis ${BASE_URL}/v2/_catalog"
  echo "Corps de réponse :"
  echo "-------------------------"
  echo "${body}"
  echo "-------------------------"
  exit 1
fi

repos=$(echo "${body}" | jq -r '.repositories[]?' 2>/dev/null || true)

if [[ -z "${repos}" ]]; then
  echo "Aucun repository trouvé ou JSON inattendu."
  echo "Réponse brute :"
  echo "${body}"
  exit 0
fi

for repo in ${repos}; do
  echo
  echo "=== ${repo} ==="

  # Récupération des tags
  tags_response=$(curl -sS -u "${REGISTRY_USER}:${REGISTRY_PASSWORD}" \
    -w "\n%{http_code}" \
    "${BASE_URL}/v2/${repo}/tags/list" || true)

  tags_code=$(echo "${tags_response}" | tail -n1)
  tags_body=$(echo "${tags_response}" | sed '$d')

  if [[ "${tags_code}" != "200" ]]; then
    echo "  Erreur HTTP ${tags_code} pour les tags de ${repo}"
    echo "  Réponse : ${tags_body}"
    continue
  fi

  tags=$(echo "${tags_body}" | jq -r '.tags[]?' 2>/dev/null || true)

  if [[ -z "${tags}" ]]; then
    echo "  (aucun tag)"
    continue
  fi

  # En-tête lisible
  printf "    %-30s %-20s\n" "TAG" "CRÉÉ LE"
  printf "    %-30s %-20s\n" "------------------------------" "-------------------"

  for tag in ${tags}; do
    # 1) Manifest de l’image pour ce tag
    manifest=$(curl -sS \
      -u "${REGISTRY_USER}:${REGISTRY_PASSWORD}" \
      -H "Accept: application/vnd.docker.distribution.manifest.v2+json" \
      "${BASE_URL}/v2/${repo}/manifests/${tag}" || true)

    if [[ -z "${manifest}" ]]; then
      printf "    %-30s %-20s\n" "${tag}" "inconnue"
      continue
    fi

    # 2) Digest du config (schema2)
    config_digest=$(echo "${manifest}" | jq -r '.config.digest // empty' 2>/dev/null || true)

    if [[ -z "${config_digest}" ]]; then
      printf "    %-30s %-20s\n" "${tag}" "inconnue"
      continue
    fi

    # 3) Blob de config → contient "created"
    config_json=$(curl -sS \
      -u "${REGISTRY_USER}:${REGISTRY_PASSWORD}" \
      "${BASE_URL}/v2/${repo}/blobs/${config_digest}" || true)

    created_raw=$(echo "${config_json}" | jq -r '.created // empty' 2>/dev/null || true)

    if [[ -z "${created_raw}" ]]; then
      created_human="inconnue"
    else
      # Tentative de formatage propre : 27/11/2025 16:27:55
      if created_human=$(date -d "${created_raw}" +"%d/%m/%Y %H:%M:%S" 2>/dev/null); then
        :
      else
        # Si jamais "date" n'arrive pas à parser → on affiche brut
        created_human="${created_raw}"
      fi
    fi

    printf "    %-30s %-20s\n" "${tag}" "${created_human}"
  done
done
