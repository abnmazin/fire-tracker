import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  LogOut, 
  Plus, 
  FileText, 
  Settings, 
  LayoutDashboard, 
  FireExtinguisher, 
  Search, 
  Users,
  CheckCircle,
  XCircle,
  ClipboardList,
  ArrowRightLeft,
  Archive,
  Edit,
  Filter,
  UserPlus,
  Trash2,
  Phone,
  Menu,
  X
} from 'lucide-react';

// القائمة المنسدلة للمواقع
const LOCATIONS = ['مسجد البصرة', 'موكب كربلا', 'موكب النجف', 'موكب سامراء', 'المشاية'];

// --- البيانات الأولية (Mock Data) ---
const initialUsers = [
  { id: 1, name: 'المبرمج الأعلى', username: 'dev', password: '123', role: 'developer' },
  { id: 2, name: 'مدير النظام', username: 'admin', password: '123', role: 'admin' },
  { id: 3, name: 'المفتش أحمد', username: 'user', password: '123', role: 'member' }
];

const initialContacts = [
  { id: 1, name: 'إدارة المسجد', phone: '07800000000' },
  { id: 2, name: 'الصيانة والطوارئ', phone: '07700000000' }
];

// دوال مساعدة لحساب التواريخ
const calculateNextDate = (lastDateStr) => {
  if (!lastDateStr) return '';
  const d = new Date(lastDateStr);
  d.setMonth(d.getMonth() + 6);
  return d.toISOString().split('T')[0];
};

const calculateStatus = (nextDateStr) => {
  if (!nextDateStr) return 'مجهولة';
  const next = new Date(nextDateStr);
  const now = new Date();
  const diffDays = Math.ceil((next - now) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'منتهية';
  if (diffDays <= 14) return 'فحص قريب'; 
  return 'صالحة';
};

// إنشاء تواريخ وهمية لتجربة النظام
const today = new Date();
const formatDate = (d) => d.toISOString().split('T')[0];

const dToday = formatDate(today);
const d1MonthAgo = formatDate(new Date(today.getFullYear(), today.getMonth() - 1, today.getDate()));
const d5MonthsAgo = formatDate(new Date(today.getFullYear(), today.getMonth() - 5, today.getDate()));
const d5AndHalfMonthsAgo = formatDate(new Date(today.getFullYear(), today.getMonth() - 5, today.getDate() - 20)); // سينتهي بعد أيام
const d8MonthsAgo = formatDate(new Date(today.getFullYear(), today.getMonth() - 8, today.getDate())); // منتهي الصلاحية

const initialExtinguishers = [
  { id: 1, number: 'EXT-001', size: '6Kg', type: 'Powder', location: 'مسجد البصرة', lastDate: d1MonthAgo, nextDate: calculateNextDate(d1MonthAgo), status: 'صالحة', notes: '', inCabinet: true },
  { id: 2, number: 'EXT-002', size: '12Kg', type: 'CO2', location: 'موكب كربلا', lastDate: d8MonthsAgo, nextDate: calculateNextDate(d8MonthsAgo), status: 'منتهية', notes: 'تحتاج إعادة تعبئة سريع', inCabinet: false },
  { id: 3, number: 'EXT-003', size: '6Kg', type: 'Foam', location: 'موكب النجف', lastDate: d5AndHalfMonthsAgo, nextDate: calculateNextDate(d5AndHalfMonthsAgo), status: 'فحص قريب', notes: 'يجب التجهيز للفحص', inCabinet: false },
  { id: 4, number: 'EXT-004', size: '9L', type: 'Water', location: 'مسجد البصرة', lastDate: dToday, nextDate: calculateNextDate(dToday), status: 'صالحة', notes: 'جديدة تماماً', inCabinet: true },
  { id: 5, number: 'EXT-005', size: '6Kg', type: 'Powder', location: 'المشاية', lastDate: d8MonthsAgo, nextDate: calculateNextDate(d8MonthsAgo), status: 'منتهية', notes: 'مقبض تالف', inCabinet: false },
  { id: 6, number: 'EXT-006', size: '4Kg', type: 'CO2', location: 'موكب سامراء', lastDate: d5MonthsAgo, nextDate: calculateNextDate(d5MonthsAgo), status: 'صالحة', notes: '', inCabinet: true },
  { id: 7, number: 'EXT-007', size: '12Kg', type: 'Powder', location: 'موكب كربلا', lastDate: d1MonthAgo, nextDate: calculateNextDate(d1MonthAgo), status: 'صالحة', notes: '', inCabinet: false },
];

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [extinguishers, setExtinguishers] = useState(initialExtinguishers);
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState(initialUsers);
  const [auditLogs, setAuditLogs] = useState([]);
  const [contacts, setContacts] = useState(initialContacts);

  useEffect(() => {
    setExtinguishers(prev => prev.map(ext => ({
      ...ext,
      status: calculateStatus(ext.nextDate)
    })));
  }, []);

  const navigateTo = (view) => {
    setCurrentView(view);
    setIsMobileMenuOpen(false);
  };

  if (!currentUser) {
    return <LoginScreen onLogin={(u) => setCurrentUser(u)} users={users} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans text-right" dir="rtl">
      {/* القائمة الجانبية */}
      <aside className="w-full md:w-64 bg-red-800 text-white flex flex-col shadow-xl md:min-h-screen z-20 sticky top-0 md:relative">
        <div className="p-4 md:p-6 flex justify-between items-center md:flex-col border-b border-red-700">
          <div className="flex items-center md:flex-col gap-3 md:gap-0">
            <img 
              src="https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=150&h=150&fit=crop" 
              alt="شعار مسجد الموسوي الكبير" 
              className="w-12 h-12 md:w-16 md:h-16 rounded-full border-2 border-red-200 object-cover bg-white" 
            />
            <div className="md:mt-3 md:text-center">
              <h1 className="text-base md:text-xl font-bold leading-tight">مسجد الموسوي الكبير</h1>
              <p className="hidden md:block text-xs text-red-200 mt-1">نظام تتبع طفايات الحريق</p>
            </div>
          </div>
          <button 
            className="md:hidden text-red-100 hover:text-white p-1" 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
        
        <div className={`${isMobileMenuOpen ? 'flex' : 'hidden'} md:flex flex-col flex-1 absolute md:relative top-full left-0 right-0 bg-red-800 md:bg-transparent shadow-xl md:shadow-none`}>
          <div className="p-4 border-b border-red-700/50 flex md:flex-col justify-between md:justify-center items-center md:text-center bg-red-900/30">
            <p className="text-sm text-red-100">مرحباً، {currentUser.name}</p>
            <span className="text-xs bg-red-700 md:bg-red-900 px-2 py-1 rounded-full md:mt-2 shadow-sm border border-red-600">
              {currentUser.role === 'developer' ? 'مبرمج' : currentUser.role === 'admin' ? 'مسؤول' : 'مفتش'}
            </span>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            <SidebarBtn icon={LayoutDashboard} label="لوحة التحكم" active={currentView === 'dashboard'} onClick={() => navigateTo('dashboard')} />
            <SidebarBtn icon={FireExtinguisher} label="سجل الطفايات" active={currentView === 'list'} onClick={() => navigateTo('list')} />
            {(currentUser.role === 'developer' || currentUser.role === 'admin') && (
              <>
                <SidebarBtn icon={Users} label="المستخدمين" active={currentView === 'users'} onClick={() => navigateTo('users')} />
                <SidebarBtn icon={ClipboardList} label="سجل التغييرات" active={currentView === 'audit'} onClick={() => navigateTo('audit')} />
              </>
            )}
          </nav>

          <div className="p-4 border-t border-red-700 mt-auto">
            <button 
              onClick={() => setCurrentUser(null)}
              className="flex items-center w-full p-2 text-red-200 hover:text-white hover:bg-red-700 rounded-lg transition-colors md:mb-4"
            >
              <LogOut className="w-5 h-5 ml-3" />
              تسجيل الخروج
            </button>
            <div className="hidden md:block text-center text-xs text-red-300 opacity-80 pt-2 border-t border-red-700/50">
              <p>حقوق المسجد محفوظة © 2026</p>
              <p dir="ltr" className="mt-1 font-mono text-[10px]">abnmazin.engineer 2026</p>
            </div>
          </div>
        </div>
      </aside>

      {/* المحتوى الرئيسي */}
      <main className="flex-1 p-4 md:p-6 overflow-y-auto w-full max-w-full relative z-10">
        {currentView === 'dashboard' && <Dashboard extinguishers={extinguishers} contacts={contacts} setContacts={setContacts} user={currentUser} />}
        {currentView === 'list' && (
          <ExtinguishersList 
            extinguishers={extinguishers} 
            setExtinguishers={setExtinguishers}
            logs={logs}
            setLogs={setLogs}
            user={currentUser} 
            setAuditLogs={setAuditLogs}
          />
        )}
        {currentView === 'users' && (
          <UsersList 
            users={users} 
            setUsers={setUsers}
            currentUser={currentUser} 
            setAuditLogs={setAuditLogs}
          />
        )}
        {currentView === 'audit' && <AuditLogsList logs={auditLogs} userRole={currentUser.role} />}
      </main>
    </div>
  );
}

// ==========================================
// المكونات الفرعية (Sub-components)
// ==========================================

function SidebarBtn({ icon: Icon, label, active, onClick }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center w-full p-3 rounded-lg transition-colors ${
        active ? 'bg-red-900 text-white font-medium shadow-inner' : 'text-red-100 hover:bg-red-700'
      }`}
    >
      <Icon className="w-5 h-5 ml-3" />
      {label}
    </button>
  );
}

// 1. شاشة تسجيل الدخول
function LoginScreen({ onLogin, users }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
      onLogin(user);
    } else {
      setError('اسم المستخدم أو كلمة المرور غير صحيحة.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-xl w-full max-w-md">
        <div className="text-center mb-8">
          <img 
            src="https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=150&h=150&fit=crop" 
            alt="شعار مسجد الموسوي الكبير" 
            className="w-20 h-20 mx-auto mb-4 rounded-full border-4 border-red-100 object-cover shadow-sm bg-white" 
          />
          <h2 className="text-xl md:text-2xl font-bold text-gray-800">مسجد الموسوي الكبير</h2>
          <p className="text-gray-500 text-sm mt-2">نظام تتبع طفايات الحريق</p>
        </div>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm text-center">{error}</div>}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">اسم المستخدم</label>
            <input 
              type="text" 
              value={username} onChange={e => setUsername(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 outline-none transition-shadow"
              placeholder="dev / admin / user"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور</label>
            <input 
              type="password" 
              value={password} onChange={e => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-red-500 outline-none transition-shadow"
              placeholder="123"
              required
            />
          </div>
          <button type="submit" className="w-full bg-red-600 text-white font-bold py-3 rounded-lg hover:bg-red-700 transition-colors shadow-md hover:shadow-lg mt-2">
            تسجيل الدخول
          </button>
        </form>
        
        <div className="mt-6 text-center text-xs text-gray-400 border-t pt-4">
          <p>حقوق المسجد محفوظة © 2026</p>
          <p dir="ltr" className="mt-1 font-mono">abnmazin.engineer 2026</p>
        </div>
      </div>
    </div>
  );
}

// 2. لوحة التحكم (Dashboard)
function Dashboard({ extinguishers, contacts, setContacts, user }) {
  const [showContactsModal, setShowContactsModal] = useState(false);

  const stats = useMemo(() => {
    return {
      total: extinguishers.length,
      valid: extinguishers.filter(e => e.status === 'صالحة').length,
      warning: extinguishers.filter(e => e.status === 'فحص قريب').length,
      expired: extinguishers.filter(e => e.status === 'منتهية').length,
    };
  }, [extinguishers]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl md:text-2xl font-bold text-gray-800">نظرة عامة</h2>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard title="إجمالي الطفايات" count={stats.total} icon={FireExtinguisher} color="bg-blue-500" />
        <StatCard title="صالحة للعمل" count={stats.valid} icon={ShieldCheck} color="bg-green-500" />
        <StatCard title="فحص قريب" count={stats.warning} icon={AlertTriangle} color="bg-yellow-500" />
        <StatCard title="تحتاج صيانة" count={stats.expired} icon={ShieldAlert} color="bg-red-600" />
      </div>

      <div className="bg-white rounded-xl shadow p-4 md:p-6 border border-gray-100">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
          <AlertTriangle className="w-5 h-5 ml-2 text-red-500" />
          تتطلب انتباهاً عاجلاً
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-right min-w-[300px]">
            <thead>
              <tr className="border-b text-gray-500 text-sm">
                <th className="p-3">الرقم</th>
                <th className="p-3">الموقع</th>
                <th className="p-3">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {extinguishers.filter(e => e.status !== 'صالحة').map(ext => (
                <tr key={ext.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium text-sm">{ext.number}</td>
                  <td className="p-3 text-gray-600 text-sm">{ext.location}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-[10px] md:text-xs font-bold whitespace-nowrap ${ext.status === 'منتهية' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {ext.status}
                    </span>
                  </td>
                </tr>
              ))}
              {extinguishers.filter(e => e.status !== 'صالحة').length === 0 && (
                <tr>
                  <td colSpan="3" className="p-4 text-center text-green-600 font-medium text-sm">
                    جميع الطفايات بحالة جيدة حالياً!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* قسم أرقام الطوارئ */}
      <div className="bg-white rounded-xl shadow p-4 md:p-6 mt-6 border border-gray-100">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
          <h3 className="text-lg font-bold text-gray-800 flex items-center">
            <Phone className="w-5 h-5 ml-2 text-blue-500" />
            أرقام الطوارئ
          </h3>
          {user.role === 'developer' && (
            <button 
              onClick={() => setShowContactsModal(true)} 
              className="text-sm bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1.5 rounded-lg flex items-center font-medium transition-colors w-full sm:w-auto justify-center"
            >
              <Edit className="w-4 h-4 ml-1" /> تعديل الأرقام
            </button>
          )}
        </div>
        
        {contacts.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">لا توجد أرقام اتصال مسجلة.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {contacts.map(c => (
              <div key={c.id} className="border border-gray-100 bg-gray-50 p-4 rounded-xl flex flex-col justify-center items-center text-center shadow-sm">
                <span className="font-bold text-gray-800 mb-1">{c.name}</span>
                <span className="text-blue-600 font-medium" dir="ltr">{c.phone}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {showContactsModal && (
        <EditContactsModal contacts={contacts} onClose={() => setShowContactsModal(false)} onSave={setContacts} />
      )}
    </div>
  );
}

function EditContactsModal({ contacts, onClose, onSave }) {
  const [editedContacts, setEditedContacts] = useState([...contacts]);

  const handleAdd = () => {
    const newId = editedContacts.length ? Math.max(...editedContacts.map(c => c.id)) + 1 : 1;
    setEditedContacts([...editedContacts, { id: newId, name: '', phone: '' }]);
  };

  const handleRemove = (id) => setEditedContacts(editedContacts.filter(c => c.id !== id));
  const handleChange = (id, field, value) => setEditedContacts(editedContacts.map(c => c.id === id ? { ...c, [field]: value } : c));

  const handleSave = (e) => {
    e.preventDefault();
    const validContacts = editedContacts.filter(c => c.name.trim() !== '' && c.phone.trim() !== '');
    onSave(validContacts);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] my-auto">
        <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
          <h3 className="font-bold text-lg">تعديل أرقام الطوارئ</h3>
          <button onClick={onClose} className="text-blue-200 hover:text-white p-1">&times;</button>
        </div>
        <div className="p-4 md:p-6 overflow-y-auto flex-1">
          {editedContacts.map((c) => (
            <div key={c.id} className="flex flex-col sm:flex-row gap-2 mb-4 p-3 bg-gray-50 border rounded-lg items-start sm:items-center">
              <div className="flex-1 w-full space-y-2">
                <input type="text" placeholder="الاسم" className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 text-sm" value={c.name} onChange={e => handleChange(c.id, 'name', e.target.value)} />
                <input type="text" placeholder="رقم الهاتف" className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 text-sm text-left" value={c.phone} onChange={e => handleChange(c.id, 'phone', e.target.value)} dir="ltr" />
              </div>
              <button type="button" onClick={() => handleRemove(c.id)} className="bg-red-50 text-red-500 p-2 rounded hover:bg-red-100 transition-colors w-full sm:w-auto flex justify-center mt-2 sm:mt-0"><Trash2 className="w-5 h-5" /></button>
            </div>
          ))}
          <button type="button" onClick={handleAdd} className="w-full mt-2 border-2 border-dashed border-gray-300 text-gray-500 py-3 rounded-lg hover:bg-gray-50 hover:text-blue-600 hover:border-blue-300 transition-colors flex items-center justify-center font-medium">
            <Plus className="w-5 h-5 ml-1" /> إضافة رقم جديد
          </button>
        </div>
        <div className="p-4 border-t bg-gray-50 flex gap-2">
          <button onClick={handleSave} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors">حفظ</button>
          <button onClick={onClose} className="flex-1 bg-gray-200 text-gray-800 py-2.5 rounded-lg font-medium hover:bg-gray-300 transition-colors">إلغاء</button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, count, icon: Icon, color }) {
  return (
    <div className="bg-white rounded-xl shadow p-3 md:p-6 border border-gray-100 flex items-center">
      <div className={`${color} p-2 md:p-4 rounded-lg text-white ml-2 md:ml-4 shadow-sm`}>
        <Icon className="w-5 h-5 md:w-6 md:h-6" />
      </div>
      <div>
        <h4 className="text-gray-500 text-[10px] md:text-sm font-medium">{title}</h4>
        <p className="text-lg md:text-2xl font-bold text-gray-800">{count}</p>
      </div>
    </div>
  );
}

// 3. إدارة الطفايات وسجلها
function ExtinguishersList({ extinguishers, setExtinguishers, logs, setLogs, user, setAuditLogs }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterCabinet, setFilterCabinet] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [inspectModalData, setInspectModalData] = useState(null);
  const [transferModalData, setTransferModalData] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [editModalData, setEditModalData] = useState(null);

  const canEdit = user.role === 'developer' || user.role === 'admin';

  const filtered = extinguishers.filter(e => {
    const matchesSearch = e.number.toLowerCase().includes(searchTerm.toLowerCase()) || e.location.includes(searchTerm);
    const matchesType = filterType === 'All' || e.type === filterType;
    const matchesCabinet = filterCabinet === 'All' ? true : filterCabinet === 'Yes' ? e.inCabinet : !e.inCabinet;
    return matchesSearch && matchesType && matchesCabinet;
  });

  const handleAddExtinguisher = (newExt) => {
    const newId = extinguishers.length ? Math.max(...extinguishers.map(e=>e.id)) + 1 : 1;
    const extWithDates = { ...newExt, id: newId, nextDate: calculateNextDate(newExt.lastDate), status: calculateStatus(calculateNextDate(newExt.lastDate)) };
    setExtinguishers([...extinguishers, extWithDates]);
    setShowAddModal(false);
    setAuditLogs(prev => [{ id: Date.now(), date: new Date().toLocaleString('ar-EG'), userName: user.name, action: 'إضافة طفاية', details: `تمت إضافة طفاية برقم ${newExt.number} في "${newExt.location}"` }, ...prev]);
  };

  const handleInspect = (extId, condition, remarks, date) => {
    const newLog = { id: Date.now(), extId, inspectorId: user.id, inspectorName: user.name, date, condition, remarks };
    setLogs([newLog, ...logs]);
    setExtinguishers(prev => prev.map(ext => {
      if (ext.id === extId) {
        const nextD = condition === 'سليمة' ? calculateNextDate(date) : ext.nextDate; 
        return { ...ext, lastDate: date, nextDate: nextD, status: condition === 'سليمة' ? calculateStatus(nextD) : 'تحتاج صيانة', notes: remarks || ext.notes };
      }
      return ext;
    }));
    const ext = extinguishers.find(e => e.id === extId);
    setAuditLogs(prev => [{ id: Date.now(), date: new Date().toLocaleString('ar-EG'), userName: user.name, action: 'فحص ميداني', details: `تم فحص الطفاية ${ext?.number} بنتيجة: ${condition}` }, ...prev]);
    setInspectModalData(null);
  };

  const handleEdit = (updatedExt) => {
    const extWithDates = { ...updatedExt, nextDate: calculateNextDate(updatedExt.lastDate), status: calculateStatus(calculateNextDate(updatedExt.lastDate)) };
    setExtinguishers(prev => prev.map(e => e.id === updatedExt.id ? extWithDates : e));
    setAuditLogs(prev => [{ id: Date.now(), date: new Date().toLocaleString('ar-EG'), userName: user.name, action: 'تعديل طفاية', details: `تم تعديل بيانات الطفاية رقم ${updatedExt.number}` }, ...prev]);
    setEditModalData(null);
  };

  const handleTransfer = (extIds, newLocation) => {
    const extsToTransfer = extinguishers.filter(e => extIds.includes(e.id));
    const extNumbers = extsToTransfer.map(e => e.number).join('، ');
    setExtinguishers(prev => prev.map(e => extIds.includes(e.id) ? { ...e, location: newLocation } : e));
    setAuditLogs(prev => [{ id: Date.now(), date: new Date().toLocaleString('ar-EG'), userName: user.name, action: extIds.length > 1 ? 'ترحيل جماعي' : 'ترحيل طفاية', details: `تم نقل ${extIds.length > 1 ? 'الطفايات' : 'الطفاية'} (${extNumbers}) إلى "${newLocation}"` }, ...prev]);
    setTransferModalData(null);
    setSelectedIds([]); 
  };

  const getStatusColor = (status) => {
    if (status === 'صالحة') return 'bg-green-100 text-green-700';
    if (status === 'فحص قريب') return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  return (
    <div className="space-y-4">
      {/* شريط الأدوات والفلاتر */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800">دليل الطفايات</h2>
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto flex-wrap sm:flex-nowrap items-center">
          
          <div className="flex flex-row gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-36">
              <Filter className="w-4 h-4 absolute right-3 top-3 text-gray-400" />
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-full pl-2 pr-8 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-xs sm:text-sm text-gray-600 appearance-none bg-gray-50">
                <option value="All">كل الأنواع</option>
                <option value="Powder">بودرة (Powder)</option>
                <option value="CO2">ثاني أكسيد الكربون</option>
                <option value="Foam">رغوة (Foam)</option>
                <option value="Water">ماء (Water)</option>
              </select>
            </div>
            
            <div className="relative flex-1 sm:w-36">
              <Archive className="w-4 h-4 absolute right-3 top-3 text-gray-400" />
              <select value={filterCabinet} onChange={(e) => setFilterCabinet(e.target.value)} className="w-full pl-2 pr-8 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-xs sm:text-sm text-gray-600 appearance-none bg-gray-50">
                <option value="All">الكابينة (الكل)</option>
                <option value="Yes">داخل كابينة</option>
                <option value="No">بدون كابينة</option>
              </select>
            </div>
          </div>

          <div className="relative w-full sm:w-48 lg:w-56">
            <Search className="w-5 h-5 absolute right-3 top-2.5 text-gray-400" />
            <input type="text" placeholder="بحث بالرقم أو الموقع..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-3 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm" />
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto">
            {selectedIds.length > 0 && canEdit && (
              <button onClick={() => setTransferModalData(extinguishers.filter(e => selectedIds.includes(e.id)))} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center transition-colors shadow-sm text-sm whitespace-nowrap">
                <ArrowRightLeft className="w-4 h-4 ml-1 sm:ml-2" /> ترحيل ({selectedIds.length})
              </button>
            )}
            {canEdit && (
              <button onClick={() => setShowAddModal(true)} className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center transition-colors text-sm whitespace-nowrap shadow-sm">
                <Plus className="w-4 h-4 sm:w-5 sm:h-5 ml-1" /> إضافة
              </button>
            )}
          </div>
        </div>
      </div>

      {/* العرض الخاص بالشاشات الكبيرة (جدول) */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden w-full">
        <table className="w-full text-right">
          <thead className="bg-gray-50 text-gray-600 font-medium text-sm">
            <tr>
              {canEdit && (
                <th className="p-3 w-10 text-center">
                  <input type="checkbox" className="w-4 h-4 text-red-600 rounded focus:ring-red-500 cursor-pointer" onChange={(e) => { if (e.target.checked) setSelectedIds(filtered.filter(ext => !ext.inCabinet).map(ext => ext.id)); else setSelectedIds([]); }} checked={filtered.length > 0 && selectedIds.length === filtered.filter(ext => !ext.inCabinet).length} />
                </th>
              )}
              <th className="p-3">الرقم</th>
              <th className="p-3">النوع والحجم</th>
              <th className="p-3">الموقع</th>
              <th className="p-3">آخر فحص</th>
              <th className="p-3">الفحص القادم</th>
              <th className="p-3">الحالة</th>
              <th className="p-3">ملاحظات</th>
              <th className="p-3 text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {filtered.map(ext => (
              <tr key={ext.id} className={`hover:bg-gray-50 transition-colors ${selectedIds.includes(ext.id) ? 'bg-purple-50' : ''}`}>
                {canEdit && (
                  <td className="p-3 text-center">
                    <input type="checkbox" disabled={ext.inCabinet} className="w-4 h-4 text-red-600 rounded focus:ring-red-500 disabled:opacity-30 cursor-pointer" checked={selectedIds.includes(ext.id)} onChange={(e) => { if (e.target.checked) setSelectedIds([...selectedIds, ext.id]); else setSelectedIds(selectedIds.filter(id => id !== ext.id)); }} />
                  </td>
                )}
                <td className="p-3 font-bold text-gray-800">
                  <div className="flex items-center gap-2">
                    {ext.number}
                    {ext.inCabinet && <span title="موضوعة في كابينة" className="bg-gray-200 text-gray-500 p-1 rounded-md"><Archive className="w-3 h-3" /></span>}
                  </div>
                </td>
                <td className="p-3"><span className="bg-gray-200 px-2 py-1 rounded text-gray-700 text-xs">{ext.type}</span> {ext.size}</td>
                <td className="p-3 text-gray-600">{ext.location}</td>
                <td className="p-3 text-gray-500 whitespace-nowrap">{ext.lastDate}</td>
                <td className="p-3 font-medium whitespace-nowrap">{ext.nextDate}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-full text-[11px] font-bold flex items-center w-max ${getStatusColor(ext.status)}`}>
                    {ext.status === 'صالحة' ? <CheckCircle className="w-3 h-3 ml-1" /> : <XCircle className="w-3 h-3 ml-1" />}
                    {ext.status}
                  </span>
                </td>
                <td className="p-3 text-gray-500 text-xs max-w-[120px] truncate" title={ext.notes}>{ext.notes || '-'}</td>
                <td className="p-3 text-center">
                  <div className="flex justify-center gap-2">
                    <button onClick={() => setInspectModalData(ext)} className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-1.5 rounded text-xs font-medium transition-colors">فحص</button>
                    {canEdit && (
                      <>
                        <button onClick={() => setEditModalData(ext)} className="bg-green-50 text-green-600 hover:bg-green-100 px-2 py-1.5 rounded text-xs font-medium transition-colors flex items-center"><Edit className="w-3 h-3 ml-1" /> تعديل</button>
                        <button onClick={() => setTransferModalData([ext])} disabled={ext.inCabinet} className={`px-2 py-1.5 rounded text-xs font-medium transition-colors flex items-center ${ext.inCabinet ? 'bg-gray-50 text-gray-400 cursor-not-allowed border border-gray-100' : 'bg-purple-50 text-purple-600 hover:bg-purple-100'}`}><ArrowRightLeft className="w-3 h-3 ml-1" /> ترحيل</button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={canEdit ? "8" : "7"} className="p-6 text-center text-gray-500">لا توجد طفايات مطابقة للبحث.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* العرض الخاص بالموبايل (بطاقات متراصة) */}
      <div className="md:hidden flex flex-col gap-4">
        {filtered.map(ext => (
          <div key={ext.id} className={`bg-white rounded-xl shadow-sm border flex flex-col gap-3 p-4 transition-colors ${selectedIds.includes(ext.id) ? 'border-purple-300 bg-purple-50' : 'border-gray-100'}`}>
            
            {/* Header: Number and Status */}
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                {canEdit && (
                  <input 
                    type="checkbox" disabled={ext.inCabinet} checked={selectedIds.includes(ext.id)}
                    className="w-5 h-5 text-red-600 rounded focus:ring-red-500 disabled:opacity-30"
                    onChange={(e) => { if (e.target.checked) setSelectedIds([...selectedIds, ext.id]); else setSelectedIds(selectedIds.filter(id => id !== ext.id)); }} 
                  />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-800 text-lg">{ext.number}</span>
                    {ext.inCabinet && <span className="bg-gray-200 text-gray-500 p-1.5 rounded-md"><Archive className="w-3 h-3" /></span>}
                  </div>
                  <span className="text-gray-500 text-xs">{ext.type} - {ext.size}</span>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center ${getStatusColor(ext.status)}`}>
                {ext.status === 'صالحة' ? <CheckCircle className="w-3 h-3 ml-1" /> : <XCircle className="w-3 h-3 ml-1" />}
                {ext.status}
              </span>
            </div>
            
            {/* Body: Info Grid */}
            <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm bg-gray-50 p-3 rounded-lg border border-gray-100">
              <div><span className="text-gray-400 block text-[10px] mb-0.5">الموقع</span><span className="font-medium text-gray-700">{ext.location}</span></div>
              <div><span className="text-gray-400 block text-[10px] mb-0.5">آخر فحص</span><span className="font-medium text-gray-700">{ext.lastDate}</span></div>
              <div className="col-span-2 pt-2 border-t border-gray-200/60"><span className="text-gray-400 block text-[10px] mb-0.5">موعد الفحص القادم</span><span className="font-bold text-gray-800">{ext.nextDate}</span></div>
            </div>
            
            {ext.notes && (
              <div className="text-xs bg-yellow-50 text-yellow-800 p-2.5 rounded-lg border border-yellow-100 flex items-start">
                <FileText className="w-4 h-4 ml-1.5 shrink-0 mt-0.5 text-yellow-600" />
                <span><strong className="font-bold">ملاحظة: </strong>{ext.notes}</span>
              </div>
            )}

            {/* Footer: Actions */}
            <div className="flex gap-2 pt-1">
              <button onClick={() => setInspectModalData(ext)} className="flex-1 bg-blue-50 text-blue-600 hover:bg-blue-100 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center">فحص</button>
              {canEdit && (
                <>
                  <button onClick={() => setEditModalData(ext)} className="flex-1 bg-green-50 text-green-600 hover:bg-green-100 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center"><Edit className="w-4 h-4 ml-1" /> تعديل</button>
                  <button onClick={() => setTransferModalData([ext])} disabled={ext.inCabinet} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center ${ext.inCabinet ? 'bg-gray-50 text-gray-400 cursor-not-allowed border border-gray-100' : 'bg-purple-50 text-purple-600 hover:bg-purple-100'}`}><ArrowRightLeft className="w-4 h-4 ml-1" /> ترحيل</button>
                </>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="p-8 text-center text-gray-500 bg-white rounded-xl border border-gray-100">لا توجد طفايات مطابقة للبحث.</div>}
      </div>

      {showAddModal && <AddExtinguisherModal onClose={() => setShowAddModal(false)} onAdd={handleAddExtinguisher} />}
      {inspectModalData && <InspectModal ext={inspectModalData} onClose={() => setInspectModalData(null)} onSubmit={handleInspect} />}
      {editModalData && <EditExtinguisherModal ext={editModalData} onClose={() => setEditModalData(null)} onEdit={handleEdit} />}
      {transferModalData && <TransferModal exts={transferModalData} onClose={() => setTransferModalData(null)} onSubmit={handleTransfer} />}
    </div>
  );
}

// 4. نافذة إضافة طفاية جديدة
function AddExtinguisherModal({ onClose, onAdd }) {
  const [formData, setFormData] = useState({ number: '', size: '6Kg', type: 'Powder', location: LOCATIONS[0], lastDate: new Date().toISOString().split('T')[0], notes: '', inCabinet: false });
  const handleSubmit = (e) => { e.preventDefault(); onAdd(formData); };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden my-auto">
        <div className="bg-red-600 text-white p-4 flex justify-between items-center"><h3 className="font-bold text-lg">إضافة طفاية</h3><button onClick={onClose} className="text-red-200 hover:text-white p-1">&times;</button></div>
        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
          <div><label className="block text-sm text-gray-600 mb-1">رقم الطفاية (الباركود)</label><input required type="text" className="w-full border p-2 rounded focus:ring-2 focus:ring-red-500" value={formData.number} onChange={e => setFormData({...formData, number: e.target.value})} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm text-gray-600 mb-1">النوع</label><select className="w-full border p-2 rounded" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}><option value="Powder">بودرة</option><option value="CO2">CO2</option><option value="Foam">رغوة</option><option value="Water">ماء</option></select></div>
            <div><label className="block text-sm text-gray-600 mb-1">الحجم</label><input required type="text" placeholder="مثال: 6Kg" className="w-full border p-2 rounded" value={formData.size} onChange={e => setFormData({...formData, size: e.target.value})} /></div>
          </div>
          <div><label className="block text-sm text-gray-600 mb-1">الموقع</label><select className="w-full border p-2 rounded focus:ring-2 focus:ring-red-500" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})}>{LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}</select></div>
          <div className="flex items-center gap-2 bg-gray-50 p-3 rounded border border-gray-200"><input type="checkbox" id="inCabinet" className="w-4 h-4 text-red-600 rounded focus:ring-red-500 cursor-pointer" checked={formData.inCabinet} onChange={e => setFormData({...formData, inCabinet: e.target.checked})} /><label htmlFor="inCabinet" className="text-xs sm:text-sm font-medium text-gray-700 cursor-pointer select-none leading-tight">مثبتة داخل كابينة (يمنع النقل)</label></div>
          <div><label className="block text-sm text-gray-600 mb-1">تاريخ آخر فحص</label><input required type="date" className="w-full border p-2 rounded" value={formData.lastDate} onChange={e => setFormData({...formData, lastDate: e.target.value})} /><p className="text-[10px] text-gray-400 mt-1">* الفحص القادم تلقائي بعد 6 أشهر.</p></div>
          <div className="pt-2 flex gap-2"><button type="submit" className="flex-1 bg-red-600 text-white py-2.5 rounded-lg font-medium hover:bg-red-700">حفظ</button><button type="button" onClick={onClose} className="flex-1 bg-gray-200 text-gray-800 py-2.5 rounded-lg font-medium hover:bg-gray-300">إلغاء</button></div>
        </form>
      </div>
    </div>
  );
}

// 4.5 نافذة تعديل بيانات الطفاية
function EditExtinguisherModal({ ext, onClose, onEdit }) {
  const [formData, setFormData] = useState({ ...ext });
  const handleSubmit = (e) => { e.preventDefault(); onEdit(formData); };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden my-auto">
        <div className="bg-green-600 text-white p-4 flex justify-between items-center"><h3 className="font-bold text-lg">تعديل بيانات الطفاية</h3><button onClick={onClose} className="text-green-200 hover:text-white p-1">&times;</button></div>
        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
          <div><label className="block text-sm text-gray-600 mb-1">رقم الطفاية</label><input required type="text" className="w-full border p-2 rounded focus:ring-2 focus:ring-green-500" value={formData.number} onChange={e => setFormData({...formData, number: e.target.value})} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm text-gray-600 mb-1">النوع</label><select className="w-full border p-2 rounded focus:ring-2 focus:ring-green-500" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}><option value="Powder">بودرة</option><option value="CO2">CO2</option><option value="Foam">رغوة</option><option value="Water">ماء</option></select></div>
            <div><label className="block text-sm text-gray-600 mb-1">الحجم</label><input required type="text" placeholder="مثال: 6Kg" className="w-full border p-2 rounded focus:ring-2 focus:ring-green-500" value={formData.size} onChange={e => setFormData({...formData, size: e.target.value})} /></div>
          </div>
          <div><label className="block text-sm text-gray-600 mb-1">الموقع</label><select className="w-full border p-2 rounded focus:ring-2 focus:ring-green-500" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})}>{LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}</select></div>
          <div className="flex items-center gap-2 bg-gray-50 p-3 rounded border border-gray-200"><input type="checkbox" id="editInCabinet" className="w-4 h-4 text-green-600 rounded focus:ring-green-500 cursor-pointer" checked={formData.inCabinet} onChange={e => setFormData({...formData, inCabinet: e.target.checked})} /><label htmlFor="editInCabinet" className="text-xs sm:text-sm font-medium text-gray-700 cursor-pointer select-none leading-tight">مثبتة داخل كابينة (تمنع الترحيل)</label></div>
          <div><label className="block text-sm text-gray-600 mb-1">تاريخ آخر فحص</label><input required type="date" className="w-full border p-2 rounded focus:ring-2 focus:ring-green-500" value={formData.lastDate} onChange={e => setFormData({...formData, lastDate: e.target.value})} /></div>
          <div className="pt-2 flex gap-2"><button type="submit" className="flex-1 bg-green-600 text-white py-2.5 rounded-lg font-medium hover:bg-green-700">حفظ التعديلات</button><button type="button" onClick={onClose} className="flex-1 bg-gray-200 text-gray-800 py-2.5 rounded-lg font-medium hover:bg-gray-300">إلغاء</button></div>
        </form>
      </div>
    </div>
  );
}

// 5. نافذة تسجيل فحص
function InspectModal({ ext, onClose, onSubmit }) {
  const [condition, setCondition] = useState('سليمة');
  const [remarks, setRemarks] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const handleSubmit = (e) => { e.preventDefault(); onSubmit(ext.id, condition, remarks, date); };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden my-auto">
        <div className="bg-blue-600 text-white p-4"><h3 className="font-bold text-lg">تسجيل فحص ميداني</h3><p className="text-sm text-blue-100 opacity-90">طفاية رقم: {ext.number}</p></div>
        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
          <div><label className="block text-sm text-gray-600 mb-1">تاريخ الفحص</label><input required type="date" className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500" value={date} onChange={e => setDate(e.target.value)} /></div>
          <div><label className="block text-sm text-gray-600 mb-1">حالة الطفاية</label><select className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500" value={condition} onChange={e => setCondition(e.target.value)}><option value="سليمة">سليمة (يجدد الصلاحية 6 أشهر)</option><option value="تالفة">تالفة / تحتاج استبدال</option><option value="تسريب">يوجد تسريب</option><option value="إعادة تعبئة">تحتاج إعادة تعبئة</option></select></div>
          <div><label className="block text-sm text-gray-600 mb-1">ملاحظات (اختياري)</label><textarea className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 h-24 text-sm" placeholder="اكتب الملاحظات هنا..." value={remarks} onChange={e => setRemarks(e.target.value)} /></div>
          <div className="pt-2 flex gap-2"><button type="submit" className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700">تأكيد الفحص</button><button type="button" onClick={onClose} className="flex-1 bg-gray-200 text-gray-800 py-2.5 rounded-lg font-medium hover:bg-gray-300">إلغاء</button></div>
        </form>
      </div>
    </div>
  );
}

// 6. إدارة المستخدمين
function UsersList({ users, setUsers, currentUser, setAuditLogs }) {
  const [showAddModal, setShowAddModal] = useState(false);
  if (currentUser.role === 'member') return <div className="p-8 text-center text-red-500">عذراً، ليس لديك صلاحية للوصول لهذه الصفحة.</div>;

  const handleAddUser = (newUser) => {
    const newId = users.length ? Math.max(...users.map(u => u.id)) + 1 : 1;
    setUsers([...users, { ...newUser, id: newId }]); setShowAddModal(false);
    setAuditLogs(prev => [{ id: Date.now(), date: new Date().toLocaleString('ar-EG'), userName: currentUser.name, action: 'إضافة مستخدم', details: `إضافة حساب "${newUser.name}" بصلاحية "${newUser.role}"` }, ...prev]);
  };

  const handleDeleteUser = (id, name) => {
    if (id === currentUser.id) return; 
    setUsers(users.filter(u => u.id !== id));
    setAuditLogs(prev => [{ id: Date.now(), date: new Date().toLocaleString('ar-EG'), userName: currentUser.name, action: 'حذف مستخدم', details: `حذف حساب "${name}"` }, ...prev]);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
        <h2 className="text-xl font-bold text-gray-800">فريق العمل</h2>
        <button onClick={() => setShowAddModal(true)} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center transition-colors text-sm font-medium"><UserPlus className="w-4 h-4 ml-2" /> إضافة مستخدم</button>
      </div>
      <div className="overflow-x-auto w-full">
        <table className="w-full text-right min-w-[500px]">
          <thead className="bg-gray-50 text-gray-600 text-sm"><tr><th className="p-3">الاسم</th><th className="p-3">الحساب</th><th className="p-3">المرور</th><th className="p-3">الصلاحية</th><th className="p-3 text-center">إجراء</th></tr></thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                <td className="p-3 font-medium">{u.name}</td><td className="p-3 text-gray-600" dir="ltr">{u.username}</td><td className="p-3 text-gray-400">{u.password}</td>
                <td className="p-3"><span className={`px-2 py-1 rounded-full text-[11px] font-bold whitespace-nowrap ${u.role === 'developer' ? 'bg-purple-100 text-purple-700' : u.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>{u.role === 'developer' ? 'مبرمج' : u.role === 'admin' ? 'مسؤول' : 'مفتش / عضو'}</span></td>
                <td className="p-3 text-center">{u.id !== currentUser.id ? (<button onClick={() => handleDeleteUser(u.id, u.name)} className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-center mx-auto"><Trash2 className="w-3 h-3 ml-1" /> حذف</button>) : (<span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-1 rounded whitespace-nowrap">حسابك الحالي</span>)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showAddModal && <AddUserModal onClose={() => setShowAddModal(false)} onAdd={handleAddUser} currentUser={currentUser} />}
    </div>
  );
}

// 6.5 نافذة إضافة مستخدم
function AddUserModal({ onClose, onAdd, currentUser }) {
  const [formData, setFormData] = useState({ name: '', username: '', password: '', role: 'member' });
  const handleSubmit = (e) => { e.preventDefault(); onAdd(formData); };
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto"><div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden my-auto"><div className="bg-blue-600 text-white p-4 flex justify-between items-center"><h3 className="font-bold text-lg">إضافة مستخدم</h3><button onClick={onClose} className="text-blue-200 hover:text-white p-1">&times;</button></div><form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4"><div><label className="block text-sm text-gray-600 mb-1">الاسم الكامل</label><input required type="text" className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div><div><label className="block text-sm text-gray-600 mb-1">الحساب</label><input required type="text" className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} dir="ltr" /></div><div><label className="block text-sm text-gray-600 mb-1">المرور</label><input required type="text" className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} dir="ltr" /></div><div><label className="block text-sm text-gray-600 mb-1">الصلاحية</label><select className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}><option value="member">مفتش (محدودة)</option><option value="admin">مسؤول (إدارة)</option>{currentUser.role === 'developer' && (<option value="developer">مبرمج (كاملة)</option>)}</select></div><div className="pt-2 flex gap-2"><button type="submit" className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700">إضافة</button><button type="button" onClick={onClose} className="flex-1 bg-gray-200 text-gray-800 py-2.5 rounded-lg font-medium hover:bg-gray-300">إلغاء</button></div></form></div></div>
  );
}

// 7. نافذة ترحيل
function TransferModal({ exts, onClose, onSubmit }) {
  const [newLocation, setNewLocation] = useState(LOCATIONS[0]);
  const handleSubmit = (e) => { e.preventDefault(); if(newLocation.trim() !== '') onSubmit(exts.map(e => e.id), newLocation); };
  const isSingle = exts.length === 1;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto"><div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden my-auto"><div className="bg-purple-600 text-white p-4"><h3 className="font-bold text-lg flex items-center"><ArrowRightLeft className="w-5 h-5 ml-2" /> {isSingle ? 'ترحيل الطفاية' : 'ترحيل جماعي'}</h3><p className="text-sm text-purple-100 opacity-90 mt-1">{isSingle ? `رقم: ${exts[0].number}` : `العدد: ${exts.length}`}</p></div><form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">{isSingle && (<div><label className="block text-sm text-gray-600 mb-1">الموقع الحالي</label><input type="text" disabled className="w-full border p-2 rounded bg-gray-100 text-gray-500" value={exts[0].location} /></div>)}<div><label className="block text-sm text-gray-600 mb-1">الموقع الجديد (الوجهة)</label><select required className="w-full border p-2 rounded focus:ring-2 focus:ring-purple-500" value={newLocation} onChange={e => setNewLocation(e.target.value)}>{LOCATIONS.map(loc => <option key={loc} value={loc} disabled={isSingle && exts[0].location === loc}>{loc}</option>)}</select></div><div className="pt-2 flex gap-2"><button type="submit" className="flex-1 bg-purple-600 text-white py-2.5 rounded-lg font-medium hover:bg-purple-700">تأكيد الترحيل</button><button type="button" onClick={onClose} className="flex-1 bg-gray-200 text-gray-800 py-2.5 rounded-lg font-medium hover:bg-gray-300">إلغاء</button></div></form></div></div>
  );
}

// 8. سجل التغييرات
function AuditLogsList({ logs, userRole }) {
  if (userRole === 'member') return <div className="p-8 text-center text-red-500">عذراً، ليس لديك صلاحية.</div>;
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 w-full">
      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center"><ClipboardList className="w-6 h-6 ml-2 text-red-600" />سجل النشاطات</h2>
      
      {/* العرض الخاص بالشاشات الكبيرة (جدول) */}
      <div className="hidden md:block overflow-x-auto w-full">
        <table className="w-full text-right min-w-[600px]"><thead className="bg-gray-50 text-gray-600 text-sm"><tr><th className="p-3">التاريخ والوقت</th><th className="p-3">المستخدم</th><th className="p-3">الإجراء</th><th className="p-3">التفاصيل</th></tr></thead><tbody className="divide-y divide-gray-100 text-sm">{logs.length === 0 ? <tr><td colSpan="4" className="p-8 text-center text-gray-500">لا توجد سجلات.</td></tr> : logs.map(log => <tr key={log.id} className="hover:bg-gray-50"><td className="p-3 text-gray-500 whitespace-nowrap" dir="ltr">{log.date}</td><td className="p-3 font-medium text-blue-700 whitespace-nowrap">{log.userName}</td><td className="p-3"><span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-lg text-[11px] font-bold border whitespace-nowrap">{log.action}</span></td><td className="p-3 text-gray-700 min-w-[200px]">{log.details}</td></tr>)}</tbody></table>
      </div>

      {/* العرض الخاص بالموبايل (بطاقات متراصة) */}
      <div className="md:hidden flex flex-col gap-3">
        {logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-xl border border-gray-100">لا توجد سجلات.</div>
        ) : (
          logs.map(log => (
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