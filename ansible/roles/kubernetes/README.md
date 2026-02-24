Kubernetes Role
===============

This role bootstraps the Kubernetes control plane on the designated controller and installs Calico, MetalLB and ingress-nginx.

Example Playbook
----------------

```yaml
- hosts: kubernetes
  become: true
  roles:
    - kubernetes
```

Container Registry Deployment
-----------------------------

The private container registry is no longer deployed via Ansible. It is managed by a GitLab CI pipeline using Helm and the chart `twuni/docker-registry` with a Longhorn-backed `storageClass`.

- See `cluster/registry/values.yaml` for configuration.
- The root CI (`.gitlab-ci.yml`) includes `cluster/registry/.gitlab-ci.yml` to run the deployment.
