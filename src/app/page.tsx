"use client";
import { useEffect, useRef, useState } from "react";
import { Activity, Bell, CalendarDays, Camera, HeartPulse, Home, Image as ImageIcon, Plus, ShieldCheck, UserRound, X, UploadCloud, Trash2 } from "lucide-react";

type Photo = { id: string; url: string; date: string; note: string; favorite?:boolean };
type WoundNote = { id:string; date:string; text:string };
type WoundMeasurement = { id:string; date:string; lengthMm:number; widthMm:number };
type WoundStatus = "Faol" | "Kuzatuvda" | "Yakunlangan";
type Wound = { id: string; name: string; location: string; started: string; photos: Photo[]; status?:WoundStatus; notes?:WoundNote[]; measurements?:WoundMeasurement[]; archived?:boolean; priority?: "Oddiy"|"Muhim"|"Yuqori"; followUpDate?:string; description?:string; tags?:string[] };
type PatientProfile = { fullName: string; email: string; phone: string; birthDate: string; emergencyContact: string };
const DB_NAME = "woundcare-local";
const STORE = "records";
function localDateInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
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
function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
async function compressImageToDataUrl(file: File): Promise<string> {
  try {
    if (typeof createImageBitmap !== "function") return fileToDataUrl(file);
    const bitmap = await createImageBitmap(file);
    const maxSide = 1600;
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) { bitmap.close(); return fileToDataUrl(file); }
    context.fillStyle = "#FFFFFF";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const compressed = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", 0.82));
    if (!compressed || compressed.size >= file.size) return fileToDataUrl(file);
    return fileToDataUrl(compressed);
  } catch {
    return fileToDataUrl(file);
  }
}
const nav = [{label:"Dashboard",title:"Bosh sahifa",icon:Home},{label:"My Wounds",title:"Yaralarim",icon:HeartPulse},{label:"Upload Photo",title:"Surat yuklash",icon:Camera},{label:"Photo History",title:"Suratlar tarixi",icon:ImageIcon},{label:"My Profile",title:"Profilim",icon:UserRound},{label:"Admin",title:"Admin panel",icon:ShieldCheck}];

export default function HomePage() {
  const [language,setLanguage] = useState<"uz"|"ru"|"en">("uz");
  const t=(uz:string)=>{const dict:Record<string,{ru:string;en:string}>={
    "Bosh sahifa":{ru:"Главная",en:"Dashboard"},"Yaralarim":{ru:"Мои раны",en:"My wounds"},"Surat yuklash":{ru:"Загрузить фото",en:"Upload photo"},"Suratlar tarixi":{ru:"История фото",en:"Photo history"},"Profilim":{ru:"Мой профиль",en:"My profile"},"Admin panel":{ru:"Панель администратора",en:"Admin panel"},
    "ASOSIY MENYU":{ru:"ГЛАВНОЕ МЕНЮ",en:"MAIN MENU"},"Xush kelibsiz 👋":{ru:"Добро пожаловать 👋",en:"Welcome 👋"},"Yara parvarishi va kuzatuvi bir joyda.":{ru:"Уход за ранами и наблюдение в одном месте.",en:"Wound care and tracking in one place."},
    "Yangi yara qo‘shish":{ru:"Добавить новую рану",en:"Add a new wound"},"Yara qo‘shish":{ru:"Добавить рану",en:"Add wound"},"Surat qo‘shish":{ru:"Добавить фото",en:"Add photo"},
    "Yara nomi":{ru:"Название раны",en:"Wound name"},"Joylashuvi":{ru:"Расположение",en:"Location"},"Boshlangan sana":{ru:"Дата начала",en:"Start date"},"Holati":{ru:"Статус",en:"Status"},"Faol":{ru:"Активна",en:"Active"},"Kuzatuvda":{ru:"Под наблюдением",en:"Monitoring"},"Yakunlangan":{ru:"Завершена",en:"Completed"},
    "Suratlar ketma-ketligi":{ru:"Хронология фотографий",en:"Photo timeline"},"Suratlarni filtrlash":{ru:"Фильтр фотографий",en:"Filter photos"},"Barcha yaralar":{ru:"Все раны",en:"All wounds"},"Filtrni tozalash":{ru:"Сбросить фильтр",en:"Clear filters"},"Qidirish":{ru:"Поиск",en:"Search"},"Eng yangi":{ru:"Сначала новые",en:"Newest first"},"Eng eski":{ru:"Сначала старые",en:"Oldest first"},"Faqat sevimlilar":{ru:"Только избранное",en:"Favorites only"},
    "Hozircha surat yo‘q":{ru:"Пока нет фотографий",en:"No photos yet"},"Surat yuklang va uni tegishli yara yozuviga biriktiring.":{ru:"Загрузите фото и прикрепите его к записи о ране.",en:"Upload a photo and attach it to the wound record."},"Bu filtr bo‘yicha surat topilmadi":{ru:"По этому фильтру фото не найдены",en:"No photos match this filter"},"Yara topilmadi":{ru:"Раны не найдены",en:"No wounds found"},
    "Muhim eslatma":{ru:"Важное замечание",en:"Important notice"},"Bemor profili":{ru:"Профиль пациента",en:"Patient profile"},"Profilni tahrirlash":{ru:"Редактировать профиль",en:"Edit profile"},"Telefon":{ru:"Телефон",en:"Phone"},"Tug‘ilgan sana":{ru:"Дата рождения",en:"Date of birth"},"Favqulodda aloqa":{ru:"Экстренный контакт",en:"Emergency contact"},"Saqlash":{ru:"Сохранить",en:"Save"},"Bekor qilish":{ru:"Отмена",en:"Cancel"},"Yopish":{ru:"Закрыть",en:"Close"},
    "Yara ma’lumotlarini tahrirlash":{ru:"Редактировать данные раны",en:"Edit wound details"},"Yara o‘lchami":{ru:"Размер раны",en:"Wound measurements"},"Uzunlik (mm)":{ru:"Длина (мм)",en:"Length (mm)"},"Kenglik (mm)":{ru:"Ширина (мм)",en:"Width (mm)"},"O‘lchamni saqlash":{ru:"Сохранить измерение",en:"Save measurement"},"Parvarish qaydi":{ru:"Запись об уходе",en:"Care note"},"Qaydni saqlash":{ru:"Сохранить запись",en:"Save note"},"Shu yaraga surat qo‘shish":{ru:"Добавить фото этой раны",en:"Add photo to this wound"},
    "Admin statistikasi faqat ushbu brauzerda saqlangan demo yozuvlar asosida hisoblanadi.":{ru:"Статистика администратора рассчитана только по демонстрационным записям в этом браузере.",en:"Admin statistics are based only on demo records stored in this browser."},"Demo admin paneli":{ru:"Демонстрационная панель администратора",en:"Demo admin panel"},"Jami yara yozuvlari":{ru:"Всего записей о ранах",en:"Total wound records"},"Faol yaralar":{ru:"Активные раны",en:"Active wounds"},"Jami suratlar":{ru:"Всего фотографий",en:"Total photos"},
    "Yara yozuvlarini boshqarish":{ru:"Управление записями о ранах",en:"Manage wound records"},"Tahrirlash":{ru:"Изменить",en:"Edit"},"Ko‘rish":{ru:"Просмотр",en:"View"},"Arxivlash":{ru:"В архив",en:"Archive"},"Arxivdan qaytarish":{ru:"Восстановить из архива",en:"Restore from archive"},"Hisobotni chop etish":{ru:"Распечатать отчёт",en:"Print report"},"CSV hisobotini yuklash":{ru:"Скачать CSV-отчёт",en:"Download CSV report"},
    "Zaxira nusxasi":{ru:"Резервная копия",en:"Backup"},"Zaxira nusxasini yuklash":{ru:"Скачать резервную копию",en:"Download backup"},"Zaxiradan tiklash":{ru:"Восстановить из копии",en:"Restore backup"},"Brauzer xotirasi":{ru:"Память браузера",en:"Browser storage"},"Xotirani tekshirish":{ru:"Проверить память",en:"Check storage"},
    "Kirish / Ro‘yxatdan o‘tish":{ru:"Войти / Регистрация",en:"Log in / Sign up"},"Demo seansidan chiqish":{ru:"Выйти из демо-сеанса",en:"Sign out of demo"},"Ro‘yxatdan o‘tish":{ru:"Регистрация",en:"Sign up"},"Tizimga kirish":{ru:"Вход в систему",en:"Log in"},"Davom etish":{ru:"Продолжить",en:"Continue"},
    "Surat izohini tahrirlash":{ru:"Изменить описание фото",en:"Edit photo note"},"Izohni tahrirlash":{ru:"Изменить описание",en:"Edit note"},"Yuklab olish":{ru:"Скачать",en:"Download"},"Suratni o‘chirish":{ru:"Удалить фото",en:"Delete photo"},"Suratni qo‘shish":{ru:"Добавить фото",en:"Add photo"},
    "Yozuvni yaratish":{ru:"Создать запись",en:"Create record"},"Yarani tanlang":{ru:"Выберите рану",en:"Select a wound"},"Surat tanlash":{ru:"Выбрать фото",en:"Choose photo"},"Izoh (ixtiyoriy)":{ru:"Комментарий (необязательно)",en:"Note (optional)"},
    "Birinchi surat":{ru:"Первое фото",en:"First photo"},"Ikkinchi surat":{ru:"Второе фото",en:"Second photo"},"Taqqoslash":{ru:"Сравнение",en:"Comparison"},"Yara nomi bo‘yicha qidirish":{ru:"Поиск по названию раны",en:"Search by wound name"},
    "Yara maydoni":{ru:"Площадь раны",en:"Wound area"},"Qayta ko‘rik sanasi":{ru:"Дата повторного осмотра",en:"Follow-up date"},"Muhimlik darajasi":{ru:"Уровень важности",en:"Priority level"},"Oddiy":{ru:"Обычный",en:"Normal"},"Muhim":{ru:"Важно",en:"Important"},"Yuqori":{ru:"Высокий",en:"High"},
    "Yara holatini suratlar orqali vaqt davomida hujjatlashtirishga yordam beradi.":{ru:"Помогает документировать состояние раны с помощью фотографий с течением времени.",en:"Helps document wound status over time using photos."}
  };return language==="uz"?uz:(dict[uz]?.[language]||uz);};
  const [active,setActive] = useState("Dashboard");
  const [wounds,setWounds] = useState<Wound[]>([]);
  const [showAdd,setShowAdd] = useState(false);
  const [showUpload,setShowUpload] = useState(false);
  const [selected,setSelected] = useState("");
  const [name,setName] = useState("");
  const [location,setLocation] = useState("");
  const [started,setStarted] = useState(localDateInputValue);
  const [note,setNote] = useState("");
  const [file,setFile] = useState<File|null>(null);
  const [fileError,setFileError] = useState("");
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
  const [viewPhoto,setViewPhoto] = useState<{photo:Photo;woundName:string}|null>(null);
  const [photoFrom,setPhotoFrom] = useState("");
  const [photoTo,setPhotoTo] = useState("");
  const [photoWoundFilter,setPhotoWoundFilter] = useState("all");
  const [woundSearch,setWoundSearch] = useState("");
  const [woundStatusFilter,setWoundStatusFilter] = useState("all");
  const [showArchived,setShowArchived] = useState(false);
  const [isAdmin,setIsAdmin] = useState(false);
  const [editingWound,setEditingWound] = useState<Wound|null>(null);
  const [editWoundName,setEditWoundName] = useState("");
  const [editWoundLocation,setEditWoundLocation] = useState("");
  const [editWoundStarted,setEditWoundStarted] = useState("");
  const [editWoundStatus,setEditWoundStatus] = useState<WoundStatus>("Faol");
  const [measurementLength,setMeasurementLength] = useState("");
  const [measurementWidth,setMeasurementWidth] = useState("");
  const [careNote,setCareNote] = useState("");
  const [photoSearch,setPhotoSearch] = useState("");
  const [photoSort,setPhotoSort] = useState("newest");
  const [favoritesOnly,setFavoritesOnly] = useState(false);
  const [editPhoto,setEditPhoto] = useState<{woundId:string;photo:Photo}|null>(null);
  const [editPhotoNote,setEditPhotoNote] = useState("");
  const [editWoundPriority,setEditWoundPriority] = useState<"Oddiy"|"Muhim"|"Yuqori">("Oddiy");
  const [editWoundFollowUp,setEditWoundFollowUp] = useState("");
  const [editWoundDescription,setEditWoundDescription] = useState("");
  const [editWoundTags,setEditWoundTags] = useState("");
  const [storageEstimate,setStorageEstimate] = useState("");
  const backupInputRef = useRef<HTMLInputElement>(null);
  const totalPhotos = wounds.reduce((n,w)=>n+w.photos.length,0);
  const activeWounds = wounds.filter(w=>!w.archived);
  const visibleWounds = wounds.filter(w=>(showArchived?!!w.archived:!w.archived)&&
    (w.name.toLowerCase().includes(woundSearch.toLowerCase())||w.location.toLowerCase().includes(woundSearch.toLowerCase()))&&
    (woundStatusFilter==="all"||(w.status||"Faol")===woundStatusFilter));
  const allPhotos = wounds.flatMap(w=>w.photos.map(p=>({...p,woundName:w.name}))).sort((a,b)=>b.date.localeCompare(a.date));
  const filteredPhotos = allPhotos.filter(p=>{
    const date = p.date.slice(0,10);
    return (photoWoundFilter==="all"||wounds.find(w=>w.name===p.woundName)?.id===photoWoundFilter)&&
      (!photoFrom||date>=photoFrom)&&(!photoTo||date<=photoTo);
  });
  const visiblePhotos = [...filteredPhotos].filter(p=>(!favoritesOnly||!!p.favorite)&&(!photoSearch||p.woundName.toLowerCase().includes(photoSearch.toLowerCase())||p.note.toLowerCase().includes(photoSearch.toLowerCase()))).sort((a,b)=>photoSort==="oldest"?a.date.localeCompare(b.date):b.date.localeCompare(a.date));
  const upcomingReviews = activeWounds.filter(w=>w.followUpDate).sort((a,b)=>(a.followUpDate||"").localeCompare(b.followUpDate||""));

  useEffect(()=>{try{const saved=localStorage.getItem("woundcare-language");if(saved==="uz"||saved==="ru"||saved==="en")setLanguage(saved);}catch{}},[]);
  useEffect(()=>{try{localStorage.setItem("woundcare-language",language);}catch{}},[language]);
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

  function openUpload() {
    if (!wounds.length) {
      setNotice("Avval yara yozuvini yarating, keyin unga surat qo‘shishingiz mumkin.");
      setActive("Dashboard");
      return;
    }
    if (!wounds.some(w=>w.id===selected)) setSelected(wounds[0].id);
    setFile(null);setFileError("");setNote("");
    setShowUpload(true);
  }
  function addWound(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const wound:Wound={id:crypto.randomUUID(),name:name.trim(),location:location.trim(),started,photos:[]};
    setWounds(current=>[wound,...current]);setSelected(wound.id);setName("");setLocation("");setShowAdd(false);setActive("My Wounds");setNotice("Yara yozuvi ushbu qurilmada yaratildi.");
  }
  function handleFileSelection(nextFile:File|null) {
    setFileError("");
    if (!nextFile) { setFile(null); return; }
    if (!["image/jpeg","image/png","image/webp"].includes(nextFile.type)) {
      setFile(null);setFileError("Faqat JPG, PNG yoki WEBP formatidagi suratni tanlang.");return;
    }
    if (nextFile.size > 10*1024*1024) {
      setFile(null);setFileError("Fayl hajmi 10 MB dan katta. Kichikroq surat tanlang.");return;
    }
    setFile(nextFile);
  }
  async function addPhoto(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if(!file||!selected||file.size>10*1024*1024)return;
    try {
      const dataUrl = await compressImageToDataUrl(file);
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
  function beginEditWound(wound:Wound) {
    setEditingWound(wound);setEditWoundName(wound.name);setEditWoundLocation(wound.location);
    setEditWoundStarted(wound.started);setEditWoundStatus(wound.status||"Faol");
    setEditWoundPriority(wound.priority||"Oddiy");setEditWoundFollowUp(wound.followUpDate||"");
    setEditWoundDescription(wound.description||"");setEditWoundTags((wound.tags||[]).join(", "));
  }
  function saveWoundEdit(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault();if(!editingWound)return;
    setWounds(current=>current.map(w=>w.id===editingWound.id?{...w,name:editWoundName.trim(),location:editWoundLocation.trim(),started:editWoundStarted,status:editWoundStatus,priority:editWoundPriority,followUpDate:editWoundFollowUp,description:editWoundDescription.trim(),tags:editWoundTags.split(",").map(t=>t.trim()).filter(Boolean)}:w));
    setEditingWound(null);setNotice("Yara ma’lumotlari yangilandi.");
  }
  function addMeasurement(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault();if(!selectedWound)return;
    const length=Number(measurementLength),width=Number(measurementWidth);
    if(!(length>0&&width>0))return;
    const entry:WoundMeasurement={id:crypto.randomUUID(),date:new Date().toISOString(),lengthMm:length,widthMm:width};
    setWounds(current=>current.map(w=>w.id===selectedWound.id?{...w,measurements:[entry,...(w.measurements||[])]}:w));
    setMeasurementLength("");setMeasurementWidth("");setNotice("O‘lcham qaydi saqlandi.");
  }
  function addCareNote(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault();if(!selectedWound||!careNote.trim())return;
    const entry:WoundNote={id:crypto.randomUUID(),date:new Date().toISOString(),text:careNote.trim()};
    setWounds(current=>current.map(w=>w.id===selectedWound.id?{...w,notes:[entry,...(w.notes||[])]}:w));
    setCareNote("");setNotice("Parvarish qaydi saqlandi.");
  }
  function togglePhotoFavorite(woundId:string,photoId:string) {
    setWounds(current=>current.map(w=>w.id===woundId?{...w,photos:w.photos.map(p=>p.id===photoId?{...p,favorite:!p.favorite}:p)}:w));
  }
  function savePhotoNote(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault();if(!editPhoto)return;
    setWounds(current=>current.map(w=>w.id===editPhoto.woundId?{...w,photos:w.photos.map(p=>p.id===editPhoto.photo.id?{...p,note:editPhotoNote.trim()}:p)}:w));
    setEditPhoto(null);setNotice("Surat izohi yangilandi.");
  }
  function downloadPhoto(photo:Photo,woundName:string) {
    const link=document.createElement("a");link.href=photo.url;link.download=(woundName.replace(/[^a-z0-9_-]/gi,"-")||"yara")+"-"+photo.date.slice(0,10)+".jpg";link.click();
  }
  function deleteCareNote(noteId:string) {
    if(!selectedWound||!window.confirm("Ushbu qaydni o‘chirasizmi?"))return;
    setWounds(current=>current.map(w=>w.id===selectedWound.id?{...w,notes:(w.notes||[]).filter(n=>n.id!==noteId)}:w));
  }
  function deleteMeasurement(measurementId:string) {
    if(!selectedWound||!window.confirm("Ushbu o‘lchov yozuvini o‘chirasizmi?"))return;
    setWounds(current=>current.map(w=>w.id===selectedWound.id?{...w,measurements:(w.measurements||[]).filter(m=>m.id!==measurementId)}:w));
  }
  function exportSingleWound(wound:Wound) {
    const rows=[["Yara",wound.name],["Joylashuv",wound.location],["Holat",wound.status||"Faol"],["Muhimlik",wound.priority||"Oddiy"],["Boshlangan sana",wound.started],["Qayta ko‘rik",wound.followUpDate||""],["Tavsif",wound.description||""],["Suratlar soni",String(wound.photos.length)],["O‘lchovlar",...(wound.measurements||[]).map(m=>new Date(m.date).toLocaleDateString()+" "+m.lengthMm+"x"+m.widthMm+" mm")],["Qaydlar",...(wound.notes||[]).map(n=>n.text)]];
    const csv="\\uFEFF"+rows.map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(",")).join("\\n");
    const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download="yara-"+wound.id+".csv";a.click();URL.revokeObjectURL(url);
  }
  function exportBackup() {
    const blob=new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),wounds,profile},null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="woundcare-zaxira.json";a.click();URL.revokeObjectURL(url);
  }
  async function importBackup(file:File) {
    try {
      const parsed=JSON.parse(await file.text());
      if(!parsed||parsed.version!==1||!Array.isArray(parsed.wounds))throw new Error("format");
      if(!window.confirm("Zaxira nusxasidagi ma’lumotlar joriy yozuvlar bilan almashtiriladi. Davom etasizmi?"))return;
      setWounds(parsed.wounds);if(parsed.profile)setProfile(parsed.profile);setNotice("Zaxira nusxasi yuklandi.");
    } catch { setStorageError("Zaxira fayli noto‘g‘ri yoki o‘qib bo‘lmadi."); }
  }
  async function checkStorage() {
    const estimate=await navigator.storage?.estimate?.();
    if(!estimate){setStorageEstimate("Brauzer xotirasi hajmini aniqlab bo‘lmadi.");return;}
    const used=Math.round((estimate.usage||0)/1024/1024*10)/10;
    const quota=Math.round((estimate.quota||0)/1024/1024);
    setStorageEstimate("Taxminan "+used+" MB ishlatilgan / "+quota+" MB mavjud.");
  }
  function toggleArchive(wound:Wound) {
    const next=!wound.archived;
    if(next&&!window.confirm("Bu yara yozuvini arxivga o‘tkazmoqchimisiz?"))return;
    setWounds(current=>current.map(w=>w.id===wound.id?{...w,archived:next}:w));
    setNotice(next?"Yara arxivlandi.":"Yara arxivdan qaytarildi.");
  }
  function exportWoundsCsv() {
    const rows=[["Yara","Joylashuv","Boshlangan sana","Holat","Suratlar soni","Uzunlik (mm)","Kenglik (mm)","Parvarish qaydlari"],
      ...wounds.map(w=>[w.name,w.location,w.started,w.status||"Faol",String(w.photos.length),String(w.measurements?.[0]?.lengthMm??""),String(w.measurements?.[0]?.widthMm??""),(w.notes||[]).map(n=>n.text).join(" | ")])];
    const csv="\uFEFF"+rows.map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(",")).join("\n");
    const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
    const link=document.createElement("a");link.href=url;link.download="woundcare-hisobot.csv";link.click();URL.revokeObjectURL(url);
  }
  function printWoundReport() { window.print(); }
  const selectedWound=wounds.find(w=>w.id===selected);

  return <div className="shell">
    <aside className="sidebar"><div className="brand"><div className="brand-mark">✚</div>WoundCare</div><div className="language-switch" aria-label="Tilni tanlash"><span>{language==="uz"?"Til":language==="ru"?"Язык":"Language"}</span><select value={language} onChange={e=>setLanguage(e.target.value as "uz"|"ru"|"en")}><option value="uz">O‘zbekcha</option><option value="ru">Русский</option><option value="en">English</option></select></div><div className="nav-label">{t("ASOSIY MENYU")}</div>
      {nav.map(item=>{const Icon=item.icon;return <button key={item.label} onClick={()=>{setActive(item.label);setNotice("");if(item.label==="Upload Photo")openUpload();}} className={"nav-item "+(active===item.label?"active":"")}><Icon size={17}/>{t(item.title)}</button>;})}
      <div className="sidebar-foot">Where care meets progress.<br/>Your wound history, in one place.</div>
    </aside>
    <main className="main">
      <header className="topbar"><div><div className="eyebrow">MONITOR · TRACK · CARE</div><h1>{active==="Dashboard"?t("Xush kelibsiz 👋"):t(nav.find(item=>item.label===active)?.title||active)}</h1><div className="sub">{active==="Dashboard"?"Yara parvarishi yozuvlaringizning qisqacha ko‘rinishi.":"Ma’lumotlaringizni bir joyda tartibli saqlang."}</div></div><div className="top-actions"><Bell size={19} color="#66847D"/><div className="avatar">U</div></div></header>
      <section className="grid">
        <div className="card"><div className="stat-top"><span>Kuzatilayotgan yaralar</span><span className="stat-icon"><HeartPulse size={17}/></span></div><div className="stat-value">{wounds.length}</div><div className="stat-note">Alohida yara yozuvlari</div></div>
        <div className="card"><div className="stat-top"><span>Saqlangan suratlar</span><span className="stat-icon"><Camera size={17}/></span></div><div className="stat-value">{totalPhotos}</div><div className="stat-note">Suratlar shu qurilmada saqlanadi</div></div>
        <div className="card"><div className="stat-top"><span>Oxirgi yangilanish</span><span className="stat-icon"><CalendarDays size={17}/></span></div><div className="stat-value date-value">{allPhotos[0]?new Date(allPhotos[0].date).toLocaleDateString():"—"}</div><div className="stat-note">{allPhotos.length?"Eng so‘nggi surat":"Hozircha surat yo‘q"}</div></div>
      </section>
      {!ready&&<div className="status-note">Saqlangan ma’lumotlar yuklanmoqda…</div>}
      {storageError&&<div className="status-note" role="alert">{storageError}</div>}
      {notice&&<div className="status-note" role="status">{notice}</div>}
      {active==="Dashboard"&&<section className="quick-actions"><div className="quick-heading"><h2>Tezkor amallar</h2><span>Kerakli bo‘limga tez o‘ting</span></div><div className="quick-grid"><button className="quick-action" onClick={()=>setShowAdd(true)}><span className="quick-icon"><Plus size={19}/></span><b>Yara qo‘shish</b><small>Yangi yara yozuvini yarating</small></button><button className="quick-action" onClick={openUpload}><span className="quick-icon"><Camera size={19}/></span><b>Surat yuklash</b><small>Yara holatini suratga oling</small></button><button className="quick-action" onClick={()=>setActive("Photo History")}><span className="quick-icon"><ImageIcon size={19}/></span><b>Suratlar tarixini ko‘rish</b><small>Oldingi suratlarni taqqoslang</small></button><button className="quick-action" onClick={()=>setActive("My Profile")}><span className="quick-icon"><UserRound size={19}/></span><b>Profilim</b><small>Kontakt ma’lumotlarini yangilang</small></button></div></section>}
      {active==="Dashboard"&&upcomingReviews.length>0&&<section className="card upcoming-card"><h2>Rejalashtirilgan qayta ko‘riklar</h2>{upcomingReviews.slice(0,5).map(w=><div key={w.id}><span>{w.name} · {w.location} {w.followUpDate&&w.followUpDate<localDateInputValue()?"· Muddati o‘tgan":""}</span><b>{w.followUpDate}</b></div>)}</section>}{active==="Dashboard"&&<><div className="section-head"><h2>Yaralarim</h2><button className="small-link" onClick={()=>setActive("My Wounds")}>Barchasini ko‘rish →</button></div>
        {wounds.length===0?<section className="card empty"><div><div className="empty-icon"><Activity size={27}/></div><h3>Kuzatuvni shu yerdan boshlang</h3><p>Har bir yara uchun alohida yozuv oching va vaqt o‘tishi bilan suratlarini taqqoslash uchun tarix yarating.</p><button className="primary" onClick={()=>setShowAdd(true)}><Plus size={15}/> Birinchi yarani qo‘shish</button></div></section>:<div className="wound-grid">{wounds.slice(0,3).map(w=><WoundCard key={w.id} wound={w} onOpen={()=>{setSelected(w.id);setActive("My Wounds");}}/>)}</div>}
        <div className="section-head"><h2>So‘nggi faollik</h2><button className="small-link" onClick={()=>setActive("Photo History")}>Tarixni ko‘rish →</button></div>
        <section className="card activity-card">{allPhotos.length?allPhotos.slice(0,3).map(p=><div className="activity" key={p.id}><span className="dot"/><span>Surat <b>{p.woundName}</b> yarasiga qo‘shildi · {new Date(p.date).toLocaleString()}</span></div>):<div className="activity"><span className="dot"/>Hozircha faollik yo‘q. Yuklangan suratlar shu yerda ko‘rinadi.</div>}</section>
      </>}
      {active==="My Wounds"&&<><div className="section-head"><h2>Yara yozuvlari</h2><button className="primary" onClick={()=>setShowAdd(true)}><Plus size={15}/> Yara qo‘shish</button></div><div className="wound-tools"><input aria-label="Yara qidirish" placeholder="Yara nomi yoki joylashuvi bo‘yicha qidirish" value={woundSearch} onChange={e=>setWoundSearch(e.target.value)}/><select value={woundStatusFilter} onChange={e=>setWoundStatusFilter(e.target.value)}><option value="all">Barcha holatlar</option><option>Faol</option><option>Kuzatuvda</option><option>Yakunlangan</option></select><button className="secondary" onClick={()=>setShowArchived(v=>!v)}>{showArchived?"Faol yaralarni ko‘rish":"Arxivni ko‘rish"}</button><button className="secondary" onClick={exportWoundsCsv}>CSV eksport</button><button className="secondary" onClick={printWoundReport}>Hisobotni chop etish</button></div>{visibleWounds.length?<div className="wound-grid">{visibleWounds.map(w=><WoundCard key={w.id} wound={w} onOpen={()=>setSelected(w.id)}/>)}</div>:<div className="card empty"><div><h3>{t("Yara topilmadi")}</h3><p>Qidiruv yoki filtrni o‘zgartiring.</p></div></div>}
        {selectedWound&&<section className="card detail-card"><div className="section-head"><div><h2>{selectedWound.name}</h2><p className="muted">{selectedWound.location} · Boshlangan sana: {selectedWound.started}</p></div><button className="small-link danger" onClick={()=>removeWound(selectedWound.id)}><Trash2 size={14}/> Yara yozuvini o‘chirish</button></div><div className="detail-admin-actions"><button className="secondary" onClick={()=>beginEditWound(selectedWound)}>Yara ma’lumotlarini tahrirlash</button><button className="secondary" onClick={()=>toggleArchive(selectedWound)}>{selectedWound.archived?"Arxivdan qaytarish":"Arxivlash"}</button><button className="secondary" onClick={printWoundReport}>Hisobotni chop etish</button></div><div className="wound-status-line">Holati: <b>{selectedWound.status||"Faol"}</b>{selectedWound.archived&&<b> · Arxivlangan</b>}</div><div className="wound-detail-stats"><div><span>{t("Jami suratlar")}</span><b>{selectedWound.photos.length}</b></div><div><span>Oxirgi surat sanasi</span><b>{selectedWound.photos[0]?new Date(selectedWound.photos[0].date).toLocaleDateString():"Hali surat yo‘q"}</b></div><div><span>Kuzatuv boshlangan</span><b>{selectedWound.started}</b></div><div><span>Kuzatuv muddati</span><b>{Math.max(0,Math.floor((Date.now()-new Date(selectedWound.started+"T00:00:00").getTime())/86400000))} kun</b></div><div><span>Oxirgi taxminiy maydon</span><b>{selectedWound.measurements?.[0]?(selectedWound.measurements[0].lengthMm*selectedWound.measurements[0].widthMm/100).toFixed(2)+" cm²":"O‘lchov yo‘q"}</b></div></div><div className="detail-photo-heading"><h3>Shu yaraning suratlar tarixi</h3><span>{selectedWound.photos.length} ta yozuv</span></div>{selectedWound.photos.length?<div className="detail-photo-list">{selectedWound.photos.map(photo=><button type="button" className="detail-photo-item" key={photo.id} onClick={()=>setViewPhoto({photo,woundName:selectedWound.name})}><img src={photo.url} alt={selectedWound.name+" surati"}/><span><b>{new Date(photo.date).toLocaleDateString()}</b><small>{new Date(photo.date).toLocaleTimeString()}</small>{photo.note&&<small>{photo.note}</small>}</span><span className="arrow">→</span></button>)}</div>:<p className="muted detail-empty">Bu yara uchun hali surat yuklanmagan.</p>}<div className="wound-metadata"><div><span>Muhimlik</span><b>{selectedWound.priority||"Oddiy"}</b></div><div><span>Qayta ko‘rik</span><b>{selectedWound.followUpDate||"Belgilanmagan"}</b></div><div><span>Teglar</span><b>{(selectedWound.tags||[]).join(", ")||"Yo‘q"}</b></div></div>{selectedWound.description&&<p className="muted">{selectedWound.description}</p>}<div className="detail-admin-actions"><button className="secondary" onClick={()=>exportSingleWound(selectedWound)}>Shu yara hisoboti (CSV)</button></div>{(selectedWound.measurements||[]).length>1&&<div className="measurement-trend"><b>O‘lchovlar tarixi</b>{[...(selectedWound.measurements||[])].reverse().map(m=><span key={m.id}>{new Date(m.date).toLocaleDateString()} · {m.lengthMm} × {m.widthMm} mm</span>)}</div>}<div className="detail-extra-grid"><form className="card mini-form" onSubmit={addMeasurement}><h3>{t("Yara o‘lchami")}</h3><p>Qo‘lda kiritiladi, tashxis emas.</p><label>Uzunlik (mm)<input type="number" min="0.1" step="0.1" required value={measurementLength} onChange={e=>setMeasurementLength(e.target.value)}/></label><label>Kenglik (mm)<input type="number" min="0.1" step="0.1" required value={measurementWidth} onChange={e=>setMeasurementWidth(e.target.value)}/></label><button className="primary">{t("O‘lchamni saqlash")}</button>{(selectedWound.measurements||[]).slice(0,5).map(m=><small className="history-line" key={m.id}>{new Date(m.date).toLocaleDateString()}: {m.lengthMm} × {m.widthMm} mm <button type="button" onClick={()=>deleteMeasurement(m.id)}>O‘chirish</button></small>)}</form><form className="card mini-form" onSubmit={addCareNote}><h3>{t("Parvarish qaydi")}</h3><p>Kuzatuv va parvarish haqida yozing.</p><textarea required value={careNote} onChange={e=>setCareNote(e.target.value)} placeholder="Masalan, bog‘lam almashtirildi..."/><button className="primary">{t("Qaydni saqlash")}</button>{(selectedWound.notes||[]).slice(0,5).map(n=><small className="history-line" key={n.id}>{new Date(n.date).toLocaleDateString()}: {n.text} <button type="button" onClick={()=>deleteCareNote(n.id)}>O‘chirish</button></small>)}</form></div><button className="primary" onClick={openUpload}> <Camera size={15}/> Shu yaraga surat qo‘shish</button></section>}
      </>}
      {active==="Photo History"&&<><div className="section-head"><h2>{t("Suratlar ketma-ketligi")}</h2><button className="primary" onClick={openUpload}><Camera size={15}/> Surat qo‘shish</button></div>
        {wounds.some(w=>w.photos.length>=2)&&<PhotoCompare wounds={wounds} woundId={compareWoundId} setWoundId={setCompareWoundId} firstId={compareFirstId} setFirstId={setCompareFirstId} secondId={compareSecondId} setSecondId={setCompareSecondId}/>}
        <section className="card photo-filters"><div><b>{t("Suratlarni filtrlash")}</b><span>Yara yoki sana oralig‘ini tanlang</span></div><label>Yara<select value={photoWoundFilter} onChange={e=>setPhotoWoundFilter(e.target.value)}><option value="all">{t("Barcha yaralar")}</option>{wounds.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></label><label>Dan<input type="date" value={photoFrom} max={photoTo||undefined} onChange={e=>setPhotoFrom(e.target.value)}/></label><label>Gacha<input type="date" value={photoTo} min={photoFrom||undefined} onChange={e=>setPhotoTo(e.target.value)}/></label><button type="button" className="small-link" onClick={()=>{setPhotoWoundFilter("all");setPhotoFrom("");setPhotoTo("");setPhotoSearch("");setFavoritesOnly(false);setPhotoSort("newest");}}>{t("Filtrni tozalash")}</button><label>Qidirish<input value={photoSearch} onChange={e=>setPhotoSearch(e.target.value)} placeholder={t("Yara nomi yoki izoh")}/></label><label>Tartiblash<select value={photoSort} onChange={e=>setPhotoSort(e.target.value)}><option value="newest">{t("Eng yangi")}</option><option value="oldest">{t("Eng eski")}</option></select></label><label className="favorite-filter"><input type="checkbox" checked={favoritesOnly} onChange={e=>setFavoritesOnly(e.target.checked)}/> {t("Faqat sevimlilar")}</label></section>{visiblePhotos.length?<div className="photo-grid">{visiblePhotos.map(p=><article className="card photo-card" key={p.id}><button type="button" className="photo-open" onClick={()=>setViewPhoto({photo:p,woundName:p.woundName})} aria-label="Suratni kattalashtirib ko‘rish"><img src={p.url} alt="Yara surati"/></button><div className="photo-meta"><b>{p.woundName}</b><span>{new Date(p.date).toLocaleString()}</span>{p.note&&<p>{p.note}</p>}<div className="photo-actions"><button className="small-link" onClick={()=>togglePhotoFavorite(wounds.find(x=>x.photos.some(ph=>ph.id===p.id))?.id||"",p.id)}>{p.favorite?"★ Sevimlidan olish":"☆ Sevimliga qo‘shish"}</button><button className="small-link" onClick={()=>{const w=wounds.find(x=>x.photos.some(ph=>ph.id===p.id));if(w){setEditPhoto({woundId:w.id,photo:p});setEditPhotoNote(p.note);}}}>Izohni tahrirlash</button><button className="small-link" onClick={()=>downloadPhoto(p,p.woundName)}>Yuklab olish</button><button className="small-link danger" onClick={()=>{const w=wounds.find(x=>x.photos.some(ph=>ph.id===p.id));if(w)removePhoto(w.id,p.id);}}>Suratni o‘chirish</button></div></div></article>)}</div>:allPhotos.length?<div className="card empty"><div><h3>{t("Bu filtr bo‘yicha surat topilmadi")}</h3><p>Sana oralig‘ini o‘zgartiring yoki filtrni tozalang.</p></div></div>:<div className="card empty"><div><div className="empty-icon"><ImageIcon size={26}/></div><h3>{t("Hozircha surat yo‘q")}</h3><p>Surat yuklang va uni tegishli yara yozuviga biriktiring.</p><button className="primary" onClick={openUpload}><Camera size={15}/> Surat yuklash</button></div></div>}</>}
      {active==="Admin"&&<section className="admin-page"><div className="admin-warning"><b>{t("Demo admin paneli")}</b><span>Bu brauzer ichidagi namoyish. Haqiqiy admin huquqlari, foydalanuvchi akkauntlari yoki server ma’lumotlariga ulanmagan.</span><button className="secondary" onClick={()=>setIsAdmin(v=>!v)}>{isAdmin?"Admin ko‘rinishini yopish":"Demo admin ko‘rinishini yoqish"}</button></div>{isAdmin?<><div className="grid admin-stats"><div className="card"><span>{t("Jami yara yozuvlari")}</span><b>{wounds.length}</b></div><div className="card"><span>{t("Faol yaralar")}</span><b>{activeWounds.length}</b></div><div className="card"><span>{t("Jami suratlar")}</span><b>{totalPhotos}</b></div></div><div className="admin-tools"><div className="card"><h3>{t("Zaxira nusxasi")}</h3><p>Ma’lumotlaringizni JSON faylga saqlang yoki oldingi nusxani tiklang.</p><div className="admin-buttons"><button className="secondary" onClick={exportBackup}>{t("Zaxira nusxasini yuklash")}</button><button className="secondary" onClick={()=>backupInputRef.current?.click()}>{t("Zaxiradan tiklash")}</button><input ref={backupInputRef} type="file" accept="application/json,.json" hidden onChange={e=>{const f=e.target.files?.[0];if(f)importBackup(f);e.currentTarget.value="";}}/></div></div><div className="card"><h3>{t("Brauzer xotirasi")}</h3><p>Suratlar va yozuvlar ushbu qurilmada saqlanadi.</p><button className="secondary" onClick={()=>{checkStorage().catch(()=>setStorageEstimate("Xotira ma’lumotini olish imkoni bo‘lmadi."));}}>{t("Xotirani tekshirish")}</button>{storageEstimate&&<small>{storageEstimate}</small>}</div></div><div className="section-head"><h2>{t("Yara yozuvlarini boshqarish")}</h2><button className="secondary" onClick={exportWoundsCsv}>CSV hisobotini yuklash</button></div><div className="admin-table">{wounds.map(w=><div className="admin-row" key={w.id}><div><b>{w.name}</b><small>{w.location} · {w.photos.length} ta surat · {w.status||"Faol"}</small></div><button className="secondary" onClick={()=>{setSelected(w.id);setActive("My Wounds");}}>Ko‘rish</button><button className="secondary" onClick={()=>beginEditWound(w)}>Tahrirlash</button><button className="secondary" onClick={()=>toggleArchive(w)}>{w.archived?"Arxivdan qaytarish":"Arxivlash"}</button></div>)}</div><p className="muted">Admin statistikasi faqat ushbu brauzerda saqlangan demo yozuvlar asosida hisoblanadi.</p></>:<p className="muted">Demo boshqaruvini yoqish tugmasini bosing.</p>}</section>}
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
    <nav className="mobile-menu">{nav.slice(0,4).map(item=>{const Icon=item.icon;return <button key={item.label} className={active===item.label?"active":""} onClick={()=>{setActive(item.label);if(item.label==="Upload Photo")openUpload();}}><Icon size={18}/>{item.label==="Dashboard"?"Bosh sahifa":item.label==="My Wounds"?"Yaralar":item.label==="Upload Photo"?"Yuklash":"Tarix"}</button>;})}</nav>
    {viewPhoto&&<div className="modal-backdrop photo-lightbox" onMouseDown={e=>{if(e.target===e.currentTarget)setViewPhoto(null);}}><section className="photo-viewer"><div className="modal-head"><div><h2>{viewPhoto.woundName}</h2><p>{new Date(viewPhoto.photo.date).toLocaleString()}</p></div><button type="button" className="icon-button" onClick={()=>setViewPhoto(null)}><X size={19}/></button></div><img src={viewPhoto.photo.url} alt="Yara surati kattalashtirilgan"/>{viewPhoto.photo.note&&<p>{viewPhoto.photo.note}</p>}<button className="secondary" onClick={()=>setViewPhoto(null)}>Yopish</button></section></div>}
    {editingProfile&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setEditingProfile(false);}}><form className="modal" onSubmit={e=>{e.preventDefault();saveProfile(profile).catch(()=>setStorageError("Profilni saqlab bo‘lmadi."));}}><div className="modal-head"><div><h2>{t("Profilni tahrirlash")}</h2><p>Kontakt ma’lumotlaringizni kiriting.</p></div><button type="button" className="icon-button" onClick={()=>setEditingProfile(false)}><X size={19}/></button></div><label>To‘liq ism<input required value={profile.fullName} onChange={e=>setProfile({...profile,fullName:e.target.value})} placeholder="Ism va familiya"/></label><label>Email<input type="email" value={profile.email} onChange={e=>setProfile({...profile,email:e.target.value})} placeholder="name@example.com"/></label><label>Telefon<input type="tel" value={profile.phone} onChange={e=>setProfile({...profile,phone:e.target.value})} placeholder="+998 90 123 45 67"/></label><label>Tug‘ilgan sana<input type="date" value={profile.birthDate} onChange={e=>setProfile({...profile,birthDate:e.target.value})}/></label><label>Favqulodda aloqa (ism va telefon)<input value={profile.emergencyContact} onChange={e=>setProfile({...profile,emergencyContact:e.target.value})} placeholder="Yaqin insoningiz va telefon raqami"/></label><div className="modal-actions"><button type="button" className="secondary" onClick={()=>setEditingProfile(false)}>{t("Bekor qilish")}</button><button className="primary" type="submit">{t("Saqlash")}</button></div></form></div>}
    {authMode&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setAuthMode(null);}}><form className="modal" onSubmit={finishDemoAuth}><div className="modal-head"><div><h2>{authMode==="register"?"Ro‘yxatdan o‘tish":"Tizimga kirish"}</h2><p>Bu hozircha server ulanmagan demo ko‘rinishidir.</p></div><button type="button" className="icon-button" onClick={()=>setAuthMode(null)}><X size={19}/></button></div>{authMode==="register"&&<label>To‘liq ism<input required value={authName} onChange={e=>setAuthName(e.target.value)} placeholder="Ism va familiya"/></label>}<label>Email<input type="email" required value={authEmail} onChange={e=>setAuthEmail(e.target.value)} placeholder="name@example.com"/></label><label>Parol (faqat demo tekshiruvi)<input type="password" required minLength={6} value={authPassword} onChange={e=>setAuthPassword(e.target.value)} placeholder="Kamida 6 belgi"/></label><p className="demo-auth-warning">Parol serverga yuborilmaydi va saqlanmaydi. Haqiqiy autentifikatsiya server ulangandan keyin qo‘shiladi.</p><div className="modal-actions"><button type="button" className="secondary" onClick={()=>setAuthMode(authMode==="register"?"login":"register")}>{authMode==="register"?"Kirish":"Ro‘yxatdan o‘tish"}</button><button className="primary" type="submit">Davom etish</button></div></form></div>}
    {editingWound&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setEditingWound(null);}}><form className="modal" onSubmit={saveWoundEdit}><div className="modal-head"><div><h2>{t("Yara ma’lumotlarini tahrirlash")}</h2><p>Yozuv ma’lumotlarini yangilang.</p></div><button type="button" className="icon-button" onClick={()=>setEditingWound(null)}><X size={19}/></button></div><label>Yara nomi<input required value={editWoundName} onChange={e=>setEditWoundName(e.target.value)}/></label><label>Joylashuvi<input required value={editWoundLocation} onChange={e=>setEditWoundLocation(e.target.value)}/></label><label>Boshlangan sana<input type="date" required value={editWoundStarted} onChange={e=>setEditWoundStarted(e.target.value)}/></label><label>Holati<select value={editWoundStatus} onChange={e=>setEditWoundStatus(e.target.value as WoundStatus)}><option>Faol</option><option>Kuzatuvda</option><option>Yakunlangan</option></select></label><label>Muhimlik darajasi<select value={editWoundPriority} onChange={e=>setEditWoundPriority(e.target.value as "Oddiy"|"Muhim"|"Yuqori")}><option>Oddiy</option><option>Muhim</option><option>Yuqori</option></select></label><label>Qayta ko‘rik sanasi<input type="date" value={editWoundFollowUp} onChange={e=>setEditWoundFollowUp(e.target.value)}/></label><label>Tavsif<textarea value={editWoundDescription} onChange={e=>setEditWoundDescription(e.target.value)} placeholder="Yara haqida qo‘shimcha ma’lumot"/></label><label>Teglar (vergul bilan)<input value={editWoundTags} onChange={e=>setEditWoundTags(e.target.value)} placeholder="masalan: diabet, tovon, chap oyoq"/></label><div className="modal-actions"><button type="button" className="secondary" onClick={()=>setEditingWound(null)}>Bekor qilish</button><button className="primary">Saqlash</button></div></form></div>}
    {showAdd&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setShowAdd(false);}}><form className="modal" onSubmit={addWound}><div className="modal-head"><div><h2>Yara qo‘shish</h2><p>Kuzatish uchun alohida yozuv yarating.</p></div><button type="button" className="icon-button" onClick={()=>setShowAdd(false)}><X size={19}/></button></div><label>Yara nomi<input required value={name} onChange={e=>setName(e.target.value)} placeholder="Masalan, chap oyoq yarasi"/></label><label>Tanadagi joylashuvi<input required value={location} onChange={e=>setLocation(e.target.value)} placeholder="Masalan, chap tovon"/></label><label>Birinchi aniqlangan sana<input type="date" required value={started} onChange={e=>setStarted(e.target.value)}/></label><div className="modal-actions"><button type="button" className="secondary" onClick={()=>setShowAdd(false)}>Bekor qilish</button><button className="primary" type="submit">Yozuvni yaratish</button></div></form></div>}
    {editPhoto&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setEditPhoto(null);}}><form className="modal" onSubmit={savePhotoNote}><div className="modal-head"><div><h2>{t("Surat izohini tahrirlash")}</h2><p>Suratga tegishli qaydni yangilang.</p></div><button type="button" className="icon-button" onClick={()=>setEditPhoto(null)}><X size={19}/></button></div><label>Izoh<textarea value={editPhotoNote} onChange={e=>setEditPhotoNote(e.target.value)} placeholder="Surat haqida qayd..."/></label><div className="modal-actions"><button type="button" className="secondary" onClick={()=>setEditPhoto(null)}>Bekor qilish</button><button className="primary">Saqlash</button></div></form></div>}
    {showUpload&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setShowUpload(false);}}><form className="modal" onSubmit={addPhoto}><div className="modal-head"><div><h2>Surat yuklash</h2><p>Suratni tegishli yara tarixiga qo‘shing.</p></div><button type="button" className="icon-button" onClick={()=>setShowUpload(false)}><X size={19}/></button></div><label>Yarani tanlang<select required value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Yarani tanlang</option>{wounds.map(w=><option key={w.id} value={w.id}>{w.name} · {w.location}</option>)}</select></label><label className="upload-zone"><UploadCloud size={25}/><b>{file?file.name:"Surat tanlash"}</b><span>JPG, PNG yoki WEBP · maksimal 10 MB. Saqlashdan oldin optimallashtiriladi.</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>handleFileSelection(e.target.files?.[0]||null)}/></label>{preview&&<img className="preview" src={preview} alt="Selected photo preview"/>}<label>Izoh (ixtiyoriy)<textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Surat haqida qisqa izoh yozing."/></label><div className="modal-actions"><button type="button" className="secondary" onClick={()=>setShowUpload(false)}>Bekor qilish</button><button className="primary" type="submit" disabled={!file||!selected||file.size>10*1024*1024}>Suratni qo‘shish</button></div>{fileError&&<p className="error" role="alert">{fileError}</p>}{!wounds.length&&<p className="error">Surat yuklashdan oldin yara yozuvini yarating.</p>}</form></div>}
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

function WoundCard({wound,onOpen}:{wound:Wound;onOpen:()=>void}){return <button className="card wound-card" onClick={onOpen}><div className="wound-card-icon"><HeartPulse size={20}/></div><div className="wound-card-copy"><b>{wound.name}</b><span>{wound.location}</span><small>{wound.photos.length} ta surat · Boshlangan sana: {wound.started}</small></div><span className="arrow">→</span></button>}
