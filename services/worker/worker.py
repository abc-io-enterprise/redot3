#!/usr/bin/env python3
"""
Background job worker for ABC-IO v2.0 redot2 system.
Consumes tasks from Redis queue and processes them.
"""

import os
import sys
import time
import json
import logging
import smtplib
from email.mime.text import MIMEText

import redis
import requests
import psycopg2

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s: %(message)s'
)
logger = logging.getLogger('redot2-worker')

# Redis configuration
REDIS_HOST = os.getenv('REDIS_HOST', 'redis')
REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))
REDIS_DB = int(os.getenv('REDIS_DB', 0))
REDIS_URL = os.getenv('REDIS_URL', f'redis://{REDIS_HOST}:{REDIS_PORT}/{REDIS_DB}')

# Database configuration
DATABASE_URL = os.getenv('DATABASE_URL', 'postgres://postgres:postgres@postgres:5432/abc_io')

# AI endpoints (comma-separated) for redundancy
KIMI_ENDPOINTS = [e.strip() for e in os.getenv('KIMI_ENDPOINTS', 'http://kimi:5000').split(',') if e.strip()]

# Job queue names
JOB_QUEUE = 'redot2:jobs:queue'
PROCESSED_QUEUE = 'redot2:jobs:processed'

try:
    redis_client = redis.from_url(REDIS_URL, decode_responses=True)
    redis_client.ping()
    logger.info(f'Connected to Redis at {REDIS_HOST}:{REDIS_PORT}')
except Exception as e:
    logger.error(f'Failed to connect to Redis: {e}')
    sys.exit(1)


def get_db_connection():
    """Get a PostgreSQL connection."""
    return psycopg2.connect(DATABASE_URL)


def send_email_alert(to, subject, html, text):
    """Send an email alert using SMTP environment variables."""
    smtp_url = os.getenv('SMTP_URL', '')
    smtp_host = os.getenv('SMTP_HOST', '')
    smtp_port = int(os.getenv('SMTP_PORT', 587))
    smtp_user = os.getenv('SMTP_USER', '')
    smtp_pass = os.getenv('SMTP_PASS', '')
    smtp_from = os.getenv('SMTP_FROM', 'ABC-IO <noreply@abc-io.com>')

    if not smtp_host and not smtp_url:
        logger.info(f'[EMAIL DEV] To: {to} | Subject: {subject}')
        return

    try:
        msg = MIMEText(html, 'html')
        msg['Subject'] = subject
        msg['From'] = smtp_from
        msg['To'] = to

        if smtp_url and (smtp_url.startswith('smtp://') or smtp_url.startswith('smtps://')):
            # Dev/placeholder: just log
            logger.info(f'[EMAIL URL] To: {to} | Subject: {subject}')
            return

        server = smtplib.SMTP(smtp_host, smtp_port, timeout=10)
        if smtp_port == 587:
            server.starttls()
        if smtp_user and smtp_pass:
            server.login(smtp_user, smtp_pass)
        server.sendmail(smtp_from, [to], msg.as_string())
        server.quit()
        logger.info(f'Email alert sent to {to}')
    except Exception as e:
        logger.error(f'Email alert failed: {e}')


def process_ai_job(payload):
    """Process an AI inference job, trying each configured Kimi endpoint."""
    errors = []
    prompt = payload.get('prompt', '')
    image_url = payload.get('image_url')
    for endpoint in KIMI_ENDPOINTS:
        try:
            response = requests.post(
                f'{endpoint}/ai/generate',
                json={'prompt': prompt, 'image_url': image_url},
                timeout=30
            )
            response.raise_for_status()
            result = response.json()
            logger.info(f'AI job processed via {endpoint}: prompt={prompt[:50]}...')
            return {'status': 'success', 'result': result, 'endpoint': endpoint}
        except Exception as e:
            logger.warning(f'AI endpoint {endpoint} failed: {e}')
            errors.append(f'{endpoint}: {e}')
    logger.error(f'AI job failed on all endpoints: {errors}')
    return {'status': 'error', 'error': 'All AI endpoints failed: ' + '; '.join(errors)}


def process_health_check(payload):
    """Process a health check job."""
    try:
        endpoints = payload.get('endpoints', [])
        results = {}
        
        for endpoint in endpoints:
            try:
                resp = requests.get(endpoint, timeout=5)
                results[endpoint] = {'status': resp.status_code, 'ok': resp.status_code == 200}
            except Exception as e:
                results[endpoint] = {'status': 'error', 'ok': False}
        
        logger.info(f'Health check completed: {sum(1 for r in results.values() if r["ok"])}/{len(endpoints)} ok')
        return {'status': 'success', 'results': results}
    except Exception as e:
        logger.error(f'Health check failed: {e}')
        return {'status': 'error', 'error': str(e)}


def process_security_scan(payload):
    """Scan recent usage and audit logs for anomalies and insert security events."""
    events_created = 0
    alerts_sent = 0
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # 1) Usage spike: compare last 24h to previous 24h per account
        cur.execute(
            """
            SELECT account_id,
                   COUNT(*) FILTER (WHERE created_at >= now() - interval '24 hours') AS current_period,
                   COUNT(*) FILTER (WHERE created_at >= now() - interval '48 hours' AND created_at < now() - interval '24 hours') AS previous_period
            FROM usage_logs
            WHERE created_at >= now() - interval '48 hours'
              AND account_id IS NOT NULL
            GROUP BY account_id
            """
        )
        for account_id, current, previous in cur.fetchall():
            previous = previous or 0
            current = current or 0
            if previous > 0 and current > previous * 10 and current >= 50:
                cur.execute(
                    """
                    INSERT INTO security_events (account_id, event_type, severity, metadata)
                    VALUES (%s, %s, %s, %s)
                    RETURNING id
                    """,
                    (
                        account_id,
                        'unusual_usage_spike',
                        'high',
                        json.dumps({'previous_24h': previous, 'current_24h': current, 'multiplier': round(current / max(previous, 1), 2)})
                    )
                )
                event_id = cur.fetchone()[0]
                events_created += 1
                alerts_sent += _maybe_alert_account(cur, account_id, event_id, 'high', 'Unusual usage spike detected', current)

        # 2) Requests from many distinct IPs per account in last 24h
        cur.execute(
            """
            SELECT account_id, COUNT(DISTINCT ip_address) AS ip_count
            FROM usage_logs
            WHERE created_at >= now() - interval '24 hours'
              AND account_id IS NOT NULL
              AND ip_address IS NOT NULL
            GROUP BY account_id
            HAVING COUNT(DISTINCT ip_address) > 5
            """
        )
        for account_id, ip_count in cur.fetchall():
            cur.execute(
                """
                INSERT INTO security_events (account_id, event_type, severity, metadata)
                VALUES (%s, %s, %s, %s)
                RETURNING id
                """,
                (
                    account_id,
                    'many_source_ips',
                    'warning',
                    json.dumps({'distinct_ip_count': ip_count, 'window_hours': 24})
                )
            )
            event_id = cur.fetchone()[0]
            events_created += 1
            alerts_sent += _maybe_alert_account(cur, account_id, event_id, 'warning', 'Requests from many IP addresses', ip_count)

        # 3) Repeated 401s per account from audit logs
        cur.execute(
            """
            SELECT account_id, COUNT(*) AS fail_count
            FROM audit_logs
            WHERE created_at >= now() - interval '24 hours'
              AND event_type IN ('login_failed', 'unauthorized')
              AND severity IN ('warning', 'error', 'critical')
            GROUP BY account_id
            HAVING COUNT(*) >= 5
            """
        )
        for account_id, fail_count in cur.fetchall():
            severity = 'high' if fail_count >= 10 else 'warning'
            cur.execute(
                """
                INSERT INTO security_events (account_id, event_type, severity, metadata)
                VALUES (%s, %s, %s, %s)
                RETURNING id
                """,
                (
                    account_id,
                    'repeated_auth_failures',
                    severity,
                    json.dumps({'failure_count': fail_count, 'window_hours': 24})
                )
            )
            event_id = cur.fetchone()[0]
            events_created += 1
            alerts_sent += _maybe_alert_account(cur, account_id, event_id, severity, 'Repeated authentication failures', fail_count)

        conn.commit()
        cur.close()
        logger.info(f'Security scan complete: {events_created} events created, {alerts_sent} alerts sent')
        return {'status': 'success', 'events_created': events_created, 'alerts_sent': alerts_sent}
    except Exception as e:
        logger.error(f'Security scan failed: {e}', exc_info=True)
        if conn:
            conn.rollback()
        return {'status': 'error', 'error': str(e)}
    finally:
        if conn:
            conn.close()


def _maybe_alert_account(cur, account_id, event_id, severity, title, value):
    """Send email alert for high/critical security events. Returns 1 if alert sent."""
    if severity not in ('high', 'critical'):
        return 0
    try:
        cur.execute(
            'SELECT billing_email FROM accounts WHERE id = %s',
            (account_id,)
        )
        row = cur.fetchone()
        if row and row[0]:
            send_email_alert(
                row[0],
                f'[ABC-IO Security] {title}',
                f'<p><strong>{title}</strong></p><p>Event ID: {event_id}</p><p>Value: {value}</p><p>Please review your account security settings.</p>',
                f'{title}\nEvent ID: {event_id}\nValue: {value}\nReview your account security settings.'
            )
            return 1
    except Exception as e:
        logger.error(f'Failed to alert account {account_id}: {e}')
    return 0


def process_job(job_data):
    """Route and process a job based on type."""
    try:
        job_type = job_data.get('type', 'unknown')
        payload = job_data.get('payload', {})
        job_id = job_data.get('id', 'unknown')
        
        logger.info(f'Processing job {job_id} of type {job_type}')
        
        if job_type == 'ai_inference':
            result = process_ai_job(payload)
        elif job_type == 'health_check':
            result = process_health_check(payload)
        elif job_type == 'security_scan':
            result = process_security_scan(payload)
        else:
            result = {'status': 'error', 'error': f'Unknown job type: {job_type}'}
        
        # Store result
        result_key = f'{PROCESSED_QUEUE}:{job_id}'
        redis_client.setex(result_key, 3600, json.dumps(result))
        
        return result
    except Exception as e:
        logger.error(f'Job processing error: {e}')
        return {'status': 'error', 'error': str(e)}


def worker_loop():
    """Main worker loop: continuously consume jobs from Redis queue."""
    logger.info('Worker started. Waiting for jobs...')
    
    while True:
        try:
            # Block and wait for job (timeout=1 second to check health periodically)
            job_data = redis_client.blpop(JOB_QUEUE, timeout=1)
            
            if job_data:
                # blpop returns (queue_name, job_json)
                _, job_json = job_data
                job = json.loads(job_json)
                process_job(job)
            else:
                # Periodic heartbeat
                redis_client.set(f'redot2:worker:heartbeat', time.time())
        
        except KeyboardInterrupt:
            logger.info('Worker interrupted. Shutting down.')
            break
        except Exception as e:
            logger.error(f'Worker error: {e}', exc_info=True)
            time.sleep(1)  # Back off on errors


def health():
    """Health check endpoint for the worker."""
    try:
        redis_client.ping()
        return {'status': 'healthy', 'service': 'worker'}
    except Exception as e:
        return {'status': 'unhealthy', 'error': str(e)}


if __name__ == '__main__':
    # Log startup
    logger.info('=== ABC-IO v2.0 Background Worker ===')
    logger.info(f'Redis: {REDIS_HOST}:{REDIS_PORT}/{REDIS_DB}')
    logger.info(f'Job Queue: {JOB_QUEUE}')
    
    # Start worker
    try:
        worker_loop()
    except Exception as e:
        logger.critical(f'Unrecoverable error: {e}')
        sys.exit(1)
