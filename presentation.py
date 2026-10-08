"""Section 2 display only. Subtract existing Core metrics; never recompute NAV/TR."""
from decimal import Decimal, Context, localcontext, ROUND_HALF_EVEN

def period_presentation(view_model):
    values = view_model.get('performance') or {}
    raw, tr = values.get('nav_change'), values.get('navtr_change')
    if raw is None or tr is None:
        return {'reinvestment_effect_pp': None}
    with localcontext(Context(prec=40, rounding=ROUND_HALF_EVEN)):
        raw, tr = Decimal(str(raw)), Decimal(str(tr))
        if not raw.is_finite() or not tr.is_finite():
            return {'reinvestment_effect_pp': None}
        return {'reinvestment_effect_pp': str(tr - raw)}


def detail_presentation(view_model, bundle):
    """Display projection of original results and source fields. No finance engine."""
    from datetime import date
    import calendar
    out = period_presentation(view_model)
    out['health_display'] = health_presentation(view_model)
    import facts_projection
    d = view_model.get('distribution') or {}
    cutoff = d.get('ratio_as_of')
    if not cutoff:
        out.update(distribution_history=[], distribution_recent12=[])
        out['facts'] = facts_projection.facts_presentation(view_model,bundle,[])
        return out
    end = date.fromisoformat(cutoff)
    start = date(end.year - 1, end.month, min(end.day, calendar.monthrange(end.year - 1, end.month)[1])).isoformat()
    def day(value):
        value = str(value or '')
        return value[:4] + '-' + value[4:6] + '-' + value[6:8] if len(value) == 8 else value
    nav = {day(r.get('gijunYmd')):r.get('fp') for r in bundle.get('nav_rows',[])}
    field = view_model.get('distribution_date_field')
    source = {(day(r.get(field)), str(r.get('divAmt'))):r for r in bundle.get('distribution_rows',[])}
    rows = []
    for event in d.get('history') or []:
        r = source.get((event['date'], str(event['amount'])), {})
        rows.append({**event, 'nav':nav.get(event['date']), 'ratio':r.get('divRt')})
    out['distribution_history'] = sorted(rows, key=lambda r:(r.get('pay_date') or r['date'],r['date']), reverse=True)
    out['distribution_recent12'] = sorted([r for r in rows if start < r['date'] <= cutoff], key=lambda r:(r.get('pay_date') or r['date'],r['date']))
    out['facts'] = facts_projection.facts_presentation(view_model,bundle,out['distribution_recent12'])
    return out


def health_presentation(view_model):
    from datetime import date
    health = view_model.get('health') or {}
    end = (view_model.get('actual_period') or {}).get('end')
    display = {}
    for key in ('raw', 'navtr'):
        trough = health.get(key + '_trough_date')
        elapsed = None
        if health.get('status') == 'OK' and not health.get(key + '_recovered') and trough and end:
            elapsed = (date.fromisoformat(end) - date.fromisoformat(trough)).days
        display[key] = {'unrecovered_calendar_days':elapsed}
    return display
