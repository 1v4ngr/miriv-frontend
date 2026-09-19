import type { ChartSeries } from './components/series-chart'
import type { SeriesResponse } from './services/tracking-api'
import { contentColors } from './utils'

/**
 * One line per content × parameter. Requested contents get their own colour by position; an ancestor
 * (origin) reuses the colour of the content it flows into and is drawn dashed by the chart.
 */
export function buildChartSeries(data: SeriesResponse): ChartSeries[] {
  const colorOf = new Map<string, string>()
  data.contents.filter((content) => !content.ancestor).forEach((content, index) => colorOf.set(content.code, contentColors[index % contentColors.length]))
  return data.contents.flatMap((content) => data.parameters.map((parameter) => ({
    content,
    parameter,
    color: colorOf.get(content.ancestor ? content.descendantCode ?? '' : content.code) ?? contentColors[0],
    points: data.points.filter((point) => point.content === content.code && point.parameter === parameter.code),
    target: data.targets.find((target) => target.content === content.code && target.parameter === parameter.code),
  })))
}
