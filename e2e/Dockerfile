# ======================================
# E2E Testing Container for YuToDo
# ======================================

FROM ubuntu:22.04

# Arguments
ARG DEBIAN_FRONTEND=noninteractive
ARG USERNAME=e2e
ARG USER_UID=1000
ARG USER_GID=$USER_UID

# Set environment variables
ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8
ENV DISPLAY=:99
ENV NODE_ENV=test

# Install system dependencies
RUN apt-get update && apt-get install -y \
    # Basic utilities
    curl \
    wget \
    git \
    build-essential \
    pkg-config \
    sudo \
    \
    # Node.js (via NodeSource repository)
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    \
    # Rust dependencies
    && curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y \
    \
    # Tauri system dependencies
    libwebkit2gtk-4.1-dev \
    libappindicator3-dev \
    librsvg2-dev \
    patchelf \
    libgtk-3-dev \
    libglib2.0-dev \
    libcairo-gobject2 \
    libxdo-dev \
    libayatana-appindicator3-dev \
    \
    # X11 and virtual display
    xvfb \
    x11-utils \
    x11-xserver-utils \
    dbus-x11 \
    mesa-utils \
    \
    # WebDriver dependencies
    webkit2gtk-driver \
    \
    # Font and rendering
    fonts-liberation \
    fonts-noto \
    fonts-noto-cjk \
    \
    # Additional utilities
    sqlite3 \
    jq \
    tree \
    htop \
    \
    # Clean up
    && apt-get autoremove -y \
    && apt-get clean -y \
    && rm -rf /var/lib/apt/lists/*

# Create user for E2E testing
RUN groupadd --gid $USER_GID $USERNAME \
    && useradd --uid $USER_UID --gid $USER_GID -m $USERNAME \
    && echo "$USERNAME ALL=(root) NOPASSWD:ALL" > /etc/sudoers.d/$USERNAME \
    && chmod 0440 /etc/sudoers.d/$USERNAME

# Switch to user for Rust installation
USER $USERNAME

# Install Rust and Cargo
ENV PATH="/home/$USERNAME/.cargo/bin:$PATH"
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y \
    && echo 'source ~/.cargo/env' >> ~/.bashrc

# Install Tauri CLI and tauri-driver
RUN ~/.cargo/bin/cargo install tauri-cli --locked \
    && ~/.cargo/bin/cargo install tauri-driver --locked

# Set working directory
WORKDIR /workspace

# Switch back to root for final setup
USER root

# Create directories for test artifacts
RUN mkdir -p /workspace/reports /workspace/screenshots /workspace/logs \
    && chown -R $USERNAME:$USERNAME /workspace

# Install global npm packages for testing
RUN npm install -g \
    typescript \
    ts-node \
    tsx \
    concurrently

# Copy E2E test scripts
COPY scripts/docker-e2e-setup.sh /usr/local/bin/
COPY scripts/docker-e2e-run.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-e2e-setup.sh /usr/local/bin/docker-e2e-run.sh

# Switch to test user
USER $USERNAME

# Environment setup
ENV PATH="/home/$USERNAME/.cargo/bin:$PATH"
ENV RUST_LOG=debug
ENV TAURI_DRIVER_PATH="/home/$USERNAME/.cargo/bin/tauri-driver"

# Configure X11 for virtual display
RUN echo 'export DISPLAY=:99' >> ~/.bashrc \
    && echo 'alias start-xvfb="Xvfb :99 -screen 0 1920x1080x24 -ac +extension GLX +render -noreset &"' >> ~/.bashrc

# Health check script
COPY --chown=$USERNAME:$USERNAME scripts/health-check.sh /home/$USERNAME/
RUN chmod +x /home/$USERNAME/health-check.sh

# Set default command
CMD ["/usr/local/bin/docker-e2e-run.sh"]

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD /home/$USERNAME/health-check.sh || exit 1