export default function MaintenancePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Manutencao
        </p>
        <h1 className="mt-4 text-3xl font-semibold text-foreground">
          Sistema temporariamente indisponivel
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Estamos realizando uma limpeza controlada dos dados deste projeto.
          Tente novamente em alguns minutos.
        </p>
      </div>
    </main>
  );
}
