"use client";
import { useState } from "react";
import { Activity, Bell, CalendarDays, Camera, ClipboardList, Home, Image, Settings, ShieldCheck, UserRound, HeartPulse } from "lucide-react";

const navigation = [
  { label: "Dashboard", icon: Home },
  { label: "My Wounds", icon: HeartPulse },
  { label: "Upload Photo", icon: Camera },
  { label: "Photo History", icon: Image },
  { label: "My Profile", icon: UserRound },
  { label: "Settings", icon: Settings }
];

export default function HomePage() {
  const [active, setActive] = useState("Dashboard");
  const [notice, setNotice] = useState("");
  return <div className="shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">✚</div>WoundCare</div>
      <div className="nav-label">WORKSPACE</div>
      {navigation.map(item => { const Icon = item.icon; return <button key={item.label} onClick={() => { setActive(item.label); setNotice(item.label === "Upload Photo" ? "Photo upload will be enabled when secure storage is connected." : item.label === "Dashboard" ? "" : item.label + " section is coming soon."); }} className={"nav-item " + (active === item.label ? "active" : "")}><Icon size={17}/>{item.label}</button>; })}
      <div style={{marginTop:"auto",padding:"18px 10px 0",color:"#91aaa4",fontSize:11,lineHeight:1.7}}>Where care meets progress.<br/>Your wound history, in one place.</div>
    </aside>
    <main className="main">
      <header className="topbar">
        <div><div className="eyebrow">MONITOR · TRACK · CARE</div><h1>Good day 👋</h1><div className="sub">Here’s an overview of your wound care journey.</div></div>
        <div style={{display:"flex",alignItems:"center",gap:16}}><Bell size={19} color="#66847D"/><div className="avatar">U</div></div>
      </header>
      <section className="grid">
        <div className="card"><div className="stat-top"><span>Tracked wounds</span><span className="stat-icon"><HeartPulse size={17}/></span></div><div className="stat-value">0</div><div className="stat-note">Wounds added to your profile</div></div>
        <div className="card"><div className="stat-top"><span>Photos recorded</span><span className="stat-icon"><Camera size={17}/></span></div><div className="stat-value">0</div><div className="stat-note">Your visual progress timeline</div></div>
        <div className="card"><div className="stat-top"><span>Last update</span><span className="stat-icon"><CalendarDays size={17}/></span></div><div className="stat-value" style={{fontSize:21}}>—</div><div className="stat-note">No photos yet</div></div>
      </section>
      <div className="section-head"><h2>Your wounds</h2><button className="small-link" onClick={() => {setActive("My Wounds");setNotice("You’ll be able to create and manage separate wound records here.");}}>View all →</button></div>
      <section className="card empty">
        <div><div className="empty-icon"><Activity size={27}/></div><h3>Your tracking starts here</h3><p>Add a wound to create its own photo timeline. Each wound will have a separate history so changes can be followed over time.</p><button className="primary" onClick={() => {setActive("My Wounds");setNotice("Wound creation will be enabled after the secure patient database is connected.");}}>＋ Add your first wound</button></div>
      </section>
      <div className="section-head"><h2>Recent activity</h2><button className="small-link" onClick={() => setActive("Photo History")}>View history →</button></div>
      <section className="bottom-grid">
        <div className="card"><div className="activity"><span className="dot"/><span>No activity yet. Your uploaded photos will appear here.</span></div><div className="activity"><span className="dot"/><span>Each photo will be saved with its date and wound record.</span></div></div>
        <div className="notice"><div style={{display:"flex",gap:8,alignItems:"center",fontWeight:700,marginBottom:7}}><ShieldCheck size={17}/> A helpful reminder</div>WoundCare is designed to help you document and compare photos over time. It does not diagnose wounds or replace advice from a qualified healthcare professional.</div>
      </section>
      {notice && <div role="status" className="card" style={{marginTop:16,color:"#52736D",fontSize:12}}>{notice}</div>}
    </main>
    <nav className="mobile-menu">{navigation.slice(0,4).map(item=>{const Icon=item.icon;return <button key={item.label} className={active===item.label?"active":""} onClick={()=>{setActive(item.label);setNotice(item.label==="Upload Photo"?"Secure photo upload is coming soon.":item.label+" section is coming soon.");}}><Icon size={18}/>{item.label==="Dashboard"?"Home":item.label==="My Wounds"?"Wounds":item.label==="Upload Photo"?"Upload":"History"}</button>;})}</nav>
  </div>;
}