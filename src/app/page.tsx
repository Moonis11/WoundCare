"use client";
import { useEffect, useState } from "react";
import { Activity, Bell, CalendarDays, Camera, HeartPulse, Home, Image as ImageIcon, Plus, ShieldCheck, UserRound, X, UploadCloud, Trash2 } from "lucide-react";

type Photo = { id: string; url: string; date: string; note: string };
type Wound = { id: string; name: string; location: string; started: string; photos: Photo[] };
type PatientProfile = { fullName: string; email: string; phone: string; birthDate: string; emergencyContact: string };
const DB_NAME = "woundcare-local";
const STORE = "records";
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function readRecords(): Promise<Wound[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, "readonly").objectStore(STORE).get("wounds");
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}
async function writeRecords(records: Wound[]) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(records, "wounds");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
const nav = [{label:"Dashboard",title:"Bosh sahifa",icon:Home},{label:"My Wounds",title:"Yaralarim",icon:HeartPulse},{label:"Upload Photo",title:"Surat yuklash",icon:Camera},{label:"Photo History",title:"Suratlar tarixi",icon:ImageIcon},{label:"My Profile",title:"Profilim",icon:UserRound}];

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
  const [ready,setReady] = useState(false);
  const [storageError,setStorageError] = useState("");
  const [profile,setProfile] = useState<PatientProfile>({fullName:"",email:"",phone:"",birthDate:"",emergencyContact:""});
  const [profileReady,setProfileReady] = useState(false);
  const [editingProfile,setEditingProfile] = useState(false);
  const [authMode,setAuthMode] = useState<"register"|"login"|null>(null);
  const [authName,setAuthName] = useState("");
  const [authEmail,setAuthEmail] = useState("");
  const [authPassword,setAuthPassword] = useState("");
  const [signedIn,setSignedIn] = useState(false);
  const [compareWoundId,setCompareWoundId] = useState("");
  const [compareFirstId,setCompareFirstId] = useState("");
  const [compareSecondId,setCompareSecondId] = useState("");
  const totalPhotos = wounds.reduce((n,w)=>n+w.photos.length,0);
  const allPhotos = wounds.flatMap(w=>w.photos.map(p=>({...p,woundName:w.name}))).sort((a,b)=>b.date.localeCompare(a.date));

  useEffect(() => {
    readRecords().then(records => { setWounds(records); setReady(true); })
      .catch(() => { setStorageError("Brauzer xotirasiga ulanish imkoni bo‘lmadi."); setReady(true); });
  }, []);
  useEffect(() => {
    if (!ready) return;
    writeRecords(wounds).catch(() => setStorageError("Ma’lumotlarni saqlashda xatolik yuz berdi."));
  }, [wounds, ready]);
  useEffect(() => {
    const dbPromise = openDb();
    dbPromise.then(db => {
      const request = db.transaction(STORE, "readonly").objectStore(STORE).get("profile");
      request.onsuccess = () => { if (request.result) setProfile(request.result); setProfileReady(true); };
      request.onerror = () => setProfileReady(true);
    }).catch(() => setProfileReady(true));
    setSignedIn(sessionStorage.getItem("woundcare-demo-session") === "active");
  }, []);
  async function saveProfile(next:PatientProfile) {
    setProfile(next);
    const db = await openDb();
    await new Promise<void>((resolve,reject) => {
      const tx = db.transaction(STORE,"readwrite");
      tx.objectStore(STORE).put(next,"profile");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    setNotice("Profil ma’lumotlari ushbu qurilmada saqlandi.");
    setEditingProfile(false);
  }
  function finishDemoAuth(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const next = authMode === "register"
      ? {...profile,fullName:authName.trim(),email:authEmail.trim()}
      : {...profile,email:authEmail.trim()};
    saveProfile(next).then(() => {
      sessionStorage.setItem("woundcare-demo-session","active");
      setSignedIn(true);setAuthMode(null);setAuthPassword("");setNotice("Demo rejimida tizimga kirdingiz.");
    }).catch(() => setStorageError("Profilni saqlab bo‘lmadi."));
  }
  function signOut() {
    sessionStorage.removeItem("woundcare-demo-session");
    setSignedIn(false);setNotice("Demo seansidan chiqdingiz.");
  }
  useEffect(()=>{ if(!file){setPreview("");return;} const url=URL.createObjectURL(file);setPreview(url);return ()=>URL.revokeObjectURL(url); },[file]);

  function addWound(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const wound:Wound={id:crypto.randomUUID(),name:name.trim(),location:location.trim(),started,photos:[]};
    setWounds(current=>[wound,...current]);setSelected(wound.id);setName("");setLocation("");setShowAdd(false);setActive("My Wounds");setNotice("Yara yozuvi ushbu qurilmada yaratildi.");
  }
  async function addPhoto(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if(!file||!selected||file.size>10*1024*1024)return;
    try {
      const dataUrl = await fileToDataUrl(file);
      const photo:Photo={id:crypto.randomUUID(),url:dataUrl,date:new Date().toISOString(),note:note.trim()};
      setWounds(current=>current.map(w=>w.id===selected?{...w,photos:[photo,...w.photos]}:w));
      setFile(null);setNote("");setShowUpload(false);setActive("Photo History");setNotice("Surat yara tarixiga qo‘shildi va shu qurilmada saqlandi.");
    } catch { setStorageError("Suratni o‘qib bo‘lmadi. Boshqa faylni sinab ko‘ring."); }
  }
  function removePhoto(woundId:string, photoId:string) {
    if (!window.confirm("Bu suratni tarixdan o‘chirmoqchimisiz?")) return;
    setWounds(current=>current.map(w=>w.id===woundId?{...w,photos:w.photos.filter(p=>p.id!==photoId)}:w));
  }
  function removeWound(id:string){
    if (!window.confirm("Bu yara yozuvi va unga tegishli suratlarni o‘chirmoqchimisiz?")) return;
    setWounds(current=>current.filter(w=>w.id!==id));if(selected===id)setSelected("");
  }
  const selectedWound=wounds.find(w=>w.id===selected);

  return <div className="shell">
    <aside className="sidebar"><div className="brand"><div className="brand-mark">✚</div>WoundCare</div><div className="nav-label">ASOSIY MENYU</div>
      {nav.map(item=>{const Icon=item.icon;return <button key={item.label} onClick={()=>{setActive(item.label);setNotice("");if(item.label==="Upload Photo")setShowUpload(true);}} className={"nav-item "+(active===item.label?"active":"")}><Icon size={17}/>{item.title}</button>;})}
      <div className="sidebar-foot">Where care meets progress.<br/>Your wound history, in one place.</div>
    </aside>
    <main className="main">
      <header className="topbar"><div><div className="eyebrow">MONITOR · TRACK · CARE</div><h1>{active==="Dashboard"?"Xush kelibsiz 👋":nav.find(item=>item.label===active)?.title||active}</h1><div className="sub">{active==="Dashboard"?"Yara parvarishi yozuvlaringizning qisqacha ko‘rinishi.":"Ma’lumotlaringizni bir joyda tartibli saqlang."}</div></div><div className="top-actions"><Bell size={19} color="#66847D"/><div className="avatar">U</div></div></header>
      <section className="grid">
        <div className="card"><div className="stat-top"><span>Kuzatilayotgan yaralar</span><span className="stat-icon"><HeartPulse size={17}/></span></div><div className="stat-value">{wounds.length}</div><div className="stat-note">Alohida yara yozuvlari</div></div>
        <div className="card"><div className="stat-top"><span>Saqlangan suratlar</span><span className="stat-icon"><Camera size={17}/></span></div><div className="stat-value">{totalPhotos}</div><div className="stat-note">Suratlar shu qurilmada saqlanadi</div></div>
        <div className="card"><div className="stat-top"><span>Oxirgi yangilanish</span><span className="stat-icon"><CalendarDays size={17}/></span></div><div className="stat-value date-value">{allPhotos[0]?new Date(allPhotos[0].date).toLocaleDateString():"—"}</div><div className="stat-note">{allPhotos.length?"Eng so‘nggi surat":"Hozircha surat yo‘q"}</div></div>
      </section>
      {!ready&&<div className="status-note">Saqlangan ma’lumotlar yuklanmoqda…</div>}
      {storageError&&<div className="status-note" role="alert">{storageError}</div>}
      {notice&&<div className="status-note" role="status">{notice}</div>}
      {active==="Dashboard"&&<section className="quick-actions"><div className="quick-heading"><h2>Tezkor amallar</h2><span>Kerakli bo‘limga tez o‘ting</span></div><div className="quick-grid"><button className="quick-action" onClick={()=>setShowAdd(true)}><span className="quick-icon"><Plus size={19}/></span><b>Yara qo‘shish</b><small>Yangi yara yozuvini yarating</small></button><button className="quick-action" onClick={()=>{if(!wounds.length){setNotice("Avval yara yozuvini yarating.");setActive("Dashboard");return;}setSelected(wounds[0].id);setShowUpload(true);}}><span className="quick-icon"><Camera size={19}/></span><b>Surat yuklash</b><small>Yara holatini suratga oling</small></button><button className="quick-action" onClick={()=>setActive("Photo History")}><span className="quick-icon"><ImageIcon size={19}/></span><b>Suratlar tarixini ko‘rish</b><small>Oldingi suratlarni taqqoslang</small></button><button className="quick-action" onClick={()=>setActive("My Profile")}><span className="quick-icon"><UserRound size={19}/></span><b>Profilim</b><small>Kontakt ma’lumotlarini yangilang</small></button></div></section>}
      {active==="Dashboard"&&<><div className="section-head"><h2>Yaralarim</h2><button className="small-link" onClick={()=>setActive("My Wounds")}>Barchasini ko‘rish →</button></div>
        {wounds.length===0?<section className="card empty"><div><div className="empty-icon"><Activity size={27}/></div><h3>Kuzatuvni shu yerdan boshlang</h3><p>Har bir yara uchun alohida yozuv oching va vaqt o‘tishi bilan suratlarini taqqoslash uchun tarix yarating.</p><button className="primary" onClick={()=>setShowAdd(true)}><Plus size={15}/> Birinchi yarani qo‘shish</button></div></section>:<div className="wound-grid">{wounds.slice(0,3).map(w=><WoundCard key={w.id} wound={w} onOpen={()=>{setSelected(w.id);setActive("My Wounds");}}/>)}</div>}
        <div className="section-head"><h2>So‘nggi faollik</h2><button className="small-link" onClick={()=>setActive("Photo History")}>Tarixni ko‘rish →</button></div>
        <section className="card activity-card">{allPhotos.length?allPhotos.slice(0,3).map(p=><div className="activity" key={p.id}><span className="dot"/><span>Photo added to <b>{p.woundName}</b> · {new Date(p.date).toLocaleString()}</span></div>):<div className="activity"><span className="dot"/>Hozircha faollik yo‘q. Yuklangan suratlar shu yerda ko‘rinadi.</div>}</section>
      </>}
      {active==="My Wounds"&&<><div className="section-head"><h2>Yara yozuvlari</h2><button className="primary" onClick={()=>setShowAdd(true)}><Plus size={15}/> Yara qo‘shish</button></div>{wounds.length?<div className="wound-grid">{wounds.map(w=><WoundCard key={w.id} wound={w} onOpen={()=>setSelected(w.id)}/>)}</div>:<div className="card empty"><div><div className="empty-icon"><HeartPulse size={26}/></div><h3>Hozircha yara yozuvi yo‘q</h3><p>Kuzatmoqchi bo‘lgan har bir yara uchun alohida yozuv yarating.</p><button className="primary" onClick={()=>setShowAdd(true)}><Plus size={15}/> Add wound</button></div></div>}
        {selectedWound&&<section className="card detail-card"><div className="section-head"><div><h2>{selectedWound.name}</h2><p className="muted">{selectedWound.location} · Started {selectedWound.started}</p></div><button className="small-link danger" onClick={()=>removeWound(selectedWound.id)}><Trash2 size={14}/> Remove demo record</button></div><button className="primary" onClick={()=>setShowUpload(true)}> <Camera size={15}/> Add photo to this wound</button></section>}
      </>}
      {active==="Photo History"&&<><div className="section-head"><h2>Suratlar ketma-ketligi</h2><button className="primary" onClick={()=>setShowUpload(true)}><Camera size={15}/> Surat qo‘shish</button></div>
        {wounds.some(w=>w.photos.length>=2)&&<PhotoCompare wounds={wounds} woundId={compareWoundId} setWoundId={setCompareWoundId} firstId={compareFirstId} setFirstId={setCompareFirstId} secondId={compareSecondId} setSecondId={setCompareSecondId}/>}
        {allPhotos.length?<div className="photo-grid">{allPhotos.map(p=><article className="card photo-card" key={p.id}><img src={p.url} alt="Wound photo preview"/><div className="photo-meta"><b>{p.woundName}</b><span>{new Date(p.date).toLocaleString()}</span>{p.note&&<p>{p.note}</p>}<button className="small-link danger" onClick={()=>{const w=wounds.find(x=>x.photos.some(ph=>ph.id===p.id));if(w)removePhoto(w.id,p.id);}}>Suratni o‘chirish</button></div></article>)}</div>:<div className="card empty"><div><div className="empty-icon"><ImageIcon size={26}/></div><h3>Hozircha surat yo‘q</h3><p>Surat yuklang va uni tegishli yara yozuviga biriktiring.</p><button className="primary" onClick={()=>setShowUpload(true)}><Camera size={15}/> Surat yuklash</button></div></div>}</>}
      {active==="My Profile"&&<div className="profile-layout">
        <section className="card profile-card">
          <div className="profile-heading"><div className="avatar large">{profile.fullName?profile.fullName.charAt(0).toUpperCase():"U"}</div><div><h2>{profile.fullName||"Bemor profili"}</h2><p className="muted">{profile.email||"Profil ma’lumotlarini kiriting"}</p></div></div>
          <div className="profile-details">
            <div><span>Telefon</span><b>{profile.phone||"Kiritilmagan"}</b></div>
            <div><span>Tug‘ilgan sana</span><b>{profile.birthDate||"Kiritilmagan"}</b></div>
            <div><span>Favqulodda aloqa</span><b>{profile.emergencyContact||"Kiritilmagan"}</b></div>
          </div>
          <div className="profile-actions"><button className="primary" onClick={()=>setEditingProfile(true)}>Profilni tahrirlash</button>{signedIn?<button className="secondary" onClick={signOut}>Demo seansidan chiqish</button>:<button className="secondary" onClick={()=>setAuthMode("login")}>Kirish / Ro‘yxatdan o‘tish</button>}</div>
          <p className="demo-auth-warning">Demo: haqiqiy akkaunt va parol server ulanmaguncha yaratilmaydi. Parol saqlanmaydi.</p>
        </section>
        <section className="card profile-side"><h3>Profil nima uchun kerak?</h3><p>Kontakt ma’lumotlaringizni tartibli saqlash va keyinchalik xavfsiz akkauntga ulash uchun.</p><div className="profile-tip"><ShieldCheck size={18}/> Hozircha kiritilgan ma’lumotlar faqat shu brauzerda saqlanadi.</div></section>
      </div>}
      <section className="bottom-grid"><div className="notice"><div className="notice-title"><ShieldCheck size={17}/> Muhim eslatma</div>WoundCare yara holatini suratlar orqali vaqt davomida hujjatlashtirish va taqqoslashga yordam beradi. U tashxis qo‘ymaydi va tibbiyot mutaxassisi maslahatining o‘rnini bosmaydi.</div><div className="demo-note"><b>Mahalliy saqlash rejimi</b><p>Yozuvlar va suratlar faqat shu brauzer va qurilmada saqlanadi. Ular serverga yuborilmaydi va boshqa qurilmada ko‘rinmaydi. Maxfiy yoki haqiqiy bemor suratlarini yuklamang.</p></div></section>
    </main>
    <nav className="mobile-menu">{nav.slice(0,4).map(item=>{const Icon=item.icon;return <button key={item.label} className={active===item.label?"active":""} onClick={()=>{setActive(item.label);if(item.label==="Upload Photo")setShowUpload(true);}}><Icon size={18}/>{item.label==="Dashboard"?"Bosh sahifa":item.label==="My Wounds"?"Yaralar":item.label==="Upload Photo"?"Yuklash":"Tarix"}</button>;})}</nav>
    {editingProfile&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setEditingProfile(false);}}><form className="modal" onSubmit={e=>{e.preventDefault();saveProfile(profile).catch(()=>setStorageError("Profilni saqlab bo‘lmadi."));}}><div className="modal-head"><div><h2>Profilni tahrirlash</h2><p>Kontakt ma’lumotlaringizni kiriting.</p></div><button type="button" className="icon-button" onClick={()=>setEditingProfile(false)}><X size={19}/></button></div><label>To‘liq ism<input required value={profile.fullName} onChange={e=>setProfile({...profile,fullName:e.target.value})} placeholder="Ism va familiya"/></label><label>Email<input type="email" value={profile.email} onChange={e=>setProfile({...profile,email:e.target.value})} placeholder="name@example.com"/></label><label>Telefon<input type="tel" value={profile.phone} onChange={e=>setProfile({...profile,phone:e.target.value})} placeholder="+998 90 123 45 67"/></label><label>Tug‘ilgan sana<input type="date" value={profile.birthDate} onChange={e=>setProfile({...profile,birthDate:e.target.value})}/></label><label>Favqulodda aloqa (ism va telefon)<input value={profile.emergencyContact} onChange={e=>setProfile({...profile,emergencyContact:e.target.value})} placeholder="Yaqin insoningiz va telefon raqami"/></label><div className="modal-actions"><button type="button" className="secondary" onClick={()=>setEditingProfile(false)}>Bekor qilish</button><button className="primary" type="submit">Saqlash</button></div></form></div>}
    {authMode&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setAuthMode(null);}}><form className="modal" onSubmit={finishDemoAuth}><div className="modal-head"><div><h2>{authMode==="register"?"Ro‘yxatdan o‘tish":"Tizimga kirish"}</h2><p>Bu hozircha server ulanmagan demo ko‘rinishidir.</p></div><button type="button" className="icon-button" onClick={()=>setAuthMode(null)}><X size={19}/></button></div>{authMode==="register"&&<label>To‘liq ism<input required value={authName} onChange={e=>setAuthName(e.target.value)} placeholder="Ism va familiya"/></label>}<label>Email<input type="email" required value={authEmail} onChange={e=>setAuthEmail(e.target.value)} placeholder="name@example.com"/></label><label>Parol (faqat demo tekshiruvi)<input type="password" required minLength={6} value={authPassword} onChange={e=>setAuthPassword(e.target.value)} placeholder="Kamida 6 belgi"/></label><p className="demo-auth-warning">Parol serverga yuborilmaydi va saqlanmaydi. Haqiqiy autentifikatsiya server ulangandan keyin qo‘shiladi.</p><div className="modal-actions"><button type="button" className="secondary" onClick={()=>setAuthMode(authMode==="register"?"login":"register")}>{authMode==="register"?"Kirish":"Ro‘yxatdan o‘tish"}</button><button className="primary" type="submit">Davom etish</button></div></form></div>}
    {showAdd&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setShowAdd(false);}}><form className="modal" onSubmit={addWound}><div className="modal-head"><div><h2>Yara qo‘shish</h2><p>Kuzatish uchun alohida yozuv yarating.</p></div><button type="button" className="icon-button" onClick={()=>setShowAdd(false)}><X size={19}/></button></div><label>Yara nomi<input required value={name} onChange={e=>setName(e.target.value)} placeholder="Masalan, chap oyoq yarasi"/></label><label>Tanadagi joylashuvi<input required value={location} onChange={e=>setLocation(e.target.value)} placeholder="Masalan, chap tovon"/></label><label>Birinchi aniqlangan sana<input type="date" required value={started} onChange={e=>setStarted(e.target.value)}/></label><div className="modal-actions"><button type="button" className="secondary" onClick={()=>setShowAdd(false)}>Bekor qilish</button><button className="primary" type="submit">Yozuvni yaratish</button></div></form></div>}
    {showUpload&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setShowUpload(false);}}><form className="modal" onSubmit={addPhoto}><div className="modal-head"><div><h2>Surat yuklash</h2><p>Suratni tegishli yara tarixiga qo‘shing.</p></div><button type="button" className="icon-button" onClick={()=>setShowUpload(false)}><X size={19}/></button></div><label>Yarani tanlang<select required value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Yarani tanlang</option>{wounds.map(w=><option key={w.id} value={w.id}>{w.name} · {w.location}</option>)}</select></label><label className="upload-zone"><UploadCloud size={25}/><b>{file?file.name:"Surat tanlash"}</b><span>JPG, PNG or WEBP · max 10 MB</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setFile(e.target.files?.[0]||null)}/></label>{preview&&<img className="preview" src={preview} alt="Selected photo preview"/>}<label>Izoh (ixtiyoriy)<textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Surat haqida qisqa izoh yozing."/></label><div className="modal-actions"><button type="button" className="secondary" onClick={()=>setShowUpload(false)}>Cancel</button><button className="primary" type="submit" disabled={!file||!selected||file.size>10*1024*1024}>Suratni qo‘shish</button></div>{file&&file.size>10*1024*1024&&<p className="error">Fayl hajmi 10 MB dan katta.</p>}{!wounds.length&&<p className="error">Surat yuklashdan oldin yara yozuvini yarating.</p>}</form></div>}
  </div>;
}

function PhotoCompare({wounds,woundId,setWoundId,firstId,setFirstId,secondId,setSecondId}:{wounds:Wound[];woundId:string;setWoundId:(v:string)=>void;firstId:string;setFirstId:(v:string)=>void;secondId:string;setSecondId:(v:string)=>void}){
  const eligible=wounds.filter(w=>w.photos.length>=2);
  const wound=eligible.find(w=>w.id===woundId)||eligible[0];
  const first=wound.photos.find(p=>p.id===firstId)||wound.photos[wound.photos.length-1];
  const second=wound.photos.find(p=>p.id===secondId)||wound.photos[0];
  return <section className="card compare-card"><div className="compare-heading"><div><h3>Taqqoslash</h3><p>Bir yaraga tegishli ikki suratni yonma-yon ko‘ring</p></div><span className="compare-mark">↔</span></div>
    <label>Yara<select value={wound.id} onChange={e=>{setWoundId(e.target.value);setFirstId("");setSecondId("");}}>{eligible.map(w=><option key={w.id} value={w.id}>{w.name} · {w.location}</option>)}</select></label>
    <div className="compare-selects"><label>Birinchi surat<select value={first.id} onChange={e=>setFirstId(e.target.value)}>{wound.photos.map(p=><option key={p.id} value={p.id}>{new Date(p.date).toLocaleString()}</option>)}</select></label><label>Ikkinchi surat<select value={second.id} onChange={e=>setSecondId(e.target.value)}>{wound.photos.map(p=><option key={p.id} value={p.id}>{new Date(p.date).toLocaleString()}</option>)}</select></label></div>
    <div className="compare-images"><figure><img src={first.url} alt="Birinchi sana surati"/><figcaption><b>Birinchi surat</b><span>{new Date(first.date).toLocaleString()}</span></figcaption></figure><figure><img src={second.url} alt="Ikkinchi sana surati"/><figcaption><b>Ikkinchi surat</b><span>{new Date(second.date).toLocaleString()}</span></figcaption></figure></div>
    <p className="compare-disclaimer">Suratlar faqat vizual taqqoslash uchun. Bu ko‘rinish yara bitgani yoki infeksiya bor-yo‘qligini aniqlamaydi.</p>
  </section>;
}
\nfunction WoundCard({wound,onOpen}:{wound:Wound;onOpen:()=>void}){return <button className="card wound-card" onClick={onOpen}><div className="wound-card-icon"><HeartPulse size={20}/></div><div className="wound-card-copy"><b>{wound.name}</b><span>{wound.location}</span><small>{wound.photos.length} ta surat · Boshlangan sana: {wound.started}</small></div><span className="arrow">→</span></button>}
