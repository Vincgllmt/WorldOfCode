k3s Upgrade Role
================

Met à jour un cluster **k3s** vers une mineure cible, en calculant et en
enchaînant automatiquement les paliers intermédiaires.

On ne renseigne qu'une chose : la mineure visée. Le rôle résout sa dernière
version stable, relève la version en place sur chaque nœud, en déduit les
mineures à traverser, et les enchaîne :

```
cluster en v1.34.6, k3s_upgrade_target_minor=1.36
  -> palier 1 : v1.35.6+k3s1  (serveur, puis chaque worker)
  -> palier 2 : v1.36.2+k3s1  (serveur, puis chaque worker)
```

Le patch ne se précise pas : le channel d'une mineure pointe toujours sur sa
dernière version stable, pré-versions (rc/alpha/beta) exclues. Viser la mineure
déjà en place rattrape donc simplement son dernier patch.

Ce rôle est le pendant « upgrade » de `roles/kubernetes` (qui fait le bootstrap).
Il suppose une installation faite par ce dernier : k3s posé par le script
`get.k3s.io`, configuration dans `/etc/rancher/k3s/config.yaml`, réseau via
`tailscale0`.

> **Ce n'est pas un cluster kubeadm.** Il n'y a ni paquets APT `kubeadm`/`kubelet`,
> ni `kubeadm upgrade apply`, ni `/etc/apt/sources.list.d/kubernetes.list`.
> L'upgrade k3s consiste à rejouer le script d'installation en épinglant
> `INSTALL_K3S_VERSION`, ce qui remplace le binaire et redémarre le service.

Pourquoi des paliers
--------------------

Kubernetes n'autorise qu'une mineure d'écart lors d'un upgrade de control-plane :
aller de 1.34 à 1.36 directement n'est pas supporté. Le rôle interroge le serveur
de channels k3s pour résoudre, pour chaque mineure intermédiaire, la dernière
version publiée.

L'ordre compte autant que le découpage : **un palier est terminé sur tout le
cluster avant que le suivant ne démarre**. C'est ce qui garantit que l'API ne
prend jamais plus d'une mineure d'avance sur les kubelets — un enchaînement qui
ferait tous les paliers du serveur avant de toucher aux workers laisserait, sur
un chemin long, l'API très loin devant.

Architecture
------------

Deux plays (voir `playbooks/upgrade-cluster.yml`) :

1. **Relevé** — `hosts: kubernetes`. Chaque nœud rapporte sa version
   (`facts.yml`). Sensible à `--limit` : un nœud hors périmètre n'a pas de
   `k3s_current_version` et sera ignoré par la suite.
2. **Orchestration** — `hosts: k8s_controllers`. Calcule le chemin (`plan.yml`)
   puis boucle dessus (`step.yml`). Les opérations kubectl tournent sur le
   control-plane ; seules les actions sur un nœud sont déléguées via
   `delegate_to`, ce qui fait passer les workers **un par un**.

| Fichier | Rôle |
| --- | --- |
| `facts.yml` | Relève la version k3s d'un nœud |
| `plan.yml` | Résout la cible, calcule le chemin, applique les garde-fous |
| `step.yml` | Un palier : serveur puis workers |
| `server.yml` | Upgrade du serveur vers le palier courant |
| `agent.yml` | Upgrade d'un worker (drain → install → wait → uncordon) |

Le rôle n'a pas de `tasks/main.yml` : il est piloté par le playbook via
`tasks_from`, jamais via `roles:`.

Variables
---------

Voir `defaults/main.yml`. Les principales :

| Variable | Défaut | Rôle |
| --- | --- | --- |
| `k3s_upgrade_target_minor` | `""` | **Seule variable à renseigner.** Mineure visée, ex. `1.36`. |
| `k3s_upgrade_max_steps` | `3` | Nombre maximum de paliers enchaînés en une exécution. |
| `k3s_upgrade_backup` | `true` | Snapshot SQLite avant le premier palier. |
| `k3s_upgrade_backup_dir` | `/var/lib/rancher/k3s/server/db-backups` | Destination des snapshots. |
| `k3s_upgrade_drain` | `true` | Drain/uncordon des workers à chaque palier. |
| `k3s_upgrade_drain_timeout` | `300s` | Timeout du drain. |
| `k3s_upgrade_ready_timeout` | `300s` | Timeout passé à `kubectl wait` pour le retour en `Ready`. |
| `k3s_upgrade_api_retries` | `30` | Tentatives d'attente du retour de l'API après redémarrage du serveur. |

Utilisation
-----------

```bash
# Voir le chemin calculé sans rien modifier
ansible-playbook playbooks/upgrade-cluster.yml \
  -e k3s_upgrade_target_minor=1.36 --check --diff

# Appliquer
ansible-playbook playbooks/upgrade-cluster.yml \
  -e k3s_upgrade_target_minor=1.36

# Rattraper le dernier patch de la mineure en place
ansible-playbook playbooks/upgrade-cluster.yml \
  -e k3s_upgrade_target_minor=1.34

# Chemin long : relever explicitement le garde-fou
ansible-playbook playbooks/upgrade-cluster.yml \
  -e "k3s_upgrade_target_minor=1.38 k3s_upgrade_max_steps=4"
```

Garde-fous
----------

`plan.yml` refuse de démarrer si :

- `k3s_upgrade_target_minor` n'est pas renseignée ;
- elle n'est pas une mineure seule (`1.36.2` ou `v1.36.2+k3s1` sont refusés,
  avec un message qui rappelle que le patch est résolu automatiquement) ;
- la mineure visée n'a pas de channel publié ;
- la cible est en deçà de la version la plus haute du cluster (downgrade) ;
- une mineure intermédiaire n'a pas de channel publié ;
- le chemin dépasse `k3s_upgrade_max_steps` ;
- aucun nœud n'a été inspecté (`--limit` trop restrictif).

L'idempotence est vérifiée **par nœud et par palier** : un nœud déjà à la version
du palier est sauté. Un cluster désynchronisé (certains nœuds en avance) converge
donc correctement, le chemin partant de la mineure la plus basse.

Points d'attention
------------------

- **`--limit` doit toujours inclure le control-plane** : c'est lui qui orchestre
  et qui porte kubectl. `--limit kube-worker-01` seul ne ferait rien ; il faut
  `--limit 'k8s_controllers:kube-worker-01'`.
- **Control-plane unique** : l'API est indisponible ~1 min à chaque palier. Un
  k3s en HA (plusieurs serveurs, etcd embarqué) demanderait un traitement
  différent — non géré ici.
- **`INSTALL_K3S_SKIP_ENABLE`** : volontairement *non* positionné. C'est ce flag,
  hérité de `roles/kubernetes/tasks/init.yml`, qui avait laissé l'unité `k3s`
  désactivée et fait tomber le cluster au reboot. Le rôle force en plus
  `enabled: true` sur `k3s` et `k3s-agent`.
- **`uncordon` est hors condition de version** : si une exécution s'est
  interrompue après le drain, le nœud est resté cordonné. Il est rendu au
  scheduler au passage suivant même si sa version est déjà la bonne.
- **Stockage local-path** : les pods portant un PVC local-path ne sont pas
  replanifiables ailleurs. Ils restent `Pending` pendant le drain de leur nœud et
  reviennent au uncordon. Comportement attendu.
- **Workers 03/04 : Tailscale requis sur la machine Ansible.** Ces nœuds sont à
  l'école ; leurs IP de LAN (`172.16.249.83/.84`) ne sont routables que sur
  place. L'inventaire les déclare donc sur leurs IP Tailscale
  (`100.79.55.123` / `100.77.142.97`). Vérifier avant de lancer :

  ```bash
  ansible k8s_workers -m ping
  ```

  À défaut : `--limit 'k8s_controllers:kube-worker-01:kube-worker-02'`.
- **`ansible_host` du control-plane : ne pas y toucher.** Il vaut l'IP publique
  OVH (`51.178.136.131`) et `roles/kubernetes/tasks/init.yml` s'en sert pour les
  `tls-san` du certificat *et* pour réécrire le kubeconfig. Le basculer sur
  Tailscale retirerait l'IP publique des SAN et casserait les accès `kubectl`
  distants.
- **Sauvegarde automatique avant le premier palier.** Le cluster utilise le
  backend SQLite, pas etcd : `k3s etcd-snapshot` ne s'applique pas. La base est
  en mode WAL, donc une copie de `state.db` à chaud peut être incohérente — le
  rôle passe par `sqlite3 .backup` (API de sauvegarde en ligne), cohérent sans
  arrêter k3s, donc sans coupure d'API supplémentaire. L'intégrité du fichier
  produit est vérifiée (`PRAGMA integrity_check`) avant de toucher au cluster.
  C'est le seul moyen de revenir en arrière : un downgrade k3s n'est pas
  supporté. Les snapshots ne sont **pas purgés** automatiquement.
