/* C_Annual753_20261010. Pure arithmetic only; no account/storage APIs. */
(function (root) {
  'use strict';
  const INITIAL = 10000000, PRICE = 10000, YEARS = [5, 10, 15, 20];
  const rates = {sun: .07, partly_cloudy: .05, rain: .03};
  function priceRate(scenario, month) {
    if (!(Object.hasOwn(rates, scenario)) || !Number.isInteger(month) || month < 1 || month > 240) throw new RangeError('Invalid C scenario/month');
    if (scenario !== 'rain') return {price: PRICE, rate: rates[scenario]};
    for (const start of [1, 121]) {
      const k = month - start + 1;
      if (k >= 1 && k <= 6) return {price: PRICE * .95 ** k, rate: .03};
      if (k >= 7 && k <= 30) {
        const t = (k - 6) / 24, bottom = .95 ** 6;
        return {price: PRICE * (bottom + (1 - bottom) * t), rate: .03 + .02 * t};
      }
    }
    return {price: PRICE, rate: .05};
  }
  function simulate(scenario, years, withdrawal = false) {
    if (!YEARS.includes(years) || !(Object.hasOwn(rates, scenario)) || (withdrawal && scenario !== 'rain')) throw new RangeError('Invalid C inputs');
    let q = INITIAL / PRICE, accumulated = 0;
    const monthly = [];
    for (let month = 1; month <= years * 12; month++) {
      const {price, rate} = priceRate(scenario, month);
      const dividend = q * price * rate / 12;
      if (withdrawal) accumulated += dividend;
      else q += dividend / price;
      const account = q * price;
      monthly.push({month, price, annual_rate_pct: rate * 100, monthly_dividend_earned: dividend,
        account_value: account, accumulated_dividend_withdrawals: accumulated,
        total_value: account + accumulated, estimated_monthly_dividend: account * rate / 12});
    }
    const end = monthly[monthly.length - 1], tr = end.total_value - INITIAL;
    return {year: years, scenario: scenario + (withdrawal ? '_withdrawal' : '_reinvest'), initial_asset: INITIAL,
      initial_monthly_dividend_at_initial_7pct: INITIAL * .07 / 12,
      scenario_start_monthly_dividend_at_p0: INITIAL * rates[scenario] / 12,
      end_asset: end.account_value, end_monthly_dividend: end.estimated_monthly_dividend,
      accumulated_dividend_withdrawals: accumulated, fair_total: end.total_value, tr_krw: tr,
      tr_pct: tr / INITIAL * 100, monthly};
  }
  const api = Object.freeze({INITIAL, PRICE, YEARS: Object.freeze(YEARS), priceRate, simulate});
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.WeatherC = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
