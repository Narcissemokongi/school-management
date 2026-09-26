// src/components/SuperAdmin/sections/PendingSection.jsx
import { PendingTab } from "../PendingTab";

export function PendingSection({
  pendingUsers,
  user,
  searchTerm,
  setSearchTerm,
  filterRole,
  setFilterRole,
}) {
  return (
    <PendingTab
      pendingUsers={pendingUsers}
      user={user}
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      filterRole={filterRole}
      setFilterRole={setFilterRole}
    />
  );
}