# YuToDo Kubernetes Deployment

This directory contains comprehensive Kubernetes deployment manifests and Helm charts for YuToDo, designed for enterprise-grade production deployments with high availability, security, and observability.

## 🏗️ Architecture Overview

### Components

- **YuToDo Server**: Node.js/Express application with WebSocket support
- **PostgreSQL**: Primary database (with SQLite fallback for development)
- **Redis**: Session storage and caching
- **Prometheus**: Metrics collection and alerting
- **Grafana**: Monitoring dashboards
- **Ingress**: Load balancing and TLS termination

### Deployment Environments

- **Development**: Single replica, SQLite database, relaxed security
- **Staging**: Production-like setup with reduced resources
- **Production**: High availability, enhanced security, full monitoring

## 📋 Prerequisites

### Required Tools

```bash
# Kubernetes cluster access
kubectl version --client

# Helm 3.x
helm version

# Optional: For local development
kind create cluster
# or
minikube start
```

### Cluster Requirements

#### Minimum Resources
- **Development**: 2 CPU cores, 4GB RAM
- **Staging**: 4 CPU cores, 8GB RAM  
- **Production**: 8 CPU cores, 16GB RAM

#### Required Kubernetes Version
- Kubernetes 1.19+
- Helm 3.0+

#### Required Cluster Features
- **Storage Classes**: For persistent volumes
- **Ingress Controller**: nginx-ingress recommended
- **Cert-Manager**: For automatic TLS certificates (production)
- **Prometheus Operator**: For monitoring (optional)

## 🚀 Quick Start

### 1. Deploy to Development

```bash
# Clone the repository
git clone <repository-url>
cd yutodo/k8s

# Deploy to development environment
./scripts/deploy.sh --environment development

# Access the application
kubectl port-forward service/yutodo 3001:3001 -n yutodo
```

### 2. Deploy to Production

```bash
# Update production values
vim helm/yutodo/values-prod.yaml

# Deploy with verification
./scripts/deploy.sh \
  --environment production \
  --upgrade \
  --verify \
  --namespace yutodo-prod
```

### 3. Cleanup

```bash
# Remove deployment (preserve data)
./scripts/cleanup.sh --namespace yutodo

# Complete cleanup (destroys data!)
./scripts/cleanup.sh --delete-namespace --delete-pvc --force
```

## 📁 Directory Structure

```
k8s/
├── helm/yutodo/                    # Helm chart
│   ├── Chart.yaml                 # Chart metadata
│   ├── values.yaml                # Default values
│   ├── values-dev.yaml             # Development overrides
│   ├── values-staging.yaml         # Staging overrides
│   ├── values-prod.yaml            # Production overrides
│   └── templates/                  # Kubernetes manifests
│       ├── deployment.yaml         # Main application deployment
│       ├── service.yaml            # Service definitions
│       ├── ingress.yaml            # Ingress configuration
│       ├── configmap.yaml          # Configuration
│       ├── secret.yaml             # Secrets
│       ├── pvc.yaml                # Persistent storage
│       ├── hpa.yaml                # Horizontal Pod Autoscaler
│       ├── pdb.yaml                # Pod Disruption Budget
│       ├── networkpolicy.yaml      # Network policies
│       ├── rbac.yaml               # RBAC configuration
│       ├── monitoring/             # Monitoring resources
│       │   ├── servicemonitor.yaml # Prometheus ServiceMonitor
│       │   └── prometheusrule.yaml # Alerting rules
│       └── tests/                  # Helm tests
│           ├── test-connection.yaml
│           ├── test-api.yaml
│           ├── test-database.yaml
│           └── test-websocket.yaml
├── scripts/                        # Deployment scripts
│   ├── deploy.sh                   # Main deployment script
│   └── cleanup.sh                  # Cleanup script
└── README.md                       # This file
```

## 🔧 Configuration

### Environment-Specific Values

Each environment has its own values file with optimized settings:

#### Development (`values-dev.yaml`)
```yaml
deployment:
  replicas: 1
config:
  database:
    type: "sqlite"  # Simplified database
  security:
    corsOrigins: ["*"]  # Relaxed CORS
ingress:
  enabled: true
  hosts:
    - host: yutodo-dev.local
```

#### Staging (`values-staging.yaml`)
```yaml
deployment:
  replicas: 2
config:
  database:
    type: "postgresql"  # Production-like database
autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 5
```

#### Production (`values-prod.yaml`)
```yaml
deployment:
  replicas: 5
  affinity:
    podAntiAffinity:
      requiredDuringSchedulingIgnoredDuringExecution: [...]
autoscaling:
  enabled: true
  minReplicas: 5
  maxReplicas: 20
security:
  podSecurityStandards:
    enforce: "restricted"
```

### Custom Configuration

#### Database Configuration

```yaml
# Use external PostgreSQL
postgresql:
  enabled: false
config:
  database:
    postgresql:
      host: "external-postgres.example.com"
      username: "yutodo"
      password: "secure-password"
```

#### TLS/SSL Configuration

```yaml
ingress:
  tls:
    - secretName: yutodo-tls
      hosts:
        - yutodo.example.com
```

#### Monitoring Configuration

```yaml
monitoring:
  enabled: true
  serviceMonitor:
    enabled: true
    interval: 15s
  prometheusRule:
    enabled: true
```

## 🏭 Production Deployment Guide

### 1. Preparation

#### Update Configuration
```bash
# Copy production values template
cp helm/yutodo/values-prod.yaml helm/yutodo/values-prod-custom.yaml

# Edit configuration
vim helm/yutodo/values-prod-custom.yaml
```

#### Key Production Settings
```yaml
# High availability
deployment:
  replicas: 5
  affinity:
    podAntiAffinity:
      requiredDuringSchedulingIgnoredDuringExecution: [...]

# Resource limits
resources:
  limits:
    cpu: 1000m
    memory: 1Gi
  requests:
    cpu: 200m
    memory: 256Mi

# Security
security:
  podSecurityStandards:
    enforce: "restricted"
networkPolicy:
  enabled: true

# Monitoring
monitoring:
  enabled: true
  prometheusRule:
    enabled: true
```

#### Set up External Dependencies
```bash
# Add Helm repositories
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
```

### 2. Pre-Deployment Validation

```bash
# Validate chart
helm lint helm/yutodo --values helm/yutodo/values-prod-custom.yaml

# Dry run
./scripts/deploy.sh \
  --environment production \
  --namespace yutodo-prod \
  --dry-run
```

### 3. Production Deployment

```bash
# Deploy to production
./scripts/deploy.sh \
  --environment production \
  --namespace yutodo-prod \
  --upgrade \
  --verify \
  --timeout 900s
```

### 4. Post-Deployment Verification

```bash
# Check deployment status
kubectl get pods,svc,ingress -n yutodo-prod

# Run tests
helm test yutodo -n yutodo-prod

# Check monitoring
kubectl get servicemonitor,prometheusrule -n yutodo-prod

# Verify metrics
kubectl port-forward service/yutodo 9090:9090 -n yutodo-prod
curl http://localhost:9090/metrics
```

## 📊 Monitoring and Observability

### Metrics Collection

The deployment includes comprehensive monitoring:

#### Application Metrics
- HTTP request rates and latencies
- WebSocket connection statistics
- Database query performance
- Todo/Schedule operations
- Memory and CPU usage

#### Infrastructure Metrics
- Pod resource utilization
- Network traffic
- Storage usage
- Kubernetes events

### Alerting Rules

Pre-configured alerts for:
- Service unavailability
- High error rates
- Resource exhaustion
- Database connectivity issues
- WebSocket connection problems

### Grafana Dashboards

Access dashboards at: `https://grafana.example.com`

Default dashboards include:
- **YuToDo Overview**: Application-level metrics
- **Infrastructure**: Resource usage and cluster health
- **Security**: Security events and compliance

## 🔐 Security Features

### Pod Security Standards

```yaml
security:
  podSecurityStandards:
    enforce: "restricted"
    audit: "restricted"
    warn: "restricted"
```

### Network Policies

- Default deny-all traffic
- Explicit allow rules for required communication
- Database access restricted to application pods

### RBAC Configuration

- Minimal required permissions
- Service account with limited scope
- No cluster-wide permissions

### Secret Management

- Kubernetes secrets for sensitive data
- Automatic secret generation
- Integration with external secret stores (optional)

## 🔄 Backup and Disaster Recovery

### Database Backups

```yaml
backup:
  enabled: true
  schedule: "0 2 * * *"  # Daily at 2 AM
  retention: "30d"
  storage:
    type: "s3"
    s3:
      bucket: "yutodo-backups"
      region: "us-west-2"
```

### Backup Script

```bash
# Manual backup
kubectl exec -it deployment/yutodo -n yutodo-prod -- \
  pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
```

### Disaster Recovery

```bash
# Scale down application
kubectl scale deployment yutodo --replicas=0 -n yutodo-prod

# Restore database
kubectl exec -i deployment/yutodo-postgresql -n yutodo-prod -- \
  psql -U yutodo yutodo < backup-20240101.sql

# Scale up application
kubectl scale deployment yutodo --replicas=5 -n yutodo-prod
```

## 🧪 Testing

### Helm Tests

Run comprehensive tests:

```bash
# Run all tests
helm test yutodo -n yutodo

# Individual test categories
kubectl apply -f helm/yutodo/templates/tests/test-connection.yaml
kubectl logs yutodo-test-connection -n yutodo
```

### Health Checks

```bash
# Health endpoint
curl https://yutodo.example.com/health

# Readiness endpoint
curl https://yutodo.example.com/ready

# Metrics endpoint (requires auth)
curl https://yutodo.example.com/metrics
```

### Load Testing

```bash
# Install tools
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/cloud/deploy.yaml

# Run load test
kubectl run -i --tty load-test --rm --image=busybox --restart=Never -- \
  wget -q -O- --tries=1 --timeout=3 https://yutodo.example.com/health
```

## 🚨 Troubleshooting

### Common Issues

#### Pods Not Starting

```bash
# Check pod status
kubectl get pods -n yutodo

# Check pod logs
kubectl logs deployment/yutodo -n yutodo

# Describe pod for events
kubectl describe pod <pod-name> -n yutodo
```

#### Database Connection Issues

```bash
# Check PostgreSQL connectivity
kubectl exec -it deployment/yutodo -n yutodo -- \
  pg_isready -h yutodo-postgresql -p 5432

# Check database logs
kubectl logs deployment/yutodo-postgresql -n yutodo
```

#### Ingress Issues

```bash
# Check ingress status
kubectl get ingress -n yutodo

# Check ingress controller logs
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller
```

#### Resource Issues

```bash
# Check resource usage
kubectl top pods -n yutodo

# Check resource quotas
kubectl describe resourcequota -n yutodo

# Check node resources
kubectl top nodes
```

### Debug Commands

```bash
# Access application shell
kubectl exec -it deployment/yutodo -n yutodo -- /bin/bash

# Check configuration
kubectl get configmap yutodo-config -o yaml -n yutodo

# Check secrets (without revealing values)
kubectl get secret yutodo-secret -n yutodo

# Network debugging
kubectl run -i --tty netshoot --rm --image=nicolaka/netshoot --restart=Never
```

## 📈 Scaling

### Horizontal Scaling

```bash
# Manual scaling
kubectl scale deployment yutodo --replicas=10 -n yutodo

# Auto-scaling configuration
kubectl get hpa yutodo -n yutodo
```

### Vertical Scaling

```bash
# Update resource limits
helm upgrade yutodo ./helm/yutodo \
  --set deployment.resources.limits.cpu=2000m \
  --set deployment.resources.limits.memory=2Gi \
  -n yutodo
```

### Database Scaling

```bash
# Scale PostgreSQL (if using built-in)
helm upgrade yutodo ./helm/yutodo \
  --set postgresql.primary.resources.limits.cpu=1000m \
  --set postgresql.primary.resources.limits.memory=1Gi \
  -n yutodo
```

## 🔄 Updates and Upgrades

### Application Updates

```bash
# Update application image
helm upgrade yutodo ./helm/yutodo \
  --set image.tag=v1.2.0 \
  -n yutodo

# Rolling update with zero downtime
kubectl rollout status deployment/yutodo -n yutodo
```

### Database Migrations

```bash
# Run migrations manually
kubectl exec -it deployment/yutodo -n yutodo -- npm run migrate

# Check migration status
kubectl logs deployment/yutodo -n yutodo | grep migration
```

### Rollback

```bash
# Rollback to previous version
helm rollback yutodo -n yutodo

# Rollback to specific revision
helm rollback yutodo 2 -n yutodo
```

## 📚 References

### Documentation Links

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Helm Documentation](https://helm.sh/docs/)
- [Prometheus Operator](https://prometheus-operator.dev/)
- [Grafana Documentation](https://grafana.com/docs/)

### Best Practices

- [Kubernetes Security Best Practices](https://kubernetes.io/docs/concepts/security/)
- [Helm Best Practices](https://helm.sh/docs/chart_best_practices/)
- [Production Readiness Checklist](https://kubernetes.io/docs/concepts/cluster-administration/cluster-administration-overview/)

### Support

- **Issues**: [GitHub Issues](https://github.com/your-org/yutodo/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/yutodo/discussions)
- **Security**: security@example.com

---

## ⚖️ License

This Kubernetes deployment configuration is part of the YuToDo project and is licensed under the MIT License. See the main project LICENSE file for details.