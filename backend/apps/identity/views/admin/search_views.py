import logging
from rest_framework.views import APIView
from rest_framework import permissions
from django.contrib.postgres.search import SearchVector, SearchQuery, SearchRank, TrigramSimilarity
from django.db.models import Value, CharField
from django.db.models.functions import Cast
from apps.identity.models import User
from apps.identity.models.institution import Institution
from apps.identity.utils.response_utils import success_response

logger = logging.getLogger(__name__)

class GlobalAdvancedSearchView(APIView):
    """
    Weighted search across institutions, users, and system navigation.
    Mimics search engine behavior via Postgres Rank & Trigram Similarity (Fuzzy).
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        query_text = request.query_params.get("q", "").strip()
        if not query_text or len(query_text) < 2:
            return success_response("Query too short", data={"institutions": [], "users": [], "navigation": []})

        user = request.user
        search_query = SearchQuery(query_text)

        # ROLE-BASED ISOLATION
        if user.role == "STUDENT":
            nav_items = [
                {"title": "My Profile", "path": "/profile", "tags": "identity user biography", "type": "page"},
                {"title": "Academic Settings", "path": "/settings/profile", "tags": "security profile email", "type": "config"},
                {"title": "Active Sessions", "path": "/settings/sessions", "tags": "security devices logout", "type": "security"},
            ]
            matched_nav = [
                item for item in nav_items
                if query_text.lower() in item["title"].lower() or any(t in query_text.lower() for t in item["tags"].split())
            ]
            return success_response("Student search results", data={
                "navigation": matched_nav,
                "institutions": [],
                "users": []
            })

        # ADMIN / SUPER_ADMIN Logic
        nav_items = [
            {"title": "Account Settings", "path": "/settings/profile", "tags": "security profile email password identity", "type": "config"},
            {"title": "Device Sessions", "path": "/settings/sessions", "tags": "security devices management logout active browser", "type": "security"},
            {"title": "Security Overview", "path": "/security", "tags": "2fa otp mfa policy lock protection identity verification", "type": "security"},
        ]
        if user.role == "SUPER_ADMIN":
            nav_items.extend([
                {"title": "Institutional Hub", "path": "/superadmin/institutions", "tags": "universities management approval onboarding request manual school college", "type": "admin"},
                {"title": "System Audit Logs", "path": "/admin-dashboard", "tags": "security monitoring forensics history activity track", "type": "admin"},
                {"title": "Global Configuration", "path": "/settings/profile", "tags": "configuration system maintenance defaults preferences", "type": "config"},
            ])
        
        matched_nav = [
            item for item in nav_items
            if query_text.lower() in item["title"].lower() or any(t in query_text.lower() for t in item["tags"].split())
        ]

        # institutions search for admins (Fuzzy + Weighted)
        inst_vector = SearchVector('name', weight='A') + SearchVector('slug', 'domain', weight='B')
        
        # Explicit type casting for trigram similarity to match Postgres 'text' function signature
        search_val = Cast(Value(str(query_text)), output_field=CharField())
        
        institutions = Institution.objects.annotate(
            rank=SearchRank(inst_vector, search_query),
            similarity=TrigramSimilarity('name', search_val)
        ).filter(rank__gte=0.05).order_by('-rank', '-similarity')[:15].values("id", "name", "slug", "domain", "status")

        # user search
        user_vector = SearchVector('first_name', 'last_name', weight='A') + SearchVector('email', 'username', weight='B')
        users = User.objects.annotate(
            rank=SearchRank(user_vector, search_query),
            similarity=TrigramSimilarity('first_name', search_val) + TrigramSimilarity('last_name', search_val)
        ).filter(rank__gte=0.05).order_by('-rank', '-similarity')[:15].values("id", "email", "username", "first_name", "last_name", "role")

        return success_response("Admin search results", data={
            "navigation": matched_nav,
            "institutions": list(institutions),
            "users": list(users)
        })
