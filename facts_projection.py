"""Section 6 historical display statistics, outside immutable Core."""
from decimal import Decimal, Context, localcontext, ROUND_HALF_EVEN
import re

CV_LIMITS=(Decimal('0.15'),Decimal('0.35'))
MOVEMENT_LIMITS=(Decimal('0.90'),Decimal('0.75'),Decimal('0.50'))

def cv_label(cv):
    return '비교적 안정적으로 지급' if cv <= CV_LIMITS[0] else '다소 변동성 있게 지급' if cv <= CV_LIMITS[1] else '변동성 있게 지급'

def movement_label(correlation):
    return '상당히 유사하게 움직임' if correlation >= MOVEMENT_LIMITS[0] else '대체로 유사하게 움직임' if correlation >= MOVEMENT_LIMITS[1] else '다소 차이가 있게 움직임' if correlation >= MOVEMENT_LIMITS[2] else '움직임 차이가 큰 편'

def correlation_projection(etf_series, official_tracking):
    if not official_tracking or official_tracking.get('basis') != 'official_index_total_return' or not official_tracking.get('stable_source'):
        return {'status':'unavailable','reason':'stable official tracking TR not supplied','correlation':None,'label':None}
    other=official_tracking.get('series') or []
    a={r['date']:Decimal(str(r['tr_index'])) for r in etf_series}
    b={r['date']:Decimal(str(r['tr_index'])) for r in other}
    dates_a=[r['date'] for r in etf_series];dates_b=[r['date'] for r in other]
    previous_a={dates_a[i]:dates_a[i-1] for i in range(1,len(dates_a))};previous_b={dates_b[i]:dates_b[i-1] for i in range(1,len(dates_b))}
    # Only genuinely matching adjacent observation intervals, never interpolate missing days.
    days=[d for d in sorted(set(a)&set(b)) if d in previous_a and previous_a.get(d)==previous_b.get(d)]
    if len(days)<2:return {'status':'unavailable','reason':'paired daily returns insufficient','correlation':None,'label':None}
    with localcontext(Context(prec=40,rounding=ROUND_HALF_EVEN)):
        x=[a[d]/a[previous_a[d]]-1 for d in days];y=[b[d]/b[previous_b[d]]-1 for d in days]
        xm=sum(x)/len(x);ym=sum(y)/len(y);xx=sum((v-xm)**2 for v in x);yy=sum((v-ym)**2 for v in y)
        if xx==0 or yy==0:return {'status':'unavailable','reason':'constant returns','correlation':None,'label':None}
        corr=sum((u-xm)*(v-ym) for u,v in zip(x,y))/(xx*yy).sqrt()
        return {'status':'OK','correlation':str(corr),'label':movement_label(corr),'paired_returns':len(days)}

def feature_projection(metadata,bundle):
    # Product name and classification are authoritative identity fields. Avoid
    # inferring active/leveraged strategies from explanatory negation sentences.
    name=metadata.get('name') or ''
    fields=[('FunETF/등록 상품명',name),('ZeroIn 전략',bundle.get('zeroin_metadata',{}).get('strategy') or ''),('기존 출처 전략',metadata.get('strategy') or ''),('기존 출처 분류',metadata.get('type') or '')]
    for token,label in [('커버드콜','커버드콜'),('고배당','고배당'),('액티브','액티브')]:
        if token in name:return {'label':label,'source_field':fields[0][0],'evidence':name}
    for field,text in fields[1:]:
        if re.search(r'(운용 방식은 액티브|액티브 전략|액티브 운용을)',text) and not re.search(r'(별도의 액티브|액티브.*(?:아니|않))',text):
            return {'label':'액티브','source_field':field,'evidence':text}
    if '배당' in name:return {'label':'배당','source_field':fields[0][0],'evidence':name}
    if re.search(r'(채권|국고채|국채|회사채)',name):return {'label':'채권','source_field':fields[0][0],'evidence':name}
    for field,text in fields[1:]:
        if re.search(r'(패시브|지수.*(?:추종|따라)|(?:추종|따라).*지수)',text):
            return {'label':'지수추종','source_field':field,'evidence':text}
    return {'label':None,'source_field':None,'evidence':None}

def monthly_stability(vm,bundle):
    """Twelve completed calendar months, original Core event-date mapping.
    Zero only when the full response and continuing operation are verifiable.
    Do not equate incomplete acquisition or prelisting months with no payout.
    """
    from datetime import date,timedelta
    import calendar
    def day(x):
        x=str(x or '')
        return x[:4]+'-'+x[4:6]+'-'+x[6:8] if len(x)==8 else x
    unavailable=lambda reason:{'status':'unavailable','label':None,'cv':None,'reason':reason,'monthly_amounts':[],'zero_months':[]}
    d=vm.get('distribution')or{};cutoff=d.get('ratio_as_of')
    if not cutoff or d.get('ratio_status')!='OK':return unavailable('full operating history insufficient')
    end=date.fromisoformat(cutoff)
    if end.day!=calendar.monthrange(end.year,end.month)[1]:end=end.replace(day=1)-timedelta(days=1)
    ordinal=end.year*12+end.month-1
    months=[f'{i//12:04}-{i%12+1:02}' for i in range(ordinal-11,ordinal+1)]
    begin=date.fromisoformat(months[0]+'-01');end_text=end.isoformat()
    rows=bundle.get('distribution_rows')or[];manifest=bundle.get('manifest')or{}
    totals={str(r.get('total')) for r in rows}
    if not rows or totals!={str(len(rows))}:return unavailable('distribution response completeness unverified')
    if manifest.get('source')!='FunETF' or (manifest.get('data_cutoff')or'')<end_text:return unavailable('source cutoff or identity unverified')
    nav=bundle.get('nav_rows')or[]
    if manifest.get('observations')!=len(nav):return unavailable('NAV acquisition incomplete')
    dates=sorted({day(r.get('gijunYmd')) for r in nav if r.get('fp') is not None})
    if not dates or dates[0]>begin.isoformat() or dates[-1]<end_text:return unavailable('prelisting or incomplete NAV coverage')
    # Conservative coverage checks; never assume a month with unknown acquisition is zero.
    unknown=set((bundle.get('distribution_coverage')or{}).get('unknown_months')or[])
    proofs=[]
    for month in months:
        first=date.fromisoformat(month+'-01');last=first.replace(day=calendar.monthrange(first.year,first.month)[1])
        days=[date.fromisoformat(x) for x in dates if x.startswith(month)]
        checkpoints=[first]+days+[last]
        gap=max((b-a).days for a,b in zip(checkpoints,checkpoints[1:]))
        if month in unknown or len(days)<15 or gap>10:return unavailable('monthly source or operating coverage uncertain: '+month)
        proofs.append({'month':month,'nav_observations':len(days),'max_calendar_gap':gap})
    field=vm.get('distribution_date_field')
    if not field:return unavailable('distribution date mapping unknown')
    # Use the same event date and amount contract as the existing Core; do not invent pay dates.
    raw=[(day(r.get(field)),str(r.get('divAmt'))) for r in rows if begin.isoformat()<=day(r.get(field))<=end_text]
    events=[r for r in d.get('history')or[] if begin.isoformat()<=r['date']<=end_text]
    if sorted(raw)!=sorted((r['date'],str(r['amount'])) for r in events):return unavailable('source events and Core mapping do not reconcile')
    amounts={m:Decimal(0) for m in months};counts={m:0 for m in months}
    with localcontext(Context(prec=40,rounding=ROUND_HALF_EVEN)):
        for r in events:
            value=Decimal(str(r['amount']))
            if not value.is_finite() or value<0:return unavailable('invalid monthly payment amount')
            m=r['date'][:7];amounts[m]+=value;counts[m]+=1
        values=list(amounts.values());mean=sum(values)/12
        if mean<=0:return unavailable('positive monthly mean insufficient')
        sd=(sum((v-mean)**2 for v in values)/12).sqrt();cv=sd/mean
        return {'status':'OK','cv':str(cv),'label':cv_label(cv),'event_count':len(events),'standard_deviation':'population N=12','window':{'start':begin.isoformat(),'end':end_text},'month_basis':'existing Core mapped distribution event date','mean':str(mean),'stddev':str(sd),'monthly_amounts':[{'month':m,'amount':str(amounts[m]),'events':counts[m]} for m in months],'zero_months':[m for m in months if counts[m]==0],'coverage':{'distribution_total':len(rows),'response_rows':len(rows),'nav_months':proofs}}

def facts_presentation(vm,bundle,distribution_recent12):
    metadata=vm.get('metadata')or{}
    stability=monthly_stability(vm,bundle)
    # Never substitute a selected representative ETF for the tracking index.
    tracking=(vm.get('market') or {}).get('official_tracking') if metadata.get('benchmark') else None
    movement=correlation_projection(vm.get('series')or[],tracking)
    return {'stability':stability,'movement':movement,'feature':feature_projection(metadata,bundle),'threshold_version':'provisional-v1','cv_thresholds':['0.15','0.35'],'correlation_thresholds':['0.90','0.75','0.50']}
