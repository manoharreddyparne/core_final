import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings')
django.setup()

from apps.identity.models.institution import Institution
from django.utils.text import slugify

def fix_slugs():
    institutions = Institution.objects.filter(slug='') | Institution.objects.filter(slug__isnull=True)
    count = 0
    for inst in institutions:
        new_slug = slugify(inst.name)
        base_slug = new_slug
        counter = 1
        while Institution.objects.filter(slug=new_slug).exclude(id=inst.id).exists():
            new_slug = f"{base_slug}-{counter}"
            counter += 1
        
        inst.slug = new_slug
        inst.save()
        print(f"Fixed: {inst.name} -> {inst.slug}")
        count += 1
    
    print(f"Total fixes: {count}")

if __name__ == "__main__":
    fix_slugs()
