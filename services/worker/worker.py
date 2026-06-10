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
import redis
import requests

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


def process_ai_job(payload):
    """Process an AI inference job."""
    try:
        prompt = payload.get('prompt', '')
        image_url = payload.get('image_url')
        
        # Call Kimi AI service
        kimi_url = 'http://kimi:5000/ai/generate'
        response = requests.post(
            kimi_url,
            json={'prompt': prompt, 'image_url': image_url},
            timeout=30
        )
        response.raise_for_status()
        
        result = response.json()
        logger.info(f'AI job processed: prompt={prompt[:50]}...')
        return {'status': 'success', 'result': result}
    except Exception as e:
        logger.error(f'AI job failed: {e}')
        return {'status': 'error', 'error': str(e)}


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
