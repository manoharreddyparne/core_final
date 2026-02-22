import google.generativeai as genai
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings.development')
django.setup()

from django.conf import settings
print("Checking API KEY:", "SET" if settings.GEMINI_API_KEY else "NOT SET")
if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != 'your_gemini_api_key_here':
    genai.configure(api_key=settings.GEMINI_API_KEY)
    try:
        models = genai.list_models()
        print("Available generic models:")
        for m in models:
            if 'generateContent' in m.supported_generation_methods:
                print(m.name)
    except Exception as e:
        print("Error listing models:", e)
else:
    print("DEMO KEY - API key not set")
