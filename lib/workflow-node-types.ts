import type { ElementType } from "react";
import {
  Play, Webhook, ArrowRightLeft, Calendar, Plus, PenSquare,
  Mail, MessageSquare, Globe, CreditCard, FileEdit,
  Sparkles, FileText, Tags, Database,
  GitBranch, Clock, Repeat, Puzzle,
} from "lucide-react";

export type NodeCategory = "trigger" | "action" | "ai" | "logic";

export type NodeSubtype =
  | "manual" | "webhook" | "card_created" | "card_moved" | "card_updated" | "schedule"
  | "send_email" | "send_slack" | "http_request" | "create_card" | "update_card"
  | "ai_generate" | "ai_summarize" | "ai_classify" | "ai_extract"
  | "if_else" | "delay" | "loop"
  | "composio_action";

export type ConfigFieldDef = {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "select" | "switch" | "slider" | "keyvalue";
  placeholder?: string;
  options?: { label: string; value: string }[];
  defaultValue?: unknown;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
};

export type NodeTypeDefinition = {
  subtype: NodeSubtype;
  category: NodeCategory;
  label: string;
  description: string;
  icon: ElementType;
  defaultConfig: Record<string, unknown>;
  configFields: ConfigFieldDef[];
};

export const NODE_TYPE_REGISTRY: Record<NodeSubtype, NodeTypeDefinition> = {
  // Triggers
  manual: {
    subtype: "manual",
    category: "trigger",
    label: "Manual Trigger",
    description: "Start workflow manually",
    icon: Play,
    defaultConfig: { triggerType: "MANUAL" },
    configFields: [],
  },
  webhook: {
    subtype: "webhook",
    category: "trigger",
    label: "Webhook",
    description: "Trigger via HTTP webhook",
    icon: Webhook,
    defaultConfig: { triggerType: "WEBHOOK", webhookUrl: "" },
    configFields: [
      { key: "webhookUrl", label: "Webhook URL", type: "text", placeholder: "Auto-generated on save" },
    ],
  },
  card_created: {
    subtype: "card_created",
    category: "trigger",
    label: "Card Created",
    description: "When a new card is created",
    icon: Plus,
    defaultConfig: { triggerType: "CARD_CREATED" },
    configFields: [],
  },
  card_moved: {
    subtype: "card_moved",
    category: "trigger",
    label: "Card Moved",
    description: "When a card changes columns",
    icon: ArrowRightLeft,
    defaultConfig: { triggerType: "CARD_MOVED", fromColumn: "", toColumn: "" },
    configFields: [
      { key: "fromColumn", label: "From Column", type: "text", placeholder: "Any column" },
      { key: "toColumn", label: "To Column", type: "text", placeholder: "Any column" },
    ],
  },
  card_updated: {
    subtype: "card_updated",
    category: "trigger",
    label: "Card Updated",
    description: "When a card is updated",
    icon: PenSquare,
    defaultConfig: { triggerType: "CARD_UPDATED" },
    configFields: [],
  },
  schedule: {
    subtype: "schedule",
    category: "trigger",
    label: "Schedule",
    description: "Run on a cron schedule",
    icon: Calendar,
    defaultConfig: { triggerType: "SCHEDULE", cron: "0 9 * * *" },
    configFields: [
      { key: "cron", label: "Cron Expression", type: "text", placeholder: "0 9 * * *", required: true },
    ],
  },

  // Actions
  send_email: {
    subtype: "send_email",
    category: "action",
    label: "Send Email",
    description: "Send an email",
    icon: Mail,
    defaultConfig: { to: "", subject: "", body: "" },
    configFields: [
      { key: "to", label: "To", type: "text", placeholder: "recipient@example.com", required: true },
      { key: "subject", label: "Subject", type: "text", placeholder: "Email subject", required: true },
      { key: "body", label: "Body", type: "textarea", placeholder: "Email body..." },
    ],
  },
  send_slack: {
    subtype: "send_slack",
    category: "action",
    label: "Send Slack Message",
    description: "Post to a Slack channel",
    icon: MessageSquare,
    defaultConfig: { channel: "", message: "" },
    configFields: [
      { key: "channel", label: "Channel", type: "text", placeholder: "#general", required: true },
      { key: "message", label: "Message", type: "textarea", placeholder: "Message text..." },
    ],
  },
  http_request: {
    subtype: "http_request",
    category: "action",
    label: "HTTP Request",
    description: "Make an HTTP request",
    icon: Globe,
    defaultConfig: { url: "", method: "GET", headers: "{}", body: "" },
    configFields: [
      { key: "url", label: "URL", type: "text", placeholder: "https://api.example.com", required: true },
      { key: "method", label: "Method", type: "select", options: [
        { label: "GET", value: "GET" }, { label: "POST", value: "POST" },
        { label: "PUT", value: "PUT" }, { label: "PATCH", value: "PATCH" },
        { label: "DELETE", value: "DELETE" },
      ] },
      { key: "headers", label: "Headers", type: "keyvalue", placeholder: "Header value" },
      { key: "body", label: "Body", type: "textarea", placeholder: "Request body..." },
    ],
  },
  create_card: {
    subtype: "create_card",
    category: "action",
    label: "Create Card",
    description: "Create a new card on a board",
    icon: CreditCard,
    defaultConfig: { boardId: "", columnId: "", title: "", description: "" },
    configFields: [
      { key: "boardId", label: "Board ID", type: "text", placeholder: "Board ID" },
      { key: "columnId", label: "Column ID", type: "text", placeholder: "Column ID" },
      { key: "title", label: "Card Title", type: "text", required: true },
      { key: "description", label: "Description", type: "textarea" },
    ],
  },
  update_card: {
    subtype: "update_card",
    category: "action",
    label: "Update Card",
    description: "Update an existing card",
    icon: FileEdit,
    defaultConfig: { cardId: "", title: "", description: "", columnId: "", assigneeId: "", priority: "" },
    configFields: [
      { key: "cardId", label: "Card ID", type: "text", placeholder: "{{steps.trigger.output.cardId}}" },
      { key: "title", label: "New Title", type: "text" },
      { key: "description", label: "New Description", type: "textarea" },
      { key: "columnId", label: "Move to Column", type: "text", placeholder: "Column ID" },
      { key: "assigneeId", label: "Set Assignee", type: "text", placeholder: "User ID" },
      { key: "priority", label: "Priority", type: "select", options: [
        { label: "None", value: "" }, { label: "Low", value: "low" },
        { label: "Medium", value: "medium" }, { label: "High", value: "high" },
      ] },
    ],
  },

  // AI
  ai_generate: {
    subtype: "ai_generate",
    category: "ai",
    label: "Generate Text",
    description: "Generate text using AI",
    icon: Sparkles,
    defaultConfig: { prompt: "", model: "gpt-4o-mini", temperature: 0.7 },
    configFields: [
      { key: "prompt", label: "Prompt", type: "textarea", placeholder: "Enter your prompt... Use {{steps.nodeName.output}} for variables", required: true },
      { key: "model", label: "Model", type: "select", options: [
        { label: "GPT-4o Mini", value: "gpt-4o-mini" },
        { label: "GPT-4o", value: "gpt-4o" },
        { label: "Claude Sonnet", value: "claude-sonnet-4-20250514" },
      ] },
      { key: "temperature", label: "Temperature", type: "slider", min: 0, max: 2, step: 0.1, defaultValue: 0.7 },
    ],
  },
  ai_summarize: {
    subtype: "ai_summarize",
    category: "ai",
    label: "Summarize",
    description: "Summarize text content",
    icon: FileText,
    defaultConfig: { input: "", maxLength: 200 },
    configFields: [
      { key: "input", label: "Input Text", type: "textarea", placeholder: "Text to summarize or {{steps.nodeName.output}}" },
      { key: "maxLength", label: "Max Length", type: "number", defaultValue: 200 },
    ],
  },
  ai_classify: {
    subtype: "ai_classify",
    category: "ai",
    label: "Classify",
    description: "Classify content into categories",
    icon: Tags,
    defaultConfig: { input: "", categories: "" },
    configFields: [
      { key: "input", label: "Input Text", type: "textarea", placeholder: "Text to classify..." },
      { key: "categories", label: "Categories", type: "text", placeholder: "bug, feature, question" },
    ],
  },
  ai_extract: {
    subtype: "ai_extract",
    category: "ai",
    label: "Extract Data",
    description: "Extract structured data from text",
    icon: Database,
    defaultConfig: { input: "", schema: "" },
    configFields: [
      { key: "input", label: "Input Text", type: "textarea" },
      { key: "schema", label: "Extraction Schema (JSON)", type: "textarea", placeholder: '{"name": "string", "email": "string"}' },
    ],
  },

  // Logic
  if_else: {
    subtype: "if_else",
    category: "logic",
    label: "If/Else",
    description: "Branch based on a condition",
    icon: GitBranch,
    defaultConfig: { condition: "", operator: "equals", value: "" },
    configFields: [
      { key: "condition", label: "Field / Variable", type: "text", placeholder: "{{steps.nodeName.output}}" },
      { key: "operator", label: "Operator", type: "select", options: [
        { label: "Equals", value: "equals" }, { label: "Not Equals", value: "not_equals" },
        { label: "Contains", value: "contains" }, { label: "Greater Than", value: "gt" },
        { label: "Less Than", value: "lt" },
      ] },
      { key: "value", label: "Value", type: "text", placeholder: "Expected value" },
    ],
  },
  delay: {
    subtype: "delay",
    category: "logic",
    label: "Delay",
    description: "Wait for a duration",
    icon: Clock,
    defaultConfig: { duration: 5, unit: "seconds" },
    configFields: [
      { key: "duration", label: "Duration", type: "number", defaultValue: 5 },
      { key: "unit", label: "Unit", type: "select", options: [
        { label: "Seconds", value: "seconds" }, { label: "Minutes", value: "minutes" },
        { label: "Hours", value: "hours" },
      ] },
    ],
  },
  loop: {
    subtype: "loop",
    category: "logic",
    label: "Loop",
    description: "Repeat actions N times",
    icon: Repeat,
    defaultConfig: { count: 3, variable: "item" },
    configFields: [
      { key: "count", label: "Iterations", type: "number", defaultValue: 3 },
      { key: "variable", label: "Iterator Variable", type: "text", placeholder: "item" },
    ],
  },

  // Composio dynamic action
  composio_action: {
    subtype: "composio_action",
    category: "action",
    label: "Composio Action",
    description: "Run any connected app action",
    icon: Puzzle,
    defaultConfig: { composioApp: "", composioAction: "" },
    configFields: [
      { key: "composioApp", label: "App", type: "text", placeholder: "e.g. github, slack, gmail", required: true },
      { key: "composioAction", label: "Action", type: "text", placeholder: "e.g. GMAIL_SEND_EMAIL", required: true },
    ],
  },
};

export const NODE_CATEGORIES: { key: NodeCategory; label: string; items: NodeTypeDefinition[] }[] = [
  { key: "trigger", label: "Triggers", items: Object.values(NODE_TYPE_REGISTRY).filter(n => n.category === "trigger") },
  { key: "action", label: "Actions", items: Object.values(NODE_TYPE_REGISTRY).filter(n => n.category === "action") },
  { key: "ai", label: "AI", items: Object.values(NODE_TYPE_REGISTRY).filter(n => n.category === "ai") },
  { key: "logic", label: "Logic", items: Object.values(NODE_TYPE_REGISTRY).filter(n => n.category === "logic") },
];

export const CATEGORY_COLORS: Record<NodeCategory, { bg: string; text: string }> = {
  trigger: { bg: "bg-blue-500/10", text: "text-blue-500" },
  action: { bg: "bg-orange-500/10", text: "text-orange-500" },
  ai: { bg: "bg-purple-500/10", text: "text-purple-500" },
  logic: { bg: "bg-green-500/10", text: "text-green-500" },
};
