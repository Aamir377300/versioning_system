import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.contrib.auth.models import User
from api.models import UserProfile, Document, DocumentVersion

if not User.objects.filter(username='admin_user').exists():
    user = User.objects.create_superuser('admin_user', 'admin@local.com', 'password123')
    UserProfile.objects.create(user=user, role='ADMIN')
    
    doc = Document.objects.create(title="API Versioning Specifications", owner=user)
    DocumentVersion.objects.create(
        document=doc, 
        author=user, 
        content="Welcome to the Document Versioning API.", 
        change_notes="Seed document created."
    )
    print("Database successfully seeded! User: admin_user | Password: password123")
else:
    print("Seed already exists.")
