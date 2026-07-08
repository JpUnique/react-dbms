// Single source of truth for the fixed department list — used by
// UserManagement, the admin Departments page, and the registration form.
// Not backed by a database table; adding/renaming a department requires a
// code change here.
export const DEPARTMENTS = [
  'Finance', 'HR', 'Procurement', 'Inventory', 'Project Management',
  'Assets/Maintenance', 'Logistics', 'IT', 'Operations', 'Administration',
] as const;

export type Department = (typeof DEPARTMENTS)[number];
