export type ComposioApp = {
  name: string;
  slug: string;
  logo?: string;
  categories?: string[];
};

export type ComposioTool = {
  name?: string;
  slug?: string;
  description?: string;
  function?: { name: string; description: string };
};

export type ConnectionInfo = {
  id?: string;
  toolkit?: { slug: string };
  status?: string;
  createdAt?: string;
  updatedAt?: string;
};

export const CATEGORY_MAP: Record<string, string> = {
  "developer-tools": "Dev Tools",
  communication: "Communication",
  crm: "CRM",
  productivity: "Productivity",
  "project-management": "Project Management",
  marketing: "Marketing",
  sales: "Sales",
  finance: "Finance",
  hr: "HR",
  support: "Support",
  storage: "Storage",
  "social-media": "Social Media",
};

export function getCategory(app: ComposioApp): string {
  if (app.categories && app.categories.length > 0) {
    return CATEGORY_MAP[app.categories[0]] ?? app.categories[0];
  }
  return "Other";
}
