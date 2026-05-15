## Run the setup-fluentbit.sh

```
sudo bash /opt/triviaverse/setup-fluentbit.sh
```

# Triviaverse Server Observability Stack

This setup configures centralized logging and metrics collection for EC2 servers using:

* Fluent Bit
* AWS CloudWatch Logs
* Nginx
* PM2
* System Metrics (CPU / Memory / Disk)

---

# Features

## Logs Collected

### Nginx

* Access logs
* Error logs

### PM2

* PM2 internal logs
* Node.js application logs

### System Metrics

* CPU usage
* Memory usage
* Disk usage

---

# Architecture

```text
Nginx Logs
     ↓
PM2 Logs
     ↓
System Metrics
     ↓
Fluent Bit
     ↓
AWS CloudWatch Logs
```

---

# Requirements

## Ubuntu Server

Tested on:

* Ubuntu 22.04
* Ubuntu 24.04

## AWS IAM Role

Attach this IAM policy to the EC2 instance:

```json
{
  "Effect": "Allow",
  "Action": [
    "logs:CreateLogGroup",
    "logs:CreateLogStream",
    "logs:PutLogEvents"
  ],
  "Resource": "*"
}
```

Or simply attach:

```text
CloudWatchAgentServerPolicy
```

---

# Installation

## 1. Copy Setup Script

Create directory:

```bash
sudo mkdir -p /opt/triviaverse
```

Create file:

```bash
sudo nano /opt/triviaverse/setup-fluentbit.sh
```

Paste the setup script contents.

---

## 2. Make Executable

```bash
sudo chmod +x /opt/triviaverse/setup-fluentbit.sh
```

---

## 3. Run Setup

```bash
sudo bash /opt/triviaverse/setup-fluentbit.sh
```

---

# What Gets Installed

## Fluent Bit

Installed as a systemd service:

```bash
sudo systemctl status fluent-bit
```

---

## PM2 Log Rotation

Installed automatically:

```bash
pm2 install pm2-logrotate
```

Configured with:

* Max Size: 50MB
* Retain: 7 files
* Compression enabled

---

# CloudWatch Log Groups

The following log groups are automatically created:

| Log Group         | Purpose                     |
| ----------------- | --------------------------- |
| nginx-access-logs | Nginx access logs           |
| nginx-error-logs  | Nginx error logs            |
| pm2-system-logs   | PM2 daemon logs             |
| pm2-app-logs      | Node.js app logs            |
| system-metrics    | CPU / memory / disk metrics |

---

# Fluent Bit Inputs

## Nginx Access Logs

```text
/var/log/nginx/access.log
```

## Nginx Error Logs

```text
/var/log/nginx/error.log
```

## PM2 Internal Logs

```text
/home/ubuntu/.pm2/pm2.log
```

## PM2 Application Logs

```text
/home/ubuntu/.pm2/logs/*.log
```

---

# Useful Commands

## Restart Fluent Bit

```bash
sudo systemctl restart fluent-bit
```

## View Fluent Bit Logs

```bash
sudo journalctl -u fluent-bit -f
```

## Check Service Status

```bash
sudo systemctl status fluent-bit
```

## View PM2 Logs

```bash
pm2 logs
```

## Restart PM2 Apps

```bash
pm2 restart all
```

---

# Verify Logs in AWS

Go to:

```text
AWS Console
→ CloudWatch
→ Log Groups
```

Expected groups:

```text
nginx-access-logs
nginx-error-logs
pm2-system-logs
pm2-app-logs
system-metrics
```

---

# Recommended Production Improvements

## Separate Application Logs

Instead of using:

```text
/home/ubuntu/.pm2/logs/
```

consider:

```text
/var/log/triviaverse/
```

for cleaner production log management.

---

## Add Log Parsing

Future improvements:

* JSON parsing
* Structured logging
* Request tracing
* Error alerting
* Grafana dashboards

---

# Security Notes

## Avoid Public Fluent Bit APIs

Disable public access to:

```text
HTTP_Server On
HTTP_Port 2020
```

unless needed internally.

---

## TLS Verification

Always use:

```ini
TLS.Verify On
```

when sending logs externally.

---

# Troubleshooting

## Fluent Bit Not Starting

Check logs:

```bash
sudo journalctl -u fluent-bit -n 100
```

Validate config:

```bash
sudo fluent-bit --dry-run -c /etc/fluent-bit/fluent-bit.conf
```

---

## CloudWatch Logs Not Appearing

Check:

* IAM role attached
* EC2 metadata access
* internet connectivity
* AWS region configuration

---

## PM2 Logs Missing

Verify PM2 logs exist:

```bash
ls ~/.pm2/logs/
```

---

# File Locations

| File                              | Purpose                    |
| --------------------------------- | -------------------------- |
| `/etc/fluent-bit/fluent-bit.conf` | Main Fluent Bit config     |
| `/var/log/flb_*.db`               | Fluent Bit offset tracking |
| `/home/ubuntu/.pm2/logs/`         | PM2 app logs               |
| `/var/log/nginx/`                 | Nginx logs                 |

---

# Maintenance

## Update Fluent Bit

```bash
sudo apt update
sudo apt upgrade fluent-bit
```

## Force Nginx Log Rotation

```bash
sudo logrotate -f /etc/logrotate.d/nginx
```

---

# Final Result

After setup:

* All server logs centralized in CloudWatch
* PM2 logs automatically rotated
* Metrics continuously collected
* Observability fully automated
* No recursive logging loops
* Production-safe logging pipeline

---
