# ======================================
# Development Container Dockerfile
# ======================================

FROM mcr.microsoft.com/devcontainers/base:ubuntu-22.04

# Arguments
ARG USERNAME=vscode
ARG USER_UID=1000
ARG USER_GID=$USER_UID

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive
ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8

# Configure apt and install packages
RUN apt-get update && apt-get install -y \
    # Basic development tools
    curl \
    wget \
    git \
    build-essential \
    pkg-config \
    libc6-dev \
    m4 \
    g++-multilib \
    autoconf \
    libtool \
    ncurses-dev \
    unzip \
    git \
    python3 \
    python3-pip \
    \
    # Tauri dependencies
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
    # Additional utilities
    tree \
    htop \
    vim \
    nano \
    jq \
    ripgrep \
    fd-find \
    bat \
    exa \
    \
    # X11 and Wayland support (for GUI testing)
    xvfb \
    x11-utils \
    x11-xserver-utils \
    dbus-x11 \
    \
    # Database tools
    sqlite3 \
    \
    # Network tools
    net-tools \
    iputils-ping \
    telnet \
    \
    # Clean up
    && apt-get autoremove -y \
    && apt-get clean -y \
    && rm -rf /var/lib/apt/lists/*

# Install additional Rust tools (will be handled by devcontainer features)
# But set up some conveniences
RUN echo 'export PATH="$HOME/.cargo/bin:$PATH"' >> /home/$USERNAME/.bashrc \
    && echo 'export PATH="$HOME/.local/bin:$PATH"' >> /home/$USERNAME/.bashrc

# Install tauri-driver for E2E testing
RUN wget -O /tmp/tauri-driver.deb \
    "https://github.com/tauri-apps/tauri-driver/releases/latest/download/tauri-driver_amd64.deb" \
    && dpkg -i /tmp/tauri-driver.deb || apt-get install -f -y \
    && rm /tmp/tauri-driver.deb

# Set up WebDriver for E2E testing
RUN apt-get update && apt-get install -y \
    webkit2gtk-driver \
    && apt-get clean -y \
    && rm -rf /var/lib/apt/lists/*

# Create development directories
RUN mkdir -p /workspace \
    && chown -R $USERNAME:$USERNAME /workspace

# Install global npm packages that are commonly used in development
USER $USERNAME
RUN npm install -g \
    typescript \
    ts-node \
    @types/node \
    eslint \
    prettier \
    concurrently \
    nodemon

# Configure git safe directory (for devcontainer)
RUN git config --global --add safe.directory /workspace

# Set up shell aliases and environment
RUN echo 'alias ll="ls -alF"' >> ~/.bashrc \
    && echo 'alias la="ls -A"' >> ~/.bashrc \
    && echo 'alias l="ls -CF"' >> ~/.bashrc \
    && echo 'alias grep="grep --color=auto"' >> ~/.bashrc \
    && echo 'alias tree="tree -C"' >> ~/.bashrc

# Switch back to root for final setup
USER root

# Set the default working directory
WORKDIR /workspace

# Configure entry point
COPY post-create.sh /usr/local/bin/
COPY post-start.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/post-create.sh /usr/local/bin/post-start.sh

# Switch to development user
USER $USERNAME

# Set default shell
SHELL ["/bin/bash", "-c"]