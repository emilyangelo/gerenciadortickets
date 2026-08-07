/**
 * Renderizador de Gráfico em SVG Puro para o Portal BluePoint (Tema Azul Escuro)
 */

function renderDailyTicketsChart(containerId, chartData) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!chartData || chartData.length === 0) {
    container.innerHTML = `<div class="empty-state"><p>Sem dados de chamados para exibir no gráfico.</p></div>`;
    return;
  }

  const width = container.clientWidth || 600;
  const height = 240;
  const padding = { top: 20, right: 30, bottom: 40, left: 40 };

  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  const maxCount = Math.max(...chartData.map(d => d.count), 5); // no mínimo 5 para escala elegante

  // Posições dos pontos
  const points = chartData.map((d, i) => {
    const x = padding.left + (i / Math.max(chartData.length - 1, 1)) * graphWidth;
    const y = padding.top + graphHeight - (d.count / maxCount) * graphHeight;
    return { x, y, data: d };
  });

  // Construir linhas de grade verticais e horizontais
  let gridLines = '';
  const yTicks = 4;
  for (let i = 0; i <= yTicks; i++) {
    const val = Math.round((maxCount / yTicks) * i);
    const y = padding.top + graphHeight - (val / maxCount) * graphHeight;
    gridLines += `
      <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#2a3859" stroke-dasharray="4,4" />
      <text x="${padding.left - 8}" y="${y + 4}" font-size="11" fill="#94a3b8" text-anchor="end">${val}</text>
    `;
  }

  // Linhas das colunas / barras
  let barsHTML = '';
  const barWidth = Math.max(Math.min(graphWidth / chartData.length - 16, 40), 12);

  chartData.forEach((d, i) => {
    const x = padding.left + (i + 0.5) * (graphWidth / chartData.length) - barWidth / 2;
    const barHeight = (d.count / maxCount) * graphHeight;
    const y = padding.top + graphHeight - barHeight;

    barsHTML += `
      <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="4" fill="url(#blueGradient)" class="chart-bar">
        <title>${d.displayDate}: ${d.count} chamados</title>
      </rect>
      <text x="${x + barWidth / 2}" y="${y - 6}" font-size="11" font-weight="bold" fill="#93c5fd" text-anchor="middle">${d.count}</text>
      <text x="${x + barWidth / 2}" y="${height - 12}" font-size="11" fill="#94a3b8" text-anchor="middle">${d.displayDate}</text>
    `;
  });

  const svgHTML = `
    <svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="blueGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#3b82f6" />
          <stop offset="100%" stop-color="#1e3a8a" />
        </linearGradient>
      </defs>
      <g>
        ${gridLines}
        ${barsHTML}
      </g>
    </svg>
  `;

  container.innerHTML = svgHTML;
}

window.renderDailyTicketsChart = renderDailyTicketsChart;
