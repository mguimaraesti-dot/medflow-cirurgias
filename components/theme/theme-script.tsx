// Roda antes da hidratação (via dangerouslySetInnerHTML num <script> inline)
// pra aplicar a classe "dark" no <html> o quanto antes e evitar o "flash"
// de tema claro antes do React montar. Lê a preferência salva; se não
// houver nenhuma ainda, cai no prefers-color-scheme do sistema.
const THEME_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("medflow-theme");
    var dark = stored
      ? stored === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (dark) document.documentElement.classList.add("dark");
  } catch (e) {}
})();
`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />;
}
