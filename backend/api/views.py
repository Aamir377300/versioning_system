import difflib
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.core.cache import cache
from django.contrib.auth.models import User

from .models import Document, DocumentVersion, AuditLog, UserProfile, DocumentAccess
from .serializers import DocumentSerializer, DocumentVersionSerializer, DocumentAccessSerializer
from .permissions import IsAdminOrEditor, IsAdminOnly, DocumentAccessPermission

def log_audit(user, document, action_type, details=""):
    AuditLog.objects.create(
        user=user if user.is_authenticated else None,
        document=document,
        action=action_type,
        details=details
    )

@api_view(['GET'])
def health_check(request):
    return Response({"status": "healthy"})


@api_view(['GET'])
def list_users(request):
    """Return all registered usernames for the share panel. Authenticated users only."""
    if not request.user.is_authenticated:
        return Response(status=status.HTTP_401_UNAUTHORIZED)
    users = User.objects.exclude(id=request.user.id).values('id', 'username')
    return Response(list(users))

class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        role = request.data.get('role', 'VIEWER')

        if not username or not password:
            return Response({'error': 'Please provide username and password.'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username=username).exists():
            return Response({'error': 'Username already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(username=username, password=password)
        UserProfile.objects.create(user=user, role=role)
        return Response({'success': 'User registered successfully!'}, status=status.HTTP_201_CREATED)


class DocumentViewSet(viewsets.ModelViewSet):
    serializer_class = DocumentSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrEditor]

    def get_queryset(self):
        user = self.request.user
        profile = getattr(user, 'profile', None)

        # Global admins see everything
        if profile and profile.role == 'ADMIN':
            return Document.objects.filter(is_deleted=False).order_by('-updated_at')

        # Others see only documents they own or have been explicitly granted access to
        owned = Document.objects.filter(is_deleted=False, owner=user)
        shared_ids = DocumentAccess.objects.filter(user=user).values_list('document_id', flat=True)
        shared = Document.objects.filter(is_deleted=False, id__in=shared_ids)

        return (owned | shared).distinct().order_by('-updated_at')

    def get_object(self):
        obj = get_object_or_404(Document, pk=self.kwargs['pk'])
        self.check_object_permissions(self.request, obj)
        return obj

    def get_permissions(self):
        # Add object-level permission check for all detail actions
        return [permissions.IsAuthenticated(), IsAdminOrEditor(), DocumentAccessPermission()]

    def perform_create(self, serializer):
        document = serializer.save(owner=self.request.user)
        log_audit(self.request.user, document, "CREATE", f"Document created: {document.id}")

    def perform_update(self, serializer):
        document = serializer.save()
        log_audit(self.request.user, document, "UPDATE", "Document updated")
        cache.delete(f'document_{document.id}')

    def retrieve(self, request, *args, **kwargs):
        document = self.get_object()
        cache_key = f'document_{document.id}'
        data = cache.get(cache_key)

        if not data:
            serializer = self.get_serializer(document)
            data = serializer.data
            cache.set(cache_key, data, timeout=300)

        log_audit(request.user, document, "VIEW", "Document retrieved")
        return Response(data)

    def destroy(self, request, *args, **kwargs):
        document = self.get_object()
        document.is_deleted = True
        document.deleted_at = timezone.now()
        document.save()
        log_audit(request.user, document, "SOFT_DELETE", "Document softly deleted")
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'])
    def recover(self, request, pk=None):
        document = get_object_or_404(Document, pk=pk)
        if not document.is_deleted:
            return Response({"error": "Document is not deleted."}, status=status.HTTP_400_BAD_REQUEST)
        document.is_deleted = False
        document.deleted_at = None
        document.save()
        log_audit(request.user, document, "RECOVER", "Document recovered from soft delete")
        return Response({"status": "Document recovered successfully."})

    @action(detail=True, methods=['get'])
    def versions(self, request, pk=None):
        document = self.get_object()
        versions = document.versions.all()
        page = self.paginate_queryset(versions)
        if page is not None:
            serializer = DocumentVersionSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = DocumentVersionSerializer(versions, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='versions/(?P<version_id>[^/.]+)')
    def specific_version(self, request, pk=None, version_id=None):
        document = self.get_object()
        version = get_object_or_404(DocumentVersion, pk=version_id, document=document)
        serializer = DocumentVersionSerializer(version)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def compare(self, request, pk=None):
        document = self.get_object()
        v1_id = request.query_params.get('v1')
        v2_id = request.query_params.get('v2')

        if not v1_id or not v2_id:
            return Response({"error": "Please provide both v1 and v2 query parameters."}, status=status.HTTP_400_BAD_REQUEST)

        version1 = get_object_or_404(DocumentVersion, pk=v1_id, document=document)
        version2 = get_object_or_404(DocumentVersion, pk=v2_id, document=document)

        diff = difflib.unified_diff(
            version1.content.splitlines(),
            version2.content.splitlines(),
            fromfile=f'Version {version1.id}',
            tofile=f'Version {version2.id}',
            lineterm=''
        )

        log_audit(request.user, document, "COMPARE", f"Compared {v1_id} with {v2_id}")
        return Response({"diff": '\n'.join(diff)})

    @action(detail=True, methods=['post'])
    def rollback(self, request, pk=None):
        document = self.get_object()
        version_id = request.data.get('version_id')

        if not version_id:
            return Response({"error": "Please provide a version_id to rollback to."}, status=status.HTTP_400_BAD_REQUEST)

        version = get_object_or_404(DocumentVersion, pk=version_id, document=document)
        new_version = DocumentVersion.objects.create(
            document=document,
            content=version.content,
            author=request.user,
            change_notes=f"Rollback to version {version.id}"
        )

        log_audit(request.user, document, "ROLLBACK", f"Rolled back to version {version.id}")
        cache.delete(f'document_{document.id}')

        return Response({
            "status": "Rolled back successfully.",
            "version": DocumentVersionSerializer(new_version).data
        })

    # ── Sharing ──────────────────────────────────────────────────────────────

    @action(detail=True, methods=['get'], url_path='access')
    def list_access(self, request, pk=None):
        """List all users who have access to this document."""
        document = self.get_object()
        access_list = DocumentAccess.objects.filter(document=document)
        serializer = DocumentAccessSerializer(access_list, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='share')
    def share(self, request, pk=None):
        """Grant a user access to this document. Only the owner or admin can share."""
        document = self.get_object()

        # Only owner or global admin can share
        profile = getattr(request.user, 'profile', None)
        if document.owner != request.user and not (profile and profile.role == 'ADMIN'):
            return Response({"error": "Only the document owner can share this document."}, status=status.HTTP_403_FORBIDDEN)

        username = request.data.get('username')
        role = request.data.get('role', 'VIEWER')

        if not username:
            return Response({"error": "Please provide a username."}, status=status.HTTP_400_BAD_REQUEST)

        if role not in ['VIEWER', 'EDITOR']:
            return Response({"error": "Role must be VIEWER or EDITOR."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            target_user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({"error": f"User '{username}' not found."}, status=status.HTTP_404_NOT_FOUND)

        if target_user == document.owner:
            return Response({"error": "Cannot share with the document owner — they already have full access."}, status=status.HTTP_400_BAD_REQUEST)

        access, created = DocumentAccess.objects.update_or_create(
            document=document,
            user=target_user,
            defaults={'role': role}
        )

        action_label = "SHARE_GRANTED" if created else "SHARE_UPDATED"
        log_audit(request.user, document, action_label, f"Access {role} granted to {username}")
        cache.delete(f'document_{document.id}')

        return Response({
            "status": "Access granted." if created else "Access updated.",
            "username": username,
            "role": role
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='unshare')
    def unshare(self, request, pk=None):
        """Revoke a user's access to this document."""
        document = self.get_object()

        profile = getattr(request.user, 'profile', None)
        if document.owner != request.user and not (profile and profile.role == 'ADMIN'):
            return Response({"error": "Only the document owner can revoke access."}, status=status.HTTP_403_FORBIDDEN)

        username = request.data.get('username')
        if not username:
            return Response({"error": "Please provide a username."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            target_user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({"error": f"User '{username}' not found."}, status=status.HTTP_404_NOT_FOUND)

        deleted, _ = DocumentAccess.objects.filter(document=document, user=target_user).delete()
        if not deleted:
            return Response({"error": "This user does not have access to this document."}, status=status.HTTP_404_NOT_FOUND)

        log_audit(request.user, document, "SHARE_REVOKED", f"Access revoked from {username}")
        cache.delete(f'document_{document.id}')

        return Response({"status": f"Access revoked from {username}."})
