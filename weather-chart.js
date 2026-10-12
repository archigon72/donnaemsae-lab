/* Chart values come directly from C monthly results; no independent calculations. */
(function (root) {
  'use strict';
  function points(result, metric) {
    return [{month: 0, value: metric === 'total' ? result.initial_asset : result.scenario_start_monthly_dividend_at_p0},
      ...result.monthly.map(row => ({month: row.month, value: metric === 'total' ? row.total_value : row.estimated_monthly_dividend}))];
  }
  function svg(series, metric, years) {
    const width = 560, height = 240, left = 105, right = 18, top = 18, bottom = 39;
    const all = series.flatMap(s => s.points.map(p => p.value));
    const max = Math.ceil(Math.max(...all) * 1.08 / (metric === 'total' ? 1000000 : 10000)) * (metric === 'total' ? 1000000 : 10000);
    const x = m => left + m / (years * 12) * (width - left - right);
    const y = v => height - bottom - v / max * (height - top - bottom);
    const label = metric === 'total' ? '기간 총가치 (만원)' : '예상 월 배당 (원/월)';
    let out = `<svg class="weather-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${years}년 ${label} 변화" data-metric="${metric}"><title>${label} · 가상 경과기간</title>`;
    for (let i = 0; i <= 4; i++) {
      const value = max * i / 4, yy = y(value);
      out += `<path d="M${left} ${yy}H${width-right}" stroke="#315465" stroke-width="1"/><text x="${left-9}" y="${yy+4}" text-anchor="end">${Math.round(metric === 'total' ? value / 10000 : value).toLocaleString('ko-KR')}</text>`;
    }
    for (let i = 0; i <= 4; i++) {
      const year = years * i / 4, xx = x(year * 12);
      out += `<path d="M${xx} ${top}V${height-bottom}" stroke="#244553" stroke-width="1"/><text x="${xx}" y="${height-15}" text-anchor="middle">${year === 0 ? '시작' : year+'년'}</text>`;
    }
    for (const s of series) {
      const d = s.points.map((p,i) => `${i?'L':'M'}${x(p.month).toFixed(3)} ${y(p.value).toFixed(3)}`).join(' ');
      const end = s.points[s.points.length-1];
      out += `<path class="weather-series" data-path="${s.id}" data-values='${JSON.stringify(s.points)}' d="${d}" fill="none" stroke="${s.color}" stroke-width="3" stroke-linejoin="round"/><circle cx="${x(end.month)}" cy="${y(end.value)}" r="4" fill="${s.color}"/>`;
    }
    return out + '</svg>';
  }
  const api = Object.freeze({points, svg});
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.WeatherChart = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
