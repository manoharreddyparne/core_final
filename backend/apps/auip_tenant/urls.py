from django.urls import path
from .views import InstitutionListView

urlpatterns = [
    path('list/', InstitutionListView.as_view(), name='institution-list'),
]
