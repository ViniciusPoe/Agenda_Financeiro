import { cn } from "@/lib/utils";
import type { FinanceCategory } from "@/types/financeiro";

interface CategoryBadgeProps {
  category: Pick<FinanceCategory, "name" | "color" | "icon">;
  className?: string;
  size?: "sm" | "default";
}

export function CategoryBadge({ category, className, size = "default" }: CategoryBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs",
        className
      )}
      style={{
        backgroundColor: category.color + "20",
        color: category.color,
        border: `1px solid ${category.color}40`,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full shrink-0"
        style={{ backgroundColor: category.color }}
      />
      {category.name}
    </span>
  );
}
