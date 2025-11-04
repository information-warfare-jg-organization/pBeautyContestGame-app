/**
 * Histogram odpowiedzi (słupki 0..100, bez binowania).
 * Wymagane:
 *  - <canvas id="histogram" data-real-value="..." data-highlight-value="...">
 *  - <script id="dist-data" type="application/json">...</script>
 *  - Chart.js UMD (chart.umd.min.js) w <script> (globalny window.Chart)
 */

(function () {
  // --- rejestracja wymaganych części Chart.js ---
  try {
    const C = window.Chart;
    if (C && C.register) {
      const {
        BarElement,
        CategoryScale,
        LinearScale,
        Tooltip,
        Legend,
      } = C;
      // rejestruj tylko jeśli nie były rejestrowane
      C.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);
    }
  } catch (e) {
    console.warn('Chart.js registry warning:', e);
  }

  // --- plugin pionowej zielonej linii ---
  const verticalLinePlugin = {
    id: 'verticalLinePlugin',
    afterDraw(chart, _args, pluginOptions) {
      const realValue = pluginOptions?.realValue;
      if (realValue === undefined || realValue === null || !isFinite(realValue)) return;

      const { ctx, chartArea, scales } = chart;
      const xScale = scales.x;
      const labels = chart.data.labels || [];
      if (!labels.length) return;

      // znajdź najbliższą etykietę do realValue
      let nearestIndex = 0;
      let minDiff = Infinity;
      for (let i = 0; i < labels.length; i++) {
        const v = Number(labels[i]);
        const d = Math.abs(v - Number(realValue));
        if (d < minDiff) { minDiff = d; nearestIndex = i; }
      }

      const x = xScale.getPixelForValue(nearestIndex);
      if (!isFinite(x)) return;

      ctx.save();
      ctx.strokeStyle = 'green';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, chartArea.top);
      ctx.lineTo(x, chartArea.bottom);
      ctx.stroke();
      ctx.restore();
    }
  };

  try {
    const canvas = document.getElementById('histogram');
    if (!canvas) return;

    // odczyt danych
    const raw = document.getElementById('dist-data')?.textContent || '[]';
    const incoming = JSON.parse(raw); // [{value, count}, ...]

    // pełne etykiety 0..100
    const labels = Array.from({ length: 101 }, (_, i) => i);

    // zainicjuj wektor counts 0..100
    const counts = new Array(101).fill(0);
    if (Array.isArray(incoming)) {
      for (const item of incoming) {
        const v = Number(item?.value);
        const c = Number(item?.count);
        if (Number.isInteger(v) && v >= 0 && v <= 100 && Number.isFinite(c)) {
          counts[v] = c;
        }
      }
    }

    // parametry z data-*
    const realValueAttr = canvas.getAttribute('data-real-value');
    const highlightValueAttr = canvas.getAttribute('data-highlight-value');
    const realValue = realValueAttr !== null && realValueAttr !== '' ? Number(realValueAttr) : undefined;
    const highlightValue = highlightValueAttr !== null && highlightValueAttr !== '' ? Number(highlightValueAttr) : undefined;

    // kolory słupków (opcjonalnie czerwony dla highlightValue)
    let barColors = undefined;
    if (Number.isFinite(highlightValue)) {
      barColors = labels.map(v => (v === highlightValue ? 'red' : undefined));
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // zarejestruj plugin linii (jednorazowo)
    const C = window.Chart;
    if (C && C.register && !C.registry.plugins.get('verticalLinePlugin')) {
      C.register(verticalLinePlugin);
    }

    new window.Chart(ctx, {
      type: 'bar',
      data: {
        labels,          // 0..100
        datasets: [{
          label: 'Liczba odpowiedzi',
          data: counts,  // counts[0..100]
          backgroundColor: barColors,
          barThickness: 6,           // cieńsze słupki, żeby było widać każdy
          categoryPercentage: 1.0,
          barPercentage: 1.0
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: true },
          verticalLinePlugin: { realValue }
        },
        scales: {
          x: {
            type: 'category',       // wymuś kategorie
            title: { display: true, text: 'Wartość odpowiedzi (0–100)' },
            ticks: { maxTicksLimit: 21 } // nie pokazuj 101 etykiet – ale słupków i tak jest 101
          },
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Liczba' }
          }
        }
      }
    });
  } catch (e) {
    console.error('Błąd renderowania wykresu:', e);
  }
})();
