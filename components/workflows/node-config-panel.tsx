"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { Trash2, Play, X } from "lucide-react";
import {
  selectedNodeAtom,
  upstreamNodesAtom,
  updateNodeDataAtom,
  updateNodeConfigAtom,
  deleteSelectedNodeAtom,
  selectedNodeIdAtom,
} from "@/lib/workflow-store";
import {
  NODE_TYPE_REGISTRY,
  CATEGORY_COLORS,
  type NodeSubtype,
  type ConfigFieldDef,
} from "@/lib/workflow-node-types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { MinimalTiptapEditor } from "@/components/ui/minimal-tiptap";
import SearchSelect from "@/components/search-select";
import { useDynamicOptions } from "@/hooks/use-dynamic-options";

// Variable autocomplete popover for text/textarea fields
function VariableAutocomplete({
  suggestions,
  onSelect,
  position,
}: {
  suggestions: string[];
  onSelect: (v: string) => void;
  position: { top: number; left: number };
}) {
  if (suggestions.length === 0) return null;
  return (
    <div
      className="absolute z-50 bg-popover border rounded-md shadow-md max-h-32 overflow-y-auto text-sm"
      style={{ top: position.top, left: position.left }}
    >
      {suggestions.map((s) => (
        <button
          key={s}
          type="button"
          className="block w-full text-left px-3 py-1.5 hover:bg-accent truncate"
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(s);
          }}
        >
          {s}
        </button>
      ))}
    </div>
  );
}

function useVariableAutocomplete(
  upstreamNodes: ReturnType<typeof useAtomValue<typeof upstreamNodesAtom>>,
) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [cursorInfo, setCursorInfo] = useState<{
    position: { top: number; left: number };
    replaceStart: number;
    replaceEnd: number;
  } | null>(null);

  const allVariables = useMemo(
    () => upstreamNodes.map(
      (n) => `{{steps.${n.data.label.replace(/\s+/g, "_")}.output}}`
    ),
    [upstreamNodes]
  );

  const handleInput = useCallback(
    (value: string, cursorPos: number, inputEl: HTMLElement) => {
      // Look for {{ pattern before cursor
      const before = value.slice(0, cursorPos);
      const match = before.match(/\{\{([^}]*)$/);
      if (match) {
        const partial = match[1].toLowerCase();
        const filtered = allVariables.filter((v) =>
          v.toLowerCase().includes(partial)
        );
        setFilteredSuggestions(filtered);
        setShowSuggestions(filtered.length > 0);
        const rect = inputEl.getBoundingClientRect();
        const parentRect = inputEl.offsetParent?.getBoundingClientRect() ?? rect;
        setCursorInfo({
          position: {
            top: rect.bottom - parentRect.top + 4,
            left: rect.left - parentRect.left,
          },
          replaceStart: cursorPos - match[0].length,
          replaceEnd: cursorPos,
        });
      } else {
        setShowSuggestions(false);
      }
    },
    [allVariables]
  );

  const insertVariable = useCallback(
    (
      variable: string,
      currentValue: string,
      onChange: (v: string) => void,
    ) => {
      if (!cursorInfo) return;
      const newValue =
        currentValue.slice(0, cursorInfo.replaceStart) +
        variable +
        currentValue.slice(cursorInfo.replaceEnd);
      onChange(newValue);
      setShowSuggestions(false);
    },
    [cursorInfo]
  );

  return {
    showSuggestions,
    filteredSuggestions,
    cursorInfo,
    handleInput,
    insertVariable,
    dismissSuggestions: () => setShowSuggestions(false),
  };
}

type KVPair = { key: string; value: string };

function parseKeyValuePairs(value: unknown): KVPair[] {
  if (!value) return [{ key: "", value: "" }];
  if (typeof value === "string") {
    try {
      const obj = JSON.parse(value);
      if (typeof obj === "object" && obj !== null && !Array.isArray(obj)) {
        const entries = Object.entries(obj) as [string, string][];
        return entries.length > 0
          ? entries.map(([k, v]) => ({ key: k, value: String(v) }))
          : [{ key: "", value: "" }];
      }
    } catch {
      // not valid JSON
    }
  }
  return [{ key: "", value: "" }];
}

function serializeKeyValuePairs(pairs: KVPair[]): string {
  const obj: Record<string, string> = {};
  for (const p of pairs) {
    if (p.key.trim()) obj[p.key.trim()] = p.value;
  }
  return JSON.stringify(obj);
}

function ConfigField({
  field,
  value,
  onChange,
  upstreamNodes,
  nodeConfig,
}: {
  field: ConfigFieldDef;
  value: unknown;
  onChange: (value: unknown) => void;
  upstreamNodes: ReturnType<typeof useAtomValue<typeof upstreamNodesAtom>>;
  nodeConfig?: Record<string, unknown>;
}) {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const autocomplete = useVariableAutocomplete(upstreamNodes);
  const supportsVariables = field.type === "text" || field.type === "textarea" || field.type === "email";
  const strValue = (value as string) ?? "";

  const handleChange = (newVal: string) => {
    onChange(newVal);
    if (supportsVariables && inputRef.current) {
      const cursorPos = inputRef.current.selectionStart ?? newVal.length;
      autocomplete.handleInput(newVal, cursorPos, inputRef.current);
    }
  };

  switch (field.type) {
    case "text":
      return (
        <div className="space-y-1.5 relative">
          <Label htmlFor={field.key}>
            {field.label}
            {field.required && <span className="text-destructive ml-0.5">*</span>}
          </Label>
          <Input
            ref={inputRef as React.Ref<HTMLInputElement>}
            id={field.key}
            value={strValue}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={() => autocomplete.dismissSuggestions()}
            placeholder={field.placeholder}
          />
          {autocomplete.showSuggestions && autocomplete.cursorInfo && (
            <VariableAutocomplete
              suggestions={autocomplete.filteredSuggestions}
              position={autocomplete.cursorInfo.position}
              onSelect={(v) => autocomplete.insertVariable(v, strValue, (nv) => onChange(nv))}
            />
          )}
        </div>
      );
    case "textarea":
      return (
        <div className="space-y-1.5 relative">
          <Label htmlFor={field.key}>
            {field.label}
            {field.required && <span className="text-destructive ml-0.5">*</span>}
          </Label>
          <Textarea
            ref={inputRef as React.Ref<HTMLTextAreaElement>}
            id={field.key}
            value={strValue}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={() => autocomplete.dismissSuggestions()}
            placeholder={field.placeholder}
            rows={3}
          />
          {autocomplete.showSuggestions && autocomplete.cursorInfo && (
            <VariableAutocomplete
              suggestions={autocomplete.filteredSuggestions}
              position={autocomplete.cursorInfo.position}
              onSelect={(v) => autocomplete.insertVariable(v, strValue, (nv) => onChange(nv))}
            />
          )}
        </div>
      );
    case "number":
      return (
        <div className="space-y-1.5">
          <Label htmlFor={field.key}>{field.label}</Label>
          <Input
            id={field.key}
            type="number"
            step="any"
            value={(value as number) ?? field.defaultValue ?? 0}
            onChange={(e) => onChange(Number(e.target.value))}
          />
        </div>
      );
    case "select":
      return (
        <div className="space-y-1.5">
          <Label>{field.label}</Label>
          <Select value={(value as string) ?? ""} onValueChange={(v) => onChange(v)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={field.placeholder ?? "Select..."} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    case "switch":
      return (
        <div className="flex items-center justify-between">
          <Label htmlFor={field.key}>{field.label}</Label>
          <Switch
            id={field.key}
            checked={!!value}
            onCheckedChange={(v) => onChange(v)}
          />
        </div>
      );
    case "slider": {
      const numValue = (value as number) ?? (field.defaultValue as number) ?? 0;
      return (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor={field.key}>{field.label}</Label>
            <span className="text-xs text-muted-foreground tabular-nums">{numValue}</span>
          </div>
          <Slider
            id={field.key}
            value={[numValue]}
            min={field.min ?? 0}
            max={field.max ?? 1}
            step={field.step ?? 0.1}
            onValueChange={([v]) => onChange(v)}
          />
        </div>
      );
    }
    case "keyvalue": {
      const pairs = parseKeyValuePairs(value);
      return (
        <div className="space-y-1.5">
          <Label>{field.label}</Label>
          <div className="space-y-2">
            {pairs.map((pair, i) => (
              <div key={i} className="flex gap-1.5">
                <Input
                  value={pair.key}
                  onChange={(e) => {
                    const updated = [...pairs];
                    updated[i] = { ...pair, key: e.target.value };
                    onChange(serializeKeyValuePairs(updated));
                  }}
                  placeholder="Key"
                  className="flex-1"
                />
                <Input
                  value={pair.value}
                  onChange={(e) => {
                    const updated = [...pairs];
                    updated[i] = { ...pair, value: e.target.value };
                    onChange(serializeKeyValuePairs(updated));
                  }}
                  placeholder={field.placeholder ?? "Value"}
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 h-9 w-9"
                  onClick={() => {
                    const updated = pairs.filter((_, j) => j !== i);
                    onChange(serializeKeyValuePairs(updated));
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                onChange(serializeKeyValuePairs([...pairs, { key: "", value: "" }]));
              }}
            >
              + Add pair
            </Button>
          </div>
        </div>
      );
    }
    case "email": {
      const hasVariable = strValue.includes("{{");
      const isValidEmail = !strValue || hasVariable || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(strValue);
      return (
        <div className="space-y-1.5 relative">
          <Label htmlFor={field.key}>
            {field.label}
            {field.required && <span className="text-destructive ml-0.5">*</span>}
          </Label>
          <Input
            ref={inputRef as React.Ref<HTMLInputElement>}
            id={field.key}
            value={strValue}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={() => autocomplete.dismissSuggestions()}
            placeholder={field.placeholder}
            className={!isValidEmail ? "border-destructive" : ""}
          />
          {!isValidEmail && (
            <p className="text-xs text-destructive">Enter a valid email address</p>
          )}
          {autocomplete.showSuggestions && autocomplete.cursorInfo && (
            <VariableAutocomplete
              suggestions={autocomplete.filteredSuggestions}
              position={autocomplete.cursorInfo.position}
              onSelect={(v) => autocomplete.insertVariable(v, strValue, (nv) => onChange(nv))}
            />
          )}
        </div>
      );
    }
    case "richtext":
      return (
        <div className="space-y-1.5">
          <Label>{field.label}</Label>
          <MinimalTiptapEditor
            value={strValue}
            onChange={(content) => onChange(content)}
            output="html"
            placeholder={field.placeholder}
            className="min-h-[120px] max-h-[200px]"
            editorContentClassName="p-2 text-sm"
            immediatelyRender={false}
          />
        </div>
      );
    case "dynamic_select":
      return (
        <DynamicSelectField
          field={field}
          value={value}
          onChange={onChange}
          nodeConfig={nodeConfig}
        />
      );
    default:
      return null;
  }
}

function DynamicSelectField({
  field,
  value,
  onChange,
  nodeConfig,
}: {
  field: ConfigFieldDef;
  value: unknown;
  onChange: (value: unknown) => void;
  nodeConfig?: Record<string, unknown>;
}) {
  const dependsOnValue = field.dependsOn
    ? (nodeConfig?.[field.dependsOn] as string | undefined)
    : undefined;

  const { options, isLoading } = useDynamicOptions(
    field.dataSource,
    field.dependsOn ? dependsOnValue : undefined,
  );

  // Clear value when the parent dependency changes
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const valueRef = useRef(value);
  valueRef.current = value;
  const prevDependsOnRef = useRef(dependsOnValue);
  useEffect(() => {
    if (field.dependsOn && prevDependsOnRef.current !== dependsOnValue) {
      prevDependsOnRef.current = dependsOnValue;
      if (valueRef.current) onChangeRef.current("");
    }
  }, [dependsOnValue, field.dependsOn]);

  if (isLoading) {
    return (
      <div className="space-y-1.5">
        <Label>
          {field.label}
          {field.required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
        <div className="h-9 flex items-center text-xs text-muted-foreground px-3 border rounded-md">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label>
        {field.label}
        {field.required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      <SearchSelect
        options={options}
        value={(value as string) ?? ""}
        onChange={(v) => onChange(v)}
        placeholder={field.placeholder ?? "Select..."}
        emptyMessage="No options found"
      />
    </div>
  );
}

export function NodeConfigPanel() {
  const selectedNode = useAtomValue(selectedNodeAtom);
  const upstreamNodes = useAtomValue(upstreamNodesAtom);
  const updateNodeData = useSetAtom(updateNodeDataAtom);
  const updateConfig = useSetAtom(updateNodeConfigAtom);
  const deleteSelected = useSetAtom(deleteSelectedNodeAtom);
  const setSelectedNodeId = useSetAtom(selectedNodeIdAtom);
  const [testOutput, setTestOutput] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Reset test output when switching nodes
  const nodeId = selectedNode?.id;
  useEffect(() => {
    setTestOutput(null);
    setIsTesting(false);
  }, [nodeId]);

  const handleTestNode = useCallback(async () => {
    if (!selectedNode) return;
    setIsTesting(true);
    setTestOutput(null);
    try {
      const res = await fetch("/api/workflow/test-node", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodeId: selectedNode.id,
          nodeData: selectedNode.data,
        }),
      });
      if (res.ok) {
        const result = await res.json();
        setTestOutput(JSON.stringify(result, null, 2));
      } else {
        setTestOutput(`Error: ${res.status} ${res.statusText}`);
      }
    } catch (err) {
      setTestOutput(`Error: ${err instanceof Error ? err.message : "Test failed"}`);
    } finally {
      setIsTesting(false);
    }
  }, [selectedNode]);

  if (!selectedNode) return null;

  const nodeData = selectedNode.data;
  const subtype = nodeData.subtype as NodeSubtype | undefined;
  const def = subtype ? NODE_TYPE_REGISTRY[subtype] : null;
  const colors = def ? CATEGORY_COLORS[def.category] : null;
  const Icon = def?.icon;

  return (
    <div className="w-[320px] border-l bg-background overflow-y-auto shrink-0">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {Icon && colors && (
              <div className={`flex items-center justify-center w-8 h-8 rounded-md shrink-0 ${colors.bg} ${colors.text}`}>
                <Icon className="w-4 h-4" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{def?.label ?? nodeData.label}</p>
              <p className="text-xs text-muted-foreground capitalize">{def?.category ?? nodeData.type}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => setSelectedNodeId(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Common fields */}
      <div className="p-4 space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="node-label">Name</Label>
          <Input
            id="node-label"
            value={nodeData.label}
            onChange={(e) =>
              updateNodeData({ nodeId: selectedNode.id, data: { label: e.target.value } })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="node-desc">Description</Label>
          <Input
            id="node-desc"
            value={nodeData.description ?? ""}
            onChange={(e) =>
              updateNodeData({ nodeId: selectedNode.id, data: { description: e.target.value } })
            }
            placeholder="Optional description"
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="node-enabled">Enabled</Label>
          <Switch
            id="node-enabled"
            checked={nodeData.enabled !== false}
            onCheckedChange={(checked) =>
              updateNodeData({ nodeId: selectedNode.id, data: { enabled: checked } })
            }
          />
        </div>
      </div>

      {/* Type-specific config fields */}
      {def && def.configFields.length > 0 && (
        <>
          <Separator />
          <div className="p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Configuration
            </p>
            {def.configFields.map((field) => (
              <ConfigField
                key={field.key}
                field={field}
                value={nodeData.config?.[field.key]}
                onChange={(value) =>
                  updateConfig({ nodeId: selectedNode.id, configKey: field.key, value })
                }
                upstreamNodes={upstreamNodes}
                nodeConfig={nodeData.config}
              />
            ))}
          </div>
        </>
      )}

      {/* Variable reference hint */}
      {upstreamNodes.length > 0 && (
        <>
          <Separator />
          <div className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Available Variables
            </p>
            <div className="space-y-1">
              {upstreamNodes.map((n) => (
                <Badge key={n.id} variant="outline" className="text-xs font-mono mr-1 mb-1">
                  {"{{"}steps.{n.data.label.replace(/\s+/g, "_")}.output{"}}"}
                </Badge>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Test button */}
      <Separator />
      <div className="p-4 space-y-3">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={handleTestNode}
          disabled={isTesting}
        >
          <Play className="w-4 h-4 mr-1" />
          {isTesting ? "Testing..." : "Test this step"}
        </Button>
        {testOutput && (
          <pre className="text-xs bg-muted rounded-md p-3 max-h-40 overflow-auto whitespace-pre-wrap">
            {testOutput}
          </pre>
        )}
      </div>

      {/* Delete button (not for triggers) */}
      {nodeData.type !== "trigger" && (
        <>
          <Separator />
          <div className="p-4">
            <Button
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={() => deleteSelected()}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete Node
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
