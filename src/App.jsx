import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ShieldAlert, ShieldCheck, AlertTriangle, LogOut, Plus, FileText, 
  Settings, LayoutDashboard, FireExtinguisher, Search, Users,
  CheckCircle, XCircle, ClipboardList, ArrowRightLeft, Archive, Edit, Filter,
  UserPlus, Trash2, Phone, Menu, X, MapPin, DatabaseBackup, Loader2, Calendar,
  CopyPlus, Target, Activity, History
} from 'lucide-react';

import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot, enableIndexedDbPersistence, writeBatch } from 'firebase/firestore';

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
    db = getFirestore(app);
    try { enableIndexedDbPersistence(db).catch(() => {}); } catch(e) {}
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

const initialLocations = ['مسجد البصرة', 'موكب كربلاء', 'موكب النجف', 'موكب سامراء', 'المشاية'];

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

  const policy = inspectionPolicies.find(p => p.location === ext.location);
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

const initialExtinguishers = [
  { id: 1, number: 'EXT-001', size: '6Kg', type: 'Powder', location: 'مسجد البصرة', subLocation: 'الطابق الأول', lastDate: d1MonthAgo, nextDate: calculateNextDate(d1MonthAgo), lastInspection: dToday, status: 'صالحة', notes: 'يوجد خدش بسيط', inCabinet: true, archived: false },
  { id: 2, number: 'EXT-002', size: '12Kg', type: 'CO2', location: 'موكب كربلاء', subLocation: 'المطبخ الرئيسي', lastDate: d8MonthsAgo, nextDate: calculateNextDate(d8MonthsAgo), lastInspection: dToday, status: 'تحتاج صيانة', notes: 'منتهية الصلاحية', inCabinet: false, archived: false },
  { id: 3, number: 'EXT-003', size: '6Kg', type: 'Foam', location: 'موكب النجف', subLocation: '', lastDate: d1MonthAgo, nextDate: calculateNextDate(d1MonthAgo), lastInspection: d1MonthAgo, status: 'تحتاج فحص', notes: 'لم تفحص اليوم', inCabinet: false, archived: false },
];

export default function App() {
  const [currentUser, setCurrentUser] = useLocalStorage('fireTracker_user', null);
  const currentUserRef = useRef(currentUser);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);

  const [currentView, setCurrentView] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [fbUser, setFbUser] = useState(null);

  // استخدام useState للبيانات لتجنب تضارب التخزين المحلي مع فايربيس
  const [extinguishers, setExtinguishers] = useState([]);
  const [users, setUsers] = useState(initialUsers);
  const [auditLogs, setAuditLogs] = useState([]);
  const [contacts, setContacts] = useState(initialContacts);
  const [locations, setLocations] = useState(initialLocations);
  const [inspectionPolicies, setInspectionPolicies] = useState(initialInspectionPolicies);
  const [siteSettings, setSiteSettings] = useState({ name: 'مسجد الموسوي الكبير', logoUrl: 'https://preview.redd.it/%D9%85%D8%B3%D8%AC%D8%AF-%D8%A7%D9%84%D9%85%D9%88%D8%B3%D9%88%D9%8A-%D8%A7%D9%84%D9%83%D8%A8%D9%8A%D8%B1-%D9%81%D9%8A-%D8%A7%D9%84%D8%A8%D8%B5%D8%B1%D8%A9-v0-pbunk76bws571.jpg?width=640&crop=smart&auto=webp&s=dcef5b80db948e2e6789f5bfe95f09703af9e6d1' });

  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => { try { await signInAnonymously(auth); } catch (e) {} };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setFbUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!fbUser || !db) return;

    const unsubExt = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'extinguishers'), (snap) => {
      if (snap.empty) { 
        const batch = writeBatch(db);
        initialExtinguishers.forEach(ext => batch.set(doc(db, 'artifacts', appId, 'public', 'data', 'extinguishers', String(ext.id)), ext));
        batch.commit().catch(()=>{});
      } 
      else {
        setExtinguishers(snap.docs.map(d => {
          const data = d.data();
          const recalculatedStatus = calculateStatus(data.nextDate, data.lastInspection || data.lastDate);
          return {
            ...data,
            archived: Boolean(data.archived),
            status: data.status === 'تحتاج صيانة' ? 'تحتاج صيانة' : recalculatedStatus
          };
        }));
      }
    }, console.error);

    const unsubUsers = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'users'), (snap) => {
      if (snap.empty) { 
        const batch = writeBatch(db);
        initialUsers.forEach(u => batch.set(doc(db, 'artifacts', appId, 'public', 'data', 'users', String(u.id)), u));
        batch.commit().catch(()=>{});
      }
      else {
        const updatedUsers = snap.docs.map(d => ({ ...d.data(), archived: Boolean(d.data().archived) }));
        setUsers(updatedUsers);
        if (currentUserRef.current) {
          const stillExists = updatedUsers.some(u => String(u.id) === String(currentUserRef.current.id) && !u.archived);
          if (!stillExists) setCurrentUser(null);
        }
      }
    }, console.error);

    const unsubLogs = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'auditLogs'), (snap) => {
      setAuditLogs(snap.docs.map(d => d.data()).sort((a,b) => b.id - a.id));
    }, console.error);

    const unsubContacts = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'app_data', 'contacts'), (snap) => {
      if (snap.exists()) setContacts(snap.data().list || []);
      else setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'app_data', 'contacts'), { list: initialContacts });
    }, console.error);

    const unsubLocs = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'app_data', 'locations'), (snap) => {
      if (snap.exists()) setLocations(snap.data().list || []);
      else setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'app_data', 'locations'), { list: initialLocations });
    }, console.error);

    const unsubPolicies = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'app_data', 'inspectionPolicies'), (snap) => {
      if (snap.exists()) setInspectionPolicies(snap.data().list || []);
      else setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'app_data', 'inspectionPolicies'), { list: initialInspectionPolicies });
    }, console.error);

    const unsubSiteSettings = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'app_data', 'siteSettings'), (snap) => {
      if (snap.exists()) setSiteSettings(snap.data());
    }, console.error);

    return () => { unsubExt(); unsubUsers(); unsubLogs(); unsubContacts(); unsubLocs(); unsubPolicies(); unsubSiteSettings(); };
  }, [fbUser, appId]);

  const logAction = (action, details) => {
    const d = new Date();
    const dateString = d.toLocaleString('ar-EG');
    const dayString = d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'numeric', day: 'numeric' });
    
    const newLog = { 
      id: Date.now(), 
      date: dateString, 
      dayStr: dayString, 
      userName: currentUser?.name || 'مجهول', 
      action, 
      details 
    };

    if (db && fbUser) setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'auditLogs', String(newLog.id)), newLog).catch(()=>{});
    else setAuditLogs(prev => [newLog, ...prev]);
  };

  const handleSaveContacts = (newContacts) => {
    if (db && fbUser) setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'app_data', 'contacts'), { list: newContacts }).catch(()=>{});
    else setContacts(newContacts);
  };

  const handleSaveLocations = (newLocations) => {
    if (db && fbUser) setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'app_data', 'locations'), { list: newLocations }).catch(()=>{});
    else setLocations(newLocations);
  };

  const handleSaveSiteSettings = (newSettings) => {
    setSiteSettings(newSettings);
    if (db && fbUser) setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'app_data', 'siteSettings'), newSettings).catch(()=>{});
  };

  const navigateTo = (view) => {
    setCurrentView(view);
    setIsMobileMenuOpen(false);
  };

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

  return (
    <div className="bg-gray-50 flex flex-col md:flex-row font-sans text-right min-h-screen md:h-screen md:overflow-hidden" dir="rtl">
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 md:hidden transition-opacity" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      <aside className={`fixed inset-y-0 right-0 z-50 w-64 bg-red-800 text-white flex flex-col shadow-2xl transform transition-transform duration-300 md:relative md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
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
            <button onClick={() => setCurrentUser(null)} className="flex items-center justify-center w-full p-2.5 text-red-200 hover:text-white bg-red-900/50 hover:bg-red-700 rounded-lg transition-colors mb-5 font-medium">
              <LogOut className="w-5 h-5 ml-2" /> تسجيل الخروج
            </button>
            <div className="text-center border-t border-red-700/50 pt-4 w-full">
              <p className="text-[11px] text-red-200 font-medium">© 2026<br/>جميع الحقوق محفوظة.</p>
              <p className="text-[10px] text-red-300/80 mt-1 font-mono">Developed by <a href="https://abnmazin.engineer" target="_blank" rel="noreferrer" className="font-bold text-white opacity-100 hover:underline">abnmazin.engineer</a></p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 md:h-screen overflow-hidden">
        <header className="md:hidden bg-red-800 text-white p-4 flex justify-between items-center shadow-md shrink-0 relative z-10">
          <div className="flex items-center gap-3">
            <img src={siteSettings.logoUrl} alt="شعار" className="w-10 h-10 rounded-full border border-red-200 object-cover bg-white shadow-sm" />
            <div>
              <h1 className="text-lg font-bold">{siteSettings.name}</h1>
            </div>
          </div>
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-1 hover:bg-red-700 rounded-lg transition-colors"><Menu className="w-7 h-7" /></button>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-y-auto w-full max-w-full relative z-0 bg-gray-50">
          {currentView === 'dashboard' && <Dashboard extinguishers={extinguishers} contacts={contacts} setContacts={handleSaveContacts} user={currentUser} locations={locations} inspectionPolicies={inspectionPolicies} />}
          {currentView === 'list' && <ExtinguishersList extinguishers={extinguishers} setExtinguishers={setExtinguishers} user={currentUser} logAction={logAction} db={db} fbUser={fbUser} appId={appId} locations={locations} contacts={contacts} inspectionPolicies={inspectionPolicies} />}
          {currentView === 'users' && <UsersList users={users} setUsers={setUsers} currentUser={currentUser} logAction={logAction} db={db} fbUser={fbUser} appId={appId} />}
          {currentView === 'performance' && <PerformanceReport auditLogs={auditLogs} userRole={currentUser.role} db={db} fbUser={fbUser} appId={appId} setAuditLogs={setAuditLogs} />}
          {currentView === 'inspectionPolicy' && <InspectionPolicyCenter locations={locations} inspectionPolicies={inspectionPolicies} setInspectionPolicies={setInspectionPolicies} db={db} fbUser={fbUser} appId={appId} logAction={logAction} currentUser={currentUser} />}
          {currentView === 'archive' && <ArchiveCenter extinguishers={extinguishers} setExtinguishers={setExtinguishers} users={users} setUsers={setUsers} db={db} fbUser={fbUser} appId={appId} logAction={logAction} currentUser={currentUser} />}
          {currentView === 'settings' && <DeveloperSettings locations={locations} setLocations={handleSaveLocations} contacts={contacts} auditLogs={auditLogs} setAuditLogs={setAuditLogs} extinguishers={extinguishers} setExtinguishers={setExtinguishers} users={users} setUsers={setUsers} db={db} fbUser={fbUser} appId={appId} logAction={logAction} currentUser={currentUser} siteSettings={siteSettings} setSiteSettings={handleSaveSiteSettings} />}
        </main>
      </div>
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

function LoginScreen({ onLogin, users, siteSettings }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    const user = users.find(u => !u.archived && u.username.toLowerCase() === username.toLowerCase() && u.password === password);
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
          <p className="text-[10px] text-gray-400 mt-1 font-mono">Developed by <a href="https://abnmazin.engineer" target="_blank" rel="noreferrer" className="font-bold text-gray-600 hover:underline">abnmazin.engineer</a></p>
        </div>
      </div>
    </div>
  );
}

function Dashboard({ extinguishers, contacts, setContacts, user, inspectionPolicies }) {
  const [showContactsModal, setShowContactsModal] = useState(false);
  const extWithStatus = useMemo(() => extinguishers.map(e => ({ ...e, status: resolveExtinguisherStatus(e, inspectionPolicies) })), [extinguishers, inspectionPolicies]);
  const stats = useMemo(() => ({
    total: extWithStatus.length,
    valid: extWithStatus.filter(e => e.status === 'صالحة').length,
    warning: extWithStatus.filter(e => e.status === 'فحص قريب' || e.status === 'تحتاج فحص').length,
    expired: extWithStatus.filter(e => e.status === 'تحتاج صيانة' || e.status === 'منتهية').length,
  }), [extWithStatus]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl md:text-2xl font-bold text-gray-800">نظرة عامة</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard title="إجمالي الطفايات" count={stats.total} icon={FireExtinguisher} color="bg-blue-500" />
        <StatCard title="صالحة للعمل" count={stats.valid} icon={ShieldCheck} color="bg-green-500" />
        <StatCard title="تنبيهات الفحص" count={stats.warning} icon={AlertTriangle} color="bg-yellow-500" />
        <StatCard title="تحتاج صيانة" count={stats.expired} icon={ShieldAlert} color="bg-red-600" />
      </div>

      <div className="bg-white rounded-xl shadow p-4 md:p-6 border border-gray-100">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center"><AlertTriangle className="w-5 h-5 ml-2 text-red-500" />تتطلب انتباهاً عاجلاً</h3>
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-right min-w-[300px]">
            <thead><tr className="border-b text-gray-500 text-sm"><th className="p-3">الرقم</th><th className="p-3">الموقع</th><th className="p-3">الحالة</th></tr></thead>
            <tbody>
              {extWithStatus.filter(e => e.status !== 'صالحة').map(ext => (
                <tr key={ext.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium text-sm">{ext.number}</td>
                  <td className="p-3 text-gray-600 text-sm">{ext.location}{ext.subLocation && <span className="text-xs text-gray-400 mr-2">({ext.subLocation})</span>}</td>
                  <td className="p-3"><span className={`px-2 py-1 rounded-full text-[10px] md:text-xs font-bold whitespace-nowrap ${ext.status.includes('صيانة') ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>{ext.status}</span></td>
                </tr>
              ))}
              {extWithStatus.filter(e => e.status !== 'صالحة').length === 0 && <tr><td colSpan="3" className="p-4 text-center text-green-600 font-medium text-sm">جميع الطفايات بحالة جيدة حالياً!</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="md:hidden flex flex-col gap-3">
          {extWithStatus.filter(e => e.status !== 'صالحة').map(ext => (
            <div key={ext.id} className="bg-gray-50 border border-gray-100 rounded-lg p-3 flex justify-between items-center">
              <div><div className="font-bold text-gray-800 text-sm">{ext.number}</div><div className="text-xs text-gray-500 mt-1">{ext.location}{ext.subLocation && <span className="block text-gray-400 text-[10px]">{ext.subLocation}</span>}</div></div>
              <span className={`px-2 py-1 rounded-full text-[10px] font-bold whitespace-nowrap ${ext.status.includes('صيانة') ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>{ext.status}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-4 md:p-6 mt-6 border border-gray-100">
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

function StatCard({ title, count, icon: Icon, color }) {
  return (
    <div className="bg-white rounded-xl shadow p-3 md:p-6 border border-gray-100 flex items-center"><div className={`${color} p-2 md:p-4 rounded-lg text-white ml-2 md:ml-4 shadow-sm`}><Icon className="w-5 h-5 md:w-6 md:h-6" /></div><div><h4 className="text-gray-500 text-[10px] md:text-sm font-medium">{title}</h4><p className="text-lg md:text-2xl font-bold text-gray-800">{count}</p></div></div>
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

function ExtinguishersList({ extinguishers, setExtinguishers, user, logAction, db, fbUser, appId, locations, inspectionPolicies }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterLocation, setFilterLocation] = useState('All');
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

  const filtered = extWithStatus
    .filter(e => {
      const searchLower = searchTerm.toLowerCase();
      return (e.number.toLowerCase().includes(searchLower) || e.location.includes(searchTerm) || (e.subLocation && e.subLocation.toLowerCase().includes(searchLower))) &&
             (filterType === 'All' || e.type === filterType) &&
             (filterLocation === 'All' || e.location === filterLocation) &&
             (quickStatusFilter === 'All' || e.status === quickStatusFilter);
    })
    .sort((a, b) => {
      const aHasNotes = Boolean(a.notes && String(a.notes).trim());
      const bHasNotes = Boolean(b.notes && String(b.notes).trim());
      if (aHasNotes !== bHasNotes) return aHasNotes ? -1 : 1;
      return String(a.number).localeCompare(String(b.number), undefined, { numeric: true, sensitivity: 'base' });
    });

  const handleAddExtinguisher = (newExt) => {
    const newId = activeExtinguishers.length ? Math.max(...activeExtinguishers.map(e=>Number(e.id))) + 1 : 1;
    const extWithDates = { ...newExt, id: newId, nextDate: calculateNextDate(newExt.lastDate), lastInspection: newExt.lastDate, status: calculateStatus(calculateNextDate(newExt.lastDate), newExt.lastDate), archived: false };
    if (db && fbUser) setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'extinguishers', String(newId)), extWithDates).catch(()=>{});
    else setExtinguishers(prev => [...prev, extWithDates]);
    setShowAddModal(false);
    logAction('إضافة طفاية', `إضافة طفاية ${newExt.number} في ${newExt.location}`);
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
      batch.commit().catch(()=>{});
    }

    const actionName = isMaintenance ? 'صيانة شاملة' : 'فحص يومي';
    const numbers = extsToUpdate.map(e=>e.number).join('، ');
    logAction(actionName, `تم تنفيذ ${actionName} لـ (${extsToUpdate.length}) طفايات: ${numbers} بنتيجة: ${condition}`);
    setActionModalData(null);
    setSelectedIds([]);
  };

  const handleEdit = (updatedExt) => {
    const extWithDates = { ...updatedExt, nextDate: calculateNextDate(updatedExt.lastDate), status: calculateStatus(calculateNextDate(updatedExt.lastDate), updatedExt.lastInspection) };
    if (db && fbUser) setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'extinguishers', String(updatedExt.id)), extWithDates).catch(()=>{});
    else setExtinguishers(prev => prev.map(e => e.id === updatedExt.id ? extWithDates : e));
    logAction('تعديل طفاية', `تعديل بيانات الطفاية ${updatedExt.number}`);
    setEditModalData(null);
  };

  const handleTransfer = (extIds, newLocation) => {
    const extsToTransfer = activeExtinguishers.filter(e => extIds.includes(e.id));
    if (db && fbUser) {
      const batch = writeBatch(db);
      extsToTransfer.forEach(ext => batch.set(doc(db, 'artifacts', appId, 'public', 'data', 'extinguishers', String(ext.id)), { ...ext, location: newLocation }));
      batch.commit().catch(()=>{});
    } else { setExtinguishers(prev => prev.map(e => extIds.includes(e.id) ? { ...e, location: newLocation } : e)); }
    logAction(extIds.length > 1 ? 'ترحيل جماعي' : 'ترحيل طفاية', `نقل (${extsToTransfer.map(e=>e.number).join('، ')}) إلى ${newLocation}`);
    setTransferModalData(null); setSelectedIds([]); 
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    const extsToDelete = activeExtinguishers.filter(e => selectedIds.includes(e.id));
    if (db && fbUser) {
      const batch = writeBatch(db);
      extsToDelete.forEach(ext => batch.set(doc(db, 'artifacts', appId, 'public', 'data', 'extinguishers', String(ext.id)), { ...ext, archived: true }));
      batch.commit().catch(()=>{});
    } else { setExtinguishers(prev => prev.map(e => selectedIds.includes(e.id) ? { ...e, archived: true } : e)); }
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
    all: extWithStatus.length,
    dueInspection: extWithStatus.filter(e => e.status === 'تحتاج فحص').length,
    nearMaintenance: extWithStatus.filter(e => e.status === 'صيانة قريبة').length,
    needMaintenance: extWithStatus.filter(e => e.status === 'تحتاج صيانة').length,
  }), [extWithStatus]);

  const transferrableCount = filtered.filter(e => selectedIds.includes(e.id) && !e.inCabinet).length;

  return (
    <div className="space-y-4 pb-24">
      {/* شريط الأدوات والفلاتر */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100 relative z-20">
        <h2 className="text-xl font-bold text-gray-800">دليل الطفايات</h2>
        <div className="flex flex-col gap-3 w-full lg:w-auto">
          <div className="flex flex-row gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-36"><Filter className="w-4 h-4 absolute right-3 top-3 text-gray-400" /><select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-full pl-2 pr-8 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-xs sm:text-sm text-gray-600 appearance-none bg-gray-50"><option value="All">كل الأنواع</option><option value="Powder">بودرة</option><option value="CO2">CO2</option><option value="Foam">رغوة</option><option value="Water">ماء</option><option value="Ceiling">سقفية</option></select></div>
            <div className="relative flex-1 sm:w-36"><MapPin className="w-4 h-4 absolute right-3 top-3 text-gray-400" /><select value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)} className="w-full pl-2 pr-8 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-xs sm:text-sm text-gray-600 appearance-none bg-gray-50"><option value="All">الموقع (الكل)</option>{locations.map(loc => (<option key={loc} value={loc}>{loc}</option>))}</select></div>
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
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300">
          <div className="flex items-center gap-2 rounded-full bg-white border border-gray-200 shadow-2xl px-3 py-2">
            <span className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap">
              {selectedIds.length} محدد
            </span>
            <button onClick={() => setActionModalData(extinguishers.filter(e => selectedIds.includes(e.id)))} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full flex items-center justify-center transition-colors shadow-sm text-sm font-bold whitespace-nowrap">
              <Activity className="w-4 h-4 ml-1" /> إجراء جماعي
            </button>
            {canEdit && <button onClick={() => setTransferModalData(extinguishers.filter(e => selectedIds.includes(e.id) && !e.inCabinet))} disabled={transferrableCount === 0} className={`px-4 py-2 rounded-full flex items-center justify-center transition-colors shadow-sm text-sm font-bold whitespace-nowrap ${transferrableCount === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 text-white'}`}><ArrowRightLeft className="w-4 h-4 ml-1" /> ترحيل</button>}
            {canEdit && <button onClick={() => setConfirmDialog({ title: 'تأكيد الأرشفة', message: `هل أنت متأكد من رغبتك في أرشفة (${selectedIds.length}) طفاية؟`, action: handleBulkDelete, isDestructive: true })} className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-full flex items-center justify-center transition-colors shadow-sm text-sm font-bold whitespace-nowrap"><Archive className="w-4 h-4 ml-1" /> أرشفة</button>}
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
                <td className="p-3"><span className="bg-gray-200 px-2 py-1 rounded text-gray-700 text-xs">{ext.type}</span> {ext.size}</td><td className="p-3"><div className="text-gray-800">{ext.location}</div>{ext.subLocation && <div className="text-xs text-gray-500">{ext.subLocation}</div>}</td>
                <td className="p-3 text-gray-600 font-medium whitespace-nowrap">{ext.lastInspection || ext.lastDate}</td>
                <td className="p-3 text-gray-500 whitespace-nowrap">{ext.nextDate}</td>
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
              <div><span className="text-gray-400 block text-[10px] mb-0.5">الموقع</span><span className="font-medium text-gray-700">{ext.location}</span>{ext.subLocation && <span className="text-gray-500 text-[10px] block mt-0.5 bg-gray-200/50 px-1 rounded w-max">{ext.subLocation}</span>}</div>
              <div><span className="text-gray-400 block text-[10px] mb-0.5">آخر فحص يومي</span><span className="font-bold text-gray-700">{ext.lastInspection || ext.lastDate}</span></div>
              <div className="col-span-2 pt-2 border-t border-gray-200/60"><span className="text-gray-400 block text-[10px] mb-0.5">موعد الصيانة الشاملة القادم</span><span className="font-bold text-gray-800">{ext.nextDate}</span></div>
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
      {showAddModal && <AddExtinguisherModal onClose={() => setShowAddModal(false)} onAdd={handleAddExtinguisher} locations={locations} />}
      {actionModalData && <ActionModal exts={actionModalData} onClose={() => setActionModalData(null)} onSubmit={handleActionSubmit} userRole={user.role} />}
      {editModalData && <EditExtinguisherModal ext={editModalData} onClose={() => setEditModalData(null)} onEdit={handleEdit} locations={locations} />}
      {transferModalData && <TransferModal exts={transferModalData} onClose={() => setTransferModalData(null)} onSubmit={handleTransfer} locations={locations} />}
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
      setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'extinguishers', String(ext.id)), updatedExt).catch(()=>{});
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
                      <span className="text-xs text-gray-400" dir="ltr">{sig.at ? new Date(sig.at).toLocaleString('ar-EG') : sig.date}</span>
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

function AddExtinguisherModal({ onClose, onAdd, locations }) {
  const [formData, setFormData] = useState({ numPart: '', size: '6Kg', type: 'Powder', location: locations[0] || '', subLocation: '', lastDate: new Date().toISOString().split('T')[0], notes: '', inCabinet: false });
  const handleSubmit = (e) => { 
    e.preventDefault(); 
    const finalNumber = `EXT-${String(formData.numPart).padStart(3, '0')}`;
    onAdd({ ...formData, number: finalNumber }); 
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden my-auto">
        <div className="bg-red-600 text-white p-4 flex justify-between items-center"><h3 className="font-bold text-lg">إضافة طفاية مفردة</h3><button onClick={onClose} className="text-red-200 hover:text-white p-1">&times;</button></div>
        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">رقم الطفاية (أدخل الأرقام فقط)</label>
            <div className="flex border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-red-500 bg-gray-50" dir="ltr">
              <span className="bg-gray-200 text-gray-600 font-bold px-4 py-2 border-r border-gray-300 select-none">EXT-</span>
              <input required type="number" min="1" placeholder="001" className="w-full px-3 py-2 outline-none bg-transparent" value={formData.numPart} onChange={e => setFormData({...formData, numPart: e.target.value})} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm text-gray-600 mb-1">النوع</label><select className="w-full border p-2 rounded bg-gray-50 outline-none" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}><option value="Powder">بودرة</option><option value="CO2">CO2</option><option value="Foam">رغوة</option><option value="Water">ماء</option><option value="Ceiling">سقفية</option></select></div>
            <div><label className="block text-sm text-gray-600 mb-1">الحجم</label><input required type="text" className="w-full border p-2 rounded bg-gray-50 outline-none" value={formData.size} onChange={e => setFormData({...formData, size: e.target.value})} /></div>
          </div>
          <div><label className="block text-sm text-gray-600 mb-1">الموقع الرئيسي</label><select className="w-full border p-2 rounded bg-gray-50 outline-none" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})}>{locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}</select></div>
          <div><label className="block text-sm text-gray-600 mb-1">الموقع الفرعي (اختياري)</label><input type="text" className="w-full border p-2 rounded bg-gray-50 outline-none" value={formData.subLocation} onChange={e => setFormData({...formData, subLocation: e.target.value})} /></div>
          <div className="flex items-center gap-2 bg-gray-50 p-3 rounded border border-gray-200"><input type="checkbox" id="inCabinet" className="w-4 h-4 text-red-600 rounded" checked={formData.inCabinet} onChange={e => setFormData({...formData, inCabinet: e.target.checked})} /><label htmlFor="inCabinet" className="text-sm font-bold text-gray-700 cursor-pointer select-none">مثبتة داخل كابينة</label></div>
          <div><label className="block text-sm text-gray-600 mb-1">تاريخ الإنشاء / الصيانة</label><input required type="date" className="w-full border p-2 rounded bg-gray-50 outline-none" value={formData.lastDate} onChange={e => setFormData({...formData, lastDate: e.target.value})} /></div>
          <div className="pt-2 flex gap-2"><button type="submit" className="flex-1 bg-red-600 text-white py-2.5 rounded-lg font-bold hover:bg-red-700 shadow-md">حفظ</button><button type="button" onClick={onClose} className="flex-1 bg-gray-200 text-gray-800 py-2.5 rounded-lg font-bold hover:bg-gray-300">إلغاء</button></div>
        </form>
      </div>
    </div>
  );
}

function EditExtinguisherModal({ ext, onClose, onEdit, locations }) {
  const [formData, setFormData] = useState({ ...ext });
  const handleSubmit = (e) => { e.preventDefault(); onEdit(formData); };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden my-auto">
        <div className="bg-green-600 text-white p-4 flex justify-between items-center"><h3 className="font-bold text-lg">تعديل بيانات الطفاية</h3><button onClick={onClose} className="text-green-200 hover:text-white p-1">&times;</button></div>
        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
          <div><label className="block text-sm text-gray-600 mb-1">رقم الطفاية</label><input required type="text" className="w-full border p-2 rounded bg-gray-200 text-gray-600 font-bold outline-none cursor-not-allowed" value={formData.number} disabled dir="ltr" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm text-gray-600 mb-1">النوع</label><select className="w-full border p-2 rounded focus:ring-2 focus:ring-green-500 bg-gray-50 outline-none" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}><option value="Powder">بودرة</option><option value="CO2">CO2</option><option value="Foam">رغوة</option><option value="Water">ماء</option><option value="Ceiling">سقفية</option></select></div>
            <div><label className="block text-sm text-gray-600 mb-1">الحجم</label><input required type="text" className="w-full border p-2 rounded focus:ring-2 focus:ring-green-500 bg-gray-50 outline-none" value={formData.size} onChange={e => setFormData({...formData, size: e.target.value})} /></div>
          </div>
          <div><label className="block text-sm text-gray-600 mb-1">الموقع الرئيسي</label><select className="w-full border p-2 rounded focus:ring-2 focus:ring-green-500 bg-gray-50 outline-none" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})}>{locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}</select></div>
          <div><label className="block text-sm text-gray-600 mb-1">الموقع الفرعي (اختياري)</label><input type="text" className="w-full border p-2 rounded focus:ring-2 focus:ring-green-500 bg-gray-50 outline-none" value={formData.subLocation || ''} onChange={e => setFormData({...formData, subLocation: e.target.value})} /></div>
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

function TransferModal({ exts, onClose, onSubmit, locations }) {
  const [newLocation, setNewLocation] = useState(locations[0] || '');
  const handleSubmit = (e) => { e.preventDefault(); if(newLocation.trim() === '') return; onSubmit(exts.map(e => e.id), newLocation); };
  const isSingle = exts.length === 1;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto"><div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden my-auto"><div className="bg-purple-600 text-white p-4"><h3 className="font-bold text-lg flex items-center"><ArrowRightLeft className="w-5 h-5 ml-2" /> {isSingle ? 'ترحيل الطفاية' : 'ترحيل جماعي'}</h3><p className="text-sm text-purple-100 opacity-90 mt-1">{isSingle ? `رقم: ${exts[0].number}` : `العدد: ${exts.length}`}</p></div><form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">{isSingle && (<div><label className="block text-sm text-gray-600 mb-1">الموقع الحالي</label><input type="text" disabled className="w-full border p-2 rounded bg-gray-100 text-gray-500" value={exts[0].location} /></div>)}<div><label className="block text-sm text-gray-600 mb-1">الموقع الجديد</label><select required className="w-full border p-2 rounded focus:ring-2 focus:ring-purple-500" value={newLocation} onChange={e => setNewLocation(e.target.value)}>{locations.map(loc => <option key={loc} value={loc} disabled={isSingle && exts[0].location === loc}>{loc}</option>)}</select></div><div className="pt-2 flex gap-2"><button type="submit" className="flex-1 bg-purple-600 text-white py-2.5 rounded-lg font-medium flex justify-center items-center">تأكيد الترحيل</button><button type="button" onClick={onClose} className="flex-1 bg-gray-200 text-gray-800 py-2.5 rounded-lg font-medium">إلغاء</button></div></form></div></div>
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
    if (db && fbUser) setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', String(newId)), userObj).catch(()=>{});
    else setUsers([...users, userObj]);
    setShowAddModal(false);
    logAction('إضافة مستخدم', `إضافة حساب "${newUser.name}"`);
  };

  const handleDeleteUser = (id, name) => {
    if (id === currentUser.id) return; 
    const userToArchive = users.find(u => u.id === id);
    if (!userToArchive) return;
    if (db && fbUser) setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', String(id)), { ...userToArchive, archived: true }).catch(()=>{});
    else setUsers(users.map(u => u.id === id ? { ...u, archived: true } : u));
    logAction('أرشفة مستخدم', `أرشفة حساب "${name}"`);
  };

  const handleEditUser = (updatedUser) => {
    if (db && fbUser) setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', String(updatedUser.id)), updatedUser).catch(()=>{});
    else setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
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
      const dayStr = log.dayStr || log.date.split(/,|،/)[0].trim();
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
        <table className="w-full text-right min-w-[600px]"><thead className="bg-gray-50 text-gray-600 text-sm border-y"><tr><th className="p-3">التاريخ والوقت</th><th className="p-3">المستخدم</th><th className="p-3">الإجراء</th><th className="p-3">التفاصيل</th></tr></thead><tbody className="divide-y divide-gray-100 text-sm">{filteredLogs.length === 0 ? <tr><td colSpan="4" className="p-8 text-center text-gray-500">لا توجد سجلات لهذا اليوم.</td></tr> : filteredLogs.map(log => <tr key={log.id} className="hover:bg-gray-50"><td className="p-3 text-gray-500 whitespace-nowrap" dir="ltr">{log.date}</td><td className="p-3 font-medium text-blue-700 whitespace-nowrap">{log.userName}</td><td className="p-3"><span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-lg text-[11px] font-bold border whitespace-nowrap">{log.action}</span></td><td className="p-3 text-gray-700 min-w-[200px]">{log.details}</td></tr>)}</tbody></table>
      </div>

      <div className="md:hidden flex flex-col gap-3">
        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-xl border border-gray-100">لا توجد سجلات لهذا اليوم.</div>
        ) : (
          filteredLogs.map(log => (
            <div key={log.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col gap-2 relative">
              <div className="flex justify-between items-start mb-1">
                <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-md text-[10px] font-bold border">{log.action}</span>
                <span className="text-gray-400 text-[10px]" dir="ltr">{log.date}</span>
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
      const dayStr = log.dayStr || String(log.date || '').split(/,|،/)[0].trim();
      return { ...log, dayStr };
    });
  }, [auditLogs]);

  const availableDays = useMemo(() => {
    const days = new Set(logsWithDay.map(log => log.dayStr).filter(Boolean));
    return [...days];
  }, [logsWithDay]);

  useEffect(() => {
    const todayStr = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'numeric', day: 'numeric' });
    if (selectedDay === 'All' && availableDays.includes(todayStr)) {
      setSelectedDay(todayStr);
    }
  }, [availableDays, selectedDay]);

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
    if (db && fbUser) deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'auditLogs', String(logId))).catch(()=>{});
    else setAuditLogs(prev => prev.filter(log => log.id !== logId));
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
                            <span className="text-xs text-gray-400" dir="ltr">{log.date}</span>
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
                        <div className="text-sm text-gray-700 leading-relaxed">{log.details}</div>
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

function InspectionPolicyCenter({ locations, inspectionPolicies, setInspectionPolicies, db, fbUser, appId, logAction, currentUser }) {
  if (!(currentUser.role === 'developer' || currentUser.role === 'father')) return <div className="p-8 text-center text-red-500">عذراً، ليس لديك صلاحية.</div>;

  const defaultStartDate = formatDate(new Date());
  const [policyDraft, setPolicyDraft] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('');

  useEffect(() => {
    const normalized = locations.map((loc) => {
      const existing = inspectionPolicies.find(p => p.location === loc);
      return existing || { location: loc, enabled: false, intervalDays: 1, startDate: defaultStartDate };
    });
    setPolicyDraft(normalized);
  }, [locations, inspectionPolicies, defaultStartDate]);

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

    if (db && fbUser) setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'app_data', 'inspectionPolicies'), { list: normalized }).catch(() => {});
    else setInspectionPolicies(normalized);

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
            <label className="block text-xs text-gray-500 mb-1">اختر القسم</label>
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
                <td className="p-3 text-gray-500 whitespace-nowrap" dir="ltr">{r.at ? new Date(r.at).toLocaleString('ar-EG') : r.date}</td>
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
              <span className="text-[10px] text-gray-400" dir="ltr">{r.at ? new Date(r.at).toLocaleString('ar-EG') : r.date}</span>
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
    if (db && fbUser) setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'extinguishers', String(ext.id)), { ...ext, archived: false }).catch(()=>{});
    else setExtinguishers(prev => prev.map(e => e.id === ext.id ? { ...e, archived: false } : e));
    logAction('استعادة مؤرشف', `استعادة الطفاية ${ext.number}`);
  };

  const restoreAllExts = () => {
    if (archivedExts.length === 0) return;
    if (db && fbUser) {
      const batch = writeBatch(db);
      archivedExts.forEach(ext => batch.set(doc(db, 'artifacts', appId, 'public', 'data', 'extinguishers', String(ext.id)), { ...ext, archived: false }));
      batch.commit().catch(()=>{});
    }
    else setExtinguishers(prev => prev.map(e => e.archived ? { ...e, archived: false } : e));
    logAction('استعادة مؤرشف', `تم استعادة ${archivedExts.length} طفاية مؤرشفة.`);
  };

  const deleteOneArchivedExt = (ext) => {
    if (currentUser.role !== 'developer') return;
    if (db && fbUser) deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'extinguishers', String(ext.id))).catch(()=>{});
    else setExtinguishers(prev => prev.filter(e => e.id !== ext.id));
    logAction('حذف من الأرشيف', `حذف الطفاية ${ext.number} نهائياً من الأرشيف.`);
  };

  const deleteAllArchivedExts = () => {
    if (!canManageAll || archivedExts.length === 0) return;
    if (db && fbUser) {
      const batch = writeBatch(db);
      archivedExts.forEach(ext => batch.delete(doc(db, 'artifacts', appId, 'public', 'data', 'extinguishers', String(ext.id))));
      batch.commit().catch(()=>{});
    } else {
      setExtinguishers(prev => prev.filter(e => !e.archived));
    }
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
function DeveloperSettings({ locations, setLocations, contacts, auditLogs, setAuditLogs, extinguishers, setExtinguishers, users, setUsers, db, fbUser, appId, logAction, currentUser, siteSettings, setSiteSettings }) {
  const [newLocation, setNewLocation] = useState('');
  const [confirmDialog, setConfirmDialog] = useState(null); 
  const [bulkData, setBulkData] = useState({ quantity: 10, type: 'Powder', size: '6Kg', location: locations[0] || '' });
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
    if (db && fbUser) setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', String(u.id)), { ...u, archived: false }).catch(()=>{});
    else setUsers(prev => prev.map(x => x.id === u.id ? { ...x, archived: false } : x));
    logAction('استعادة مؤرشف', `استعادة المستخدم ${u.name}`);
  };

  const restoreAllUsers = () => {
    if (archivedUsers.length === 0) return;
    if (db && fbUser) {
      const batch = writeBatch(db);
      archivedUsers.forEach(u => batch.set(doc(db, 'artifacts', appId, 'public', 'data', 'users', String(u.id)), { ...u, archived: false }));
      batch.commit().catch(()=>{});
    }
    else setUsers(prev => prev.map(u => u.archived ? { ...u, archived: false } : u));
    logAction('استعادة مؤرشف', `تم استعادة ${archivedUsers.length} مستخدم مؤرشف.`);
  };

  if (currentUser.role !== 'developer') return <div className="p-8 text-center text-red-500">خاص بالمطورين فقط.</div>;

  const handleAddLocation = () => {
    if (newLocation.trim() && !locations.includes(newLocation.trim())) {
      setLocations([...locations, newLocation.trim()]);
      setNewLocation('');
    }
  };

  const handleRemoveLocation = (loc) => {
    if (locations.length > 1) setLocations(locations.filter(l => l !== loc));
    else alert("يجب أن يبقى موقع واحد على الأقل.");
  };

  const executeWipeData = () => {
    if (db && fbUser) {
      const batch = writeBatch(db);
      extinguishers.forEach(ext => batch.delete(doc(db, 'artifacts', appId, 'public', 'data', 'extinguishers', String(ext.id))));
      batch.commit().catch(()=>{});
    }
    else { window.localStorage.setItem('fireTracker_extinguishers', '[]'); window.location.reload(); }
    logAction('تهيئة النظام', 'تم مسح قاعدة بيانات الطفايات بالكامل.');
  };

  const executeClearPerformanceLogs = () => {
    if (db && fbUser) {
      const batch = writeBatch(db);
      auditLogs.forEach(log => batch.delete(doc(db, 'artifacts', appId, 'public', 'data', 'auditLogs', String(log.id))));
      batch.commit().catch(()=>{});
    } else {
      setAuditLogs([]);
    }
    logAction('تصفير سجل الإنجاز', 'تم تصفير جميع سجلات الإنجاز لكل المستخدمين.');
  };

  const handleBulkAdd = () => {
    const quantity = Number(bulkData.quantity);
    if (quantity <= 0 || quantity > 500) return; 
    
    const maxExtNumber = extinguishers.reduce((max, ext) => {
      const numMatch = ext.number.match(/\d+/);
      const num = numMatch ? parseInt(numMatch[0], 10) : 0;
      return Math.max(max, num);
    }, 0);

    const d = new Date();
    const todayStr = d.toISOString().split('T')[0];
    const nextDateStr = calculateNextDate(todayStr);
    const status = calculateStatus(nextDateStr, todayStr);

    const newExts = [];
    for (let i = 1; i <= quantity; i++) {
      const newNum = maxExtNumber + i;
      const formattedNum = `EXT-${String(newNum).padStart(3, '0')}`;
      const newId = Date.now() + i + Math.floor(Math.random() * 1000); 
      
      newExts.push({
        id: newId,
        number: formattedNum,
        size: bulkData.size,
        type: bulkData.type,
        location: bulkData.location,
        subLocation: '',
        lastDate: todayStr,
        nextDate: nextDateStr,
        lastInspection: todayStr,
        status: status,
        notes: '',
        inCabinet: false
      });
    }

    if (db && fbUser) {
       const batch = writeBatch(db);
       newExts.forEach(ext => batch.set(doc(db, 'artifacts', appId, 'public', 'data', 'extinguishers', String(ext.id)), ext));
       batch.commit().catch(()=>{});
    } else {
       setExtinguishers(prev => [...prev, ...newExts]);
    }
    
    logAction('إضافة جماعية', `تم إنشاء ${quantity} طفاية جديدة تلقائياً في ${bulkData.location}.`);
  };

  const qualityChecks = useMemo(() => {
    const activeExts = extinguishers.filter(e => !e.archived);
    const activeUsers = users.filter(u => !u.archived);

    const numberCount = new Map();
    activeExts.forEach(e => numberCount.set(e.number, (numberCount.get(e.number) || 0) + 1));
    const duplicateExtNumbers = [...numberCount.entries()].filter(([, count]) => count > 1).map(([num]) => num);

    const invalidExtData = activeExts.filter(e => !e.number || !e.type || !e.size || !e.location || !e.lastDate).map(e => e.number || `ID:${e.id}`);

    const usernameCount = new Map();
    activeUsers.forEach(u => usernameCount.set((u.username || '').toLowerCase(), (usernameCount.get((u.username || '').toLowerCase()) || 0) + 1));
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
        <p className="text-sm text-gray-600 mb-4">تقوم هذه الأداة بإنشاء عدد كبير من الطفايات دفعة واحدة، وستقوم بتسلسل الأرقام تلقائياً بناءً على آخر رقم موجود في النظام.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">العدد المطلوب</label>
            <input type="number" min="1" max="100" className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" value={bulkData.quantity} onChange={e => setBulkData({...bulkData, quantity: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">النوع</label>
            <select className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" value={bulkData.type} onChange={e => setBulkData({...bulkData, type: e.target.value})}>
              <option value="Powder">بودرة</option><option value="CO2">CO2</option><option value="Foam">رغوة</option><option value="Water">ماء</option><option value="Ceiling">سقفية</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">الحجم</label>
            <input type="text" className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" value={bulkData.size} onChange={e => setBulkData({...bulkData, size: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">الموقع الأساسي</label>
            <select className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" value={bulkData.location} onChange={e => setBulkData({...bulkData, location: e.target.value})}>
              {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
            </select>
          </div>
        </div>
        <button 
          onClick={() => setConfirmDialog({ title: 'تأكيد الإضافة الجماعية', message: `سيتم الآن إنشاء (${bulkData.quantity}) طفاية جديدة بتسلسلات تلقائية في "${bulkData.location}". هل أنت متأكد؟`, action: handleBulkAdd, isDestructive: false })} 
          className="w-full md:w-auto bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-2.5 rounded-lg transition-colors shadow-md"
        >
          تنفيذ الإضافة الجماعية الآن
        </button>
      </div>

      {/* 2. إدارة المواقع */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center"><MapPin className="w-5 h-5 ml-2 text-blue-600"/> إدارة المواقع الأساسية</h3>
        <div className="flex gap-2 mb-4">
          <input type="text" placeholder="اسم الموقع الجديد..." className="flex-1 border p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={newLocation} onChange={e => setNewLocation(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddLocation()} />
          <button onClick={handleAddLocation} className="bg-blue-600 text-white px-5 rounded-lg font-medium hover:bg-blue-700 transition-colors">إضافة</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {locations.map(loc => (
            <div key={loc} className="bg-gray-100 border border-gray-200 text-gray-800 px-3 py-1.5 rounded-full flex items-center text-sm font-medium shadow-sm">
              {loc}
              <button onClick={() => handleRemoveLocation(loc)} className="ml-1 mr-2 text-gray-400 hover:text-red-500 transition-colors"><X className="w-4 h-4"/></button>
            </div>
          ))}
        </div>
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