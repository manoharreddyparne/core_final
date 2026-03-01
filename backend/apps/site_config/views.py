from django.core.cache import cache
from django.http import JsonResponse
from django.views import View
from .models import LandingContent, TeamMember

CACHE_KEY = "auip:landing_content"
CACHE_TTL = 300  # 5 minutes


class LandingContentView(View):
    """
    GET /api/users/public/site-config/
    Public endpoint — no auth required.
    Response is Redis-cached for 5 minutes.
    Cache is automatically busted on any LandingContent or TeamMember save.
    """
    def get(self, request):
        data = cache.get(CACHE_KEY)
        if data is None:
            content      = LandingContent.get()
            team_members = list(TeamMember.objects.filter(is_visible=True).order_by("order", "name"))
            data = content.to_dict(team_members=team_members)
            cache.set(CACHE_KEY, data, CACHE_TTL)
        return JsonResponse({"success": True, "data": data})
