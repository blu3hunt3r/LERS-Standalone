#!/bin/bash

# Remove case management pages
rm -rf pages/CreateCasePage.tsx
rm -rf pages/CasesPage.tsx
rm -rf pages/UnifiedCaseCommandCenter.tsx
rm -rf pages/DashboardPage.tsx
rm -rf pages/ComplaintIngestionPage.tsx
rm -rf pages/ComplaintReviewPage.tsx

# Remove case-related components
rm -rf components/CaseCommandPane.tsx
rm -rf components/case-tabs/

# Remove investigation components
rm -rf components/CrossStationWidget.tsx
rm -rf components/EntityCardDrawer.tsx
rm -rf components/MergeEntitiesModal.tsx
rm -rf components/RevealPIIModal.tsx
rm -rf components/entities/
rm -rf components/investigation/
rm -rf components/court/

# Remove case service
rm -rf services/caseService.ts
rm -rf services/entityService.ts
rm -rf services/investigationService.ts
rm -rf services/templateService.ts

# Remove investigation features
rm -rf features/investigation/

echo "Cleaned case management files"
