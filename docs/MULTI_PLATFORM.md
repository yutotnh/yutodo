# Multi-Platform Support Guide

YuToDo provides comprehensive multi-platform support for both Docker containers and native desktop applications, enabling deployment across various architectures and operating systems.

## 🏗️ Supported Platforms

### Docker Container Platforms

| Platform | Architecture | Support Level | Notes |
|----------|-------------|---------------|-------|
| `linux/amd64` | x86_64 | ✅ Full | Primary production platform |
| `linux/arm64` | ARM64/AArch64 | ✅ Full | Cloud-native, ARM processors |
| `linux/arm/v7` | ARM32v7 | ⚠️ Experimental | Raspberry Pi, IoT devices |

### Desktop Application Platforms

| Platform | Architecture | Support Level | Binary Format |
|----------|-------------|---------------|---------------|
| **macOS** | Intel (x86_64) | ✅ Full | `.dmg`, `.app` |
| **macOS** | Apple Silicon (ARM64) | ✅ Full | `.dmg`, `.app` |
| **Windows** | x64 | ✅ Full | `.msi`, `.exe` |
| **Windows** | ARM64 | ✅ Full | `.msi`, `.exe` |
| **Linux** | x86_64 | ✅ Full | `.deb`, `.AppImage` |
| **Linux** | ARM64 | ✅ Full | `.deb`, `.AppImage` |

## 🐳 Docker Multi-Platform Usage

### Building Multi-Platform Images

```bash
# Build for multiple platforms simultaneously
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --tag yutodo-server:multi \
  --push \
  ./server

# Build for specific platform
docker buildx build \
  --platform linux/arm64 \
  --tag yutodo-server:arm64 \
  ./server
```

### Pulling Platform-Specific Images

```bash
# Docker will automatically select the correct platform
docker pull ghcr.io/your-org/yutodo-server:latest

# Force specific platform
docker pull --platform linux/arm64 ghcr.io/your-org/yutodo-server:latest
```

### Docker Compose Multi-Platform

```yaml
# docker-compose.yml
version: '3.8'
services:
  yutodo-server:
    image: ghcr.io/your-org/yutodo-server:latest
    platform: linux/amd64  # Optional: force specific platform
    # ... rest of configuration
```

## 🏠 Native Desktop Applications

### Download Links

Native desktop applications are built automatically for all platforms:

- **macOS**: Download `.dmg` files from [Releases](https://github.com/your-org/yutodo/releases)
- **Windows**: Download `.msi` installers from [Releases](https://github.com/your-org/yutodo/releases)  
- **Linux**: Download `.deb` packages or `.AppImage` from [Releases](https://github.com/your-org/yutodo/releases)

### Platform-Specific Features

#### macOS
- Native menu bar integration
- Apple Silicon optimization
- Code signing and notarization (in releases)
- Universal binaries (Intel + Apple Silicon)

#### Windows
- Windows 10/11 native styling
- System tray integration
- ARM64 support for Surface devices
- Auto-updater integration

#### Linux
- GTK4 native interface
- System theme integration
- ARM64 support for Raspberry Pi
- Multiple package formats

## 🔧 Development Setup

### Prerequisites for Multi-Platform Development

#### Docker Multi-Platform
```bash
# Enable Docker Buildx (multi-platform builds)
docker buildx create --use

# Verify platform support
docker buildx ls
```

#### Tauri Cross-Compilation

**macOS → All Platforms**:
```bash
# Install Rust targets
rustup target add x86_64-apple-darwin
rustup target add aarch64-apple-darwin
rustup target add x86_64-pc-windows-msvc
rustup target add x86_64-unknown-linux-gnu

# Build for specific target
cargo tauri build --target aarch64-apple-darwin
```

**Linux → ARM64**:
```bash
# Install cross-compilation tools
sudo apt-get install gcc-aarch64-linux-gnu

# Add Rust target
rustup target add aarch64-unknown-linux-gnu

# Set environment variables
export PKG_CONFIG_SYSROOT_DIR=/usr/aarch64-linux-gnu
export PKG_CONFIG_PATH=/usr/aarch64-linux-gnu/lib/pkgconfig

# Build
cargo tauri build --target aarch64-unknown-linux-gnu
```

## 📊 Performance Characteristics

### Platform Performance Comparison

| Platform | Build Time | Runtime Performance | Memory Usage | Notes |
|----------|------------|-------------------|--------------|-------|
| `linux/amd64` | Baseline | 100% | Baseline | Reference platform |
| `linux/arm64` | +15-30% | 90-105% | -5-10% | Excellent efficiency |
| `linux/arm/v7` | +50-100% | 60-80% | Similar | Limited by CPU |

### Optimization Recommendations

#### Production Deployment
- **Cloud/Server**: Use `linux/amd64` for maximum compatibility
- **Edge/IoT**: Use `linux/arm64` for power efficiency
- **Desktop**: Use native builds for best user experience

#### Development
- **Local Development**: Use native platform for fastest builds
- **CI/CD**: Test all target platforms automatically
- **Debugging**: Use `linux/amd64` for best tooling support

## 🔒 Security Considerations

### Platform-Specific Security

#### Container Security
```bash
# Scan multi-platform images
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image --platform linux/arm64 yutodo-server:latest
```

#### Code Signing
- **macOS**: Apple Developer Program required for distribution
- **Windows**: Authenticode signing for trusted installation
- **Linux**: GPG signing for package repositories

### Trust and Verification

```bash
# Verify image platform
docker inspect ghcr.io/your-org/yutodo-server:latest | jq '.[0].Architecture'

# Check image signatures (if implemented)
cosign verify ghcr.io/your-org/yutodo-server:latest
```

## 🚀 Deployment Strategies

### Kubernetes Multi-Platform

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: yutodo
spec:
  template:
    spec:
      nodeSelector:
        kubernetes.io/arch: amd64  # or arm64
      containers:
      - name: yutodo
        image: ghcr.io/your-org/yutodo-server:latest
```

### Docker Swarm Multi-Architecture

```yaml
# docker-compose.swarm.yml
version: '3.8'
services:
  yutodo:
    image: ghcr.io/your-org/yutodo-server:latest
    deploy:
      placement:
        constraints:
          - node.platform.arch == x86_64  # or aarch64
```

### ARM64 Cloud Providers

#### AWS Graviton
```bash
# Launch ARM64 EC2 instance
aws ec2 run-instances \
  --image-id ami-0abcdef1234567890 \
  --instance-type m6g.large \
  --architecture arm64
```

#### Google Cloud Platform
```bash
# Create ARM64 GKE cluster
gcloud container clusters create yutodo-arm64 \
  --machine-type t2a-standard-2 \
  --zone us-central1-a
```

## 🧪 Testing Multi-Platform Builds

### Local Testing

```bash
# Test ARM64 image on x86_64 (using emulation)
docker run --platform linux/arm64 \
  ghcr.io/your-org/yutodo-server:latest

# Performance testing across platforms
./scripts/benchmark-platforms.sh
```

### CI/CD Testing

The project includes comprehensive multi-platform testing:

- **Matrix Builds**: Test all platform combinations
- **Performance Benchmarks**: Compare platform performance
- **Security Scans**: Vulnerability testing per platform
- **Size Analysis**: Optimize build sizes

View the latest multi-platform test results in [GitHub Actions](https://github.com/your-org/yutodo/actions).

## 📈 Monitoring and Metrics

### Platform-Specific Metrics

```bash
# Check container platform at runtime
curl http://localhost:3001/api/platform

# Response example:
{
  "platform": "linux",
  "arch": "arm64",
  "node_version": "v20.x.x",
  "container": true
}
```

### Grafana Dashboard

The included Grafana dashboard provides platform-specific metrics:

- CPU usage by architecture
- Memory efficiency comparison
- Network performance across platforms
- Error rates by platform

## 🛠️ Troubleshooting

### Common Issues

#### Build Failures
```bash
# Check available platforms
docker buildx ls

# Clear build cache
docker buildx prune

# Enable experimental features
export DOCKER_CLI_EXPERIMENTAL=enabled
```

#### Runtime Issues
```bash
# Check actual platform
docker exec -it container uname -m

# Verify Node.js architecture
docker exec -it container node -e "console.log(process.arch)"
```

#### Performance Issues
```bash
# Monitor resource usage
docker stats

# Compare platform performance
docker run --platform linux/arm64 yutodo-server node -e "console.time('startup'); require('./dist/server.js'); console.timeEnd('startup')"
```

### Platform-Specific Debugging

#### ARM64 Debugging
```bash
# Install QEMU for emulation
sudo apt-get install qemu-user-static

# Register binfmt handlers
docker run --rm --privileged multiarch/qemu-user-static --reset -p yes
```

## 📚 Additional Resources

### Documentation
- [Docker Buildx Documentation](https://docs.docker.com/buildx/)
- [Tauri Cross-Compilation Guide](https://tauri.app/v1/guides/building/cross-platform/)
- [Kubernetes Multi-Architecture](https://kubernetes.io/docs/concepts/cluster-administration/system-metrics/)

### Tools
- [Docker Buildx](https://github.com/docker/buildx) - Multi-platform builds
- [QEMU](https://www.qemu.org/) - Architecture emulation
- [Cosign](https://github.com/sigstore/cosign) - Container signing

### Community
- [Multi-arch Docker Images](https://www.docker.com/blog/multi-arch-build-and-images-the-simple-way/)
- [ARM64 Best Practices](https://aws.amazon.com/blogs/compute/migrating-x86-based-linux-workloads-to-graviton/)

---

## 🤝 Contributing

Help improve multi-platform support:

1. **Test on New Platforms**: Try YuToDo on different architectures
2. **Report Issues**: Platform-specific bugs and performance issues
3. **Optimize Builds**: Contribute build optimizations
4. **Documentation**: Improve platform-specific guides

For questions about multi-platform support, please [open an issue](https://github.com/your-org/yutodo/issues) with the `multi-platform` label.