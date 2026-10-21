"use client"

import { PointerEvent, WheelEvent, useEffect, useMemo, useRef, useState } from "react"
import { dnaLength, gcPercent, restrictionSites } from "@/lib/sequence"
import type { SequenceFeature, SequenceRecord } from "@/lib/types"

function polar(cx: number, cy: number, radius: number, angle: number) {
  const radians = angle * Math.PI / 180
  return { x: cx + radius * Math.cos(radians), y: cy + radius * Math.sin(radians) }
}

function midpointAngle(start: number, end: number) {
  let adjustedEnd = end
  while (adjustedEnd < start) adjustedEnd += 360
  return (start + adjustedEnd) / 2
}

function arcPath(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  let normalizedEnd = endAngle
  while (normalizedEnd <= startAngle) normalizedEnd += 360
  const delta = Math.min(359.999, normalizedEnd - startAngle)
  const start = polar(cx, cy, radius, startAngle)
  const end = polar(cx, cy, radius, startAngle + delta)
  const largeArc = delta > 180 ? 1 : 0
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`
}

function niceTick(length: number) {
  if (length <= 2_000) return 250
  if (length <= 8_000) return 1_000
  if (length <= 20_000) return 2_500
  return 5_000
}

function ArrowHead({ cx, cy, radius, angle, color, direction }: { cx: number; cy: number; radius: number; angle: number; color: string; direction: 1 | -1 }) {
  const tip = polar(cx, cy, radius, angle)
  const tangent = angle + (direction === 1 ? 90 : -90)
  const left = polar(tip.x, tip.y, 11, tangent + 140)
  const right = polar(tip.x, tip.y, 11, tangent - 140)
  return <polygon points={`${tip.x},${tip.y} ${left.x},${left.y} ${right.x},${right.y}`} fill={color}/>
}

function LinearSequenceMap({ record, selectedFeatureId, onSelectFeature, showRestrictionSites }: { record: SequenceRecord; selectedFeatureId: string; onSelectFeature: (id: string) => void; showRestrictionSites: boolean }) {
  const length = Math.max(1, dnaLength(record.sequence))
  const cuts = restrictionSites(record.sequence, false).flatMap(enzyme => enzyme.matches.map(match => ({ enzyme: enzyme.name, position: match.position, cut: match.cutTop }))).slice(0, 90)
  const x = (position: number) => 70 + Math.max(0, Math.min(length, position)) / length * 760

  return <div className="mapCanvasV1 linearMapCanvas"><svg className="linearSequenceMapSvg" viewBox="0 0 900 390">
    <defs><filter id="linearShadow" x="-30%" y="-50%" width="160%" height="200%"><feDropShadow dx="0" dy="5" stdDeviation="8" floodColor="#18352b" floodOpacity=".09"/></filter></defs>
    <rect x="35" y="45" width="830" height="280" rx="24" fill="#fff" stroke="#e0e9e5" filter="url(#linearShadow)"/>
    <text x="70" y="83" className="linearMapTitle">{record.name}</text>
    <text x="830" y="83" textAnchor="end" className="linearMapMeta">{dnaLength(record.sequence).toLocaleString()} bp · Linear</text>
    <line x1="70" y1="195" x2="830" y2="195" stroke="#9fb7ad" strokeWidth="8" strokeLinecap="round"/>
    {Array.from({ length: 11 }).map((_, index) => { const position = Math.round(length * index / 10); const px = x(position); return <g key={index}><line x1={px} y1="181" x2={px} y2="209" stroke="#8ca49a"/><text x={px} y="229" textAnchor="middle" className="linearTickLabel">{position.toLocaleString()}</text></g> })}
    {record.features.map((feature, index) => {
      const start = x(feature.start); const end = x(feature.end + 1); const width = Math.max(7, end - start); const lane = index % 2 === 0 ? 145 : 245; const selected = selectedFeatureId === feature.id
      const points = feature.direction === 1 ? `${start},${lane - 12} ${start + Math.max(0,width-10)},${lane-12} ${start+width},${lane} ${start+Math.max(0,width-10)},${lane+12} ${start},${lane+12}` : `${start+width},${lane-12} ${start+10},${lane-12} ${start},${lane} ${start+10},${lane+12} ${start+width},${lane+12}`
      return <g key={feature.id} className="mapFeatureGroup" onClick={() => onSelectFeature(feature.id)}><polygon points={points} fill={feature.color} opacity={selected ? 1 : .82} stroke={selected ? "#173f35" : "none"} strokeWidth="2"/><text x={start + width/2} y={lane + (lane < 195 ? -20 : 31)} textAnchor="middle" className={selected ? "linearFeatureLabel active" : "linearFeatureLabel"}>{feature.name} {feature.direction === -1 ? "←" : "→"}</text></g>
    })}
    {showRestrictionSites && cuts.map((cut,index) => { const px=x(cut.position); return <g key={`${cut.enzyme}-${cut.position}-${index}`}><line x1={px} y1="174" x2={px} y2="216" stroke="#b44b5c" strokeWidth="1.2"/><text x={px+3} y="169" className="linearCutLabel">{cut.enzyme} {cut.cut === null ? "" : `cut ${cut.cut + 1}`}</text></g> })}
  </svg></div>
}

function featureLength(feature: SequenceFeature) { return Math.max(0, feature.end - feature.start + 1) }

type Callout<T> = { item: T; angle: number; point: { x: number; y: number }; side: "left" | "right"; y: number }
function layoutCallouts<T>(items: { item: T; angle: number; point: { x: number; y: number } }[], minY = 80, maxY = 520, spacing = 24) {
  const sides: Record<"left" | "right", Callout<T>[]> = { left: [], right: [] }
  for (const entry of items) {
    const side = Math.cos(entry.angle * Math.PI / 180) >= 0 ? "right" : "left"
    sides[side].push({ ...entry, side, y: entry.point.y })
  }
  for (const side of ["left", "right"] as const) {
    sides[side].sort((a,b) => a.y-b.y)
    let cursor = minY
    for (const item of sides[side]) { item.y = Math.max(item.y, cursor); cursor = item.y + spacing }
    if (sides[side].length && sides[side][sides[side].length-1].y > maxY) {
      const overflow = sides[side][sides[side].length-1].y - maxY
      for (const item of sides[side]) item.y -= overflow
      for (let i=sides[side].length-2;i>=0;i--) sides[side][i].y = Math.min(sides[side][i].y, sides[side][i+1].y-spacing)
    }
  }
  return [...sides.left, ...sides.right]
}

export default function CircularSequenceMap({ record, selectedFeatureId, onSelectFeature, rotation, onRotationChange, zoom, onZoomChange, showRestrictionSites }: { record: SequenceRecord; selectedFeatureId: string; onSelectFeature: (id: string) => void; rotation: number; onRotationChange: (value: number) => void; zoom: number; onZoomChange: (value: number) => void; showRestrictionSites: boolean }) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const dragRef = useRef<{ pointerId: number; angle: number; rotation: number } | null>(null)
  const [hoveredFeatureId, setHoveredFeatureId] = useState("")
  const [autoRotate, setAutoRotate] = useState(false)
  const length = Math.max(dnaLength(record.sequence), 1)
  const sites = useMemo(() => restrictionSites(record.sequence, true), [record.sequence])

  useEffect(() => {
    if (record.topology === "Linear" || !autoRotate || dragRef.current) return
    const timer = window.setInterval(() => onRotationChange(rotation + 0.8), 32)
    return () => window.clearInterval(timer)
  }, [autoRotate, onRotationChange, record.topology, rotation])

  if (record.topology === "Linear") return <LinearSequenceMap record={record} selectedFeatureId={selectedFeatureId} onSelectFeature={onSelectFeature} showRestrictionSites={showRestrictionSites}/>

  const center = 300
  const backboneRadius = 180
  const secondFeatureRadius = 153
  const primerRadius = 211
  const siteRadius = 230
  const uniqueSites = sites.filter(site => site.matches.length === 1).flatMap(site => site.matches.map(match => ({ name: site.name, position: match.position, cut: match.cutTop, strand: match.strand }))).slice(0, 18)
  const allSitePositions = sites.flatMap(site => site.matches.map(match => ({ name: site.name, position: match.position, cut: match.cutTop }))).slice(0, 100)
  const tickStep = niceTick(length)
  const ticks = Array.from({ length: Math.floor(length / tickStep) + 1 }, (_, index) => index * tickStep).filter(value => value < length)
  const activeFeatureId = hoveredFeatureId || selectedFeatureId
  const activeFeature = record.features.find(feature => feature.id === activeFeatureId)
  const displayZoom = hoveredFeatureId ? Math.max(zoom, 1.08) : zoom

  function pointerAngle(event: PointerEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect(); if (!rect) return 0
    return Math.atan2(event.clientY - (rect.top + rect.height / 2), event.clientX - (rect.left + rect.width / 2)) * 180 / Math.PI
  }
  function startDrag(event: PointerEvent<SVGSVGElement>) { if (event.button !== 0) return; event.preventDefault(); setAutoRotate(false); dragRef.current={pointerId:event.pointerId,angle:pointerAngle(event),rotation}; event.currentTarget.setPointerCapture(event.pointerId) }
  function moveDrag(event: PointerEvent<SVGSVGElement>) { const drag=dragRef.current; if (!drag || drag.pointerId!==event.pointerId) return; onRotationChange(drag.rotation + pointerAngle(event)-drag.angle) }
  function endDrag(event: PointerEvent<SVGSVGElement>) { if (dragRef.current?.pointerId===event.pointerId) dragRef.current=null; try{event.currentTarget.releasePointerCapture(event.pointerId)}catch{} }
  function rotateWheel(event: WheelEvent<SVGSVGElement>) { event.preventDefault(); setAutoRotate(false); if (event.ctrlKey||event.metaKey) onZoomChange(Math.max(.72,Math.min(1.5,zoom+(event.deltaY<0?.06:-.06)))); else onRotationChange(rotation+Math.sign(event.deltaY)*6) }

  const featureCallouts = layoutCallouts(record.features.slice(0,30).map(feature => {
    const startAngle=(feature.start/length)*360-90; const endAngle=((feature.end+1)/length)*360-90; const angle=midpointAngle(startAngle+rotation,endAngle+rotation)
    return { item: feature, angle, point: polar(center,center,backboneRadius+17,angle) }
  }), 76, 524, 25)
  const restrictionCallouts = layoutCallouts(uniqueSites.map(site => {
    const angle=rotation+(site.position/length)*360-90
    return { item: site, angle, point: polar(center,center,siteRadius+8,angle) }
  }), 92, 510, 18)

  return <div className="circularStage">
    <div className="mapFloatingTools" aria-label="Plasmid map interaction controls"><button onClick={()=>{setAutoRotate(false);onRotationChange(rotation-20)}} title="Rotate left">↶</button><button onClick={()=>{setAutoRotate(false);onRotationChange(0)}} title="Reset: base 1 at 12 o'clock">0°</button><button onClick={()=>{setAutoRotate(false);onRotationChange(rotation+20)}} title="Rotate right">↷</button><i/><button onClick={()=>onZoomChange(Math.max(.72,zoom-.08))}>−</button><span>{Math.round(displayZoom*100)}%</span><button onClick={()=>onZoomChange(Math.min(1.5,zoom+.08))}>+</button></div>

    {activeFeature && <div className="mapSpotlightCard"><span>FEATURE SPOTLIGHT</span><strong>{activeFeature.name} <em>{activeFeature.direction === -1 ? "− strand" : "+ strand"}</em></strong><p>{activeFeature.type} · {activeFeature.start+1}–{activeFeature.end+1} · {featureLength(activeFeature).toLocaleString()} bp</p><small>{activeFeature.notes || (activeFeature.direction===1?"Forward-strand annotation":"Reverse-strand annotation")}</small></div>}

    <svg ref={svgRef} className="advancedPlasmidSvg" viewBox="0 0 600 600" role="img" aria-label={`Interactive circular map of ${record.name}`} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onWheel={rotateWheel} onPointerEnter={()=>setAutoRotate(true)} onPointerLeave={()=>{setAutoRotate(false);setHoveredFeatureId("")}}>
      <defs><radialGradient id="openlabDiscV2" cx="50%" cy="48%" r="78%"><stop offset="0%" stopColor="#ffffff"/><stop offset="70%" stopColor="#fcfefe"/><stop offset="100%" stopColor="#eef4f1"/></radialGradient><filter id="discShadowV2" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="14" stdDeviation="16" floodColor="#0e1728" floodOpacity=".09"/></filter></defs>
      <g transform={`translate(${center} ${center}) scale(${displayZoom}) translate(${-center} ${-center})`}>
        <circle cx={center} cy={center} r="258" fill="url(#openlabDiscV2)" stroke="#d8e4df" strokeWidth="1.2" filter="url(#discShadowV2)"/>
        <circle cx={center} cy={center} r={siteRadius} fill="none" stroke="#e6ece9" strokeWidth="1.2"/>
        <circle cx={center} cy={center} r={primerRadius} fill="none" stroke="#e3eff4" strokeWidth="5" opacity=".9"/>
        <circle cx={center} cy={center} r={backboneRadius} fill="none" stroke="#d7e8dd" strokeWidth="18"/>
        <circle cx={center} cy={center} r={secondFeatureRadius} fill="none" stroke="#edf3ef" strokeWidth="18"/>
        <circle cx={center} cy={center} r="76" fill="#fff" stroke="#e0e9e5" strokeWidth="1.2"/>

        <g transform={`rotate(${rotation} ${center} ${center})`}>
          {ticks.map(value => { const angle=(value/length)*360-90; const a=polar(center,center,siteRadius-3,angle); const b=polar(center,center,siteRadius+9,angle); return <line key={value} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#54647a" strokeWidth="1"/> })}
          <g className="mapOriginMarker"><line x1={center} y1={center-siteRadius-18} x2={center} y2={center-siteRadius+10} stroke="#173f35" strokeWidth="2.4"/><path d={`M ${center-5} ${center-siteRadius-14} L ${center} ${center-siteRadius-21} L ${center+5} ${center-siteRadius-14}`} fill="none" stroke="#173f35" strokeWidth="2"/></g>
          {record.features.map((feature,index)=>{ const startAngle=(feature.start/length)*360-90; const endAngle=((feature.end+1)/length)*360-90; const radius=index%2===0?backboneRadius:secondFeatureRadius; const hover=hoveredFeatureId===feature.id; const active=selectedFeatureId===feature.id||hover; return <g key={feature.id}><path d={arcPath(center,center,radius,startAngle,endAngle)} fill="none" stroke={feature.color} strokeWidth={active?27:21} strokeLinecap="round" className="interactiveArc" opacity={hoveredFeatureId&&!active?.34:.97} onPointerDown={e=>e.stopPropagation()} onPointerEnter={e=>{e.stopPropagation();setHoveredFeatureId(feature.id)}} onPointerLeave={()=>setHoveredFeatureId("")} onClick={e=>{e.stopPropagation();onSelectFeature(feature.id)}}><title>{feature.name} · {feature.start+1}–{feature.end+1} · {feature.direction===-1?"reverse":"forward"} strand</title></path><ArrowHead cx={center} cy={center} radius={radius} angle={feature.direction===1?endAngle:startAngle} color={feature.color} direction={feature.direction}/></g> })}
          {record.primers.map(primer=>{ const startAngle=(primer.start/length)*360-90; const endAngle=((primer.end+1)/length)*360-90; return <path key={primer.id} d={arcPath(center,center,primerRadius,startAngle,endAngle)} fill="none" stroke={primer.color} strokeWidth="6" strokeLinecap="round"><title>{primer.name}</title></path> })}
          {showRestrictionSites&&allSitePositions.map((site,index)=>{ const angle=(site.position/length)*360-90; const a=polar(center,center,siteRadius-5,angle); const b=polar(center,center,siteRadius+7,angle); return <line key={`${site.name}-${site.position}-${index}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#596985" strokeWidth="1.15"><title>{site.name} recognition {site.position+1}; top cut {site.cut===null?"outside sequence":site.cut+1}</title></line> })}
        </g>

        {featureCallouts.map(({item:feature,point,side,y})=>{ const active=activeFeatureId===feature.id; const x=side==="right"?548:52; const elbow=side==="right"?510:90; return <g key={`label-${feature.id}`} className="featureLabelGroup" onPointerDown={e=>e.stopPropagation()} onPointerEnter={()=>setHoveredFeatureId(feature.id)} onPointerLeave={()=>setHoveredFeatureId("")} onClick={e=>{e.stopPropagation();onSelectFeature(feature.id)}} opacity={hoveredFeatureId&&!active?.48:1}><polyline points={`${point.x},${point.y} ${elbow},${y} ${x},${y}`} fill="none" stroke={active?feature.color:"#b8c9c0"} strokeWidth={active?1.8:1}/><circle cx={point.x} cy={point.y} r={active?4:2.8} fill={feature.color}/><text x={x+(side==="right"?5:-5)} y={y} className={`featureLabel ${active?"active":""}`} textAnchor={side==="right"?"start":"end"} dominantBaseline="middle">{feature.name} {feature.direction===-1?"←":"→"}</text></g> })}

        {showRestrictionSites&&restrictionCallouts.map(({item:site,point,side,y})=>{ const x=side==="right"?560:40; const elbow=side==="right"?535:65; return <g key={`cutlabel-${site.name}`} className="restrictionCallout"><polyline points={`${point.x},${point.y} ${elbow},${y} ${x},${y}`} fill="none" stroke="#7d8da5" strokeWidth=".9"/><text x={x+(side==="right"?4:-4)} y={y} textAnchor={side==="right"?"start":"end"} dominantBaseline="middle">{site.name} {site.cut===null?"":site.cut+1}</text></g> })}

        {ticks.slice(0,16).map(value=>{ const angle=rotation+(value/length)*360-90; const label=polar(center,center,siteRadius+22,angle); return <text key={`tick-${value}`} x={label.x} y={label.y} className="mapCoordinate" textAnchor="middle" dominantBaseline="middle">{value===0?1:value.toLocaleString()}</text> })}
        <text x={center} y={center-20} textAnchor="middle" className="mapName">{record.name.slice(0,28)}</text><text x={center} y={center+3} textAnchor="middle" className="mapLength">{length.toLocaleString()} bp</text><text x={center} y={center+26} textAnchor="middle" className="mapMeta">{gcPercent(record.sequence).toFixed(1)}% GC · {record.features.length} features</text><text x={center} y={center+47} textAnchor="middle" className="mapHint">base 1 = 12 o’clock at 0°</text>
      </g>
    </svg>
    <div className="mapTrackKey"><span><i className="trackFeature"/>Feature tracks</span><span><i className="trackPrimer"/>Primer track</span><span><i className="trackCut"/>Restriction marks</span><span className="mapUniqueNote">Unique cutters are labeled; all detected sites remain ticked.</span></div>
  </div>
}
