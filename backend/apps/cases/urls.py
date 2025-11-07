"""
Stub URL configuration for cases app.

STANDALONE MODE: No routes exposed - cases are auto-created from FIR numbers.
"""
from django.urls import path

urlpatterns = [
    # No routes in standalone mode - FIR is a text input now
]
