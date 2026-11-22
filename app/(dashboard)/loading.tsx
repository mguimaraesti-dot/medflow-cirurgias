/**
 * Mostrado na hora, dentro do layout (menu continua visível), enquanto a
 * próxima tela do dashboard é carregada no servidor. Sem isso, a tela
 * antiga ficava parada até a nova estar pronta e parecia que o clique
 * não tinha funcionado.
 */
export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Carregando">
      <div className="h-6 w-48 rounded bg-card" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-lg bg-card" />
        ))}
      </div>
      <div className="h-64 rounded-lg bg-card" />
    </div>
  );
}
