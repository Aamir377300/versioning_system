from django.contrib import admin
from .models import Document, DocumentVersion, AuditLog, UserProfile

admin.site.register(UserProfile)
admin.site.register(Document)
admin.site.register(DocumentVersion)
admin.site.register(AuditLog)
