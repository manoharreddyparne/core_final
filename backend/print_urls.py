
import os
import django
from django.conf import settings
from django.urls import get_resolver

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings.development')
django.setup()

urlconf = settings.ROOT_URLCONF
resolver = get_resolver(urlconf)

def print_urls(resolver, prefix=''):
    for pattern in resolver.url_patterns:
        if hasattr(pattern, 'url_patterns'):
            # It's an include()
            print_urls(pattern, prefix + str(pattern.pattern))
        else:
            # It's a view
            full_path = prefix + str(pattern.pattern)
            print(full_path)

print("Listing all registered URLs:")
print_urls(resolver)
