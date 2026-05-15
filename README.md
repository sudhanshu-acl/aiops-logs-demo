## Monitoring 

- An important component for building the application if monitoring the system health, performance and logs of the system  to better understand it.

Ex:- We might visit some property, the guard use to write few details, once the owner visit they can check by data on that day
who are the people who had visited the property.So basically the guard is maintain the persons logs who has visited their property.

## Tools for monitoring
- In application you use some package to log the some important flow of the application
- Nginx and system it self maintain a logs
- cloudwatch and other cloud hosted log mantainnanc.

### How it help?
- How many requests ?
- How many exceptions ?
- How many server resources are used ?
- Using libary exposes /metrics endpoints
- Application / Servers push to a centralized collection platform
- Install additional software or tool to push metric


## Some opensource tools
- Prometheus
- Grafana
- Loki
- Cloudwatch
- winston
- fluent-bit ,push agent

## Prometheus data storage

Prometheus Server

Retrieval             storage                   Http

- pull /metrics       - stores matrics         - Accepts queries
                      - timeseries data         - PromQl

## AIOS IDEAS

- when you are adding project or server
- Provide the AWS_ACCESS_KEY_ID,AWS_SECRET_ACCESS_KEY,AWS_REGION .
- Securily store these values into the AWS parameter store ,
based on projectId, or server id we fetch these env from
parameter store aws service.

