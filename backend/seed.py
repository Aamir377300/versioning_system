import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.contrib.auth.models import User
from api.models import UserProfile, Document, DocumentVersion

username = os.environ.get('ADMIN_USERNAME', 'admin_user')
password = os.environ.get('ADMIN_PASSWORD', 'password123')
email    = os.environ.get('ADMIN_EMAIL', 'admin@local.com')

if not User.objects.filter(username=username).exists():
    user = User.objects.create_superuser(username, email, password)
    UserProfile.objects.create(user=user, role='ADMIN')

    doc = Document.objects.create(title="API Versioning Specifications", owner=user)
    DocumentVersion.objects.create(
        document=doc,
        author=user,
        content="Welcome to the Document Versioning API.",
        change_notes="Seed document created."
    )
    print(f"Database seeded! User: {username}")
else:
    print("Seed already exists.")
