
"""
URL configuration for secure_exam project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    # Admin site
    path('admin/', admin.site.urls),

    # Users API (login, logout, profile, password management, bulk-create, social login)
    path('api/users/', include('apps.identity.urls')),

    # Courses and batches
    path('api/courses/', include('apps.academic.urls')),

    # Unified Exams System (Mock Tests & Online Exams)
    path('api/exams/', include('apps.exams.urls')),

    # Projects & Research repository
    path('api/projects/', include('apps.projects.urls')),



    # Optional dj-rest-auth endpoints (token refresh, login/logout fallback)
    path('api/auth/', include('dj_rest_auth.urls')),

    # Institution Selector (Public)
    path('api/v1/institutions/', include('apps.auip_tenant.urls')),

    # Institution Isolated API (auth, data)
    path('api/institution/', include('apps.auip_institution.urls')),

    # Placement Management (Isolated)
    path('api/placement/', include('apps.placement.urls')),

    # Notifications & Communication (Isolated)
    path('api/notifications/', include('apps.notifications.urls')),

    # Governance (Isolated)
    path('api/governance/', include('apps.governance.urls')),

    # Intelligence & AI (Isolated)
    path('api/intelligence/', include('apps.intelligence.urls')),

    # Social & Personalization (Isolated)
    path('api/social/', include('apps.social.urls')),

    # ChatHub & Recruitment Communication (Isolated)
    path('api/chathub/', include('apps.chathub.urls')),

    # Resume Builder Hub (Isolated)
    path('api/resumes/', include('apps.resumes.urls')),

    # Site Config / CMS (Public — Landing page content)
    path('api/users/public/', include('apps.site_config.urls')),
]

# -----------------------------
# STATIC & MEDIA (Development Only)
# -----------------------------
from django.conf import settings
from django.conf.urls.static import static

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
