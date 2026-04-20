import subprocess
import time
import os

# ASEP Infrastructure: Neural Autoscaler (v1.0)
# Scale Logic:
# < 2k active reqs -> 2 replicas
# 2k - 6k active reqs -> 4 replicas
# > 6k active reqs -> 8 replicas

# Load environment variables
def get_env(key, default):
    return os.getenv(key, default)

SERVICE_NAME = get_env("AUTOSCALE_SERVICE", "backend")
MAX_REPLICAS = int(get_env("AUTOSCALE_MAX", 8))
MIN_REPLICAS = int(get_env("AUTOSCALE_MIN", 2))

def get_active_connections():
    """Reads current load from Nginx status or internal telemetry."""
    # Simulation: In production, this would parse nginx 'stub_status'
    # or read from Redis keys set by the BehaviorTrackingMiddleware.
    try:
        # Placeholder for real metrics extraction
        return 1200 # Current simulated load
    except:
        return 0

def scale_service(replicas):
    """Executes docker-compose scale command."""
    print(f"[AUTOSCALER] Resizing cluster to {replicas} nodes...")
    try:
        cmd = f"docker-compose up -d --scale {SERVICE_NAME}={replicas}"
        subprocess.run(cmd, shell=True, check=True)
    except Exception as e:
        print(f"[ERROR] Scaling failed: {e}")

def run_monitor():
    current_replicas = MIN_REPLICAS
    while True:
        load = get_active_connections()
        
        target = MIN_REPLICAS
        if load > 6000: target = MAX_REPLICAS
        elif load > 2000: target = 4
        
        if target != current_replicas:
            scale_service(target)
            current_replicas = target
            
        time.sleep(30) # Cooldown period

if __name__ == "__main__":
    print("ASEP Neural Autoscaler Initialized.")
    # run_monitor() - Would be run as a sidecar container in prod
