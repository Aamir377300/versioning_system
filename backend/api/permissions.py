from rest_framework.permissions import BasePermission
from .models import DocumentAccess

class IsAdminOrEditor(BasePermission):
    """
    Global role check — Admins and Editors can write, Viewers are read-only.
    Object-level access is enforced separately via DocumentAccessPermission.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return True
        profile = getattr(request.user, 'profile', None)
        if profile and profile.role in ['ADMIN', 'EDITOR']:
            return True
        return False


class IsAdminOnly(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        profile = getattr(request.user, 'profile', None)
        return profile and profile.role == 'ADMIN'


class DocumentAccessPermission(BasePermission):
    """
    Object-level permission:
    - Document owner always has full access.
    - Global ADMIN always has full access.
    - Other users must have an explicit DocumentAccess entry.
    - VIEWER access entries are read-only.
    """
    def has_object_permission(self, request, view, obj):
        user = request.user

        # Owner has full access
        if obj.owner == user:
            return True

        # Global admin has full access
        profile = getattr(user, 'profile', None)
        if profile and profile.role == 'ADMIN':
            return True

        # Check explicit per-document access
        try:
            access = DocumentAccess.objects.get(document=obj, user=user)
        except DocumentAccess.DoesNotExist:
            return False

        # VIEWER can only read
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return True

        # EDITOR can write
        return access.role == 'EDITOR'
