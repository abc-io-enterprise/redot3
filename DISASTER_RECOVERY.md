# Disaster Recovery

## Recovery Objectives

- Recovery Time Objective (RTO): 15 minutes.
- Recovery Point Objective (RPO): 1 hour.

## Backup Strategy

- Back up PostgreSQL data volume regularly.
- Archive configuration and scripts to an external storage location.

## Restore Procedure

1. Restore the PostgreSQL volume.
2. Reapply environment configuration.
3. Restart services with `docker compose -f compose.prod.yml up -d`.
