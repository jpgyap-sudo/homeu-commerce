# Suggested Admin File Structure

app/(admin)/admin/layout.tsx
app/(admin)/admin/page.tsx
components/admin/AdminShell.tsx
components/admin/AdminSidebar.tsx
components/admin/AdminTopbar.tsx
components/admin/DashboardMetricCard.tsx
components/admin/RecentRFQsTable.tsx
components/admin/AISuggestionsPanel.tsx
components/admin/StatusBadge.tsx

For admin customization, build custom views/components within the Next.js app router rather than modifying core framework files.
