import { useId } from "react";
import { bouquets } from "@/data/bouquets";
export function Bouquet({ id, version, renderer = "bouquet:v1", className = "" }: { id: string; version?: string; renderer?: string; className?: string }) {
  const uid = useId().replace(/:/g, "");
  const key = version || `${id}:v1`;
  const art = bouquets[key as keyof typeof bouquets];
  if (!art || art.id !== id || renderer !== "bouquet:v1") return <div className="art-unavailable" role="status"><p>Representación guardada no disponible. Conservamos la especificación original.</p><button className="text-button" onClick={() => window.location.reload()}>Reintentar representación</button></div>;
  const flower = `${uid}-flower`, leaf = `${uid}-leaf`, small = `${uid}-small`;
  return <svg className={`bouquet ${className}`} data-bouquet={id} data-vector-version={key} data-renderer-version={renderer} viewBox="0 0 520 500" role="img" aria-labelledby={`${uid}-title`}>
    <title id={`${uid}-title`}>{`${art.name}: ${art.description}`}</title>
    <defs>
      <g id={leaf}><path d="M0 0C-39-4-52-33-49-57C-18-56 5-32 0 0Z" fill="#315B45"/><path d="M-2-3L-34-40" fill="none" stroke="#83A089" strokeWidth="1.4"/></g>
      <g id={flower}>
        {id === "brisa" ? <><path d="M0 7C-23 9-42-6-37-20C-32-35-13-26-5-12C-20-31-14-49 1-46C18-43 16-23 9-9C24-32 42-28 43-12C44 3 22 14 8 12C22 27 13 43-2 38C-17 33-14 16-6 7Z" fill="#FFFFFF" stroke="#B9C8A9" strokeWidth="1"/><path d="M-4-5L-10-25M2-8L3-30M8-3L27-15" stroke="#7042A6" strokeWidth="1.5" strokeDasharray="2 4"/><path d="M-4 5L1-8L8 5Z" fill="#B6B663"/></> : id === "pulso" ? <>{Array.from({ length: 16 }, (_, i) => <ellipse key={i} cx="0" cy="-24" rx="6" ry="23" fill={i % 2 ? "#D42A80" : "#AE1B64"} transform={`rotate(${i * 22.5})`} />)}<circle r="13" fill="#7042A6"/><circle r="8" fill="#E8B167"/><circle r="4" fill="#302139"/></> : <>{Array.from({ length: 13 }, (_, i) => <path key={i} d="M0-10C-18-25-11-53 0-55C11-46 17-27 0-10Z" fill={i % 2 ? "#F3BA37" : "#E9A91E"} transform={`rotate(${i * 360 / 13})`} />)}<circle r="23" fill="#594326"/><circle r="17" fill="#302139"/>{Array.from({ length: 9 }, (_, i) => <circle key={i} cx={Math.cos(i * .7) * 11} cy={Math.sin(i * .7) * 11} r="1.5" fill="#BC8744" />)}</>}
      </g>
      <g id={small}>{id === "pulso" ? <><path d="M-30 0L-35-13L-24-20L-19-34L-4-28L6-36L16-24L30-22L28-9L37 0L26 11L25 24L10 23L0 33L-12 24L-26 26L-25 12Z" fill="#EFA2C1"/><path d="M-15-7L-6-17L4-11L15-17L18-3L10 6L17 15L4 20L-4 10L-15 16L-13 1Z" fill="#D965A0"/><circle r="6" fill="#EFA2C1"/></> : <><path d="M0 0C-10-18-1-34 7-27C17-20 10-6 0 0Z" fill={id === "brisa" ? "#FFFFFF" : "#E9A91E"}/><path d="M0 0L-7 12M0 0L12 8" stroke="#315B45" strokeWidth="3"/></>}</g>
    </defs>
    <path d="M139 220L180 113L350 133L389 256L302 450L248 467Z" fill={art.fold}/>
    <path d="M132 228L193 166L344 180L383 246L293 430L257 454Z" fill={art.paper}/>
    <g fill="none" stroke="#315B45" strokeWidth="4" strokeLinecap="round"><path d="M251 402L184 143M268 424L291 103M260 419L343 164M255 403L145 193M264 407L239 108M266 400L363 224M258 397L208 206"/></g>
    <g><use href={`#${leaf}`} transform="translate(229 303) rotate(-8) scale(1.2)"/><use href={`#${leaf}`} transform="translate(289 282) rotate(103) scale(1.15)"/><use href={`#${leaf}`} transform="translate(203 230) rotate(-25)"/><use href={`#${leaf}`} transform="translate(317 219) rotate(98)"/><use href={`#${leaf}`} transform="translate(174 192) rotate(-36) scale(.9)"/><use href={`#${leaf}`} transform="translate(243 159) rotate(-9)"/><use href={`#${leaf}`} transform="translate(282 155) rotate(90) scale(.95)"/><use href={`#${leaf}`} transform="translate(340 262) rotate(117)"/><use href={`#${leaf}`} transform="translate(182 278) rotate(-24) scale(.85)"/></g>
    <g><use href={`#${small}`} transform="translate(148 193) rotate(-40)"/><use href={`#${small}`} transform="translate(238 85) rotate(10)"/><use href={`#${small}`} transform="translate(354 166) rotate(30)"/><use href={`#${small}`} transform="translate(198 222) rotate(-15)"/><use href={`#${small}`} transform="translate(351 237) rotate(50)"/></g>
    <g><use href={`#${flower}`} transform="translate(193 141) rotate(-22) scale(.94)"/><use href={`#${flower}`} transform="translate(283 116) rotate(15) scale(.9)"/><use href={`#${flower}`} transform="translate(319 198) rotate(20)"/><use href={`#${flower}`} transform="translate(244 213) rotate(-8) scale(1.05)"/><use href={`#${flower}`} transform="translate(177 240) rotate(-30) scale(.78)"/></g>
    <path d="M119 250L180 284L262 376L232 443L151 323Z" fill={art.fold}/><path d="M180 284L259 340L361 281L309 454L232 443L262 376Z" fill={art.paper}/><path d="M361 281L330 387L276 449L271 369Z" fill={art.fold}/>
    <path d="M181 287L261 377L235 440M360 283L272 370L277 447" stroke="#7042A6" strokeWidth="1.5" fill="none"/>
    <path d="M226 399Q266 415 319 392L316 405Q269 430 231 413Z" fill="#315B45"/><path d="M267 416C237 426 229 448 246 442L271 419C290 444 317 448 306 432C298 422 279 417 267 416Z" fill="none" stroke="#315B45" strokeWidth="3"/>
  </svg>;
}
export function WrappingDetail() { return <svg viewBox="0 0 600 320" className="wrapping-detail" role="img" aria-label="Detalle de envoltura: pliegues de papel lavanda y tallos verdes"><path d="M36 164L228 28L546 182L371 304Z" fill="#BFA8D8"/><path d="M36 164L274 132L371 304Z" fill="#EEE8F5"/><path d="M274 132L546 182L371 304Z" fill="#7042A6"/><g stroke="#315B45" strokeWidth="6" fill="none"><path d="M314 259L165 55M332 258L252 34M325 263L205 38"/></g><path d="M248 174C208 174 178 149 182 124C219 125 247 144 248 174ZM274 166C275 131 301 111 325 121C319 149 298 170 274 166Z" fill="#315B45"/><path d="M36 164L274 132L371 304" stroke="#7042A6" strokeWidth="2" fill="none"/></svg>; }
