import { AgendaAutomation } from "@/components/agenda/agenda-automation";

export default function AgendaSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AgendaAutomation />
      {children}
    </>
  );
}
