import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldAlert, ShieldCheck, AlertTriangle, LogOut, Plus, FileText, 
  Settings, LayoutDashboard, FireExtinguisher, Search, Users,
  CheckCircle, XCircle, ClipboardList, ArrowRightLeft, Archive, Edit, Filter,
  UserPlus, Trash2, Phone, Menu, X, MapPin, DatabaseBackup, Loader2, Calendar,
  MessageCircle, CopyPlus, Target, Activity
} from 'lucide-react';

import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot, enableIndexedDbPersistence } from 'firebase/firestore';

// ==========================================
// 🔥 إعدادات قاعدة بيانات فايربيس (Firebase) 🔥
// ==========================================
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
  { id: 1, name: 'المبرمج الأعلى', username: 'dev', password: '123', role: 'developer' },
  { id: 2, name: 'الوالد (المشرف العام)', username: 'father', password: '123', role: 'father' },
  { id: 3, name: 'مدير النظام', username: 'admin', password: '123', role: 'admin' },
  { id: 4, name: 'المفتش أحمد', username: 'user', password: '123', role: 'member' }
];

const initialContacts = [
  { id: 1, name: 'إدارة المسجد', phone: '07800000000' },
  { id: 2, name: 'الصيانة والطوارئ', phone: '07700000000' }
];

const calculateNextDate = (lastDateStr) => {
  if (!lastDateStr) return '';
  const d = new Date(lastDateStr);
  d.setMonth(d.getMonth() + 6);
  return d.toISOString().split('T')[0];
};

// التحديث الجديد لحساب الحالة (يجمع بين الصيانة والفحص اليومي)
const calculateStatus = (nextDateStr, lastInspectionStr) => {
  if (!nextDateStr) return 'مجهولة';
  
  // 1. التحقق من صلاحية الصيانة (6 أشهر)
  const next = new Date(nextDateStr);
  const now = new Date();
  const diffDays = Math.ceil((next - now) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 'تحتاج صيانة';
  if (diffDays <= 14) return 'صيانة قريبة'; 

  // 2. التحقق من الفحص اليومي (إذا كانت الصيانة صالحة)
  const todayStr = new Date().toISOString().split('T')[0];
  if (lastInspectionStr !== todayStr) return 'تحتاج فحص';

  return 'صالحة';
};

const today = new Date();
const formatDate = (d) => d.toISOString().split('T')[0];
const dToday = formatDate(today);
const d1MonthAgo = formatDate(new Date(today.getFullYear(), today.getMonth() - 1, today.getDate()));
const d8MonthsAgo = formatDate(new Date(today.getFullYear(), today.getMonth() - 8, today.getDate())); 

const initialExtinguishers = [
  { id: 1, number: 'EXT-001', size: '6Kg', type: 'Powder', location: 'مسجد البصرة', subLocation: 'الطابق الأول', lastDate: d1MonthAgo, nextDate: calculateNextDate(d1MonthAgo), lastInspection: dToday, status: 'صالحة', notes: 'يوجد خدش بسيط', inCabinet: true },
  { id: 2, number: 'EXT-002', size: '12Kg', type: 'CO2', location: 'موكب كربلاء', subLocation: 'المطبخ الرئيسي', lastDate: d8MonthsAgo, nextDate: calculateNextDate(d8MonthsAgo), lastInspection: dToday, status: 'تحتاج صيانة', notes: 'منتهية الصلاحية', inCabinet: false },
  { id: 3, number: 'EXT-003', size: '6Kg', type: 'Foam', location: 'موكب النجف', subLocation: '', lastDate: d1MonthAgo, nextDate: calculateNextDate(d1MonthAgo), lastInspection: d1MonthAgo, status: 'تحتاج فحص', notes: 'لم تفحص اليوم', inCabinet: false },
];

export default function App() {
  const [currentUser, setCurrentUser] = useLocalStorage('fireTracker_user', null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [fbUser, setFbUser] = useState(null);

  const [extinguishers, setExtinguishers] = useLocalStorage('fireTracker_extinguishers', []);
  const [users, setUsers] = useLocalStorage('fireTracker_users', initialUsers);
  const [auditLogs, setAuditLogs] = useLocalStorage('fireTracker_auditLogs', []);
  const [contacts, setContacts] = useLocalStorage('fireTracker_contacts', initialContacts);
  const [locations, setLocations] = useLocalStorage('fireTracker_locations', initialLocations);

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
      if (snap.empty) { initialExtinguishers.forEach(ext => setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'extinguishers', String(ext.id)), ext)); } 
      else {
        setExtinguishers(snap.docs.map(d => {
          const data = d.data();
          // حساب الحالة بالاعتماد على المتغيرين
          return { ...data, status: calculateStatus(data.nextDate, data.lastInspection || data.lastDate) };
        }));
      }
    }, console.error);

    const unsubUsers = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'users'), (snap) => {
      if (snap.empty) { initialUsers.forEach(u => setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', String(u.id)), u)); } 
      else { setUsers(snap.docs.map(d => d.data())); }
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

    return () => { unsubExt(); unsubUsers(); unsubLogs(); unsubContacts(); unsubLocs(); };
  }, [fbUser, setExtinguishers, setUsers, setAuditLogs, setContacts, setLocations]);

  const logAction = (action, details) => {
    const d = new Date();
    const dateString = d.toLocaleString('ar-EG');
    const dayString = d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'numeric', day: 'numeric' });
    const newLog = { id: Date.now(), date: dateString, dayStr: dayString, userName: currentUser?.name || 'مجهول', action, details };
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

  const navigateTo = (view) => {
    setCurrentView(view);
    setIsMobileMenuOpen(false);
  };

  if (!currentUser) return <LoginScreen onLogin={setCurrentUser} users={users} />;

  const getRoleLabel = (role) => {
    switch(role) {
      case 'developer': return 'المبرمج الأعلى';
      case 'father': return 'المشرف العام';
      case 'admin': return 'مسؤول النظام';
      default: return 'مفتش / عضو';
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
            <img src="https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=150&h=150&fit=crop" alt="شعار" className="w-10 h-10 md:w-16 md:h-16 rounded-full border border-red-200 object-cover bg-white" />
            <div className="md:mt-3 text-center flex-1 md:flex-none">
              <h1 className="text-sm md:text-xl font-bold leading-tight">مسجد الموسوي الكبير</h1>
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
              <>
                <SidebarBtn icon={Users} label="المستخدمين" active={currentView === 'users'} onClick={() => navigateTo('users')} />
                <SidebarBtn icon={ClipboardList} label="سجل التغييرات" active={currentView === 'audit'} onClick={() => navigateTo('audit')} />
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
              <p className="text-[11px] text-red-200 font-medium">© 2026 مسجد الموسوي الكبير.<br/>جميع الحقوق محفوظة.</p>
              <p className="text-[10px] text-red-300/80 mt-1 font-mono">Developed by <span className="font-bold text-white opacity-100">abnmazin.engineer</span></p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 md:h-screen overflow-hidden">
        <header className="md:hidden bg-red-800 text-white p-4 flex justify-between items-center shadow-md shrink-0 relative z-10">
          <div className="flex items-center gap-3">
            <img src="https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=150&h=150&fit=crop" alt="شعار" className="w-10 h-10 rounded-full border border-red-200 object-cover bg-white shadow-sm" />
            <div>
              <h1 className="text-lg font-bold">مسجد الموسوي</h1>
            </div>
          </div>
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-1 hover:bg-red-700 rounded-lg transition-colors"><Menu className="w-7 h-7" /></button>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-y-auto w-full max-w-full relative z-0 bg-gray-50">
          {currentView === 'dashboard' && <Dashboard extinguishers={extinguishers} contacts={contacts} setContacts={handleSaveContacts} user={currentUser} locations={locations} />}
          {currentView === 'list' && <ExtinguishersList extinguishers={extinguishers} setExtinguishers={setExtinguishers} user={currentUser} logAction={logAction} db={db} fbUser={fbUser} appId={appId} locations={locations} />}
          {currentView === 'users' && <UsersList users={users} setUsers={setUsers} currentUser={currentUser} logAction={logAction} db={db} fbUser={fbUser} appId={appId} />}
          {currentView === 'audit' && <AuditLogsList logs={auditLogs} userRole={currentUser.role} />}
          {currentView === 'settings' && <DeveloperSettings locations={locations} setLocations={handleSaveLocations} auditLogs={auditLogs} setAuditLogs={setAuditLogs} extinguishers={extinguishers} setExtinguishers={setExtinguishers} db={db} fbUser={fbUser} appId={appId} logAction={logAction} currentUser={currentUser} />}
        </main>
      </div>
    </div>
  );
}

// ==========================================
// Components
// ==========================================

function SidebarBtn({ icon: Icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`flex items-center w-full p-3 rounded-lg transition-colors ${active ? 'bg-red-900 text-white font-medium shadow-inner' : 'text-red-100 hover:bg-red-700 hover:text-white'}`}>
      <Icon className="w-5 h-5 ml-3" /> {label}
    </button>
  );
}

function LoginScreen({ onLogin, users }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
    if (user) onLogin(user);
    else setError('اسم المستخدم أو كلمة المرور غير صحيحة.');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-xl w-full max-w-md">
        <div className="text-center mb-8">
          <img src="https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=150&h=150&fit=crop" alt="شعار" className="w-20 h-20 mx-auto mb-4 rounded-full border-4 border-red-100 object-cover shadow-sm bg-white" />
          <h2 className="text-xl md:text-2xl font-bold text-gray-800">مسجد الموسوي الكبير</h2>
          <p className="text-gray-500 text-sm mt-2">نظام تتبع طفايات الحريق</p>
        </div>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm text-center">{error}</div>}
        <form onSubmit={handleLogin} className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">اسم المستخدم</label><input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 outline-none" placeholder="dev / admin / father / user" required /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 outline-none" required /></div>
          <button type="submit" className="w-full bg-red-600 text-white font-bold py-3 rounded-lg hover:bg-red-700 shadow-md mb-4">تسجيل الدخول</button>
        </form>
        
        <div className="mt-8 text-center border-t pt-5">
          <p className="text-xs text-gray-500 font-medium tracking-wide">© 2026 مسجد الموسوي الكبير. جميع الحقوق محفوظة.</p>
          <p className="text-[10px] text-gray-400 mt-1 font-mono">Developed by <span className="font-bold text-gray-600">abnmazin.engineer</span></p>
        </div>
      </div>
    </div>
  );
}

function Dashboard({ extinguishers, contacts, setContacts, user }) {
  const [showContactsModal, setShowContactsModal] = useState(false);
  const stats = useMemo(() => ({
    total: extinguishers.length,
    valid: extinguishers.filter(e => e.status === 'صالحة').length,
    warning: extinguishers.filter(e => e.status === 'فحص قريب' || e.status === 'تحتاج فحص').length,
    expired: extinguishers.filter(e => e.status === 'تحتاج صيانة' || e.status === 'منتهية').length,
  }), [extinguishers]);

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
              {extinguishers.filter(e => e.status !== 'صالحة').map(ext => (
                <tr key={ext.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium text-sm">{ext.number}</td>
                  <td className="p-3 text-gray-600 text-sm">{ext.location}{ext.subLocation && <span className="text-xs text-gray-400 mr-2">({ext.subLocation})</span>}</td>
                  <td className="p-3"><span className={`px-2 py-1 rounded-full text-[10px] md:text-xs font-bold whitespace-nowrap ${ext.status.includes('صيانة') ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>{ext.status}</span></td>
                </tr>
              ))}
              {extinguishers.filter(e => e.status !== 'صالحة').length === 0 && <tr><td colSpan="3" className="p-4 text-center text-green-600 font-medium text-sm">جميع الطفايات بحالة جيدة حالياً!</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="md:hidden flex flex-col gap-3">
          {extinguishers.filter(e => e.status !== 'صالحة').map(ext => (
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
            {contacts.map(c => {
              const waNumber = c.phone.startsWith('0') ? '964' + c.phone.slice(1) : c.phone;
              return (
                <div key={c.id} className="border border-gray-200 bg-white p-4 rounded-xl flex flex-col justify-center items-center text-center shadow-sm hover:shadow transition-shadow">
                  <span className="font-bold text-gray-800 mb-1 text-lg">{c.name}</span>
                  <span className="text-gray-500 font-medium text-sm mb-4" dir="ltr">{c.phone}</span>
                  <div className="flex w-full gap-2 border-t border-gray-100 pt-3">
                    <a href={`tel:${c.phone}`} className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 py-2 rounded-lg flex items-center justify-center text-xs font-bold transition-colors"><Phone className="w-4 h-4 ml-1.5" /> اتصال</a>
                    <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noreferrer" className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 py-2 rounded-lg flex items-center justify-center text-xs font-bold transition-colors"><MessageCircle className="w-4 h-4 ml-1.5" /> واتساب</a>
                  </div>
                </div>
              );
            })}
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

function ExtinguishersList({ extinguishers, setExtinguishers, user, logAction, db, fbUser, appId, locations }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterLocation, setFilterLocation] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [actionModalData, setActionModalData] = useState(null); // المودل الموحد للفحص والصيانة
  const [transferModalData, setTransferModalData] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [editModalData, setEditModalData] = useState(null);
  const [bulkDeleteConfirmData, setBulkDeleteConfirmData] = useState(null);
  const [showCustomSelectModal, setShowCustomSelectModal] = useState(false);

  const canEdit = user.role === 'developer' || user.role === 'admin' || user.role === 'father';

  const filtered = extinguishers.filter(e => {
    const searchLower = searchTerm.toLowerCase();
    return (e.number.toLowerCase().includes(searchLower) || e.location.includes(searchTerm) || (e.subLocation && e.subLocation.toLowerCase().includes(searchLower))) &&
           (filterType === 'All' || e.type === filterType) &&
           (filterLocation === 'All' || e.location === filterLocation);
  });

  const handleAddExtinguisher = (newExt) => {
    const newId = extinguishers.length ? Math.max(...extinguishers.map(e=>Number(e.id))) + 1 : 1;
    const extWithDates = { ...newExt, id: newId, nextDate: calculateNextDate(newExt.lastDate), lastInspection: newExt.lastDate, status: calculateStatus(calculateNextDate(newExt.lastDate), newExt.lastDate) };
    if (db && fbUser) setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'extinguishers', String(newId)), extWithDates).catch(()=>{});
    else setExtinguishers(prev => [...prev, extWithDates]);
    setShowAddModal(false);
    logAction('إضافة طفاية', `إضافة طفاية ${newExt.number} في ${newExt.location}`);
  };

  // دالة موحدة للفحص اليومي والصيانة
  const handleActionSubmit = (extIds, actionType, condition, remarks, date) => {
    const extsToUpdate = extinguishers.filter(e => extIds.includes(e.id));
    const isMaintenance = actionType === 'maintenance';
    
    let newExts = extinguishers.map(ext => {
      if (extIds.includes(ext.id)) {
        let updatedExt = { ...ext, notes: remarks.trim() };
        if (isMaintenance) {
          const nextD = condition === 'سليمة' ? calculateNextDate(date) : ext.nextDate;
          updatedExt = { ...updatedExt, lastDate: date, nextDate: nextD, lastInspection: date, status: condition === 'سليمة' ? calculateStatus(nextD, date) : 'تحتاج صيانة' };
        } else {
          updatedExt = { ...updatedExt, lastInspection: date, status: condition === 'سليمة' ? calculateStatus(ext.nextDate, date) : 'تحتاج صيانة' };
        }
        if (db && fbUser) setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'extinguishers', String(ext.id)), updatedExt).catch(()=>{});
        return updatedExt;
      }
      return ext;
    });
    
    if (!db || !fbUser) setExtinguishers(newExts);

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
    const extsToTransfer = extinguishers.filter(e => extIds.includes(e.id));
    if (db && fbUser) {
      extsToTransfer.forEach(ext => setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'extinguishers', String(ext.id)), { ...ext, location: newLocation }).catch(()=>{}));
    } else { setExtinguishers(prev => prev.map(e => extIds.includes(e.id) ? { ...e, location: newLocation } : e)); }
    logAction(extIds.length > 1 ? 'ترحيل جماعي' : 'ترحيل طفاية', `نقل (${extsToTransfer.map(e=>e.number).join('، ')}) إلى ${newLocation}`);
    setTransferModalData(null); setSelectedIds([]); 
  };

  const handleBulkDelete = () => {
    if (!bulkDeleteConfirmData || bulkDeleteConfirmData.length === 0) return;
    const extsToDelete = extinguishers.filter(e => bulkDeleteConfirmData.includes(e.id));
    if (db && fbUser) {
      bulkDeleteConfirmData.forEach(id => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'extinguishers', String(id))).catch(()=>{}));
    } else { setExtinguishers(prev => prev.filter(e => !bulkDeleteConfirmData.includes(e.id))); }
    logAction('حذف طفايات', `حذف نهائي لـ (${bulkDeleteConfirmData.length}) طفاية: ${extsToDelete.map(e=>e.number).join('، ')}`);
    setBulkDeleteConfirmData(null); setSelectedIds([]);
  };

  // دالة التحديد المخصص
  const applyCustomSelection = (text) => {
    const numbers = text.match(/\d+/g) || [];
    const targetNumbers = numbers.map(n => `EXT-${String(n).padStart(3, '0')}`);
    const matchedIds = filtered.filter(ext => targetNumbers.includes(ext.number)).map(e => e.id);
    setSelectedIds(matchedIds);
    setShowCustomSelectModal(false);
  };

  const getStatusColor = (status) => {
    if (status === 'صالحة') return 'bg-green-100 text-green-700 border border-green-200';
    if (status === 'تحتاج فحص') return 'bg-orange-100 text-orange-700 border border-orange-200';
    if (status === 'صيانة قريبة') return 'bg-yellow-100 text-yellow-700 border border-yellow-200';
    return 'bg-red-100 text-red-700 border border-red-200 shadow-sm';
  };

  const transferrableCount = filtered.filter(e => selectedIds.includes(e.id) && !e.inCabinet).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100 relative z-20">
        <h2 className="text-xl font-bold text-gray-800">دليل الطفايات</h2>
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto flex-wrap sm:flex-nowrap items-center">
          <div className="flex flex-row gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-36"><Filter className="w-4 h-4 absolute right-3 top-3 text-gray-400" /><select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-full pl-2 pr-8 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-xs sm:text-sm text-gray-600 appearance-none bg-gray-50"><option value="All">كل الأنواع</option><option value="Powder">بودرة</option><option value="CO2">CO2</option><option value="Foam">رغوة</option><option value="Water">ماء</option></select></div>
            <div className="relative flex-1 sm:w-36"><MapPin className="w-4 h-4 absolute right-3 top-3 text-gray-400" /><select value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)} className="w-full pl-2 pr-8 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-xs sm:text-sm text-gray-600 appearance-none bg-gray-50"><option value="All">الموقع (الكل)</option>{locations.map(loc => (<option key={loc} value={loc}>{loc}</option>))}</select></div>
          </div>
          <div className="relative w-full sm:w-48 lg:w-56"><Search className="w-5 h-5 absolute right-3 top-2.5 text-gray-400" /><input type="text" placeholder="بحث..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-3 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm" /></div>
          
          <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
            {selectedIds.length > 0 && (
              <>
                <button onClick={() => setActionModalData(extinguishers.filter(e => selectedIds.includes(e.id)))} className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center transition-colors shadow-sm text-sm whitespace-nowrap"><Activity className="w-4 h-4 ml-1" /> إجراء جماعي ({selectedIds.length})</button>
                {canEdit && <button onClick={() => setTransferModalData(extinguishers.filter(e => selectedIds.includes(e.id) && !e.inCabinet))} disabled={transferrableCount === 0} className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center transition-colors shadow-sm text-sm whitespace-nowrap ${transferrableCount === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 text-white'}`}><ArrowRightLeft className="w-4 h-4 ml-1" /> ترحيل ({transferrableCount})</button>}
                {canEdit && <button onClick={() => setBulkDeleteConfirmData(selectedIds)} className="flex-1 sm:flex-none bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded-lg flex items-center justify-center transition-colors shadow-sm text-sm"><Trash2 className="w-4 h-4" /></button>}
              </>
            )}
            {canEdit && <button onClick={() => setShowAddModal(true)} className="flex-1 sm:flex-none bg-red-600 hover:bg-red-700 text-white px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center transition-colors text-sm whitespace-nowrap shadow-sm"><Plus className="w-4 h-4 sm:w-5 sm:h-5 ml-1" /> إضافة</button>}
          </div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap items-center bg-gray-100 p-2 rounded-lg border border-gray-200">
        <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded shadow-sm border">
          <input type="checkbox" className="w-4 h-4 text-red-600 rounded cursor-pointer" onChange={(e) => setSelectedIds(e.target.checked ? filtered.map(ext => ext.id) : [])} checked={filtered.length > 0 && selectedIds.length === filtered.length} />
          <span className="text-sm font-bold text-gray-700 select-none">تحديد المعروض</span>
        </label>
        <button onClick={() => setShowCustomSelectModal(true)} className="bg-white hover:bg-blue-50 text-blue-700 px-3 py-1.5 rounded shadow-sm border flex items-center text-sm font-bold transition-colors">
          <Target className="w-4 h-4 ml-1" /> تحديد مخصص (بالأرقام)
        </button>
        {selectedIds.length > 0 && <span className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full font-bold">{selectedIds.length} محدد</span>}
      </div>

      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden w-full relative z-10">
        <table className="w-full text-right"><thead className="bg-gray-50 text-gray-600 font-medium text-sm"><tr><th className="p-3 w-10 text-center"></th><th className="p-3">الرقم</th><th className="p-3">النوع والحجم</th><th className="p-3">الموقع</th><th className="p-3">آخر فحص (يومي)</th><th className="p-3">موعد الصيانة (6 أشهر)</th><th className="p-3">الحالة</th><th className="p-3">ملاحظات</th><th className="p-3 text-center">إجراءات</th></tr></thead><tbody className="divide-y divide-gray-100 text-sm">
            {filtered.map(ext => (
              <tr key={ext.id} className={`hover:bg-gray-50 transition-colors ${selectedIds.includes(ext.id) ? 'bg-red-50' : ''}`}>
                <td className="p-3 text-center"><input type="checkbox" className="w-4 h-4 text-red-600 rounded cursor-pointer" checked={selectedIds.includes(ext.id)} onChange={(e) => setSelectedIds(e.target.checked ? [...selectedIds, ext.id] : selectedIds.filter(id => id !== ext.id))} /></td>
                <td className="p-3 font-bold text-gray-800"><div className="flex items-center gap-2" dir="ltr">{ext.number}{ext.inCabinet && <span title="في كابينة" className="bg-gray-200 text-gray-500 p-1 rounded-md ml-2"><Archive className="w-3 h-3" /></span>}</div></td>
                <td className="p-3"><span className="bg-gray-200 px-2 py-1 rounded text-gray-700 text-xs">{ext.type}</span> {ext.size}</td><td className="p-3"><div className="text-gray-800">{ext.location}</div>{ext.subLocation && <div className="text-xs text-gray-500">{ext.subLocation}</div>}</td>
                <td className="p-3 text-gray-600 font-medium whitespace-nowrap">{ext.lastInspection || ext.lastDate}</td>
                <td className="p-3 text-gray-500 whitespace-nowrap">{ext.nextDate}</td>
                <td className="p-3"><span className={`px-2 py-1 rounded-full text-[11px] font-bold flex items-center w-max ${getStatusColor(ext.status)}`}>{ext.status === 'صالحة' ? <CheckCircle className="w-3 h-3 ml-1" /> : <XCircle className="w-3 h-3 ml-1" />}{ext.status}</span></td>
                <td className="p-3 text-gray-500 text-xs max-w-[120px] truncate" title={ext.notes}>{ext.notes || '-'}</td>
                <td className="p-3 text-center"><div className="flex justify-center gap-2"><button onClick={() => setActionModalData([ext])} className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-1.5 rounded text-xs font-medium transition-colors border border-blue-200">إجراء</button>
                    {canEdit && (<><button onClick={() => setEditModalData(ext)} className="bg-gray-50 text-gray-600 hover:bg-gray-200 px-2 py-1.5 rounded text-xs font-medium transition-colors flex items-center border"><Edit className="w-3 h-3 ml-1" /> تعديل</button></>)}
                </div></td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan="9" className="p-6 text-center text-gray-500">لا يوجد بيانات.</td></tr>}
          </tbody></table>
      </div>

      <div className="md:hidden flex flex-col gap-4">
        {filtered.map(ext => (
          <div key={ext.id} className={`bg-white rounded-xl shadow-sm border flex flex-col gap-3 p-4 transition-colors ${selectedIds.includes(ext.id) ? 'border-red-300 bg-red-50' : 'border-gray-100'}`}>
            <div className="flex justify-between items-start"><div className="flex items-center gap-3">
                <input type="checkbox" checked={selectedIds.includes(ext.id)} className="w-5 h-5 text-red-600 rounded" onChange={(e) => setSelectedIds(e.target.checked ? [...selectedIds, ext.id] : selectedIds.filter(id => id !== ext.id))} />
                <div><div className="flex items-center gap-2" dir="ltr"><span className="font-bold text-gray-800 text-lg">{ext.number}</span>{ext.inCabinet && <span className="bg-gray-200 text-gray-500 p-1.5 rounded-md ml-2"><Archive className="w-3 h-3" /></span>}</div><span className="text-gray-500 text-xs">{ext.type} - {ext.size}</span></div>
              </div><span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center ${getStatusColor(ext.status)}`}>{ext.status}</span>
            </div>
            <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm bg-gray-50 p-3 rounded-lg border border-gray-100">
              <div><span className="text-gray-400 block text-[10px] mb-0.5">الموقع</span><span className="font-medium text-gray-700">{ext.location}</span>{ext.subLocation && <span className="text-gray-500 text-[10px] block mt-0.5 bg-gray-200/50 px-1 rounded w-max">{ext.subLocation}</span>}</div>
              <div><span className="text-gray-400 block text-[10px] mb-0.5">آخر فحص يومي</span><span className="font-bold text-gray-700">{ext.lastInspection || ext.lastDate}</span></div>
              <div className="col-span-2 pt-2 border-t border-gray-200/60"><span className="text-gray-400 block text-[10px] mb-0.5">موعد الصيانة الشاملة القادم</span><span className="font-bold text-gray-800">{ext.nextDate}</span></div>
            </div>
            {ext.notes && <div className="text-xs bg-yellow-50 text-yellow-800 p-2.5 rounded-lg border border-yellow-100 flex items-start"><FileText className="w-4 h-4 ml-1.5 shrink-0 mt-0.5 text-yellow-600" /><span><strong className="font-bold">ملاحظة: </strong>{ext.notes}</span></div>}
            <div className="flex gap-2 pt-1"><button onClick={() => setActionModalData([ext])} className="flex-1 bg-blue-600 text-white hover:bg-blue-700 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center shadow-sm">إجراء (فحص/صيانة)</button>
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
      {bulkDeleteConfirmData && <ConfirmBulkDeleteModal count={bulkDeleteConfirmData.length} onClose={() => setBulkDeleteConfirmData(null)} onConfirm={handleBulkDelete} />}
    </div>
  );
}

// نافذة التحديد المخصص الجديدة
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

// نافذة الإجراءات الموحدة (Action Modal) للفحص والصيانة
function ActionModal({ exts, onClose, onSubmit, userRole }) {
  const [actionType, setActionType] = useState('inspection'); // 'inspection' or 'maintenance'
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
          
          {/* نوع الإجراء (Tab/Radio) */}
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
            {isSingle && remarks && <p className="text-[10px] text-orange-500 mt-1">* تم جلب الملاحظة السابقة، قم بمسحها إذا تم حل المشكلة.</p>}
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
            <div><label className="block text-sm text-gray-600 mb-1">النوع</label><select className="w-full border p-2 rounded bg-gray-50 outline-none" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}><option value="Powder">بودرة</option><option value="CO2">CO2</option><option value="Foam">رغوة</option><option value="Water">ماء</option></select></div>
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
          <div><label className="block text-sm text-gray-600 mb-1">رقم الطفاية</label><input required type="text" className="w-full border p-2 rounded bg-gray-200 text-gray-600 font-bold outline-none cursor-not-allowed" value={formData.number} disabled dir="ltr" /><p className="text-[10px] text-gray-400 mt-1">لا يمكن تغيير الرقم بعد الإنشاء.</p></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm text-gray-600 mb-1">النوع</label><select className="w-full border p-2 rounded focus:ring-2 focus:ring-green-500 bg-gray-50 outline-none" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}><option value="Powder">بودرة</option><option value="CO2">CO2</option><option value="Foam">رغوة</option><option value="Water">ماء</option></select></div>
            <div><label className="block text-sm text-gray-600 mb-1">الحجم</label><input required type="text" className="w-full border p-2 rounded focus:ring-2 focus:ring-green-500 bg-gray-50 outline-none" value={formData.size} onChange={e => setFormData({...formData, size: e.target.value})} /></div>
          </div>
          <div><label className="block text-sm text-gray-600 mb-1">الموقع الرئيسي</label><select className="w-full border p-2 rounded focus:ring-2 focus:ring-green-500 bg-gray-50 outline-none" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})}>{locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}</select></div>
          <div><label className="block text-sm text-gray-600 mb-1">الموقع الفرعي (اختياري)</label><input type="text" className="w-full border p-2 rounded focus:ring-2 focus:ring-green-500 bg-gray-50 outline-none" value={formData.subLocation || ''} onChange={e => setFormData({...formData, subLocation: e.target.value})} /></div>
          <div className="flex items-center gap-2 bg-gray-50 p-3 rounded border border-gray-200"><input type="checkbox" id="editInCabinet" className="w-4 h-4 text-green-600 rounded focus:ring-green-500 cursor-pointer" checked={formData.inCabinet} onChange={e => setFormData({...formData, inCabinet: e.target.checked})} /><label htmlFor="editInCabinet" className="text-sm font-bold text-gray-700 cursor-pointer select-none">مثبتة داخل كابينة</label></div>
          <div className="pt-2 flex gap-2"><button type="submit" className="flex-1 bg-green-600 text-white py-2.5 rounded-lg font-bold hover:bg-green-700 shadow-md">حفظ التعديلات</button><button type="button" onClick={onClose} className="flex-1 bg-gray-100 text-gray-800 py-2.5 rounded-lg font-bold hover:bg-gray-200">إلغاء</button></div>
        </form>
      </div>
    </div>
  );
}

// ... (باقي المكونات مثل DeveloperSettings وغيرها تظل كما هي في الرد السابق)


