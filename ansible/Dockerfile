FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    ANSIBLE_CONFIG=/ansible/ansible.cfg

WORKDIR /ansible

# Install dependencies and Docker client tools
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        curl \
        ca-certificates \
        gnupg && \
    rm -rf /var/lib/apt/lists/*

# Install python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install community.docker collection for container management
RUN ansible-galaxy collection install community.docker:>=3.10.0

# Copy Ansible playbooks, roles, inventory, config and execution scripts
COPY ansible.cfg .
COPY inventory ./inventory
COPY roles ./roles
COPY playbooks ./playbooks
COPY scripts ./scripts
RUN chmod +x scripts/run_recovery.py && mkdir -p /ansible/logs

# Default daemon keeping container alive for controlled command execution
CMD ["tail", "-f", "/dev/null"]
