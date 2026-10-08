"""Comparison adapter: original Core only; Decimal subtraction and series joining for display."""
import json
from decimal import Decimal, localcontext, Context, ROUND_HALF_EVEN
from collections import OrderedDict
import period_bridge
CACHE=OrderedDict()

def _core(bundle,start,end):
    key=(bundle['ticker'],bundle['meta']['snapshot_id'],bundle['manifest']['sha256']['nav_response.json'],bundle['manifest']['sha256']['distribution_response.json'],start,end)
    if key in CACHE:
        CACHE.move_to_end(key);return CACHE[key]
    adapter=period_bridge.adapter;row=None
    if adapter.identity(bundle['ticker']) is None:
        identity=bundle['reference_identity'];row={'ticker':identity['ticker'],'isin':identity['isin'],'official_name':identity['name'],'universe_status':'INCLUDED'}
        adapter.UNIVERSE.append(row)
    try:
        value=period_bridge.run_period({**bundle,'period':'직접지정'},start,end)
    finally:
        if row is not None:adapter.UNIVERSE.remove(row)
    CACHE[key]=value
    while len(CACHE)>12:CACHE.popitem(last=False)
    return value

def compare_market(etf_bundle,reference_bundles,start,end):
    if not 1 <= len(reference_bundles) <= 2 or len({b['ticker'] for b in reference_bundles})!=len(reference_bundles):
        raise ValueError('Select one or two distinct reference markets')
    snapshot=etf_bundle['meta']['snapshot_id']
    if any(b['meta']['snapshot_id']!=snapshot for b in reference_bundles):raise ValueError('Snapshot mismatch')
    all_bundles=[etf_bundle]+reference_bundles
    dates=[{period_bridge.adapter.day(r['gijunYmd']) for r in b['nav_rows'] if r.get('fp') is not None} for b in all_bundles]
    common=sorted(d for d in set.intersection(*dates) if start<=d<=end)
    if len(common)<20:return {'status':'unavailable','message':'공통기간 자료 부족 (20개 관측 미만)','requested_period':{'start':start,'end':end}}
    begin,finish=common[0],common[-1];models=[_core(b,begin,finish) for b in all_bundles]
    if any(m['status']!='OK' for m in models):return {'status':'unavailable','message':'해당 공통기간의 NAV-TR 계산 미지원','core_statuses':[m['status'] for m in models]}
    points=[{r['date']:r['tr_index'] for r in m['series']} for m in models]
    chart_dates=sorted(set.intersection(*(set(p) for p in points)))
    series=[{'date':d,'values':[p[d] for p in points]} for d in chart_dates]
    # Original Core can reinvest a dividend on the first date. Its initial reference
    # capital is 100 before that event. Expose that anchor, never rescale Core gains.
    anchored=any(Decimal(p[chart_dates[0]])!=100 for p in points)
    if anchored:series.insert(0,{'date':chart_dates[0],'values':['100']*len(points),'baseline':True})
    etf_return=models[0]['performance']['navtr_change']
    with localcontext(Context(prec=40,rounding=ROUND_HALF_EVEN)):
        references=[{**b['reference_identity'],'tr_return':m['performance']['navtr_change'],'excess_pp':str(Decimal(etf_return)-Decimal(m['performance']['navtr_change']))} for b,m in zip(reference_bundles,models[1:])]
    return {'status':'OK','requested_period':{'start':start,'end':end},'actual_period':{'start':begin,'end':finish},'shortened':begin!=start or finish!=end,'etf_return':etf_return,'references':references,'series':series,'initial_anchor_added':anchored,'policy':'exact_common_dates; original Core re-executed only inside common window; no interpolation; initial pre-dividend capital=100','basis':'KRW representative pure-index ETF NAV-TR; not official index provider TR'}
