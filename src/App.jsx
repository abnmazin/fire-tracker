import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ShieldAlert, ShieldCheck, AlertTriangle, LogOut, Plus, FileText, 
  Settings, LayoutDashboard, FireExtinguisher, Search, Users,
  CheckCircle, XCircle, ClipboardList, ArrowRightLeft, Archive, Edit, Filter,
  UserPlus, Trash2, Phone, Menu, X, MapPin, DatabaseBackup, Loader2, Calendar,
  CopyPlus, Target, Activity, History, WifiOff, Printer, Download, FileSpreadsheet,
  ChevronDown, Bell, Send, Check
} from 'lucide-react';

import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { initializeFirestore, collection, doc, setDoc, deleteDoc, onSnapshot, writeBatch, waitForPendingWrites, CACHE_SIZE_UNLIMITED, updateDoc } from 'firebase/firestore';

import HierarchicalLocationPicker from './HierarchicalLocationPicker';
import LocationTreeManager from './LocationTreeManager';
import { migrateIfNeeded, getAllLeafPaths, getAllNodePaths, deserializeTree, serializeTree, flatToTree, addNode, getNodePath, findNodeById } from './locationUtils';
import { isNotifSupported, subscribeForeground, getExistingToken, requestNotifToken, registerToken, unregisterToken, createNotification, setNotificationLike, deleteNotification, playNotifSound } from './notifications';

let app, auth, db, appId;

try {
  const firebaseConfig = {
    apiKey: "AIzaSyDNy82azv_tH5SNe_52eWwwHQATYtgXgh4",
    authDomain: "fire-tracker-ed183.firebaseapp.com",
    projectId: "fire-tracker-ed183",
    storageBucket: "fire-tracker-ed183.firebasestorage.app",
    messagingSenderId: "419744627127",
    appId: "1:419744627127:web:16516d132fee41bdbf5032"
  };

  app = initializeApp(firebaseConfig);
  appId = 'fire-tracker-ed183';

  if (app) {
    auth = getAuth(app);
    db = initializeFirestore(app, { cache: { kind: 'persistent', cacheSizeBytes: CACHE_SIZE_UNLIMITED } });
  }
} catch (e) {
  console.error("خطأ في تهيئة فايربيس:", e);
}

// مخصص فقط لجلسة تسجيل الدخول
function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) { return initialValue; }
  });

  useEffect(() => {
    try { window.localStorage.setItem(key, JSON.stringify(value)); } catch (error) {}
  }, [key, value]);

  return [value, setValue];
}

// ===== نظام المزامنة والأوفلاين =====

const QUEUE_KEY = 'ft_pendingWrites';
const QUEUE_EVENT = 'ft-queue-changed';

const loadQueue = () => {
  try {
    const q = JSON.parse(window.localStorage.getItem(QUEUE_KEY));
    return Array.isArray(q) ? q : [];
  } catch (e) { return []; }
};

const saveQueue = (q) => {
  try { window.localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); } catch (e) {}
};

const notifyQueueChanged = () => {
  try { window.dispatchEvent(new Event(QUEUE_EVENT)); } catch (e) {}
};

// سجل عملية كتابة/حذف محلية ليتم مزامنتها لاحقاً عند عودة الاتصال.
// colPath هو المسار بعد data/ مثل 'extinguishers' أو 'app_data'.
const enqueueWrite = (colPath, id, data) => {
  const q = loadQueue();
  q.push({ type: 'set', colPath, id: String(id), data, ts: Date.now() });
  saveQueue(q);
  notifyQueueChanged();
};

const enqueueDelete = (colPath, id) => {
  const q = loadQueue();
  q.push({ type: 'delete', colPath, id: String(id), ts: Date.now() });
  saveQueue(q);
  notifyQueueChanged();
};

// إعادة توجيه عملية كتابة/حذف إما إلى فايربيس مباشرة أو إلى صف الانتظار
const routeWrite = (db, fbUser, appId, colPath, id, data) => {
  if (db && fbUser) {
    return setDoc(doc(db, 'artifacts', appId, 'public', 'data', colPath, String(id)), data)
      .catch(err => console.error("write err:", err));
  }
  enqueueWrite(colPath, id, data);
  return Promise.resolve();
};

const routeDelete = (db, fbUser, appId, colPath, id) => {
  if (db && fbUser) {
    return deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', colPath, String(id)))
      .catch(err => console.error("write err:", err));
  }
  enqueueDelete(colPath, id);
  return Promise.resolve();
};

// تصفير صف الانتظار ونقل كل العمليات إلى فايربيس دفعة واحدة
const flushPendingWrites = async (db, fbUser, appId) => {
  if (!db || !fbUser) return false;
  const q = loadQueue();
  if (!q.length) return false;
  const batch = writeBatch(db);
  q.forEach(op => {
    const ref = doc(db, 'artifacts', appId, 'public', 'data', op.colPath, op.id);
    if (op.type === 'delete') batch.delete(ref);
    else batch.set(ref, op.data);
  });
  try {
    await batch.commit();
    saveQueue([]);
    notifyQueueChanged();
    return true;
  } catch (e) {
    console.error("flush err:", e);
    return false;
  }
};

// توحيد الحروف في اسم المستخدم (تجاهل الكابتل/السمول)
const normalizeUsername = (s) => String(s || '').trim().toLowerCase();

// Initial location tree: hierarchical structure
const initialLocationTree = [
  {
    id: 'loc-root-1',
    name: 'البصرة',
    children: [
      {
        id: 'loc-basra-mosque',
        name: 'مسجد الموسوي',
        children: [
          { id: 'loc-basra-mosque-kitchen', name: 'المطبخ', children: [] },
          { id: 'loc-basra-mosque-hall', name: 'القاعة الرئيسية', children: [] },
          { id: 'loc-basra-mosque-roof', name: 'السطح', children: [] },
        ]
      },
      { id: 'loc-basra-husseini', name: 'موكب كربلاء', children: [] },
    ]
  },
  {
    id: 'loc-root-2',
    name: 'بغداد',
    children: [
      { id: 'loc-baghdad-mosque', name: 'جامع الإمام', children: [] },
    ]
  },
  {
    id: 'loc-root-3',
    name: 'النجف',
    children: [
      { id: 'loc-najaf-mawkib', name: 'موكب النجف', children: [] },
    ]
  },
  {
    id: 'loc-root-4',
    name: 'سامراء',
    children: [
      { id: 'loc-samarra-mawkib', name: 'موكب سامراء', children: [] },
    ]
  },
  {
    id: 'loc-root-5',
    name: 'المشاية',
    children: [],
  },
];

const initialUsers = [
  { id: 1, name: 'المبرمج الأعلى', username: 'dev', password: '123', role: 'developer', archived: false },
  { id: 2, name: 'المشرف العام', username: 'father', password: '123', role: 'father', archived: false },
  { id: 3, name: 'مدير النظام', username: 'admin', password: '123', role: 'admin', archived: false },
  { id: 4, name: 'العضو أحمد', username: 'user', password: '123', role: 'member', archived: false }
];

const initialContacts = [
  { id: 1, name: 'إدارة المسجد', phone: '07800000000' },
  { id: 2, name: 'الصيانة والطوارئ', phone: '07700000000' }
];

const initialInspectionPolicies = [];

const toDateOnly = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const calculateNextDate = (lastDateStr) => {
  if (!lastDateStr) return '';
  const d = new Date(lastDateStr);
  d.setMonth(d.getMonth() + 6);
  return d.toISOString().split('T')[0];
};

const calculateStatus = (nextDateStr, lastInspectionStr) => {
  if (!nextDateStr) return 'مجهولة';
  
  const next = new Date(nextDateStr);
  const now = new Date();
  const diffDays = Math.ceil((next - now) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 'تحتاج صيانة';
  if (diffDays <= 14) return 'صيانة قريبة'; 

  return 'صالحة';
};

const resolveExtinguisherStatus = (ext, inspectionPolicies = []) => {
  const signatures = ext.inspectionSignatures || [];
  if (signatures.length > 0) {
    const latestSignature = signatures.reduce((latest, current) => {
      const latestTime = new Date(latest.at || latest.date || 0).getTime();
      const currentTime = new Date(current.at || current.date || 0).getTime();
      return currentTime > latestTime ? current : latest;
    });

    // If latest recorded field action reports a fault, extinguisher must stay in maintenance-needed state.
    if (latestSignature.condition && latestSignature.condition !== 'سليمة') return 'تحتاج صيانة';
  }

  // Fallback for legacy rows that may carry explicit state without signatures.
  if (ext.status === 'تحتاج صيانة') return 'تحتاج صيانة';

  const maintenanceStatus = calculateStatus(ext.nextDate, ext.lastInspection || ext.lastDate);
  if (maintenanceStatus !== 'صالحة') return maintenanceStatus;

  // For inspection policy matching, use the top-level location name
  const topLocation = ext.location ? ext.location.split(' / ')[0].trim() : '';
  const policy = inspectionPolicies.find(p => p.location === topLocation);
  if (!policy || !policy.enabled) return 'صالحة';

  const intervalDays = Math.max(1, Number(policy.intervalDays) || 1);
  const today = toDateOnly(new Date());
  const startDate = toDateOnly(new Date(policy.startDate || formatDate(new Date())));
  if (today < startDate) return 'صالحة';

  const baseDateStr = ext.lastInspection || ext.lastDate;
  if (!baseDateStr) return 'تحتاج فحص';

  const baseDate = toDateOnly(new Date(baseDateStr));
  const dueDate = new Date(baseDate);
  dueDate.setDate(dueDate.getDate() + intervalDays);

  return today >= toDateOnly(dueDate) ? 'تحتاج فحص' : 'صالحة';
};

const today = new Date();
const formatDate = (d) => d.toISOString().split('T')[0];
const dToday = formatDate(today);
const d1MonthAgo = formatDate(new Date(today.getFullYear(), today.getMonth() - 1, today.getDate()));
const d8MonthsAgo = formatDate(new Date(today.getFullYear(), today.getMonth() - 8, today.getDate())); 

// عرض موحد للتاريخ بصيغة أرقام يوم-شهر-سنة (مثال: 03-08-2026)
const pad2 = (n) => String(n).padStart(2, '0');
const formatDisplayDate = (dateStr) => {
  if (!dateStr) return '';
  const s = String(dateStr).trim();
  if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
    const [dd, mm, yyyy] = s.split('-');
    if (!isNaN(Number(yyyy + mm + dd))) return s;
  }
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()}`;
};
const formatDisplayDateTime = (dateStr) => {
  if (!dateStr) return '';
  const s = String(dateStr).trim();
  if (/^\d{2}-\d{2}-\d{4}\s\d{2}:\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return `${formatDisplayDate(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};
// تحويل أي صيغة يوم مخزنة (مثل 3/8/2026) إلى dd-mm-yyyy
const normalizeDayStr = (str) => {
  if (!str) return str;
  const clean = String(str).split(/[،,]/)[0].trim();
  const parts = clean.split('/');
  if (parts.length === 3) {
    const d = Number(parts[0]), m = Number(parts[1]), y = Number(parts[2]);
    if (d && m && y && y > 1000) return `${pad2(d)}-${pad2(m)}-${y}`;
  }
  return formatDisplayDate(clean);
};
// عرض تاريخ سجلات العمليات (يدعم الصيغة القديمة والجديدة)
const formatLogDate = (str) => {
  if (!str) return '';
  const s = String(str).trim();
  if (/^\d{2}-\d{2}-\d{4}(\s\d{2}:\d{2})?$/.test(s)) return s;
  const parts = s.split(/[،,]/);
  const day = normalizeDayStr(parts[0]);
  if (!day) return s;
  const tm = parts[1] ? parts[1].trim().match(/(\d{1,2}):(\d{2})/) : null;
  if (tm) return `${day} ${pad2(Number(tm[1]))}:${tm[2]}`;
  return day;
};

const initialExtinguishers = [
  { id: 1, number: 'EXT-001', size: '6Kg', type: 'Powder', location: 'البصرة / مسجد الموسوي / المطبخ', lastDate: d1MonthAgo, nextDate: calculateNextDate(d1MonthAgo), lastInspection: dToday, status: 'صالحة', notes: 'يوجد خدش بسيط', inCabinet: true, archived: false },
  { id: 2, number: 'EXT-002', size: '12Kg', type: 'CO2', location: 'البصرة / موكب كربلاء', lastDate: d8MonthsAgo, nextDate: calculateNextDate(d8MonthsAgo), lastInspection: dToday, status: 'تحتاج صيانة', notes: 'منتهية الصلاحية', inCabinet: false, archived: false },
  { id: 3, number: 'EXT-003', size: '6Kg', type: 'Foam', location: 'النجف / موكب النجف', lastDate: d1MonthAgo, nextDate: calculateNextDate(d1MonthAgo), lastInspection: d1MonthAgo, status: 'تحتاج فحص', notes: 'لم تفحص اليوم', inCabinet: false, archived: false },
];

export default function App() {
  const [currentUser, setCurrentUser] = useLocalStorage('fireTracker_user', null);
  const currentUserRef = useRef(currentUser);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);

  const [currentView, setCurrentView] = useState(() => {
    try {
      const v = new URLSearchParams(window.location.search).get('view');
      const valid = ['dashboard', 'list', 'report', 'performance', 'inspectionPolicy', 'archive', 'settings', 'users', 'notifications'];
      if (valid.includes(v)) return v;
      const saved = localStorage.getItem('ft_view');
      return valid.includes(saved) ? saved : 'dashboard';
    } catch (e) { return 'dashboard'; }
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    const restricted = {
      performance: ['developer', 'admin', 'father'],
      inspectionPolicy: ['developer', 'father'],
      archive: ['developer', 'father'],
      settings: ['developer'],
    };
    const allowed = restricted[currentView];
    if (allowed && !allowed.includes(currentUser.role)) setCurrentView('dashboard');
  }, [currentUser, currentView]);
  const [fbUser, setFbUser] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState('idle'); // idle | syncing | synced
  const prevOnline = useRef(isOnline);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => { setSyncStatus('idle'); setIsOnline(false); };
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // ===== إعدادات التطبيق المثبّت (PWA) =====
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(() => {
    try { return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true; }
    catch (e) { return false; }
  });
  const [wcoVisible, setWcoVisible] = useState(false);

  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setInstallPrompt(e); };
    const onInstalled = () => { setInstallPrompt(null); setIsStandalone(true); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    const media = window.matchMedia('(display-mode: standalone)');
    const onDisplayChange = (ev) => setIsStandalone(ev.matches);
    media.addEventListener('change', onDisplayChange);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      media.removeEventListener('change', onDisplayChange);
    };
  }, []);

  useEffect(() => {
    if (!('windowControlsOverlay' in navigator)) return;
    const wco = navigator.windowControlsOverlay;
    const update = () => setWcoVisible(wco.visible);
    update();
    wco.addEventListener('geometrychange', update);
    return () => wco.removeEventListener('geometrychange', update);
  }, []);

  const handleInstallApp = async () => {
    if (!installPrompt) return;
    try {
      installPrompt.prompt();
      await installPrompt.userChoice;
    } catch (e) {}
    setInstallPrompt(null);
  };

  // Detect when coming back online and wait for pending writes to sync
  useEffect(() => {
    if (isOnline && !prevOnline.current && db) {
      setSyncStatus('syncing');
      waitForPendingWrites(db).then(() => {
        setSyncStatus('synced');
        setTimeout(() => setSyncStatus('idle'), 3000);
      }).catch(() => setSyncStatus('idle'));
    }
    prevOnline.current = isOnline;
  }, [isOnline, db]);

  // تصفير صف الانتظار تلقائياً عند توفر الاتصال والمصادقة
  useEffect(() => {
    if (!isOnline || !fbUser || !db) return;
    if (loadQueue().length === 0) return;
    setSyncStatus('syncing');
    flushPendingWrites(db, fbUser, appId).then(done => {
      setPendingCount(loadQueue().length);
      if (done) {
        waitForPendingWrites(db).then(() => {
          setSyncStatus('synced');
          setTimeout(() => setSyncStatus('idle'), 3000);
        }).catch(() => setSyncStatus('idle'));
      } else {
        setSyncStatus('idle');
      }
    });
  }, [isOnline, fbUser, db, appId]);

  // بيانات مدعومة بتخزين محلي (localStorage) لضمان العمل أوفلاين والبقاء بعد الريفرش.
  // فايربيس هو مصدر الحقيقة عند الاتصال (onSnapshot يتجاوز النسخة المحلية).
  const [extinguishers, setExtinguishers] = useLocalStorage('ft_extinguishers', []);
  const [users, setUsers] = useLocalStorage('ft_users', initialUsers);
  const [auditLogs, setAuditLogs] = useLocalStorage('ft_auditLogs', []);
  const [contacts, setContacts] = useLocalStorage('ft_contacts', initialContacts);
  const [locationTree, setLocationTree] = useLocalStorage('ft_locations', initialLocationTree);
  const [inspectionPolicies, setInspectionPolicies] = useLocalStorage('ft_inspectionPolicies', initialInspectionPolicies);
  const [siteSettings, setSiteSettings] = useLocalStorage('ft_siteSettings', { name: 'مسجد الموسوي الكبير', logoUrl: 'https://preview.redd.it/%D9%85%D8%B3%D8%AC%D8%AF-%D8%A7%D9%84%D9%85%D9%88%D8%B3%D9%88%D9%8A-%D8%A7%D9%84%D9%83%D8%A8%D9%8A%D8%B1-%D9%81%D9%8A-%D8%A7%D9%84%D8%A8%D8%B5%D8%B1%D8%A9-v0-pbunk76bws571.jpg?width=640&crop=smart&auto=webp&s=dcef5b80db948e2e6789f5bfe95f09703af9e6d1' });

  // عدد العمليات المعلقة بانتظار المزامنة
  const [pendingCount, setPendingCount] = useState(loadQueue().length);
  useEffect(() => {
    const handler = () => setPendingCount(loadQueue().length);
    window.addEventListener(QUEUE_EVENT, handler);
    return () => window.removeEventListener(QUEUE_EVENT, handler);
  }, []);

  // Compute flat location paths list for use in filters, etc.
  const locationPaths = useMemo(() => getAllLeafPaths(locationTree), [locationTree]);
  const allLocationNodes = useMemo(() => getAllNodePaths(locationTree), [locationTree]);

  // Helper to get all unique top-level location names (for policies and filters)
  const topLevelLocations = useMemo(() => 
    locationTree.map(n => n.name),
  [locationTree]);

  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => { try { await signInAnonymously(auth); } catch (e) {} };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setFbUser);
    // عند عودة الاتصال نحاول تسجيل الدخول من جديد تلقائياً
    const handleOnline = () => initAuth();
    window.addEventListener('online', handleOnline);
    return () => { unsubscribe(); window.removeEventListener('online', handleOnline); };
  }, []);

  useEffect(() => {
    if (!fbUser || !db) return;

    const unsubExt = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'extinguishers'), (snap) => {
      setExtinguishers(snap.docs.map(d => {
        const data = d.data();
        const recalculatedStatus = calculateStatus(data.nextDate, data.lastInspection || data.lastDate);
        return {
          ...data,
          archived: Boolean(data.archived),
          status: data.status === 'تحتاج صيانة' ? 'تحتاج صيانة' : recalculatedStatus
        };
      }));
    }, console.error);

    const unsubUsers = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'users'), (snap) => {
      const updatedUsers = snap.docs.map(d => ({ ...d.data(), archived: Boolean(d.data().archived) }));
      setUsers(updatedUsers);
      if (currentUserRef.current) {
        const me = updatedUsers.find(u => String(u.id) === String(currentUserRef.current.id));
        if (!me || me.archived) {
          setCurrentUser(null);
        } else if (me.role !== currentUserRef.current.role || me.name !== currentUserRef.current.name) {
          setCurrentUser({ ...currentUserRef.current, role: me.role, name: me.name });
        }
      }
    }, console.error);

    const unsubLogs = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'auditLogs'), (snap) => {
      setAuditLogs(snap.docs.map(d => d.data()).sort((a,b) => b.id - a.id));
    }, console.error);

    const unsubContacts = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'app_data', 'contacts'), (snap) => {
      if (snap.exists()) setContacts(snap.data().list || []);
    }, console.error);

    const unsubLocs = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'app_data', 'locations'), (snap) => {
      if (snap.exists()) {
        const data = snap.data().list || [];
        const { tree, wasConverted } = migrateIfNeeded(data);
        setLocationTree(tree);
      }
    }, console.error);

    const unsubPolicies = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'app_data', 'inspectionPolicies'), (snap) => {
      if (snap.exists()) setInspectionPolicies(snap.data().list || []);
    }, console.error);

    const unsubSiteSettings = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'app_data', 'siteSettings'), (snap) => {
      if (snap.exists()) setSiteSettings(snap.data());
    }, console.error);

    const unsubNotifs = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'app_data'), (snap) => {
      const arr = [];
      snap.forEach((d) => { if (d.id.startsWith('ntf')) arr.push(d.data()); });
      arr.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setNotifications(arr);
    }, console.error);

    return () => { unsubExt(); unsubUsers(); unsubLogs(); unsubContacts(); unsubLocs(); unsubPolicies(); unsubSiteSettings(); unsubNotifs(); };
  }, [fbUser, appId]);

  const logAction = (action, details) => {
    const d = new Date();
    const dateString = formatDisplayDateTime(d);
    const dayString = formatDisplayDate(d);
    
    const newLog = { 
      id: Date.now(), 
      date: dateString, 
      dayStr: dayString, 
      userName: currentUser?.name || 'مجهول', 
      action, 
      details: details || '' 
    };

    if (db && fbUser) setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'auditLogs', String(newLog.id)), newLog).catch(err => console.error("write err:", err));
    else { setAuditLogs(prev => [newLog, ...prev]); enqueueWrite('auditLogs', newLog.id, newLog); }
  };

  const handleSaveContacts = (newContacts) => {
    setContacts(newContacts);
    routeWrite(db, fbUser, appId, 'app_data', 'contacts', { list: newContacts });
  };

  const handleSaveLocations = (newTree) => {
    setLocationTree(newTree);
    routeWrite(db, fbUser, appId, 'app_data', 'locations', { list: newTree });
  };

  const handleLocationRename = (newTree, nodeId, oldName, newName) => {
    setLocationTree(newTree);
    if (db && fbUser) {
      const oldPath = getNodePath(locationTree, nodeId);
      const newPath = getNodePath(newTree, nodeId);
      if (!oldPath || !newPath) return;
      const batch = writeBatch(db);
      let count = 0;
      const updatedExts = extinguishers.map(ext => {
        if (ext.location === oldPath || ext.location.startsWith(oldPath + ' / ')) {
          const newLocation = newPath + ext.location.slice(oldPath.length);
          batch.set(doc(db, 'artifacts', appId, 'public', 'data', 'extinguishers', String(ext.id)), { location: newLocation }, { merge: true });
          count++;
          return { ...ext, location: newLocation };
        }
        return ext;
      });
      if (count > 0) {
        batch.commit().catch(err => console.error("batch err:", err));
        setExtinguishers(updatedExts);
      }
      setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'app_data', 'locations'), { list: newTree }).catch(err => console.error("write err:", err));
    } else {
      // أوفلاين: نحدّث المواقع محلياً ونسجّل التغيير للطوائف المتأثرة في صف الانتظار
      const oldPath = getNodePath(locationTree, nodeId);
      const newPath = getNodePath(newTree, nodeId);
      if (oldPath && newPath) {
        const updatedExts = extinguishers.map(ext => {
          if (ext.location === oldPath || ext.location.startsWith(oldPath + ' / ')) {
            const newLocation = newPath + ext.location.slice(oldPath.length);
            enqueueWrite('extinguishers', ext.id, { ...ext, location: newLocation });
            return { ...ext, location: newLocation };
          }
          return ext;
        });
        setExtinguishers(updatedExts);
      }
      enqueueWrite('app_data', 'locations', { list: newTree });
    }
  };

  const handleQuickAddLocation = (parentId, name) => {
    if (!name || !name.trim()) return;
    const newTree = addNode(locationTree, parentId, name.trim());
    handleSaveLocations(newTree);
  };

  const handleSaveSiteSettings = (newSettings) => {
    setSiteSettings(newSettings);
    routeWrite(db, fbUser, appId, 'app_data', 'siteSettings', newSettings);
  };

  const navigateTo = (view) => {
    setCurrentView(view);
    setIsMobileMenuOpen(false);
    try {
      localStorage.setItem('ft_view', view);
      const url = new URL(window.location.href);
      url.searchParams.set('view', view);
      window.history.replaceState(null, '', url.toString());
    } catch (e) {}
  };

  // ===== نظام التبليغات (FCM / Web Push) =====
  const [notifSupported, setNotifSupported] = useState(false);
  const [notifToken, setNotifToken] = useState(null);
  const [notifBusy, setNotifBusy] = useState(false);
  const [notifMsg, setNotifMsg] = useState('');
  const [notifToast, setNotifToast] = useState(null);
  const [customNotif, setCustomNotif] = useState({ title: '', body: '' });
  const [customNotifResult, setCustomNotifResult] = useState('');
  const [notifications, setNotifications] = useState([]);

  const activeExtWithStatus = useMemo(() => extinguishers.filter(e => !e.archived).map(e => ({ ...e, status: resolveExtinguisherStatus(e, inspectionPolicies) })), [extinguishers, inspectionPolicies]);

  useEffect(() => {
    if (!app) return;
    let mounted = true;
    isNotifSupported().then(ok => { if (mounted) setNotifSupported(ok); });
    subscribeForeground(app, ({ title, body, url }) => {
      playNotifSound();
      setNotifToast({ title, body, url, at: Date.now() });
    });
    getExistingToken(app).then(tok => {
      if (!mounted) return;
      if (tok) {
        setNotifToken(tok);
        if (db) registerToken(db, appId, tok, currentUserRef.current).catch(() => {});
      }
    });
    return () => { mounted = false; };
  }, [app, db, appId]);

  useEffect(() => {
    if (!notifToast) return;
    const t = setTimeout(() => setNotifToast(null), 6000);
    return () => clearTimeout(t);
  }, [notifToast]);

  const prevNotifStatus = useRef(null);
  useEffect(() => {
    if (!db || !appId) return;
    const snapshot = {};
    activeExtWithStatus.forEach(e => { snapshot[e.id] = e.status; });
    if (prevNotifStatus.current === null) { prevNotifStatus.current = snapshot; return; }

    const prev = prevNotifStatus.current;
    prevNotifStatus.current = snapshot;
    if (siteSettings.autoNotifs === false) return;

    const extName = (e) => `${e.type === 'Powder' ? 'بودرة' : e.type === 'Foam' ? 'رغوة' : e.type === 'CO2' ? 'CO2' : e.type === 'Water' ? 'ماء' : (e.type || '')} ${e.size || ''}`.trim();
    const sendOnce = (key, title, body) => {
      try {
        const store = JSON.parse(localStorage.getItem('ft_notif_sent') || '{}');
        if (store[key]) return;
        store[key] = new Date().toISOString();
        localStorage.setItem('ft_notif_sent', JSON.stringify(store));
      } catch (e) {}
      createNotification(db, appId, { title, body, url: '/?view=list', kind: 'status', senderId: '', senderName: 'النظام' }).catch(() => {});
    };

    activeExtWithStatus.forEach(e => {
      const prevStatus = prev[e.id];
      if (prevStatus !== undefined && prevStatus !== e.status && e.status !== 'صالحة') {
        sendOnce(`status:${e.id}:${e.status}`, 'تنبيه حالة طفاية', `${extName(e)} — ${e.location}\nالحالة الجديدة: ${e.status}`);
      }
      if (e.nextDate && (e.status === 'تحتاج صيانة' || e.status === 'صيانة قريبة')) {
        sendOnce(`exp:${e.id}:${e.nextDate}`, 'تنبيه انتهاء طفاية', `${extName(e)} — ${e.location}\nتاريخ الانتهاء: ${formatDisplayDate(e.nextDate)}`);
      }
    });
  }, [activeExtWithStatus, db, appId, siteSettings.autoNotifs]);

  if (!currentUser) return <LoginScreen onLogin={setCurrentUser} users={users} siteSettings={siteSettings} />;

  const getRoleLabel = (role) => {
    switch(role) {
      case 'developer': return 'المبرمج الأعلى';
      case 'father': return 'المشرف العام';
      case 'admin': return 'مسؤول النظام';
      default: return 'عضو';
    }
  };

  const getRoleColor = (role) => {
    switch(role) {
      case 'developer': return 'bg-purple-900 border-purple-600';
      case 'father': return 'bg-yellow-600 border-yellow-400 text-yellow-50'; 
      default: return 'bg-red-900 border-red-600';
    }
  };

  const handleEnableNotif = async () => {
    if (!app) return;
    setNotifBusy(true); setNotifMsg('');
    try {
      const tok = await requestNotifToken(app);
      if (db) await registerToken(db, appId, tok, currentUserRef.current);
      setNotifToken(tok);
      setNotifMsg('تم تفعيل التبليغات بنجاح.');
    } catch (e) {
      setNotifMsg('تعذر التفعيل: ' + (e.message === 'denied' ? 'تم رفض الإذن من المتصفح.' : e.message === 'unsupported' ? 'هذا المتصفح لا يدعم التبليغات.' : e.message === 'no-token' ? 'لم يتم الحصول على رمز. تحقق من مفاتيح VAPID في إعدادات المشروع.' : String(e)));
    } finally { setNotifBusy(false); }
  };

  const handleDisableNotif = async () => {
    if (!db || !appId || !notifToken) return;
    setNotifBusy(true);
    await unregisterToken(db, appId, notifToken);
    setNotifToken(null);
    setNotifBusy(false);
    setNotifMsg('تم إيقاف التبليغات.');
  };

  const handleCustomNotifSend = async () => {
    if (!db || !appId || !customNotif.title.trim()) return;
    setNotifBusy(true); setCustomNotifResult('');
    const res = await createNotification(db, appId, { title: customNotif.title.trim(), body: customNotif.body.trim(), url: '/', kind: 'custom', senderId: currentUser.id, senderName: currentUser.name });
    setCustomNotifResult(res.skipped ? 'لا توجد أجهزة مسجلة بعد.' : `تم الإرسال إلى ${res.sent || 0} من ${res.total || 0} جهاز${res.failed ? ` (فشل ${res.failed})` : ''}.${res.error ? ' (' + res.error + ')' : ''}`);
    setNotifBusy(false);
  };

  const handleDeleteNotif = async (notifId) => {
    if (!db || !appId || !notifId) return;
    setNotifications(prev => prev.filter(n => n.id !== notifId));
    await deleteNotification(db, appId, notifId);
  };

  return (
    <div className="bg-gray-50 flex flex-col md:flex-row font-sans text-right min-h-screen md:h-screen md:overflow-hidden" dir="rtl" style={wcoVisible ? { paddingTop: 'env(titlebar-area-height, 32px)' } : undefined}>
      {wcoVisible && (
        <div className="pwa-titlebar-drag fixed top-0 left-0 right-0 z-[60] flex items-center justify-between bg-red-800 text-white text-sm font-bold px-4" style={{ height: 'env(titlebar-area-height, 32px)', paddingLeft: 'env(titlebar-area-x, 16px)', paddingRight: 'env(titlebar-area-x, 16px)' }}>
          <span className="truncate">{siteSettings.name}</span>
          <span className="pwa-titlebar-no-drag text-[11px] text-red-200">لجنة السلامة</span>
        </div>
      )}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 md:hidden transition-opacity" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      <aside className={`fixed inset-y-0 right-0 z-50 w-64 bg-red-800 text-white flex flex-col shadow-2xl transform transition-transform duration-300 md:relative md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`} style={isStandalone ? { top: 'var(--sat, 0px)', bottom: 'var(--sab, 0px)', right: 'var(--sar, 0px)' } : undefined}>
        <div className="p-4 md:p-6 flex justify-between items-center md:flex-col border-b border-red-700 bg-red-800">
          <div className="flex items-center md:flex-col gap-3 md:gap-0 w-full md:justify-center">
            <img src={siteSettings.logoUrl} alt="شعار" className="w-10 h-10 md:w-16 md:h-16 rounded-full border border-red-200 object-cover bg-white" />
            <div className="md:mt-3 text-center flex-1 md:flex-none">
              <h1 className="text-sm md:text-xl font-bold leading-tight">{siteSettings.name}</h1>
              <p className="hidden md:block text-xs text-red-200 mt-1">نظام تتبع الطفايات</p>
            </div>
            <button className="md:hidden text-red-100 hover:text-white p-1" onClick={() => setIsMobileMenuOpen(false)}><X className="w-6 h-6" /></button>
          </div>
        </div>
        
        <div className="flex flex-col flex-1 overflow-y-auto">
          <div className="p-4 border-b border-red-700/50 flex flex-col justify-center items-center text-center bg-red-900/30">
            <p className="text-sm text-red-100 font-bold">{currentUser.name}</p>
            <span className={`text-xs px-3 py-1 rounded-full mt-2 shadow-sm border ${getRoleColor(currentUser.role)}`}>
              {getRoleLabel(currentUser.role)}
            </span>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            <SidebarBtn icon={LayoutDashboard} label="لوحة التحكم" active={currentView === 'dashboard'} onClick={() => navigateTo('dashboard')} />
            <SidebarBtn icon={FireExtinguisher} label="سجل الطفايات" active={currentView === 'list'} onClick={() => navigateTo('list')} />
            <SidebarBtn icon={FileText} label="التقارير" active={currentView === 'report'} onClick={() => navigateTo('report')} />
            <SidebarBtn icon={Bell} label="التبليغات" active={currentView === 'notifications'} onClick={() => navigateTo('notifications')} />
            {(currentUser.role === 'developer' || currentUser.role === 'admin' || currentUser.role === 'father') && (
              <SidebarBtn icon={Activity} label="متابعة الإنجاز" active={currentView === 'performance'} onClick={() => navigateTo('performance')} />
            )}
            {(currentUser.role === 'developer' || currentUser.role === 'father') && (
              <>
                <SidebarBtn icon={Calendar} label="سياسة الفحص" active={currentView === 'inspectionPolicy'} onClick={() => navigateTo('inspectionPolicy')} />
                <SidebarBtn icon={Archive} label="الأرشيف" active={currentView === 'archive'} onClick={() => navigateTo('archive')} />
              </>
            )}
            {currentUser.role === 'developer' && (
              <SidebarBtn icon={Settings} label="إعدادات المطور" active={currentView === 'settings'} onClick={() => navigateTo('settings')} />
            )}
          </nav>

          <div className="p-4 border-t border-red-700 mt-auto pb-6 md:pb-4 flex flex-col items-center">
            {installPrompt && !isStandalone && (
              <button onClick={handleInstallApp} className="flex items-center justify-center w-full p-2.5 text-red-900 bg-white hover:bg-red-100 rounded-lg transition-colors mb-5 font-medium shadow">
                <Download className="w-5 h-5 ml-2" /> تثبيت التطبيق على الجهاز
              </button>
            )}
            <button onClick={() => setCurrentUser(null)} className="flex items-center justify-center w-full p-2.5 text-red-200 hover:text-white bg-red-900/50 hover:bg-red-700 rounded-lg transition-colors mb-5 font-medium">
              <LogOut className="w-5 h-5 ml-2" /> تسجيل الخروج
            </button>
            <div className="text-center border-t border-red-700/50 pt-4 w-full">
              <p className="text-[11px] text-red-200 font-medium">© 2026<br/>جميع الحقوق محفوظة.</p>
              <p className="text-[10px] text-red-300/80 mt-1 font-mono">Developed by <a href="https://anydesire.dev" target="_blank" rel="noreferrer" className="font-bold text-white opacity-100 hover:underline">AnyDesire</a></p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 md:h-screen overflow-hidden">
        {(syncStatus === 'syncing') && (
          <div className="bg-blue-500 text-white text-center py-2 px-4 text-sm font-bold shrink-0 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
            جاري المزامنة مع الخادم...
          </div>
        )}
        {syncStatus === 'synced' && (
          <div className="bg-green-500 text-white text-center py-2 px-4 text-sm font-bold shrink-0 flex items-center justify-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            تمت المزامنة بنجاح ✓
          </div>
        )}
        {!isOnline && syncStatus !== 'syncing' && (
          <div className="bg-yellow-500 text-yellow-900 text-center py-2 px-4 text-sm font-bold shrink-0 flex items-center justify-center gap-2">
            <WifiOff className="w-4 h-4 shrink-0" />
            أنت غير متصل — البيانات تعمل محلياً{pendingCount > 0 && <span> ({pendingCount} عملية بانتظار المزامنة)</span>} وستتم المزامنة تلقائياً عند العودة
          </div>
        )}
        <header className="md:hidden bg-red-800 text-white p-4 flex justify-between items-center shadow-md shrink-0 relative z-10" style={{ paddingTop: isStandalone ? 'calc(var(--sat, 0px) + 16px)' : undefined }}>
          <div className="flex items-center gap-3">
            <img src={siteSettings.logoUrl} alt="شعار" className="w-10 h-10 rounded-full border border-red-200 object-cover bg-white shadow-sm" />
            <div>
              <h1 className="text-lg font-bold">{siteSettings.name}</h1>
            </div>
          </div>
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-1 hover:bg-red-700 rounded-lg transition-colors"><Menu className="w-7 h-7" /></button>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-y-auto w-full max-w-full relative z-0 bg-gray-50" style={{ paddingBottom: isStandalone ? 'var(--sab, 0px)' : undefined }}>
          {currentView === 'dashboard' && <Dashboard extinguishers={extinguishers} contacts={contacts} setContacts={handleSaveContacts} user={currentUser} locationTree={locationTree} locationPaths={locationPaths} inspectionPolicies={inspectionPolicies} onQuickAddLocation={handleQuickAddLocation} />}
          {currentView === 'list' && <ExtinguishersList extinguishers={extinguishers} setExtinguishers={setExtinguishers} user={currentUser} logAction={logAction} db={db} fbUser={fbUser} appId={appId} locationTree={locationTree} locationPaths={locationPaths} contacts={contacts} inspectionPolicies={inspectionPolicies} onQuickAddLocation={handleQuickAddLocation} />}
          {currentView === 'report' && <ReportPage extinguishers={extinguishers} setExtinguishers={setExtinguishers} user={currentUser} locationTree={locationTree} onQuickAddLocation={handleQuickAddLocation} db={db} fbUser={fbUser} appId={appId} logAction={logAction} auditLogs={auditLogs} setAuditLogs={setAuditLogs} />}
          {currentView === 'users' && <UsersList users={users} setUsers={setUsers} currentUser={currentUser} logAction={logAction} db={db} fbUser={fbUser} appId={appId} />}
          {currentView === 'performance' && <PerformanceReport auditLogs={auditLogs} userRole={currentUser.role} db={db} fbUser={fbUser} appId={appId} setAuditLogs={setAuditLogs} />}
          {currentView === 'inspectionPolicy' && <InspectionPolicyCenter topLevelLocations={topLevelLocations} inspectionPolicies={inspectionPolicies} setInspectionPolicies={setInspectionPolicies} db={db} fbUser={fbUser} appId={appId} logAction={logAction} currentUser={currentUser} />}
          {currentView === 'archive' && <ArchiveCenter extinguishers={extinguishers} setExtinguishers={setExtinguishers} users={users} setUsers={setUsers} db={db} fbUser={fbUser} appId={appId} logAction={logAction} currentUser={currentUser} />}
          {currentView === 'notifications' && <NotificationsPage notifSupported={notifSupported} notifToken={notifToken} notifBusy={notifBusy} notifMsg={notifMsg} onEnableNotif={handleEnableNotif} onDisableNotif={handleDisableNotif} notifications={notifications} db={db} appId={appId} user={currentUser} canSend customNotif={customNotif} setCustomNotif={setCustomNotif} customNotifResult={customNotifResult} onCustomNotifSend={handleCustomNotifSend} onDeleteNotif={handleDeleteNotif} autoNotifs={siteSettings.autoNotifs !== false} onToggleAutoNotifs={(v) => handleSaveSiteSettings({ ...siteSettings, autoNotifs: v })} />}
          {currentView === 'settings' && <DeveloperSettings locationTree={locationTree} setLocationTree={handleSaveLocations} onRenameLocation={handleLocationRename} contacts={contacts} auditLogs={auditLogs} setAuditLogs={setAuditLogs} extinguishers={extinguishers} setExtinguishers={setExtinguishers} users={users} setUsers={setUsers} db={db} fbUser={fbUser} appId={appId} logAction={logAction} currentUser={currentUser} siteSettings={siteSettings} setSiteSettings={handleSaveSiteSettings} topLevelLocations={topLevelLocations} />}
        </main>
      </div>

      {notifToast && (
        <div className="fixed bottom-4 inset-x-4 z-[70] flex justify-center pointer-events-none" style={{ marginBottom: isStandalone ? 'var(--sab, 0px)' : undefined }}>
          <div className="pointer-events-auto bg-white border border-emerald-200 rounded-xl shadow-2xl px-4 py-3 flex items-start gap-3 max-w-md w-full max-h-[40vh] overflow-y-auto">
            <Bell className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-800 text-sm">{notifToast.title}</p>
              <p className="text-xs text-gray-500 mt-0.5 whitespace-pre-line">{notifToast.body}</p>
            </div>
            <button onClick={() => setNotifToast(null)} className="text-gray-400 hover:text-gray-600 shrink-0"><X className="w-5 h-5" /></button>
          </div>
        </div>
      )}
    </div>
  );
}

function SidebarBtn({ icon: Icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`flex items-center w-full p-3 rounded-lg transition-colors ${active ? 'bg-red-900 text-white font-medium shadow-inner' : 'text-red-100 hover:bg-red-700 hover:text-white'}`}>
      <Icon className="w-5 h-5 ml-3" /> {label}
    </button>
  );
}

function NotificationsPage({ notifSupported, notifToken, notifBusy, notifMsg, onEnableNotif, onDisableNotif, notifications, db, appId, user, canSend, customNotif, setCustomNotif, customNotifResult, onCustomNotifSend, onDeleteNotif, autoNotifs, onToggleAutoNotifs }) {
  const [popup, setPopup] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  const kindBadge = (kind) => {
    if (kind === 'status') return <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">تنبيه تلقائي</span>;
    if (kind === 'custom') return <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">إرسال يدوي</span>;
    return <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">استلام</span>;
  };

  const isLiked = (n) => Boolean(n && n.likes && user && n.likes[user.id]);

  const toggleLike = async (n) => {
    if (!db || !appId || !user || !n) return;
    await setNotificationLike(db, appId, n.id, user, !isLiked(n));
  };

  const canDelete = (n) => Boolean(user && (user.role === 'developer' || n.senderId === user.id));

  const handleDelete = (n) => {
    if (!canDelete(n)) return;
    if (!window.confirm('حذف هذا التبليغ نهائياً؟')) return;
    if (popup && popup.id === n.id) setPopup(null);
    onDeleteNotif(n.id);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 border border-gray-200">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 text-red-700 flex items-center justify-center"><Bell className="w-5 h-5" /></div>
            <div>
              <h2 className="font-bold text-gray-800">التبليغات</h2>
              <p className="text-xs text-gray-500">فعّل أو أوقف استقبال التبليغات وشاهد سجل التبليغات</p>
            </div>
          </div>
          {user.role === 'developer' && (
            <button onClick={() => setShowSettings(s => !s)} className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors shrink-0">
              <Settings className="w-4 h-4" /> إعدادات
            </button>
          )}
        </div>
        {user.role === 'developer' && showSettings && (
          <div className="mb-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-gray-800">التبليغات التلقائية</p>
                <p className="text-xs text-gray-500 mt-0.5">تبليغات تغيّر حالة الطفايات وتنبيهات الانتهاء القريب تُرسل تلقائياً بواسطة النظام</p>
              </div>
              <button
                onClick={() => onToggleAutoNotifs(!autoNotifs)}
                className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${autoNotifs ? 'bg-emerald-600' : 'bg-gray-300'}`}
                aria-pressed={autoNotifs}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${autoNotifs ? 'left-0.5' : 'right-0.5'}`} />
              </button>
            </div>
            <p className={`text-xs mt-2 font-medium ${autoNotifs ? 'text-emerald-700' : 'text-amber-700'}`}>{autoNotifs ? '● مفعّلة — سيتم إرسال التنبيهات التلقائية عند تغيّر الحالة أو قرب الانتهاء' : '○ متوقفة — لن تُرسل أي تنبيهات تلقائية'}</p>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          {notifSupported ? (
            notifToken ? (
              <button onClick={onDisableNotif} disabled={notifBusy} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                إيقاف التبليغات
              </button>
            ) : (
              <button onClick={onEnableNotif} disabled={notifBusy} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
                {notifBusy ? 'جاري التفعيل...' : 'تفعيل التبليغات'}
              </button>
            )
          ) : (
            <span className="text-sm text-gray-500">المتصفح الحالي لا يدعم التبليغات.</span>
          )}
          {notifToken && <span className="text-xs text-emerald-700 font-medium">✓ التبليغات مفعّلة</span>}
        </div>
        {notifMsg && <p className="text-xs mt-3 text-gray-600">{notifMsg}</p>}
      </div>

      {canSend && (
        <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 border border-gray-200">
          <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center"><Send className="w-4 h-4 ml-1.5 text-emerald-600"/> إرسال تبليغ للجميع</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="text"
              className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
              placeholder="عنوان التبليغ"
              value={customNotif.title}
              onChange={(e) => setCustomNotif((n) => ({ ...n, title: e.target.value }))}
            />
            <input
              type="text"
              className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
              placeholder="نص التبليغ"
              value={customNotif.body}
              onChange={(e) => setCustomNotif((n) => ({ ...n, body: e.target.value }))}
            />
          </div>
          <button onClick={onCustomNotifSend} disabled={notifBusy || !customNotif.title.trim()} className="mt-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-lg transition-colors disabled:opacity-50 text-sm flex items-center gap-2">
            <Send className="w-4 h-4" /> إرسال للجميع
          </button>
          {customNotifResult && <p className="text-xs text-gray-600 mt-2">{customNotifResult}</p>}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center gap-2 p-4 md:p-5 border-b border-gray-100">
          <History className="w-5 h-5 text-gray-400" />
          <h3 className="font-bold text-gray-800">سجل التبليغات</h3>
          <span className="text-xs text-gray-400">({notifications.length})</span>
        </div>
        <div className="divide-y divide-gray-100">
          {notifications.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">لا توجد تبليغات بعد.</p>
          )}
          {notifications.map((n) => {
            return (
              <div key={n.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold text-sm text-gray-800">{n.title}</p>
                  <TimeLabel at={n.createdAt} />
                </div>
                {n.body && <p className="text-xs text-gray-500 mt-1 whitespace-pre-line">{n.body}</p>}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {kindBadge(n.kind)}
                  <span className="text-[10px] text-gray-400">المرسل: {n.senderName || 'النظام'}</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <button onClick={() => toggleLike(n)} className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-colors ${isLiked(n) ? 'bg-emerald-50 border-emerald-300 text-emerald-600 font-medium' : 'bg-gray-50 border-gray-200 text-gray-500 hover:text-emerald-600'}`}>
                    <Check className="w-3.5 h-3.5" /> تم
                  </button>
                  <button onClick={() => setPopup(n)} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-500 hover:text-gray-700">
                    <Users className="w-3.5 h-3.5" /> من أعجب ولم يعجب
                  </button>
                  {canDelete(n) && (
                    <button onClick={() => handleDelete(n)} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-gray-50 border border-gray-200 text-red-500 hover:text-red-700 hover:bg-red-50 mr-auto">
                      <Trash2 className="w-3.5 h-3.5" /> حذف
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {popup && <NotifStatsPopup notif={popup} onClose={() => setPopup(null)} />}
    </div>
  );
}

function TimeLabel({ at }) {
  const [label, setLabel] = useState('');
  useEffect(() => {
    let t;
    t = setTimeout(() => {
      try { setLabel(new Date(at).toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })); } catch { setLabel(''); }
    }, 0);
    return () => clearTimeout(t);
  }, [at]);
  return <span className="text-[11px] text-gray-400 shrink-0">{label}</span>;
}

function NotifStatsPopup({ notif, onClose }) {
  const likes = (notif && notif.likes) || {};
  const targets = Object.entries((notif && notif.targetUsers) || {});
  const likers = Object.entries(likes);
  const likerIds = new Set(likers.map(([k]) => k));
  const nonLikers = targets.filter(([k]) => !likerIds.has(k));

  return (
    <div className="fixed inset-0 z-[80] bg-black/50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={onClose}>
      <div className="bg-white w-full md:max-w-md md:rounded-2xl rounded-t-2xl shadow-2xl max-h-[80vh] flex flex-col" style={{ maxHeight: 'calc(80vh - var(--sab, 0px))' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
          <div className="min-w-0">
            <h3 className="font-bold text-gray-800 text-sm truncate">{notif.title}</h3>
            <p className="text-[11px] text-gray-400">المرسل: {notif.senderName || 'النظام'}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 shrink-0"><X className="w-5 h-5" /></button>
        </div>
        <div className="overflow-y-auto p-4 space-y-4">
          <div>
            <p className="text-xs font-bold text-gray-500 mb-2">من أعجب بالتبليغ ({likers.length})</p>
            {likers.length === 0 && <p className="text-xs text-gray-400">لا أحد أعجب بعد.</p>}
            {likers.map(([id, v]) => (
              <div key={id} className="flex items-center justify-between py-1.5 border-b border-gray-50">
                <span className="text-sm text-gray-700 font-medium flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-600" /> {v.name}</span>
                <TimeLabel at={v.at} />
              </div>
            ))}
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 mb-2">({nonLikers.length})</p>
            {nonLikers.length === 0 && <p className="text-xs text-gray-400">لا أحد بعد — أو الجميع أعجبوا!</p>}
            {nonLikers.map(([id, t]) => (
              <div key={id} className="py-1.5 border-b border-gray-50 text-sm text-gray-700 font-medium">{t.name}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginScreen({ onLogin, users, siteSettings }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    const user = users.find(u => !u.archived && normalizeUsername(u.username) === normalizeUsername(username) && u.password === password);
    if (user) onLogin(user);
    else setError('اسم المستخدم أو كلمة المرور غير صحيحة.');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-xl w-full max-w-md">
        <div className="text-center mb-8">
          <img src={siteSettings?.logoUrl} alt="شعار" className="w-20 h-20 mx-auto mb-4 rounded-full border-4 border-red-100 object-cover shadow-sm bg-white" />
          <h2 className="text-xl md:text-2xl font-bold text-gray-800">{siteSettings?.name}</h2>
          <p className="text-gray-500 text-sm mt-2">نظام تتبع طفايات الحريق</p>
        </div>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm text-center">{error}</div>}
        <form onSubmit={handleLogin} className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">اسم المستخدم</label><input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 outline-none" required /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 outline-none" required /></div>
          <button type="submit" className="w-full bg-red-600 text-white font-bold py-3 rounded-lg hover:bg-red-700 shadow-md mb-4">تسجيل الدخول</button>
        </form>
        
        <div className="mt-8 text-center border-t pt-5">
          <p className="text-xs text-gray-500 font-medium tracking-wide">© 2026 جميع الحقوق محفوظة.</p>
          <p className="text-[10px] text-gray-400 mt-1 font-mono">Developed by <a href="https://AnyDesire.dev" target="_blank" rel="noreferrer" className="font-bold text-gray-600 hover:underline">AnyDesire</a></p>
        </div>
      </div>
    </div>
  );
}

function Dashboard({ extinguishers, contacts, setContacts, user, locationTree, locationPaths, inspectionPolicies, onQuickAddLocation }) {
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [filterMainLocation, setFilterMainLocation] = useState('All');
  const [filterSubLocation, setFilterSubLocation] = useState('All');

  const extWithStatus = useMemo(() => extinguishers.filter(e => !e.archived).map(e => ({ ...e, status: resolveExtinguisherStatus(e, inspectionPolicies) })), [extinguishers, inspectionPolicies]);

  const mainLocationNames = useMemo(() => locationTree.map(n => n.name).sort((a, b) => a.localeCompare(b, 'ar')), [locationTree]);
  const subLocationOptions = useMemo(() => {
    if (filterMainLocation === 'All') return [];
    const mainNode = locationTree.find(n => n.name === filterMainLocation);
    if (!mainNode || !mainNode.children) return [];
    return mainNode.children.map(c => c.name).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [locationTree, filterMainLocation]);

  useEffect(() => { setFilterSubLocation('All'); }, [filterMainLocation]);

  const filteredExts = useMemo(() => extWithStatus.filter(e => {
    const matchesMain = filterMainLocation === 'All' || e.location === filterMainLocation || e.location.startsWith(filterMainLocation + ' / ');
    const matchesSub = filterSubLocation === 'All' || e.location === (filterMainLocation + ' / ' + filterSubLocation) || e.location.includes(' / ' + filterSubLocation);
    return matchesMain && matchesSub;
  }), [extWithStatus, filterMainLocation, filterSubLocation]);

  const stats = useMemo(() => ({
    total: filteredExts.length,
    valid: filteredExts.filter(e => e.status === 'صالحة').length,
    warning: filteredExts.filter(e => e.status === 'فحص قريب' || e.status === 'تحتاج فحص').length,
    expired: filteredExts.filter(e => e.status === 'تحتاج صيانة' || e.status === 'منتهية').length,
  }), [filteredExts]);

  const urgentExts = useMemo(() => filteredExts.filter(e => e.status !== 'صالحة'), [filteredExts]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl md:text-2xl font-bold text-gray-800">نظرة عامة</h2>

      <div className="flex flex-wrap gap-2">
        <LocationDropdown
          options={mainLocationNames}
          value={filterMainLocation}
          onChange={setFilterMainLocation}
          placeholder="الموقع الرئيسي"
          onAddLocation={() => { const name = prompt('اسم الموقع الرئيسي الجديد:'); if (name && name.trim()) onQuickAddLocation(null, name.trim()); }}
          addLabel="إضافة موقع رئيسي"
        />
        <LocationDropdown
          options={subLocationOptions}
          value={filterSubLocation}
          onChange={setFilterSubLocation}
          placeholder="الموقع الفرعي"
          onAddLocation={() => { const name = prompt('اسم الموقع الفرعي الجديد:'); if (name && name.trim() && filterMainLocation !== 'All') { const parentId = locationTree.find(n => n.name === filterMainLocation)?.id; if (parentId) onQuickAddLocation(parentId, name.trim()); } }}
          addLabel="إضافة موقع فرعي"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard title="إجمالي الطفايات" count={stats.total} icon={FireExtinguisher} color="bg-blue-500" />
        <StatCard title="صالحة للعمل" count={stats.valid} icon={ShieldCheck} color="bg-green-500" />
        <StatCard title="تنبيهات الفحص" count={stats.warning} icon={AlertTriangle} color="bg-yellow-500" />
        <StatCard title="تحتاج صيانة" count={stats.expired} icon={ShieldAlert} color="bg-red-600" />
      </div>

      <div className="bg-white rounded-xl shadow p-4 md:p-6 border border-gray-100">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center"><AlertTriangle className="w-5 h-5 ml-2 text-red-500" />تتطلب انتباهاً عاجلاً <span className="text-sm font-normal text-gray-500 mr-2">({urgentExts.length})</span></h3>
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-right min-w-[300px]">
            <thead><tr className="border-b text-gray-500 text-sm"><th className="p-3">الرقم</th><th className="p-3">الموقع</th><th className="p-3">الحالة</th></tr></thead>
            <tbody>
              {urgentExts.map(ext => (
                <tr key={ext.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium text-sm">{ext.number}</td>
                  <td className="p-3 text-gray-600 text-sm">{ext.location}</td>
                  <td className="p-3"><span className={`px-2 py-1 rounded-full text-[10px] md:text-xs font-bold whitespace-nowrap ${ext.status.includes('صيانة') ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>{ext.status}</span></td>
                </tr>
              ))}
              {urgentExts.length === 0 && <tr><td colSpan="3" className="p-4 text-center text-green-600 font-medium text-sm">جميع الطفايات بحالة جيدة حالياً!</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="md:hidden flex flex-col gap-3">
          {urgentExts.map(ext => (
            <div key={ext.id} className="bg-gray-50 border border-gray-100 rounded-lg p-3 flex justify-between items-center">
              <div><div className="font-bold text-gray-800 text-sm">{ext.number}</div><div className="text-xs text-gray-500 mt-1">{ext.location}</div></div>
              <span className={`px-2 py-1 rounded-full text-[10px] font-bold whitespace-nowrap ${ext.status.includes('صيانة') ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>{ext.status}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-4 md:p-6 border border-gray-100">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
          <h3 className="text-lg font-bold text-gray-800 flex items-center"><Phone className="w-5 h-5 ml-2 text-blue-500" />أرقام الطوارئ</h3>
          {(user.role === 'developer' || user.role === 'admin' || user.role === 'father') && <button onClick={() => setShowContactsModal(true)} className="text-sm bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1.5 rounded-lg flex items-center font-medium transition-colors w-full sm:w-auto justify-center"><Edit className="w-4 h-4 ml-1" /> تعديل الأرقام</button>}
        </div>
        {contacts.length === 0 ? <p className="text-gray-500 text-sm text-center py-4">لا توجد أرقام مسجلة.</p> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {contacts.map(c => (
              <div key={c.id} className="border border-gray-200 bg-white p-4 rounded-xl flex flex-col justify-center items-center text-center shadow-sm hover:shadow transition-shadow">
                <span className="font-bold text-gray-800 mb-1 text-lg">{c.name}</span>
                <span className="text-gray-500 font-medium text-sm mb-4" dir="ltr">{c.phone}</span>
                <div className="flex w-full gap-2 border-t border-gray-100 pt-3">
                  <a href={`tel:${c.phone}`} className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 py-2 rounded-lg flex items-center justify-center text-xs font-bold transition-colors"><Phone className="w-4 h-4 ml-1.5" /> اتصال</a>
            </div>
          </div>
        ))}
      </div>
        )}
      </div>
      {showContactsModal && <EditContactsModal contacts={contacts} onClose={() => setShowContactsModal(false)} onSave={setContacts} />}
    </div>
  );
}

// ===== XLSX (OOXML) generator — no external libraries =====

const xlsxColName = (i) => {
  let s = '';
  let n = i;
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
};

const xmlEsc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const plainNumber = (n) => {
  const m = String(n ?? '').match(/(\d+)/);
  return m ? String(parseInt(m[1], 10)) : String(n ?? '');
};

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      table[n] = c;
    }
  }
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function buildZip(entries) {
  const chunks = [];
  const central = [];
  let offset = 0;
  const enc = new TextEncoder();
  entries.forEach(({ name, data }) => {
    const nameBytes = enc.encode(name);
    const crc = crc32(data);
    const local = new Uint8Array(30 + nameBytes.length + data.length);
    const dv = new DataView(local.buffer);
    dv.setUint32(0, 0x04034b50, true);
    dv.setUint16(4, 20, true);
    dv.setUint16(6, 0x0800, true);
    dv.setUint16(8, 0, true);
    dv.setUint16(10, 0, true);
    dv.setUint16(12, 0, true);
    dv.setUint32(14, crc, true);
    dv.setUint32(18, data.length, true);
    dv.setUint32(22, data.length, true);
    dv.setUint16(26, nameBytes.length, true);
    dv.setUint16(28, 0, true);
    local.set(nameBytes, 30);
    local.set(data, 30 + nameBytes.length);
    chunks.push(local);
    const c = new Uint8Array(46 + nameBytes.length);
    const cdv = new DataView(c.buffer);
    cdv.setUint32(0, 0x02014b50, true);
    cdv.setUint16(4, 20, true);
    cdv.setUint16(6, 20, true);
    cdv.setUint16(8, 0x0800, true);
    cdv.setUint16(10, 0, true);
    cdv.setUint16(12, 0, true);
    cdv.setUint16(14, 0, true);
    cdv.setUint32(16, crc, true);
    cdv.setUint32(20, data.length, true);
    cdv.setUint32(24, data.length, true);
    cdv.setUint16(28, nameBytes.length, true);
    cdv.setUint16(30, 0, true);
    cdv.setUint16(32, 0, true);
    cdv.setUint16(34, 0, true);
    cdv.setUint16(36, 0, true);
    cdv.setUint32(38, 0, true);
    cdv.setUint32(42, offset, true);
    c.set(nameBytes, 46);
    central.push(c);
    offset += local.length;
  });
  const cdSize = central.reduce((s, c) => s + c.length, 0);
  const eocd = new Uint8Array(22);
  const edv = new DataView(eocd.buffer);
  edv.setUint32(0, 0x06054b50, true);
  edv.setUint16(8, entries.length, true);
  edv.setUint16(10, entries.length, true);
  edv.setUint32(12, cdSize, true);
  edv.setUint32(16, offset, true);
  const total = chunks.reduce((s, c) => s + c.length, 0) + cdSize + eocd.length;
  const out = new Uint8Array(total);
  let p = 0;
  chunks.forEach(c => { out.set(c, p); p += c.length; });
  central.forEach(c => { out.set(c, p); p += c.length; });
  out.set(eocd, p);
  return out;
}

function xlsxSheetXml({ title, headers, rows, widths, totalRow }) {
  const ncols = headers.length;
  const lastCol = xlsxColName(ncols);
  let xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><sheetViews><sheetView rightToLeft="1" workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="15"/>';
  if (widths) xml += '<cols>' + widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('') + '</cols>';
  xml += '<sheetData>';
  xml += `<row r="1"><c r="A1" s="2" t="inlineStr"><is><t>${xmlEsc(title)}</t></is></c></row>`;
  xml += '<row r="2"/>';
  xml += '<row r="3">';
  headers.forEach((h, i) => { xml += `<c r="${xlsxColName(i + 1)}3" s="1" t="inlineStr"><is><t>${xmlEsc(h)}</t></is></c>`; });
  xml += '</row>';
  let r = 4;
  rows.forEach((row, idx) => {
    const s = idx % 2 === 1 ? '5' : '4';
    xml += `<row r="${r}">`;
    row.forEach((val, i) => {
      const ref = xlsxColName(i + 1) + r;
      if (typeof val === 'number') xml += `<c r="${ref}" s="${s}"><v>${val}</v></c>`;
      else if (val === '' || val == null) xml += `<c r="${ref}"/>`;
      else xml += `<c r="${ref}" s="${s}" t="inlineStr"><is><t>${xmlEsc(val)}</t></is></c>`;
    });
    xml += '</row>';
    r++;
  });
  if (totalRow) {
    xml += `<row r="${r}">`;
    totalRow.forEach((val, i) => {
      const ref = xlsxColName(i + 1) + r;
      if (typeof val === 'number') xml += `<c r="${ref}" s="6"><v>${val}</v></c>`;
      else if (val === '' || val == null) xml += `<c r="${ref}"/>`;
      else xml += `<c r="${ref}" s="6" t="inlineStr"><is><t>${xmlEsc(val)}</t></is></c>`;
    });
    xml += '</row>';
  }
  xml += '</sheetData>';
  xml += `<mergeCells count="1"><mergeCell ref="A1:${lastCol}1"/></mergeCells>`;
  xml += '<pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.3" footer="0.3"/><pageSetup paperSize="9" orientation="portrait" fitToWidth="1" fitToHeight="0"/>';
  xml += '</worksheet>';
  return xml;
}

function buildXlsxBlob({ sheets, summaryTitle, summaryHeaders, summaryRows, nonWorking }) {
  const usedNames = new Set();
  const sanitize = (n) => {
    let s = String(n).replace(/[\\\/\?\*\[\]:]/g, '-').slice(0, 31);
    if (usedNames.has(s)) { let i = 2; while (usedNames.has(s.slice(0, 27) + '-' + i)) i++; s = s.slice(0, 27) + '-' + i; }
    usedNames.add(s);
    return s;
  };
  const allSheets = sheets.map(sh => ({ name: sanitize(sh.name), xml: xlsxSheetXml(sh) }));
  allSheets.push({ name: 'الملخص التنفيذي', xml: xlsxSheetXml({ title: summaryTitle, headers: summaryHeaders, rows: summaryRows, widths: [50, 10] }) });
  if (nonWorking && nonWorking.rows.length > 0) {
    allSheets.push({ name: 'غير الصالحة للعمل', xml: xlsxSheetXml({ title: nonWorking.title, headers: nonWorking.headers, rows: nonWorking.rows, widths: [4, 26, 12, 10, 10, 22] }) });
  }
  const enc = new TextEncoder();
  const entries = [];
  let ct = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>';
  allSheets.forEach((s, i) => { ct += `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`; });
  ct += '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>';
  entries.push({ name: '[Content_Types].xml', data: enc.encode(ct) });
  entries.push({ name: '_rels/.rels', data: enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>') });
  let wb = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>';
  allSheets.forEach((s, i) => { wb += `<sheet name="${xmlEsc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`; });
  wb += '</sheets></workbook>';
  entries.push({ name: 'xl/workbook.xml', data: enc.encode(wb) });
  let wbr = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">';
  allSheets.forEach((s, i) => { wbr += `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`; });
  wbr += '<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>';
  entries.push({ name: 'xl/_rels/workbook.xml.rels', data: enc.encode(wbr) });
  entries.push({ name: 'xl/styles.xml', data: enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="13"/><name val="Calibri"/></font></fonts><fills count="6"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF991B1B"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF3F4F6"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF9FAFB"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFDF3CD"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFD1D5DB"/></left><right style="thin"><color rgb="FFD1D5DB"/></right><top style="thin"><color rgb="FFD1D5DB"/></top><bottom style="thin"><color rgb="FFD1D5DB"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="7"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment wrapText="1" vertical="center"/></xf><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment wrapText="1" vertical="center"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment wrapText="1" vertical="center"/></xf><xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment wrapText="1" vertical="center"/></xf><xf numFmtId="0" fontId="2" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment wrapText="1" vertical="center"/></xf></cellXfs></styleSheet>') });
  allSheets.forEach((s, i) => { entries.push({ name: `xl/worksheets/sheet${i + 1}.xml`, data: enc.encode(s.xml) }); });
  return new Blob([buildZip(entries)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

function ReportPage({ extinguishers, setExtinguishers, user, locationTree, onQuickAddLocation, db, fbUser, appId, logAction, auditLogs, setAuditLogs }) {
  const [filterMainLocation, setFilterMainLocation] = useState('All');
  const [filterSubLocation, setFilterSubLocation] = useState('All');
  const [filterType, setFilterType] = useState('All');
  const [filterSize, setFilterSize] = useState('All');
  const [receiptData, setReceiptData] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [cartTargetLocation, setCartTargetLocation] = useState('');
  const [expandedMainLocs, setExpandedMainLocs] = useState(() => new Set());
  const toggleMainLoc = (name) => {
    setExpandedMainLocs(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showExportSettings, setShowExportSettings] = useState(false);
  const [exportOptions, setExportOptions] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('ft_exportSettings') || 'null');
      return { ...{ showStatus: false, showLastInspection: false, showMaintenanceDate: false, showExpiryDate: true, showNumbers: true, showNotes: true, showCabinet: false, showTransferLogs: false, showSubLocationSheets: false }, ...(saved || {}) };
    } catch (e) { return { showStatus: false, showLastInspection: false, showMaintenanceDate: false, showExpiryDate: true, showNumbers: true, showNotes: true, showCabinet: false, showTransferLogs: false, showSubLocationSheets: false }; }
  });

  const mainLocationNames = useMemo(() => locationTree.map(n => n.name).sort((a, b) => a.localeCompare(b, 'ar')), [locationTree]);
  const subLocationOptions = useMemo(() => {
    if (filterMainLocation === 'All') return [];
    const mainNode = locationTree.find(n => n.name === filterMainLocation);
    if (!mainNode || !mainNode.children) return [];
    return mainNode.children.map(c => c.name).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [locationTree, filterMainLocation]);
  useEffect(() => { setFilterSubLocation('All'); }, [filterMainLocation]);

  const filteredExts = useMemo(() => extinguishers.filter(e => !e.archived).filter(e => {
    const matchesMain = filterMainLocation === 'All' || e.location === filterMainLocation || e.location.startsWith(filterMainLocation + ' / ');
    const matchesSub = filterSubLocation === 'All' || e.location === (filterMainLocation + ' / ' + filterSubLocation) || e.location.includes(' / ' + filterSubLocation);
    const matchesType = filterType === 'All' || e.type === filterType;
    const matchesSize = filterSize === 'All' || e.size === filterSize;
    return matchesMain && matchesSub && matchesType && matchesSize;
  }), [extinguishers, filterMainLocation, filterSubLocation, filterType, filterSize]);

  const typeLabel = (t) => t === 'Powder' ? 'بودرة' : t === 'CO2' ? 'CO2' : t === 'Foam' ? 'رغوة' : t === 'Water' ? 'ماء' : t === 'Ceiling' ? 'سقفية' : t;

  const typeOptions = useMemo(() => {
    const types = new Set(extinguishers.filter(e => !e.archived).map(e => e.type));
    return ['All', ...Array.from(types).sort()].map(t => ({ value: t, label: t === 'All' ? 'جميع الأنواع' : typeLabel(t) }));
  }, [extinguishers]);

  const sizeOptions = useMemo(() => {
    const sizes = new Set(extinguishers.filter(e => !e.archived).map(e => e.size));
    return ['All', ...Array.from(sizes).sort((a, b) => parseFloat(a) - parseFloat(b))].map(s => ({ value: s, label: s === 'All' ? 'جميع الأحجام' : s }));
  }, [extinguishers]);

  const extMap = useMemo(() => { const m = {}; filteredExts.forEach(e => m[e.id] = e); return m; }, [filteredExts]);

  const report = useMemo(() => {
    const grouped = {};
    filteredExts.forEach(e => {
      const parts = e.location.split(' / ');
      const mainLoc = parts[0];
      const subLoc = parts.length > 1 ? e.location : '(الموقع الأساسي)';
      if (!grouped[mainLoc]) grouped[mainLoc] = { subLocs: {}, total: 0 };
      if (!grouped[mainLoc].subLocs[subLoc]) grouped[mainLoc].subLocs[subLoc] = { items: [], total: 0 };
      grouped[mainLoc].total++;
      grouped[mainLoc].subLocs[subLoc].total++;
      const type = typeLabel(e.type);
      const key = `${type}|${e.size}|${e.inCabinet}`;
      let item = grouped[mainLoc].subLocs[subLoc].items.find(i => i.key === key);
      if (!item) {
        item = { key, type, size: e.size, inCabinet: e.inCabinet, count: 0, ids: [] };
        grouped[mainLoc].subLocs[subLoc].items.push(item);
      }
      item.count++;
      item.ids.push(e.id);
    });
    return grouped;
  }, [filteredExts]);

  const transferLogs = useMemo(() => {
    return (auditLogs || []).filter(l => l.action === 'نقل').slice(0, 50);
  }, [auditLogs]);

  const getCartCount = (key) => cartItems.find(i => i.key === key)?.count || 0;

  const handleCartIncrement = (subLocation, type, size, inCabinet, total, allIds, allNumbers) => {
    const key = `${subLocation}|${type}|${size}|${inCabinet}`;
    setCartItems(prev => {
      const existing = prev.find(i => i.key === key);
      if (existing) {
        if (existing.count >= total) return prev;
        const idx = existing.count;
        return prev.map(i => i.key === key ? { ...i, count: i.count + 1, extIds: [...i.extIds, allIds[idx]], extNumbers: [...i.extNumbers, allNumbers[idx]] } : i);
      }
      return [...prev, { key, subLocation, type, size, inCabinet, count: 1, total, extIds: [allIds[0]], extNumbers: [allNumbers[0]] }];
    });
  };

  const handleCartDecrement = (key) => {
    setCartItems(prev => {
      const existing = prev.find(i => i.key === key);
      if (!existing) return prev;
      if (existing.count <= 1) return prev.filter(i => i.key !== key);
      return prev.map(i => i.key === key ? { ...i, count: i.count - 1, extIds: i.extIds.slice(0, -1), extNumbers: i.extNumbers.slice(0, -1) } : i);
    });
  };

  const removeCartItem = (key) => setCartItems(prev => prev.filter(i => i.key !== key));

  const handleCartTransfer = () => {
    if (cartItems.length === 0 || !cartTargetLocation) return;
    const allIds = cartItems.flatMap(item => item.extIds);
    const extList = [];
    allIds.forEach(id => {
      const ext = extinguishers.find(e => String(e.id) === String(id));
      if (ext) {
        routeWrite(db, fbUser, appId, 'extinguishers', ext.id, { ...ext, location: cartTargetLocation });
        extList.push(ext);
      }
    });
    setExtinguishers(prev => prev.map(e => allIds.includes(e.id) ? { ...e, location: cartTargetLocation } : e));
    const fromLocation = extList.length > 0 ? extList[0].location : '—';
    logAction('نقل', JSON.stringify({ ids: allIds, numbers: extList.map(e => e.number), fromLocation, toLocation: cartTargetLocation, count: allIds.length }));
    setReceiptData({
      receiptId: `TRF-${String(Date.now()).slice(-5)}`,
      date: formatDisplayDate(new Date()),
      count: allIds.length,
      numbers: extList.map(e => e.number).join('، '),
      from: fromLocation,
      to: cartTargetLocation,
      userName: user?.name || '—'
    });
    setCartItems([]);
    setCartTargetLocation('');
  };

  const closeReceipt = () => setReceiptData(null);
  const totalCartCount = cartItems.reduce((sum, item) => sum + item.count, 0);

  const workingCount = filteredExts.filter(e => e.status !== 'تحتاج صيانة').length;
  const nonWorkingCount = filteredExts.filter(e => e.status === 'تحتاج صيانة').length;
  const filteredTotal = filteredExts.length;

  const buildInventoryRows = (lData) => {
    const rows = [];
    Object.entries(lData.subLocs).forEach(([subLoc, sData]) => {
      const scope = subLoc.includes(' / ') ? subLoc.split(' / ').slice(1).join(' / ') : '(الموقع الأساسي)';
      sData.items.sort((a, b) => a.type.localeCompare(b.type, 'ar') || parseFloat(a.size) - parseFloat(b.size)).forEach(item => {
        const extList = item.ids.map(id => extMap[id]).filter(Boolean);
        const uniq = (arr) => [...new Set(arr.filter(v => v != null && v !== ''))];
        const numbers = extList.map(e => plainNumber(e.number)).join('، ');
        const notes = extList.map(e => e.notes).filter(Boolean);
        rows.push({
          scope, type: item.type, size: item.size, inCabinet: item.inCabinet, count: item.count, item,
          numbers: numbers || '—',
          notes: notes.length ? [...new Set(notes)].join('؛ ') : '—',
          statuses: uniq(extList.map(e => e.status)).join('، ') || '—',
          lastInspections: uniq(extList.map(e => formatDisplayDate(e.lastInspection || e.lastDate))).join('، ') || '—',
          maintenanceDates: uniq(extList.map(e => formatDisplayDate(e.lastDate))).join('، ') || '—',
          expiryDates: uniq(extList.map(e => formatDisplayDate(e.nextDate))).join('، ') || '—',
          cabinet: item.inCabinet ? 'كبينة' : '-',
        });
      });
    });
    return rows;
  };

  const updateExportOption = (key) => {
    const next = { ...exportOptions, [key]: !exportOptions[key] };
    setExportOptions(next);
    try { localStorage.setItem('ft_exportSettings', JSON.stringify(next)); } catch (e) {}
  };

  const buildColumns = () => {
    const cols = [
      { key: 'seq', label: 'ت', width: 4 },
      { key: 'location', label: 'الموقع', width: 26 },
      { key: 'type', label: 'النوع', width: 12 },
      { key: 'size', label: 'الحجم', width: 10 },
      { key: 'count', label: 'العدد', width: 8 },
    ];
    const optional = [
      { key: 'status', label: 'الحالة', width: 12, on: exportOptions.showStatus, val: r => r.statuses },
      { key: 'numbers', label: 'الأرقام', width: 20, on: exportOptions.showNumbers, val: r => r.numbers },
      { key: 'lastInspection', label: 'آخر فحص يومي', width: 14, on: exportOptions.showLastInspection, val: r => r.lastInspections },
      { key: 'maintenance', label: 'تاريخ الصيانة', width: 14, on: exportOptions.showMaintenanceDate, val: r => r.maintenanceDates },
      { key: 'expiry', label: 'تاريخ الانتهاء', width: 14, on: exportOptions.showExpiryDate, val: r => r.expiryDates },
      { key: 'cabinet', label: 'الكبينة', width: 10, on: exportOptions.showCabinet, val: r => r.cabinet },
      { key: 'notes', label: 'ملاحظات', width: 26, on: exportOptions.showNotes, val: r => r.notes },
    ];
    return cols.concat(optional.filter(c => c.on));
  };

  const doExport = () => {
    const cols = buildColumns();
    const headers = cols.map(c => c.label);
    const widths = cols.map(c => c.width);
    const countIdx = cols.findIndex(c => c.key === 'count');
    const rowToValues = (r) => cols.map(c => {
      switch (c.key) {
        case 'seq': return r.seq;
        case 'location': return r.scope;
        case 'type': return r.type;
        case 'size': return r.size;
        case 'count': return r.count;
        default: return c.val(r);
      }
    });
    const labelIdx = widths.indexOf(Math.max(...widths));
    const makeTotalRow = (total) => headers.map((_, i) => (i === labelIdx ? 'الإجمالي' : (i === countIdx ? total : '')));
    const sheets = Object.entries(report).sort(([a], [b]) => a.localeCompare(b, 'ar')).map(([mainLoc, lData]) => {
      const dataRows = buildInventoryRows(lData).map((r, i) => rowToValues({ ...r, seq: i + 1, scope: r.scope }));
      const totalRow = makeTotalRow(lData.total);
      return { name: mainLoc, title: `الجرد الشامل لطفايات الحريق - ${mainLoc}`, headers, widths, rows: dataRows, totalRow };
    });
    const nonWorkingRows = filteredExts.filter(e => e.status === 'تحتاج صيانة').map((e, i) => rowToValues({
      seq: i + 1, scope: e.location, type: e.type, size: e.size, count: 1,
      statuses: e.status, numbers: plainNumber(e.number), lastInspections: formatDisplayDate(e.lastInspection || e.lastDate),
      maintenanceDates: formatDisplayDate(e.lastDate), expiryDates: formatDisplayDate(e.nextDate), cabinet: e.inCabinet ? 'كبينة' : '-', notes: e.notes || '—',
    }));
    const subSheets = [];
    if (exportOptions.showSubLocationSheets) {
      const byLoc = {};
      filteredExts.forEach(e => { (byLoc[e.location] = byLoc[e.location] || []).push(e); });
      Object.entries(byLoc).sort(([a], [b]) => a.localeCompare(b, 'ar')).forEach(([loc, list]) => {
        const rows = list.map((e, i) => rowToValues({
          seq: i + 1, scope: e.location, type: e.type, size: e.size, count: 1,
          statuses: e.status, numbers: plainNumber(e.number), lastInspections: formatDisplayDate(e.lastInspection || e.lastDate),
          maintenanceDates: formatDisplayDate(e.lastDate), expiryDates: formatDisplayDate(e.nextDate), cabinet: e.inCabinet ? 'كبينة' : '-', notes: e.notes || '—',
        }));
        subSheets.push({
          name: loc,
          title: `تفاصيل الطفايات (حسب الموقع الفرعي) - ${loc}`,
          headers, widths, rows,
          totalRow: makeTotalRow(list.length),
        });
      });
    }
    const transferSheets = [];
    if (exportOptions.showTransferLogs) {
      const logRows = [];
      let logTotal = 0;
      (auditLogs || []).filter(l => l.action === 'نقل').slice().reverse().forEach((l, i) => {
        let details = {};
        try { details = JSON.parse(l.details); } catch (e) {}
        const toLoc = details.toLocation || '';
        const parts = toLoc.split(' / ');
        if (filterMainLocation !== 'All' && parts[0] !== filterMainLocation) return;
        if (filterSubLocation !== 'All' && !toLoc.includes(filterSubLocation)) return;
        logTotal += Number(details.count) || 0;
        const typeSize = (details.ids || []).map(id => {
          const ex = extinguishers.find(x => String(x.id) === String(id));
          return ex ? `${typeLabel(ex.type)} ${ex.size}` : '';
        }).filter(Boolean).join('، ');
        logRows.push([
          logRows.length + 1,
          formatDisplayDate(l.date),
          l.userName || '—',
          details.fromLocation || '—',
          toLoc || '—',
          Number(details.count) || 0,
          details.numbers || '—',
          typeSize || '—',
        ]);
      });
      transferSheets.push({
        name: 'سجلات الترحيل',
        title: `سجل عمليات الترحيل إلى ${filterMainLocation === 'All' ? 'جميع المواقع' : filterMainLocation} (${filterSubLocation !== 'All' ? filterSubLocation : 'جميع المواقع الفرعية'})`,
        headers: ['ت', 'التاريخ', 'المستخدم', 'من', 'إلى', 'العدد', 'أرقام الطفايات', 'تفاصيل الطفايات'],
        widths: [4, 14, 14, 26, 26, 8, 22, 22],
        rows: logRows,
        totalRow: makeTotalRow(logTotal),
      });
    }
    const blob = buildXlsxBlob({
      sheets: sheets.concat(subSheets).concat(transferSheets),
      summaryTitle: 'لوحة الملخص التنفيذي (Dashboard Summary)',
      summaryHeaders: ['البند', 'العدد'],
      summaryRows: [
        ['إجمالي الطفايات الصالحة', workingCount],
        ['إجمالي الطفايات غير الصالحة للعمل', nonWorkingCount],
        ['المجموع الكلي (حسب الفلتر)', filteredTotal],
      ],
      nonWorking: { title: 'الطفايات غير الصالحة للعمل (تحتاج صيانة)', headers, widths, rows: nonWorkingRows },
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `الجرد_الشامل_لطفايات_الحريق_${formatDisplayDate(new Date())}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowExportSettings(false);
  };

  const handleUndoTransfer = (log) => {
    let details;
    try { details = JSON.parse(log.details); } catch { return; }
    if (!details || !details.ids || !details.fromLocation) return;
    const targetLocation = details.fromLocation;
    const nowStr = formatDisplayDateTime(new Date());
    details.ids.forEach(id => {
      const ext = extinguishers.find(e => String(e.id) === String(id));
      if (ext) routeWrite(db, fbUser, appId, 'extinguishers', id, { ...ext, location: targetLocation });
    });
    if (db && fbUser) {
      updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'auditLogs', String(log.id)), { undone: true, undoDate: nowStr }).catch(err => console.error("update err:", err));
    } else {
      setAuditLogs(prev => prev.map(l => l.id === log.id ? { ...l, undone: true, undoDate: nowStr } : l));
      enqueueWrite('auditLogs', log.id, { ...log, undone: true, undoDate: nowStr });
    }
    setExtinguishers(prev => prev.map(e => details.ids.includes(e.id) ? { ...e, location: targetLocation } : e));
    logAction('تراجع عن نقل', JSON.stringify({ ids: details.ids, numbers: details.numbers, fromLocation: details.toLocation, toLocation: targetLocation, count: details.count, originalLogId: log.id }));
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="bg-blue-100 p-2 rounded-lg"><FileText className="w-5 h-5 text-blue-600" /></div>
          <h2 className="text-lg font-bold text-gray-800">التقارير والترحيل</h2>
          {cartItems.length > 0 && (
            <button onClick={() => document.getElementById('cartSection').scrollIntoView({ behavior: 'smooth' })} className="flex items-center gap-1.5 text-sm text-orange-600 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-lg transition-colors font-bold">
              <span className="bg-orange-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">{totalCartCount}</span>
              سلة النقل
            </button>
          )}
          <button onClick={() => setShowExportSettings(true)} className="flex items-center gap-1.5 text-sm text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg transition-colors font-bold shadow-sm">
            <FileSpreadsheet className="w-4 h-4" /> تصدير إكسل
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <LocationDropdown options={mainLocationNames} value={filterMainLocation} onChange={setFilterMainLocation} placeholder="الموقع الرئيسي" onAddLocation={() => { const name = prompt('اسم الموقع الرئيسي الجديد:'); if (name && name.trim()) onQuickAddLocation(null, name.trim()); }} addLabel="إضافة موقع رئيسي" />
          <LocationDropdown options={subLocationOptions} value={filterSubLocation} onChange={setFilterSubLocation} placeholder="الموقع الفرعي" onAddLocation={() => { const name = prompt('اسم الموقع الفرعي الجديد:'); if (name && name.trim() && filterMainLocation !== 'All') { const parentId = locationTree.find(n => n.name === filterMainLocation)?.id; if (parentId) onQuickAddLocation(parentId, name.trim()); } }} addLabel="إضافة موقع فرعي" />
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="text-xs bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-700 outline-none focus:ring-2 focus:ring-red-500 cursor-pointer">
            {typeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={filterSize} onChange={e => setFilterSize(e.target.value)} className="text-xs bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-700 outline-none focus:ring-2 focus:ring-red-500 cursor-pointer">
            {sizeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <div className="flex items-center text-sm text-gray-500 mr-auto"><span className="font-bold text-gray-800 ml-1">{filteredExts.length}</span> طفاية</div>
        </div>
      </div>

      {Object.keys(report).length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <div className="text-gray-300 text-5xl mb-3">📋</div>
          <p className="text-gray-400">لا توجد طفايات تطابق الفلتر المحدد.</p>
        </div>
      )}

      <div className="space-y-6">
        {Object.entries(report).map(([mainLoc, lData]) => {
          const rows = buildInventoryRows(lData);
          return (
          <div key={mainLoc} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <button type="button" onClick={() => toggleMainLoc(mainLoc)} className="w-full bg-gradient-to-l from-gray-700 to-gray-600 px-4 md:px-5 py-3 flex justify-between items-center hover:from-gray-800 hover:to-gray-700 transition-colors cursor-pointer">
              <span className="text-white font-bold text-sm md:text-base flex items-center gap-2">
                <MapPin className="w-4 h-4 shrink-0" /> الجرد الشامل لطفايات الحريق — {mainLoc}
              </span>
              <span className="flex items-center gap-2">
                <span className="bg-white/25 text-white text-sm font-bold px-3 py-0.5 rounded-full whitespace-nowrap">{lData.total}</span>
                <ChevronDown className={`w-5 h-5 text-white/70 transition-transform duration-200 ${expandedMainLocs.has(mainLoc) ? 'rotate-180' : ''}`} />
              </span>
            </button>
            {expandedMainLocs.has(mainLoc) && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs md:text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-600">
                    <th className="p-2.5 text-center w-10">ت</th>
                    <th className="p-2.5 text-right">الموقع</th>
                    <th className="p-2.5 text-right">النوع</th>
                    <th className="p-2.5 text-right">الحجم</th>
                    <th className="p-2.5 text-center">العدد</th>
                    <th className="p-2.5 text-center">الاختيار</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((r, i) => {
                    const cartCount = getCartCount(`${r.scope}|${r.item.type}|${r.item.size}|${r.item.inCabinet}`);
                    return (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        <td className="p-2.5 text-center text-gray-500">{i + 1}</td>
                        <td className="p-2.5 text-gray-800 font-medium">{r.scope}</td>
                        <td className="p-2.5"><span className="bg-gray-200 px-2 py-0.5 rounded text-gray-700 text-[11px] whitespace-nowrap">{r.type}</span></td>
                        <td className="p-2.5 text-gray-600 whitespace-nowrap">{r.size}</td>
                        <td className="p-2.5 text-center text-gray-800 font-bold">{r.count}</td>
                        <td className="p-2.5 text-center">
                          <div className="inline-flex items-center gap-1 bg-gray-50 rounded-lg border border-gray-200">
                            <button onClick={() => handleCartDecrement(`${r.scope}|${r.item.type}|${r.item.size}|${r.item.inCabinet}`)} disabled={cartCount === 0} className="w-7 h-7 flex items-center justify-center text-sm font-bold text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed">−</button>
                            <span className="w-8 text-center text-sm font-bold text-gray-800">{cartCount}</span>
                            <button onClick={() => handleCartIncrement(r.scope, r.item.type, r.item.size, r.item.inCabinet, r.item.count, r.item.ids, r.item.ids.map(id => extMap[id]?.number || ''))} disabled={cartCount >= r.item.count} className="w-7 h-7 flex items-center justify-center text-sm font-bold text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed">+</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 border-t-2 border-gray-300 font-bold">
                    <td colSpan="4" className="p-2.5 text-gray-800">الإجمالي</td>
                    <td className="p-2.5 text-center text-gray-900">{lData.total}</td>
                    <td className="p-2.5"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
            )}
          </div>
          );
        })}
      </div>

      <div className="text-center text-xs text-gray-400 border-t border-gray-200 pt-4">
        <p>آخر تحديث — {formatDisplayDateTime(new Date())}</p>
      </div>

      {/* Transfer Cart */}
      {cartItems.length > 0 && (
        <div id="cartSection" className="bg-white rounded-xl shadow-sm border-2 border-orange-200 p-4 md:p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-orange-100 p-2 rounded-lg"><ArrowRightLeft className="w-5 h-5 text-orange-600" /></div>
            <h2 className="text-lg font-bold text-gray-800">سلة النقل</h2>
            <span className="text-sm text-orange-600 font-bold mr-auto">{totalCartCount} طفاية</span>
            <button onClick={() => setCartItems([])} className="text-red-400 hover:text-red-600 text-sm font-bold transition-colors">تفريغ الكل</button>
          </div>
          <div className="space-y-2 mb-4">
            {cartItems.map((item, i) => (
              <div key={item.key} className="flex items-center justify-between bg-orange-50 rounded-lg p-3 border border-orange-100">
                <div className="flex items-center gap-2 min-w-0">
                  <MapPin className="w-4 h-4 text-orange-500 shrink-0" />
                  <span className="text-sm text-gray-700 truncate">{item.subLocation.includes(' / ') ? item.subLocation.split(' / ').slice(1).join(' / ') : item.subLocation}</span>
                  <span className="text-xs text-gray-500">({item.type} {item.size})</span>
                  <span className="text-xs font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full shrink-0">{item.count} / {item.total}</span>
                </div>
                <button onClick={() => removeCartItem(item.key)} className="text-red-400 hover:text-red-600 transition-colors p-1 shrink-0"><X className="w-4 h-4" /></button>
          </div>
        ))}
          </div>
          <div className="border-t border-orange-100 pt-4">
            <button onClick={() => setShowTransferModal(true)} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm">
              <ArrowRightLeft className="w-4 h-4" /> نقل {totalCartCount} طفاية
            </button>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-l from-orange-700 to-orange-600 text-white p-4 flex justify-between items-center">
              <h3 className="font-bold text-lg flex items-center gap-2"><ArrowRightLeft className="w-5 h-5" /> نقل الطفايات</h3>
              <button onClick={() => setShowTransferModal(false)} className="text-white/70 hover:text-white text-xl leading-none">&times;</button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-600">اختر الموقع الجديد لنقل <span className="font-bold">{totalCartCount}</span> طفاية:</p>
              <div className="max-h-[40vh] overflow-y-auto">
                <HierarchicalLocationPicker tree={locationTree} value={cartTargetLocation} onChange={(v) => { setCartTargetLocation(v); }} placeholder="اختر الموقع..." onAddLocation={() => { const name = prompt('اسم الموقع الجديد:'); if (name && name.trim()) onQuickAddLocation(null, name.trim()); }} />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => { setShowTransferModal(false); handleCartTransfer(); }} disabled={!cartTargetLocation} className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-2.5 rounded-lg transition-colors text-sm">تأكيد النقل</button>
                <button onClick={() => setShowTransferModal(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2.5 px-6 rounded-lg transition-colors">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Log */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="bg-amber-100 p-2 rounded-lg"><History className="w-5 h-5 text-amber-600" /></div>
          <h2 className="text-lg font-bold text-gray-800">سجل الترحيلات</h2>
          <span className="text-sm text-gray-400 mr-auto">{transferLogs.length} عملية</span>
        </div>
        {transferLogs.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">لا توجد عمليات ترحيل مسجلة.</p>
        ) : (
          <div className="space-y-2">
            {transferLogs.map(log => {
              let parsed;
              try { parsed = JSON.parse(log.details); } catch { parsed = null; }
              const isUndone = log.undone;
              return (
              <div key={log.id} className={`rounded-xl p-3 md:p-4 border transition-colors ${isUndone ? 'bg-gray-50 border-gray-200' : 'bg-amber-50/50 border-amber-100/70 hover:bg-amber-50'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-sm font-bold leading-tight ${isUndone ? 'text-gray-500 line-through' : 'text-gray-800'}`}>{parsed ? `نقل ${parsed.count} طفاية` : 'نقل'}</p>
                        {isUndone && <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">تم التراجع عن النقل</span>}
                      </div>
                      {parsed ? (
                        <div className={`text-xs mt-1.5 space-y-0.5 ${isUndone ? 'text-gray-400' : 'text-gray-500'}`}>
                          <p><span className="text-gray-400">من:</span> <span className={isUndone ? 'text-gray-500' : ''}>{isUndone ? parsed.toLocation : parsed.fromLocation}</span></p>
                          <p><span className="text-gray-400">إلى:</span> <span className={isUndone ? 'text-gray-500' : ''}>{isUndone ? parsed.fromLocation : parsed.toLocation}</span></p>
                          <p className="font-mono text-gray-400" dir="ltr">{parsed.numbers?.join('، ')}</p>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 mt-1.5 line-clamp-2" title={log.details}>{log.details || '—'}</p>
                      )}
                    </div>
                    <div className="shrink-0 text-left">
                      <div className="text-xs text-gray-400 bg-white px-2 py-1 rounded">{formatLogDate(log.date)}</div>
                      {isUndone && log.undoDate && <div className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded mt-1">تراجع: {formatLogDate(log.undoDate)}</div>}
                    </div>
                  </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-amber-100/70">
                  <span className="text-xs text-gray-400">بواسطة: <span className="font-medium text-gray-600">{log.userName}</span></span>
                  <div className="flex items-center gap-2">
                    {parsed && !isUndone && <button onClick={() => handleUndoTransfer(log)} className="text-xs font-bold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg transition-colors">تراجع</button>}
                    <span className="text-[10px] text-gray-300 font-mono">{log.id}</span>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Receipt Modal */}
      {receiptData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-l from-emerald-700 to-emerald-600 text-white p-4 flex justify-between items-center">
              <h3 className="font-bold text-lg flex items-center gap-2"><ClipboardList className="w-5 h-5" /> وصل الترحيل</h3>
              <button onClick={closeReceipt} className="text-white/70 hover:text-white text-xl leading-none">&times;</button>
            </div>
            <div className="p-6">
              <div className="border-2 border-emerald-200 rounded-xl p-5 bg-emerald-50/30">
                <div className="text-center border-b border-emerald-100 pb-4 mb-4">
                  <h4 className="text-xl font-bold text-gray-800">وصل ترحيل طفايات</h4>
                  <p className="text-sm text-gray-500 mt-1">رقم الوصل: <span className="font-bold text-emerald-700 font-mono">{receiptData.receiptId}</span></p>
                  <p className="text-xs text-gray-400 mt-1">التاريخ: {receiptData.date}</p>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">عدد الطفايات:</span><span className="font-bold text-gray-800">{receiptData.count}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">من:</span><span className="font-bold text-gray-800 text-left max-w-[60%] truncate">{receiptData.from}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">إلى:</span><span className="font-bold text-gray-800 text-left max-w-[60%] truncate">{receiptData.to}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">بواسطة:</span><span className="font-bold text-gray-800">{receiptData.userName}</span></div>
                  <div className="border-t border-emerald-100 pt-3 mt-3">
                    <p className="text-xs text-gray-500 mb-1">أرقام الطفايات المنقولة:</p>
                    <p className="text-xs font-bold text-gray-700 font-mono">{receiptData.numbers}</p>
                  </div>
                </div>
                <div className="text-center border-t border-emerald-100 pt-4 mt-4">
                  <div className="w-40 h-0.5 bg-gray-300 mx-auto mb-1" />
                  <p className="text-xs text-gray-400">التوقيع</p>
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <button onClick={() => { window.print(); }} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"><Printer className="w-4 h-4" /> طباعة الوصل</button>
                <button onClick={closeReceipt} className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2.5 px-6 rounded-lg transition-colors">إغلاق</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Modal */}
      {showPrintModal && (
        <div id="printModalOverlay" className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 overflow-y-auto">
          <style>{`@media print { body * { visibility: hidden; } #printModalOverlay, #printModalOverlay * { visibility: visible; } #printModalOverlay { position: fixed; inset: 0; background: white; padding: 20px; overflow: visible; } .no-print { display: none !important; } #printContent { max-width: 210mm; margin: 0 auto; } }`}</style>
          <div id="printContent" className="bg-white w-full max-w-[210mm] min-h-[297mm] p-6 md:p-8 shadow-2xl mx-auto rounded-2xl md:rounded-none" style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <button onClick={() => { window.print(); }} className="no-print mb-4 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-lg transition-colors flex items-center gap-2 mr-auto text-sm"><Printer className="w-4 h-4" /> طباعة</button>
            <button onClick={() => setShowExportSettings(true)} className="no-print mb-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-lg transition-colors flex items-center gap-2 mr-2 text-sm"><FileSpreadsheet className="w-4 h-4" /> تصدير إكسل</button>
            <button onClick={() => setShowPrintModal(false)} className="no-print mr-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold px-4 py-2.5 rounded-lg transition-colors text-sm">إغلاق</button>
            <div className="text-center mb-6 border-b-2 border-gray-200 pb-4">
              <h1 className="text-xl font-bold text-gray-800">الجرد الشامل لطفايات الحريق</h1>
              <p className="text-sm text-gray-500 mt-1">آخر تحديث: {formatDisplayDateTime(new Date())}</p>
              <p className="text-xs text-gray-400 mt-1">الفلتر: {filterMainLocation === 'All' ? 'جميع المواقع' : filterMainLocation}{filterSubLocation !== 'All' ? ` / ${filterSubLocation}` : ''}{filterType !== 'All' ? ` — ${typeLabel(filterType)}` : ''}{filterSize !== 'All' ? ` / ${filterSize}` : ''}</p>
            </div>
            {Object.keys(report).length === 0 ? (
              <p className="text-gray-400 text-center py-8">لا توجد بيانات تطابق الفلتر</p>
            ) : (
              <div className="space-y-6">
                {Object.entries(report).map(([mainLoc, lData]) => {
                  const rows = buildInventoryRows(lData);
                  return (
                  <div key={mainLoc} className="border rounded-lg overflow-hidden">
                    <div className="bg-gradient-to-l from-gray-700 to-gray-600 px-4 py-2 flex justify-between items-center">
                      <h3 className="text-white font-bold text-sm flex items-center gap-2"><MapPin className="w-4 h-4" /> الجرد الشامل لطفايات الحريق — {mainLoc}</h3>
                      <span className="bg-white/25 text-white text-sm font-bold px-3 py-0.5 rounded-full">{lData.total}</span>
                    </div>
                    <table className="w-full text-xs">
                      <thead><tr className="bg-gray-50 border-b text-gray-500"><th className="p-1.5 text-center w-8">ت</th><th className="p-1.5 text-right">الموقع</th><th className="p-1.5 text-right">النوع</th><th className="p-1.5 text-right">الحجم</th><th className="p-1.5 text-center">العدد</th><th className="p-1.5 text-right">الأرقام</th><th className="p-1.5 text-right">ملاحظات</th></tr></thead>
                      <tbody>
                        {rows.map((r, i) => (
                          <tr key={i} className="border-b">
                            <td className="p-1.5 text-center text-gray-500">{i + 1}</td>
                            <td className="p-1.5 text-gray-800 font-medium break-words">{r.scope}</td>
                            <td className="p-1.5"><span className="bg-gray-200 px-1.5 py-0.5 rounded text-gray-700 text-[10px]">{r.type}</span></td>
                            <td className="p-1.5 text-gray-600">{r.size}</td>
                            <td className="p-1.5 text-center font-bold text-gray-800">{r.count}</td>
                            <td className="p-1.5 text-gray-500 text-[10px] font-mono break-all" dir="ltr">{r.numbers}</td>
                            <td className="p-1.5 text-gray-500 break-words">{r.notes}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot><tr className="bg-gray-100 border-t-2 border-gray-300 font-bold"><td colSpan="4" className="p-1.5 text-gray-800">الإجمالي</td><td className="p-1.5 text-center text-gray-900">{lData.total}</td><td colSpan="2" className="p-1.5"></td></tr></tfoot>
                    </table>
                  </div>
                  );
                })}

                {/* لوحة الملخص التنفيذي */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gradient-to-l from-gray-800 to-gray-700 px-4 py-2">
                    <h3 className="text-white font-bold text-sm">لوحة الملخص التنفيذي (Dashboard Summary)</h3>
                  </div>
                  <table className="w-full text-xs">
                    <thead><tr className="bg-gray-50 border-b text-gray-500"><th className="p-1.5 text-right">البند</th><th className="p-1.5 text-center">العدد</th></tr></thead>
                    <tbody>
                      <tr className="border-b"><td className="p-1.5 text-gray-700">إجمالي الطفايات الصالحة</td><td className="p-1.5 text-center font-bold text-gray-800">{workingCount}</td></tr>
                      <tr className="border-b"><td className="p-1.5 text-gray-700">إجمالي الطفايات غير الصالحة للعمل</td><td className="p-1.5 text-center font-bold text-gray-800">{nonWorkingCount}</td></tr>
                      <tr><td className="p-1.5 font-bold text-gray-900">المجموع الكلي (حسب الفلتر)</td><td className="p-1.5 text-center font-bold text-gray-900">{filteredTotal}</td></tr>
                    </tbody>
                  </table>
                </div>
            </div>
            )}
            <div className="text-center border-t-2 border-gray-200 mt-6 pt-4 text-xs text-gray-400">
              <p>الإجمالي: {filteredExts.length} طفاية</p>
              <p className="mt-1">{formatDisplayDate(new Date())}</p>
              <div className="w-40 h-0.5 bg-gray-300 mx-auto mt-3 mb-1" />
              <p>التوقيع</p>
            </div>
          </div>
        </div>
      )}

      {/* Export Settings Modal */}
      {showExportSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-l from-emerald-700 to-emerald-600 text-white p-4 flex justify-between items-center">
              <h3 className="font-bold text-lg flex items-center gap-2"><FileSpreadsheet className="w-5 h-5" /> إعدادات تصدير التقرير</h3>
              <button onClick={() => setShowExportSettings(false)} className="text-white/70 hover:text-white text-xl leading-none">&times;</button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-500">اختر الأعمدة التي تريد تضمينها في ملف الإكسل:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { key: 'showStatus', label: 'عرض حالة الطفاية' },
                  { key: 'showLastInspection', label: 'عرض آخر فحص يومي' },
                  { key: 'showMaintenanceDate', label: 'عرض تاريخ الصيانة' },
                  { key: 'showExpiryDate', label: 'عرض تاريخ الانتهاء' },
                  { key: 'showNumbers', label: 'عرض أرقام الطفايات' },
                  { key: 'showNotes', label: 'عرض الملاحظات' },
                  { key: 'showCabinet', label: 'عرض الكبينة' },
                  { key: 'showTransferLogs', label: 'عرض سجلات الترحيل (صفحة جديدة)' },
                  { key: 'showSubLocationSheets', label: 'عرض صفحة لكل موقع فرعي' },
                ].map(opt => (
                  <label key={opt.key} className="flex items-center gap-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg px-3 py-2.5 cursor-pointer transition-colors">
                    <input type="checkbox" checked={exportOptions[opt.key]} onChange={() => updateExportOption(opt.key)} className="w-4 h-4 text-emerald-600 rounded cursor-pointer" />
                    <span className="text-sm font-medium text-gray-700 select-none">{opt.label}</span>
                  </label>
                ))}
              </div>
              <div className="text-[11px] text-gray-400 bg-gray-50 border border-dashed border-gray-200 rounded-lg p-2.5">
                الأعمدة الأساسية (ت | الموقع | النوع | الحجم | العدد) تظهر دائماً في التقرير.
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={doExport} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"><Download className="w-4 h-4" /> تصدير الآن</button>
                <button onClick={() => setShowExportSettings(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2.5 px-6 rounded-lg transition-colors">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, count, icon: Icon, color }) {
  return (
    <div className="bg-white rounded-xl shadow p-3 md:p-6 border border-gray-100 flex items-center"><div className={`${color} p-2 md:p-4 rounded-lg text-white ml-2 md:ml-4 shadow-sm`}><Icon className="w-5 h-5 md:w-6 md:h-6" /></div><div><h4 className="text-gray-500 text-[10px] md:text-sm font-medium">{title}</h4><p className="text-lg md:text-2xl font-bold text-gray-800">{count}</p></div></div>
  );
} 

function LocationDropdown({ options, value, onChange, placeholder, onAddLocation, addLabel }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  return (
    <div className="relative flex-1 sm:w-44" ref={ref}>
      <button type="button" onClick={() => setOpen(!open)} className="w-full pl-2 pr-8 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-xs sm:text-sm text-gray-600 bg-gray-50 flex items-center justify-between gap-1 truncate">
        <span className="truncate">{value === 'All' ? placeholder : value}</span>
        <MapPin className="w-4 h-4 shrink-0 text-gray-400" />
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
          <button type="button" onClick={() => { onChange('All'); setOpen(false); }} className={`w-full text-right px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${value === 'All' ? 'bg-red-50 text-red-700 font-bold' : 'text-gray-700'}`}>الكل ({placeholder})</button>
          {options.length > 0 && <div className="border-t border-gray-100 mx-2" />}
          {options.map(opt => (
            <button key={opt} type="button" onClick={() => { onChange(opt); setOpen(false); }} className={`w-full text-right px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${value === opt ? 'bg-red-50 text-red-700 font-bold' : 'text-gray-700'}`}>{opt}</button>
          ))}
          <div className="border-t border-gray-100 mx-2 my-1" />
          <button type="button" onClick={() => { setOpen(false); onAddLocation(); }} className="w-full text-right px-4 py-2.5 text-sm text-blue-600 hover:bg-blue-50 font-bold transition-colors flex items-center gap-2"><Plus className="w-4 h-4" /> {addLabel}</button>
        </div>
      )}
    </div>
  );
}

function getSizeOptions(type) {
  if (type === 'Water' || type === 'Foam') {
    return ['6L', '9L', '12L'];
  }
  return ['1Kg', '2Kg', '3Kg', '4Kg', '6Kg', '8Kg', '12Kg'];
}

function SizeDropdown({ value, onChange, type }) {
  const [open, setOpen] = useState(false);
  const [customSizes, setCustomSizes] = useState([]);
  const ref = useRef();
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  const baseOptions = getSizeOptions(type);
  const allOptions = [...baseOptions, ...customSizes].sort((a, b) => parseFloat(a) - parseFloat(b));
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(!open)} className="w-full border p-2 rounded bg-gray-50 outline-none text-right flex items-center justify-between gap-1">
        <span className="truncate">{value || 'اختر الحجم'}</span>
        <span className="text-xs text-gray-400">▼</span>
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
          {allOptions.map(opt => (
            <button key={opt} type="button" onClick={() => { onChange(opt); setOpen(false); }} className={`w-full text-right px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${value === opt ? 'bg-red-50 text-red-700 font-bold' : 'text-gray-700'}`}>{opt}</button>
          ))}
          <div className="border-t border-gray-100 mx-2 my-1" />
          <button type="button" onClick={() => { setOpen(false); const name = prompt('أدخل الحجم الجديد:'); if (name) { setCustomSizes(prev => [...prev, name]); onChange(name); } }} className="w-full text-right px-4 py-2.5 text-sm text-blue-600 hover:bg-blue-50 font-bold transition-colors flex items-center gap-2"><Plus className="w-4 h-4" /> إضافة حجم جديد</button>
        </div>
      )}
    </div>
  );
}

function EditContactsModal({ contacts, onClose, onSave }) {
  const [localContacts, setLocalContacts] = useState(
    (contacts && contacts.length > 0 ? contacts : [{ id: Date.now(), name: '', phone: '' }]).map(c => ({ ...c }))
  );

  const updateContact = (id, key, value) => {
    setLocalContacts(prev => prev.map(c => (c.id === id ? { ...c, [key]: value } : c)));
  };

  const addContact = () => {
    setLocalContacts(prev => [...prev, { id: Date.now() + Math.floor(Math.random() * 1000), name: '', phone: '' }]);
  };

  const removeContact = (id) => {
    setLocalContacts(prev => {
      const next = prev.filter(c => c.id !== id);
      return next.length > 0 ? next : [{ id: Date.now(), name: '', phone: '' }];
    });
  };

  const handleSave = () => {
    const normalized = localContacts
      .map(c => ({ id: c.id, name: String(c.name || '').trim(), phone: String(c.phone || '').trim() }))
      .filter(c => c.name && c.phone);

    if (normalized.length === 0) {
      alert('يرجى إدخال جهة اتصال واحدة على الأقل (اسم + رقم).');
      return;
    }

    onSave(normalized);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden my-auto">
        <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
          <h3 className="text-lg font-bold flex items-center"><Phone className="w-5 h-5 ml-2" /> تعديل أرقام الطوارئ</h3>
          <button onClick={onClose} className="text-blue-100 hover:text-white text-xl leading-none">&times;</button>
        </div>

        <div className="p-4 md:p-6 space-y-3 max-h-[70vh] overflow-y-auto">
          {localContacts.map((c) => (
            <div key={c.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 bg-gray-50 border border-gray-200 rounded-lg p-3">
              <input
                type="text"
                placeholder="اسم الجهة"
                value={c.name}
                onChange={(e) => updateContact(c.id, 'name', e.target.value)}
                className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <input
                type="text"
                placeholder="رقم الهاتف"
                value={c.phone}
                onChange={(e) => updateContact(c.id, 'phone', e.target.value)}
                dir="ltr"
                className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <button
                onClick={() => removeContact(c.id)}
                className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3 py-2 rounded-lg text-sm font-bold flex items-center justify-center"
              >
                <Trash2 className="w-4 h-4 ml-1" /> حذف
              </button>
            </div>
          ))}

          <button onClick={addContact} className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 py-2.5 rounded-lg font-bold">
            + إضافة جهة اتصال
          </button>
        </div>

        <div className="p-4 border-t border-gray-200 flex gap-2">
          <button onClick={handleSave} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-bold">حفظ التعديلات</button>
          <button onClick={onClose} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 py-2.5 rounded-lg font-bold">إلغاء</button>
        </div>
      </div>
    </div>
  );
}

function ExtinguishersList({ extinguishers, setExtinguishers, user, logAction, db, fbUser, appId, locationTree, locationPaths, inspectionPolicies, onQuickAddLocation }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterMainLocation, setFilterMainLocation] = useState('All');
  const [filterSubLocation, setFilterSubLocation] = useState('All');
  const [quickStatusFilter, setQuickStatusFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [actionModalData, setActionModalData] = useState(null); 
  const [transferModalData, setTransferModalData] = useState(null);
  const [historyModalData, setHistoryModalData] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [editModalData, setEditModalData] = useState(null);
  const [showCustomSelectModal, setShowCustomSelectModal] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const canEdit = user.role === 'developer' || user.role === 'admin' || user.role === 'father';

  const activeExtinguishers = useMemo(() => extinguishers.filter(e => !e.archived), [extinguishers]);
  const extWithStatus = useMemo(() => activeExtinguishers.map(e => ({ ...e, status: resolveExtinguisherStatus(e, inspectionPolicies) })), [activeExtinguishers, inspectionPolicies]);

  // Get top-level location names from the tree
  const mainLocationNames = useMemo(() => locationTree.map(n => n.name).sort((a, b) => a.localeCompare(b, 'ar')), [locationTree]);

  // Get sub-location names (children of the selected main location)
  const subLocationOptions = useMemo(() => {
    if (filterMainLocation === 'All') return [];
    const mainNode = locationTree.find(n => n.name === filterMainLocation);
    if (!mainNode || !mainNode.children) return [];
    return mainNode.children.map(c => c.name).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [locationTree, filterMainLocation]);

  // Reset sub-location when main location changes
  useEffect(() => {
    setFilterSubLocation('All');
  }, [filterMainLocation]);

  // Filter by location only (for per-location section counts)
  const locationFilteredExts = useMemo(() => {
    return extWithStatus.filter(e => {
      const matchesMainLoc = filterMainLocation === 'All' || e.location.startsWith(filterMainLocation + ' / ') || e.location === filterMainLocation;
      const matchesSubLoc = filterSubLocation === 'All' || e.location.includes(' / ' + filterSubLocation) || e.location === (filterMainLocation + ' / ' + filterSubLocation);
      return matchesMainLoc && matchesSubLoc;
    });
  }, [extWithStatus, filterMainLocation, filterSubLocation]);

  // Filter by location + type + search (excludes status — used for section counts)
  const sectionFilteredExts = locationFilteredExts
    .filter(e => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm ||
        e.number.toLowerCase().includes(searchLower) ||
        e.location.includes(searchTerm);
      const matchesType = filterType === 'All' || e.type === filterType;
      return matchesSearch && matchesType;
    });

  const filtered = (quickStatusFilter === 'All' ? sectionFilteredExts : sectionFilteredExts.filter(e => e.status === quickStatusFilter))
    .sort((a, b) => {
      const aHasNotes = Boolean(a.notes && String(a.notes).trim());
      const bHasNotes = Boolean(b.notes && String(b.notes).trim());
      if (aHasNotes !== bHasNotes) return aHasNotes ? -1 : 1;
      return String(a.number).localeCompare(String(b.number), undefined, { numeric: true, sensitivity: 'base' });
    });

  const handleAddExtinguisher = (newExtOrList) => {
    const arr = Array.isArray(newExtOrList) ? newExtOrList : [newExtOrList];
    const baseId = activeExtinguishers.length ? Math.max(...activeExtinguishers.map(e=>Number(e.id))) + 1 : 1;
    const created = arr.map((newExt, i) => {
      const newId = baseId + i;
      const extWithDates = { ...newExt, id: newId, nextDate: calculateNextDate(newExt.lastDate), lastInspection: newExt.lastDate, status: calculateStatus(calculateNextDate(newExt.lastDate), newExt.lastDate), archived: false };
      return extWithDates;
    });
    setExtinguishers(prev => [...prev, ...created]);
    created.forEach(ext => routeWrite(db, fbUser, appId, 'extinguishers', ext.id, ext));
    setShowAddModal(false);
    const first = created[0], last = created[created.length - 1];
    logAction('إضافة طفاية', created.length === 1
      ? `إضافة طفاية ${first.number} في ${first.location}`
      : `إضافة ${created.length} طفايات (${first.number} → ${last.number}) في ${first.location}`);
  };

  const handleActionSubmit = (extIds, actionType, condition, remarks, date) => {
    const extsToUpdate = activeExtinguishers.filter(e => extIds.includes(e.id));
    const isMaintenance = actionType === 'maintenance';
    
    let newExts = extinguishers.map(ext => {
      if (extIds.includes(ext.id)) {
        let updatedExt = { ...ext, notes: remarks.trim() };
        const signature = {
          id: Date.now() + Number(ext.id),
          actionType,
          date,
          condition,
          remarks: remarks.trim(),
          byUserId: user.id,
          byUserName: user.name,
          at: new Date().toISOString()
        };
        if (isMaintenance) {
          const nextD = condition === 'سليمة' ? calculateNextDate(date) : ext.nextDate;
          updatedExt = { ...updatedExt, lastDate: date, nextDate: nextD, lastInspection: date, lastInspectionBy: user.name, status: condition === 'سليمة' ? calculateStatus(nextD, date) : 'تحتاج صيانة', inspectionSignatures: [...(ext.inspectionSignatures || []), signature] };
        } else {
          updatedExt = { ...updatedExt, lastInspection: date, lastInspectionBy: user.name, status: condition === 'سليمة' ? calculateStatus(ext.nextDate, date) : 'تحتاج صيانة', inspectionSignatures: [...(ext.inspectionSignatures || []), signature] };
        }
        return updatedExt;
      }
      return ext;
    });
    
    // Optimistic local update so status changes appear immediately in UI.
    setExtinguishers(newExts);

    if (db && fbUser) {
      const batch = writeBatch(db);
      newExts.filter(e => extIds.includes(e.id)).forEach(updatedExt => {
        batch.set(doc(db, 'artifacts', appId, 'public', 'data', 'extinguishers', String(updatedExt.id)), updatedExt);
      });
      batch.commit().catch(err => console.error("write err:", err));
    } else {
      newExts.filter(e => extIds.includes(e.id)).forEach(updatedExt => enqueueWrite('extinguishers', updatedExt.id, updatedExt));
    }

    const actionName = isMaintenance ? 'صيانة شاملة' : 'فحص يومي';
    const numbers = extsToUpdate.map(e=>e.number).join('، ');
    logAction(actionName, `تم تنفيذ ${actionName} لـ (${extsToUpdate.length}) طفايات: ${numbers} بنتيجة: ${condition}`);
    setActionModalData(null);
    setSelectedIds([]);
  };

  const handleEdit = (updatedExt) => {
    const extWithDates = { ...updatedExt, nextDate: calculateNextDate(updatedExt.lastDate), status: calculateStatus(calculateNextDate(updatedExt.lastDate), updatedExt.lastInspection) };
    setExtinguishers(prev => prev.map(e => e.id === updatedExt.id ? extWithDates : e));
    routeWrite(db, fbUser, appId, 'extinguishers', updatedExt.id, extWithDates);
    logAction('تعديل طفاية', `تعديل بيانات الطفاية ${updatedExt.number}`);
    setEditModalData(null);
  };

  const handleTransfer = (extIds, newLocation) => {
    const extsToTransfer = activeExtinguishers.filter(e => extIds.includes(e.id));
    const fromLocation = extsToTransfer.length > 0 ? extsToTransfer[0].location : '—';
    if (db && fbUser) {
      const batch = writeBatch(db);
      extsToTransfer.forEach(ext => batch.set(doc(db, 'artifacts', appId, 'public', 'data', 'extinguishers', String(ext.id)), { ...ext, location: newLocation }));
      batch.commit().catch(err => console.error("write err:", err));
    } else {
      extsToTransfer.forEach(ext => enqueueWrite('extinguishers', ext.id, { ...ext, location: newLocation }));
      setExtinguishers(prev => prev.map(e => extIds.includes(e.id) ? { ...e, location: newLocation } : e));
    }
    logAction('نقل', JSON.stringify({ ids: extIds, numbers: extsToTransfer.map(e=>e.number), fromLocation, toLocation: newLocation, count: extIds.length }));
    setTransferModalData(null); setSelectedIds([]); 
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    const extsToDelete = activeExtinguishers.filter(e => selectedIds.includes(e.id));
    if (db && fbUser) {
      const batch = writeBatch(db);
      extsToDelete.forEach(ext => batch.set(doc(db, 'artifacts', appId, 'public', 'data', 'extinguishers', String(ext.id)), { ...ext, archived: true }));
      batch.commit().catch(err => console.error("write err:", err));
    } else {
      extsToDelete.forEach(ext => enqueueWrite('extinguishers', ext.id, { ...ext, archived: true }));
      setExtinguishers(prev => prev.map(e => selectedIds.includes(e.id) ? { ...e, archived: true } : e));
    }
    logAction('أرشفة طفايات', `تمت أرشفة (${selectedIds.length}) طفاية: ${extsToDelete.map(e=>e.number).join('، ')}`);
    setSelectedIds([]);
    setConfirmDialog(null);
  };

  const applyCustomSelection = (text) => {
    const numbers = text.match(/\d+/g) || [];
    const targetNumbers = numbers.map(n => `EXT-${String(n).padStart(3, '0')}`);
    const matchedIds = filtered.filter(ext => targetNumbers.includes(ext.number)).map(e => e.id);
    setSelectedIds(matchedIds);
    setShowCustomSelectModal(false);
  };

  const getStatusColor = (status) => {
    if (status === 'صالحة') return 'bg-green-100 text-green-700 border border-green-200';
    if (status === 'تحتاج فحص') return 'bg-orange-200 text-orange-900 border border-orange-400 ring-1 ring-orange-300';
    if (status === 'صيانة قريبة') return 'bg-yellow-100 text-yellow-700 border border-yellow-200';
    return 'bg-red-100 text-red-700 border border-red-200 shadow-sm';
  };

  const statusCounts = useMemo(() => ({
    all: sectionFilteredExts.length,
    dueInspection: sectionFilteredExts.filter(e => e.status === 'تحتاج فحص').length,
    nearMaintenance: sectionFilteredExts.filter(e => e.status === 'صيانة قريبة').length,
    needMaintenance: sectionFilteredExts.filter(e => e.status === 'تحتاج صيانة').length,
  }), [sectionFilteredExts]);

  const transferrableCount = filtered.filter(e => selectedIds.includes(e.id) && !e.inCabinet).length;

  // الموقع الذي سيُملأ تلقائياً في نافذة الإضافة حسب الفلتر المحدد
  const prefillLocation = useMemo(() => {
    if (filterMainLocation === 'All') return '';
    return filterSubLocation !== 'All' ? `${filterMainLocation} / ${filterSubLocation}` : filterMainLocation;
  }, [filterMainLocation, filterSubLocation]);

  // اقتراح الرقم التالي المتاح تلقائياً
  const suggestedNumber = useMemo(() => {
    const nums = activeExtinguishers.map(e => Number(String(e.number || '').replace(/\D/g, '')) || 0);
    return nums.length ? Math.max(...nums) + 1 : 1;
  }, [activeExtinguishers]);

  const clearFilters = () => {
    setFilterType('All');
    setFilterMainLocation('All');
    setFilterSubLocation('All');
    setQuickStatusFilter('All');
    setSearchTerm('');
    setSelectedIds([]);
  };

  return (
    <div className="space-y-4 pb-24">
      {/* شريط الأدوات والفلاتر */}
      <div className="flex flex-col gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100 relative z-20">
        <h2 className="text-xl font-bold text-gray-800">دليل الطفايات</h2>
        <div className="flex flex-col gap-3 w-full">
          <div className="flex flex-row gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-36"><Filter className="w-4 h-4 absolute right-3 top-3 text-gray-400" /><select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-full pl-2 pr-8 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-xs sm:text-sm text-gray-600 appearance-none bg-gray-50"><option value="All">كل الأنواع</option><option value="Powder">بودرة</option><option value="CO2">CO2</option><option value="Foam">رغوة</option><option value="Water">ماء</option><option value="Ceiling">سقفية</option></select></div>
            <LocationDropdown
              options={mainLocationNames}
              value={filterMainLocation}
              onChange={setFilterMainLocation}
              placeholder="الموقع الرئيسي"
              onAddLocation={() => { const name = prompt('اسم الموقع الرئيسي الجديد:'); if (name && name.trim()) onQuickAddLocation(null, name.trim()); }}
              addLabel="إضافة موقع رئيسي"
            />
            <LocationDropdown
              options={subLocationOptions}
              value={filterSubLocation}
              onChange={setFilterSubLocation}
              placeholder="الموقع الفرعي"
              onAddLocation={() => { const name = prompt('اسم الموقع الفرعي الجديد:'); if (name && name.trim() && filterMainLocation !== 'All') { const parentId = locationTree.find(n => n.name === filterMainLocation)?.id; if (parentId) onQuickAddLocation(parentId, name.trim()); } }}
              addLabel="إضافة موقع فرعي"
            />
            {(filterMainLocation !== 'All' || filterSubLocation !== 'All' || filterType !== 'All' || searchTerm) && (
              <button onClick={clearFilters} title="مسح جميع الفلاتر" className="flex items-center px-3 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg transition-colors whitespace-nowrap">
                <X className="w-3.5 h-3.5 ml-1" /> مسح الفلاتر
              </button>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:items-center">
            <div className="relative w-full sm:w-48 lg:w-56"><Search className="w-5 h-5 absolute right-3 top-2.5 text-gray-400" /><input type="text" placeholder="بحث..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-3 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm" /></div>
            <div className="flex gap-2 flex-wrap items-center">
              <button onClick={() => setQuickStatusFilter('All')} className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${quickStatusFilter === 'All' ? 'bg-gray-800 text-white border-gray-800' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`}>الكل ({statusCounts.all})</button>
              <button onClick={() => setQuickStatusFilter('تحتاج فحص')} className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${quickStatusFilter === 'تحتاج فحص' ? 'bg-orange-500 text-white border-orange-500' : 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100'}`}>فحص مستحق ({statusCounts.dueInspection})</button>
              <button onClick={() => setQuickStatusFilter('صيانة قريبة')} className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${quickStatusFilter === 'صيانة قريبة' ? 'bg-yellow-500 text-white border-yellow-500' : 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100'}`}>صيانة قريبة ({statusCounts.nearMaintenance})</button>
              <button onClick={() => setQuickStatusFilter('تحتاج صيانة')} className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${quickStatusFilter === 'تحتاج صيانة' ? 'bg-red-600 text-white border-red-600' : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'}`}>تحتاج صيانة ({statusCounts.needMaintenance})</button>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
            {canEdit && <button onClick={() => setShowAddModal(true)} className="flex-1 sm:flex-none bg-red-600 hover:bg-red-700 text-white px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center transition-colors text-sm whitespace-nowrap shadow-sm"><Plus className="w-4 h-4 sm:w-5 sm:h-5 ml-1" /> إضافة</button>}
          </div>
        </div>
      </div>

      {/* أدوات التحديد السريع */}
      <div className="flex gap-2 flex-wrap items-center bg-gray-100 p-2 rounded-lg border border-gray-200">
        <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded shadow-sm border">
          <input type="checkbox" className="w-4 h-4 text-red-600 rounded cursor-pointer" onChange={(e) => setSelectedIds(e.target.checked ? filtered.map(ext => ext.id) : [])} checked={filtered.length > 0 && selectedIds.length === filtered.length} />
          <span className="text-sm font-bold text-gray-700 select-none">تحديد المعروض</span>
        </label>
        <button onClick={() => setShowCustomSelectModal(true)} className="bg-white hover:bg-blue-50 text-blue-700 px-3 py-1.5 rounded shadow-sm border flex items-center text-sm font-bold transition-colors">
          <Target className="w-4 h-4 ml-1" /> تحديد بالأرقام
        </button>
        {selectedIds.length > 0 && <span className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full font-bold">{selectedIds.length} محدد</span>}
      </div>

      {selectedIds.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 md:bottom-6 md:left-1/2 md:right-auto md:transform md:-translate-x-1/2 z-50 px-2 pb-2 md:p-0">
          <div className="bg-white border border-gray-200 shadow-2xl rounded-2xl md:rounded-full px-3 py-2 flex flex-col md:flex-row md:items-center gap-2 max-w-lg mx-auto md:max-w-none md:gap-3">
            <div className="flex items-center justify-between gap-2">
              <span className="bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full text-sm font-bold whitespace-nowrap">
                {selectedIds.length} محدد
              </span>
              <button onClick={() => setSelectedIds([])} title="إلغاء التحديد" className="md:hidden text-gray-400 hover:text-gray-600 p-1"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex gap-2 w-full md:w-auto md:flex-nowrap flex-wrap">
              <button onClick={() => setActionModalData(extinguishers.filter(e => selectedIds.includes(e.id)))} className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full flex items-center justify-center transition-colors shadow-sm text-sm font-bold whitespace-nowrap">
                <Activity className="w-4 h-4 ml-1" /> إجراء جماعي
              </button>
              {canEdit && <button onClick={() => setTransferModalData(extinguishers.filter(e => selectedIds.includes(e.id) && !e.inCabinet))} disabled={transferrableCount === 0} className={`flex-1 md:flex-none px-4 py-2 rounded-full flex items-center justify-center transition-colors shadow-sm text-sm font-bold whitespace-nowrap ${transferrableCount === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 text-white'}`}><ArrowRightLeft className="w-4 h-4 ml-1" /> ترحيل</button>}
              {canEdit && <button onClick={() => setConfirmDialog({ title: 'تأكيد الأرشفة', message: `هل أنت متأكد من رغبتك في أرشفة (${selectedIds.length}) طفاية؟`, action: handleBulkDelete, isDestructive: true })} className="flex-1 md:flex-none bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-full flex items-center justify-center transition-colors shadow-sm text-sm font-bold whitespace-nowrap"><Archive className="w-4 h-4 ml-1" /> أرشفة</button>}
            </div>
          </div>
        </div>
      )}

      {/* العرض الخاص بالشاشات الكبيرة */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden w-full relative z-10">
        <table className="w-full text-right"><thead className="bg-gray-50 text-gray-600 font-medium text-sm"><tr><th className="p-3 w-10 text-center"></th><th className="p-3">الرقم</th><th className="p-3">النوع والحجم</th><th className="p-3">الموقع</th><th className="p-3">آخر فحص (يومي)</th><th className="p-3">موعد الصيانة (6 أشهر)</th><th className="p-3">الحالة</th><th className="p-3">ملاحظات</th><th className="p-3 text-center">إجراءات</th></tr></thead><tbody className="divide-y divide-gray-100 text-sm">
            {filtered.map(ext => (
              <tr key={ext.id} className={`hover:bg-gray-50 transition-colors ${selectedIds.includes(ext.id) ? 'bg-red-50' : ''}`}>
                <td className="p-3 text-center"><input type="checkbox" className="w-4 h-4 text-red-600 rounded cursor-pointer" checked={selectedIds.includes(ext.id)} onChange={(e) => setSelectedIds(e.target.checked ? [...selectedIds, ext.id] : selectedIds.filter(id => id !== ext.id))} /></td>
                <td className="p-3 font-bold text-gray-800"><div className="flex items-center gap-2" dir="ltr">{ext.number}{ext.inCabinet && <span title="في كابينة" className="bg-gray-200 text-gray-500 p-1 rounded-md ml-2"><Archive className="w-3 h-3" /></span>}</div></td>
                <td className="p-3"><span className="bg-gray-200 px-2 py-1 rounded text-gray-700 text-xs">{ext.type}</span> {ext.size}</td><td className="p-3"><div className="text-gray-800 text-sm">{ext.location}</div></td>
                <td className="p-3 text-gray-600 font-medium whitespace-nowrap">{formatDisplayDate(ext.lastInspection || ext.lastDate)}</td>
                <td className="p-3 text-gray-500 whitespace-nowrap">{formatDisplayDate(ext.nextDate)}</td>
                <td className="p-3"><span className={`px-2 py-1 rounded-full text-[11px] font-bold flex items-center w-max ${getStatusColor(ext.status)} ${ext.status === 'تحتاج فحص' ? 'animate-pulse' : ''}`}>{ext.status === 'صالحة' ? <CheckCircle className="w-3 h-3 ml-1" /> : ext.status === 'تحتاج فحص' ? <AlertTriangle className="w-3 h-3 ml-1" /> : <XCircle className="w-3 h-3 ml-1" />}{ext.status}</span></td>
                <td className="p-3 text-gray-500 text-xs max-w-[120px] truncate" title={ext.notes}>{ext.notes || '-'}</td>
                <td className="p-3 text-center"><div className="flex justify-center gap-2"><button onClick={() => setActionModalData([ext])} className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-1.5 rounded text-xs font-medium transition-colors border border-blue-200">إجراء</button>
                    <button onClick={() => setHistoryModalData(ext)} className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-2 py-1.5 rounded text-xs font-medium transition-colors flex items-center border border-indigo-200"><History className="w-3 h-3 ml-1" /> السجل</button>
                    {canEdit && (<><button onClick={() => setEditModalData(ext)} className="bg-gray-50 text-gray-600 hover:bg-gray-200 px-2 py-1.5 rounded text-xs font-medium transition-colors flex items-center border"><Edit className="w-3 h-3 ml-1" /> تعديل</button></>)}
                </div></td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan="9" className="p-6 text-center text-gray-500">لا يوجد بيانات.</td></tr>}
          </tbody></table>
      </div>

      {/* العرض الخاص بالموبايل */}
      <div className="md:hidden flex flex-col gap-4">
        {filtered.map(ext => (
          <div key={ext.id} className={`bg-white rounded-xl shadow-sm border flex flex-col gap-3 p-4 transition-colors ${selectedIds.includes(ext.id) ? 'border-red-300 bg-red-50' : 'border-gray-100'}`}>
            <div className="flex justify-between items-start"><div className="flex items-center gap-3">
                <input type="checkbox" checked={selectedIds.includes(ext.id)} className="w-5 h-5 text-red-600 rounded" onChange={(e) => setSelectedIds(e.target.checked ? [...selectedIds, ext.id] : selectedIds.filter(id => id !== ext.id))} />
                <div><div className="flex items-center gap-2" dir="ltr"><span className="font-bold text-gray-800 text-lg">{ext.number}</span>{ext.inCabinet && <span className="bg-gray-200 text-gray-500 p-1.5 rounded-md ml-2"><Archive className="w-3 h-3" /></span>}</div><span className="text-gray-500 text-xs">{ext.type} - {ext.size}</span></div>
              </div><span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center ${getStatusColor(ext.status)} ${ext.status === 'تحتاج فحص' ? 'animate-pulse' : ''}`}>{ext.status === 'تحتاج فحص' && <AlertTriangle className="w-3 h-3 ml-1" />}{ext.status}</span>
            </div>
            <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm bg-gray-50 p-3 rounded-lg border border-gray-100">
              <div className="col-span-2"><span className="text-gray-400 block text-[10px] mb-0.5">الموقع</span><span className="font-medium text-gray-700">{ext.location}</span></div>
              <div><span className="text-gray-400 block text-[10px] mb-0.5">آخر فحص يومي</span><span className="font-bold text-gray-700">{formatDisplayDate(ext.lastInspection || ext.lastDate)}</span></div>
              <div className="col-span-2 pt-2 border-t border-gray-200/60"><span className="text-gray-400 block text-[10px] mb-0.5">موعد الصيانة الشاملة القادم</span><span className="font-bold text-gray-800">{formatDisplayDate(ext.nextDate)}</span></div>
            </div>
            {ext.notes && <div className="text-xs bg-yellow-50 text-yellow-800 p-2.5 rounded-lg border border-yellow-100 flex items-start"><FileText className="w-4 h-4 ml-1.5 shrink-0 mt-0.5 text-yellow-600" /><span><strong className="font-bold">ملاحظة: </strong>{ext.notes}</span></div>}
            <div className="flex gap-2 pt-1"><button onClick={() => setActionModalData([ext])} className="flex-1 bg-blue-600 text-white hover:bg-blue-700 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center shadow-sm">إجراء (فحص/صيانة)</button>
              <button onClick={() => setHistoryModalData(ext)} className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center border border-indigo-200"><History className="w-4 h-4 ml-1" /> السجل</button>
              {canEdit && (<button onClick={() => setEditModalData(ext)} className="bg-gray-100 text-gray-700 hover:bg-gray-200 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center border"><Edit className="w-4 h-4" /></button>)}
            </div>
          </div>
        ))}
      </div>

      {showCustomSelectModal && <CustomSelectModal onClose={() => setShowCustomSelectModal(false)} onApply={applyCustomSelection} />}
      {showAddModal && <AddExtinguisherModal onClose={() => setShowAddModal(false)} onAdd={handleAddExtinguisher} locationTree={locationTree} onAddLocation={onQuickAddLocation} initialLocation={prefillLocation} suggestedNumber={suggestedNumber} />}
      {actionModalData && <ActionModal exts={actionModalData} onClose={() => setActionModalData(null)} onSubmit={handleActionSubmit} userRole={user.role} />}
      {editModalData && <EditExtinguisherModal ext={editModalData} onClose={() => setEditModalData(null)} onEdit={handleEdit} locationTree={locationTree} onAddLocation={onQuickAddLocation} />}
      {transferModalData && <TransferModal exts={transferModalData} onClose={() => setTransferModalData(null)} onSubmit={handleTransfer} locationTree={locationTree} onAddLocation={onQuickAddLocation} />}
      {historyModalData && (
        <ExtinguisherHistoryModal
          ext={historyModalData}
          onClose={() => setHistoryModalData(null)}
          userRole={user.role}
          db={db}
          fbUser={fbUser}
          appId={appId}
          setExtinguishers={setExtinguishers}
          logAction={logAction}
          onHistoryReset={(updatedExt) => setHistoryModalData(updatedExt)}
        />
      )}
      
      {/* نافذة التأكيد */}
      {confirmDialog && <CustomConfirmModal title={confirmDialog.title} message={confirmDialog.message} isDestructive={confirmDialog.isDestructive} onConfirm={confirmDialog.action} onClose={() => setConfirmDialog(null)} />}
    </div>
  );
}

function ExtinguisherHistoryModal({ ext, onClose, userRole, db, fbUser, appId, setExtinguishers, logAction, onHistoryReset }) {
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [signatures, setSignatures] = useState(ext.inspectionSignatures || []);
  const canResetHistory = userRole === 'developer';

  useEffect(() => {
    setSignatures(ext.inspectionSignatures || []);
  }, [ext]);

  const handleResetHistory = () => {
    const updatedExt = { ...ext, inspectionSignatures: [] };
    setSignatures([]);
    setExtinguishers(prev => prev.map(e => e.id === ext.id ? updatedExt : e));
    if (onHistoryReset) onHistoryReset(updatedExt);

    if (db && fbUser) {
      setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'extinguishers', String(ext.id)), updatedExt).catch(err => console.error("write err:", err));
    } else {
      enqueueWrite('extinguishers', ext.id, updatedExt);
    }

    logAction('تصفير سجل الطفاية', `تم تصفير سجل الطفاية ${ext.number}`);
    setConfirmDialog(null);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h3 className="text-lg font-bold text-gray-800 flex items-center"><History className="w-5 h-5 ml-2 text-indigo-600" />سجل الطفاية</h3>
            <p className="text-sm text-gray-500 mt-1" dir="ltr">{ext.number}</p>
          </div>
          <div className="flex items-center gap-2">
            {canResetHistory && (
              <button
                onClick={() => setConfirmDialog({ title: 'تصفير السجل', message: `سيتم حذف جميع سجلات الطفاية ${ext.number}. هل أنت متأكد؟`, action: handleResetHistory, isDestructive: true })}
                className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg px-3 py-2 text-sm font-bold transition-colors flex items-center"
              >
                <Trash2 className="w-4 h-4 ml-1" /> تصفير السجل
              </button>
            )}
            <button onClick={onClose} className="bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg px-3 py-2 text-sm font-bold transition-colors">إغلاق</button>
          </div>
        </div>

        <div className="max-h-[85vh] overflow-y-auto p-5 bg-gray-50">
          {signatures.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-12 text-gray-500">
              <ClipboardList className="w-12 h-12 mb-3 text-gray-300" />
              <p className="font-medium">لا يوجد سجل متابعة أو توقيع لهذه الطفاية.</p>
            </div>
          ) : (
            <div className="space-y-4 border-r-2 border-indigo-100 pr-4">
              {signatures.map((sig) => (
                <div key={sig.id || `${ext.id}-${sig.at || sig.date}`} className="relative">
                  <div className="absolute -right-[23px] top-5 h-3 w-3 rounded-full bg-indigo-500 border-2 border-white shadow"></div>
                  <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                      <span className={`w-fit px-3 py-1 rounded-full text-xs font-bold border ${sig.actionType === 'maintenance' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                        {sig.actionType === 'maintenance' ? 'صيانة شاملة' : 'فحص يومي'}
                      </span>
                      <span className="text-xs text-gray-400" dir="ltr">{sig.at ? formatDisplayDateTime(sig.at) : formatDisplayDate(sig.date)}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                        <div className="text-gray-400 text-xs mb-1">النتيجة</div>
                        <div className="font-bold text-gray-800">{sig.condition || '-'}</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                        <div className="text-gray-400 text-xs mb-1">المنفذ</div>
                        <div className="font-bold text-gray-800">{sig.byUserName || '-'}</div>
                      </div>
                    </div>
                    {sig.remarks && (
                      <div className="mt-3 rounded-lg bg-gray-50 border border-gray-200 p-3 text-sm text-gray-600 leading-relaxed">
                        {sig.remarks}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {confirmDialog && (
        <CustomConfirmModal
          title={confirmDialog.title}
          message={confirmDialog.message}
          isDestructive={confirmDialog.isDestructive}
          onConfirm={confirmDialog.action}
          onClose={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
}

// نافذة التحديد المخصص
function CustomSelectModal({ onClose, onApply }) {
  const [text, setText] = useState('');
  const handleSubmit = (e) => { e.preventDefault(); onApply(text); };
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden my-auto">
        <div className="bg-blue-600 text-white p-4 flex justify-between items-center"><h3 className="font-bold text-lg flex items-center"><Target className="w-5 h-5 ml-2"/> تحديد مخصص</h3><button onClick={onClose} className="text-blue-200 hover:text-white p-1">&times;</button></div>
        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
          <p className="text-sm text-gray-600">اكتب أرقام الطفايات التي تريد تحديدها. يمكنك فصل الأرقام بمسافة أو فارزة (مثال: 1 5 12 أو 1, 2, 3).</p>
          <textarea autoFocus className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 h-32 outline-none font-mono text-left" dir="ltr" placeholder="1, 2, 3..." value={text} onChange={e => setText(e.target.value)}></textarea>
          <div className="pt-2 flex gap-2"><button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-bold shadow-md">تحديد الطفايات</button><button type="button" onClick={onClose} className="flex-1 bg-gray-100 text-gray-800 py-2.5 rounded-lg font-bold">إلغاء</button></div>
        </form>
      </div>
    </div>
  );
}

// نافذة الإجراءات الموحدة
function ActionModal({ exts, onClose, onSubmit, userRole }) {
  const [actionType, setActionType] = useState('inspection'); 
  const [condition, setCondition] = useState('سليمة');
  const [remarks, setRemarks] = useState(exts.length === 1 ? (exts[0].notes || '') : ''); 
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  const canDoMaintenance = ['developer', 'father', 'admin'].includes(userRole);
  const isSingle = exts.length === 1;

  const handleSubmit = (e) => { 
    e.preventDefault(); 
    onSubmit(exts.map(e=>e.id), actionType, condition, remarks, date); 
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden my-auto">
        <div className="bg-blue-600 text-white p-4">
          <h3 className="font-bold text-lg flex items-center"><Activity className="w-5 h-5 ml-2"/> تسجيل إجراء {isSingle ? 'لطفاية' : 'جماعي'}</h3>
          <p className="text-sm text-blue-100 opacity-90 mt-1">{isSingle ? `رقم: ${exts[0].number}` : `العدد: ${exts.length} طفايات محددة`}</p>
        </div>
        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-5">
          <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
            <button type="button" onClick={() => setActionType('inspection')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${actionType === 'inspection' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>فحص ميداني (يومي)</button>
            {canDoMaintenance ? (
              <button type="button" onClick={() => setActionType('maintenance')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${actionType === 'maintenance' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>صيانة شاملة (6 أشهر)</button>
            ) : (
              <div className="flex-1 py-2 text-sm font-medium text-gray-400 text-center" title="ليس لديك صلاحية لإجراء صيانة">صيانة (مقفلة)</div>
            )}
          </div>

          <div className={`p-3 rounded-lg border ${actionType === 'maintenance' ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
            <p className="text-xs text-gray-600 font-medium">
              {actionType === 'inspection' ? '📌 الفحص الميداني: يثبت أن الطفاية موجودة وسليمة لهذا اليوم فقط. لا يغير موعد الصيانة الأساسي.' : '🔧 الصيانة الشاملة: يجدد صلاحية الطفاية بالكامل، وسيقوم النظام ببرمجة الموعد القادم بعد 6 أشهر من اليوم.'}
            </p>
          </div>

          <div><label className="block text-sm font-bold text-gray-700 mb-1">تاريخ الإجراء</label><input required type="date" className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50" value={date} onChange={e => setDate(e.target.value)} /></div>
          <div><label className="block text-sm font-bold text-gray-700 mb-1">النتيجة / الحالة</label><select className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50" value={condition} onChange={e => setCondition(e.target.value)}><option value="سليمة">سليمة وجاهزة للعمل</option><option value="تالفة">تالفة / تحتاج استبدال</option><option value="تسريب">يوجد تسريب</option><option value="إعادة تعبئة">تحتاج إعادة تعبئة</option></select></div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">ملاحظات (اختياري)</label>
            <textarea className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 h-24 text-sm outline-none bg-gray-50" value={remarks} onChange={e => setRemarks(e.target.value)} placeholder={isSingle ? "امسح النص لإلغاء الملاحظة السابقة..." : "ستطبق هذه الملاحظة على جميع الطفايات المحددة..."} />
          </div>

          <div className="pt-2 flex gap-2"><button type="submit" className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-bold hover:bg-blue-700 shadow-md">تأكيد وحفظ</button><button type="button" onClick={onClose} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 py-2.5 rounded-lg font-bold transition-colors">إلغاء</button></div>
        </form>
      </div>
    </div>
  );
}

function AddExtinguisherModal({ onClose, onAdd, locationTree, onAddLocation, initialLocation, suggestedNumber }) {
  const [formData, setFormData] = useState(() => {
    let last = {};
    try { last = JSON.parse(window.localStorage.getItem('ft_lastAdd') || '{}') || {}; } catch (e) {}
    return {
      numPart: suggestedNumber && suggestedNumber > 0 ? String(suggestedNumber) : '',
      size: last.size || '6Kg',
      type: last.type || 'Powder',
      location: initialLocation || '',
      lastDate: new Date().toISOString().split('T')[0],
      condition: last.condition || 'سليمة',
      notes: '',
      inCabinet: last.inCabinet === true,
      count: 1
    };
  });

  const handleSubmit = (e) => { 
    e.preventDefault(); 
    if (!formData.location) {
      alert('يرجى اختيار الموقع.');
      return;
    }
    const startNum = Number(formData.numPart);
    if (!startNum || startNum <= 0) {
      alert('يرجى إدخال رقم الطفاية.');
      return;
    }
    const count = Math.min(200, Math.max(1, Number(formData.count) || 1));
    const items = [];
    for (let i = 0; i < count; i++) {
      const n = startNum + i;
      items.push({
        size: formData.size,
        type: formData.type,
        location: formData.location,
        lastDate: formData.lastDate,
        condition: formData.condition,
        notes: formData.notes,
        inCabinet: formData.inCabinet,
        number: `EXT-${String(n).padStart(3, '0')}`
      });
    }
    try {
      window.localStorage.setItem('ft_lastAdd', JSON.stringify({ size: formData.size, type: formData.type, condition: formData.condition, inCabinet: formData.inCabinet }));
    } catch (err) {}
    onAdd(items); 
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden my-auto">
        <div className="bg-red-600 text-white p-4 flex justify-between items-center"><h3 className="font-bold text-lg">إضافة طفاية</h3><button onClick={onClose} className="text-red-200 hover:text-white p-1">&times;</button></div>
        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">رقم الطفاية (أدخل الأرقام فقط)</label>
            <div className="flex border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-red-500 bg-gray-50" dir="ltr">
              <span className="bg-gray-200 text-gray-600 font-bold px-4 py-2 border-r border-gray-300 select-none">EXT-</span>
              <input required type="number" min="1" placeholder="001" className="w-full px-3 py-2 outline-none bg-transparent" value={formData.numPart} onChange={e => setFormData({...formData, numPart: e.target.value})} />
            </div>
            {suggestedNumber > 0 && <p className="text-xs text-gray-400 mt-1">اقتراح: الرقم التالي المتاح هو <span dir="ltr" className="font-bold text-gray-600">EXT-{String(suggestedNumber).padStart(3, '0')}</span></p>}
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">العدد (إضافة سريعة متتالية)</label>
            <input required type="number" min="1" max="200" className="w-full border p-2 rounded bg-gray-50 outline-none" value={formData.count} onChange={e => setFormData({...formData, count: e.target.value})} />
            {formData.count > 1 && <p className="text-xs text-gray-400 mt-1">سيتم إنشاء {formData.count} طفايات بأرقام متتالية تبدأ من <span dir="ltr" className="font-bold text-gray-600">EXT-{String(Number(formData.numPart) || '').padStart(3, '0')}</span></p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm text-gray-600 mb-1">النوع</label><select className="w-full border p-2 rounded bg-gray-50 outline-none" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value, size: ''})}><option value="Powder">بودرة</option><option value="CO2">CO2</option><option value="Foam">رغوة</option><option value="Water">ماء</option><option value="Ceiling">سقفية</option></select></div>
            <div><label className="block text-sm text-gray-600 mb-1">الحجم</label><SizeDropdown value={formData.size} onChange={v => setFormData({...formData, size: v})} type={formData.type} /></div>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">الموقع</label>
              <HierarchicalLocationPicker
              tree={locationTree}
              value={formData.location}
              onChange={(path) => setFormData({...formData, location: path})}
              placeholder="اختر الموقع..."
              onAddLocation={onAddLocation}
            />
            {formData.location && <p className="text-xs text-green-600 mt-1">تم تعبئة الموقع من الفلتر المحدد: <span className="font-bold">{formData.location}</span></p>}
          </div>
          <div className="flex items-center gap-2 bg-gray-50 p-3 rounded border border-gray-200"><input type="checkbox" id="inCabinet" className="w-4 h-4 text-red-600 rounded" checked={formData.inCabinet} onChange={e => setFormData({...formData, inCabinet: e.target.checked})} /><label htmlFor="inCabinet" className="text-sm font-bold text-gray-700 cursor-pointer select-none">مثبتة داخل كابينة</label></div>
          <div><label className="block text-sm text-gray-600 mb-1">تاريخ الإنشاء / الصيانة</label><input required type="date" className="w-full border p-2 rounded bg-gray-50 outline-none" value={formData.lastDate} onChange={e => setFormData({...formData, lastDate: e.target.value})} /></div>
          <div><label className="block text-sm font-bold text-gray-700 mb-1">النتيجة / الحالة</label><select className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-red-500 outline-none bg-gray-50" value={formData.condition} onChange={e => setFormData({...formData, condition: e.target.value})}><option value="سليمة">سليمة وجاهزة للعمل</option><option value="تالفة">تالفة / تحتاج استبدال</option><option value="تسريب">يوجد تسريب</option><option value="إعادة تعبئة">تحتاج إعادة تعبئة</option></select></div>
          <div><label className="block text-sm font-bold text-gray-700 mb-1">ملاحظات (اختياري)</label><textarea className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-red-500 h-24 text-sm outline-none bg-gray-50" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="ملاحظات حول الطفاية..." /></div>
          <div className="pt-2 flex gap-2"><button type="submit" className="flex-1 bg-red-600 text-white py-2.5 rounded-lg font-bold hover:bg-red-700 shadow-md">حفظ</button><button type="button" onClick={onClose} className="flex-1 bg-gray-200 text-gray-800 py-2.5 rounded-lg font-bold hover:bg-gray-300">إلغاء</button></div>
        </form>
      </div>
    </div>
  );
}

function EditExtinguisherModal({ ext, onClose, onEdit, locationTree, onAddLocation }) {
  const [formData, setFormData] = useState({ ...ext });
  const handleSubmit = (e) => { e.preventDefault(); onEdit(formData); };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden my-auto">
        <div className="bg-green-600 text-white p-4 flex justify-between items-center"><h3 className="font-bold text-lg">تعديل بيانات الطفاية</h3><button onClick={onClose} className="text-green-200 hover:text-white p-1">&times;</button></div>
        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
          <div><label className="block text-sm text-gray-600 mb-1">رقم الطفاية</label><input required type="text" className="w-full border p-2 rounded bg-gray-200 text-gray-600 font-bold outline-none cursor-not-allowed" value={formData.number} disabled dir="ltr" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm text-gray-600 mb-1">النوع</label><select className="w-full border p-2 rounded focus:ring-2 focus:ring-green-500 bg-gray-50 outline-none" value={formData.type} onChange={e => { const newType = e.target.value; const sizes = getSizeOptions(newType); setFormData({...formData, type: newType, size: sizes.includes(formData.size) ? formData.size : '' }); }}><option value="Powder">بودرة</option><option value="CO2">CO2</option><option value="Foam">رغوة</option><option value="Water">ماء</option><option value="Ceiling">سقفية</option></select></div>
            <div><label className="block text-sm text-gray-600 mb-1">الحجم</label><SizeDropdown value={formData.size} onChange={v => setFormData({...formData, size: v})} type={formData.type} /></div>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">الموقع</label>
            <HierarchicalLocationPicker
              tree={locationTree}
              value={formData.location || ''}
              onChange={(path) => setFormData({...formData, location: path})}
              placeholder="اختر الموقع..."
              onAddLocation={onAddLocation}
            />
          </div>
          <div className="flex items-center gap-2 bg-gray-50 p-3 rounded border border-gray-200"><input type="checkbox" id="editInCabinet" className="w-4 h-4 text-green-600 rounded focus:ring-green-500 cursor-pointer" checked={formData.inCabinet} onChange={e => setFormData({...formData, inCabinet: e.target.checked})} /><label htmlFor="editInCabinet" className="text-sm font-bold text-gray-700 cursor-pointer select-none">مثبتة داخل كابينة</label></div>
          <div><label className="block text-sm text-gray-600 mb-1">تاريخ آخر صيانة شاملة</label><input required type="date" className="w-full border p-2 rounded focus:ring-2 focus:ring-green-500" value={formData.lastDate} onChange={e => setFormData({...formData, lastDate: e.target.value})} /></div>
          <div className="pt-2 flex gap-2"><button type="submit" className="flex-1 bg-green-600 text-white py-2.5 rounded-lg font-bold hover:bg-green-700 shadow-md">حفظ التعديلات</button><button type="button" onClick={onClose} className="flex-1 bg-gray-100 text-gray-800 py-2.5 rounded-lg font-bold hover:bg-gray-200">إلغاء</button></div>
        </form>
      </div>
    </div>
  );
}

function CustomConfirmModal({ title, message, isDestructive, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden my-auto p-6 text-center transform transition-all">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isDestructive ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button onClick={() => { onConfirm(); onClose(); }} className={`flex-1 text-white py-2.5 rounded-lg font-bold transition-colors shadow-md ${isDestructive ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}>تأكيد</button>
          <button onClick={onClose} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 py-2.5 rounded-lg font-bold transition-colors">إلغاء</button>
        </div>
      </div>
    </div>
  );
}

function TransferModal({ exts, onClose, onSubmit, locationTree, onAddLocation }) {
  const [newLocation, setNewLocation] = useState('');
  const handleSubmit = (e) => { e.preventDefault(); if(newLocation.trim() === '') return; onSubmit(exts.map(e => e.id), newLocation); };
  const isSingle = exts.length === 1;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden my-auto">
        <div className="bg-purple-600 text-white p-4">
          <h3 className="font-bold text-lg flex items-center"><ArrowRightLeft className="w-5 h-5 ml-2" /> {isSingle ? 'ترحيل الطفاية' : 'ترحيل جماعي'}</h3>
          <p className="text-sm text-purple-100 opacity-90 mt-1">{isSingle ? `رقم: ${exts[0].number}` : `العدد: ${exts.length}`}</p>
        </div>
        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
          {isSingle && (
            <div>
              <label className="block text-sm text-gray-600 mb-1">الموقع الحالي</label>
              <input type="text" disabled className="w-full border p-2 rounded bg-gray-100 text-gray-500" value={exts[0].location} />
            </div>
          )}
          <div>
            <label className="block text-sm text-gray-600 mb-1">الموقع الجديد</label>
            <HierarchicalLocationPicker
              tree={locationTree}
              value={newLocation}
              onChange={setNewLocation}
              placeholder="اختر الموقع الجديد..."
              onAddLocation={onAddLocation}
            />
          </div>
          <div className="pt-2 flex gap-2">
            <button type="submit" disabled={!newLocation} className="flex-1 bg-purple-600 text-white py-2.5 rounded-lg font-medium flex justify-center items-center disabled:opacity-50">تأكيد الترحيل</button>
            <button type="button" onClick={onClose} className="flex-1 bg-gray-200 text-gray-800 py-2.5 rounded-lg font-medium">إلغاء</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function UsersList({ users, setUsers, currentUser, logAction, db, fbUser, appId }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editModalUser, setEditModalUser] = useState(null);
  const activeUsers = useMemo(() => users.filter(u => !u.archived), [users]);

  if (currentUser.role === 'member') return <div className="p-8 text-center text-red-500">عذراً، ليس لديك صلاحية.</div>;

  const handleAddUser = (newUser) => {
    const newId = activeUsers.length ? Math.max(...activeUsers.map(u => Number(u.id))) + 1 : 1;
    const userObj = { ...newUser, id: newId, archived: false };
    setUsers([...users, userObj]);
    routeWrite(db, fbUser, appId, 'users', newId, userObj);
    setShowAddModal(false);
    logAction('إضافة مستخدم', `إضافة حساب "${newUser.name}"`);
  };

  const handleDeleteUser = (id, name) => {
    if (id === currentUser.id) return; 
    const userToArchive = users.find(u => u.id === id);
    if (!userToArchive) return;
    setUsers(users.map(u => u.id === id ? { ...u, archived: true } : u));
    routeWrite(db, fbUser, appId, 'users', id, { ...userToArchive, archived: true });
    logAction('أرشفة مستخدم', `أرشفة حساب "${name}"`);
  };

  const handleEditUser = (updatedUser) => {
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    routeWrite(db, fbUser, appId, 'users', updatedUser.id, updatedUser);
    logAction('تعديل مستخدم', `تعديل بيانات حساب "${updatedUser.name}"`);
    setEditModalUser(null);
  };

  const canEdit = (targetId, targetRole) => targetId !== currentUser.id && (currentUser.role === 'developer' || ((currentUser.role === 'admin' || currentUser.role === 'father') && targetRole !== 'developer' && targetRole !== 'father'));

  const canSeePassword = (targetRole) => currentUser.role === 'developer' || ((currentUser.role === 'admin' || currentUser.role === 'father') && targetRole !== 'developer');
  const canDelete = (targetId, targetRole) => targetId !== currentUser.id && (currentUser.role === 'developer' || ((currentUser.role === 'admin' || currentUser.role === 'father') && targetRole !== 'developer' && targetRole !== 'father'));

  const getRoleLabel = (role) => {
    if (role === 'developer') return 'مبرمج';
    if (role === 'father') return 'مشرف عام';
    if (role === 'admin') return 'مسؤول';
    return 'عضو';
  };
  const getRoleBadgeColor = (role) => {
    if (role === 'developer') return 'bg-purple-100 text-purple-700';
    if (role === 'father') return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (role === 'admin') return 'bg-blue-100 text-blue-700';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 w-full relative z-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3"><h2 className="text-xl font-bold text-gray-800">فريق العمل</h2><button onClick={() => setShowAddModal(true)} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center transition-colors text-sm font-medium"><UserPlus className="w-4 h-4 ml-2" /> إضافة مستخدم</button></div>
      <div className="hidden md:block overflow-x-auto w-full">
        <table className="w-full text-right min-w-[500px]"><thead className="bg-gray-50 text-gray-600 text-sm"><tr><th className="p-3">الاسم</th><th className="p-3">الحساب</th><th className="p-3">المرور</th><th className="p-3">الصلاحية</th><th className="p-3 text-center">إجراء</th></tr></thead><tbody className="divide-y divide-gray-100 text-sm">
            {activeUsers.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="p-3 font-medium">{u.name}</td><td className="p-3 text-gray-600" dir="ltr">{u.username}</td>
                <td className="p-3 text-gray-400 font-mono tracking-widest">{canSeePassword(u.role) ? u.password : '••••••'}</td>
                <td className="p-3"><span className={`px-2 py-1 rounded-full text-[11px] font-bold border ${getRoleBadgeColor(u.role)}`}>{getRoleLabel(u.role)}</span></td>
                <td className="p-3 text-center"><div className="flex justify-center gap-2">{canEdit(u.id, u.role) && (<button onClick={() => setEditModalUser(u)} className="bg-gray-50 text-gray-600 hover:bg-gray-200 px-2 py-1.5 rounded text-xs font-medium flex items-center border"><Edit className="w-3 h-3 ml-1" /> تعديل</button>)}{canDelete(u.id, u.role) ? (<button onClick={() => handleDeleteUser(u.id, u.name)} className="text-red-500 hover:text-red-700 bg-red-50 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center"><Trash2 className="w-3 h-3 ml-1" /> حذف</button>) : (<span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-1 rounded">غير مصرح</span>)}</div></td>
              </tr>
            ))}
          </tbody></table>
      </div>
      <div className="md:hidden flex flex-col gap-3">
        {activeUsers.map(u => (
          <div key={u.id} className="bg-gray-50 border border-gray-100 rounded-lg p-4 flex flex-col gap-3 relative">
            <div className="flex justify-between items-start"><span className="font-bold text-gray-800">{u.name}</span><span className={`px-2 py-1 rounded-full text-[10px] font-bold border ${getRoleBadgeColor(u.role)}`}>{getRoleLabel(u.role)}</span></div>
            <div className="text-sm text-gray-600 bg-white p-2 rounded border">الحساب: <span dir="ltr" className="font-medium text-gray-800">{u.username}</span></div>
            <div className="text-sm text-gray-600 bg-white p-2 rounded border">كلمة المرور: <span dir="ltr" className="text-gray-400 font-mono tracking-widest">{canSeePassword(u.role) ? u.password : '••••••'}</span></div>
            <div className="flex gap-2">{canEdit(u.id, u.role) && (<button onClick={() => setEditModalUser(u)} className="flex-1 bg-gray-100 text-gray-700 hover:bg-gray-200 py-2 rounded-lg text-sm font-medium flex justify-center items-center border"><Edit className="w-4 h-4 ml-1" /> تعديل</button>)}{canDelete(u.id, u.role) && (<button onClick={() => handleDeleteUser(u.id, u.name)} className="flex-1 bg-red-50 text-red-600 py-2 rounded-lg text-sm font-medium flex justify-center items-center"><Trash2 className="w-4 h-4 ml-1" /> حذف</button>)}</div>
          </div>
        ))}
      </div>
      {showAddModal && <AddUserModal onClose={() => setShowAddModal(false)} onAdd={handleAddUser} currentUser={currentUser} />}
      {editModalUser && <EditUserModal user={editModalUser} onClose={() => setEditModalUser(null)} onEdit={handleEditUser} currentUser={currentUser} />}
    </div>
  );
}

function EditUserModal({ user, onClose, onEdit, currentUser }) {
  const [formData, setFormData] = useState({ ...user });
  const handleSubmit = (e) => { e.preventDefault(); onEdit(formData); };
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden my-auto">
        <div className="bg-green-600 text-white p-4 flex justify-between items-center">
          <h3 className="font-bold text-lg flex items-center"><Edit className="w-5 h-5 ml-2" /> تعديل بيانات المستخدم</h3>
          <button onClick={onClose} className="text-green-200 hover:text-white p-1">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
          <div><label className="block text-sm text-gray-600 mb-1">الاسم الكامل</label><input required type="text" className="w-full border p-2 rounded focus:ring-2 focus:ring-green-500" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
          <div><label className="block text-sm text-gray-600 mb-1">الحساب</label><input required type="text" className="w-full border p-2 rounded focus:ring-2 focus:ring-green-500" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} dir="ltr" /></div>
          <div><label className="block text-sm text-gray-600 mb-1">كلمة المرور</label><input required type="text" className="w-full border p-2 rounded focus:ring-2 focus:ring-green-500" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} dir="ltr" /></div>
          <div><label className="block text-sm text-gray-600 mb-1">الصلاحية</label>
            <select className="w-full border p-2 rounded focus:ring-2 focus:ring-green-500" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
              <option value="member">عضو </option>
              <option value="admin">مسؤول </option>
              {currentUser.role === 'developer' && (<><option value="father">مشرف عام </option><option value="developer">مبرمج </option></>)}
            </select>
          </div>
          <div className="pt-2 flex gap-2">
            <button type="submit" className="flex-1 bg-green-600 text-white py-2.5 rounded-lg font-bold hover:bg-green-700 shadow-md">حفظ التعديلات</button>
            <button type="button" onClick={onClose} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 py-2.5 rounded-lg font-bold">إلغاء</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddUserModal({ onClose, onAdd, currentUser }) {
  const [formData, setFormData] = useState({ name: '', username: '', password: '', role: 'member' });
  const handleSubmit = (e) => { e.preventDefault(); onAdd(formData); };
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto"><div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden my-auto"><div className="bg-blue-600 text-white p-4 flex justify-between items-center"><h3 className="font-bold text-lg">إضافة مستخدم</h3><button onClick={onClose} className="text-blue-200 hover:text-white p-1">&times;</button></div><form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4"><div><label className="block text-sm text-gray-600 mb-1">الاسم الكامل</label><input required type="text" className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div><div><label className="block text-sm text-gray-600 mb-1">الحساب</label><input required type="text" className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} dir="ltr" /></div><div><label className="block text-sm text-gray-600 mb-1">المرور</label><input required type="text" className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} dir="ltr" /></div><div><label className="block text-sm text-gray-600 mb-1">الصلاحية</label><select className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}><option value="member">عضو</option><option value="admin">مسؤول</option>{currentUser.role === 'developer' && (<><option value="father">مشرف عام</option><option value="developer">مبرمج</option></>)}</select></div><div className="pt-2 flex gap-2"><button type="submit" className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium flex justify-center items-center">إضافة</button><button type="button" onClick={onClose} className="flex-1 bg-gray-200 text-gray-800 py-2.5 rounded-lg font-medium">إلغاء</button></div></form></div></div>
  );
}

function AuditLogsList({ logs, userRole }) {
  if (userRole === 'member') return <div className="p-8 text-center text-red-500">عذراً، ليس لديك صلاحية.</div>;

  const [selectedDay, setSelectedDay] = useState('All');

  const logsWithDay = useMemo(() => {
    return logs.map(log => {
      const dayStr = normalizeDayStr(log.dayStr || log.date.split(/,|،/)[0].trim());
      return { ...log, dayStr };
    });
  }, [logs]);

  const availableDays = useMemo(() => {
    const days = new Set(logsWithDay.map(l => l.dayStr));
    return [...days]; 
  }, [logsWithDay]);

  const filteredLogs = useMemo(() => {
    if (selectedDay === 'All') return logsWithDay;
    return logsWithDay.filter(l => l.dayStr === selectedDay);
  }, [logsWithDay, selectedDay]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 w-full relative z-10">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-xl font-bold text-gray-800 flex items-center"><ClipboardList className="w-6 h-6 ml-2 text-red-600" />سجل التغييرات والمهام</h2>
        
        <div className="w-full sm:w-auto relative">
          <Calendar className="w-4 h-4 absolute right-3 top-3 text-gray-500" />
          <select 
            value={selectedDay} 
            onChange={(e) => setSelectedDay(e.target.value)} 
            className="w-full sm:w-56 pl-3 pr-9 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm text-gray-700 bg-gray-50 appearance-none font-medium"
            dir="rtl"
          >
            <option value="All">كل الأيام (الجميع)</option>
            {availableDays.map(day => (
              <option key={day} value={day}>{day}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="hidden md:block overflow-x-auto w-full">
        <table className="w-full text-right min-w-[600px]"><thead className="bg-gray-50 text-gray-600 text-sm border-y"><tr><th className="p-3">التاريخ والوقت</th><th className="p-3">المستخدم</th><th className="p-3">الإجراء</th><th className="p-3">التفاصيل</th></tr></thead><tbody className="divide-y divide-gray-100 text-sm">{filteredLogs.length === 0 ? <tr><td colSpan="4" className="p-8 text-center text-gray-500">لا توجد سجلات لهذا اليوم.</td></tr> : filteredLogs.map(log => <tr key={log.id} className="hover:bg-gray-50"><td className="p-3 text-gray-500 whitespace-nowrap" dir="ltr">{formatLogDate(log.date)}</td><td className="p-3 font-medium text-blue-700 whitespace-nowrap">{log.userName}</td><td className="p-3"><span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-lg text-[11px] font-bold border whitespace-nowrap">{log.action}</span></td><td className="p-3 text-gray-700 min-w-[200px]">{log.details}</td></tr>)}</tbody></table>
      </div>

      <div className="md:hidden flex flex-col gap-3">
        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-xl border border-gray-100">لا توجد سجلات لهذا اليوم.</div>
        ) : (
          filteredLogs.map(log => (
            <div key={log.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col gap-2 relative">
              <div className="flex justify-between items-start mb-1">
                <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-md text-[10px] font-bold border">{log.action}</span>
                <span className="text-gray-400 text-[10px]" dir="ltr">{formatLogDate(log.date)}</span>
              </div>
              <div className="text-sm font-bold text-blue-700">{log.userName}</div>
              <div className="text-xs text-gray-700 leading-relaxed bg-gray-50 p-2 rounded border border-gray-200">{log.details}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function PerformanceReport({ auditLogs, userRole, db, fbUser, appId, setAuditLogs }) {
  if (userRole === 'member') return <div className="p-8 text-center text-red-500">عذراً، ليس لديك صلاحية للوصول لهذه الصفحة.</div>;

  const [selectedDay, setSelectedDay] = useState('All');
  const [expandedUser, setExpandedUser] = useState(null);

  const logsWithDay = useMemo(() => {
    return auditLogs.map(log => {
      const dayStr = normalizeDayStr(log.dayStr || String(log.date || '').split(/,|،/)[0].trim());
      return { ...log, dayStr };
    });
  }, [auditLogs]);

  const availableDays = useMemo(() => {
    const days = new Set(logsWithDay.map(log => log.dayStr).filter(Boolean));
    return [...days];
  }, [logsWithDay]);

  const filteredLogs = useMemo(() => {
    if (selectedDay === 'All') return logsWithDay;
    return logsWithDay.filter(log => log.dayStr === selectedDay);
  }, [logsWithDay, selectedDay]);

  const groupedUsers = useMemo(() => {
    const grouped = new Map();

    filteredLogs.forEach(log => {
      const userName = log.userName || 'مجهول';
      if (!grouped.has(userName)) {
        grouped.set(userName, {
          userName,
          totalActions: 0,
          inspections: 0,
          maintenance: 0,
          logs: []
        });
      }

      const entry = grouped.get(userName);
      entry.totalActions += 1;
      if (String(log.action || '').includes('فحص')) entry.inspections += 1;
      if (String(log.action || '').includes('صيانة')) entry.maintenance += 1;
      entry.logs.push(log);
    });

    return [...grouped.values()].sort((a, b) => b.totalActions - a.totalActions);
  }, [filteredLogs]);

  const canDeleteLogs = userRole === 'developer';

  const handleDeleteLog = (logId) => {
    if (!canDeleteLogs) return;
    setAuditLogs(prev => prev.filter(log => log.id !== logId));
    routeDelete(db, fbUser, appId, 'auditLogs', logId);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center"><Activity className="w-6 h-6 ml-2 text-blue-600" />متابعة الإنجاز</h2>
            <p className="text-sm text-gray-600 mt-2">تقرير يوضح حجم نشاط كل مستخدم بحسب اليوم المحدد.</p>
          </div>
          <div className="w-full md:w-auto">
            <label className="block text-xs text-gray-500 mb-1">فلترة حسب اليوم</label>
            <div className="relative">
              <Calendar className="w-4 h-4 absolute right-3 top-3 text-gray-400" />
              <select value={selectedDay} onChange={(e) => { setSelectedDay(e.target.value); setExpandedUser(null); }} className="w-full md:w-64 pl-3 pr-9 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-700 bg-gray-50 appearance-none" dir="rtl">
                <option value="All">كل الأيام</option>
                {availableDays.map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {groupedUsers.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 text-center">
          <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">لا توجد سجلات لهذا اليوم.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedUsers.map(userGroup => {
            const isExpanded = expandedUser === userGroup.userName;
            return (
              <div key={userGroup.userName} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <button onClick={() => setExpandedUser(isExpanded ? null : userGroup.userName)} className="w-full p-4 md:p-5 text-right hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg border border-blue-200">
                        {String(userGroup.userName).charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-gray-800 text-lg">{userGroup.userName}</div>
                        <div className="text-xs text-gray-500 mt-1">إجمالي الإجراءات: {userGroup.totalActions}</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full text-xs font-bold">الإجمالي: {userGroup.totalActions}</span>
                      <span className="bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-xs font-bold">فحص: {userGroup.inspections}</span>
                      <span className="bg-yellow-100 text-yellow-700 px-3 py-1.5 rounded-full text-xs font-bold">صيانة: {userGroup.maintenance}</span>
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-3">
                    {userGroup.logs.map(log => (
                      <div key={log.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                          <span className={`w-fit px-3 py-1 rounded-full text-xs font-bold border ${String(log.action || '').includes('صيانة') ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : String(log.action || '').includes('فحص') ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                            {log.action}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400" dir="ltr">{formatLogDate(log.date)}</span>
                            {canDeleteLogs && (
                              <button
                                onClick={() => handleDeleteLog(log.id)}
                                className="text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 px-2 py-1 rounded text-xs font-bold flex items-center"
                              >
                                <Trash2 className="w-3 h-3 ml-1" /> حذف
                              </button>
                            )}
                    </div>
            </div>
          </div>
        ))}
      </div>
            )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InspectionPolicyCenter({ topLevelLocations, inspectionPolicies, setInspectionPolicies, db, fbUser, appId, logAction, currentUser }) {
  if (!(currentUser.role === 'developer' || currentUser.role === 'father')) return <div className="p-8 text-center text-red-500">عذراً، ليس لديك صلاحية.</div>;

  const defaultStartDate = formatDate(new Date());
  const [policyDraft, setPolicyDraft] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('');

  useEffect(() => {
    const normalized = topLevelLocations.map((loc) => {
      const existing = inspectionPolicies.find(p => p.location === loc);
      return existing || { location: loc, enabled: false, intervalDays: 1, startDate: defaultStartDate };
    });
    setPolicyDraft(normalized);
  }, [topLevelLocations, inspectionPolicies, defaultStartDate]);

  useEffect(() => {
    if (!policyDraft.length) {
      setSelectedLocation('');
      return;
    }
    if (!selectedLocation || !policyDraft.some(p => p.location === selectedLocation)) {
      setSelectedLocation(policyDraft[0].location);
    }
  }, [policyDraft, selectedLocation]);

  const selectedPolicy = useMemo(
    () => policyDraft.find(p => p.location === selectedLocation) || null,
    [policyDraft, selectedLocation]
  );

  const updateSelectedPolicy = (key, value) => {
    if (!selectedLocation) return;
    setPolicyDraft(prev => prev.map(p => (p.location === selectedLocation ? { ...p, [key]: value } : p)));
  };

  const saveInspectionPolicies = () => {
    const normalized = policyDraft.map(p => ({
      location: p.location,
      enabled: Boolean(p.enabled),
      intervalDays: Math.max(1, Number(p.intervalDays) || 1),
      startDate: p.startDate || defaultStartDate
    }));

    setInspectionPolicies(normalized);
    routeWrite(db, fbUser, appId, 'app_data', 'inspectionPolicies', { list: normalized });

    logAction('سياسات الفحص', 'تم تحديث سياسات الفحص حسب الأقسام.');
  };

  const enabledCount = useMemo(() => policyDraft.filter(p => p.enabled).length, [policyDraft]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div className="bg-gradient-to-l from-amber-50 to-white border border-amber-200 rounded-2xl p-5 md:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center"><Calendar className="w-6 h-6 ml-2 text-amber-600"/> سياسة الفحص حسب الاستخدام</h2>
          </div>
          <div className="flex gap-2 text-xs font-bold">
            <span className="bg-amber-100 text-amber-800 border border-amber-200 px-3 py-1.5 rounded-full">الأقسام: {policyDraft.length}</span>
            <span className="bg-green-100 text-green-800 border border-green-200 px-3 py-1.5 rounded-full">مفعّل: {enabledCount}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h3 className="text-lg font-bold text-gray-800 mb-4">تحرير مركزي للسياسة</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">اختر القسم (الموقع الرئيسي)</label>
            <select className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)}>
              {policyDraft.map(p => <option key={p.location} value={p.location}>{p.location}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">تفعيل المتابعة</label>
            <label className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg p-2.5 cursor-pointer h-[42px]">
              <input type="checkbox" checked={Boolean(selectedPolicy?.enabled)} onChange={(e) => updateSelectedPolicy('enabled', e.target.checked)} className="w-4 h-4 text-amber-600 rounded" disabled={!selectedPolicy} />
              <span className="text-sm font-medium text-gray-700">تفعيل سياسة هذا القسم</span>
            </label>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">التكرار (بالأيام)</label>
            <input type="number" min="1" className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" value={selectedPolicy?.intervalDays || 1} onChange={(e) => updateSelectedPolicy('intervalDays', e.target.value)} disabled={!selectedPolicy || !selectedPolicy.enabled} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">تاريخ البداية</label>
            <input type="date" className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" value={selectedPolicy?.startDate || defaultStartDate} onChange={(e) => updateSelectedPolicy('startDate', e.target.value)} disabled={!selectedPolicy || !selectedPolicy.enabled} />
          </div>
        </div>

        <div className="mt-5">
          <button onClick={saveInspectionPolicies} className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-lg font-bold transition-colors shadow-sm">
            حفظ السياسة
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h3 className="text-lg font-bold text-gray-800 mb-3">ملخص كل الأقسام</h3>
        <div className="space-y-2">
          {policyDraft.map(policy => (
            <div key={policy.location} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div>
                <div className="font-bold text-gray-800 text-sm">{policy.location}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {policy.enabled ? `كل ${Math.max(1, Number(policy.intervalDays) || 1)} يوم - من ${policy.startDate || defaultStartDate}` : 'غير مفعلة'}
                </div>
              </div>
              <span className={`text-xs px-3 py-1 rounded-full font-bold border ${policy.enabled ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                {policy.enabled ? 'مفعلة' : 'غير مفعلة'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SignatureLogsList({ extinguishers, userRole }) {
  if (!(userRole === 'developer' || userRole === 'father')) return <div className="p-8 text-center text-red-500">عذراً، ليس لديك صلاحية.</div>;

  const rows = useMemo(() => {
    const out = [];
    extinguishers.forEach(ext => {
      (ext.inspectionSignatures || []).forEach(sig => {
        out.push({
          id: sig.id || `${ext.id}-${sig.at || sig.date}`,
          extNumber: ext.number,
          location: ext.location,
          actionType: sig.actionType,
          date: sig.date,
          condition: sig.condition,
          remarks: sig.remarks,
          byUserName: sig.byUserName,
          at: sig.at,
          archived: ext.archived
        });
      });
    });
    return out.sort((a, b) => new Date(b.at || b.date) - new Date(a.at || a.date));
  }, [extinguishers]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 w-full relative z-10">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800 flex items-center"><FileText className="w-5 h-5 ml-2 text-indigo-600" />سجل التوقيع</h2>
        <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1 rounded-full font-bold">{rows.length} توقيع</span>
      </div>

      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-right min-w-[760px]">
          <thead className="bg-gray-50 text-gray-600 text-sm border-y">
            <tr>
              <th className="p-3">الوقت</th>
              <th className="p-3">الطفاية</th>
              <th className="p-3">القسم</th>
              <th className="p-3">الإجراء</th>
              <th className="p-3">النتيجة</th>
              <th className="p-3">المنفذ</th>
              <th className="p-3">ملاحظات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {rows.length === 0 ? (
              <tr><td colSpan="7" className="p-8 text-center text-gray-500">لا توجد توقيعات حتى الآن.</td></tr>
            ) : rows.map(r => (
              <tr key={r.id} className={`hover:bg-gray-50 ${r.archived ? 'bg-gray-50/60' : ''}`}>
                <td className="p-3 text-gray-500 whitespace-nowrap" dir="ltr">{r.at ? formatDisplayDateTime(r.at) : formatDisplayDate(r.date)}</td>
                <td className="p-3 font-bold text-gray-800" dir="ltr">{r.extNumber}</td>
                <td className="p-3 text-gray-700">{r.location}</td>
                <td className="p-3"><span className="px-2 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold">{r.actionType === 'maintenance' ? 'صيانة شاملة' : 'فحص يومي'}</span></td>
                <td className="p-3 text-gray-700">{r.condition}</td>
                <td className="p-3 text-gray-700">{r.byUserName || '-'}</td>
                <td className="p-3 text-gray-600 max-w-[220px] truncate" title={r.remarks || ''}>{r.remarks || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden flex flex-col gap-3">
        {rows.length === 0 ? (
          <div className="p-6 text-center text-gray-500 bg-gray-50 rounded-lg border">لا توجد توقيعات حتى الآن.</div>
        ) : rows.map(r => (
          <div key={r.id} className={`rounded-lg border p-3 ${r.archived ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-100'}`}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded">{r.actionType === 'maintenance' ? 'صيانة شاملة' : 'فحص يومي'}</span>
              <span className="text-[10px] text-gray-400" dir="ltr">{r.at ? formatDisplayDateTime(r.at) : formatDisplayDate(r.date)}</span>
            </div>
            <div className="text-sm font-bold text-gray-800" dir="ltr">{r.extNumber}</div>
            <div className="text-xs text-gray-600 mt-1">{r.location} - {r.condition}</div>
            <div className="text-xs text-gray-500 mt-1">المنفذ: {r.byUserName || '-'}</div>
            {r.remarks && <div className="text-xs text-gray-600 mt-2 bg-gray-50 border rounded p-2">{r.remarks}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function ArchiveCenter({ extinguishers, setExtinguishers, users, setUsers, db, fbUser, appId, logAction, currentUser }) {
  if (!(currentUser.role === 'developer' || currentUser.role === 'father')) return <div className="p-8 text-center text-red-500">عذراً، ليس لديك صلاحية.</div>;

  const archivedExts = useMemo(() => extinguishers.filter(e => e.archived), [extinguishers]);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const canManageAll = currentUser.role === 'developer';

  const restoreOneExt = (ext) => {
    setExtinguishers(prev => prev.map(e => e.id === ext.id ? { ...e, archived: false } : e));
    routeWrite(db, fbUser, appId, 'extinguishers', ext.id, { ...ext, archived: false });
    logAction('استعادة مؤرشف', `استعادة الطفاية ${ext.number}`);
  };

  const restoreAllExts = () => {
    if (archivedExts.length === 0) return;
    setExtinguishers(prev => prev.map(e => e.archived ? { ...e, archived: false } : e));
    archivedExts.forEach(ext => routeWrite(db, fbUser, appId, 'extinguishers', ext.id, { ...ext, archived: false }));
    logAction('استعادة مؤرشف', `تم استعادة ${archivedExts.length} طفاية مؤرشفة.`);
  };

  const deleteOneArchivedExt = (ext) => {
    if (currentUser.role !== 'developer') return;
    setExtinguishers(prev => prev.filter(e => e.id !== ext.id));
    routeDelete(db, fbUser, appId, 'extinguishers', ext.id);
    logAction('حذف من الأرشيف', `حذف الطفاية ${ext.number} نهائياً من الأرشيف.`);
  };

  const deleteAllArchivedExts = () => {
    if (!canManageAll || archivedExts.length === 0) return;
    setExtinguishers(prev => prev.filter(e => !e.archived));
    archivedExts.forEach(ext => routeDelete(db, fbUser, appId, 'extinguishers', ext.id));
    logAction('حذف من الأرشيف', `تم حذف ${archivedExts.length} طفاية نهائياً من الأرشيف.`);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-xl font-bold text-gray-800 flex items-center"><Archive className="w-5 h-5 ml-2 text-gray-700"/> أرشيف الطفايات</h2>
          {canManageAll && (
            <div className="flex items-center gap-2">
              <button onClick={restoreAllExts} disabled={archivedExts.length === 0} className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50">استعادة الكل ({archivedExts.length})</button>
              <button onClick={() => setConfirmDialog({ title: 'حذف الكل', message: `سيتم حذف (${archivedExts.length}) طفاية مؤرشفة نهائياً. هل أنت متأكد؟`, action: deleteAllArchivedExts, isDestructive: true })} disabled={archivedExts.length === 0} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50">حذف الكل</button>
            </div>
          )}
        </div>
        {archivedExts.length === 0 ? <div className="text-sm text-gray-500 bg-gray-50 border rounded-lg p-3">لا توجد طفايات مؤرشفة.</div> : (
          <div className="space-y-2">{archivedExts.map(ext => (
            <div key={ext.id} className="flex items-center justify-between bg-gray-50 border rounded-lg p-3">
              <div>
                <div className="font-bold text-gray-800" dir="ltr">{ext.number}</div>
                <div className="text-xs text-gray-500">{ext.location} - {ext.type} {ext.size}</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => restoreOneExt(ext)} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-bold">استعادة</button>
                {currentUser.role === 'developer' && (
                  <button onClick={() => setConfirmDialog({ title: 'حذف نهائي', message: `سيتم حذف ${ext.number} نهائياً من الأرشيف. هل أنت متأكد؟`, action: () => deleteOneArchivedExt(ext), isDestructive: true })} className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3 py-1.5 rounded text-xs font-bold flex items-center">
                    <Trash2 className="w-3 h-3 ml-1" /> حذف
                  </button>
                )}
              </div>
            </div>
          ))}</div>
        )}
      </div>

      {confirmDialog && (
        <CustomConfirmModal
          title={confirmDialog.title}
          message={confirmDialog.message}
          isDestructive={confirmDialog.isDestructive}
          onConfirm={confirmDialog.action}
          onClose={() => setConfirmDialog(null)}
        />
      )}

    </div>
  );
}

// 10. إعدادات المطور
function DeveloperSettings({ locationTree, setLocationTree, onRenameLocation, contacts, auditLogs, setAuditLogs, extinguishers, setExtinguishers, users, setUsers, db, fbUser, appId, logAction, currentUser, siteSettings, setSiteSettings, topLevelLocations }) {
  const [confirmDialog, setConfirmDialog] = useState(null); 
  const [bulkData, setBulkData] = useState({ startNum: 1, endNum: 10, type: 'Powder', size: '6Kg', mainLocation: topLevelLocations[0] || '', subLocation: '' });
  const [siteForm, setSiteForm] = useState({ name: siteSettings?.name || '', logoUrl: siteSettings?.logoUrl || '' });
  const [siteSaved, setSiteSaved] = useState(false);

  const handleSaveSiteForm = () => {
    if (!siteForm.name.trim()) return;
    setSiteSettings({ name: siteForm.name.trim(), logoUrl: siteForm.logoUrl.trim() });
    logAction('تعديل إعدادات الموقع', `تم تغيير اسم الموقع إلى "${siteForm.name.trim()}"`);
    setSiteSaved(true);
    setTimeout(() => setSiteSaved(false), 2500);
  };

  const archivedExtinguishers = useMemo(() => extinguishers.filter(e => e.archived), [extinguishers]);
  const archivedUsers = useMemo(() => users.filter(u => u.archived), [users]);

  const restoreOneUser = (u) => {
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, archived: false } : x));
    routeWrite(db, fbUser, appId, 'users', u.id, { ...u, archived: false });
    logAction('استعادة مؤرشف', `استعادة المستخدم ${u.name}`);
  };

  const restoreAllUsers = () => {
    if (archivedUsers.length === 0) return;
    setUsers(prev => prev.map(u => u.archived ? { ...u, archived: false } : u));
    archivedUsers.forEach(u => routeWrite(db, fbUser, appId, 'users', u.id, { ...u, archived: false }));
    logAction('استعادة مؤرشف', `تم استعادة ${archivedUsers.length} مستخدم مؤرشف.`);
  };

  if (currentUser.role !== 'developer') return <div className="p-8 text-center text-red-500">خاص بالمطورين فقط.</div>;

  const executeWipeData = () => {
    setExtinguishers([]);
    extinguishers.forEach(ext => routeDelete(db, fbUser, appId, 'extinguishers', ext.id));
    logAction('تهيئة النظام', 'تم مسح قاعدة بيانات الطفايات بالكامل.');
  };

  const executeClearPerformanceLogs = () => {
    setAuditLogs([]);
    auditLogs.forEach(log => routeDelete(db, fbUser, appId, 'auditLogs', log.id));
    logAction('تصفير سجل الإنجاز', 'تم تصفير جميع سجلات الإنجاز لكل المستخدمين.');
  };

  const handleBulkAdd = () => {
    const startNum = Number(bulkData.startNum);
    const endNum = Number(bulkData.endNum);
    if (startNum <= 0 || endNum < startNum || endNum - startNum > 500) return; 

    const d = new Date();
    const todayStr = d.toISOString().split('T')[0];
    const nextDateStr = calculateNextDate(todayStr);
    const status = calculateStatus(nextDateStr, todayStr);

    const locationPath = bulkData.subLocation ? `${bulkData.mainLocation} / ${bulkData.subLocation}` : bulkData.mainLocation;
    const newExts = [];
    for (let n = startNum; n <= endNum; n++) {
      const formattedNum = `EXT-${String(n).padStart(3, '0')}`;
      const newId = Date.now() + n + Math.floor(Math.random() * 1000); 
      
      newExts.push({
        id: newId,
        number: formattedNum,
        size: bulkData.size,
        type: bulkData.type,
        location: locationPath,
        lastDate: todayStr,
        nextDate: nextDateStr,
        lastInspection: todayStr,
        status: status,
        notes: '',
        inCabinet: false
      });
    }

    setExtinguishers(prev => [...prev, ...newExts]);
    newExts.forEach(ext => routeWrite(db, fbUser, appId, 'extinguishers', ext.id, ext));
    
    logAction('إضافة جماعية', `تم إنشاء ${endNum - startNum + 1} طفاية جديدة بأرقام EXT-${String(startNum).padStart(3, '0')} إلى EXT-${String(endNum).padStart(3, '0')} في ${locationPath}.`);
  };

  const qualityChecks = useMemo(() => {
    const activeExts = extinguishers.filter(e => !e.archived);
    const activeUsers = users.filter(u => !u.archived);

    const numberCount = new Map();
    activeExts.forEach(e => numberCount.set(e.number, (numberCount.get(e.number) || 0) + 1));
    const duplicateExtNumbers = [...numberCount.entries()].filter(([, count]) => count > 1).map(([num]) => num);

    const invalidExtData = activeExts.filter(e => !e.number || !e.type || !e.size || !e.location || !e.lastDate).map(e => e.number || `ID:${e.id}`);

    const usernameCount = new Map();
    activeUsers.forEach(u => {
      const key = normalizeUsername(u.username);
      usernameCount.set(key, (usernameCount.get(key) || 0) + 1);
    });
    const duplicateUsernames = [...usernameCount.entries()].filter(([k, count]) => k && count > 1).map(([k]) => k);

    const invalidPhones = (contacts || []).filter(c => !/^0\d{10}$/.test(String(c.phone || '').trim())).map(c => `${c.name}: ${c.phone}`);

    return { duplicateExtNumbers, invalidExtData, duplicateUsernames, invalidPhones };
  }, [extinguishers, users, contacts]);

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-10">
      <h2 className="text-2xl font-bold text-gray-800 border-b pb-4 flex items-center"><Settings className="w-6 h-6 ml-2 text-red-600"/> إعدادات النظام الأساسية (للمطور)</h2>

      {/* 0. هوية الموقع */}
      <div className="bg-white rounded-xl shadow-sm border border-indigo-200 p-5">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center"><Edit className="w-5 h-5 ml-2 text-indigo-600"/> هوية الموقع (الاسم والصورة)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">اسم الموقع</label>
            <input
              type="text"
              className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              value={siteForm.name}
              onChange={e => setSiteForm(f => ({ ...f, name: e.target.value }))}
              placeholder="مثال: مسجد الموسوي الكبير"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">رابط صورة الشعار (URL)</label>
            <input
              type="url"
              className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              value={siteForm.logoUrl}
              onChange={e => setSiteForm(f => ({ ...f, logoUrl: e.target.value }))}
              placeholder="https://..."
            />
          </div>
        </div>
        {siteForm.logoUrl && (
          <div className="mb-4 flex items-center gap-3">
            <span className="text-xs text-gray-500">معاينة الصورة:</span>
            <img src={siteForm.logoUrl} alt="معاينة" className="w-12 h-12 rounded-full border border-gray-200 object-cover bg-gray-100" onError={e => { e.target.style.display='none'; }} />
          </div>
        )}
        <button
          onClick={handleSaveSiteForm}
          disabled={!siteForm.name.trim()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50"
        >
          {siteSaved ? '✓ تم الحفظ!' : 'حفظ التغييرات'}
        </button>
      </div>

      <details className="bg-white rounded-xl shadow-sm border border-gray-200 p-4" open>
        <summary className="cursor-pointer select-none text-lg font-bold text-gray-800 flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-700" />
          قسم فريق العمل
        </summary>
        <div className="mt-4">
          <UsersList users={users} setUsers={setUsers} currentUser={currentUser} logAction={logAction} db={db} fbUser={fbUser} appId={appId} />
        </div>
      </details>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h3 className="text-lg font-bold text-gray-800 flex items-center"><Users className="w-5 h-5 ml-2 text-gray-700"/> أرشيف الحسابات</h3>
          <button onClick={restoreAllUsers} disabled={archivedUsers.length === 0} className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50">استعادة الكل ({archivedUsers.length})</button>
        </div>
        {archivedUsers.length === 0 ? <div className="text-sm text-gray-500 bg-gray-50 border rounded-lg p-3">لا توجد حسابات مؤرشفة.</div> : (
          <div className="space-y-2">{archivedUsers.map(u => (
            <div key={u.id} className="flex items-center justify-between bg-gray-50 border rounded-lg p-3">
              <div>
                <div className="font-bold text-gray-800">{u.name}</div>
                <div className="text-xs text-gray-500" dir="ltr">{u.username}</div>
              </div>
              <button onClick={() => restoreOneUser(u)} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-bold">استعادة</button>
            </div>
          ))}</div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-cyan-200 p-5">
        <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center"><ShieldCheck className="w-5 h-5 ml-2 text-cyan-600"/> تدقيق جودة البيانات</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between bg-cyan-50 border border-cyan-100 rounded-lg p-2.5"><span>أرقام طفايات مكررة</span><span className="font-bold">{qualityChecks.duplicateExtNumbers.length}</span></div>
          <div className="flex justify-between bg-cyan-50 border border-cyan-100 rounded-lg p-2.5"><span>بيانات طفايات ناقصة</span><span className="font-bold">{qualityChecks.invalidExtData.length}</span></div>
          <div className="flex justify-between bg-cyan-50 border border-cyan-100 rounded-lg p-2.5"><span>أسماء مستخدمين مكررة</span><span className="font-bold">{qualityChecks.duplicateUsernames.length}</span></div>
          <div className="flex justify-between bg-cyan-50 border border-cyan-100 rounded-lg p-2.5"><span>أرقام هواتف غير صالحة</span><span className="font-bold">{qualityChecks.invalidPhones.length}</span></div>
        </div>

        {(qualityChecks.duplicateExtNumbers.length + qualityChecks.invalidExtData.length + qualityChecks.duplicateUsernames.length + qualityChecks.invalidPhones.length) > 0 && (
          <div className="mt-3 text-xs text-gray-600 leading-6 bg-gray-50 border rounded-lg p-3">
            {qualityChecks.duplicateExtNumbers.length > 0 && <div>تكرار أرقام الطفايات: {qualityChecks.duplicateExtNumbers.join('، ')}</div>}
            {qualityChecks.invalidExtData.length > 0 && <div>طفايات ناقصة البيانات: {qualityChecks.invalidExtData.join('، ')}</div>}
            {qualityChecks.duplicateUsernames.length > 0 && <div>أسماء المستخدمين المكررة: {qualityChecks.duplicateUsernames.join('، ')}</div>}
            {qualityChecks.invalidPhones.length > 0 && <div>هواتف غير صالحة: {qualityChecks.invalidPhones.join(' | ')}</div>}
          </div>
        )}
      </div>

      {/* 1. الإضافة الجماعية */}
      <div className="bg-white rounded-xl shadow-sm border border-purple-200 p-5 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-2 bg-purple-500 h-full"></div>
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center"><CopyPlus className="w-5 h-5 ml-2 text-purple-600"/> مشغل الأوامر (الإضافة الجماعية)</h3>
        <p className="text-sm text-gray-600 mb-4">تقوم هذه الأداة بإنشاء طفايات بنطاق أرقام محدد في موقع معين دفعة واحدة.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">من الرقم</label>
            <input type="number" min="1" className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" value={bulkData.startNum} onChange={e => setBulkData({...bulkData, startNum: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">إلى الرقم</label>
            <input type="number" min="1" className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" value={bulkData.endNum} onChange={e => setBulkData({...bulkData, endNum: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">النوع</label>
            <select className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" value={bulkData.type} onChange={e => setBulkData({...bulkData, type: e.target.value})}>
              <option value="Powder">بودرة</option><option value="CO2">CO2</option><option value="Foam">رغوة</option><option value="Water">ماء</option><option value="Ceiling">سقفية</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">الحجم</label>
            <SizeDropdown value={bulkData.size} onChange={v => setBulkData({...bulkData, size: v})} type={bulkData.type} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">الموقع الأساسي</label>
            <select className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" value={bulkData.mainLocation} onChange={e => setBulkData({...bulkData, mainLocation: e.target.value, subLocation: ''})}>
              {topLevelLocations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">الموقع الفرعي (اختياري)</label>
            <select className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" value={bulkData.subLocation} onChange={e => setBulkData({...bulkData, subLocation: e.target.value})}>
              <option value="">بدون موقع فرعي</option>
              {(locationTree.find(n => n.name === bulkData.mainLocation)?.children || []).map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>
        </div>
        <button 
          onClick={() => {
            const qty = Number(bulkData.endNum) - Number(bulkData.startNum) + 1;
            const locStr = bulkData.subLocation ? `${bulkData.mainLocation} / ${bulkData.subLocation}` : bulkData.mainLocation;
            setConfirmDialog({ title: 'تأكيد الإضافة الجماعية', message: `سيتم الآن إنشاء (${qty}) طفاية جديدة بأرقام EXT-${String(bulkData.startNum).padStart(3, '0')} إلى EXT-${String(bulkData.endNum).padStart(3, '0')} في "${locStr}". هل أنت متأكد؟`, action: handleBulkAdd, isDestructive: false });
          }} 
          className="w-full md:w-auto bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-2.5 rounded-lg transition-colors shadow-md"
        >
          تنفيذ الإضافة الجماعية الآن
        </button>
      </div>

      {/* 2. إدارة المواقع - شجرة هرمية */}
      <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-5">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center"><MapPin className="w-5 h-5 ml-2 text-blue-600"/> إدارة المواقع (شجرة هرمية)</h3>
        <p className="text-sm text-gray-600 mb-4">يمكنك إضافة وتعديل وحذف المواقع والمواقع الفرعية بكل سهولة. قم بالتمرير فوق أي موقع لتظهر أزرار الإجراءات.</p>
        <LocationTreeManager
          tree={locationTree}
          onChange={setLocationTree}
          onRenameLocation={onRenameLocation}
        />
      </div>

      {/* 3. أدوات الخطر */}
      <div className="bg-white rounded-xl shadow-sm border border-red-200 p-5">
        <h3 className="text-lg font-bold text-red-700 mb-4 flex items-center"><DatabaseBackup className="w-5 h-5 ml-2"/>إدارة البيانات</h3>
        
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-center justify-between bg-red-50 p-4 rounded-lg border border-red-100">
            <div>
              <p className="font-bold text-gray-800">تصفير سجلات الإنجاز</p>
              <p className="text-xs text-gray-600 mt-1">مسح كل سجلات متابعة الإنجاز لجميع المستخدمين ({auditLogs.length} سجل حالياً).</p>
            </div>
            <button onClick={() => setConfirmDialog({ title: 'تصفير سجلات الإنجاز', message: 'سيتم مسح جميع سجلات الإنجاز لكل المستخدمين نهائياً. هل تريد المتابعة؟', action: executeClearPerformanceLogs, isDestructive: true })} disabled={auditLogs.length === 0} className="w-full sm:w-auto mt-3 sm:mt-0 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50">
              تصفير السجلات
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between bg-red-100 p-4 rounded-lg border border-red-300">
            <div>
              <p className="font-bold text-red-900">إعادة ضبط المصنع (مسح الطفايات)</p>
              <p className="text-xs text-red-700 mt-1">يحذف جميع الطفايات المسجلة نهائياً للبدء من جديد.</p>
            </div>
            <button onClick={() => setConfirmDialog({ title: 'مسح الطفايات!', message: 'تحذير خطير: هل أنت متأكد من مسح جميع بيانات الطفايات؟ لا يمكن التراجع عن هذه الخطوة!', action: executeWipeData, isDestructive: true })} disabled={extinguishers.length === 0} className="w-full sm:w-auto mt-3 sm:mt-0 bg-red-800 hover:bg-red-900 text-white px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50">
              مسح كل البيانات!
            </button>
          </div>
        </div>
      </div>

      {confirmDialog && (
        <CustomConfirmModal 
          title={confirmDialog.title} 
          message={confirmDialog.message} 
          isDestructive={confirmDialog.isDestructive} 
          onConfirm={confirmDialog.action} 
          onClose={() => setConfirmDialog(null)} 
        />
      )}

    </div>
  );
}