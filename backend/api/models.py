from django.db import models
from django.contrib.auth.models import User
import uuid

# User Profile for Global Roles (Admin, Editor, Viewer)
class UserProfile(models.Model):
    ROLE_CHOICES = [
        ('ADMIN', 'Admin'),
        ('EDITOR', 'Editor'),
        ('VIEWER', 'Viewer'),
    ]
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='VIEWER')

    def __str__(self):
        return f"{self.user.username} - {self.role}"

class Document(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="documents")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Soft delete fields
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    
    def __str__(self):
        return self.title


class DocumentVersion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name="versions")
    content = models.TextField()
    author = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="document_versions")
    change_notes = models.CharField(max_length=500, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.document.title} - Version {self.created_at}"


class DocumentAccess(models.Model):
    ROLE_CHOICES = [
        ('EDITOR', 'Editor'),
        ('VIEWER', 'Viewer'),
    ]
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='access_list')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='document_access')
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='VIEWER')
    granted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('document', 'user')

    def __str__(self):
        return f"{self.user.username} -> {self.document.title} ({self.role})"


class AuditLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    document = models.ForeignKey(Document, on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=50) # e.g. "VIEW", "CREATE", "UPDATE", "ROLLBACK", "DELETE", "RECOVER"
    timestamp = models.DateTimeField(auto_now_add=True)
    details = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['-timestamp']
