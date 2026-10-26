/**
 * ECharts Theme für PSM Statistik
 * Abgeleitet vom Haupt-PSM Design System
 */
import type { EChartsOption } from "echarts";

/**
 * Farbpalette für Diagramme
 */
export const CHART_COLORS = [
  "#22c55e", // Grün (Primary)
  "#22d3ee", // Cyan (Info)
  "#fbbf24", // Amber (Warning)
  "#ef4444", // Rot (Danger)
  "#8b5cf6", // Violett
  "#f472b6", // Pink
  "#64748b", // Slate
  "#06b6d4", // Teal
  "#84cc16", // Lime
  "#f97316", // Orange
];

/**
 * PSM Theme für ECharts
 */
export const psmTheme = {
  color: CHART_COLORS,

  backgroundColor: "transparent",

  textStyle: {
    color: "#e6f0f6",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },

  title: {
    textStyle: {
      color: "#e6f0f6",
      fontSize: 16,
      fontWeight: 600,
    },
    subtextStyle: {
      color: "#a6b5c2",
      fontSize: 12,
    },
  },

  legend: {
    textStyle: {
      color: "#a6b5c2",
    },
    pageTextStyle: {
      color: "#a6b5c2",
    },
  },

  tooltip: {
    backgroundColor: "rgba(22, 44, 62, 0.95)",
    borderColor: "#2a3f52",
    borderWidth: 1,
    textStyle: {
      color: "#e6f0f6",
    },
    extraCssText:
      "box-shadow: 0 8px 24px rgba(0,0,0,0.35); border-radius: 8px;",
  },

  axisPointer: {
    lineStyle: {
      color: "#36536b",
    },
    crossStyle: {
      color: "#36536b",
    },
  },

  categoryAxis: {
    axisLine: {
      lineStyle: { color: "#2a3f52" },
    },
    axisTick: {
      lineStyle: { color: "#2a3f52" },
    },
    axisLabel: {
      color: "#a6b5c2",
    },
    splitLine: {
      lineStyle: { color: "#1b3448" },
    },
  },

  valueAxis: {
    axisLine: {
      lineStyle: { color: "#2a3f52" },
    },
    axisTick: {
      lineStyle: { color: "#2a3f52" },
    },
    axisLabel: {
      color: "#a6b5c2",
    },
    splitLine: {
      lineStyle: { color: "#1b3448" },
    },
  },

  dataZoom: {
    backgroundColor: "#122433",
    dataBackgroundColor: "#1b3448",
    fillerColor: "rgba(34, 197, 94, 0.2)",
    handleColor: "#22c55e",
    handleSize: "100%",
    textStyle: {
      color: "#a6b5c2",
    },
    brushSelect: true,
  },

  toolbox: {
    iconStyle: {
      borderColor: "#a6b5c2",
    },
    emphasis: {
      iconStyle: {
        borderColor: "#22c55e",
      },
    },
  },
};

/** Schmale Bildschirme (Handy): Legenden unten, kürzere Achsenbeschriftungen */
export function isNarrow(): boolean {
  return typeof window !== "undefined" && window.innerWidth < 640;
}

/** Zahlen deutsch formatieren (1.000 statt 1,000) */
export const formatZahl = (value: unknown): string =>
  Number(value).toLocaleString("de-DE");

/**
 * Standard-Optionen für alle Charts
 */
export function getBaseChartOptions(
  overrides: Partial<EChartsOption> = {}
): EChartsOption {
  return {
    backgroundColor: "transparent",
    textStyle: psmTheme.textStyle,
    tooltip: {
      trigger: "item",
      ...psmTheme.tooltip,
    },
    toolbox: {
      show: true,
      feature: {
        saveAsImage: {
          title: "Als Bild speichern",
          pixelRatio: 2,
        },
        dataView: {
          title: "Daten anzeigen",
          lang: ["Datenansicht", "Schließen", "Aktualisieren"],
        },
        restore: {
          title: "Zurücksetzen",
        },
      },
      ...psmTheme.toolbox,
    },
    ...overrides,
  };
}

/**
 * Optionen für Pie/Donut-Charts
 */
export function getPieChartOptions(
  data: { name: string; value: number }[],
  title: string
): EChartsOption {
  const narrow = isNarrow();
  return getBaseChartOptions({
    title: {
      text: title,
      left: "center",
      ...psmTheme.title,
    },
    tooltip: {
      trigger: "item",
      formatter: (p: any) =>
        `${p.name}: ${formatZahl(p.value)} (${Number(p.percent).toLocaleString("de-DE", { maximumFractionDigits: 1 })} %)`,
      confine: true,
      ...psmTheme.tooltip,
    },
    legend: narrow
      ? { type: "plain", orient: "horizontal", bottom: 0, left: "center", itemGap: 10, ...psmTheme.legend, textStyle: { ...psmTheme.legend.textStyle, fontSize: 11 } }
      : { type: "scroll", orient: "vertical", right: 10, top: "center", ...psmTheme.legend },
    series: [
      {
        type: "pie",
        radius: narrow ? ["26%", "46%"] : ["40%", "70%"],
        center: narrow ? ["50%", "36%"] : ["40%", "50%"],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 8,
          borderColor: "#0e1d2a",
          borderWidth: 2,
        },
        label: {
          show: false,
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: "bold",
            color: "#e6f0f6",
          },
          itemStyle: {
            shadowBlur: 20,
            shadowColor: "rgba(0, 0, 0, 0.5)",
          },
        },
        data: data.map((item, index) => ({
          ...item,
          itemStyle: { color: CHART_COLORS[index % CHART_COLORS.length] },
        })),
      },
    ],
  });
}

/**
 * Optionen für Bar-Charts
 */
export function getBarChartOptions(
  categories: string[],
  values: number[],
  title: string,
  horizontal = false
): EChartsOption {
  const narrow = isNarrow();
  const axis = {
    type: "category" as const,
    data: categories,
    ...psmTheme.categoryAxis,
    axisLabel: {
      ...psmTheme.categoryAxis.axisLabel,
      rotate: horizontal ? 0 : 30,
      interval: 0,
      width: horizontal ? (narrow ? 110 : 190) : undefined,
      overflow: horizontal ? ("truncate" as const) : undefined,
    },
    // Waagerechte Balken: erster (größter) Eintrag oben
    inverse: horizontal,
  };

  const valueAxis = {
    type: "value" as const,
    ...psmTheme.valueAxis,
    splitNumber: narrow ? 3 : undefined,
    axisLabel: {
      ...psmTheme.valueAxis.axisLabel,
      hideOverlap: true,
      formatter: formatZahl,
    },
  };

  return getBaseChartOptions({
    title: {
      text: title,
      left: "center",
      ...psmTheme.title,
    },
    tooltip: {
      trigger: "axis",
      confine: true,
      valueFormatter: formatZahl,
      ...psmTheme.tooltip,
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: horizontal ? "3%" : "15%",
      containLabel: true,
    },
    xAxis: horizontal ? valueAxis : axis,
    yAxis: horizontal ? axis : valueAxis,
    series: [
      {
        type: "bar",
        data: values.map((value, index) => ({
          value,
          itemStyle: {
            color: CHART_COLORS[index % CHART_COLORS.length],
            borderRadius: horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0],
          },
        })),
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: "rgba(0,0,0,0.3)",
          },
        },
      },
    ],
  });
}

/**
 * Optionen für Line-Charts mit DataZoom
 */
export function getLineChartOptions(
  categories: string[],
  values: number[],
  title: string
): EChartsOption {
  return getBaseChartOptions({
    title: {
      text: title,
      left: "center",
      ...psmTheme.title,
    },
    tooltip: {
      trigger: "axis",
      confine: true,
      valueFormatter: formatZahl,
      ...psmTheme.tooltip,
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "15%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: categories,
      boundaryGap: false,
      ...psmTheme.categoryAxis,
    },
    yAxis: {
      type: "value",
      ...psmTheme.valueAxis,
      axisLabel: { ...psmTheme.valueAxis.axisLabel, formatter: formatZahl },
    },
    dataZoom: [
      {
        type: "inside",
        start: 0,
        end: 100,
      },
      {
        type: "slider",
        start: 0,
        end: 100,
        ...psmTheme.dataZoom,
      },
    ],
    series: [
      {
        type: "line",
        data: values,
        smooth: true,
        symbol: "circle",
        symbolSize: 6,
        lineStyle: {
          width: 3,
          color: CHART_COLORS[0],
        },
        itemStyle: {
          color: CHART_COLORS[0],
        },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(34, 197, 94, 0.4)" },
              { offset: 1, color: "rgba(34, 197, 94, 0.05)" },
            ],
          },
        },
      },
    ],
  });
}
