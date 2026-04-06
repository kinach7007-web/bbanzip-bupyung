/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState, useEffect, Component, type ReactNode, type ErrorInfo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Home, 
  Settings, 
  PieChart as PieChartIcon,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Plus,
  X,
  ChevronRight,
  Receipt,
  Wallet,
  Archive as ArchiveIcon,
  Lock,
  Trash2,
  LogOut,
  ShieldAlert,
  Clock,
  History,
  Download,
  Edit2
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  db, auth, logout, onAuthStateChanged, handleFirestoreError, OperationType,
  collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, onSnapshot, query, where, orderBy, writeBatch, terminate, getDocFromServer,
  type FirebaseUser 
} from './firebase';
import { PL_DATA, KPI_DATA, CASH_BALANCE_DATA } from './data';
import { PLDashboard } from './components/PLDashboard';
import { KPIDashboard } from './components/KPIDashboard';
import { CashBalanceSheet } from './components/CashBalanceSheet';
import { SalaryDashboard } from './components/SalaryDashboard';
import { ArchiveViewer } from './components/ArchiveViewer';
import { Login, type User } from './components/Login';
import { PasswordReset } from './components/PasswordReset';
import { UserManagement } from './components/UserManagement';
import { VendorManagementModal } from './components/VendorManagementModal';
import { type Employee, type PartTimeWorker, type PartTimeRecord, type DispatchRecord, type SalaryState, type MonthlyArchive } from './types';

const currentDay = new Date().getDate();
const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: '1',
    name: '통합',
    position: '',
    monthlySalary: 0,
    dailyWage: 0,
    totalWorkDays: currentDay,
    isAutoWorkDays: true,
    totalSalary: 0,
    note: ''
  },
  {
    id: '2',
    name: '통합2',
    position: '',
    monthlySalary: 0,
    dailyWage: 0,
    totalWorkDays: currentDay,
    isAutoWorkDays: true,
    totalSalary: 0,
    note: ''
  }
];

const generateInitialCashData = (monthStr: string, uid?: string) => {
  const [year, month] = monthStr.split('-').map(Number);
  const days = new Date(year, month, 0).getDate();
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  return {
    month: monthStr,
    uid: uid || '',
    title: "▣ 현금 시재 현황 : 입금/지출 내역표",
    carryover: 0,
    isCarryoverFixed: false,
    totalIncome: 0,
    totalExpense: 0,
    netChange: 0,
    finalBalance: 0,
    rows: Array.from({ length: days }, (_, i) => {
      const date = new Date(year, month - 1, i + 1);
      return {
        day: `${i + 1}일`,
        weekday: weekdays[date.getDay()],
        prevBalance: 0,
        income: 0,
        transferOut: 0,
        otherExpense: 0,
        details: "",
        balance: 0,
        remarks: ""
      };
    })
  };
};

const generateInitialSalaryState = (monthStr: string, uid?: string): SalaryState => {
  const [year, month] = monthStr.split('-').map(Number);
  const days = new Date(year, month, 0).getDate();
  
  const now = new Date();
  const isCurrentMonth = now.getFullYear() === year && (now.getMonth() + 1) === month;
  const dayForMonth = isCurrentMonth ? now.getDate() : days;

  return {
    month: monthStr,
    uid: uid || '',
    employees: INITIAL_EMPLOYEES.map(emp => emp.isAutoWorkDays ? { ...emp, totalWorkDays: dayForMonth } : emp),
    partTimeWorkers: [{ id: '1', name: '서현씨', residentNumber: '', defaultHourlyWage: 11000 }],
    partTimeDays: Array.from({ length: days }, () => []),
    dispatchDays: Array.from({ length: days }, () => []),
    dispatchWorkers: [{ id: '1', name: '김파출', residentNumber: '' }],
    nationalHealth: 0,
    nationalPension: 0,
    employmentInsurance: 0,
    industrialAccidentInsurance: 0
  };
};

export const getPeriodString = (monthStr: string) => {
  const [year, month] = monthStr.split('-').map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return `${year}.${String(month).padStart(2, '0')}.01 - ${year}.${String(month).padStart(2, '0')}.${lastDay}`;
};

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(value);
};

const formatCompactNumber = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toString();
};

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1'];

type TransactionCategory = '매출' | '매출원가' | '인건비' | '변동비' | '고정비' | '마케팅' | '세금' | '카드수수료(1.9%)';

interface Transaction {
  id: string;
  date: string;
  category: TransactionCategory;
  name: string;
  amount: number;
  status?: 'paid' | 'unpaid';
  author?: string;
  month: string;
}

// Error Boundary Component
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  props: ErrorBoundaryProps;
  state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
  }

  public static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: any, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = "알 수 없는 오류가 발생했습니다.";
      try {
        const parsedError = JSON.parse(this.state.error.message);
        errorMessage = `Firestore 오류: ${parsedError.operationType} @ ${parsedError.path}\n${parsedError.error}`;
      } catch (e) {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-red-100">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-6 mx-auto">
              <Info className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 text-center mb-4">문제가 발생했습니다</h2>
            <pre className="text-xs bg-gray-50 p-4 rounded-xl text-gray-600 overflow-auto max-h-40 mb-6 whitespace-pre-wrap">
              {errorMessage}
            </pre>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all"
            >
              새로고침
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const [businessDateStr, setBusinessDateStr] = useState<string>(() => {
    const saved = localStorage.getItem('pyeobanjib-business-date');
    if (saved) return saved;
    const now = new Date();
    if (now.getHours() < 10) {
      now.setDate(now.getDate() - 1);
    }
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });

  useEffect(() => {
    localStorage.setItem('pyeobanjib-business-date', businessDateStr);
  }, [businessDateStr]);

  const [isDailyCloseConfirmOpen, setIsDailyCloseConfirmOpen] = useState(false);
  const [nextBusinessDateStr, setNextBusinessDateStr] = useState('');
  
  const [archiveToDelete, setArchiveToDelete] = useState<MonthlyArchive | null>(null);
  const [deleteArchivePassword, setDeleteArchivePassword] = useState('');

  const handleDailyCloseClick = () => {
    const [year, month, day] = businessDateStr.split('-').map(Number);
    const nextDate = new Date(year, month - 1, day + 1);
    const nextStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;
    setNextBusinessDateStr(nextStr);
    setIsDailyCloseConfirmOpen(true);
  };

  const confirmDailyClose = () => {
    setBusinessDateStr(nextBusinessDateStr);
    setIsDailyCloseConfirmOpen(false);
  };

  const [currentMonth, setCurrentMonth] = useState<string>(() => {
    const saved = localStorage.getItem('pyeobanjib-current-month');
    if (saved) return saved;
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const getBusinessDate = () => {
    if (businessDateStr.startsWith(currentMonth)) {
      return businessDateStr;
    } else {
      const [year, month] = currentMonth.split('-').map(Number);
      const lastDay = new Date(year, month, 0).getDate();
      return `${currentMonth}-${String(lastDay).padStart(2, '0')}`;
    }
  };

  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const isAuthReadyRef = React.useRef(false);
  const [showForceLogin, setShowForceLogin] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Sync ref with state
  useEffect(() => {
    isAuthReadyRef.current = isAuthReady;
  }, [isAuthReady]);
  const [activeTab, setActiveTab] = useState('cash');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cashBalanceData, setCashBalanceData] = useState(() => generateInitialCashData(currentMonth, user?.id));
  const [vendorList, setVendorList] = useState<Record<string, string[]>>(PL_DATA.vendors || {});
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [archives, setArchives] = useState<MonthlyArchive[]>([]);
  const [viewingArchive, setViewingArchive] = useState<MonthlyArchive | null>(null);
  const [isClosingMonth, setIsClosingMonth] = useState(false);
  const [isClosingLoading, setIsClosingLoading] = useState(false);
  const [salaryState, setSalaryState] = useState<SalaryState>(() => generateInitialSalaryState(currentMonth, user?.id));

  const canDailyClose = useMemo(() => {
    const [year, month, day] = businessDateStr.split('-').map(Number);
    
    // Check if there's any transaction for the current business date
    const hasTransaction = transactions.some(t => t.date === businessDateStr);
    
    // Check if there's any income/expense in cashBalanceData for the current business date
    const dayNum = day;
    const isSameMonth = businessDateStr.startsWith(currentMonth);
    const cashRow = isSameMonth ? cashBalanceData?.rows?.[dayNum - 1] : null;
    const hasCashData = cashRow && (cashRow.income > 0 || cashRow.transferOut > 0 || cashRow.otherExpense > 0);
    
    return hasTransaction || hasCashData;
  }, [businessDateStr, transactions, cashBalanceData, currentMonth]);

  // Password Reset State
  const [resetCode, setResetCode] = useState<string | null>(null);
  const [isResetMode, setIsResetMode] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const oobCode = params.get('oobCode');
    if (mode === 'resetPassword' && oobCode) {
      setResetCode(oobCode);
      setIsResetMode(true);
      setIsLoginModalOpen(false);
    }
  }, []);

  // Firebase Auth Listener
  useEffect(() => {
    console.log("Auth listener initialized");
    
    // Safety timeout: if auth doesn't respond in 20 seconds, force ready state
    const timeoutId = setTimeout(() => {
      if (!isAuthReadyRef.current) {
        console.warn("Auth initialization timed out, forcing ready state");
        setIsAuthReady(true);
      }
    }, 20000);

    // Show force login button after 5 seconds
    const forceLoginTimeoutId = setTimeout(() => {
      if (!isAuthReadyRef.current) {
        setShowForceLogin(true);
      }
    }, 5000);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("Auth state changed:", firebaseUser?.uid);
      
      if (!firebaseUser) {
        setUser(null);
        setIsLoginModalOpen(true);
        setIsAuthReady(true);
        clearTimeout(timeoutId);
        clearTimeout(forceLoginTimeoutId);
        return;
      }

      try {
        // Fetch user profile with a timeout
        console.log("Fetching user doc for:", firebaseUser.uid);
        
        const fetchUserDoc = async () => {
          const docRef = doc(db, 'users', firebaseUser.uid);
          return await getDoc(docRef);
        };

        const userDocPromise = fetchUserDoc();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("User profile fetch timed out")), 15000)
        );

        const userDoc = await Promise.race([userDocPromise, timeoutPromise]) as any;
        
        console.log("User doc exists:", userDoc.exists());
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const isAdminEmail = firebaseUser.email?.toLowerCase() === 'kinach7007@gmail.com';
          
          // Auto-update Firestore if master admin is not approved or has wrong role
          if (isAdminEmail && (userData.role !== '운영자' || !userData.isApproved || userData.isBlocked)) {
            updateDoc(doc(db, 'users', firebaseUser.uid), {
              role: '운영자',
              isApproved: true,
              isBlocked: false
            }).catch(e => console.error("Error auto-updating master admin", e));
          }

          setUser({
            id: firebaseUser.uid,
            name: userData.name || '사용자',
            role: isAdminEmail ? '운영자' : (userData.role as any),
            email: firebaseUser.email || '',
            isApproved: isAdminEmail || userData.isApproved,
            isBlocked: isAdminEmail ? false : userData.isBlocked
          });
          setIsLoginModalOpen(false);
        } else {
          // User exists in Auth but not in Firestore
          setUser(null);
          setIsLoginModalOpen(true);
        }
      } catch (error) {
        console.error("Error during auth initialization:", error);
        // Even if profile fetch fails, we should let the user see the login screen or an error
        setUser(null);
        setIsLoginModalOpen(true);
      } finally {
        console.log("Setting isAuthReady to true");
        setIsAuthReady(true);
        clearTimeout(timeoutId);
        clearTimeout(forceLoginTimeoutId);
      }
    });
    
    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
      clearTimeout(forceLoginTimeoutId);
    };
  }, []);

  // Real-time Sync: User Status (to react to approval/blocking immediately)
  useEffect(() => {
    if (!isAuthReady || !user) return;
    const docRef = doc(db, 'users', user.id);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const userData = docSnap.data();
        setUser(prev => prev ? {
          ...prev,
          isApproved: userData.isApproved,
          isBlocked: userData.isBlocked,
          role: userData.role
        } : null);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, `users/${user.id}`));
    return () => unsubscribe();
  }, [isAuthReady, user?.id]);

  // Real-time Sync: Transactions
  useEffect(() => {
    if (!isAuthReady || !user || !user.isApproved || user.isBlocked) return;
    const q = query(collection(db, 'transactions'), where('month', '==', currentMonth));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data() } as Transaction));
      setTransactions(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'transactions'));
    return () => unsubscribe();
  }, [isAuthReady, user, currentMonth]);

  // Real-time Sync: Cash Balance
  useEffect(() => {
    if (!isAuthReady || !user || !user.isApproved || user.isBlocked) return;
    const docRef = doc(db, 'cashBalanceData', currentMonth);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setCashBalanceData(docSnap.data() as any);
      } else {
        // Initialize if not exists
        const initial = generateInitialCashData(currentMonth, user.id);
        setDoc(docRef, initial).catch(e => handleFirestoreError(e, OperationType.CREATE, `cashBalanceData/${currentMonth}`));
        setCashBalanceData(initial);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, `cashBalanceData/${currentMonth}`));
    return () => unsubscribe();
  }, [isAuthReady, user, currentMonth]);

  // Real-time Sync: Salary State
  useEffect(() => {
    if (!isAuthReady || !user || !user.isApproved || user.isBlocked) return;
    const docRef = doc(db, 'salaryState', currentMonth);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setSalaryState(desanitizeSalaryState(docSnap.data()));
      } else {
        // Initialize if not exists
        const initial = generateInitialSalaryState(currentMonth, user.id);
        setDoc(docRef, sanitizeForFirestore(initial)).catch(e => handleFirestoreError(e, OperationType.CREATE, `salaryState/${currentMonth}`));
        setSalaryState(initial);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, `salaryState/${currentMonth}`));
    return () => unsubscribe();
  }, [isAuthReady, user, currentMonth]);

  // Real-time Sync: Archives
  useEffect(() => {
    if (!isAuthReady || !user || !user.isApproved || user.isBlocked) return;
    const q = query(
      collection(db, 'archives'), 
      where('uid', '==', user.id),
      orderBy('month', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data() } as MonthlyArchive));
      setArchives(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'archives'));
    return () => unsubscribe();
  }, [isAuthReady, user]);

  // Real-time Sync: Settings
  useEffect(() => {
    if (!isAuthReady || !user || !user.isApproved || user.isBlocked) return;
    const docRef = doc(db, 'settings', 'global');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.vendorList) setVendorList(data.vendorList);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'settings/global'));
    return () => unsubscribe();
  }, [isAuthReady, user]);

  // Persistence for currentMonth
  useEffect(() => {
    localStorage.setItem('pyeobanjib-current-month', currentMonth);
  }, [currentMonth]);

  // Recursive function to handle nested arrays for Firestore
  const sanitizeForFirestore = (data: any): any => {
    if (data === null || data === undefined) return data;
    
    if (Array.isArray(data)) {
      // Check if it's a nested array (array of arrays)
      if (data.some(item => Array.isArray(item))) {
        return data.map(item => Array.isArray(item) ? JSON.stringify(item) : sanitizeForFirestore(item));
      }
      return data.map(item => sanitizeForFirestore(item));
    }
    
    if (typeof data === 'object') {
      const sanitized: any = {};
      for (const key in data) {
        sanitized[key] = sanitizeForFirestore(data[key]);
      }
      return sanitized;
    }
    
    return data;
  };

  const desanitizeSalaryState = (ss: any): SalaryState => {
    if (!ss) return ss;
    const desanitized = JSON.parse(JSON.stringify(ss));
    
    // Handle partTimeDays
    if (Array.isArray(desanitized.partTimeDays)) {
      desanitized.partTimeDays = desanitized.partTimeDays.map((day: any) => {
        if (typeof day === 'string') {
          try {
            return JSON.parse(day);
          } catch (e) {
            console.error("Error parsing partTimeDays day:", day, e);
            return [];
          }
        }
        return day;
      });
    }
    // Handle dispatchDays
    if (Array.isArray(desanitized.dispatchDays)) {
      desanitized.dispatchDays = desanitized.dispatchDays.map((day: any) => {
        if (typeof day === 'string') {
          try {
            return JSON.parse(day);
          } catch (e) {
            console.error("Error parsing dispatchDays day:", day, e);
            return [];
          }
        }
        return day;
      });
    }
    return desanitized as SalaryState;
  };

  // Wrapper for setCashBalanceData to sync with Firestore
  const updateCashBalanceData = async (newData: any) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'cashBalanceData', currentMonth), newData);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `cashBalanceData/${currentMonth}`);
    }
  };

  // Wrapper for setSalaryState to sync with Firestore
  const updateSalaryState = async (newData: SalaryState) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'salaryState', currentMonth), sanitizeForFirestore(newData));
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `salaryState/${currentMonth}`);
    }
  };

  const handleDeleteArchive = (archive: MonthlyArchive) => {
    setArchiveToDelete(archive);
    setDeleteArchivePassword('');
  };

  const confirmDeleteArchive = async () => {
    if (!archiveToDelete) return;
    
    if (deleteArchivePassword !== '9432') {
      alert('비밀번호가 일치하지 않습니다.');
      return;
    }

    try {
      await deleteDoc(doc(db, 'archives', archiveToDelete.id));
      setArchiveToDelete(null);
      setDeleteArchivePassword('');
      alert(`${archiveToDelete.month} 과거 기록이 삭제되었습니다.`);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `archives/${archiveToDelete.id}`);
    }
  };

  const handleDownloadArchiveExcel = (archive: MonthlyArchive) => {
    try {
      const data = archive.data;
      if (!data) {
        alert("보관된 상세 데이터가 없습니다.");
        return;
      }

      const workbook = XLSX.utils.book_new();

      // 1. Summary Sheet
      const summaryData = [
        ["항목", "금액"],
        ["총 매출액", archive.summary.totalSales],
        ["매출원가", archive.summary.cogs],
        ["인건비", archive.summary.labor],
        ["영업이익", archive.summary.operatingProfit],
        ["순이익", archive.summary.netProfit],
        ["마감일", new Date(archive.timestamp).toLocaleString()]
      ];
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, "요약");

      // 2. Transactions Sheet
      if (data.transactions && Array.isArray(data.transactions)) {
        const expenseData = data.transactions.map((e: any) => ({
          날짜: e.date,
          카테고리: e.category,
          항목명: e.name,
          금액: e.amount,
          상태: e.status === 'paid' ? '결제완료' : '미결제'
        }));
        const expenseSheet = XLSX.utils.json_to_sheet(expenseData);
        XLSX.utils.book_append_sheet(workbook, expenseSheet, "지출내역");
      }

      // 3. Cash Balance Sheet
      if (data.cashBalanceData && data.cashBalanceData.rows) {
        const cashData = data.cashBalanceData.rows.map((r: any) => ({
          일자: r.day,
          요일: r.weekday,
          전일시재: r.prevBalance,
          입금: r.income,
          이체: r.transferOut,
          기타지출: r.otherExpense,
          잔액: r.balance,
          비고: r.remarks
        }));
        const cashSheet = XLSX.utils.json_to_sheet(cashData);
        XLSX.utils.book_append_sheet(workbook, cashSheet, "현금시재");
      }

      XLSX.writeFile(workbook, `정산보고서_${archive.month.replace('.', '_')}.xlsx`);
    } catch (error) {
      console.error("Excel export error:", error);
      alert("엑셀 파일 생성 중 오류가 발생했습니다.");
    }
  };

  // Persistence: Save to localStorage (only UI state)
  useEffect(() => {
    localStorage.setItem('pyeobanjib-current-month', currentMonth);
  }, [currentMonth]);
  
  // Form state
  const [newExpense, setNewExpense] = useState({
    category: '매출원가' as TransactionCategory,
    name: '',
    amount: '',
    date: '', // Will be set when opening modal
    status: 'unpaid' as 'paid' | 'unpaid'
  });

  useEffect(() => {
    if (!newExpense.date) {
      setNewExpense(prev => ({ ...prev, date: getBusinessDate() }));
    }
  }, [currentMonth, businessDateStr]);

  // Generate sales transactions from Cash Balance Sheet
  const cashTransactions = useMemo(() => {
    const generated: Transaction[] = [];
    cashBalanceData.rows.forEach(row => {
      const dayMatch = row.day.match(/(\d+)일/);
      if (!dayMatch) return;
      const dayNum = parseInt(dayMatch[1], 10);
      const dateStr = `${currentMonth}-${dayNum.toString().padStart(2, '0')}`;
      
      if (row.income > 0) {
        generated.push({
          id: `cash-income-${dayNum}`,
          date: dateStr,
          category: '매출',
          name: '현금',
          amount: row.income,
          month: currentMonth
        });
      }
      if (row.transferOut > 0) {
        generated.push({
          id: `cash-transfer-${dayNum}`,
          date: dateStr,
          category: '매출',
          name: '계좌이체',
          amount: row.transferOut,
          month: currentMonth
        });
      }
    });
    return generated;
  }, [cashBalanceData.rows]);

  const allTransactions = useMemo(() => [...transactions, ...cashTransactions], [transactions, cashTransactions]);

  const currentTotalSales = useMemo(() => {
    const salesTransactions = allTransactions.filter(t => t.category === '매출');
    const additionalSales = salesTransactions.reduce((sum, t) => sum + t.amount, 0);
    return PL_DATA.summary.totalSales + additionalSales;
  }, [allTransactions]);

  // Calculate derived data
  const salaryBreakdown = useMemo(() => {
    const employeesTotal = salaryState.employees.reduce((sum, e) => sum + e.totalSalary, 0);
    const partTimeTotal = salaryState.partTimeDays.reduce((sum, day) => sum + (Array.isArray(day) ? day.reduce((a, b) => a + b.amount, 0) : 0), 0);
    const dispatchTotal = salaryState.dispatchDays.reduce((sum, day) => sum + (Array.isArray(day) ? day.reduce((a, b) => a + b.amount, 0) : 0), 0);
    const insuranceTotal = salaryState.nationalHealth + salaryState.nationalPension + salaryState.employmentInsurance + salaryState.industrialAccidentInsurance;
    
    return {
        employeesTotal,
        partTimeTotal,
        dispatchTotal,
        insuranceTotal,
        total: employeesTotal + partTimeTotal + dispatchTotal + insuranceTotal
    };
  }, [salaryState]);

  const currentExpenses = useMemo(() => {
    const baseExpenses = [...PL_DATA.expenses];
    
    // Add new transactions to categories and their details
    const updatedExpenses = baseExpenses.map(cat => {
      // Special handling for Labor Costs (인건비) - Automatic calculation
      if (cat.name === '인건비') {
        const updatedDetails = cat.details?.map(detail => {
            if (detail.name === '직원급여') return { ...detail, amount: salaryBreakdown.employeesTotal };
            if (detail.name === '알바급여') return { ...detail, amount: salaryBreakdown.partTimeTotal };
            if (detail.name === '파출급여') return { ...detail, amount: salaryBreakdown.dispatchTotal };
            if (detail.name === '4대보험') return { ...detail, amount: salaryBreakdown.insuranceTotal };
            return detail;
        });

        return {
          ...cat,
          amount: salaryBreakdown.total,
          details: updatedDetails
        };
      }

      // Special handling for Tax Withholding (세금 예수금) - Automatic calculation
      if (cat.name === '세금 예수금') {
        const vatAmount = currentTotalSales * 0.05;
        const incomeTaxAmount = currentTotalSales * 0.02;
        const totalTaxAmount = vatAmount + incomeTaxAmount;

        const updatedDetails = cat.details?.map(detail => {
          if (detail.name === '부가세 예수금') {
            return { ...detail, amount: vatAmount };
          }
          if (detail.name === '종소세 예수금') {
            return { ...detail, amount: incomeTaxAmount };
          }
          return detail;
        });

        return {
          ...cat,
          amount: totalTaxAmount,
          details: updatedDetails
        };
      }

      const catTransactions = allTransactions.filter(t => t.category === cat.name);
      let additionalAmount = catTransactions.reduce((sum, t) => sum + t.amount, 0);
      
      // Special handling for Card Fees - Automatic calculation
      if (cat.name === '카드수수료(1.9%)') {
        const cardSales = allTransactions
          .filter(t => t.category === '매출' && t.name === '카드')
          .reduce((sum, t) => sum + t.amount, 0);
        const autoCardFees = cardSales * 0.019;
        additionalAmount = Math.max(additionalAmount, autoCardFees);
      }

      let updatedDetails = cat.details;

      if (['매출원가', '변동비', '마케팅', '고정비'].includes(cat.name)) {
        const vendors = vendorList[cat.name] || [];
        updatedDetails = vendors.map(vendor => {
          const detailTransactions = allTransactions.filter(t => t.category === cat.name && t.name === vendor);
          const amount = detailTransactions.reduce((sum, t) => sum + t.amount, 0);
          return { name: vendor, amount, ratio: 0 };
        });
        
        // Add any transactions that have a name NOT in the vendor list
        const unknownTransactions = allTransactions.filter(t => t.category === cat.name && !vendors.includes(t.name));
        if (unknownTransactions.length > 0) {
          const unknownAmount = unknownTransactions.reduce((sum, t) => sum + t.amount, 0);
          updatedDetails.push({ name: '기타/삭제된 거래처', amount: unknownAmount, ratio: 0 });
        }
      } else {
        // For other categories (like 매출, 카드수수료), keep existing logic or just use existing details
        updatedDetails = cat.details?.map(detail => {
          const detailTransactions = allTransactions.filter(t => t.category === cat.name && t.name === detail.name);
          const detailAdditionalAmount = detailTransactions.reduce((sum, t) => sum + t.amount, 0);
          return {
            ...detail,
            amount: detail.amount + detailAdditionalAmount
          };
        });
      }

      return {
        ...cat,
        amount: cat.amount + additionalAmount,
        details: updatedDetails
      };
    });

    // Recalculate ratios based on total sales
    return updatedExpenses.map(cat => ({
      ...cat,
      ratio: Number(((cat.amount / currentTotalSales) * 100).toFixed(1))
    }));
  }, [allTransactions, currentTotalSales, salaryBreakdown, vendorList]);

  const currentSummary = useMemo(() => {
    const totalSales = currentTotalSales;

    const totalExpenses = currentExpenses.reduce((sum, e) => sum + e.amount, 0);
    const cogs = currentExpenses.find(e => e.name === '매출원가')?.amount || 0;
    const labor = currentExpenses.find(e => e.name === '인건비')?.amount || 0;
    
    const fixedCategory = currentExpenses.find(e => e.name === '고정비');
    const rent = fixedCategory?.details?.find((d: any) => d.name === '임대료')?.amount || 0;
    const fixedCosts = (fixedCategory?.amount || 0) - rent;
    
    const variableCosts = currentExpenses.find(e => e.name === '변동비')?.amount || 0;
    const marketingCosts = currentExpenses.find(e => e.name === '마케팅')?.amount || 0;
    
    // Calculate Card Fees from total card sales
    const cardSales = allTransactions
      .filter(t => t.category === '매출' && t.name === '카드')
      .reduce((sum, t) => sum + t.amount, 0);
    const cardFees = cardSales * 0.019;

    const taxes = currentExpenses.find(e => e.name === '세금 예수금')?.amount || 0;

    const grossProfit = totalSales - cogs;
    const operatingProfit = totalSales - (cogs + labor + rent + fixedCosts + variableCosts + marketingCosts);
    const netProfit = operatingProfit - cardFees - taxes;

    return {
      ...PL_DATA.summary,
      totalSales,
      cogs,
      labor,
      rent,
      fixedCosts,
      variableCosts,
      marketingCosts,
      cardFees,
      taxes,
      grossProfit,
      operatingProfit,
      netProfit
    };
  }, [currentExpenses, transactions]);

  const expenseDataForChart = useMemo(() => {
    return currentExpenses.map((item, index) => ({
      ...item,
      color: COLORS[index % COLORS.length]
    }));
  }, [currentExpenses]);

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.name || !newExpense.amount) return;

    const amount = parseInt(newExpense.amount.replace(/,/g, '')) || 0;

    let currentTransactions = transactions;
    let currentCashRows = [...cashBalanceData.rows];

    if (editingTransactionId) {
      if (editingTransactionId.startsWith('cash-income-') || editingTransactionId.startsWith('cash-transfer-')) {
        const isIncome = editingTransactionId.startsWith('cash-income-');
        const oldDayNum = parseInt(editingTransactionId.replace(isIncome ? 'cash-income-' : 'cash-transfer-', ''), 10);
        const oldRowIndex = oldDayNum - 1;
        if (currentCashRows[oldRowIndex]) {
          if (isIncome) {
            currentCashRows[oldRowIndex] = { ...currentCashRows[oldRowIndex], income: 0 };
          } else {
            currentCashRows[oldRowIndex] = { ...currentCashRows[oldRowIndex], transferOut: 0 };
          }
        }
      } else {
        currentTransactions = currentTransactions.filter(t => t.id !== editingTransactionId);
      }
    }

    if (newExpense.category === '매출' && (newExpense.name === '현금' || newExpense.name === '계좌이체')) {
      const dayNum = parseInt(newExpense.date.split('-')[2], 10);
      const rowIndex = dayNum - 1;
      if (currentCashRows[rowIndex]) {
        if (newExpense.name === '현금') {
          currentCashRows[rowIndex] = { ...currentCashRows[rowIndex], income: currentCashRows[rowIndex].income + amount };
        } else if (newExpense.name === '계좌이체') {
          currentCashRows[rowIndex] = { ...currentCashRows[rowIndex], transferOut: currentCashRows[rowIndex].transferOut + amount };
        }
        
        let currentBalance = cashBalanceData.carryover;
        const recalculatedRows = currentCashRows.map(row => {
          const prev = currentBalance;
          const balance = prev + row.income - row.transferOut - row.otherExpense;
          currentBalance = balance;
          return { ...row, prevBalance: prev, balance: balance };
        });

        const totalIncome = recalculatedRows.reduce((acc, row) => acc + row.income, 0);
        const totalExpense = recalculatedRows.reduce((acc, row) => acc + row.transferOut + row.otherExpense, 0);
        const finalBalance = recalculatedRows[recalculatedRows.length - 1].balance;
        const netChange = finalBalance - cashBalanceData.carryover;

        const newData = {
          ...cashBalanceData,
          rows: recalculatedRows,
          totalIncome,
          totalExpense,
          netChange,
          finalBalance
        };
        updateCashBalanceData(newData);
      }
      
      if (editingTransactionId && !editingTransactionId.startsWith('cash-income-') && !editingTransactionId.startsWith('cash-transfer-')) {
         deleteDoc(doc(db, 'transactions', editingTransactionId)).catch(e => handleFirestoreError(e, OperationType.DELETE, `transactions/${editingTransactionId}`));
      }

      setIsModalOpen(false);
      setEditingTransactionId(null);
      setNewExpense({
        category: '매출원가',
        name: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        status: 'unpaid'
      });
      return;
    }

    const transaction: Transaction = {
      id: editingTransactionId && !editingTransactionId.startsWith('cash-income-') && !editingTransactionId.startsWith('cash-transfer-') ? editingTransactionId : Math.random().toString(36).substr(2, 9),
      date: newExpense.date,
      category: newExpense.category,
      name: newExpense.name,
      amount,
      status: newExpense.status,
      author: user?.name,
      month: currentMonth
    };

    // Update vendor list if new
    if (!vendorList[newExpense.category]?.includes(newExpense.name)) {
      const newVendorList = {
        ...vendorList,
        [newExpense.category]: [...(vendorList[newExpense.category] || []), newExpense.name]
      };
      setDoc(doc(db, 'settings', 'global'), { vendorList: newVendorList }, { merge: true })
        .catch(e => handleFirestoreError(e, OperationType.UPDATE, 'settings/global'));
    }

    setDoc(doc(db, 'transactions', transaction.id), transaction)
      .catch(e => handleFirestoreError(e, OperationType.WRITE, `transactions/${transaction.id}`));
    
    if (editingTransactionId && (editingTransactionId.startsWith('cash-income-') || editingTransactionId.startsWith('cash-transfer-'))) {
        let currentBalance = cashBalanceData.carryover;
        const recalculatedRows = currentCashRows.map(row => {
          const prev = currentBalance;
          const balance = prev + row.income - row.transferOut - row.otherExpense;
          currentBalance = balance;
          return { ...row, prevBalance: prev, balance: balance };
        });

        const totalIncome = recalculatedRows.reduce((acc, row) => acc + row.income, 0);
        const totalExpense = recalculatedRows.reduce((acc, row) => acc + row.transferOut + row.otherExpense, 0);
        const finalBalance = recalculatedRows[recalculatedRows.length - 1].balance;
        const netChange = finalBalance - cashBalanceData.carryover;

        const newData = {
          ...cashBalanceData,
          rows: recalculatedRows,
          totalIncome,
          totalExpense,
          netChange,
          finalBalance
        };
        updateCashBalanceData(newData);
    }

    setIsModalOpen(false);
    setEditingTransactionId(null);
    setNewExpense({
      category: '매출원가',
      name: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      status: 'unpaid'
    });
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransactionId(transaction.id);
    setNewExpense({
      category: transaction.category,
      name: transaction.name,
      amount: transaction.amount.toString(),
      date: transaction.date,
      status: transaction.status || 'unpaid'
    });
    setIsModalOpen(true);
  };

  const handleDeleteTransaction = (id: string) => {
    if (id.startsWith('cash-income-') || id.startsWith('cash-transfer-')) {
      const isIncome = id.startsWith('cash-income-');
      const dayNum = parseInt(id.replace(isIncome ? 'cash-income-' : 'cash-transfer-', ''), 10);
      const newRows = [...cashBalanceData.rows];
      const rowIndex = dayNum - 1;
      if (newRows[rowIndex]) {
        if (isIncome) {
          newRows[rowIndex] = { ...newRows[rowIndex], income: 0 };
        } else {
          newRows[rowIndex] = { ...newRows[rowIndex], transferOut: 0 };
        }
        
        let currentBalance = cashBalanceData.carryover;
        const recalculatedRows = newRows.map(row => {
          const prev = currentBalance;
          const balance = prev + row.income - row.transferOut - row.otherExpense;
          currentBalance = balance;
          return { ...row, prevBalance: prev, balance: balance };
        });

        const totalIncome = recalculatedRows.reduce((acc, row) => acc + row.income, 0);
        const totalExpense = recalculatedRows.reduce((acc, row) => acc + row.transferOut + row.otherExpense, 0);
        const finalBalance = recalculatedRows[recalculatedRows.length - 1].balance;
        const netChange = finalBalance - cashBalanceData.carryover;

        const newData = {
          ...cashBalanceData,
          rows: recalculatedRows,
          totalIncome,
          totalExpense,
          netChange,
          finalBalance
        };
        updateCashBalanceData(newData);
      }
    } else {
      deleteDoc(doc(db, 'transactions', id)).catch(e => handleFirestoreError(e, OperationType.DELETE, `transactions/${id}`));
    }
  };

  const handleCloseMonth = () => {
    console.log("Opening close month modal...");
    setIsClosingMonth(true);
  };

  const desanitizeArchiveData = (archive: MonthlyArchive) => {
    if (!archive || !archive.data) return archive;
    
    // Deep clone to avoid mutating the original archive state
    const desanitized = JSON.parse(JSON.stringify(archive));
    
    if (desanitized.data.salaryState) {
      desanitized.data.salaryState = desanitizeSalaryState(desanitized.data.salaryState);
    }
    return desanitized;
  };

  const confirmCloseMonth = async () => {
    if (!user || isClosingLoading) return;

    console.log("Attempting to close month:", currentMonth);

    // Check if the last day of the month is verified (Daily Close)
    const lastRow = cashBalanceData.rows[cashBalanceData.rows.length - 1];
    if (!lastRow?.isVerified) {
      alert(`마지막 날짜(${lastRow?.day}일)의 '시재맞음(일일마감)' 버튼을 먼저 클릭해 주세요.`);
      return;
    }

    setIsClosingLoading(true);
    try {
      const batch = writeBatch(db);
      
      // 1. Create Archive
      const archiveId = currentMonth;
      const archiveRef = doc(db, 'archives', archiveId);
      
      const archiveData: MonthlyArchive = {
        id: archiveId,
        uid: user.id,
        month: currentMonth.replace('-', '.'),
        summary: {
          totalSales: currentSummary.totalSales || 0,
          netProfit: currentSummary.netProfit || 0,
          operatingProfit: currentSummary.operatingProfit || 0,
          cogs: currentSummary.cogs || 0,
          labor: currentSummary.labor || 0,
          rent: currentSummary.rent || 0,
          fixedCosts: currentSummary.fixedCosts || 0,
          variableCosts: currentSummary.variableCosts || 0,
          marketingCosts: currentSummary.marketingCosts || 0,
          taxes: currentSummary.taxes || 0,
          cardFees: currentSummary.cardFees || 0,
        },
        timestamp: new Date().toISOString(),
        data: sanitizeForFirestore({
          transactions,
          cashBalanceData,
          salaryState
        })
      };
      
      console.log("Saving archive data...");
      batch.set(archiveRef, archiveData);

      // 2. Prepare next month
      const [year, month] = currentMonth.split('-').map(Number);
      let nextYear = year;
      let nextMonth = month + 1;
      if (nextMonth > 12) {
        nextYear += 1;
        nextMonth = 1;
      }
      const nextMonthStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
      
      console.log("Preparing next month:", nextMonthStr);

      // Initialize next month's cash balance
      const nextCashRef = doc(db, 'cashBalanceData', nextMonthStr);
      const nextCashData = generateInitialCashData(nextMonthStr, user.id);
      
      // Carry over final balance
      const finalBalance = cashBalanceData.finalBalance || 0;
      nextCashData.carryover = finalBalance;
      if (nextCashData.rows && nextCashData.rows.length > 0) {
        nextCashData.rows[0].prevBalance = finalBalance;
        nextCashData.rows[0].balance = finalBalance;
      }
      nextCashData.finalBalance = finalBalance;
      batch.set(nextCashRef, nextCashData);

      // Initialize next month's salary state
      const nextSalaryRef = doc(db, 'salaryState', nextMonthStr);
      const nextSalaryData = generateInitialSalaryState(nextMonthStr, user.id);
      batch.set(nextSalaryRef, sanitizeForFirestore(nextSalaryData));

      console.log("Committing batch...");
      await batch.commit();
      console.log("Batch committed successfully!");

      // Force update localStorage and state
      localStorage.setItem('pyeobanjib-current-month', nextMonthStr);
      setCurrentMonth(nextMonthStr);
      
      // Close modal immediately after success
      setIsClosingMonth(false);
      
      // Clear local states to force fresh start
      setTransactions([]);
      setCashBalanceData(nextCashData);
      setSalaryState(nextSalaryData);

      alert(`${currentMonth.replace('-', '년 ')}월 마감이 완료되었습니다. ${nextMonthStr.replace('-', '년 ')}월 업무를 시작합니다.`);
    } catch (e) {
      console.error("Close month error details:", e);
      alert(`마감 처리 중 오류가 발생했습니다: ${e instanceof Error ? e.message : String(e)}`);
      // Close modal on error too so user can try again or fix issues
      setIsClosingMonth(false);
    } finally {
      setIsClosingLoading(false);
    }
  };

  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);

  const handleUpdateVendor = async (category: string, oldName: string, newName: string) => {
    if (!user) return;
    try {
      const batch = writeBatch(db);
      
      // Update vendor list
      const newVendorList = { ...vendorList };
      if (newVendorList[category]) {
        newVendorList[category] = newVendorList[category].map(v => v === oldName ? newName : v);
      }
      batch.set(doc(db, 'settings', 'global'), { vendorList: newVendorList }, { merge: true });

      // Update existing transactions in current month
      const transactionsToUpdate = transactions.filter(t => t.category === category && t.name === oldName);
      transactionsToUpdate.forEach(t => {
        batch.update(doc(db, 'transactions', t.id), { name: newName });
      });

      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'settings/global');
    }
  };

  const handleDeleteVendor = async (category: string, vendorName: string) => {
    if (!user) return;
    try {
      const newVendorList = { ...vendorList };
      if (newVendorList[category]) {
        newVendorList[category] = newVendorList[category].filter(v => v !== vendorName);
      }
      await setDoc(doc(db, 'settings', 'global'), { vendorList: newVendorList }, { merge: true });
      window.location.reload(); // Reload to confirm deletion
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'settings/global');
    }
  };

  const handleReorderVendor = async (category: string, startIndex: number, endIndex: number) => {
    if (!user) return;
    try {
      const newVendorList = { ...vendorList };
      if (newVendorList[category]) {
        const result = Array.from(newVendorList[category]);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);
        newVendorList[category] = result;
        
        // Optimistic update
        setVendorList(newVendorList);
        
        await setDoc(doc(db, 'settings', 'global'), { vendorList: newVendorList }, { merge: true });
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'settings/global');
    }
  };

  const handleAddVendor = async (category: string, vendorName: string) => {
    if (!user) return;
    try {
      const newVendorList = { ...vendorList };
      if (!newVendorList[category]) {
        newVendorList[category] = [];
      }
      if (!newVendorList[category].includes(vendorName)) {
        newVendorList[category].push(vendorName);
      }
      await setDoc(doc(db, 'settings', 'global'), { vendorList: newVendorList }, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'settings/global');
    }
  };

  const [resetError, setResetError] = useState<string | null>(null);

  // Auto-reset app once for the admin
  useEffect(() => {
    const autoResetApp = async () => {
      if (user?.email === 'kinach7007@gmail.com' && !localStorage.getItem('app_fully_reset_once_v2')) {
        try {
          console.log("Auto-resetting app per admin request...");
          const collectionsToDelete = ['transactions', 'cashBalanceData', 'salaryState', 'archives'];
          
          for (const collName of collectionsToDelete) {
            const snapshot = await getDocs(collection(db, collName));
            for (let i = 0; i < snapshot.docs.length; i += 500) {
              const batch = writeBatch(db);
              const chunk = snapshot.docs.slice(i, i + 500);
              chunk.forEach(d => batch.delete(d.ref));
              await batch.commit();
            }
          }
          
          // Clear local storage keys related to the app
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('pyeobanjib-')) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach(key => localStorage.removeItem(key));

          localStorage.setItem('app_fully_reset_once_v2', 'true');
          console.log("App automatically reset.");
          alert("요청하신 대로 앱의 모든 데이터(거래내역, 시재, 급여, 보관함)가 완전히 초기화되었습니다!");
          window.location.reload();
        } catch (e) {
          console.error("Failed to reset app:", e);
        }
      }
    };
    if (user) {
      autoResetApp();
    }
  }, [user]);

  const handleResetAllData = async () => {
    if (!user) return;
    setResetError(null);
    try {
      setIsClosingLoading(true);
      console.log("Starting full data reset...");
      
      const collectionsToDelete = ['transactions', 'cashBalanceData', 'salaryState'];
      
      for (const collName of collectionsToDelete) {
        console.log(`Fetching documents from ${collName}...`);
        const snapshot = await getDocs(collection(db, collName));
        const docs = snapshot.docs;
        console.log(`Found ${docs.length} documents in ${collName}`);
        
        // Delete in chunks of 500 (Firestore batch limit)
        for (let i = 0; i < docs.length; i += 500) {
          const batch = writeBatch(db);
          const chunk = docs.slice(i, i + 500);
          chunk.forEach(d => batch.delete(d.ref));
          console.log(`Committing deletion batch for ${collName} (${i} to ${i + chunk.length})...`);
          await batch.commit();
        }
      }
      
      // We no longer delete settings/global to preserve vendor list and other configs
      // that might be relevant to the preserved archives.
      
      console.log("Reset complete. Logging out and reloading...");
      setIsResetConfirmOpen(false);
      
      // 1. Clear local storage for a clean state
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('pyeobanjib-')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // 2. Reset local React state
      setTransactions([]);
      setCashBalanceData(generateInitialCashData(currentMonth, user.id));
      setSalaryState(generateInitialSalaryState(currentMonth, user.id));
      setArchives([]);
      
      // 3. Close modal and show success
      setIsResetConfirmOpen(false);
      setIsClosingLoading(false);
      alert("데이터가 성공적으로 초기화되었습니다.");
      window.location.reload();
      
    } catch (e: any) {
      console.error("Reset error:", e);
      setResetError(e.message || "데이터 초기화 중 오류가 발생했습니다.");
      setIsClosingLoading(false);
    }
  };

  return (
    <ErrorBoundary>
      {!isAuthReady ? (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
          <div className="flex flex-col items-center gap-6 max-w-sm w-full text-center">
            <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
            <div className="flex flex-col gap-2">
              <p className="text-sm font-bold text-gray-700">데이터를 불러오는 중...</p>
              <p className="text-xs text-gray-500">네트워크 상태에 따라 시간이 걸릴 수 있습니다.</p>
            </div>
            
            {showForceLogin && (
              <div className="flex flex-col gap-3 w-full mt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <p className="text-xs text-red-500 font-medium">연결이 원활하지 않나요?</p>
                <button 
                  onClick={() => {
                    setIsAuthReady(true);
                    setIsLoginModalOpen(true);
                  }}
                  className="w-full py-3 px-4 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-bold shadow-sm hover:bg-gray-50 transition-all"
                >
                  로그인 화면으로 강제 이동
                </button>
                <button 
                  onClick={async () => {
                    try {
                      const logoutPromise = logout();
                      const timeoutPromise = new Promise(resolve => setTimeout(resolve, 2000));
                      await Promise.race([logoutPromise, timeoutPromise]);
                    } catch (e) {
                      console.warn("Logout failed during force refresh:", e);
                    }
                    
                    // Clear app specific localStorage
                    const keysToRemove: string[] = [];
                    for (let i = 0; i < localStorage.length; i++) {
                      const key = localStorage.key(i);
                      if (key && key.startsWith('pyeobanjib-')) {
                        keysToRemove.push(key);
                      }
                    }
                    keysToRemove.forEach(key => localStorage.removeItem(key));
                    
                    try {
                      window.location.reload();
                    } catch (e) {
                      window.location.href = window.location.origin;
                    }
                  }}
                  className="w-full py-3 px-4 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-all"
                >
                  캐시 삭제 후 새로고침
                </button>
              </div>
            )}
          </div>
        </div>
      ) : user?.isBlocked ? (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl shadow-red-100 w-full max-w-md border border-red-100 text-center">
            <div className="w-20 h-20 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mb-8 mx-auto">
              <ShieldAlert className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">계정이 차단되었습니다</h2>
            <p className="text-gray-500 mb-8 leading-relaxed">
              관리자에 의해 계정 이용이 제한되었습니다.<br />
              문의사항은 관리자에게 연락해 주세요.
            </p>
            <button 
              onClick={() => logout()}
              className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-black transition-all"
            >
              로그아웃
            </button>
          </div>
        </div>
      ) : user && !user.isApproved && user.role !== '운영자' ? (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl shadow-amber-100 w-full max-w-md border border-amber-100 text-center">
            <div className="w-20 h-20 bg-amber-50 text-amber-600 rounded-3xl flex items-center justify-center mb-8 mx-auto">
              <Clock className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">승인 대기 중</h2>
            <p className="text-gray-500 mb-8 leading-relaxed">
              {user.name}님, 가입을 환영합니다!<br />
              관리자의 승인이 완료된 후 서비스를 이용하실 수 있습니다. 잠시만 기다려 주세요.
            </p>
            <button 
              onClick={() => logout()}
              className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-black transition-all"
            >
              로그아웃
            </button>
          </div>
        </div>
      ) : (
        <div className="min-h-screen bg-[#F8F9FA] text-[#1A1C1E] font-sans selection:bg-emerald-100 pb-20">
          {isResetMode && resetCode ? (
            <PasswordReset 
              oobCode={resetCode} 
              onComplete={() => {
                setIsResetMode(false);
                setResetCode(null);
                window.history.replaceState({}, document.title, window.location.pathname);
                setIsLoginModalOpen(true);
              }}
              onCancel={() => {
                setIsResetMode(false);
                setResetCode(null);
                window.history.replaceState({}, document.title, window.location.pathname);
                setIsLoginModalOpen(true);
              }}
            />
          ) : (isLoginModalOpen || !user) ? (
            <Login onLogin={(loggedInUser) => {
              setUser(loggedInUser);
              setIsLoginModalOpen(false);
            }} />
          ) : (
            <>
          {/* Header */}
          <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 md:px-6 py-3 md:py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 md:gap-6">
            <div>
              <h1 className="text-lg md:text-xl font-bold tracking-tight text-gray-900">{PL_DATA.title}</h1>
              <div className="flex items-center gap-2 mt-0.5 md:mt-1 text-[10px] md:text-sm text-gray-500">
                <Calendar className="w-3 h-3 md:w-4 h-4" />
                <span>{getPeriodString(currentMonth)}</span>
                {(() => {
                  const now = new Date();
                  const realMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                  if (realMonth !== currentMonth) {
                    return (
                      <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full animate-pulse">
                        새로운 달이 시작되었습니다!
                      </span>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>
            
            <nav className="hidden md:flex items-center bg-gray-100 p-1 rounded-xl">
              <button 
                onClick={() => setActiveTab('cash')}
                className={cn(
                  "px-4 py-1.5 text-sm font-bold rounded-lg transition-all",
                  activeTab === 'cash' ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                현금시재
              </button>
              <button 
                onClick={() => setActiveTab('pl')}
                className={cn(
                  "px-4 py-1.5 text-sm font-bold rounded-lg transition-all",
                  activeTab === 'pl' ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                손익계산서
              </button>
              <button 
                onClick={() => setActiveTab('kpi')}
                className={cn(
                  "px-4 py-1.5 text-sm font-bold rounded-lg transition-all",
                  activeTab === 'kpi' ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                운영실적
              </button>
              <button 
                onClick={() => setActiveTab('salary')}
                className={cn(
                  "px-4 py-1.5 text-sm font-bold rounded-lg transition-all",
                  activeTab === 'salary' ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                직원급여
              </button>
            </nav>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            {user && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-xl text-sm font-medium text-gray-700">
                <span className="w-6 h-6 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-xs font-bold">
                  {user.name.charAt(0)}
                </span>
                {user.name} ({user.role})
              </div>
            )}
            
            <div className="relative">
              <button 
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className={cn(
                  "p-2 rounded-full transition-all",
                  isSettingsOpen ? "bg-blue-50 text-blue-600" : "hover:bg-gray-100 text-gray-400"
                )}
                title="설정"
              >
                <Settings className="w-5 h-5" />
              </button>

              <AnimatePresence>
                {isSettingsOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setIsSettingsOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 overflow-hidden"
                    >
                      <div className="px-4 py-2 border-b border-gray-50 mb-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">시스템 설정</p>
                      </div>
                      
                      <button 
                        onClick={() => {
                          setIsSettingsOpen(false);
                          setIsVendorModalOpen(true);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                        거래처 관리
                      </button>

                      <div className="h-px bg-gray-50 my-1" />

                      <button 
                        onClick={() => {
                          setIsSettingsOpen(false);
                          handleCloseMonth();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Lock className="w-4 h-4" />
                        월 마감하기
                      </button>

                      <div className="h-px bg-gray-50 my-1" />

                      <button 
                        onClick={() => {
                          setIsSettingsOpen(false);
                          setActiveTab('archives');
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold transition-colors",
                          activeTab === 'archives' ? "bg-indigo-50 text-indigo-600" : "text-gray-600 hover:bg-gray-50"
                        )}
                      >
                        <History className="w-4 h-4" />
                        보관함
                      </button>

                      {user?.role === '운영자' && (
                        <button 
                          onClick={() => {
                            setIsSettingsOpen(false);
                            setActiveTab('users');
                          }}
                          className={cn(
                            "w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold transition-colors",
                            activeTab === 'users' ? "bg-indigo-50 text-indigo-600" : "text-gray-600 hover:bg-gray-50"
                          )}
                        >
                          <Users className="w-4 h-4" />
                          사용자 관리
                        </button>
                      )}

                      <div className="h-px bg-gray-50 my-1" />

                      <button 
                        onClick={() => {
                          setIsSettingsOpen(false);
                          setIsResetConfirmOpen(true);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        전체 데이터 초기화
                      </button>

                      <div className="h-px bg-gray-50 my-1" />

                      <button 
                        onClick={async () => {
                          setIsSettingsOpen(false);
                          try {
                            await logout();
                          } catch (e) {
                            console.error("Logout error", e);
                          }
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        사용자 로그아웃
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {viewingArchive ? (
          <div className="space-y-6">
            {(() => {
              const desanitized = desanitizeArchiveData(viewingArchive);
              return (
                <>
                  <div className="flex items-center justify-between bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center">
                        <ArchiveIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-indigo-900">{desanitized.month} 마감 데이터 조회 중</h2>
                        <p className="text-xs text-indigo-600">현재 보고 있는 데이터는 읽기 전용입니다.</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setViewingArchive(null)}
                      className="px-4 py-2 bg-white text-indigo-600 border border-indigo-200 rounded-xl text-sm font-bold hover:bg-indigo-50 transition-all"
                    >
                      조회 종료
                    </button>
                  </div>
                  
                  <nav className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl w-fit">
                    <button 
                      onClick={() => setActiveTab('cash')}
                      className={cn(
                        "px-4 py-1.5 text-sm font-bold rounded-lg transition-all",
                        activeTab === 'cash' ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                      )}
                    >
                      현금시재
                    </button>
                    <button 
                      onClick={() => setActiveTab('pl')}
                      className={cn(
                        "px-4 py-1.5 text-sm font-bold rounded-lg transition-all",
                        activeTab === 'pl' ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                      )}
                    >
                      손익계산서
                    </button>
                    <button 
                      onClick={() => setActiveTab('kpi')}
                      className={cn(
                        "px-4 py-1.5 text-sm font-bold rounded-lg transition-all",
                        activeTab === 'kpi' ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                      )}
                    >
                      운영실적
                    </button>
                    <button 
                      onClick={() => setActiveTab('salary')}
                      className={cn(
                        "px-4 py-1.5 text-sm font-bold rounded-lg transition-all",
                        activeTab === 'salary' ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                      )}
                    >
                      직원급여
                    </button>
                  </nav>

                  {(!desanitized || !desanitized.data) ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-200">
                      <p className="text-gray-500 font-bold">데이터를 불러올 수 없습니다.</p>
                      <button 
                        onClick={() => setViewingArchive(null)}
                        className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold"
                      >
                        돌아가기
                      </button>
                    </div>
                  ) : activeTab === 'cash' ? (
                    <CashBalanceSheet data={desanitized.data.cashBalanceData} setData={() => {}} isReadOnly user={user} />
                  ) : activeTab === 'pl' ? (
                    <PLDashboard 
                      user={user}
                      currentMonth={desanitized.month.replace('.', '-')}
                      currentSummary={desanitized.summary}
                      currentExpenses={PL_DATA.expenses.map(cat => {
                        if (cat.name === '인건비') {
                          const employeesTotal = desanitized.data.salaryState.employees.reduce((sum: number, emp: any) => sum + emp.totalSalary, 0);
                          const partTimeTotal = desanitized.data.salaryState.partTimeDays.reduce((sum: number, day: any) => {
                            if (Array.isArray(day)) return sum + day.reduce((dSum: number, r: any) => dSum + r.amount, 0);
                            return sum;
                          }, 0);
                          const dispatchTotal = desanitized.data.salaryState.dispatchDays.reduce((sum: number, day: any) => {
                            if (Array.isArray(day)) return sum + day.reduce((dSum: number, r: any) => dSum + r.amount, 0);
                            return sum;
                          }, 0);
                          const insuranceTotal = desanitized.data.salaryState.nationalHealth + desanitized.data.salaryState.nationalPension + desanitized.data.salaryState.employmentInsurance + desanitized.data.salaryState.industrialAccidentInsurance;
                          
                          return {
                            ...cat,
                            amount: employeesTotal + partTimeTotal + dispatchTotal + insuranceTotal,
                            details: cat.details?.map(detail => {
                              if (detail.name === '직원급여') return { ...detail, amount: employeesTotal };
                              if (detail.name === '알바급여') return { ...detail, amount: partTimeTotal };
                              if (detail.name === '파출급여') return { ...detail, amount: dispatchTotal };
                              if (detail.name === '4대보험') return { ...detail, amount: insuranceTotal };
                              return detail;
                            })
                          };
                        }
                        if (cat.name === '세금 예수금') {
                          const vatAmount = desanitized.summary.totalSales * 0.05;
                          const incomeTaxAmount = desanitized.summary.totalSales * 0.02;
                          return {
                            ...cat,
                            amount: vatAmount + incomeTaxAmount,
                            details: cat.details?.map(detail => {
                              if (detail.name === '부가세 예수금') return { ...detail, amount: vatAmount };
                              if (detail.name === '종소세 예수금') return { ...detail, amount: incomeTaxAmount };
                              return detail;
                            })
                          };
                        }
                        const catTransactions = (desanitized.data.transactions || []).filter((t: any) => t.category === cat.name);
                        let amount = catTransactions.reduce((sum: number, t: any) => sum + t.amount, 0);
                        if (cat.name === '카드수수료(1.9%)') {
                          const cardSales = (desanitized.data.transactions || []).filter((t: any) => t.category === '매출' && t.name === '카드').reduce((sum: number, t: any) => sum + t.amount, 0);
                          amount = Math.max(amount, cardSales * 0.019);
                        }
                        return {
                          ...cat,
                          amount,
                          details: cat.details?.map(detail => {
                            const detailTransactions = catTransactions.filter((t: any) => t.name === detail.name);
                            return { ...detail, amount: detailTransactions.reduce((sum: number, t: any) => sum + t.amount, 0) };
                          })
                        };
                      })}
                      salaryBreakdown={{
                        employeesTotal: desanitized.data.salaryState.employees.reduce((sum: number, emp: any) => sum + emp.totalSalary, 0),
                        partTimeTotal: desanitized.data.salaryState.partTimeDays.reduce((sum: number, day: any) => {
                          if (Array.isArray(day)) {
                            return sum + day.reduce((dSum: number, r: any) => dSum + r.amount, 0);
                          }
                          return sum;
                        }, 0),
                        dispatchTotal: desanitized.data.salaryState.dispatchDays.reduce((sum: number, day: any) => {
                          if (Array.isArray(day)) {
                            return sum + day.reduce((dSum: number, r: any) => dSum + r.amount, 0);
                          }
                          return sum;
                        }, 0),
                        insuranceTotal: desanitized.data.salaryState.nationalHealth + desanitized.data.salaryState.nationalPension + desanitized.data.salaryState.employmentInsurance + desanitized.data.salaryState.industrialAccidentInsurance,
                        total: desanitized.summary.labor
                      }}
                      transactions={desanitized.data.transactions}
                      onDeleteTransaction={() => {}}
                      onEditTransaction={() => {}}
                      isModalOpen={false}
                      setIsModalOpen={() => {}}
                      newExpense={{ category: '', name: '', amount: '', date: '', status: 'unpaid' }}
                      setNewExpense={() => {}}
                      handleAddExpense={() => {}}
                      vendorList={{}}
                      isReadOnly
                      getBusinessDate={getBusinessDate}
                      handleDailyClose={handleDailyCloseClick}
                      canDailyClose={canDailyClose}
                    />
                  ) : activeTab === 'kpi' ? (
                    <KPIDashboard 
                      currentSummary={desanitized.summary}
                      currentExpenses={PL_DATA.expenses.map(cat => {
                        if (cat.name === '인건비') {
                          const employeesTotal = desanitized.data.salaryState.employees.reduce((sum: number, emp: any) => sum + emp.totalSalary, 0);
                          const partTimeTotal = desanitized.data.salaryState.partTimeDays.reduce((sum: number, day: any) => {
                            if (Array.isArray(day)) return sum + day.reduce((dSum: number, r: any) => dSum + r.amount, 0);
                            return sum;
                          }, 0);
                          const dispatchTotal = desanitized.data.salaryState.dispatchDays.reduce((sum: number, day: any) => {
                            if (Array.isArray(day)) return sum + day.reduce((dSum: number, r: any) => dSum + r.amount, 0);
                            return sum;
                          }, 0);
                          const insuranceTotal = desanitized.data.salaryState.nationalHealth + desanitized.data.salaryState.nationalPension + desanitized.data.salaryState.employmentInsurance + desanitized.data.salaryState.industrialAccidentInsurance;
                          
                          return {
                            ...cat,
                            amount: employeesTotal + partTimeTotal + dispatchTotal + insuranceTotal,
                            details: cat.details?.map(detail => {
                              if (detail.name === '직원급여') return { ...detail, amount: employeesTotal };
                              if (detail.name === '알바급여') return { ...detail, amount: partTimeTotal };
                              if (detail.name === '파출급여') return { ...detail, amount: dispatchTotal };
                              if (detail.name === '4대보험') return { ...detail, amount: insuranceTotal };
                              return detail;
                            })
                          };
                        }
                        if (cat.name === '세금 예수금') {
                          const vatAmount = desanitized.summary.totalSales * 0.05;
                          const incomeTaxAmount = desanitized.summary.totalSales * 0.02;
                          return {
                            ...cat,
                            amount: vatAmount + incomeTaxAmount,
                            details: cat.details?.map(detail => {
                              if (detail.name === '부가세 예수금') return { ...detail, amount: vatAmount };
                              if (detail.name === '종소세 예수금') return { ...detail, amount: incomeTaxAmount };
                              return detail;
                            })
                          };
                        }
                        const catTransactions = (desanitized.data.transactions || []).filter((t: any) => t.category === cat.name);
                        let amount = catTransactions.reduce((sum: number, t: any) => sum + t.amount, 0);
                        if (cat.name === '카드수수료(1.9%)') {
                          const cardSales = (desanitized.data.transactions || []).filter((t: any) => t.category === '매출' && t.name === '카드').reduce((sum: number, t: any) => sum + t.amount, 0);
                          amount = Math.max(amount, cardSales * 0.019);
                        }
                        return {
                          ...cat,
                          amount,
                          details: cat.details?.map(detail => {
                            const detailTransactions = catTransactions.filter((t: any) => t.name === detail.name);
                            return { ...detail, amount: detailTransactions.reduce((sum: number, t: any) => sum + t.amount, 0) };
                          })
                        };
                      })}
                      archives={archives}
                      isReadOnly
                    />
                  ) : activeTab === 'salary' ? (
                    <SalaryDashboard 
                      user={user}
                      currentMonth={desanitized.month.replace('.', '-')}
                      salaryState={desanitized.data.salaryState}
                      setSalaryState={() => {}}
                      isReadOnly
                    />
                  ) : null}
                </>
              );
            })()}
          </div>
        ) : activeTab === 'cash' ? (
          <CashBalanceSheet data={cashBalanceData} setData={setCashBalanceData} user={user} />
        ) : activeTab === 'pl' ? (
          <PLDashboard 
            user={user}
            currentMonth={currentMonth}
            currentSummary={currentSummary}
            currentExpenses={currentExpenses}
            salaryBreakdown={salaryBreakdown}
            transactions={allTransactions}
            onDeleteTransaction={handleDeleteTransaction}
            onEditTransaction={handleEditTransaction}
            isModalOpen={isModalOpen}
            setIsModalOpen={(open) => {
              setIsModalOpen(open);
              if (!open) setEditingTransactionId(null);
            }}
            newExpense={newExpense}
            setNewExpense={setNewExpense}
            handleAddExpense={handleAddExpense}
            vendorList={vendorList}
            getBusinessDate={getBusinessDate}
            handleDailyClose={handleDailyCloseClick}
            canDailyClose={canDailyClose}
          />
        ) : activeTab === 'kpi' ? (
          <KPIDashboard 
            currentSummary={currentSummary}
            currentExpenses={currentExpenses}
            archives={archives}
          />
        ) : activeTab === 'salary' ? (
          <SalaryDashboard 
            user={user}
            currentMonth={currentMonth}
            salaryState={salaryState}
            setSalaryState={setSalaryState}
          />
        ) : activeTab === 'users' ? (
          <UserManagement currentUser={user!} />
        ) : (
          <ArchiveViewer 
            archives={archives} 
            onSelectArchive={(archive) => {
              setViewingArchive(archive);
              setActiveTab('pl');
            }} 
            onDownloadExcel={handleDownloadArchiveExcel}
            onDeleteArchive={handleDeleteArchive}
          />
        )}
      </main>

      <VendorManagementModal
        isOpen={isVendorModalOpen}
        onClose={() => setIsVendorModalOpen(false)}
        vendorList={vendorList}
        onUpdateVendor={handleUpdateVendor}
        onDeleteVendor={handleDeleteVendor}
        onAddVendor={handleAddVendor}
        onReorderVendor={handleReorderVendor}
      />

      {/* Daily Close Confirmation Modal */}
      <AnimatePresence>
        {isDailyCloseConfirmOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6">
                <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mb-4 mx-auto">
                  <Lock className="w-6 h-6 text-rose-600" />
                </div>
                <h3 className="text-xl font-bold text-center text-gray-900 mb-2">일일 마감</h3>
                <p className="text-center text-gray-600 mb-6">
                  현재 영업일(<strong className="text-gray-900">{businessDateStr}</strong>)을 마감하고<br/>
                  다음 날(<strong className="text-rose-600">{nextBusinessDateStr}</strong>)로 넘어가시겠습니까?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsDailyCloseConfirmOpen(false)}
                    className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={confirmDailyClose}
                    className="flex-1 px-4 py-2.5 bg-rose-600 text-white font-medium rounded-xl hover:bg-rose-700 transition-colors shadow-lg shadow-rose-200"
                  >
                    마감하기
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Archive Confirmation Modal */}
      <AnimatePresence>
        {archiveToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[200] p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4 mx-auto">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-center text-gray-900 mb-2">과거 기록 삭제</h3>
                <p className="text-center text-gray-600 mb-6">
                  <strong className="text-gray-900">{archiveToDelete.month}</strong> 과거 기록을 정말 삭제하시겠습니까?<br/>
                  이 작업은 되돌릴 수 없습니다.
                </p>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    비밀번호
                  </label>
                  <input
                    type="password"
                    value={deleteArchivePassword}
                    onChange={(e) => setDeleteArchivePassword(e.target.value)}
                    placeholder="비밀번호를 입력하세요"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setArchiveToDelete(null);
                      setDeleteArchivePassword('');
                    }}
                    className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={confirmDeleteArchive}
                    className="flex-1 px-4 py-2.5 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
                  >
                    삭제하기
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reset All Data Confirmation Modal */}
      <AnimatePresence>
        {isResetConfirmOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden relative"
            >
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-red-500 to-orange-500" />
              
              <div className="w-20 h-20 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mb-6 mx-auto rotate-3 hover:rotate-0 transition-transform duration-500">
                <Trash2 className="w-10 h-10" />
              </div>
              
              <h3 className="text-2xl font-black text-gray-900 text-center mb-3 tracking-tight">전체 데이터를 초기화할까요?</h3>
              
              <div className="bg-red-50/50 rounded-2xl p-4 mb-8">
                <p className="text-sm text-red-700 text-center font-medium leading-relaxed">
                  거래 내역, 시재 현황, 급여 정보, 보관함 등<br />
                  <span className="font-bold underline decoration-red-200 decoration-2 underline-offset-4">모든 데이터가 영구적으로 삭제됩니다.</span><br />
                  이 작업은 되돌릴 수 없습니다.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setIsResetConfirmOpen(false)}
                  disabled={isClosingLoading}
                  className="px-6 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 active:scale-95 transition-all disabled:opacity-50"
                >
                  취소
                </button>
                <button 
                  onClick={handleResetAllData}
                  disabled={isClosingLoading}
                  className="px-6 py-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 active:scale-95 shadow-lg shadow-red-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isClosingLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      처리 중...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-5 h-5" />
                      초기화하기
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Close Month Confirmation Modal */}
      <AnimatePresence>
        {isClosingMonth && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-gray-100"
            >
              <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <Lock className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 text-center mb-2">이번 달 정산을 마감하시겠습니까?</h3>
              <p className="text-sm text-gray-500 text-center mb-4">
                마감된 데이터는 보관함으로 이동하며,<br />
                현재 작업 중인 데이터는 초기화됩니다.
              </p>

              {/* Daily Close Check Warning */}
              {(() => {
                const lastRow = cashBalanceData.rows[cashBalanceData.rows.length - 1];
                if (!lastRow?.isVerified) {
                  return (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                      <p className="text-xs text-amber-800 font-bold text-center leading-relaxed">
                        ⚠️ 마지막 날짜({lastRow?.day}일)의 '시재맞음(일일마감)'<br />
                        버튼을 먼저 클릭해야 마감할 수 있습니다.
                      </p>
                    </div>
                  );
                }
                return null;
              })()}

              <div className="flex gap-3">
                <button 
                  onClick={() => setIsClosingMonth(false)}
                  disabled={isClosingLoading}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-all disabled:opacity-50"
                >
                  취소
                </button>
                <button 
                  onClick={confirmCloseMonth}
                  disabled={isClosingLoading}
                  className="flex-1 px-4 py-3 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 shadow-lg shadow-rose-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isClosingLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      처리 중...
                    </>
                  ) : (
                    '마감하기'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-gray-200 px-2 py-3 flex items-center justify-around shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <button 
          onClick={() => setActiveTab('cash')}
          className={cn(
            "flex flex-col items-center gap-1 transition-all",
            activeTab === 'cash' ? "text-emerald-600" : "text-gray-400"
          )}
        >
          <Wallet className={cn("w-6 h-6", activeTab === 'cash' ? "fill-emerald-50" : "")} />
          <span className="text-[10px] font-bold">현금시재</span>
        </button>
        <button 
          onClick={() => setActiveTab('pl')}
          className={cn(
            "flex flex-col items-center gap-1 transition-all",
            activeTab === 'pl' ? "text-emerald-600" : "text-gray-400"
          )}
        >
          <Receipt className={cn("w-6 h-6", activeTab === 'pl' ? "fill-emerald-50" : "")} />
          <span className="text-[10px] font-bold">손익계산서</span>
        </button>
        <button 
          onClick={() => setActiveTab('kpi')}
          className={cn(
            "flex flex-col items-center gap-1 transition-all",
            activeTab === 'kpi' ? "text-emerald-600" : "text-gray-400"
          )}
        >
          <TrendingUp className={cn("w-6 h-6", activeTab === 'kpi' ? "fill-emerald-50" : "")} />
          <span className="text-[10px] font-bold">운영실적</span>
        </button>
        <button 
          onClick={() => setActiveTab('salary')}
          className={cn(
            "flex flex-col items-center gap-1 transition-all",
            activeTab === 'salary' ? "text-emerald-600" : "text-gray-400"
          )}
        >
          <Users className={cn("w-6 h-6", activeTab === 'salary' ? "fill-emerald-50" : "")} />
          <span className="text-[10px] font-bold">직원급여</span>
        </button>
      </div>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-gray-100">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-900">Pyeoban-jib Finance</span>
          </div>
          <p className="text-sm text-gray-400">© 2025 Pyeoban-jib. All financial data is confidential.</p>
        </div>
      </footer>
      </>
      )}
    </div>
    )}
    </ErrorBoundary>
  );
}
