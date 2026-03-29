import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <main
      className={cn(
        "flex-1 overflow-y-auto pb-20 md:pb-6",
        className
      )}
    >
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        {children}
      </div>
    </main>
  );
}
