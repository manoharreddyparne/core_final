import os
import sys
import django
import redis

# Add project root to path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(BASE_DIR)

# Correct Settings Module
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "auip_core.settings")
django.setup()

from django.conf import settings
from django.core.cache import cache

# Try to import django_redis if available, otherwise fallback to cache
try:
    from django_redis import get_redis_connection
    HAS_REDIS_CLIENT = True
except ImportError:
    HAS_REDIS_CLIENT = False

def clear_lockout():
    print("Starting AGGRESSIVE Clearance (Venv Mode)...")
    
    # Check for redis client availability inside function to avoid scope issues
    has_redis = False
    try:
        from django_redis import get_redis_connection
        has_redis = True
    except ImportError:
        pass

    # Standard targets
    ips_to_clear = ["127.0.0.1", "localhost", "::1", "172.18.0.1", "172.17.0.1"]
    
    if has_redis:
        try:
            con = get_redis_connection("default")
            print("Scanning Redis for ANY blocked IPs...")
            
            # Wildcard scan
            keys = con.keys("*:sec:ip_block_v2:*")
            if not keys:
                keys = con.keys("sec:ip_block_v2:*")
            
            if keys:
                print(f"Found {len(keys)} active blocks. FLUSHING them all...")
                for k in keys:
                    con.delete(k)
                    print(f"   -> Deleted {k}")
            else:
                print("Direct Redis scan found no keys matching 'sec:ip_block_v2:*'")

            # Failures
            fail_keys = con.keys("*:sec:ip_fail_v2:*")
            if fail_keys:
                print(f"Found {len(fail_keys)} failure counters. FLUSHING...")
                for k in fail_keys:
                    con.delete(k)
        except Exception as e:
            print(f"Redis client error: {e}")
            has_redis = False # Fallback

    if not has_redis:
        print("Using Django Cache Fallback (Specific IPs only)...")
        for ip in ips_to_clear:
            block_key = f"sec:ip_block_v2:{ip}"
            fail_key = f"sec:ip_fail_v2:{ip}"
            
            cache.delete(block_key)
            cache.delete(fail_key)
            print(f"   -> Attempted delete for {ip}")

    print("\nSYSTEM UNLOCKED. Please wait 5s and try again.")

if __name__ == "__main__":
    clear_lockout()
