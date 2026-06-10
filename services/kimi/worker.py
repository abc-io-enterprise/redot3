import os
import time
import redis

REDIS_HOST = os.getenv('REDIS_HOST', 'redis')
REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))

client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=0)

if __name__ == '__main__':
    print('Kimi worker starting...')
    while True:
        try:
            task = client.lpop('abc_io_tasks')
            if task:
                print(f'Processing task: {task.decode("utf-8")}')
                time.sleep(2)
                client.rpush('abc_io_results', f'completed: {task.decode("utf-8")}')
            else:
                time.sleep(5)
        except Exception as exc:
            print(f'Worker error: {exc}')
            time.sleep(10)
