# Use Python 3.12 as base image
FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    bash \
    build-essential \
    curl \
    git \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set up a non-root user for better security
ARG USERNAME=vscode
ARG USER_UID=1000
ARG USER_GID=$USER_UID

# Create the user
RUN groupadd --gid $USER_GID $USERNAME \
    && useradd --uid $USER_UID --gid $USER_GID -m $USERNAME \
    && apt-get update \
    && apt-get install -y sudo \
    && echo $USERNAME ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/$USERNAME \
    && chmod 0440 /etc/sudoers.d/$USERNAME

# Set the working directory
WORKDIR /workspace

# Install Python development tools
RUN pip install --no-cache-dir --upgrade pip setuptools wheel \
    pylint flake8 mypy pytest black isort

# Install project development dependencies
COPY pyproject.toml /workspace/
RUN pip install --no-cache-dir -e .[dev]

# Expose the ports for the API and Streamlit
EXPOSE 80 8501

# Set the default user when running the container
USER $USERNAME

# Default command (not necessary for Dev Container but useful for debugging)
CMD ["bash"]