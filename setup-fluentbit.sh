#!/bin/bash

set -e

echo "========================================="
echo "Installing Fluent Bit"
echo "========================================="

# -----------------------------------------
# Install Fluent Bit
# -----------------------------------------
curl https://raw.githubusercontent.com/fluent/fluent-bit/master/install.sh | sudo bash

sudo apt-get update

sudo apt-get install -y fluent-bit

echo "========================================="
echo "Creating Fluent Bit Config"
echo "========================================="

sudo tee /etc/fluent-bit/fluent-bit.conf > /dev/null <<'EOF'

# =========================
# SERVICE
# =========================
[SERVICE]
    Flush               1
    Daemon              Off
    Log_Level           info

    Parsers_File        parsers.conf
    Plugins_File        plugins.conf

    HTTP_Server         On
    HTTP_Listen         0.0.0.0
    HTTP_Port           2020

    storage.metrics     On

# =========================
# INPUTS
# =========================

# NGINX ACCESS
[INPUT]
    Name                tail
    Tag                 nginx.access
    Path                /var/log/nginx/access.log

    Mem_Buf_Limit       10MB
    Skip_Long_Lines     On
    Refresh_Interval    5

    DB                  /var/log/flb_nginx_access.db

# NGINX ERROR
[INPUT]
    Name                tail
    Tag                 nginx.error
    Path                /var/log/nginx/error.log

    Mem_Buf_Limit       10MB
    Skip_Long_Lines     On
    Refresh_Interval    5

    DB                  /var/log/flb_nginx_error.db

# PM2 SYSTEM
[INPUT]
    Name                tail
    Tag                 pm2.system
    Path                /home/ubuntu/.pm2/pm2.log

    Mem_Buf_Limit       10MB
    Skip_Long_Lines     On
    Refresh_Interval    5

    DB                  /var/log/flb_pm2_system.db

# PM2 APPS
[INPUT]
    Name                tail
    Tag                 pm2.app
    Path                /home/ubuntu/.pm2/logs/*.log

    Mem_Buf_Limit       50MB
    Skip_Long_Lines     On
    Refresh_Interval    5

    DB                  /var/log/flb_pm2_apps.db

# CPU
[INPUT]
    Name                cpu
    Tag                 system.cpu
    Interval_Sec        5

# MEMORY
[INPUT]
    Name                mem
    Tag                 system.mem
    Interval_Sec        5

# DISK
[INPUT]
    Name                disk
    Tag                 system.disk
    Interval_Sec        10

# =========================
# FILTERS
# =========================

[FILTER]
    Name                record_modifier
    Match               *

    Record              project triviaverse
    Record              environment production
    Record              region ap-south-1
    Record              hostname ${HOSTNAME}

[FILTER]
    Name                aws
    Match               *
    imds_version        v2

# =========================
# OUTPUTS
# =========================

# NGINX ACCESS
[OUTPUT]
    Name                cloudwatch_logs
    Match               nginx.access

    region              ap-south-1

    log_group_name      nginx-access-logs
    log_stream_prefix   access-

    auto_create_group   true

# NGINX ERROR
[OUTPUT]
    Name                cloudwatch_logs
    Match               nginx.error

    region              ap-south-1

    log_group_name      nginx-error-logs
    log_stream_prefix   error-

    auto_create_group   true

# PM2 SYSTEM
[OUTPUT]
    Name                cloudwatch_logs
    Match               pm2.system

    region              ap-south-1

    log_group_name      pm2-system-logs
    log_stream_name     pm2-${HOSTNAME}

    auto_create_group   true

# PM2 APP
[OUTPUT]
    Name                cloudwatch_logs
    Match               pm2.app

    region              ap-south-1

    log_group_name      pm2-app-logs
    log_stream_prefix   app-

    auto_create_group   true

# CPU
[OUTPUT]
    Name                cloudwatch_logs
    Match               system.cpu

    region              ap-south-1

    log_group_name      system-metrics
    log_stream_name     cpu-${HOSTNAME}

    auto_create_group   true

# MEMORY
[OUTPUT]
    Name                cloudwatch_logs
    Match               system.mem

    region              ap-south-1

    log_group_name      system-metrics
    log_stream_name     mem-${HOSTNAME}

    auto_create_group   true

# DISK
[OUTPUT]
    Name                cloudwatch_logs
    Match               system.disk

    region              ap-south-1

    log_group_name      system-metrics
    log_stream_name     disk-${HOSTNAME}

    auto_create_group   true

EOF

echo "========================================="
echo "Enabling Fluent Bit"
echo "========================================="

sudo systemctl enable fluent-bit

sudo systemctl restart fluent-bit

echo "========================================="
echo "Installing PM2 Log Rotation"
echo "========================================="

pm2 install pm2-logrotate || true

pm2 set pm2-logrotate:max_size 50M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true

echo "========================================="
echo "Fluent Bit Status"
echo "========================================="

sudo systemctl status fluent-bit --no-pager

echo "========================================="
echo "Done"
echo "========================================="