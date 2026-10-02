import React, { useRef, useEffect, useState, useCallback, type CSSProperties } from "react";

export interface DataPoint {
  [key: string]: string | number;
}

interface ChartConfig {
  width?: number | string;
  height?: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  colors?: string[];
  animate?: boolean;
  gridLines?: boolean;
  className?: string;
  style?: CSSProperties;
}

interface AxisConfig {
  dataKey?: string;
  label?: string;
  tickCount?: number;
  formatter?: (value: number) => string;
}

const DEFAULT_COLORS = [
  "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b",
  "#ef4444", "#ec4899", "#6366f1", "#14b8a6",
];

const DEFAULT_MARGIN = { top: 20, right: 20, bottom: 40, left: 50 };

function computeScale(
  data: DataPoint[],
  dataKey: string,
  rangeMin: number,
  rangeMax: number
): { scale: (val: number) => number; min: number; max: number; ticks: number[] } {
  const values = data.map(d => Number(d[dataKey]) || 0);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = (max - min) * 0.1 || 1;
  const domainMin = min - padding;
  const domainMax = max + padding;

  const scale = (val: number) => {
    const ratio = (val - domainMin) / (domainMax - domainMin);
    return rangeMin + ratio * (rangeMax - rangeMin);
  };

  const tickCount = 5;
  const ticks: number[] = [];
  for (let i = 0; i <= tickCount; i++) {
    ticks.push(domainMin + (i / tickCount) * (domainMax - domainMin));
  }

  return { scale, min: domainMin, max: domainMax, ticks };
}

function formatNumber(val: number): string {
  if (Math.abs(val) >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
  if (Math.abs(val) >= 1000) return `${(val / 1000).toFixed(1)}K`;
  return val % 1 === 0 ? String(val) : val.toFixed(1);
}

interface SovereignLineChartProps extends ChartConfig {
  data: DataPoint[];
  xKey: string;
  yKeys: string[];
  xAxis?: AxisConfig;
  yAxis?: AxisConfig;
  curved?: boolean;
  showDots?: boolean;
  area?: boolean;
}

export function SovereignLineChart({
  data,
  xKey,
  yKeys,
  width = "100%",
  height = 300,
  margin = DEFAULT_MARGIN,
  colors = DEFAULT_COLORS,
  gridLines = true,
  curved = true,
  showDots = true,
  area = false,
  className = "",
  style,
}: SovereignLineChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  if (data.length === 0) {
    return <div className={`flex items-center justify-center text-gray-500 ${className}`} style={{ height, ...style }}>No data</div>;
  }

  const chartWidth = typeof width === "number" ? width : 600;
  const chartHeight = height;
  const plotWidth = chartWidth - margin.left - margin.right;
  const plotHeight = chartHeight - margin.top - margin.bottom;

  const xPositions = data.map((_, i) => margin.left + (i / Math.max(1, data.length - 1)) * plotWidth);

  const allYValues = yKeys.flatMap(key => data.map(d => Number(d[key]) || 0));
  const yMin = Math.min(...allYValues);
  const yMax = Math.max(...allYValues);
  const yPad = (yMax - yMin) * 0.1 || 1;
  const yDomainMin = yMin - yPad;
  const yDomainMax = yMax + yPad;

  const yScale = (val: number) => {
    const ratio = (val - yDomainMin) / (yDomainMax - yDomainMin);
    return margin.top + plotHeight - ratio * plotHeight;
  };

  const yTicks: number[] = [];
  for (let i = 0; i <= 5; i++) {
    yTicks.push(yDomainMin + (i / 5) * (yDomainMax - yDomainMin));
  }

  function buildPath(key: string): string {
    const points = data.map((d, i) => ({
      x: xPositions[i],
      y: yScale(Number(d[key]) || 0),
    }));

    if (curved && points.length > 2) {
      let d = `M ${points[0].x} ${points[0].y}`;
      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[Math.max(0, i - 1)];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[Math.min(points.length - 1, i + 2)];
        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;
        d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
      }
      return d;
    }

    return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${chartWidth} ${chartHeight}`}
      width={width}
      height={height}
      className={className}
      style={style}
    >
      {gridLines && yTicks.map((tick, i) => (
        <line
          key={`grid-${i}`}
          x1={margin.left}
          y1={yScale(tick)}
          x2={margin.left + plotWidth}
          y2={yScale(tick)}
          stroke="rgba(255,255,255,0.05)"
          strokeDasharray="4 4"
        />
      ))}

      {yTicks.map((tick, i) => (
        <text
          key={`ytick-${i}`}
          x={margin.left - 8}
          y={yScale(tick)}
          textAnchor="end"
          dominantBaseline="middle"
          fill="rgba(255,255,255,0.4)"
          fontSize={10}
        >
          {formatNumber(tick)}
        </text>
      ))}

      {data.map((d, i) => {
        if (data.length > 20 && i % Math.ceil(data.length / 10) !== 0 && i !== data.length - 1) return null;
        return (
          <text
            key={`xtick-${i}`}
            x={xPositions[i]}
            y={chartHeight - 8}
            textAnchor="middle"
            fill="rgba(255,255,255,0.4)"
            fontSize={10}
          >
            {String(d[xKey]).slice(0, 10)}
          </text>
        );
      })}

      {yKeys.map((key, ki) => {
        const color = colors[ki % colors.length];
        const pathD = buildPath(key);

        return (
          <g key={key}>
            {area && (
              <path
                d={`${pathD} L ${xPositions[data.length - 1]} ${margin.top + plotHeight} L ${xPositions[0]} ${margin.top + plotHeight} Z`}
                fill={color}
                fillOpacity={0.1}
              />
            )}
            <path d={pathD} fill="none" stroke={color} strokeWidth={2} />
            {showDots && data.map((d, i) => (
              <circle
                key={`dot-${ki}-${i}`}
                cx={xPositions[i]}
                cy={yScale(Number(d[key]) || 0)}
                r={3}
                fill={color}
              />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

interface SovereignBarChartProps extends ChartConfig {
  data: DataPoint[];
  xKey: string;
  yKeys: string[];
  stacked?: boolean;
  horizontal?: boolean;
}

export function SovereignBarChart({
  data,
  xKey,
  yKeys,
  width = "100%",
  height = 300,
  margin = DEFAULT_MARGIN,
  colors = DEFAULT_COLORS,
  gridLines = true,
  stacked = false,
  className = "",
  style,
}: SovereignBarChartProps) {
  if (data.length === 0) {
    return <div className={`flex items-center justify-center text-gray-500 ${className}`} style={{ height, ...style }}>No data</div>;
  }

  const chartWidth = typeof width === "number" ? width : 600;
  const chartHeight = height;
  const plotWidth = chartWidth - margin.left - margin.right;
  const plotHeight = chartHeight - margin.top - margin.bottom;

  const barGroupWidth = plotWidth / data.length;
  const barPadding = barGroupWidth * 0.2;
  const barWidth = stacked
    ? barGroupWidth - barPadding * 2
    : (barGroupWidth - barPadding * 2) / yKeys.length;

  let yMax: number;
  if (stacked) {
    yMax = Math.max(...data.map(d => yKeys.reduce((sum, key) => sum + (Number(d[key]) || 0), 0)));
  } else {
    yMax = Math.max(...data.flatMap(d => yKeys.map(key => Number(d[key]) || 0)));
  }
  yMax *= 1.1;
  if (yMax === 0) yMax = 1;

  const yScale = (val: number) => margin.top + plotHeight - (val / yMax) * plotHeight;

  const yTicks: number[] = [];
  for (let i = 0; i <= 5; i++) {
    yTicks.push((i / 5) * yMax);
  }

  return (
    <svg
      viewBox={`0 0 ${chartWidth} ${chartHeight}`}
      width={width}
      height={height}
      className={className}
      style={style}
    >
      {gridLines && yTicks.map((tick, i) => (
        <line
          key={`grid-${i}`}
          x1={margin.left}
          y1={yScale(tick)}
          x2={margin.left + plotWidth}
          y2={yScale(tick)}
          stroke="rgba(255,255,255,0.05)"
          strokeDasharray="4 4"
        />
      ))}

      {yTicks.map((tick, i) => (
        <text
          key={`ytick-${i}`}
          x={margin.left - 8}
          y={yScale(tick)}
          textAnchor="end"
          dominantBaseline="middle"
          fill="rgba(255,255,255,0.4)"
          fontSize={10}
        >
          {formatNumber(tick)}
        </text>
      ))}

      {data.map((d, di) => {
        const groupX = margin.left + di * barGroupWidth + barPadding;

        return (
          <g key={di}>
            <text
              x={groupX + (barGroupWidth - barPadding * 2) / 2}
              y={chartHeight - 8}
              textAnchor="middle"
              fill="rgba(255,255,255,0.4)"
              fontSize={10}
            >
              {String(d[xKey]).slice(0, 8)}
            </text>

            {stacked ? (
              (() => {
                let stackY = 0;
                return yKeys.map((key, ki) => {
                  const val = Number(d[key]) || 0;
                  const barH = (val / yMax) * plotHeight;
                  const y = yScale(stackY + val);
                  stackY += val;
                  return (
                    <rect
                      key={`bar-${di}-${ki}`}
                      x={groupX}
                      y={y}
                      width={barWidth}
                      height={barH}
                      fill={colors[ki % colors.length]}
                      rx={2}
                    />
                  );
                });
              })()
            ) : (
              yKeys.map((key, ki) => {
                const val = Number(d[key]) || 0;
                const barH = (val / yMax) * plotHeight;
                return (
                  <rect
                    key={`bar-${di}-${ki}`}
                    x={groupX + ki * barWidth}
                    y={yScale(val)}
                    width={barWidth - 1}
                    height={barH}
                    fill={colors[ki % colors.length]}
                    rx={2}
                  />
                );
              })
            )}
          </g>
        );
      })}
    </svg>
  );
}

interface SovereignPieChartProps extends ChartConfig {
  data: { name: string; value: number }[];
  innerRadius?: number;
  showLabels?: boolean;
}

export function SovereignPieChart({
  data,
  width = "100%",
  height = 300,
  colors = DEFAULT_COLORS,
  innerRadius = 0,
  showLabels = true,
  className = "",
  style,
}: SovereignPieChartProps) {
  if (data.length === 0) {
    return <div className={`flex items-center justify-center text-gray-500 ${className}`} style={{ height, ...style }}>No data</div>;
  }

  const chartSize = typeof width === "number" ? Math.min(width, height) : height;
  const cx = chartSize / 2;
  const cy = chartSize / 2;
  const outerR = chartSize / 2 - 30;
  const innerR = innerRadius;
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) {
    return <div className={`flex items-center justify-center text-gray-500 ${className}`} style={{ height, ...style }}>No data values</div>;
  }

  let currentAngle = -Math.PI / 2;

  const slices = data.map((d, i) => {
    const sliceAngle = (d.value / total) * Math.PI * 2;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;
    currentAngle = endAngle;

    const x1 = cx + outerR * Math.cos(startAngle);
    const y1 = cy + outerR * Math.sin(startAngle);
    const x2 = cx + outerR * Math.cos(endAngle);
    const y2 = cy + outerR * Math.sin(endAngle);
    const largeArc = sliceAngle > Math.PI ? 1 : 0;

    let path: string;
    if (innerR > 0) {
      const ix1 = cx + innerR * Math.cos(startAngle);
      const iy1 = cy + innerR * Math.sin(startAngle);
      const ix2 = cx + innerR * Math.cos(endAngle);
      const iy2 = cy + innerR * Math.sin(endAngle);
      path = `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix1} ${iy1} Z`;
    } else {
      path = `M ${cx} ${cy} L ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    }

    const midAngle = startAngle + sliceAngle / 2;
    const labelR = outerR + 16;
    const lx = cx + labelR * Math.cos(midAngle);
    const ly = cy + labelR * Math.sin(midAngle);

    return { path, color: colors[i % colors.length], label: d.name, value: d.value, lx, ly, midAngle, pct: ((d.value / total) * 100).toFixed(1) };
  });

  return (
    <svg viewBox={`0 0 ${chartSize} ${chartSize}`} width={width} height={height} className={className} style={style}>
      {slices.map((slice, i) => (
        <g key={i}>
          <path d={slice.path} fill={slice.color} stroke="rgba(0,0,0,0.3)" strokeWidth={1} />
          {showLabels && Number(slice.pct) > 5 && (
            <text
              x={slice.lx}
              y={slice.ly}
              textAnchor={slice.midAngle > Math.PI / 2 && slice.midAngle < Math.PI * 1.5 ? "end" : "start"}
              dominantBaseline="middle"
              fill="rgba(255,255,255,0.6)"
              fontSize={10}
            >
              {slice.label} ({slice.pct}%)
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

// ─── Recharts-compatible API ────────────────────────────────────────────────
// These components provide a drop-in-compatible interface matching the recharts
// component API so existing page code can be migrated without changing charts.

const CHART_COLORS = [
  "#06b6d4", "#8b5cf6", "#10b981", "#f59e0b",
  "#ef4444", "#3b82f6", "#ec4899", "#14b8a6",
];

const CHART_MARGIN = { top: 10, right: 10, bottom: 30, left: 40 };

// Marker symbols on function components to identify child type at runtime
type SovereignChild = React.ComponentType<ChartChildContext> & { _sovereignType?: string };

interface ChartChildContext {
  _data?: DataPoint[];
  _width?: number;
  _height?: number;
  _margin?: typeof CHART_MARGIN;
  _yMin?: number;
  _yMax?: number;
  _dataKeys?: string[];
  _colors?: string[];
  _tooltip?: TooltipChildProps | null;
  _onHover?: (state: HoverState | null) => void;
  [key: string]: unknown;
}

interface HoverState {
  x: number;
  y: number;
  index: number;
}

export interface TooltipPayloadEntry {
  name?: string;
  dataKey?: string;
  value?: number;
  color?: string;
  payload?: Record<string, unknown>;
}

interface TooltipChildProps {
  contentStyle?: CSSProperties;
  labelStyle?: CSSProperties;
  labelFormatter?: (v: string | number) => string | number;
  formatter?: (value: number, name: string) => [string | number, string];
  content?: React.ComponentType<{
    active?: boolean;
    payload?: TooltipPayloadEntry[];
    label?: string | number;
  }> | React.ReactElement;
}

interface LegendChildProps {
  content?: React.ComponentType<{
    payload?: Array<{ value?: string; dataKey?: string; color?: string }>;
    verticalAlign?: "top" | "bottom";
  }> | React.ReactElement;
  verticalAlign?: "top" | "bottom";
}

function px(i: number, total: number, width: number): number {
  if (total <= 1) return width / 2;
  return (i / (total - 1)) * width;
}

function py(value: number, min: number, max: number, height: number): number {
  if (max === min) return height / 2;
  return height - ((value - min) / (max - min)) * height;
}

function numExtent(data: DataPoint[], keys: string[]): [number, number] {
  let lo = Infinity;
  let hi = -Infinity;
  for (const d of data) {
    for (const k of keys) {
      const v = Number(d[k]);
      if (isFinite(v)) { if (v < lo) lo = v; if (v > hi) hi = v; }
    }
  }
  if (!isFinite(lo)) return [0, 1];
  if (lo === hi) return [lo - 1, hi + 1];
  return [lo, hi];
}

function monotonePath(points: { x: number; y: number }[]): string {
  return points.reduce((acc, pt, i) => {
    if (i === 0) return `M${pt.x},${pt.y}`;
    const prev = points[i - 1];
    const cx = (prev.x + pt.x) / 2;
    return `${acc} C${cx},${prev.y} ${cx},${pt.y} ${pt.x},${pt.y}`;
  }, "");
}

// ─── ResponsiveContainer ────────────────────────────────────────────────────
export function ResponsiveContainer({
  width = "100%",
  height = 300,
  children,
}: {
  width?: number | string;
  height?: number | string;
  children: React.ReactElement;
}) {
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const observe = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    setDims({ w: node.clientWidth, h: node.clientHeight });
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setDims({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    ro.observe(node);
  }, []);

  const resolvedH = typeof height === "number" ? `${height}px` : height;

  return (
    <div ref={observe} style={{ width, height: resolvedH, position: "relative" }}>
      {dims ? React.cloneElement(children as React.ReactElement<{ width: number; height: number }>, { width: dims.w, height: dims.h }) : null}
    </div>
  );
}

// ─── Helper: build legend payload ────────────────────────────────────────────
function buildLegendPayload(
  dataKeys: string[],
  seriesProps: Array<{ stroke?: string; fill?: string }>,
): Array<{ value?: string; dataKey?: string; color?: string }> {
  return dataKeys.map((key, ki) => ({
    value: key,
    dataKey: key,
    color: seriesProps[ki]?.stroke ?? seriesProps[ki]?.fill ?? CHART_COLORS[ki % CHART_COLORS.length],
  }));
}

// ─── Helper: render legend node ───────────────────────────────────────────────
function renderLegendNode(
  legendEl: React.ReactElement | undefined,
  payload: Array<{ value?: string; dataKey?: string; color?: string }>,
  totalHeight: number,
): React.ReactElement | null {
  if (!legendEl) return null;
  const lProps = legendEl.props as LegendChildProps;
  const vAlign = lProps.verticalAlign ?? "bottom";
  const yOffset = vAlign === "top" ? 2 : totalHeight - 20;
  if (lProps.content) {
    const ContentComp = lProps.content;
    const contentEl = React.isValidElement(ContentComp)
      ? React.cloneElement(ContentComp as React.ReactElement<{ payload?: typeof payload; verticalAlign?: string }>, { payload, verticalAlign: vAlign })
      : React.createElement(ContentComp as React.ComponentType<{ payload?: typeof payload; verticalAlign?: string }>, { payload, verticalAlign: vAlign });
    return (
      <foreignObject x={0} y={yOffset} width="100%" height={22} style={{ overflow: "visible", pointerEvents: "none" }}>
        {contentEl}
      </foreignObject>
    );
  }
  return (
    <g transform={`translate(0,${yOffset})`}>
      {payload.map((item, i) => (
        <g key={item.dataKey ?? i} transform={`translate(${i * 80 + 10},0)`}>
          <rect x={0} y={4} width={8} height={8} rx={2} fill={item.color ?? CHART_COLORS[i % CHART_COLORS.length]} />
          <text x={12} y={12} fontSize={9} fill="#aaa">{item.value}</text>
        </g>
      ))}
    </g>
  );
}

// ─── Helper: build chart SVG ─────────────────────────────────────────────────
function buildRechartsSVG(
  data: DataPoint[],
  children: React.ReactNode,
  width: number,
  height: number,
): React.ReactElement {
  const childArr = React.Children.toArray(children) as React.ReactElement[];

  const legendEl = childArr.find(c => (c.type as SovereignChild)._sovereignType === "Legend");
  const hasLegend = !!legendEl;
  const legendHeight = hasLegend ? 24 : 0;

  const m = {
    ...CHART_MARGIN,
    bottom: CHART_MARGIN.bottom + legendHeight,
  };
  const w = width - m.left - m.right;
  const h = height - m.top - m.bottom;

  const seriesEls = childArr.filter(c => {
    const t = c.type as SovereignChild;
    return t._sovereignType === "Line" || t._sovereignType === "Area" || t._sovereignType === "Bar";
  });
  const tooltipEl = childArr.find(c => (c.type as SovereignChild)._sovereignType === "Tooltip");
  const xAxisEl = childArr.find(c => (c.type as SovereignChild)._sovereignType === "XAxis");
  const yAxisEl = childArr.find(c => (c.type as SovereignChild)._sovereignType === "YAxis");
  const gridEl = childArr.find(c => (c.type as SovereignChild)._sovereignType === "CartesianGrid");

  // Passthrough raw SVG elements like <defs> blocks and gradient/pattern/filter definitions.
  // These are inserted verbatim at the top of the SVG so url(#id) references resolve.
  const passthroughEls = childArr.filter(c => {
    if (!React.isValidElement(c)) return false;
    if (typeof c.type !== "string") return false;
    return c.type === "defs" || c.type === "linearGradient" || c.type === "radialGradient"
      || c.type === "pattern" || c.type === "clipPath" || c.type === "filter";
  });
  // Separate <defs> blocks (already wrapped) from bare gradient/filter elements that need wrapping
  const defsBlocks = passthroughEls.filter(c => (c as React.ReactElement).type === "defs");
  const bareDefsEls = passthroughEls.filter(c => (c as React.ReactElement).type !== "defs");

  const dataKeys = seriesEls
    .map(c => (c.props as { dataKey?: string }).dataKey)
    .filter((k): k is string => typeof k === "string");

  const seriesProps = seriesEls.map(c => c.props as { stroke?: string; fill?: string });

  const [yMin, yMax] = numExtent(data, dataKeys);

  const xDataKey = (xAxisEl?.props as { dataKey?: string } | undefined)?.dataKey;
  const hideX = (xAxisEl?.props as { hide?: boolean } | undefined)?.hide ?? false;
  const hideY = (yAxisEl?.props as { hide?: boolean } | undefined)?.hide ?? false;
  const gridStroke = (gridEl?.props as { stroke?: string } | undefined)?.stroke ?? "rgba(255,255,255,0.05)";
  const gridDash = (gridEl?.props as { strokeDasharray?: string } | undefined)?.strokeDasharray ?? "3 3";
  const xTickProps = (xAxisEl?.props as { tick?: { fontSize?: number; fill?: string } } | undefined)?.tick;
  const xTickFontSize = xTickProps?.fontSize ?? 9;
  const xTickFill = xTickProps?.fill ?? "#888";

  const tooltipProps: TooltipChildProps | null = tooltipEl
    ? (tooltipEl.props as TooltipChildProps)
    : null;

  const legendPayload = buildLegendPayload(dataKeys, seriesProps);
  const legendNode = renderLegendNode(legendEl, legendPayload, height);

  // render series
  const seriesNodes = seriesEls.map((c, ki) => {
    const color = CHART_COLORS[ki % CHART_COLORS.length];
    const type = (c.type as SovereignChild)._sovereignType;
    const props = c.props as {
      dataKey?: string;
      stroke?: string;
      fill?: string;
      strokeWidth?: number;
      dot?: boolean;
      radius?: [number, number, number, number] | number;
    };
    const dk = props.dataKey ?? "value";
    const stroke = props.stroke ?? color;
    const fill = props.fill ?? color;
    const sw = props.strokeWidth ?? 2;
    const dot = props.dot ?? false;

    const pts = data.map((d, i) => ({
      x: px(i, data.length, w),
      y: py(Number(d[dk]) || 0, yMin, yMax, h),
    }));

    if (type === "Line") {
      if (pts.length < 2) return null;
      const d = monotonePath(pts);
      return (
        <g key={ki} transform={`translate(${m.left},${m.top})`}>
          <path d={d} fill="none" stroke={stroke} strokeWidth={sw} />
          {dot && pts.map((pt, i) => <circle key={i} cx={pt.x} cy={pt.y} r={3} fill={stroke} />)}
        </g>
      );
    }

    if (type === "Area") {
      if (pts.length < 2) return null;
      const linePath = monotonePath(pts);
      const areaPath = `${linePath} L${pts[pts.length - 1].x},${h} L${pts[0].x},${h} Z`;
      return (
        <g key={ki} transform={`translate(${m.left},${m.top})`}>
          <path d={areaPath} fill={fill} strokeWidth={0} />
          <path d={linePath} fill="none" stroke={stroke} strokeWidth={sw} />
        </g>
      );
    }

    if (type === "Bar") {
      const bw = data.length > 0 ? Math.max(2, (w / data.length) * 0.65) : 10;
      const r = Array.isArray(props.radius) ? props.radius[0] : (props.radius ?? 0);
      return (
        <g key={ki} transform={`translate(${m.left},${m.top})`}>
          {data.map((d, i) => {
            const val = Number(d[dk]) || 0;
            const bx = px(i, data.length, w) - bw / 2;
            const by = py(val, yMin, yMax, h);
            const bh = Math.max(0, h - by);
            return <rect key={i} x={bx} y={by} width={bw} height={bh} fill={fill} rx={r} ry={r} />;
          })}
        </g>
      );
    }

    return null;
  });

  // grid
  const gridNode = gridEl ? (
    <g transform={`translate(${m.left},${m.top})`}>
      {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => (
        <line
          key={i}
          x1={0} y1={frac * h} x2={w} y2={frac * h}
          stroke={gridStroke} strokeDasharray={gridDash}
        />
      ))}
    </g>
  ) : null;

  // y axis
  const yAxisNode = !hideY ? (
    <g transform={`translate(${m.left},${m.top})`}>
      {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => {
        const val = yMin + frac * (yMax - yMin);
        const y = h - frac * h;
        const label = Math.abs(val) >= 1000 ? `${(val / 1000).toFixed(0)}k` : val.toFixed(1);
        return (
          <text key={i} x={-6} y={y + 4} textAnchor="end" fontSize={9} fill="#888">{label}</text>
        );
      })}
    </g>
  ) : null;

  // x axis
  const xAxisNode = !hideX && data.length > 0 ? (
    <g transform={`translate(${m.left},${m.top + h})`}>
      {data.map((d, i) => {
        if (data.length > 10 && i % Math.ceil(data.length / 6) !== 0 && i !== data.length - 1) return null;
        const x = px(i, data.length, w);
        const label = xDataKey ? String(d[xDataKey] ?? i) : String(i);
        return (
          <text key={i} x={x} y={16} textAnchor="middle" fontSize={xTickFontSize} fill={xTickFill}>{label}</text>
        );
      })}
    </g>
  ) : null;

  // inline tooltip overlay (hover-driven)
  function ChartWithTooltip() {
    const [hover, setHover] = useState<{ index: number; x: number; y: number } | null>(null);

    const handleMove = useCallback((e: React.MouseEvent<SVGRectElement>) => {
      if (!tooltipProps) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const relX = e.clientX - rect.left;
      const frac = relX / rect.width;
      const idx = Math.max(0, Math.min(data.length - 1, Math.round(frac * (data.length - 1))));
      setHover({ index: idx, x: m.left + px(idx, data.length, w), y: m.top + h / 2 });
    }, []);

    const { contentStyle, labelStyle, labelFormatter, formatter, content: TooltipContent } = tooltipProps ?? {};

    const hoverPayload: TooltipPayloadEntry[] | undefined = hover
      ? dataKeys.map((key, ki) => {
          const raw = data[hover.index]?.[key];
          return {
            name: key,
            dataKey: key,
            value: typeof raw === "number" ? raw : Number(raw),
            color: seriesProps[ki]?.stroke ?? seriesProps[ki]?.fill ?? CHART_COLORS[ki % CHART_COLORS.length],
            payload: data[hover.index] as Record<string, unknown>,
          };
        })
      : undefined;

    const labelValue = hover != null
      ? (xDataKey ? String(data[hover.index]?.[xDataKey] ?? hover.index) : `Sample ${hover.index}`)
      : undefined;

    return (
      <svg width={width} height={height} style={{ overflow: "visible" }}>
        {defsBlocks}
        {bareDefsEls.length > 0 && <defs>{bareDefsEls}</defs>}
        {gridNode}
        {yAxisNode}
        {xAxisNode}
        {seriesNodes}
        {legendNode}
        {hover && (
          <>
            <line
              x1={hover.x} y1={m.top}
              x2={hover.x} y2={m.top + h}
              stroke="rgba(255,255,255,0.2)" strokeWidth={1} pointerEvents="none"
            />
            <foreignObject
              x={Math.min(hover.x + 8, width - 170)}
              y={Math.max(m.top, hover.y - 40)}
              width={160} height={130}
              overflow="visible"
              style={{ pointerEvents: "none" }}
            >
              {TooltipContent ? (
                React.isValidElement(TooltipContent)
                  ? React.cloneElement(TooltipContent as React.ReactElement<{ active?: boolean; payload?: TooltipPayloadEntry[]; label?: string | number }>, { active: true, payload: hoverPayload, label: labelValue })
                  : React.createElement(TooltipContent as React.ComponentType<{ active?: boolean; payload?: TooltipPayloadEntry[]; label?: string | number }>, { active: true, payload: hoverPayload, label: labelValue })
              ) : (
                <div style={{
                  background: "#111",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 8,
                  padding: "6px 10px",
                  fontSize: 11,
                  fontFamily: "monospace",
                  color: "#ddd",
                  ...contentStyle,
                }}>
                  {labelStyle?.display !== "none" && (
                    <div style={{ marginBottom: 2, opacity: 0.6, fontSize: 10, ...labelStyle }}>
                      {labelFormatter ? labelFormatter(hover.index) : labelValue}
                    </div>
                  )}
                  {dataKeys.map((key, ki) => {
                    const raw = data[hover.index]?.[key];
                    const val = typeof raw === "number" ? raw : Number(raw);
                    const [displayVal, displayName] = formatter
                      ? formatter(val, key)
                      : [isFinite(val) ? val.toFixed(2) : String(raw ?? ""), key];
                    return (
                      <div key={key} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 1 }}>
                        <div style={{ width: 6, height: 6, borderRadius: 1, background: CHART_COLORS[ki % CHART_COLORS.length], flexShrink: 0 }} />
                        <span style={{ opacity: 0.7 }}>{displayName}:</span>
                        <span style={{ fontWeight: 600 }}>{displayVal}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </foreignObject>
          </>
        )}
        {tooltipProps && (
          <rect
            x={m.left} y={m.top} width={w} height={h}
            fill="transparent"
            onMouseMove={handleMove}
            onMouseLeave={() => setHover(null)}
          />
        )}
      </svg>
    );
  }

  return <ChartWithTooltip />;
}

// ─── Public recharts-compatible chart components ─────────────────────────────

export function LineChart({ data = [], children, width = 300, height = 200 }: {
  data?: DataPoint[];
  children?: React.ReactNode;
  width?: number;
  height?: number;
}) {
  return buildRechartsSVG(data, children, width, height);
}

export function AreaChart({ data = [], children, width = 300, height = 200 }: {
  data?: DataPoint[];
  children?: React.ReactNode;
  width?: number;
  height?: number;
}) {
  return buildRechartsSVG(data, children, width, height);
}

export function BarChart({ data = [], children, width = 300, height = 200 }: {
  data?: DataPoint[];
  children?: React.ReactNode;
  width?: number;
  height?: number;
}) {
  return buildRechartsSVG(data, children, width, height);
}

// ─── Helper: build pie SVG ────────────────────────────────────────────────────
function buildPieSVG(
  children: React.ReactNode,
  width: number,
  height: number,
): React.ReactElement {
  const childArr = React.Children.toArray(children) as React.ReactElement[];
  const legendEl = childArr.find(c => (c.type as SovereignChild)._sovereignType === "Legend");
  const tooltipEl = childArr.find(c => (c.type as SovereignChild)._sovereignType === "Tooltip");
  const pieEls = childArr.filter(c => (c.type as SovereignChild)._sovereignType === "Pie");

  function PieSVG() {
    const [hoverIdx, setHoverIdx] = useState<number | null>(null);

    if (pieEls.length === 0) {
      return <svg width={width} height={height} />;
    }

    const pieEl = pieEls[0];
    const pieProps = pieEl.props as {
      data?: DataPoint[];
      dataKey?: string;
      nameKey?: string;
      cx?: number | string;
      cy?: number | string;
      innerRadius?: number;
      outerRadius?: number;
      paddingAngle?: number;
      children?: React.ReactNode;
    };

    const pieData = pieProps.data ?? [];
    const dataKey = pieProps.dataKey ?? "value";
    const nameKey = pieProps.nameKey ?? "name";
    const outerRadius = pieProps.outerRadius ?? Math.min(width, height) * 0.38;
    const innerRadius = pieProps.innerRadius ?? 0;
    const paddingAngle = pieProps.paddingAngle ?? 2;

    const cxRaw = pieProps.cx ?? "50%";
    const cyRaw = pieProps.cy ?? "50%";
    const cx = typeof cxRaw === "string" && cxRaw.endsWith("%")
      ? (parseFloat(cxRaw) / 100) * width
      : Number(cxRaw);
    const cy = typeof cyRaw === "string" && cyRaw.endsWith("%")
      ? (parseFloat(cyRaw) / 100) * height
      : Number(cyRaw);

    const total = pieData.reduce((sum, d) => sum + (Number(d[dataKey]) || 0), 0);

    // Get per-slice Cell colors from Pie children
    const cellColors: string[] = [];
    if (pieProps.children) {
      React.Children.forEach(pieProps.children, (child, idx) => {
        if (React.isValidElement(child)) {
          const cellProps = child.props as { fill?: string };
          cellColors[idx] = cellProps.fill ?? CHART_COLORS[idx % CHART_COLORS.length];
        }
      });
    }

    const slices: Array<{
      path: string;
      color: string;
      name: string;
      value: number;
      midAngle: number;
    }> = [];

    if (total > 0) {
      const pad = (paddingAngle * Math.PI) / 180;
      let startAngle = -Math.PI / 2;

      pieData.forEach((d, i) => {
        const val = Number(d[dataKey]) || 0;
        const sweep = (val / total) * (2 * Math.PI) - pad;
        if (sweep <= 0) return;
        const endAngle = startAngle + sweep;
        const midAngle = startAngle + sweep / 2;

        const x1 = cx + outerRadius * Math.cos(startAngle);
        const y1 = cy + outerRadius * Math.sin(startAngle);
        const x2 = cx + outerRadius * Math.cos(endAngle);
        const y2 = cy + outerRadius * Math.sin(endAngle);
        const ix1 = cx + innerRadius * Math.cos(endAngle);
        const iy1 = cy + innerRadius * Math.sin(endAngle);
        const ix2 = cx + innerRadius * Math.cos(startAngle);
        const iy2 = cy + innerRadius * Math.sin(startAngle);
        const largeArc = sweep > Math.PI ? 1 : 0;

        let path: string;
        if (innerRadius > 0) {
          path = [
            `M${x1},${y1}`,
            `A${outerRadius},${outerRadius} 0 ${largeArc} 1 ${x2},${y2}`,
            `L${ix1},${iy1}`,
            `A${innerRadius},${innerRadius} 0 ${largeArc} 0 ${ix2},${iy2}`,
            "Z",
          ].join(" ");
        } else {
          path = [
            `M${cx},${cy}`,
            `L${x1},${y1}`,
            `A${outerRadius},${outerRadius} 0 ${largeArc} 1 ${x2},${y2}`,
            "Z",
          ].join(" ");
        }

        slices.push({
          path,
          color: cellColors[i] ?? CHART_COLORS[i % CHART_COLORS.length],
          name: String(d[nameKey] ?? i),
          value: val,
          midAngle,
        });

        startAngle = endAngle + pad;
      });
    }

    const legendPayload = slices.map((s) => ({ value: s.name, dataKey: s.name, color: s.color }));
    const legendNode = renderLegendNode(legendEl, legendPayload, height);

    const tooltipProps: TooltipChildProps | null = tooltipEl
      ? (tooltipEl.props as TooltipChildProps)
      : null;

    const hoveredSlice = hoverIdx != null ? slices[hoverIdx] : null;
    const hoverPayload: TooltipPayloadEntry[] | undefined = hoveredSlice
      ? [{ name: hoveredSlice.name, dataKey: dataKey, value: hoveredSlice.value, color: hoveredSlice.color }]
      : undefined;

    return (
      <svg width={width} height={height} style={{ overflow: "visible" }}>
        {slices.map((slice, i) => {
          const isHovered = hoverIdx === i;
          const scale = isHovered ? 1.04 : 1;
          return (
            <path
              key={i}
              d={slice.path}
              fill={slice.color}
              stroke="rgba(0,0,0,0.3)"
              strokeWidth={1}
              transform={isHovered ? `translate(${(cx * (1 - scale)).toFixed(2)},${(cy * (1 - scale)).toFixed(2)}) scale(${scale})` : undefined}
              onMouseEnter={() => tooltipProps && setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
              style={{ cursor: tooltipProps ? "pointer" : undefined, transition: "transform 0.15s" }}
            />
          );
        })}
        {legendNode}
        {hoveredSlice && tooltipProps && hoverPayload && (() => {
          const lx = cx + (outerRadius + 10) * Math.cos(hoveredSlice.midAngle);
          const ly = cy + (outerRadius + 10) * Math.sin(hoveredSlice.midAngle);
          const fx = Math.min(Math.max(lx, 10), width - 150);
          const fy = Math.min(Math.max(ly - 30, 4), height - 80);
          const { content: TooltipContent, contentStyle } = tooltipProps;
          return (
            <foreignObject x={fx} y={fy} width={145} height={70} overflow="visible" style={{ pointerEvents: "none" }}>
              {TooltipContent ? (
                React.isValidElement(TooltipContent)
                  ? React.cloneElement(TooltipContent as React.ReactElement<{ active?: boolean; payload?: TooltipPayloadEntry[]; label?: string | number }>, { active: true, payload: hoverPayload, label: hoveredSlice.name })
                  : React.createElement(TooltipContent as React.ComponentType<{ active?: boolean; payload?: TooltipPayloadEntry[]; label?: string | number }>, { active: true, payload: hoverPayload, label: hoveredSlice.name })
              ) : (
                <div style={{
                  background: "#111",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 8,
                  padding: "6px 10px",
                  fontSize: 11,
                  fontFamily: "monospace",
                  color: "#ddd",
                  ...contentStyle,
                }}>
                  <div style={{ marginBottom: 2, opacity: 0.6, fontSize: 10 }}>{hoveredSlice.name}</div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <div style={{ width: 6, height: 6, borderRadius: 1, background: hoveredSlice.color, flexShrink: 0 }} />
                    <span style={{ fontWeight: 600 }}>{hoveredSlice.value.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </foreignObject>
          );
        })()}
      </svg>
    );
  }

  return <PieSVG />;
}

export function PieChart({ children, width = 300, height = 200 }: {
  data?: DataPoint[];
  children?: React.ReactNode;
  width?: number;
  height?: number;
}) {
  return buildPieSVG(children, width, height);
}

// ─── Series components ────────────────────────────────────────────────────────
export function Line(_props: {
  type?: "monotone" | "linear";
  dataKey: string;
  stroke?: string;
  strokeWidth?: number;
  dot?: boolean;
  isAnimationActive?: boolean;
}) { return null; }
(Line as SovereignChild)._sovereignType = "Line";

export function Area(_props: {
  type?: "monotone" | "linear";
  dataKey: string;
  stroke?: string;
  fill?: string;
  strokeWidth?: number;
}) { return null; }
(Area as SovereignChild)._sovereignType = "Area";

export function Bar(_props: {
  dataKey: string;
  fill?: string;
  radius?: [number, number, number, number] | number;
}) { return null; }
(Bar as SovereignChild)._sovereignType = "Bar";

// ─── Axis / Grid components ───────────────────────────────────────────────────
export function XAxis(_props: {
  dataKey?: string;
  hide?: boolean;
  tick?: { fontSize?: number; fill?: string } | boolean;
}) { return null; }
(XAxis as SovereignChild)._sovereignType = "XAxis";

export function YAxis(_props: {
  hide?: boolean;
}) { return null; }
(YAxis as SovereignChild)._sovereignType = "YAxis";

export function CartesianGrid(_props: {
  strokeDasharray?: string;
  stroke?: string;
}) { return null; }
(CartesianGrid as SovereignChild)._sovereignType = "CartesianGrid";

// ─── Pie / Cell ───────────────────────────────────────────────────────────────
export function Pie(_props: {
  data?: DataPoint[];
  dataKey?: string;
  nameKey?: string;
  cx?: number | string;
  cy?: number | string;
  innerRadius?: number;
  outerRadius?: number;
  paddingAngle?: number;
  children?: React.ReactNode;
  isAnimationActive?: boolean;
  label?: boolean | ((entry: { name?: string; value?: number; percent?: number }) => React.ReactNode);
}) { return null; }
(Pie as SovereignChild)._sovereignType = "Pie";

export function Cell(_props: {
  key?: string | number;
  fill?: string;
  stroke?: string;
}) { return null; }
(Cell as SovereignChild)._sovereignType = "Cell";

// ─── Tooltip / Legend ─────────────────────────────────────────────────────────
export function Tooltip(_props: {
  contentStyle?: CSSProperties;
  labelStyle?: CSSProperties;
  labelFormatter?: (v: string | number) => string | number;
  formatter?: (value: number, name: string) => [string | number, string];
  content?: React.ComponentType<{
    active?: boolean;
    payload?: TooltipPayloadEntry[];
    label?: string | number;
  }> | React.ReactElement;
}) { return null; }
(Tooltip as SovereignChild)._sovereignType = "Tooltip";

export function Legend(_props: {
  content?: React.ComponentType<{
    payload?: Array<{ value?: string; dataKey?: string; color?: string }>;
    verticalAlign?: "top" | "bottom";
  }> | React.ReactElement;
  verticalAlign?: "top" | "bottom";
  [key: string]: unknown;
}) { return null; }
(Legend as SovereignChild)._sovereignType = "Legend";
