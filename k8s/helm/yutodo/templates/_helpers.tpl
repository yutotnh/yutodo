{{/*
Expand the name of the chart.
*/}}
{{- define "yutodo.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "yutodo.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "yutodo.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "yutodo.labels" -}}
helm.sh/chart: {{ include "yutodo.chart" . }}
{{ include "yutodo.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: yutodo
{{- end }}

{{/*
Selector labels
*/}}
{{- define "yutodo.selectorLabels" -}}
app.kubernetes.io/name: {{ include "yutodo.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "yutodo.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "yutodo.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Create the name of the namespace to use
*/}}
{{- define "yutodo.namespace" -}}
{{- default .Release.Namespace .Values.namespace.name }}
{{- end }}

{{/*
Create the image name
*/}}
{{- define "yutodo.image" -}}
{{- $registry := .Values.global.imageRegistry | default .Values.image.registry -}}
{{- $repository := .Values.image.repository -}}
{{- $tag := .Values.image.tag | default .Chart.AppVersion -}}
{{- if $registry -}}
{{- printf "%s/%s:%s" $registry $repository $tag -}}
{{- else -}}
{{- printf "%s:%s" $repository $tag -}}
{{- end -}}
{{- end }}

{{/*
Create the PostgreSQL secret name
*/}}
{{- define "yutodo.postgresql.secretName" -}}
{{- if .Values.postgresql.enabled }}
{{- printf "%s-postgresql" (include "yutodo.fullname" .) }}
{{- else }}
{{- .Values.config.database.postgresql.existingSecret | default (printf "%s-postgresql" (include "yutodo.fullname" .)) }}
{{- end }}
{{- end }}

{{/*
Create the Redis secret name
*/}}
{{- define "yutodo.redis.secretName" -}}
{{- if .Values.redis.enabled }}
{{- printf "%s-redis" (include "yutodo.fullname" .) }}
{{- else }}
{{- .Values.config.redis.existingSecret | default (printf "%s-redis" (include "yutodo.fullname" .)) }}
{{- end }}
{{- end }}

{{/*
Create the PostgreSQL hostname
*/}}
{{- define "yutodo.postgresql.host" -}}
{{- if .Values.postgresql.enabled }}
{{- printf "%s-postgresql" (include "yutodo.fullname" .) }}
{{- else }}
{{- .Values.config.database.postgresql.host }}
{{- end }}
{{- end }}

{{/*
Create the Redis hostname
*/}}
{{- define "yutodo.redis.host" -}}
{{- if .Values.redis.enabled }}
{{- printf "%s-redis-master" (include "yutodo.fullname" .) }}
{{- else }}
{{- .Values.config.redis.host }}
{{- end }}
{{- end }}

{{/*
Create the database connection string
*/}}
{{- define "yutodo.database.connectionString" -}}
{{- if eq .Values.config.database.type "postgresql" }}
{{- printf "postgresql://%s@%s:%d/%s?sslmode=%s" .Values.config.database.postgresql.username (include "yutodo.postgresql.host" .) (.Values.config.database.postgresql.port | int) .Values.config.database.postgresql.database .Values.config.database.postgresql.sslMode }}
{{- else }}
{{- printf "sqlite:%s" .Values.config.database.sqlite.path }}
{{- end }}
{{- end }}

{{/*
Create priority class name
*/}}
{{- define "yutodo.priorityClassName" -}}
{{- if .Values.costOptimization.priorityClass.enabled }}
{{- printf "%s-priority" (include "yutodo.fullname" .) }}
{{- end }}
{{- end }}

{{/*
Create storage class name
*/}}
{{- define "yutodo.storageClassName" -}}
{{- .Values.global.storageClass | default .Values.persistence.storageClass | default "" }}
{{- end }}

{{/*
Create configmap name for application config
*/}}
{{- define "yutodo.configmapName" -}}
{{- printf "%s-config" (include "yutodo.fullname" .) }}
{{- end }}

{{/*
Create secret name for application secrets
*/}}
{{- define "yutodo.secretName" -}}
{{- printf "%s-secret" (include "yutodo.fullname" .) }}
{{- end }}

{{/*
Create PVC name
*/}}
{{- define "yutodo.pvcName" -}}
{{- printf "%s-data" (include "yutodo.fullname" .) }}
{{- end }}

{{/*
Generate secrets for session and security
*/}}
{{- define "yutodo.generateSecret" -}}
{{- randAlphaNum 32 | b64enc }}
{{- end }}

{{/*
Get or generate session secret
*/}}
{{- define "yutodo.sessionSecret" -}}
{{- if .Values.config.security.sessionSecret }}
{{- .Values.config.security.sessionSecret | b64enc }}
{{- else }}
{{- include "yutodo.generateSecret" . }}
{{- end }}
{{- end }}

{{/*
Create common annotations
*/}}
{{- define "yutodo.annotations" -}}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ include "yutodo.chart" . }}
{{- end }}

{{/*
Create pod annotations
*/}}
{{- define "yutodo.podAnnotations" -}}
checksum/config: {{ include (print $.Template.BasePath "/configmap.yaml") . | sha256sum }}
checksum/secret: {{ include (print $.Template.BasePath "/secret.yaml") . | sha256sum }}
{{- with .Values.deployment.podAnnotations }}
{{- toYaml . | nindent 0 }}
{{- end }}
{{- end }}

{{/*
Create image pull secrets
*/}}
{{- define "yutodo.imagePullSecrets" -}}
{{- if or .Values.global.imagePullSecrets .Values.image.pullSecrets }}
imagePullSecrets:
{{- range .Values.global.imagePullSecrets }}
  - name: {{ . }}
{{- end }}
{{- range .Values.image.pullSecrets }}
  - name: {{ . }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Validate configuration
*/}}
{{- define "yutodo.validateConfig" -}}
{{- if and (eq .Values.config.database.type "postgresql") (not .Values.postgresql.enabled) (not .Values.config.database.postgresql.host) }}
{{- fail "PostgreSQL host must be specified when using external PostgreSQL" }}
{{- end }}
{{- if and .Values.config.redis.enabled (not .Values.redis.enabled) (not .Values.config.redis.host) }}
{{- fail "Redis host must be specified when using external Redis" }}
{{- end }}
{{- if and .Values.ingress.enabled (not .Values.ingress.hosts) }}
{{- fail "Ingress hosts must be specified when ingress is enabled" }}
{{- end }}
{{- end }}

{{/*
Create monitoring labels
*/}}
{{- define "yutodo.monitoringLabels" -}}
{{- include "yutodo.labels" . }}
{{- if .Values.monitoring.serviceMonitor.labels }}
{{- toYaml .Values.monitoring.serviceMonitor.labels | nindent 0 }}
{{- end }}
{{- end }}

{{/*
Create network policy name
*/}}
{{- define "yutodo.networkPolicyName" -}}
{{- printf "%s-netpol" (include "yutodo.fullname" .) }}
{{- end }}

{{/*
Create HPA name
*/}}
{{- define "yutodo.hpaName" -}}
{{- printf "%s-hpa" (include "yutodo.fullname" .) }}
{{- end }}

{{/*
Create PDB name
*/}}
{{- define "yutodo.pdbName" -}}
{{- printf "%s-pdb" (include "yutodo.fullname" .) }}
{{- end }}

{{/*
Create service monitor name
*/}}
{{- define "yutodo.serviceMonitorName" -}}
{{- printf "%s-servicemonitor" (include "yutodo.fullname" .) }}
{{- end }}

{{/*
Create prometheus rule name
*/}}
{{- define "yutodo.prometheusRuleName" -}}
{{- printf "%s-rules" (include "yutodo.fullname" .) }}
{{- end }}