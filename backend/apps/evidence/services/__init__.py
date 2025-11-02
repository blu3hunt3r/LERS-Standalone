"""
Feature 1 (Phase 5): Evidence Service Layer

Clean Architecture service layer for evidence management.

Services:
- EvidenceService: Evidence file lifecycle management
- CustodyService: Chain-of-custody operations
- CourtBundleService: Court bundle management

This separates business logic from HTTP layer for:
- Testability (no HTTP mocking needed)
- Reusability (use from views, tasks, commands)
- Maintainability (single responsibility)
"""

from .evidence_service import EvidenceService
from .custody_service import CustodyService
from .court_bundle_service import CourtBundleService

__all__ = [
    'EvidenceService',
    'CustodyService',
    'CourtBundleService',
]
