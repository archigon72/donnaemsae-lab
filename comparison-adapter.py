"""Read-only joining adapter. All NAV and reinvestment calculations use original Core."""
from decimal import Decimal, localcontext, Context
import datetime
import period_bridge
import market_projection

def compare(bundles, etf_count, period, start=None, end=None):
    ranges = []
    dates = []
    for b in bundles:
        valid = set()
        for row in b.get('nav_rows', []):
            try:
                value = Decimal(str(row.get('fp')))
                day = period_bridge.adapter.day(row['gijunYmd'])
                datetime.date.fromisoformat(day)
                if value.is_finite() and value > 0:
                    valid.add(day)
            except (ValueError, TypeError, KeyError, ArithmeticError):
                continue
        dates.append(valid)
        ranges.append({'ticker': b['ticker'], 'start': min(valid) if valid else None, 'end': max(valid) if valid else None})
    def unavailable(message):
        return {'status': 'unavailable', 'message': message, 'ranges': ranges}
    if not 1 <= etf_count <= 3 or not 2 <= len(bundles) <= 5 or len(bundles)-etf_count > 2:
        return unavailable('ETF 1개 이상, 비교 대상 2개 이상이 필요합니다.')
    if len({b['ticker'] for b in bundles[:etf_count]}) != etf_count:
        return unavailable('중복 ETF 선택입니다.')
    if len({b['meta']['snapshot_id'] for b in bundles}) != 1:
        return unavailable('자료 기준점이 다릅니다.')
    common = sorted(set.intersection(*dates))
    if not common:
        return unavailable('대상 모두에 NAV가 있는 공통 관측일이 없습니다.')
    if period == '직접지정':
        try:
            datetime.date.fromisoformat(start)
            datetime.date.fromisoformat(end)
        except (ValueError, TypeError):
            return unavailable('시작일과 종료일을 올바르게 입력해 주세요.')
        if start > end:
            return unavailable('시작일이 종료일보다 늦습니다.')
    else:
        end = common[-1]
        last = datetime.date.fromisoformat(end)
        if period in ('1개월', '6개월'):
            start = str(period_bridge.adapter.shift_month(last, int(period[0])))
        elif period == '1년':
            start = str(period_bridge.adapter.shift_year(last, 1))
        elif period == '전체':
            start = common[0]
        else:
            return unavailable('지원하지 않는 기간입니다.')
    common = [d for d in common if start <= d <= end]
    # Same support floor as the existing market comparison adapter.
    if len(common) < 20:
        return unavailable('공통기간 자료 부족: 유효 관측일이 20개 미만입니다.')
    begin, finish = common[0], common[-1]
    models = [market_projection._core(b, begin, finish) for b in bundles]
    for b, model in zip(bundles, models):
        if model['status'] != 'OK':
            return unavailable(b['ticker'] + ': 기존 계산 엔진이 이 기간을 지원하지 않습니다. ' + str(model.get('issues', [])))
    points = [{r['date']: r for r in m['series']} for m in models]
    joint = [d for d in common if all(d in p for p in points)]
    if len(joint) < 20 or joint[0] != begin or joint[-1] != finish:
        return unavailable('계산 결과와 공통 NAV 날짜가 일치하지 않습니다.')
    series = [{'date': d, 'raw': [p[d]['raw_index'] for p in points], 'tr': [p[d]['tr_index'] for p in points]} for d in joint]
    # Preserve Core's first-day dividend convention, as existing market_projection does.
    anchored = any(Decimal(str(x)) != 100 for x in series[0]['tr'])
    if anchored:
        series.insert(0, {'date': begin, 'raw': ['100'] * len(points), 'tr': ['100'] * len(points), 'baseline': True})
    with localcontext(Context(prec=40)):
        base = Decimal(models[0]['performance']['navtr_change'])
        returns = [{'ticker': b['ticker'], 'tr_return': m['performance']['navtr_change'], 'difference_pp': str(Decimal(m['performance']['navtr_change'])-base)} for b, m in zip(bundles, models)]
    return {'status': 'OK', 'actual_period': {'start': begin, 'end': finish}, 'requested_period': {'start': start, 'end': end}, 'ranges': ranges, 'returns': returns, 'series': series, 'observations': len(joint), 'initial_anchor_added': anchored, 'policy': 'exact common observation dates; original Core; pre-dividend starting capital 100', 'raw_supported': True}
