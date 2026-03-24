#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "Usage : $0 <repository> <tag>"
  echo "Exemple : $0 woc-backend latest"
  exit 1
fi

REPOSITORY="$1"
TAG="$2"

BASE_URL="http://registry.woc:32000"
REGISTRY_USER="admin"
REGISTRY_PASSWORD=$(kubectl exec vault-0 -n vault -- vault kv get -field=password secret/registry)

echo "Suppression de l'image : ${REPOSITORY}:${TAG} depuis ${BASE_URL}"

echo "Récupération du manifest..."
headers=$(curl -sS -I \
  -u "${REGISTRY_USER}:${REGISTRY_PASSWORD}" \
  -H "Accept: application/vnd.docker.distribution.manifest.v2+json" \
  "${BASE_URL}/v2/${REPOSITORY}/manifests/${TAG}" || true)

digest=$(echo "${headers}" | tr -d '\r' | grep -i 'Docker-Content-Digest:' | awk '{print $2}')

if [[ -z "${digest}" ]]; then
  echo "Erreur : impossible de récupérer le digest pour ${REPOSITORY}:${TAG}"
  echo "Headers retournés :"
  echo "${headers}"
  exit 1
fi

echo "Digest trouvé : ${digest}"

echo "Envoi de la requête DELETE..."
response_code=$(curl -sS -o /dev/null -w "%{http_code}" \
  -X DELETE \
  -u "${REGISTRY_USER}:${REGISTRY_PASSWORD}" \
  "${BASE_URL}/v2/${REPOSITORY}/manifests/${digest}")

if [[ "${response_code}" == "202" ]]; then
  echo "Succès : ${REPOSITORY}:${TAG} supprimé de la registry."
else
  echo "Erreur : code HTTP retourné ${response_code}"
  exit 1
fi
