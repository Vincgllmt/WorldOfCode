GitLab Runner Role
==================

This role deploys a GitLab Runner via the official Helm chart using the Kubernetes executor.

Highlights
- Creates namespace and a ClusterRoleBinding binding `default` ServiceAccount to `cluster-admin`.
- Installs/updates the Helm chart `gitlab/gitlab-runner` with minimal values.
- Uses the default ServiceAccount; RBAC created outside the chart.

Requirements
- The control-plane host must have access to the cluster kubeconfig (default `/etc/kubernetes/admin.conf`).
- The `kubernetes.core` Ansible Collection should be available (already used by the `kubernetes` role).

Defaults (vars)
- `runner_namespace`: `gitlab-runner`
- `runner_name`: `gitlab-runner`
- `runner_gitlab_url`: `https://gitlab.com`
- `runner_registration_token`: `""` (set this in vault)
- `runner_tags`: `["k8s"]` (joined as comma string)
- `runner_kubeconfig`: `/etc/kubernetes/admin.conf`
- `runner_helm_repo_name`: `gitlab`
- `runner_helm_repo_url`: `https://charts.gitlab.io`
- `runner_helm_chart_name`: `gitlab-runner`
- `runner_helm_release_name`: `gitlab-runner`
- `runner_serviceaccount_create`: `false`
- `runner_serviceaccount_name`: `default`
- `runner_rbac_create`: `false`
- `runner_clusterrolebinding_name`: `gitlab-runner-admin-binding`

How to use
1. Define a secure registration token, ideally in `ansible/group_vars/all/vault.yml`:
   runner_registration_token: "<YOUR_RUNNER_REGISTRATION_TOKEN>"

2. Include the role in your playbook (already added in `ansible/playbooks/cluster.yml`):
   roles:
     - kubernetes
     - runner-gitlab

3. Run the playbook for your control-plane host(s).

Values applied to the chart
```yaml
gitlabUrl: "{{ runner_gitlab_url }}"
runnerRegistrationToken: "{{ runner_registration_token }}"
rbac:
  create: false
serviceAccount:
  create: false
  name: default
runners:
  tags: "{{ runner_tags | join(',') }}"
```

Notes
- The ClusterRoleBinding binds `default` SA in `{{ runner_namespace }}` to `cluster-admin`.
- Use GitLab project/group/instance runner token as appropriate.
