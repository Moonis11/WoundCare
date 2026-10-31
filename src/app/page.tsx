"use client";
import { useEffect, useState } from "react";
import { Activity, Bell, CalendarDays, Camera, HeartPulse, Home, Image as ImageIcon, Plus, ShieldCheck, UserRound, X, UploadCloud, Trash2 } from "lucide-react";

type Photo = { id: string; url: string; date: string; note: string };
type Wound = { id: string; name: string; location: string; started: string; photos: Photo[] };
const nav = [{label:"Dashboard",icon:Home},{label:"My Wounds",icon:HeartPulse},{label:"Upload Photo",icon:Camera},{label:"Photo History",icon:ImageIcon},{label:"My Profile",icon:UserRound}];

export default function HomePage() {
  const [active,setActive] = useState("Dashboard");
  const [wounds,setWounds] = useState<Wound[]>([]);
  const [showAdd,setShowAdd] = useState(false);
  const [showUpload,setShowUpload] = useState(false);
  const [selected,setSelected] = useState("");
  const [name,setName] = useState("");
  const [location,setLocation] = useState("");
  const [started,setStarted] = useState(new Date().toISOString().slice(0,10));
  const [note,setNote] = useState("");
  const [file,setFile] = useState<File|null>(null);
  const [preview,setPreview] = useState("");
  const [notice,setNotice] = useState("");
  const totalPhotos = wounds.reduce((n,w)=>n+w.photos.length,0);
  const allPhotos = wounds.flatMap(w=>w.photos.map(p=>({...p,woundName:w.name}))).sort((a,b)=>b.date.localeCompare(a.date));

  useEffect(()=>{ if(!file){setPreview("");return;} const url=URL.createObjectURL(file);setPreview(url);return ()=>URL.revokeObjectURL(url); },[file]);

  function addWound(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const wound:Wound={id:crypto.randomUUID(),name:name.trim(),location:location.trim(),started,photos:[]};
    setWounds(current=>[wound,...current]);setSelected(wound.id);setName("");setLocation("");setShowAdd(false);setActive("My Wounds");setNotice("Wound record added in this demo session.");
  }
  function addPhoto(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if(!file||!selected)return;
    const photo:Photo={id:crypto.randomUUID(),url:URL.createObjectURL(file),date:new Date().toISOString(),note:note.trim()};
    setWounds(current=>current.map(w=>w.id===selected?{...w,photos:[photo,...w.photos]}:w));
    setFile(null);setNote("");setShowUpload(false);setActive("Photo History");setNotice("Photo added to this wound's temporary timeline.");
  }
  function removeWound(id:string){setWounds(current=>current.filter(w=>w.id!==id));if(selected===id)setSelected("");}
  const selectedWound=wounds.find(w=>w.id===selected);

  return <div className="shell">
    <aside className="sidebar"><div className="brand"><div className="brand-mark">✚</div>WoundCare</div><div className="nav-label">WORKSPACE</div>
      {nav.map(item=>{const Icon=item.icon;return <button key={item.label} onClick={()=>{setActive(item.label);setNotice("");if(item.label==="Upload Photo")setShowUpload(true);}} className={"nav-item "+(active===item.label?"active":"")}><Icon size={17}/>{item.label}</button>;})}
      <div className="sidebar-foot">Where care meets progress.<br/>Your wound history, in one place.</div>
    </aside>
    <main className="main">
      <header className="topbar"><div><div className="eyebrow">MONITOR · TRACK · CARE</div><h1>{active==="Dashboard"?"Good day 👋":active}</h1><div className="sub">{active==="Dashboard"?"Here’s an overview of your wound care journey.":"Keep your wound records organised over time."}</div></div><div className="top-actions"><Bell size={19} color="#66847D"/><div className="avatar">U</div></div></header>
      <section className="grid">
        <div className="card"><div className="stat-top"><span>Tracked wounds</span><span className="stat-icon"><HeartPulse size={17}/></span></div><div className="stat-value">{wounds.length}</div><div className="stat-note">Separate wound records</div></div>
        <div className="card"><div className="stat-top"><span>Photos recorded</span><span className="stat-icon"><Camera size={17}/></span></div><div className="stat-value">{totalPhotos}</div><div className="stat-note">Photos in this session</div></div>
        <div className="card"><div className="stat-top"><span>Last update</span><span className="stat-icon"><CalendarDays size={17}/></span></div><div className="stat-value date-value">{allPhotos[0]?new Date(allPhotos[0].date).toLocaleDateString():"—"}</div><div className="stat-note">{allPhotos.length?"Most recent photo":"No photos yet"}</div></div>
      </section>
      {notice&&<div className="status-note" role="status">{notice}</div>}
      {active==="Dashboard"&&<><div className="section-head"><h2>Your wounds</h2><button className="small-link" onClick={()=>setActive("My Wounds")}>View all →</button></div>
        {wounds.length===0?<section className="card empty"><div><div className="empty-icon"><Activity size={27}/></div><h3>Your tracking starts here</h3><p>Add a wound to create its own photo timeline. Each wound has a separate history.</p><button className="primary" onClick={()=>setShowAdd(true)}><Plus size={15}/> Add your first wound</button></div></section>:<div className="wound-grid">{wounds.slice(0,3).map(w=><WoundCard key={w.id} wound={w} onOpen={()=>{setSelected(w.id);setActive("My Wounds");}}/>)}</div>}
        <div className="section-head"><h2>Recent activity</h2><button className="small-link" onClick={()=>setActive("Photo History")}>View history →</button></div>
        <section className="card activity-card">{allPhotos.length?allPhotos.slice(0,3).map(p=><div className="activity" key={p.id}><span className="dot"/><span>Photo added to <b>{p.woundName}</b> · {new Date(p.date).toLocaleString()}</span></div>):<div className="activity"><span className="dot"/>No activity yet. Your photos will appear here.</div>}</section>
      </>}
      {active==="My Wounds"&&<><div className="section-head"><h2>Wound records</h2><button className="primary" onClick={()=>setShowAdd(true)}><Plus size={15}/> Add wound</button></div>{wounds.length?<div className="wound-grid">{wounds.map(w=><WoundCard key={w.id} wound={w} onOpen={()=>setSelected(w.id)}/>)}</div>:<div className="card empty"><div><div className="empty-icon"><HeartPulse size={26}/></div><h3>No wound records yet</h3><p>Create a separate record for each wound you want to monitor.</p><button className="primary" onClick={()=>setShowAdd(true)}><Plus size={15}/> Add wound</button></div></div>}
        {selectedWound&&<section className="card detail-card"><div className="section-head"><div><h2>{selectedWound.name}</h2><p className="muted">{selectedWound.location} · Started {selectedWound.started}</p></div><button className="small-link danger" onClick={()=>removeWound(selectedWound.id)}><Trash2 size={14}/> Remove demo record</button></div><button className="primary" onClick={()=>setShowUpload(true)}> <Camera size={15}/> Add photo to this wound</button></section>}
      </>}
      {active==="Photo History"&&<><div className="section-head"><h2>Photo timeline</h2><button className="primary" onClick={()=>setShowUpload(true)}><Camera size={15}/> Add photo</button></div>{allPhotos.length?<div className="photo-grid">{allPhotos.map(p=><article className="card photo-card" key={p.id}><img src={p.url} alt="Wound photo preview"/><div className="photo-meta"><b>{p.woundName}</b><span>{new Date(p.date).toLocaleString()}</span>{p.note&&<p>{p.note}</p>}</div></article>)}</div>:<div className="card empty"><div><div className="empty-icon"><ImageIcon size={26}/></div><h3>No photos yet</h3><p>Upload a photo and assign it to a wound record to begin a timeline.</p><button className="primary" onClick={()=>setShowUpload(true)}><Camera size={15}/> Upload photo</button></div></div>}</>}
      {active==="My Profile"&&<div className="card profile-card"><div className="avatar large">U</div><h2>Patient profile</h2><p className="muted">Profile settings and account management will be connected when authentication is implemented.</p></div>}
      <section className="bottom-grid"><div className="notice"><div className="notice-title"><ShieldCheck size={17}/> Important</div>WoundCare helps document and compare photos over time. It does not diagnose wounds or replace advice from a qualified healthcare professional.</div><div className="demo-note"><b>Prototype mode</b><p>Records and photos currently stay only in this browser session. Do not use real or sensitive patient photos until secure login, storage and database features are implemented.</p></div></section>
    </main>
    <nav className="mobile-menu">{nav.slice(0,4).map(item=>{const Icon=item.icon;return <button key={item.label} className={active===item.label?"active":""} onClick={()=>{setActive(item.label);if(item.label==="Upload Photo")setShowUpload(true);}}><Icon size={18}/>{item.label==="Dashboard"?"Home":item.label==="My Wounds"?"Wounds":item.label==="Upload Photo"?"Upload":"History"}</button>;})}</nav>
    {showAdd&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setShowAdd(false);}}><form className="modal" onSubmit={addWound}><div className="modal-head"><div><h2>Add a wound</h2><p>Create a separate record for tracking.</p></div><button type="button" className="icon-button" onClick={()=>setShowAdd(false)}><X size={19}/></button></div><label>Wound name<input required value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Left foot wound"/></label><label>Body location<input required value={location} onChange={e=>setLocation(e.target.value)} placeholder="e.g. Left heel"/></label><label>First noticed<input type="date" required value={started} onChange={e=>setStarted(e.target.value)}/></label><div className="modal-actions"><button type="button" className="secondary" onClick={()=>setShowAdd(false)}>Cancel</button><button className="primary" type="submit">Create record</button></div></form></div>}
    {showUpload&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setShowUpload(false);}}><form className="modal" onSubmit={addPhoto}><div className="modal-head"><div><h2>Upload a photo</h2><p>Add a photo to one wound’s timeline.</p></div><button type="button" className="icon-button" onClick={()=>setShowUpload(false)}><X size={19}/></button></div><label>Select wound<select required value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Choose a wound</option>{wounds.map(w=><option key={w.id} value={w.id}>{w.name} · {w.location}</option>)}</select></label><label className="upload-zone"><UploadCloud size={25}/><b>{file?file.name:"Choose a photo"}</b><span>JPG, PNG or WEBP · max 10 MB</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setFile(e.target.files?.[0]||null)}/></label>{preview&&<img className="preview" src={preview} alt="Selected photo preview"/>}<label>Note (optional)<textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Add a short note about this photo."/></label><div className="modal-actions"><button type="button" className="secondary" onClick={()=>setShowUpload(false)}>Cancel</button><button className="primary" type="submit" disabled={!file||!selected||file.size>10*1024*1024}>Add photo</button></div>{file&&file.size>10*1024*1024&&<p className="error">This file is larger than 10 MB.</p>}{!wounds.length&&<p className="error">Create a wound record before uploading a photo.</p>}</form></div>}
  </div>;
}
function WoundCard({wound,onOpen}:{wound:Wound;onOpen:()=>void}){return <button className="card wound-card" onClick={onOpen}><div className="wound-card-icon"><HeartPulse size={20}/></div><div className="wound-card-copy"><b>{wound.name}</b><span>{wound.location}</span><small>{wound.photos.length} photos · Since {wound.started}</small></div><span className="arrow">→</span></button>}
