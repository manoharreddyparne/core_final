
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
# secure_exam/urls.py
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    # Admin site
    path('admin/', admin.site.urls),

    # Users API (login, logout, profile, password management, bulk-create, social login)
    path('api/users/', include('apps.identity.urls')),

    # Courses and batches
    path('api/courses/', include('apps.academic.urls')),

    # Quizzes, questions, options
    path('api/quizzes/', include('apps.quizzes.urls')),

    # Quiz attempts
    path('api/attempts/', include('apps.attempts.urls')),

    # Optional dj-rest-auth endpoints (token refresh, login/logout fallback)
    path('api/auth/', include('dj_rest_auth.urls')),
]
