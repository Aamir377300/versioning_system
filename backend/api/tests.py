import pytest
from rest_framework.test import APIClient
from django.contrib.auth.models import User
from django.test import override_settings
from .models import Document, DocumentVersion, UserProfile, AuditLog

@pytest.fixture(autouse=True)
def disable_redis_cache():
    with override_settings(CACHES={'default': {'BACKEND': 'django.core.cache.backends.dummy.DummyCache'}}):
        yield

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def create_user(db):
    def make_user(username, role='VIEWER'):
        user = User.objects.create_user(username=username, password='password123')
        UserProfile.objects.create(user=user, role=role)
        return user
    return make_user

@pytest.mark.django_db
def test_create_document_admin(api_client, create_user):
    # Setup
    admin_user = create_user('admin_user', 'ADMIN')
    api_client.force_authenticate(user=admin_user)
    
    # Act
    payload = {'title': 'Project Spec', 'content': 'Initial Draft Content'}
    response = api_client.post('/api/documents/', payload)
    
    # Assert
    assert response.status_code == 201
    assert Document.objects.count() == 1
    assert DocumentVersion.objects.count() == 1
    
    doc = Document.objects.first()
    assert doc.title == 'Project Spec'
    assert doc.owner == admin_user
    
    # Audit log should be updated
    assert AuditLog.objects.filter(action='CREATE').count() == 1

@pytest.mark.django_db
def test_create_document_viewer_denied(api_client, create_user):
    viewer_user = create_user('basic_viewer', 'VIEWER')
    api_client.force_authenticate(user=viewer_user)
    
    payload = {'title': 'Hacked Spec', 'content': 'Malicious Content'}
    response = api_client.post('/api/documents/', payload)
    
    assert response.status_code == 403
    assert Document.objects.count() == 0

@pytest.mark.django_db
def test_version_compare_endpoint(api_client, create_user):
    admin_user = create_user('admin2', 'ADMIN')
    api_client.force_authenticate(user=admin_user)
    
    # Create doc
    response = api_client.post('/api/documents/', {'title': 'Doc A', 'content': 'Line 1'})
    doc_id = response.data['id']
    v1_id = response.data['versions'][0]['id']
    
    # Update doc
    change_response = api_client.put(f'/api/documents/{doc_id}/', {'title': 'Doc A', 'content': 'Line 1\nLine 2'})
    v2_id = change_response.data['versions'][0]['id'] # Latest version is index 0
    v1_id = change_response.data['versions'][1]['id'] # Old version is index 1
    
    compare_response = api_client.get(f'/api/documents/{doc_id}/compare/?v1={v1_id}&v2={v2_id}')
    assert compare_response.status_code == 200
    assert "Line 2" in compare_response.data['diff']
