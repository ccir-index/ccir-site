/*
  Shared Chart.js discipline helpers — CCIR chart conventions.

  lastValueLabelPlugin
    Draws, for each visible line dataset, the final y-value as a bold
    mono-font label just right of the line's last point, in the dataset's
    borderColor. Skips drawing entirely when more than `maxLines`
    (default 6) line datasets are visible, so dense multi-provider charts
    don't clutter. When 3 or fewer lines are visible it also draws the
    dataset label in small dim text under the value — direct end-of-line
    labelling, which replaces the legend on those charts.

    Wire per chart (inline plugin — never registered globally):

      new Chart(canvas, {
        type: 'line',
        data,
        options: {
          layout: { padding: { right: LAST_VALUE_GUTTER } },
          plugins: {
            ccirLastValueLabel: { format: (v) => '$' + v.toFixed(2) },
          },
        },
        plugins: [lastValueLabelPlugin],
      });

    The layout padding reserves a right-hand gutter so labels never clip;
    charts with a right-hand second axis should NOT use this plugin (the
    axis occupies the label gutter).

  ccirTimeScaleDefaults
    Canonical x time-scale block: no vertical gridlines (grid is drawn on
    the axis border only), sparse unrotated ticks (maxRotation 0,
    autoSkipPadding 32), hairline border. Pages with bespoke tick
    formatting pass `tickCallback`.
*/

import type { Chart, Plugin } from 'chart.js';

const MONO = 'IBM Plex Mono, ui-monospace, Menlo, monospace';

/** Right-hand layout padding that keeps last-value labels from clipping. */
export const LAST_VALUE_GUTTER = 56;

export interface LastValueLabelOptions {
  /** Format the value for display. Receives the dataset for per-axis formats. */
  format?: (value: number, dataset: unknown) => string;
  /** Hide all labels when more than this many line datasets are visible. */
  maxLines?: number;
  /**
   * Dataset sub-labels (small dim text under the value), drawn only when
   * 3 or fewer lines are visible. `false` disables; a function maps a
   * dataset to a short label (return null to skip that dataset's
   * sub-label); default uses dataset.label.
   */
  datasetLabels?: boolean | ((dataset: { label?: string }) => string | null);
  /** Color for the sub-label text. */
  dimColor?: string;
}

interface LabelEntry {
  x: number;
  y: number;
  text: string;
  sub: string | null;
  color: string;
}

export const lastValueLabelPlugin: Plugin = {
  id: 'ccirLastValueLabel',
  afterDatasetsDraw(chart: Chart, _args: unknown, rawOpts: unknown) {
    const opts = (rawOpts ?? {}) as LastValueLabelOptions;
    const maxLines = opts.maxLines ?? 6;
    const fmt = opts.format ?? ((v: number) => v.toFixed(2));

    const lineMetas = chart
      .getSortedVisibleDatasetMetas()
      .filter((m) => m.type === 'line')
      .filter((m) => !(chart.data.datasets[m.index] as Record<string, unknown>)?.ccirSkipLastValue);
    if (lineMetas.length === 0 || lineMetas.length > maxLines) return;

    const drawSubs = opts.datasetLabels === false ? false : lineMetas.length <= 3;
    const entries: LabelEntry[] = [];

    for (const meta of lineMetas) {
      const ds = chart.data.datasets[meta.index] as Record<string, unknown>;
      const data = (ds?.data as unknown[]) ?? [];
      // Last point with a finite y (spanGaps charts can end on a null).
      let idx = -1;
      for (let j = data.length - 1; j >= 0; j--) {
        const p = data[j] as { y?: unknown } | number | null;
        const v = typeof p === 'number' ? p : (p?.y as number | null | undefined);
        if (v !== null && v !== undefined && Number.isFinite(v)) { idx = j; break; }
      }
      if (idx < 0) continue;
      const el = meta.data[idx] as { x?: number; y?: number } | undefined;
      if (!el || !Number.isFinite(el.x) || !Number.isFinite(el.y)) continue;
      const raw = data[idx] as { y?: number } | number;
      const value = typeof raw === 'number' ? raw : (raw.y as number);

      let sub: string | null = null;
      if (drawSubs) {
        sub = typeof opts.datasetLabels === 'function'
          ? opts.datasetLabels(ds as { label?: string })
          : ((ds.label as string | undefined) ?? null);
      }
      entries.push({
        x: el.x as number,
        y: el.y as number,
        text: fmt(value, ds),
        sub,
        color: typeof ds.borderColor === 'string' ? ds.borderColor : '#888888',
      });
    }
    if (entries.length === 0) return;

    // Clamp into the drawable band, then push overlapping labels apart.
    const area = chart.chartArea;
    const lineH = 13;
    for (const e of entries) {
      e.y = Math.min(Math.max(e.y, area.top + 6), area.bottom - 4);
    }
    entries.sort((a, b) => a.y - b.y);
    for (let i = 1; i < entries.length; i++) {
      const need = entries[i - 1].sub ? lineH + 10 : lineH;
      const minY = entries[i - 1].y + need;
      if (entries[i].y < minY) entries[i].y = minY;
    }

    const { ctx } = chart;
    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const dim = opts.dimColor ?? 'rgba(154, 153, 145, 0.95)';
    for (const e of entries) {
      ctx.font = `700 11px ${MONO}`;
      const w = ctx.measureText(e.text).width;
      // Just right of the last point; pull back if it would leave the canvas.
      const lx = Math.min(e.x + 6, chart.width - w - 2);
      ctx.fillStyle = e.color;
      ctx.fillText(e.text, lx, e.y);
      if (e.sub) {
        ctx.font = `400 9px ${MONO}`;
        ctx.fillStyle = dim;
        ctx.fillText(e.sub, lx, e.y + 11);
      }
    }
    ctx.restore();
  },
};

/**
 * Canonical CCIR x time-scale config: no vertical gridlines, hairline axis
 * border, sparse unrotated tick labels. Spread the result into a chart's
 * `scales.x` (it returns a plain object so pages can still override keys).
 */
export function ccirTimeScaleDefaults(opts: {
  color: string;
  grid: string;
  font?: { family: string; size: number };
  unit?: 'day' | 'hour';
  title?: string;
  tickCallback?: (value: number | string) => string;
}): Record<string, unknown> {
  const font = opts.font ?? { family: MONO, size: 11 };
  return {
    type: 'time',
    ...(opts.unit ? { time: { unit: opts.unit } } : {}),
    ticks: {
      color: opts.color,
      font,
      maxRotation: 0,
      autoSkip: true,
      autoSkipPadding: 32,
      ...(opts.tickCallback ? { callback: opts.tickCallback } : {}),
    },
    ...(opts.title
      ? { title: { display: true, text: opts.title, color: opts.color, font } }
      : {}),
    grid: { color: opts.grid, drawOnChartArea: false },
    border: { color: opts.grid },
  };
}
