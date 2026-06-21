"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import Navbar from "../components/Navbar";

/* ═══════════════════════════════════════════════════════════
   90s NEON DATEPICKER
═══════════════════════════════════════════════════════════ */
const MONTHS_LONG  = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS_2       = ["Su","Mo","Tu","We","Th","Fr","Sa"];
type PickerMode    = "day" | "month" | "year";

function DatePicker({ value, onChange, max, min, label }: {
  value: string; onChange: (v: string) => void;
  max?: string; min?: string; label: string;
}) {
  const parsed   = value ? new Date(value + "T00:00:00") : null;
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<PickerMode>("day");
  const [vy, setVy]     = useState(() => parsed?.getFullYear() ?? new Date().getFullYear());
  const [vm, setVm]     = useState(() => parsed?.getMonth()    ?? new Date().getMonth());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setMode("day"); }
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [open]);

  const maxDate = max ? new Date(max + "T00:00:00") : null;
  const minDate = min ? new Date(min + "T00:00:00") : null;
  const today   = new Date();

  /* day grid */
  const firstDay    = new Date(vy, vm, 1).getDay();
  const daysInMonth = new Date(vy, vm + 1, 0).getDate();
  const dayCells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (dayCells.length % 7 !== 0) dayCells.push(null);

  const selectDay = (day: number) => {
    const d = new Date(vy, vm, day);
    if ((maxDate && d > maxDate) || (minDate && d < minDate)) return;
    onChange(`${vy}-${String(vm + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
    setOpen(false); setMode("day");
  };

  const gotoToday = () => {
    const t = new Date();
    if ((maxDate && t > maxDate) || (minDate && t < minDate)) return;
    setVy(t.getFullYear()); setVm(t.getMonth());
    onChange(`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}-${String(t.getDate()).padStart(2,"0")}`);
    setOpen(false); setMode("day");
  };

  const isSel = (d: number) => parsed?.getFullYear() === vy && parsed?.getMonth() === vm && parsed?.getDate() === d;
  const isTod = (d: number) => today.getFullYear() === vy && today.getMonth() === vm && today.getDate() === d;
  const isDis = (d: number) => {
    const dt = new Date(vy, vm, d);
    return Boolean((maxDate && dt > maxDate) || (minDate && dt < minDate));
  };

  const prevNav = () => {
    if (mode === "day")   { vm === 0 ? (setVm(11), setVy(vy-1)) : setVm(vm-1); }
    if (mode === "month") setVy(vy-1);
    if (mode === "year")  setVy(vy-12);
  };
  const nextNav = () => {
    if (mode === "day")   { vm === 11 ? (setVm(0), setVy(vy+1)) : setVm(vm+1); }
    if (mode === "month") setVy(vy+1);
    if (mode === "year")  setVy(vy+12);
  };

  /* year grid (12 cells centred around current view year) */
  const yBase      = Math.floor(vy / 12) * 12;
  const yearCells  = Array.from({ length: 12 }, (_, i) => yBase + i);

  const displayText = parsed
    ? parsed.toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric" })
    : "Select a date…";

  const navBtn: React.CSSProperties = {
    width: 32, height: 32, borderRadius: 8, border: "none",
    background: "rgba(255,255,255,0.25)", color: "#fff",
    cursor: "pointer", fontSize: 14, fontWeight: 900,
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  };

  return (
    <div ref={ref} style={{ position: "relative", flex: "1 1 220px", minWidth: 220 }}>
      {/* label */}
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 8,
        color: "#7c3aed" }}>
        {label}
      </div>

      {/* trigger */}
      <div style={{ padding: 2, borderRadius: 14, background: open
        ? "linear-gradient(135deg,#7c3aed,#a855f7,#0891b2)"
        : "linear-gradient(135deg,rgba(124,58,237,.4),rgba(168,85,247,.4),rgba(8,145,178,.4))",
        transition: "all .2s" }}>
        <button onClick={() => { setOpen(o => !o); if (!open) setMode("day"); }} style={{
          width: "100%", padding: "12px 14px", borderRadius: 12,
          background: "#fff",
          color: parsed ? "#0f0a1e" : "rgba(15,10,30,0.35)",
          fontSize: 14, fontWeight: 700, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 10,
          border: "none", boxSizing: "border-box", transition: "background .2s",
        }}>
          <span style={{ fontSize: 22 }}>📅</span>
          <span style={{ flex: 1, textAlign: "left" }}>{displayText}</span>
          <span style={{ color: "#7c3aed", fontSize: 11, display: "inline-block",
            transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }}>▼</span>
        </button>
      </div>

      {/* popup */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 10px)", left: 0, zIndex: 300,
          width: 296, borderRadius: 18, overflow: "hidden",
          background: "#ffffff",
          boxShadow: "0 12px 48px rgba(124,58,237,.18), 0 0 0 1px rgba(124,58,237,.14)",
        }}>

          {/* ── header ── */}
          <div style={{ background: "linear-gradient(135deg,#ff2d78,#7c3aed 55%,#00d4ff)",
            padding: "13px 12px 11px", display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={prevNav} style={navBtn}>◀</button>

            <div style={{ flex: 1, display: "flex", gap: 6, justifyContent: "center" }}>
              {mode === "day" && <>
                <button onClick={() => setMode("month")} style={{ background: "rgba(0,0,0,.3)", border: "none", color: "#fff",
                  padding: "5px 10px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 900 }}>
                  {MONTHS_SHORT[vm]}
                </button>
                <button onClick={() => setMode("year")} style={{ background: "rgba(0,0,0,.3)", border: "none", color: "#ffd700",
                  padding: "5px 10px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 900 }}>
                  {vy}
                </button>
              </>}
              {mode === "month" && <span style={{ color:"#fff", fontWeight:900, fontSize:16,
                textShadow:"0 0 14px rgba(255,255,255,.55)" }}>{vy}</span>}
              {mode === "year" && <span style={{ color:"#fff", fontWeight:900, fontSize:15,
                textShadow:"0 0 14px rgba(255,255,255,.55)" }}>{yBase} – {yBase+11}</span>}
            </div>

            <button onClick={nextNav} style={navBtn}>▶</button>
          </div>

          {/* ── body ── */}
          <div style={{ padding: 12 }}>

            {/* DAY MODE */}
            {mode === "day" && <>
              {/* weekday headers */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", marginBottom:6 }}>
                {DAYS_2.map((d, i) => (
                  <div key={d} style={{ textAlign:"center", fontSize:10, fontWeight:900, textTransform:"uppercase",
                    letterSpacing:"0.05em", padding:"3px 0",
                    color: i===0?"#e11d48" : i===6?"#0891b2" : "rgba(15,10,30,.38)" }}>{d}</div>
                ))}
              </div>
              {/* day cells */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2 }}>
                {dayCells.map((day, idx) => {
                  if (!day) return <div key={idx} />;
                  const sel = isSel(day), tod = isTod(day), dis = isDis(day);
                  return (
                    <button key={idx} onClick={() => !dis && selectDay(day)} style={{
                      aspectRatio:"1", width:"100%", borderRadius:8,
                      background: sel ? "linear-gradient(135deg,#7c3aed,#a855f7)" : "transparent",
                      color: dis ? "rgba(15,10,30,.2)" : sel ? "#fff" : tod ? "#7c3aed" : "rgba(15,10,30,.82)",
                      border: tod && !sel ? "1.5px solid #7c3aed" : "1.5px solid transparent",
                      fontSize:12, fontWeight: sel||tod?700:500,
                      cursor: dis?"not-allowed":"pointer",
                      boxShadow: sel?"0 4px 12px rgba(124,58,237,.35)":"none",
                      transition:"all .1s",
                      display:"flex", alignItems:"center", justifyContent:"center",
                    }}>{day}</button>
                  );
                })}
              </div>
            </>}

            {/* MONTH MODE */}
            {mode === "month" && (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:6 }}>
                {MONTHS_SHORT.map((m, i) => {
                  const selMo = parsed?.getFullYear()===vy && parsed?.getMonth()===i;
                  return (
                    <button key={m} onClick={() => { setVm(i); setMode("day"); }} style={{
                      padding:"10px 4px", borderRadius:10, fontSize:12, fontWeight:700, cursor:"pointer",
                      background: selMo?"linear-gradient(135deg,#7c3aed,#a855f7)":"rgba(124,58,237,.07)",
                      color: selMo?"#fff":"rgba(15,10,30,.7)",
                      border: selMo?"1px solid transparent":"1px solid rgba(124,58,237,.12)",
                      boxShadow: selMo?"0 4px 12px rgba(124,58,237,.3)":"none",
                      transition:"all .1s",
                    }}>{m}</button>
                  );
                })}
              </div>
            )}

            {/* YEAR MODE */}
            {mode === "year" && (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:5 }}>
                {yearCells.map(yr => {
                  const selYr = parsed?.getFullYear()===yr;
                  const curYr = today.getFullYear()===yr;
                  return (
                    <button key={yr} onClick={() => { setVy(yr); setMode("month"); }} style={{
                      padding:"9px 3px", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer",
                      background: selYr?"linear-gradient(135deg,#7c3aed,#a855f7)":"rgba(124,58,237,.07)",
                      color: selYr?"#fff" : curYr?"#7c3aed":"rgba(15,10,30,.7)",
                      border: curYr&&!selYr?"1px solid #7c3aed": selYr?"1px solid transparent":"1px solid rgba(124,58,237,.12)",
                      boxShadow: selYr?"0 4px 12px rgba(124,58,237,.3)":"none",
                      transition:"all .1s",
                    }}>{yr}</button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── footer ── */}
          <div style={{ padding:"0 12px 12px", display:"flex", justifyContent:"space-between", borderTop:"1px solid rgba(124,58,237,.08)", paddingTop:10 }}>
            <button onClick={gotoToday} style={{ padding:"6px 16px", borderRadius:8, fontSize:12, fontWeight:700,
              cursor:"pointer", background:"rgba(124,58,237,.08)", color:"#7c3aed", border:"1px solid rgba(124,58,237,.25)" }}>
              Today
            </button>
            <button onClick={() => { setOpen(false); setMode("day"); }} style={{ padding:"6px 16px", borderRadius:8,
              fontSize:12, fontWeight:700, cursor:"pointer", background:"rgba(15,10,30,.04)", color:"rgba(15,10,30,.5)",
              border:"1px solid rgba(15,10,30,.12)" }}>
              Close ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   AGE HELPERS
═══════════════════════════════════════════════════════════ */
function calcExactAge(dob: Date, asOf: Date) {
  let years  = asOf.getFullYear() - dob.getFullYear();
  let months = asOf.getMonth()    - dob.getMonth();
  let days   = asOf.getDate()     - dob.getDate();
  if (days   < 0) { months--; days   += new Date(asOf.getFullYear(), asOf.getMonth(), 0).getDate(); }
  if (months < 0) { years--;  months += 12; }
  const totalDays   = Math.floor((asOf.getTime() - dob.getTime()) / 86_400_000);
  return { years, months, days, totalDays, totalWeeks: Math.floor(totalDays/7), totalMonths: years*12+months, totalHours: totalDays*24 };
}
function nextBirthday(dob: Date, today: Date) {
  const nb = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
  if (nb.getTime() <= today.getTime()) nb.setFullYear(today.getFullYear()+1);
  const daysUntil = Math.ceil((nb.getTime()-today.getTime())/86_400_000);
  return { date: nb, daysUntil, isToday: daysUntil===0 };
}
const ZODIAC: [string,string,number,number][] = [
  ["Aries","♈",3,21],["Taurus","♉",4,20],["Gemini","♊",5,21],["Cancer","♋",6,21],
  ["Leo","♌",7,23],["Virgo","♍",8,23],["Libra","♎",9,23],["Scorpio","♏",10,23],
  ["Sagittarius","♐",11,22],["Capricorn","♑",12,22],["Aquarius","♒",1,20],["Pisces","♓",2,19],
];
function getZodiac(dob: Date) {
  const m=dob.getMonth()+1, d=dob.getDate();
  for (const [name,sym,sm,sd] of ZODIAC) {
    const prev=ZODIAC[(ZODIAC.findIndex(z=>z[0]===name)+11)%12];
    if ((m===prev[2]&&d>=prev[3])||(m===sm&&d<sd)) return `${sym} ${name}`;
  }
  return "♈ Aries";
}
const CHINESE=["🐀 Rat","🐂 Ox","🐅 Tiger","🐇 Rabbit","🐉 Dragon","🐍 Snake","🐎 Horse","🐑 Goat","🐒 Monkey","🐓 Rooster","🐕 Dog","🐖 Pig"];
const DAYS_FULL=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const PLANETS:[string,string,number][]=[["Mercury","☿",.241],["Venus","♀",.615],["Mars","♂",1.881],["Jupiter","♃",11.86],["Saturn","♄",29.46],["Uranus","⛢",84.01],["Neptune","♆",164.8]];
const MILESTONES=[1,5,10,13,16,18,21,25,30,40,50,60,65,70,75,80,90,100];
function getGen(yr:number){
  if(yr>=2013)return{name:"Generation Alpha",range:"2013–present",color:"#7c3aed"};
  if(yr>=1997)return{name:"Generation Z",range:"1997–2012",color:"#0891b2"};
  if(yr>=1981)return{name:"Millennials",range:"1981–1996",color:"#059669"};
  if(yr>=1965)return{name:"Generation X",range:"1965–1980",color:"#d97706"};
  if(yr>=1946)return{name:"Baby Boomers",range:"1946–1964",color:"#ea580c"};
  if(yr>=1928)return{name:"Silent Generation",range:"1928–1945",color:"#6b7280"};
  return{name:"Greatest Generation",range:"before 1928",color:"#9ca3af"};
}
const fmtDate=(d:Date)=>d.toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric"});
const fmtNum=(n:number)=>n.toLocaleString();

/* ═══════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════ */
export default function AgeCalculatorPage() {
  const todayStr = new Date().toISOString().slice(0,10);
  const [dob,    setDob]   = useState("1990-06-15");
  const [asOfStr,setAsOf]  = useState(todayStr);

  const result = useMemo(()=>{
    if (!dob) return null;
    const dobDate  = new Date(dob   +"T00:00:00");
    const asOfDate = new Date(asOfStr+"T00:00:00");
    if (isNaN(dobDate.getTime())||isNaN(asOfDate.getTime())||dobDate>asOfDate) return null;
    const age      = calcExactAge(dobDate, asOfDate);
    const bday     = nextBirthday(dobDate, asOfDate);
    const ageYears = age.years + age.months/12 + age.days/365;
    return {
      age, bday,
      zodiac:   getZodiac(dobDate),
      chinese:  CHINESE[(dobDate.getFullYear()-1900)%12],
      gen:      getGen(dobDate.getFullYear()),
      dayBorn:  DAYS_FULL[dobDate.getDay()],
      ageYears, dobDate,
      milestones: MILESTONES.map(yr=>({age:yr, date:new Date(dobDate.getFullYear()+yr,dobDate.getMonth(),dobDate.getDate()), past:new Date(dobDate.getFullYear()+yr,dobDate.getMonth(),dobDate.getDate())<=asOfDate})),
    };
  },[dob,asOfStr]);

  const chip=(label:string,value:string,color:string,sub?:string)=>(
    <div style={{padding:"14px 18px",borderRadius:14,border:`1px solid ${color}22`,background:`${color}09`}}>
      <div style={{fontSize:10,fontWeight:700,color:"rgba(15,10,30,0.4)",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>{label}</div>
      <div style={{fontSize:22,fontWeight:900,color,lineHeight:1.1}}>{value}</div>
      {sub&&<div style={{fontSize:11,color:"rgba(15,10,30,0.4)",marginTop:3}}>{sub}</div>}
    </div>
  );

  return (
    <div style={{background:"#ffffff"}} className="min-h-screen flex flex-col">
      <Navbar />

      <section style={{background:"linear-gradient(135deg,#f5f3ff,#f0f4ff 50%,#fff)",padding:"36px 40px 28px"}}>
        <p className="section-label mb-2">Calculator</p>
        <div className="section-line" style={{margin:"0 0 12px"}}/>
        <h1 className="font-black tracking-tight mb-2" style={{fontSize:"clamp(26px,3.5vw,48px)",color:"#0f0a1e"}}>
          Age <span className="text-gradient-purple">Calculator</span>
        </h1>
        <p style={{color:"rgba(15,10,30,0.5)",fontSize:15,maxWidth:620}}>
          Enter a date of birth and get your exact age, total life stats, next birthday countdown, zodiac sign, generation, and more.
        </p>
      </section>

      <div style={{width:"100%",padding:"28px 40px 56px",flex:1,boxSizing:"border-box"}}>

        {/* ── date pickers ── */}
        <div style={{
          display:"flex", gap:16, flexWrap:"wrap", alignItems:"flex-start",
          marginBottom:32, padding:"22px 24px",
          borderRadius:20, background:"linear-gradient(135deg,#f5f3ff,#f0f4ff)",
          border:"1px solid rgba(124,58,237,.14)",
          boxShadow:"0 4px 24px rgba(124,58,237,.08)",
        }}>
          <DatePicker value={dob}     onChange={setDob}   max={todayStr} label="Date of Birth" />
          <DatePicker value={asOfStr} onChange={setAsOf}                 label="Age As Of"     />
          <div style={{display:"flex",flexDirection:"column",justifyContent:"flex-end",paddingBottom:2}}>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:8,
              background:"linear-gradient(90deg,#ff2d78,#7c3aed,#00d4ff)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
              &nbsp;
            </div>
            <button onClick={()=>setAsOf(todayStr)} style={{
              padding:"12px 20px",borderRadius:12,fontSize:13,fontWeight:700,cursor:"pointer",
              background:"rgba(124,58,237,.08)",
              color:"#7c3aed",border:"1px solid rgba(124,58,237,.25)",whiteSpace:"nowrap",
            }}>
              ↺ Reset to Today
            </button>
          </div>
        </div>

        {!result ? (
          <div style={{textAlign:"center",padding:"60px 20px",color:"rgba(15,10,30,0.3)",fontSize:15,fontWeight:600}}>
            <div style={{fontSize:56,marginBottom:12}}>🎂</div>
            Enter a valid date of birth above
          </div>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:24}}>

            {/* exact age */}
            <div>
              <div style={{fontSize:11,fontWeight:700,color:"rgba(15,10,30,0.4)",letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:12}}>Exact Age</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:12}}>
                {chip("Years",  String(result.age.years),  "#7c3aed","years old")}
                {chip("Months", String(result.age.months), "#0891b2","this year")}
                {chip("Days",   String(result.age.days),   "#059669","this month")}
              </div>
            </div>

            {/* total stats */}
            <div>
              <div style={{fontSize:11,fontWeight:700,color:"rgba(15,10,30,0.4)",letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:12}}>Total Life Stats</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:12}}>
                {chip("Days Lived",   fmtNum(result.age.totalDays),   "#5b21b6")}
                {chip("Weeks Lived",  fmtNum(result.age.totalWeeks),  "#0284c7")}
                {chip("Months Lived", fmtNum(result.age.totalMonths), "#0891b2")}
                {chip("Hours Lived",  fmtNum(result.age.totalHours),  "#d97706")}
              </div>
            </div>

            {/* personal cards */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:16}}>
              <div style={{padding:"18px 20px",borderRadius:14,background:result.bday.isToday?"rgba(225,29,72,0.06)":"rgba(124,58,237,0.05)",border:`1px solid ${result.bday.isToday?"rgba(225,29,72,0.2)":"rgba(124,58,237,0.14)"}`}}>
                <div style={{fontSize:11,fontWeight:700,color:"rgba(15,10,30,0.4)",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>
                  {result.bday.isToday?"🎉 Birthday Today!":"Next Birthday"}
                </div>
                <div style={{fontSize:20,fontWeight:900,color:result.bday.isToday?"#e11d48":"#7c3aed"}}>
                  {result.bday.isToday?"Happy Birthday! 🎂":`${result.bday.daysUntil} days away`}
                </div>
                {!result.bday.isToday&&<div style={{fontSize:12,color:"rgba(15,10,30,0.45)",marginTop:4}}>{fmtDate(result.bday.date)} · turning {result.age.years+1}</div>}
              </div>
              <div style={{padding:"18px 20px",borderRadius:14,background:"rgba(8,145,178,0.05)",border:"1px solid rgba(8,145,178,0.14)"}}>
                <div style={{fontSize:11,fontWeight:700,color:"rgba(15,10,30,0.4)",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>Born On</div>
                <div style={{fontSize:20,fontWeight:900,color:"#0891b2"}}>{result.dayBorn}</div>
                <div style={{fontSize:12,color:"rgba(15,10,30,0.45)",marginTop:4}}>{fmtDate(result.dobDate)}</div>
              </div>
              <div style={{padding:"18px 20px",borderRadius:14,background:"rgba(5,150,105,0.05)",border:"1px solid rgba(5,150,105,0.14)"}}>
                <div style={{fontSize:11,fontWeight:700,color:"rgba(15,10,30,0.4)",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>Zodiac Signs</div>
                <div style={{fontSize:20,fontWeight:900,color:"#059669"}}>{result.zodiac}</div>
                <div style={{fontSize:12,color:"rgba(15,10,30,0.45)",marginTop:4}}>Chinese: {result.chinese}</div>
              </div>
              <div style={{padding:"18px 20px",borderRadius:14,background:`${result.gen.color}09`,border:`1px solid ${result.gen.color}22`}}>
                <div style={{fontSize:11,fontWeight:700,color:"rgba(15,10,30,0.4)",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>Generation</div>
                <div style={{fontSize:18,fontWeight:900,color:result.gen.color}}>{result.gen.name}</div>
                <div style={{fontSize:12,color:"rgba(15,10,30,0.45)",marginTop:4}}>{result.gen.range}</div>
              </div>
            </div>

            {/* planets */}
            <div>
              <div style={{fontSize:11,fontWeight:700,color:"rgba(15,10,30,0.4)",letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:12}}>Age on Other Planets</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:10}}>
                {PLANETS.map(([name,sym,orbital])=>(
                  <div key={name} style={{padding:"12px 14px",borderRadius:12,background:"rgba(124,58,237,0.04)",border:"1px solid rgba(124,58,237,0.1)",textAlign:"center"}}>
                    <div style={{fontSize:22,marginBottom:4}}>{sym}</div>
                    <div style={{fontSize:11,fontWeight:700,color:"rgba(15,10,30,0.5)",marginBottom:4}}>{name}</div>
                    <div style={{fontSize:17,fontWeight:900,color:"#7c3aed"}}>{(result.ageYears/orbital).toFixed(1)}</div>
                    <div style={{fontSize:10,color:"rgba(15,10,30,0.35)"}}>yrs old</div>
                  </div>
                ))}
              </div>
            </div>

            {/* milestones */}
            <div>
              <div style={{fontSize:11,fontWeight:700,color:"rgba(15,10,30,0.4)",letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:12}}>Life Milestones</div>
              <div style={{borderRadius:16,border:"1px solid rgba(124,58,237,0.12)",overflow:"hidden"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                  <thead>
                    <tr style={{background:"rgba(248,245,255,0.98)"}}>
                      {["Age","Date","Day","Status"].map(h=>(
                        <th key={h} style={{padding:"10px 16px",textAlign:"left",fontSize:11,fontWeight:700,color:"rgba(15,10,30,0.45)",textTransform:"uppercase",letterSpacing:"0.06em",borderBottom:"1px solid rgba(124,58,237,0.1)"}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.milestones.map(({age:a,date,past},i)=>(
                      <tr key={a} style={{borderBottom:"1px solid rgba(0,0,0,0.04)",background:i%2===0?"#fff":"rgba(124,58,237,0.014)"}}>
                        <td style={{padding:"9px 16px",fontWeight:800,color:past?"#7c3aed":"#0f0a1e",fontSize:14}}>{a}</td>
                        <td style={{padding:"9px 16px",fontFamily:"monospace",fontSize:12,color:"rgba(15,10,30,0.7)"}}>{fmtDate(date)}</td>
                        <td style={{padding:"9px 16px",fontSize:12,color:"rgba(15,10,30,0.55)"}}>{DAYS_FULL[date.getDay()]}</td>
                        <td style={{padding:"9px 16px"}}>
                          <span style={{fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:6,background:past?"rgba(5,150,105,0.1)":"rgba(124,58,237,0.08)",color:past?"#059669":"#7c3aed"}}>
                            {past?"✓ Passed":"Upcoming"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        <div style={{marginTop:44}}>
          <Link href="/" style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:13,fontWeight:600,color:"#7c3aed",textDecoration:"none"}}>← Back to iNeedTools</Link>
        </div>
      </div>

      <footer className="mt-auto py-8 text-center" style={{borderTop:"1px solid rgba(124,58,237,0.1)",fontSize:13,color:"rgba(15,10,30,0.35)"}}>
        <p>© 2026 iNeedTools · Age Calculator</p>
      </footer>
    </div>
  );
}
