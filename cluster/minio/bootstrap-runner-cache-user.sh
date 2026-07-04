#!/usr/bin/env bash
#
# Bootstrap du user MinIO dédié au cache des runners GitLab.
#
# Contexte : le mot de passe root MinIO est injecté par Vault UNIQUEMENT dans le
# pod serveur (/vault/secrets/minio-root). Le Job `provisioning` du chart bitnami
# s'authentifierait avec le secret auto-généré du chart (≠ mot de passe Vault) et
# échouerait. On crée donc policy + user directement depuis le conteneur serveur,
# qui possède le bon mot de passe et embarque `mc`.
#
# Le bucket lui-même est créé de façon déclarative via `defaultBuckets` (values-*.yaml).
# Les users/policies MinIO sont persistés sur le PVC : ce script n'est à rejouer
# qu'après un wipe des données MinIO.
#
# Credentials (source de vérité) : Vault  secret/dev/minio-runner-cache {accessKey,secretKey}
#
# Usage :
#   MINIO_NAMESPACE=dev \
#   ACCESS_KEY=gitlab-runner-cache \
#   SECRET_KEY=<secret> \
#   CACHE_BUCKET=gitlab-runner-cache \
#     ./bootstrap-runner-cache-user.sh
set -euo pipefail

MINIO_NAMESPACE="${MINIO_NAMESPACE:-dev}"
ACCESS_KEY="${ACCESS_KEY:?ACCESS_KEY requis}"
SECRET_KEY="${SECRET_KEY:?SECRET_KEY requis}"
CACHE_BUCKET="${CACHE_BUCKET:-gitlab-runner-cache}"
POLICY_NAME="${POLICY_NAME:-gitlab-runner-cache-rw}"

POD="$(kubectl get pod -n "$MINIO_NAMESPACE" -l app.kubernetes.io/name=minio \
        -o jsonpath='{.items[0].metadata.name}')"
echo "MinIO pod : $POD (ns $MINIO_NAMESPACE)"

kubectl exec -i -n "$MINIO_NAMESPACE" "$POD" -c minio -- sh -s <<EOF
set -e
MC=/opt/bitnami/minio-client/bin/mc
ROOTPW="\$(tr -d '\n' < /vault/secrets/minio-root)"
\$MC alias set local http://localhost:9000 admin "\$ROOTPW" >/dev/null

# Bucket (idempotent, aussi géré par defaultBuckets)
\$MC mb --ignore-existing local/${CACHE_BUCKET}

# Policy limitée au seul bucket de cache
cat > /tmp/${POLICY_NAME}.json <<'POLICY'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:*"],
      "Resource": [
        "arn:aws:s3:::${CACHE_BUCKET}",
        "arn:aws:s3:::${CACHE_BUCKET}/*"
      ]
    }
  ]
}
POLICY
\$MC admin policy create local ${POLICY_NAME} /tmp/${POLICY_NAME}.json 2>/dev/null || \
  \$MC admin policy add    local ${POLICY_NAME} /tmp/${POLICY_NAME}.json

# User scopé
\$MC admin user add local "${ACCESS_KEY}" "${SECRET_KEY}"
\$MC admin policy attach local ${POLICY_NAME} --user "${ACCESS_KEY}" 2>/dev/null || \
  \$MC admin policy set    local ${POLICY_NAME} user="${ACCESS_KEY}"

echo "OK : bucket ${CACHE_BUCKET}, policy ${POLICY_NAME}, user ${ACCESS_KEY}"
EOF
