"use client";
import { useEffect, useRef, useState } from "react";
import { Activity, Bell, CalendarDays, Camera, HeartPulse, Home, Image as ImageIcon, Plus, ShieldCheck, UserRound, X, UploadCloud, Trash2, Share2 } from "lucide-react";

type Photo = { id: string; url: string; date: string; note: string; favorite?:boolean };
type WoundNote = { id:string; date:string; text:string };
type WoundMeasurement = { id:string; date:string; lengthMm:number; widthMm:number };
type WoundCheckIn = { id:string; date:string; pain:number; drainage:"Yo‘q"|"Oz"|"O‘rtacha"|"Ko‘p"; odor:boolean; colorChange:boolean; edgeChange:boolean; note:string };
type WoundStatus = "Faol" | "Kuzatuvda" | "Yakunlangan";
type Wound = { id: string; name: string; location: string; started: string; photos: Photo[]; status?:WoundStatus; notes?:WoundNote[]; measurements?:WoundMeasurement[]; checks?:WoundCheckIn[]; archived?:boolean; priority?: "Oddiy"|"Muhim"|"Yuqori"; followUpDate?:string; description?:string; tags?:string[] };
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
  const t=(uz:string)=>{const dict:Record<string,{ru:string;en:string}>={"Bosh sahifa":{ru:"Главная",en:"Dashboard"},"Yaralarim":{ru:"Мои раны",en:"My wounds"},"Surat yuklash":{ru:"Загрузить фото",en:"Upload photo"},"Suratlar tarixi":{ru:"История фото",en:"Photo history"},"Profilim":{ru:"Мой профиль",en:"My profile"},"Admin panel":{ru:"Панель администратора",en:"Admin panel"},"ASOSIY MENYU":{ru:"ГЛАВНОЕ МЕНЮ",en:"MAIN MENU"},"Xush kelibsiz 👋":{ru:"Добро пожаловать 👋",en:"Welcome 👋"},"Yara parvarishi va kuzatuvi bir joyda.":{ru:"Уход за ранами и наблюдение в одном месте.",en:"Wound care and tracking in one place."},"Yangi yara qo‘shish":{ru:"Добавить новую рану",en:"Add a new wound"},"Yara qo‘shish":{ru:"Добавить рану",en:"Add wound"},"Surat qo‘shish":{ru:"Добавить фото",en:"Add photo"},"Yara nomi":{ru:"Название раны",en:"Wound name"},"Joylashuvi":{ru:"Расположение",en:"Location"},"Boshlangan sana":{ru:"Дата начала",en:"Start date"},"Holati":{ru:"Статус",en:"Status"},"Faol":{ru:"Активна",en:"Active"},"Kuzatuvda":{ru:"Под наблюдением",en:"Monitoring"},"Yakunlangan":{ru:"Завершена",en:"Completed"},"Suratlar ketma-ketligi":{ru:"Хронология фотографий",en:"Photo timeline"},"Suratlarni filtrlash":{ru:"Фильтр фотографий",en:"Filter photos"},"Barcha yaralar":{ru:"Все раны",en:"All wounds"},"Filtrni tozalash":{ru:"Сбросить фильтр",en:"Clear filters"},"Qidirish":{ru:"Поиск",en:"Search"},"Eng yangi":{ru:"Сначала новые",en:"Newest first"},"Eng eski":{ru:"Сначала старые",en:"Oldest first"},"Faqat sevimlilar":{ru:"Только избранное",en:"Favorites only"},"Hozircha surat yo‘q":{ru:"Пока нет фотографий",en:"No photos yet"},"Surat yuklang va uni tegishli yara yozuviga biriktiring.":{ru:"Загрузите фото и прикрепите его к записи о ране.",en:"Upload a photo and attach it to the wound record."},"Bu filtr bo‘yicha surat topilmadi":{ru:"По этому фильтру фото не найдены",en:"No photos match this filter"},"Yara topilmadi":{ru:"Раны не найдены",en:"No wounds found"},"Muhim eslatma":{ru:"Важное замечание",en:"Important notice"},"Bemor profili":{ru:"Профиль пациента",en:"Patient profile"},"Profilni tahrirlash":{ru:"Редактировать профиль",en:"Edit profile"},"Telefon":{ru:"Телефон",en:"Phone"},"Tug‘ilgan sana":{ru:"Дата рождения",en:"Date of birth"},"Favqulodda aloqa":{ru:"Экстренный контакт",en:"Emergency contact"},"Saqlash":{ru:"Сохранить",en:"Save"},"Bekor qilish":{ru:"Отмена",en:"Cancel"},"Yopish":{ru:"Закрыть",en:"Close"},"Yara ma’lumotlarini tahrirlash":{ru:"Редактировать данные раны",en:"Edit wound details"},"Yara o‘lchami":{ru:"Размер раны",en:"Wound measurements"},"Uzunlik (mm)":{ru:"Длина (мм)",en:"Length (mm)"},"Kenglik (mm)":{ru:"Ширина (мм)",en:"Width (mm)"},"O‘lchamni saqlash":{ru:"Сохранить измерение",en:"Save measurement"},"Parvarish qaydi":{ru:"Запись об уходе",en:"Care note"},"Qaydni saqlash":{ru:"Сохранить запись",en:"Save note"},"Shu yaraga surat qo‘shish":{ru:"Добавить фото этой раны",en:"Add photo to this wound"},"Admin statistikasi faqat ushbu brauzerda saqlangan demo yozuvlar asosida hisoblanadi.":{ru:"Статистика администратора рассчитана только по демонстрационным записям в этом браузере.",en:"Admin statistics are based only on demo records stored in this browser."},"Demo admin paneli":{ru:"Демонстрационная панель администратора",en:"Demo admin panel"},"Jami yara yozuvlari":{ru:"Всего записей о ранах",en:"Total wound records"},"Faol yaralar":{ru:"Активные раны",en:"Active wounds"},"Jami suratlar":{ru:"Всего фотографий",en:"Total photos"},"Yara yozuvlarini boshqarish":{ru:"Управление записями о ранах",en:"Manage wound records"},"Tahrirlash":{ru:"Изменить",en:"Edit"},"Ko‘rish":{ru:"Просмотр",en:"View"},"Arxivlash":{ru:"В архив",en:"Archive"},"Arxivdan qaytarish":{ru:"Восстановить из архива",en:"Restore from archive"},"Hisobotni chop etish":{ru:"Распечатать отчёт",en:"Print report"},"CSV hisobotini yuklash":{ru:"Скачать CSV-отчёт",en:"Download CSV report"},"Zaxira nusxasi":{ru:"Резервная копия",en:"Backup"},"Zaxira nusxasini yuklash":{ru:"Скачать резервную копию",en:"Download backup"},"Zaxiradan tiklash":{ru:"Восстановить из копии",en:"Restore backup"},"Brauzer xotirasi":{ru:"Память браузера",en:"Browser storage"},"Xotirani tekshirish":{ru:"Проверить память",en:"Check storage"},"Kirish / Ro‘yxatdan o‘tish":{ru:"Войти / Регистрация",en:"Log in / Sign up"},"Demo seansidan chiqish":{ru:"Выйти из демо-сеанса",en:"Sign out of demo"},"Ro‘yxatdan o‘tish":{ru:"Регистрация",en:"Sign up"},"Tizimga kirish":{ru:"Вход в систему",en:"Log in"},"Davom etish":{ru:"Продолжить",en:"Continue"},"Surat izohini tahrirlash":{ru:"Изменить описание фото",en:"Edit photo note"},"Izohni tahrirlash":{ru:"Изменить описание",en:"Edit note"},"Yuklab olish":{ru:"Скачать",en:"Download"},"Suratni o‘chirish":{ru:"Удалить фото",en:"Delete photo"},"Suratni qo‘shish":{ru:"Добавить фото",en:"Add photo"},"Yozuvni yaratish":{ru:"Создать запись",en:"Create record"},"Yarani tanlang":{ru:"Выберите рану",en:"Select a wound"},"Surat tanlash":{ru:"Выбрать фото",en:"Choose photo"},"Izoh (ixtiyoriy)":{ru:"Комментарий (необязательно)",en:"Note (optional)"},"Birinchi surat":{ru:"Первое фото",en:"First photo"},"Ikkinchi surat":{ru:"Второе фото",en:"Second photo"},"Taqqoslash":{ru:"Сравнение",en:"Comparison"},"Yara nomi bo‘yicha qidirish":{ru:"Поиск по названию раны",en:"Search by wound name"},"Yara maydoni":{ru:"Площадь раны",en:"Wound area"},"Qayta ko‘rik sanasi":{ru:"Дата повторного осмотра",en:"Follow-up date"},"Muhimlik darajasi":{ru:"Уровень важности",en:"Priority level"},"Oddiy":{ru:"Обычный",en:"Normal"},"Muhim":{ru:"Важно",en:"Important"},"Yuqori":{ru:"Высокий",en:"High"},"Yara holatini suratlar orqali vaqt davomida hujjatlashtirishga yordam beradi.":{ru:"Помогает документировать состояние раны с помощью фотографий с течением времени.",en:"Helps document wound status over time using photos."},"Kuzatilayotgan yaralar":{ru:"Раны под наблюдением",en:"Wounds being monitored"},"Alohida yara yozuvlari":{ru:"Записи о ранах",en:"Wound records"},"Saqlangan suratlar":{ru:"Сохранённые фото",en:"Saved photos"},"Suratlar shu qurilmada saqlanadi":{ru:"Фото хранятся на этом устройстве",en:"Photos are stored on this device"},"Oxirgi yangilanish":{ru:"Последнее обновление",en:"Last updated"},"Saqlangan ma’lumotlar yuklanmoqda…":{ru:"Загрузка сохранённых данных…",en:"Loading saved data…"},"Tezkor amallar":{ru:"Быстрые действия",en:"Quick actions"},"Kerakli bo‘limga tez o‘ting":{ru:"Быстрый переход к нужному разделу",en:"Jump to a section"},"Yangi yara yozuvini yarating":{ru:"Создайте новую запись о ране",en:"Create a wound record"},"Yara holatini suratga oling":{ru:"Сфотографируйте состояние раны",en:"Capture the wound condition"},"Suratlar tarixini ko‘rish":{ru:"История фотографий",en:"Photo history"},"Oldingi suratlarni taqqoslang":{ru:"Сравните предыдущие фотографии",en:"Compare previous photos"},"Kontakt ma’lumotlarini yangilang":{ru:"Обновите контактные данные",en:"Update contact details"},"Rejalashtirilgan qayta ko‘riklar":{ru:"Запланированные повторные осмотры",en:"Scheduled follow-up visits"},"Barchasini ko‘rish →":{ru:"Показать все →",en:"View all →"},"Kuzatuvni shu yerdan boshlang":{ru:"Начните наблюдение здесь",en:"Start tracking here"},"Birinchi yarani qo‘shing":{ru:"Добавьте первую рану",en:"Add your first wound"},"So‘nggi faollik":{ru:"Последняя активность",en:"Recent activity"},"Tarixni ko‘rish →":{ru:"Открыть историю →",en:"View history →"},"Surat":{ru:"Фото",en:"Photo"},"Hozircha faollik yo‘q. Yuklangan suratlar shu yerda ko‘rinadi.":{ru:"Пока нет активности. Загруженные фото появятся здесь.",en:"No activity yet. Uploaded photos will appear here."},"Yara yozuvlari":{ru:"Записи о ранах",en:"Wound records"},"Barcha holatlar":{ru:"Все статусы",en:"All statuses"},"CSV eksport":{ru:"Экспорт CSV",en:"Export CSV"},"Qidiruv yoki filtrni o‘zgartiring.":{ru:"Измените запрос или фильтр.",en:"Change your search or filter."},"Yara yozuvini o‘chirish":{ru:"Удалить запись о ране",en:"Delete wound record"},"Holati:":{ru:"Статус:",en:"Status:"},"· Arxivlangan":{ru:"· В архиве",en:"· Archived"},"Oxirgi surat sanasi":{ru:"Дата последнего фото",en:"Latest photo date"},"Kuzatuv boshlangan":{ru:"Начало наблюдения",en:"Tracking started"},"Kuzatuv muddati":{ru:"Длительность наблюдения",en:"Tracking duration"},"Oxirgi taxminiy maydon":{ru:"Последняя расчётная площадь",en:"Latest estimated area"},"Shu yaraning suratlar tarixi":{ru:"История фото этой раны",en:"Photo history for this wound"},"Bu yara uchun hali surat yuklanmagan.":{ru:"Для этой раны ещё не загружены фото.",en:"No photos uploaded for this wound yet."},"Muhimlik":{ru:"Приоритет",en:"Priority"},"Qayta ko‘rik":{ru:"Повторный осмотр",en:"Follow-up"},"Teglar":{ru:"Теги",en:"Tags"},"Shu yara hisoboti (CSV)":{ru:"Отчёт по этой ране (CSV)",en:"Wound report (CSV)"},"O‘lchovlar tarixi":{ru:"История измерений",en:"Measurement history"},"Qo‘lda kiritiladi, tashxis emas.":{ru:"Вводится вручную и не является диагнозом.",en:"Entered manually; not a diagnosis."},"O‘chirish":{ru:"Удалить",en:"Delete"},"Kuzatuv va parvarish haqida yozing.":{ru:"Добавьте запись о наблюдении и уходе.",en:"Add a monitoring or care note."},"Yara yoki sana oralig‘ini tanlang":{ru:"Выберите рану или период дат",en:"Choose a wound or date range"},"Dan":{ru:"С",en:"From"},"Gacha":{ru:"По",en:"To"},"Tartiblash":{ru:"Сортировка",en:"Sort"},"Sana oralig‘ini o‘zgartiring yoki filtrni tozalang.":{ru:"Измените период дат или сбросьте фильтр.",en:"Change the date range or clear the filter."},"Ma’lumotlaringizni JSON faylga saqlang yoki oldingi nusxani tiklang.":{ru:"Сохраните данные в JSON или восстановите резервную копию.",en:"Save your data as JSON or restore a backup."},"Suratlar va yozuvlar ushbu qurilmada saqlanadi.":{ru:"Фото и записи хранятся на этом устройстве.",en:"Photos and records are stored on this device."},"Demo boshqaruvini yoqish tugmasini bosing.":{ru:"Нажмите кнопку включения демо-режима администратора.",en:"Select the enable demo admin control."},"Demo: haqiqiy akkaunt va parol server ulanmaguncha yaratilmaydi. Parol saqlanmaydi.":{ru:"Демо: настоящая учётная запись появится после подключения сервера. Пароль не сохраняется.",en:"Demo: real accounts require a server connection. Passwords are not stored."},"Profil nima uchun kerak?":{ru:"Зачем нужен профиль?",en:"Why create a profile?"},"Kontakt ma’lumotlaringizni tartibli saqlash va keyinchalik xavfsiz akkauntga ulash uchun.":{ru:"Чтобы хранить контакты и позже связать их с защищённой учётной записью.",en:"To keep contacts organized and connect them to a secure account later."},"Hozircha kiritilgan ma’lumotlar faqat shu brauzerda saqlanadi.":{ru:"Пока данные хранятся только в этом браузере.",en:"For now, data is stored only in this browser."},"Mahalliy saqlash rejimi":{ru:"Локальное хранение",en:"Local storage mode"},"Kontakt ma’lumotlaringizni kiriting.":{ru:"Введите контактные данные.",en:"Enter your contact details."},"To‘liq ism":{ru:"Полное имя",en:"Full name"},"Favqulodda aloqa (ism va telefon)":{ru:"Экстренный контакт (имя и телефон)",en:"Emergency contact (name and phone)"},"Bu hozircha server ulanmagan demo ko‘rinishidir.":{ru:"Это демо-версия без подключения к серверу.",en:"This is a demo without a server connection."},"Parol (faqat demo tekshiruvi)":{ru:"Пароль (только для демо-проверки)",en:"Password (demo check only)"},"Yozuv ma’lumotlarini yangilang.":{ru:"Обновите данные записи.",en:"Update the record details."},"Tavsif":{ru:"Описание",en:"Description"},"Teglar (vergul bilan)":{ru:"Теги (через запятую)",en:"Tags (comma-separated)"},"Kuzatish uchun alohida yozuv yarating.":{ru:"Создайте отдельную запись для наблюдения.",en:"Create a separate record for monitoring."},"Tanadagi joylashuvi":{ru:"Расположение на теле",en:"Body location"},"Birinchi aniqlangan sana":{ru:"Дата первого обнаружения",en:"Date first noticed"},"Suratga tegishli qaydni yangilang.":{ru:"Измените примечание к фото.",en:"Update the photo note."},"Suratni tegishli yara tarixiga qo‘shing.":{ru:"Добавьте фото в историю нужной раны.",en:"Add the photo to the relevant wound history."},"JPG, PNG yoki WEBP · maksimal 10 MB. Saqlashdan oldin optimallashtiriladi.":{ru:"JPG, PNG или WEBP · до 10 МБ. Фото будет оптимизировано перед сохранением.",en:"JPG, PNG, or WEBP · up to 10 MB. Optimized before saving."},"Surat yuklashdan oldin yara yozuvini yarating.":{ru:"Сначала создайте запись о ране.",en:"Create a wound record before uploading a photo."},"Bir yaraga tegishli ikki suratni yonma-yon ko‘ring":{ru:"Сравните рядом два фото одной раны",en:"Compare two photos of the same wound side by side"},"Suratlar faqat vizual taqqoslash uchun. Bu ko‘rinish yara bitgani yoki infeksiya bor-yo‘qligini aniqlamaydi.":{ru:"Фото предназначены только для визуального сравнения. По ним нельзя определить заживление или наличие инфекции.",en:"Photos are for visual comparison only. They cannot determine healing or infection."},"Yara":{ru:"Рана",en:"Wound"},"Email":{ru:"Электронная почта",en:"Email"},"Izoh":{ru:"Примечание",en:"Note"},"Birinchi yarani qo‘shish":{ru:"Добавить первую рану",en:"Add your first wound"},"Where care meets progress.":{ru:"Точный уход. Понятный прогресс.",en:"Where care meets progress."},"Your wound history, in one place.":{ru:"Вся история наблюдения за раной — в одном месте.",en:"Your wound history, in one place."},"MONITOR · TRACK · CARE":{ru:"НАБЛЮДАЙТЕ · ФИКСИРУЙТЕ · УХАЖИВАЙТЕ",en:"MONITOR · TRACK · CARE"},"Daily check-in":{ru:"Ежедневное наблюдение",en:"Daily check-in"},"Record changes you notice; this is not a diagnosis.":{ru:"Отмечайте замеченные изменения; это не диагноз.",en:"Record changes you notice; this is not a diagnosis."},"Pain level (0–10)":{ru:"Уровень боли (0–10)",en:"Pain level (0–10)"},"Drainage":{ru:"Выделения",en:"Drainage"},"Odor noticed":{ru:"Заметили запах",en:"Odor noticed"},"Color looks different":{ru:"Цвет изменился",en:"Color looks different"},"Wound edges look different":{ru:"Края раны изменились",en:"Wound edges look different"},"Anything else you noticed":{ru:"Другие замеченные изменения",en:"Anything else you noticed"},"Save check-in":{ru:"Сохранить наблюдение",en:"Save check-in"},"No drainage":{ru:"Нет",en:"None"},"Small amount":{ru:"Немного",en:"Small amount"},"Moderate amount":{ru:"Умеренно",en:"Moderate"},"Large amount":{ru:"Много",en:"Large"},"Photo taking guide":{ru:"Как сделать фото",en:"Photo taking guide"},"Use bright, even light; avoid shadows.":{ru:"Снимайте при ровном ярком свете, без теней.",en:"Use bright, even light; avoid shadows."},"Keep the camera straight above the wound.":{ru:"Держите камеру прямо над раной.",en:"Keep the camera straight above the wound."},"Include the whole wound and a clean size reference beside it.":{ru:"Снимите рану целиком и положите рядом чистую линейку для масштаба.",en:"Include the whole wound and a clean size reference beside it."},"Do not place anything on the wound.":{ru:"Не кладите предметы на рану.",en:"Do not place anything on the wound."},"Measurement trend":{ru:"Динамика измерений",en:"Measurement trend"},"Area (cm²) from entered length × width; not a clinical assessment.":{ru:"Площадь (см²) по введённым длине и ширине; это не клиническая оценка.",en:"Area (cm²) from entered length × width; not a clinical assessment."},"Enable visit reminders":{ru:"Включить напоминания об осмотре",en:"Enable visit reminders"},"Reminders are checked when this app is open.":{ru:"Напоминания проверяются, когда приложение открыто.",en:"Reminders are checked when this app is open."},"Visit reminder":{ru:"Напоминание об осмотре",en:"Visit reminder"},"Follow-up due for":{ru:"Наступил срок повторного осмотра:",en:"Follow-up due for"},"Reminders enabled for app use.":{ru:"Напоминания включены при открытом приложении.",en:"Reminders enabled while the app is open."},"Notifications are not supported in this browser.":{ru:"Этот браузер не поддерживает уведомления.",en:"Notifications are not supported in this browser."},"Allow notifications in your browser to enable reminders.":{ru:"Разрешите уведомления в браузере, чтобы включить напоминания.",en:"Allow browser notifications to enable reminders."},"Enter a backup password (at least 8 characters).":{ru:"Введите пароль резервной копии (не менее 8 символов).",en:"Enter a backup password (at least 8 characters)."},"Backup encrypted and downloaded. Keep the password safe.":{ru:"Резервная копия зашифрована и скачана. Сохраните пароль.",en:"Backup encrypted and downloaded. Keep the password safe."},"Password must be at least 8 characters.":{ru:"Пароль должен содержать не менее 8 символов.",en:"Password must be at least 8 characters."},"Enter the password used for this backup.":{ru:"Введите пароль от этой резервной копии.",en:"Enter the password used for this backup."},"Could not decrypt backup. Check the password.":{ru:"Не удалось расшифровать копию. Проверьте пароль.",en:"Could not decrypt backup. Check the password."},"Check-in saved.":{ru:"Наблюдение сохранено.",en:"Check-in saved."},"O‘lcham qaydlari":{ru:"Записи измерений",en:"Measurement entries"}
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
  const [checkPain,setCheckPain] = useState("0");
  const [checkDrainage,setCheckDrainage] = useState<WoundCheckIn["drainage"]>("Yo‘q");
  const [checkOdor,setCheckOdor] = useState(false);
  const [checkColorChange,setCheckColorChange] = useState(false);
  const [checkEdgeChange,setCheckEdgeChange] = useState(false);
  const [checkNote,setCheckNote] = useState("");
  const [remindersEnabled,setRemindersEnabled] = useState(false);
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

  useEffect(()=>{try{setRemindersEnabled(localStorage.getItem("woundcare-reminders")==="on");}catch{}},[]);
  useEffect(()=>{if(!ready||!remindersEnabled||!("Notification" in window)||Notification.permission!=="granted")return;const today=localDateInputValue();for(const wound of activeWounds){if(!wound.followUpDate||wound.followUpDate>today)continue;const key="woundcare-reminded-"+wound.id+"-"+wound.followUpDate;if(localStorage.getItem(key))continue;new Notification(t("Visit reminder"),{body:t("Follow-up due for")+" "+wound.name});localStorage.setItem(key,"sent");}},[ready,remindersEnabled,wounds,language]);
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
  function addWoundCheckIn(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault();if(!selectedWound)return;
    const entry:WoundCheckIn={id:crypto.randomUUID(),date:new Date().toISOString(),pain:Math.max(0,Math.min(10,Number(checkPain)||0)),drainage:checkDrainage,odor:checkOdor,colorChange:checkColorChange,edgeChange:checkEdgeChange,note:checkNote.trim()};
    setWounds(current=>current.map(w=>w.id===selectedWound.id?{...w,checks:[entry,...(w.checks||[])]}:w));
    setCheckPain("0");setCheckDrainage("Yo‘q");setCheckOdor(false);setCheckColorChange(false);setCheckEdgeChange(false);setCheckNote("");setNotice(t("Check-in saved."));
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
  function toBase64(bytes:Uint8Array) { let binary=""; for(const byte of bytes) binary+=String.fromCharCode(byte); return btoa(binary); }
  function fromBase64(value:string) { const binary=atob(value); return Uint8Array.from(binary,char=>char.charCodeAt(0)); }
  async function deriveBackupKey(password:string,salt:Uint8Array) {
    const material=await crypto.subtle.importKey("raw",new TextEncoder().encode(password),"PBKDF2",false,["deriveKey"]);
    return crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations:250000,hash:"SHA-256"},material,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]);
  }
  async function exportBackup() {
    const password=window.prompt(t("Enter a backup password (at least 8 characters)."));
    if(!password)return;
    if(password.length<8){setNotice(t("Password must be at least 8 characters."));return;}
    try {
      const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
      const key=await deriveBackupKey(password,salt);
      const plain=new TextEncoder().encode(JSON.stringify({version:1,exportedAt:new Date().toISOString(),wounds,profile}));
      const ciphertext=await crypto.subtle.encrypt({name:"AES-GCM",iv},key,plain);
      const payload={version:2,algorithm:"AES-GCM-PBKDF2",salt:toBase64(salt),iv:toBase64(iv),ciphertext:toBase64(new Uint8Array(ciphertext))};
      const blob=new Blob([JSON.stringify(payload)],{type:"application/json"});
      const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="woundcare-encrypted-backup.json";a.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
      setNotice(t("Backup encrypted and downloaded. Keep the password safe."));
    } catch { setStorageError("Zaxira nusxasini shifrlab bo‘lmadi."); }
  }
  async function importBackup(file:File) {
    try {
      let parsed=JSON.parse(await file.text());
      if(parsed?.version===2&&parsed?.algorithm==="AES-GCM-PBKDF2") {
        const password=window.prompt(t("Enter the password used for this backup."));
        if(!password)return;
        const key=await deriveBackupKey(password,fromBase64(parsed.salt));
        const plain=await crypto.subtle.decrypt({name:"AES-GCM",iv:fromBase64(parsed.iv)},key,fromBase64(parsed.ciphertext));
        parsed=JSON.parse(new TextDecoder().decode(plain));
      }
      if(!parsed||parsed.version!==1||!Array.isArray(parsed.wounds))throw new Error("format");
      if(!window.confirm("Zaxira nusxasidagi ma’lumotlar joriy yozuvlar bilan almashtiriladi. Davom etasizmi?"))return;
      setWounds(parsed.wounds);if(parsed.profile)setProfile(parsed.profile);setNotice("Zaxira nusxasi yuklandi.");
    } catch { setStorageError(t("Could not decrypt backup. Check the password.")); }
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

  async function shareWoundReport(wound:Wound) {
    const escapeHtml=(value:string)=>value.replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]||char));
    const photos=wound.photos.slice(0,6);
    const measurements=[...(wound.measurements||[])].reverse();
    const notes=[...(wound.notes||[])].reverse();
    const checks=[...(wound.checks||[])].reverse();
    const info=(label:string,value:string)=>`<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value||"—")}</p>`;
    const checkHtml=checks.map(check=>info(new Date(check.date).toLocaleDateString(language),[t("Pain level (0–10)")+": "+check.pain+"/10",t(check.drainage),check.odor?t("Odor noticed"):"",check.colorChange?t("Color looks different"):"",check.edgeChange?t("Wound edges look different"):"",check.note].filter(Boolean).join(" · "))).join("");
    const photoHtml=photos.map(photo=>`<figure><img src="${escapeHtml(photo.url.startsWith("data:image/")?photo.url:"")}" alt="${escapeHtml(t("Suratlar"))}"><figcaption>${escapeHtml(new Date(photo.date).toLocaleString(language))}${photo.note?` · ${escapeHtml(photo.note)}`:""}</figcaption></figure>`).join("");
    const html=`<!doctype html><html lang="${language}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(t("Yara hisoboti"))}</title>
      <style>body{font:15px Arial,sans-serif;color:#173f39;max-width:850px;margin:32px auto;padding:0 18px}h1,h2{color:#145b52}section{border:1px solid #d6e9e3;border-radius:14px;padding:16px;margin:16px 0}p{line-height:1.5}figure{display:inline-block;width:min(46%,360px);vertical-align:top;margin:8px}img{width:100%;height:auto;border-radius:8px}figcaption{font-size:12px;color:#52736d;margin-top:5px}@media(max-width:600px){figure{width:100%;margin:8px 0}}</style>
      <body><h1>${escapeHtml(t("Yara hisoboti"))}</h1><p>${escapeHtml(t("Ushbu hisobot yara tarixini va oxirgi suratlarni o‘z ichiga oladi."))}</p><section>
      ${profile.fullName?info(t("Bemor"),profile.fullName):""}${info(t("Yara nomi"),wound.name)}${info(t("Yara joylashuvi"),wound.location)}
      ${info(t("Boshlangan sana"),wound.started)}${info(t("Holati"),t(wound.status||"Faol"))}${info(t("Muhimlik darajasi"),t(wound.priority||"Oddiy"))}
      ${info(t("Keyingi ko‘rik"),wound.followUpDate||"—")}${wound.description?info(t("Tavsif"),wound.description):""}</section>
      ${measurements.length?`<section><h2>${escapeHtml(t("O‘lchovlar"))}</h2>${measurements.map(m=>info(new Date(m.date).toLocaleDateString(language),`${m.lengthMm} × ${m.widthMm} mm`)).join("")}</section>`:""}
      ${notes.length?`<section><h2>${escapeHtml(t("Parvarish qaydlari"))}</h2>${notes.map(n=>info(new Date(n.date).toLocaleDateString(language),n.text)).join("")}</section>`:""}\n      ${checks.length?`<section><h2>${escapeHtml(t("Daily check-in"))}</h2>${checkHtml}</section>`:""}
      ${photos.length?`<section><h2>${escapeHtml(t("Suratlar"))}</h2>${photoHtml}</section>`:""}
      </body></html>`;
    const file=new File([html],`woundcare-${wound.id}-report.html`,{type:"text/html"});
    try {
      if(navigator.share&&navigator.canShare?.({files:[file]})) {
        await navigator.share({files:[file],title:t("Yara hisoboti"),text:t("Shifokorga yuborish")});
      } else {
        const url=URL.createObjectURL(file);
        const link=document.createElement("a");link.href=url;link.download=file.name;link.click();
        window.setTimeout(()=>URL.revokeObjectURL(url),1000);
        setNotice(t("Hisobot tayyorlandi. Uni shifokorga yuboring."));
      }
    } catch(error) {
      if(error instanceof DOMException&&error.name==="AbortError") {setNotice(t("Ulashish bekor qilindi."));return;}
      setNotice(t("Hisobotni ulashib bo‘lmadi. Hisobotni yuklab qayta urinib ko‘ring."));
    }
  }
  async function enableReminders() {
    if(!("Notification" in window)){setNotice(t("Notifications are not supported in this browser."));return;}
    const permission=await Notification.requestPermission();
    if(permission!=="granted"){setNotice(t("Allow notifications in your browser to enable reminders."));return;}
    localStorage.setItem("woundcare-reminders","on");setRemindersEnabled(true);setNotice(t("Reminders enabled for app use."));
  }
  function printWoundReport() { window.print(); }
  const selectedWound=wounds.find(w=>w.id===selected);

  return <div className="shell">
    <aside className="sidebar"><div className="brand"><div className="brand-mark">✚</div>WoundCare</div><div className="language-switch" aria-label="Tilni tanlash"><span>{language==="uz"?"Til":language==="ru"?"Язык":"Language"}</span><select value={language} onChange={e=>setLanguage(e.target.value as "uz"|"ru"|"en")}><option value="uz">O‘zbekcha</option><option value="ru">Русский</option><option value="en">English</option></select></div><div className="nav-label">{t("ASOSIY MENYU")}</div>
      {nav.map(item=>{const Icon=item.icon;return <button key={item.label} onClick={()=>{setActive(item.label);setNotice("");if(item.label==="Upload Photo")openUpload();}} className={"nav-item "+(active===item.label?"active":"")}><Icon size={17}/>{t(item.title)}</button>;})}
      <div className="sidebar-foot">{t("Where care meets progress.")}<br/>{t("Your wound history, in one place.")}</div>
    </aside>
    <main className="main">
      <header className="topbar"><div><div className="eyebrow">{t("MONITOR · TRACK · CARE")}</div><h1>{active==="Dashboard"?t("Xush kelibsiz 👋"):t(nav.find(item=>item.label===active)?.title||active)}</h1><div className="sub">{active==="Dashboard"?"Yara parvarishi yozuvlaringizning qisqacha ko‘rinishi.":"Ma’lumotlaringizni bir joyda tartibli saqlang."}</div></div><div className="top-actions"><Bell size={19} color="#66847D"/><div className="avatar">U</div></div></header>
      <section className="grid">
        <div className="card"><div className="stat-top"><span>{t("Kuzatilayotgan yaralar")}</span><span className="stat-icon"><HeartPulse size={17}/></span></div><div className="stat-value">{wounds.length}</div><div className="stat-note">{t("Alohida yara yozuvlari")}</div></div>
        <div className="card"><div className="stat-top"><span>{t("Saqlangan suratlar")}</span><span className="stat-icon"><Camera size={17}/></span></div><div className="stat-value">{totalPhotos}</div><div className="stat-note">{t("Suratlar shu qurilmada saqlanadi")}</div></div>
        <div className="card"><div className="stat-top"><span>{t("Oxirgi yangilanish")}</span><span className="stat-icon"><CalendarDays size={17}/></span></div><div className="stat-value date-value">{allPhotos[0]?new Date(allPhotos[0].date).toLocaleDateString():"—"}</div><div className="stat-note">{allPhotos.length?"Eng so‘nggi surat":"Hozircha surat yo‘q"}</div></div>
      </section>
      {!ready&&<div className="status-note">{t("Saqlangan ma’lumotlar yuklanmoqda…")}</div>}
      {storageError&&<div className="status-note" role="alert">{storageError}</div>}
      {notice&&<div className="status-note" role="status">{notice}</div>}
      {active==="Dashboard"&&<section className="quick-actions"><div className="quick-heading"><h2>{t("Tezkor amallar")}</h2><span>{t("Kerakli bo‘limga tez o‘ting")}</span></div><div className="quick-grid"><button className="quick-action" onClick={()=>setShowAdd(true)}><span className="quick-icon"><Plus size={19}/></span><b>{t("Yara qo‘shish")}</b><small>{t("Yangi yara yozuvini yarating")}</small></button><button className="quick-action" onClick={openUpload}><span className="quick-icon"><Camera size={19}/></span><b>{t("Surat yuklash")}</b><small>{t("Yara holatini suratga oling")}</small></button><button className="quick-action" onClick={()=>setActive("Photo History")}><span className="quick-icon"><ImageIcon size={19}/></span><b>{t("Suratlar tarixini ko‘rish")}</b><small>{t("Oldingi suratlarni taqqoslang")}</small></button><button className="quick-action" onClick={()=>setActive("My Profile")}><span className="quick-icon"><UserRound size={19}/></span><b>{t("Profilim")}</b><small>{t("Kontakt ma’lumotlarini yangilang")}</small></button></div></section>}
      {active==="Dashboard"&&upcomingReviews.length>0&&<section className="card upcoming-card"><h2>{t("Rejalashtirilgan qayta ko‘riklar")}</h2><div className="reminder-controls"><span>{t("Reminders are checked when this app is open.")}</span><button type="button" className="secondary" onClick={enableReminders} disabled={remindersEnabled}>{t("Enable visit reminders")}</button></div>{upcomingReviews.slice(0,5).map(w=><div key={w.id}><span>{w.name} · {w.location} {w.followUpDate&&w.followUpDate<localDateInputValue()?"· Muddati o‘tgan":""}</span><b>{w.followUpDate}</b></div>)}</section>}{active==="Dashboard"&&<><div className="section-head"><h2>{t("Yaralarim")}</h2><button className="small-link" onClick={()=>setActive("My Wounds")}>{t("Barchasini ko‘rish →")}</button></div>
        {wounds.length===0?<section className="card empty"><div><div className="empty-icon"><Activity size={27}/></div><h3>{t("Kuzatuvni shu yerdan boshlang")}</h3><p>Har bir yara uchun alohida yozuv oching va vaqt o‘tishi bilan suratlarini taqqoslash uchun tarix yarating.</p><button className="primary" onClick={()=>setShowAdd(true)}><Plus size={15}/> Birinchi yarani qo‘shish</button></div></section>:<div className="wound-grid">{wounds.slice(0,3).map(w=><WoundCard key={w.id} wound={w} onOpen={()=>{setSelected(w.id);setActive("My Wounds");}}/>)}</div>}
        <div className="section-head"><h2>{t("So‘nggi faollik")}</h2><button className="small-link" onClick={()=>setActive("Photo History")}>{t("Tarixni ko‘rish →")}</button></div>
        <section className="card activity-card">{allPhotos.length?allPhotos.slice(0,3).map(p=><div className="activity" key={p.id}><span className="dot"/><span>Surat <b>{p.woundName}</b> yarasiga qo‘shildi · {new Date(p.date).toLocaleString()}</span></div>):<div className="activity"><span className="dot"/>{t("Hozircha faollik yo‘q. Yuklangan suratlar shu yerda ko‘rinadi.")}</div>}</section>
      </>}
      {active==="My Wounds"&&<><div className="section-head"><h2>{t("Yara yozuvlari")}</h2><button className="primary" onClick={()=>setShowAdd(true)}><Plus size={15}/> Yara qo‘shish</button></div><div className="wound-tools"><input aria-label="Yara qidirish" placeholder="Yara nomi yoki joylashuvi bo‘yicha qidirish" value={woundSearch} onChange={e=>setWoundSearch(e.target.value)}/><select value={woundStatusFilter} onChange={e=>setWoundStatusFilter(e.target.value)}><option value="all">{t("Barcha holatlar")}</option><option>{t("Faol")}</option><option>{t("Kuzatuvda")}</option><option>{t("Yakunlangan")}</option></select><button className="secondary" onClick={()=>setShowArchived(v=>!v)}>{showArchived?"Faol yaralarni ko‘rish":"Arxivni ko‘rish"}</button><button className="secondary" onClick={exportWoundsCsv}>{t("CSV eksport")}</button><button className="secondary" onClick={printWoundReport}>{t("Hisobotni chop etish")}</button></div>{visibleWounds.length?<div className="wound-grid">{visibleWounds.map(w=><WoundCard key={w.id} wound={w} onOpen={()=>setSelected(w.id)}/>)}</div>:<div className="card empty"><div><h3>{t("Yara topilmadi")}</h3><p>{t("Qidiruv yoki filtrni o‘zgartiring.")}</p></div></div>}
        {selectedWound&&<section className="card detail-card"><div className="section-head"><div><h2>{selectedWound.name}</h2><p className="muted">{selectedWound.location} · Boshlangan sana: {selectedWound.started}</p></div><button className="small-link danger" onClick={()=>removeWound(selectedWound.id)}><Trash2 size={14}/> Yara yozuvini o‘chirish</button></div><div className="detail-admin-actions"><button className="secondary" onClick={()=>shareWoundReport(selectedWound)}><Share2 size={14}/>{t("Shifokorga yuborish")}</button><button className="secondary" onClick={()=>beginEditWound(selectedWound)}>{t("Yara ma’lumotlarini tahrirlash")}</button><button className="secondary" onClick={()=>toggleArchive(selectedWound)}>{selectedWound.archived?"Arxivdan qaytarish":"Arxivlash"}</button><button className="secondary" onClick={printWoundReport}>{t("Hisobotni chop etish")}</button></div><div className="wound-status-line">Holati: <b>{selectedWound.status||"Faol"}</b>{selectedWound.archived&&<b> · Arxivlangan</b>}</div><div className="wound-detail-stats"><div><span>{t("Jami suratlar")}</span><b>{selectedWound.photos.length}</b></div><div><span>{t("Oxirgi surat sanasi")}</span><b>{selectedWound.photos[0]?new Date(selectedWound.photos[0].date).toLocaleDateString():"Hali surat yo‘q"}</b></div><div><span>{t("Kuzatuv boshlangan")}</span><b>{selectedWound.started}</b></div><div><span>{t("Kuzatuv muddati")}</span><b>{Math.max(0,Math.floor((Date.now()-new Date(selectedWound.started+"T00:00:00").getTime())/86400000))} kun</b></div><div><span>{t("Oxirgi taxminiy maydon")}</span><b>{selectedWound.measurements?.[0]?(selectedWound.measurements[0].lengthMm*selectedWound.measurements[0].widthMm/100).toFixed(2)+" cm²":"O‘lchov yo‘q"}</b></div></div><div className="detail-photo-heading"><h3>{t("Shu yaraning suratlar tarixi")}</h3><span>{selectedWound.photos.length} ta yozuv</span></div>{selectedWound.photos.length?<div className="detail-photo-list">{selectedWound.photos.map(photo=><button type="button" className="detail-photo-item" key={photo.id} onClick={()=>setViewPhoto({photo,woundName:selectedWound.name})}><img src={photo.url} alt={selectedWound.name+" surati"}/><span><b>{new Date(photo.date).toLocaleDateString()}</b><small>{new Date(photo.date).toLocaleTimeString()}</small>{photo.note&&<small>{photo.note}</small>}</span><span className="arrow">→</span></button>)}</div>:<p className="muted detail-empty">{t("Bu yara uchun hali surat yuklanmagan.")}</p>}<div className="wound-metadata"><div><span>{t("Muhimlik")}</span><b>{selectedWound.priority||"Oddiy"}</b></div><div><span>{t("Qayta ko‘rik")}</span><b>{selectedWound.followUpDate||"Belgilanmagan"}</b></div><div><span>{t("Teglar")}</span><b>{(selectedWound.tags||[]).join(", ")||"Yo‘q"}</b></div></div>{selectedWound.description&&<p className="muted">{selectedWound.description}</p>}<div className="detail-admin-actions"><button className="secondary" onClick={()=>exportSingleWound(selectedWound)}>{t("Shu yara hisoboti (CSV)")}</button></div>{(selectedWound.measurements||[]).length>1&&<><WoundTrend measurements={selectedWound.measurements||[]} language={language} t={t}/><div className="measurement-trend"><b>{t("O‘lchovlar tarixi")}</b>{[...(selectedWound.measurements||[])].reverse().map(m=><span key={m.id}>{new Date(m.date).toLocaleDateString()} · {m.lengthMm} × {m.widthMm} mm</span>)}</div></>}<div className="detail-extra-grid"><form className="card mini-form" onSubmit={addMeasurement}><h3>{t("Yara o‘lchami")}</h3><p>{t("Qo‘lda kiritiladi, tashxis emas.")}</p><label>{t("Uzunlik (mm)")}<input type="number" min="0.1" step="0.1" required value={measurementLength} onChange={e=>setMeasurementLength(e.target.value)}/></label><label>{t("Kenglik (mm)")}<input type="number" min="0.1" step="0.1" required value={measurementWidth} onChange={e=>setMeasurementWidth(e.target.value)}/></label><button className="primary">{t("O‘lchamni saqlash")}</button>{(selectedWound.measurements||[]).slice(0,5).map(m=><small className="history-line" key={m.id}>{new Date(m.date).toLocaleDateString()}: {m.lengthMm} × {m.widthMm} mm <button type="button" onClick={()=>deleteMeasurement(m.id)}>{t("O‘chirish")}</button></small>)}</form><form className="card mini-form" onSubmit={addCareNote}><h3>{t("Parvarish qaydi")}</h3><p>{t("Kuzatuv va parvarish haqida yozing.")}</p><textarea required value={careNote} onChange={e=>setCareNote(e.target.value)} placeholder="Masalan, bog‘lam almashtirildi..."/><button className="primary">{t("Qaydni saqlash")}</button>{(selectedWound.notes||[]).slice(0,5).map(n=><small className="history-line" key={n.id}>{new Date(n.date).toLocaleDateString()}: {n.text} <button type="button" onClick={()=>deleteCareNote(n.id)}>{t("O‘chirish")}</button></small>)}</form><form className="card mini-form checkin-form" onSubmit={addWoundCheckIn}><h3>{t("Daily check-in")}</h3><p>{t("Record changes you notice; this is not a diagnosis.")}</p><label>{t("Pain level (0–10)")}<input type="range" min="0" max="10" value={checkPain} onChange={e=>setCheckPain(e.target.value)}/><small>{checkPain}/10</small></label><label>{t("Drainage")}<select value={checkDrainage} onChange={e=>setCheckDrainage(e.target.value as WoundCheckIn["drainage"])}><option value="Yo‘q">{t("No drainage")}</option><option value="Oz">{t("Small amount")}</option><option value="O‘rtacha">{t("Moderate amount")}</option><option value="Ko‘p">{t("Large amount")}</option></select></label><label className="checkin-check"><input type="checkbox" checked={checkOdor} onChange={e=>setCheckOdor(e.target.checked)}/>{t("Odor noticed")}</label><label className="checkin-check"><input type="checkbox" checked={checkColorChange} onChange={e=>setCheckColorChange(e.target.checked)}/>{t("Color looks different")}</label><label className="checkin-check"><input type="checkbox" checked={checkEdgeChange} onChange={e=>setCheckEdgeChange(e.target.checked)}/>{t("Wound edges look different")}</label><textarea value={checkNote} onChange={e=>setCheckNote(e.target.value)} placeholder={t("Anything else you noticed")}/><button className="primary">{t("Save check-in")}</button>{(selectedWound.checks||[]).slice(0,4).map(check=><small key={check.id}>{new Date(check.date).toLocaleDateString(language)} · {t("Pain level (0–10)")} {check.pain}/10 · {t(check.drainage)}{check.odor?" · "+t("Odor noticed"):""}{check.colorChange?" · "+t("Color looks different"):""}{check.edgeChange?" · "+t("Wound edges look different"):""}{check.note?" · "+check.note:""}</small>)}</form></div><button className="primary" onClick={openUpload}> <Camera size={15}/> Shu yaraga surat qo‘shish</button></section>}
      </>}
      {active==="Photo History"&&<><div className="section-head"><h2>{t("Suratlar ketma-ketligi")}</h2><button className="primary" onClick={openUpload}><Camera size={15}/> Surat qo‘shish</button></div>
        {wounds.some(w=>w.photos.length>=2)&&<PhotoCompare wounds={wounds} woundId={compareWoundId} setWoundId={setCompareWoundId} firstId={compareFirstId} setFirstId={setCompareFirstId} secondId={compareSecondId} setSecondId={setCompareSecondId} t={t}/>}
        <section className="card photo-filters"><div><b>{t("Suratlarni filtrlash")}</b><span>{t("Yara yoki sana oralig‘ini tanlang")}</span></div><label>{t("Yara")}<select value={photoWoundFilter} onChange={e=>setPhotoWoundFilter(e.target.value)}><option value="all">{t("Barcha yaralar")}</option>{wounds.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></label><label>{t("Dan")}<input type="date" value={photoFrom} max={photoTo||undefined} onChange={e=>setPhotoFrom(e.target.value)}/></label><label>{t("Gacha")}<input type="date" value={photoTo} min={photoFrom||undefined} onChange={e=>setPhotoTo(e.target.value)}/></label><button type="button" className="small-link" onClick={()=>{setPhotoWoundFilter("all");setPhotoFrom("");setPhotoTo("");setPhotoSearch("");setFavoritesOnly(false);setPhotoSort("newest");}}>{t("Filtrni tozalash")}</button><label>{t("Qidirish")}<input value={photoSearch} onChange={e=>setPhotoSearch(e.target.value)} placeholder={t("Yara nomi yoki izoh")}/></label><label>{t("Tartiblash")}<select value={photoSort} onChange={e=>setPhotoSort(e.target.value)}><option value="newest">{t("Eng yangi")}</option><option value="oldest">{t("Eng eski")}</option></select></label><label className="favorite-filter"><input type="checkbox" checked={favoritesOnly} onChange={e=>setFavoritesOnly(e.target.checked)}/> {t("Faqat sevimlilar")}</label></section>{visiblePhotos.length?<div className="photo-grid">{visiblePhotos.map(p=><article className="card photo-card" key={p.id}><button type="button" className="photo-open" onClick={()=>setViewPhoto({photo:p,woundName:p.woundName})} aria-label="Suratni kattalashtirib ko‘rish"><img src={p.url} alt="Yara surati"/></button><div className="photo-meta"><b>{p.woundName}</b><span>{new Date(p.date).toLocaleString()}</span>{p.note&&<p>{p.note}</p>}<div className="photo-actions"><button className="small-link" onClick={()=>togglePhotoFavorite(wounds.find(x=>x.photos.some(ph=>ph.id===p.id))?.id||"",p.id)}>{p.favorite?"★ Sevimlidan olish":"☆ Sevimliga qo‘shish"}</button><button className="small-link" onClick={()=>{const w=wounds.find(x=>x.photos.some(ph=>ph.id===p.id));if(w){setEditPhoto({woundId:w.id,photo:p});setEditPhotoNote(p.note);}}}>{t("Izohni tahrirlash")}</button><button className="small-link" onClick={()=>downloadPhoto(p,p.woundName)}>{t("Yuklab olish")}</button><button className="small-link danger" onClick={()=>{const w=wounds.find(x=>x.photos.some(ph=>ph.id===p.id));if(w)removePhoto(w.id,p.id);}}>{t("Suratni o‘chirish")}</button></div></div></article>)}</div>:allPhotos.length?<div className="card empty"><div><h3>{t("Bu filtr bo‘yicha surat topilmadi")}</h3><p>{t("Sana oralig‘ini o‘zgartiring yoki filtrni tozalang.")}</p></div></div>:<div className="card empty"><div><div className="empty-icon"><ImageIcon size={26}/></div><h3>{t("Hozircha surat yo‘q")}</h3><p>{t("Surat yuklang va uni tegishli yara yozuviga biriktiring.")}</p><button className="primary" onClick={openUpload}><Camera size={15}/> Surat yuklash</button></div></div>}</>}
      {active==="Admin"&&<section className="admin-page"><div className="admin-warning"><b>{t("Demo admin paneli")}</b><span>Bu brauzer ichidagi namoyish. Haqiqiy admin huquqlari, foydalanuvchi akkauntlari yoki server ma’lumotlariga ulanmagan.</span><button className="secondary" onClick={()=>setIsAdmin(v=>!v)}>{isAdmin?"Admin ko‘rinishini yopish":"Demo admin ko‘rinishini yoqish"}</button></div>{isAdmin?<><div className="grid admin-stats"><div className="card"><span>{t("Jami yara yozuvlari")}</span><b>{wounds.length}</b></div><div className="card"><span>{t("Faol yaralar")}</span><b>{activeWounds.length}</b></div><div className="card"><span>{t("Jami suratlar")}</span><b>{totalPhotos}</b></div></div><div className="admin-tools"><div className="card"><h3>{t("Zaxira nusxasi")}</h3><p>{t("Ma’lumotlaringizni JSON faylga saqlang yoki oldingi nusxani tiklang.")}</p><div className="admin-buttons"><button className="secondary" onClick={exportBackup}>{t("Zaxira nusxasini yuklash")}</button><button className="secondary" onClick={()=>backupInputRef.current?.click()}>{t("Zaxiradan tiklash")}</button><input ref={backupInputRef} type="file" accept="application/json,.json" hidden onChange={e=>{const f=e.target.files?.[0];if(f)importBackup(f);e.currentTarget.value="";}}/></div></div><div className="card"><h3>{t("Brauzer xotirasi")}</h3><p>{t("Suratlar va yozuvlar ushbu qurilmada saqlanadi.")}</p><button className="secondary" onClick={()=>{checkStorage().catch(()=>setStorageEstimate("Xotira ma’lumotini olish imkoni bo‘lmadi."));}}>{t("Xotirani tekshirish")}</button>{storageEstimate&&<small>{storageEstimate}</small>}</div></div><div className="section-head"><h2>{t("Yara yozuvlarini boshqarish")}</h2><button className="secondary" onClick={exportWoundsCsv}>{t("CSV hisobotini yuklash")}</button></div><div className="admin-table">{wounds.map(w=><div className="admin-row" key={w.id}><div><b>{w.name}</b><small>{w.location} · {w.photos.length} ta surat · {w.status||"Faol"}</small></div><button className="secondary" onClick={()=>{setSelected(w.id);setActive("My Wounds");}}>{t("Ko‘rish")}</button><button className="secondary" onClick={()=>beginEditWound(w)}>{t("Tahrirlash")}</button><button className="secondary" onClick={()=>toggleArchive(w)}>{w.archived?"Arxivdan qaytarish":"Arxivlash"}</button></div>)}</div><p className="muted">{t("Admin statistikasi faqat ushbu brauzerda saqlangan demo yozuvlar asosida hisoblanadi.")}</p></>:<p className="muted">{t("Demo boshqaruvini yoqish tugmasini bosing.")}</p>}</section>}
      {active==="My Profile"&&<div className="profile-layout">
        <section className="card profile-card">
          <div className="profile-heading"><div className="avatar large">{profile.fullName?profile.fullName.charAt(0).toUpperCase():"U"}</div><div><h2>{profile.fullName||"Bemor profili"}</h2><p className="muted">{profile.email||"Profil ma’lumotlarini kiriting"}</p></div></div>
          <div className="profile-details">
            <div><span>{t("Telefon")}</span><b>{profile.phone||"Kiritilmagan"}</b></div>
            <div><span>{t("Tug‘ilgan sana")}</span><b>{profile.birthDate||"Kiritilmagan"}</b></div>
            <div><span>{t("Favqulodda aloqa")}</span><b>{profile.emergencyContact||"Kiritilmagan"}</b></div>
          </div>
          <div className="profile-actions"><button className="primary" onClick={()=>setEditingProfile(true)}>{t("Profilni tahrirlash")}</button>{signedIn?<button className="secondary" onClick={signOut}>{t("Demo seansidan chiqish")}</button>:<button className="secondary" onClick={()=>setAuthMode("login")}>{t("Kirish / Ro‘yxatdan o‘tish")}</button>}</div>
          <p className="demo-auth-warning">{t("Demo: haqiqiy akkaunt va parol server ulanmaguncha yaratilmaydi. Parol saqlanmaydi.")}</p>
        </section>
        <section className="card profile-side"><h3>{t("Profil nima uchun kerak?")}</h3><p>{t("Kontakt ma’lumotlaringizni tartibli saqlash va keyinchalik xavfsiz akkauntga ulash uchun.")}</p><div className="profile-tip"><ShieldCheck size={18}/> Hozircha kiritilgan ma’lumotlar faqat shu brauzerda saqlanadi.</div></section>
      </div>}
      <section className="bottom-grid"><div className="notice"><div className="notice-title"><ShieldCheck size={17}/> Muhim eslatma</div>WoundCare yara holatini suratlar orqali vaqt davomida hujjatlashtirish va taqqoslashga yordam beradi. U tashxis qo‘ymaydi va tibbiyot mutaxassisi maslahatining o‘rnini bosmaydi.</div><div className="demo-note"><b>{t("Mahalliy saqlash rejimi")}</b><p>Yozuvlar va suratlar faqat shu brauzer va qurilmada saqlanadi. Ular serverga yuborilmaydi va boshqa qurilmada ko‘rinmaydi. Maxfiy yoki haqiqiy bemor suratlarini yuklamang.</p></div></section>
    </main>
    <nav className="mobile-menu">{nav.slice(0,4).map(item=>{const Icon=item.icon;return <button key={item.label} className={active===item.label?"active":""} onClick={()=>{setActive(item.label);if(item.label==="Upload Photo")openUpload();}}><Icon size={18}/>{item.label==="Dashboard"?"Bosh sahifa":item.label==="My Wounds"?"Yaralar":item.label==="Upload Photo"?"Yuklash":"Tarix"}</button>;})}</nav>
    {viewPhoto&&<div className="modal-backdrop photo-lightbox" onMouseDown={e=>{if(e.target===e.currentTarget)setViewPhoto(null);}}><section className="photo-viewer"><div className="modal-head"><div><h2>{viewPhoto.woundName}</h2><p>{new Date(viewPhoto.photo.date).toLocaleString()}</p></div><button type="button" className="icon-button" onClick={()=>setViewPhoto(null)}><X size={19}/></button></div><img src={viewPhoto.photo.url} alt="Yara surati kattalashtirilgan"/>{viewPhoto.photo.note&&<p>{viewPhoto.photo.note}</p>}<button className="secondary" onClick={()=>setViewPhoto(null)}>{t("Yopish")}</button></section></div>}
    {editingProfile&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setEditingProfile(false);}}><form className="modal" onSubmit={e=>{e.preventDefault();saveProfile(profile).catch(()=>setStorageError("Profilni saqlab bo‘lmadi."));}}><div className="modal-head"><div><h2>{t("Profilni tahrirlash")}</h2><p>{t("Kontakt ma’lumotlaringizni kiriting.")}</p></div><button type="button" className="icon-button" onClick={()=>setEditingProfile(false)}><X size={19}/></button></div><label>{t("To‘liq ism")}<input required value={profile.fullName} onChange={e=>setProfile({...profile,fullName:e.target.value})} placeholder="Ism va familiya"/></label><label>{t("Email")}<input type="email" value={profile.email} onChange={e=>setProfile({...profile,email:e.target.value})} placeholder="name@example.com"/></label><label>{t("Telefon")}<input type="tel" value={profile.phone} onChange={e=>setProfile({...profile,phone:e.target.value})} placeholder="+998 90 123 45 67"/></label><label>{t("Tug‘ilgan sana")}<input type="date" value={profile.birthDate} onChange={e=>setProfile({...profile,birthDate:e.target.value})}/></label><label>{t("Favqulodda aloqa (ism va telefon)")}<input value={profile.emergencyContact} onChange={e=>setProfile({...profile,emergencyContact:e.target.value})} placeholder="Yaqin insoningiz va telefon raqami"/></label><div className="modal-actions"><button type="button" className="secondary" onClick={()=>setEditingProfile(false)}>{t("Bekor qilish")}</button><button className="primary" type="submit">{t("Saqlash")}</button></div></form></div>}
    {authMode&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setAuthMode(null);}}><form className="modal" onSubmit={finishDemoAuth}><div className="modal-head"><div><h2>{authMode==="register"?"Ro‘yxatdan o‘tish":"Tizimga kirish"}</h2><p>{t("Bu hozircha server ulanmagan demo ko‘rinishidir.")}</p></div><button type="button" className="icon-button" onClick={()=>setAuthMode(null)}><X size={19}/></button></div>{authMode==="register"&&<label>{t("To‘liq ism")}<input required value={authName} onChange={e=>setAuthName(e.target.value)} placeholder="Ism va familiya"/></label>}<label>{t("Email")}<input type="email" required value={authEmail} onChange={e=>setAuthEmail(e.target.value)} placeholder="name@example.com"/></label><label>{t("Parol (faqat demo tekshiruvi)")}<input type="password" required minLength={6} value={authPassword} onChange={e=>setAuthPassword(e.target.value)} placeholder="Kamida 6 belgi"/></label><p className="demo-auth-warning">Parol serverga yuborilmaydi va saqlanmaydi. Haqiqiy autentifikatsiya server ulangandan keyin qo‘shiladi.</p><div className="modal-actions"><button type="button" className="secondary" onClick={()=>setAuthMode(authMode==="register"?"login":"register")}>{authMode==="register"?"Kirish":"Ro‘yxatdan o‘tish"}</button><button className="primary" type="submit">{t("Davom etish")}</button></div></form></div>}
    {editingWound&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setEditingWound(null);}}><form className="modal" onSubmit={saveWoundEdit}><div className="modal-head"><div><h2>{t("Yara ma’lumotlarini tahrirlash")}</h2><p>{t("Yozuv ma’lumotlarini yangilang.")}</p></div><button type="button" className="icon-button" onClick={()=>setEditingWound(null)}><X size={19}/></button></div><label>{t("Yara nomi")}<input required value={editWoundName} onChange={e=>setEditWoundName(e.target.value)}/></label><label>{t("Joylashuvi")}<input required value={editWoundLocation} onChange={e=>setEditWoundLocation(e.target.value)}/></label><label>{t("Boshlangan sana")}<input type="date" required value={editWoundStarted} onChange={e=>setEditWoundStarted(e.target.value)}/></label><label>{t("Holati")}<select value={editWoundStatus} onChange={e=>setEditWoundStatus(e.target.value as WoundStatus)}><option>{t("Faol")}</option><option>{t("Kuzatuvda")}</option><option>{t("Yakunlangan")}</option></select></label><label>{t("Muhimlik darajasi")}<select value={editWoundPriority} onChange={e=>setEditWoundPriority(e.target.value as "Oddiy"|"Muhim"|"Yuqori")}><option>{t("Oddiy")}</option><option>{t("Muhim")}</option><option>{t("Yuqori")}</option></select></label><label>{t("Qayta ko‘rik sanasi")}<input type="date" value={editWoundFollowUp} onChange={e=>setEditWoundFollowUp(e.target.value)}/></label><label>{t("Tavsif")}<textarea value={editWoundDescription} onChange={e=>setEditWoundDescription(e.target.value)} placeholder="Yara haqida qo‘shimcha ma’lumot"/></label><label>{t("Teglar (vergul bilan)")}<input value={editWoundTags} onChange={e=>setEditWoundTags(e.target.value)} placeholder="masalan: diabet, tovon, chap oyoq"/></label><div className="modal-actions"><button type="button" className="secondary" onClick={()=>setEditingWound(null)}>{t("Bekor qilish")}</button><button className="primary">{t("Saqlash")}</button></div></form></div>}
    {showAdd&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setShowAdd(false);}}><form className="modal" onSubmit={addWound}><div className="modal-head"><div><h2>{t("Yara qo‘shish")}</h2><p>{t("Kuzatish uchun alohida yozuv yarating.")}</p></div><button type="button" className="icon-button" onClick={()=>setShowAdd(false)}><X size={19}/></button></div><label>{t("Yara nomi")}<input required value={name} onChange={e=>setName(e.target.value)} placeholder="Masalan, chap oyoq yarasi"/></label><label>{t("Tanadagi joylashuvi")}<input required value={location} onChange={e=>setLocation(e.target.value)} placeholder="Masalan, chap tovon"/></label><label>{t("Birinchi aniqlangan sana")}<input type="date" required value={started} onChange={e=>setStarted(e.target.value)}/></label><div className="modal-actions"><button type="button" className="secondary" onClick={()=>setShowAdd(false)}>{t("Bekor qilish")}</button><button className="primary" type="submit">{t("Yozuvni yaratish")}</button></div></form></div>}
    {editPhoto&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setEditPhoto(null);}}><form className="modal" onSubmit={savePhotoNote}><div className="modal-head"><div><h2>{t("Surat izohini tahrirlash")}</h2><p>{t("Suratga tegishli qaydni yangilang.")}</p></div><button type="button" className="icon-button" onClick={()=>setEditPhoto(null)}><X size={19}/></button></div><label>{t("Izoh")}<textarea value={editPhotoNote} onChange={e=>setEditPhotoNote(e.target.value)} placeholder="Surat haqida qayd..."/></label><div className="modal-actions"><button type="button" className="secondary" onClick={()=>setEditPhoto(null)}>{t("Bekor qilish")}</button><button className="primary">{t("Saqlash")}</button></div></form></div>}
    {showUpload&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setShowUpload(false);}}><form className="modal" onSubmit={addPhoto}><div className="modal-head"><div><h2>{t("Surat yuklash")}</h2><p>{t("Suratni tegishli yara tarixiga qo‘shing.")}</p></div><button type="button" className="icon-button" onClick={()=>setShowUpload(false)}><X size={19}/></button></div><label>{t("Yarani tanlang")}<select required value={selected} onChange={e=>setSelected(e.target.value)}><option value="">{t("Yarani tanlang")}</option>{wounds.map(w=><option key={w.id} value={w.id}>{w.name} · {w.location}</option>)}</select></label><div className="photo-guide"><b>{t("Photo taking guide")}</b><span>{t("Use bright, even light; avoid shadows.")}</span><span>{t("Keep the camera straight above the wound.")}</span><span>{t("Include the whole wound and a clean size reference beside it.")}</span><span>{t("Do not place anything on the wound.")}</span></div><label className="upload-zone"><UploadCloud size={25}/><b>{file?file.name:"Surat tanlash"}</b><span>{t("JPG, PNG yoki WEBP · maksimal 10 MB. Saqlashdan oldin optimallashtiriladi.")}</span><input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={e=>handleFileSelection(e.target.files?.[0]||null)}/></label>{preview&&<img className="preview" src={preview} alt="Selected photo preview"/>}<label>{t("Izoh (ixtiyoriy)")}<textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Surat haqida qisqa izoh yozing."/></label><div className="modal-actions"><button type="button" className="secondary" onClick={()=>setShowUpload(false)}>{t("Bekor qilish")}</button><button className="primary" type="submit" disabled={!file||!selected||file.size>10*1024*1024}>{t("Suratni qo‘shish")}</button></div>{fileError&&<p className="error" role="alert">{fileError}</p>}{!wounds.length&&<p className="error">{t("Surat yuklashdan oldin yara yozuvini yarating.")}</p>}</form></div>}
  </div>;
}

function WoundTrend({measurements,language,t}:{measurements:WoundMeasurement[];language:"uz"|"ru"|"en";t:(uz:string)=>string}) {
  const series=[...measurements].reverse().map(m=>({date:m.date,area:m.lengthMm*m.widthMm/100}));
  if(series.length<2)return null;
  const values=series.map(x=>x.area),min=Math.min(...values),max=Math.max(...values),span=Math.max(0.01,max-min);
  const points=series.map((item,index)=>({x:24+(index*(552/(series.length-1))),y:105-((item.area-min)/span)*78,item}));
  return <section className="measurement-trend trend-chart"><b>{t("Measurement trend")}</b><span>{t("Area (cm²) from entered length × width; not a clinical assessment.")}</span><svg viewBox="0 0 600 145" role="img" aria-label={t("Measurement trend")}><polyline points={points.map(p=>p.x+","+p.y).join(" ")} fill="none" stroke="#168a78" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>{points.map((p,i)=><g key={p.item.date}><circle cx={p.x} cy={p.y} r="5" fill="#e59a4f"/><text x={p.x} y={p.y-10} textAnchor={i===0?"start":i===points.length-1?"end":"middle"}>{p.item.area.toFixed(1)}</text><text x={p.x} y="132" textAnchor={i===0?"start":i===points.length-1?"end":"middle"}>{new Date(p.item.date).toLocaleDateString(language)}</text></g>)}</svg></section>;
}

function PhotoCompare({wounds,woundId,setWoundId,firstId,setFirstId,secondId,setSecondId,t}:{wounds:Wound[];woundId:string;setWoundId:(v:string)=>void;firstId:string;setFirstId:(v:string)=>void;secondId:string;setSecondId:(v:string)=>void;t:(uz:string)=>string}){
  const eligible=wounds.filter(w=>w.photos.length>=2);
  const wound=eligible.find(w=>w.id===woundId)||eligible[0];
  const first=wound.photos.find(p=>p.id===firstId)||wound.photos[wound.photos.length-1];
  const second=wound.photos.find(p=>p.id===secondId)||wound.photos[0];
  return <section className="card compare-card"><div className="compare-heading"><div><h3>{t("Taqqoslash")}</h3><p>{t("Bir yaraga tegishli ikki suratni yonma-yon ko‘ring")}</p></div><span className="compare-mark">↔</span></div>
    <label>{t("Yara")}<select value={wound.id} onChange={e=>{setWoundId(e.target.value);setFirstId("");setSecondId("");}}>{eligible.map(w=><option key={w.id} value={w.id}>{w.name} · {w.location}</option>)}</select></label>
    <div className="compare-selects"><label>{t("Birinchi surat")}<select value={first.id} onChange={e=>setFirstId(e.target.value)}>{wound.photos.map(p=><option key={p.id} value={p.id}>{new Date(p.date).toLocaleString()}</option>)}</select></label><label>{t("Ikkinchi surat")}<select value={second.id} onChange={e=>setSecondId(e.target.value)}>{wound.photos.map(p=><option key={p.id} value={p.id}>{new Date(p.date).toLocaleString()}</option>)}</select></label></div>
    <div className="compare-images"><figure><img src={first.url} alt={t("Birinchi surat")}/><figcaption><b>{t("Birinchi surat")}</b><span>{new Date(first.date).toLocaleString()}</span></figcaption></figure><figure><img src={second.url} alt={t("Ikkinchi surat")}/><figcaption><b>{t("Ikkinchi surat")}</b><span>{new Date(second.date).toLocaleString()}</span></figcaption></figure></div>
    <p className="compare-disclaimer">{t("Suratlar faqat vizual taqqoslash uchun. Bu ko‘rinish yara bitgani yoki infeksiya bor-yo‘qligini aniqlamaydi.")}</p>
  </section>;
}

function WoundCard({wound,onOpen}:{wound:Wound;onOpen:()=>void}){return <button className="card wound-card" onClick={onOpen}><div className="wound-card-icon"><HeartPulse size={20}/></div><div className="wound-card-copy"><b>{wound.name}</b><span>{wound.location}</span><small>{wound.photos.length} ta surat · Boshlangan sana: {wound.started}</small></div><span className="arrow">→</span></button>}
