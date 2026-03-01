from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.cache import cache
from .models import LandingContent, TeamMember

CACHE_KEY = "auip:landing_content"


@receiver(post_save, sender=LandingContent)
def bust_landing_cache_on_content(sender, instance, **kwargs):
    cache.delete(CACHE_KEY)


@receiver(post_save, sender=TeamMember)
def bust_landing_cache_on_team(sender, instance, **kwargs):
    cache.delete(CACHE_KEY)
