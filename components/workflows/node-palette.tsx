"use client";

import { type DragEvent, memo } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  NODE_CATEGORIES,
  CATEGORY_COLORS,
  type NodeTypeDefinition,
} from "@/lib/workflow-node-types";
import { IntegrationBrowser } from "@/components/workflows/integration-browser";

const PaletteItem = memo(function PaletteItem({ def }: { def: NodeTypeDefinition }) {
  // Hide composio_action from the built-in palette (it's in the Integrations tab)
  if (def.subtype === "composio_action") return null;

  const colors = CATEGORY_COLORS[def.category];

  const onDragStart = (e: DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData("application/workflow-node-subtype", def.subtype);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-grab active:cursor-grabbing hover:bg-accent transition-colors"
    >
      <div className={`flex items-center justify-center w-7 h-7 rounded-md shrink-0 ${colors.bg} ${colors.text}`}>
        <def.icon className="w-3.5 h-3.5" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{def.label}</p>
        <p className="text-[11px] text-muted-foreground truncate">{def.description}</p>
      </div>
    </div>
  );
});

export function NodePalette() {
  return (
    <div className="w-[250px] border-r bg-background shrink-0 flex flex-col">
      <Tabs defaultValue="nodes" className="flex flex-col flex-1 min-h-0">
        <div className="px-2 pt-2 shrink-0">
          <TabsList className="w-full">
            <TabsTrigger value="nodes" className="flex-1 text-xs">
              Nodes
            </TabsTrigger>
            <TabsTrigger value="integrations" className="flex-1 text-xs">
              Integrations
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="nodes" className="flex-1 overflow-y-auto mt-0">
          <Accordion
            type="multiple"
            defaultValue={["trigger", "action", "ai", "logic"]}
            className="px-2"
          >
            {NODE_CATEGORIES.map((cat) => (
              <AccordionItem key={cat.key} value={cat.key}>
                <AccordionTrigger className="py-2 text-xs font-semibold uppercase tracking-wider">
                  {cat.label}
                </AccordionTrigger>
                <AccordionContent className="space-y-0.5 pb-2">
                  {cat.items.map((def) => (
                    <PaletteItem key={def.subtype} def={def} />
                  ))}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </TabsContent>

        <TabsContent value="integrations" className="flex-1 overflow-hidden mt-0">
          <IntegrationBrowser />
        </TabsContent>
      </Tabs>
    </div>
  );
}
