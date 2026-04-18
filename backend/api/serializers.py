from rest_framework import serializers
from .models import Document, DocumentVersion, DocumentAccess
from django.contrib.auth.models import User

class DocumentAccessSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = DocumentAccess
        fields = ['id', 'username', 'role', 'granted_at']


class DocumentVersionSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.username', read_only=True)

    class Meta:
        model = DocumentVersion
        fields = ['id', 'document', 'content', 'author', 'author_name', 'change_notes', 'created_at']
        read_only_fields = ['id', 'created_at', 'author']


class DocumentSerializer(serializers.ModelSerializer):
    owner_name = serializers.CharField(source='owner.username', read_only=True)
    versions = DocumentVersionSerializer(many=True, read_only=True)
    
    # We allow content and change notes when creating or updating a document
    content = serializers.CharField(write_only=True, required=False)
    change_notes = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Document
        fields = ['id', 'title', 'owner', 'owner_name', 'created_at', 'updated_at', 'versions', 'content', 'change_notes']
        read_only_fields = ['id', 'created_at', 'updated_at', 'owner']

    def create(self, validated_data):
        content = validated_data.pop('content', '')
        change_notes = validated_data.pop('change_notes', 'Initial creation')
        
        # User is automatically filled in by view's perform_create
        document = Document.objects.create(**validated_data)
        
        # Auto-create the first version
        DocumentVersion.objects.create(
            document=document,
            content=content,
            author=document.owner,
            change_notes=change_notes
        )
        return document

    def update(self, instance, validated_data):
        content = validated_data.pop('content', None)
        change_notes = validated_data.pop('change_notes', 'Updated generic')
        
        # Allow updating title
        instance.title = validated_data.get('title', instance.title)
        instance.save()
        
        # Auto-create new version if content is provided
        if content is not None:
            user = self.context['request'].user
            DocumentVersion.objects.create(
                document=instance,
                content=content,
                author=user,
                change_notes=change_notes
            )
        return instance
