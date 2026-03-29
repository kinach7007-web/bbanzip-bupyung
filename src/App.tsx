/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState, useEffect, Component } from 'react';
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
  LogOut
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
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  db, auth, loginWithGoogle, logout, onAuthStateChanged, handleFirestoreError, OperationType,
  collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, onSnapshot, query, where, orderBy, writeBatch,
  type FirebaseUser 
} from './firebase';
import { PL_DATA, KPI_DATA, CASH_BALANCE_DATA } from './data';
import { PLDashboard } from './components/PLDashboard';
import { KPIDashboard } from './components/KPIDashboard';
import { CashBalanceSheet } from './components/CashBalanceSheet';
import { SalaryDashboard } from './components/SalaryDashboard';
import { ArchiveViewer } from './components/ArchiveViewer';
import { Login, type User } from './components/Login';
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

const generateInitialCashData = (monthStr: string) => {
  const [year, month] = monthStr.split('-').map(Number);
  const days = new Date(year, month, 0).getDate();
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  return {
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

const generateInitialSalaryState = (monthStr: string): SalaryState => {
  const [year, month] = monthStr.split('-').map(Number);
  const days = new Date(year, month, 0).getDate();
  
  const now = new Date();
  const isCurrentMonth = now.getFullYear() === year && (now.getMonth() + 1) === month;
  const dayForMonth = isCurrentMonth ? now.getDate() : days;

  return {
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

export default function App() {
  const [isManualToday, setIsManualToday] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<string>(() => {
    const saved = localStorage.getItem('pyeobanjib-current-month');
    if (saved) return saved;
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const getBusinessDate = () => {
    if (isManualToday) {
      const [year, month] = currentMonth.split('-').map(Number);
      const lastDay = new Date(year, month, 0).getDate();
      return `${currentMonth}-${String(lastDay).padStart(2, '0')}`;
    }
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    if (todayStr.startsWith(currentMonth)) {
      return todayStr;
    } else {
      const [year, month] = currentMonth.split('-').map(Number);
      const lastDay = new Date(year, month, 0).getDate();
      return `${currentMonth}-${String(lastDay).padStart(2, '0')}`;
    }
  };

  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('cash');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cashBalanceData, setCashBalanceData] = useState(() => generateInitialCashData(currentMonth));
  const [vendorList, setVendorList] = useState<Record<string, string[]>>(PL_DATA.vendors || {});
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [archives, setArchives] = useState<MonthlyArchive[]>([]);
  const [viewingArchive, setViewingArchive] = useState<MonthlyArchive | null>(null);
  const [isClosingMonth, setIsClosingMonth] = useState(false);
  const [salaryState, setSalaryState] = useState<SalaryState>(() => generateInitialSalaryState(currentMonth));

  // Firebase Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const userData: User = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || '사용자',
          role: '운영자', // Default role for now
          email: firebaseUser.email || ''
        };
        setUser(userData);
        setIsLoginModalOpen(false);
      } else {
        setUser(null);
        setIsLoginModalOpen(true);
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Real-time Sync: Transactions
  useEffect(() => {
    if (!isAuthReady || !user) return;
    const q = query(collection(db, 'transactions'), where('month', '==', currentMonth));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data() } as Transaction));
      setTransactions(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'transactions'));
    return () => unsubscribe();
  }, [isAuthReady, user, currentMonth]);

  // Real-time Sync: Cash Balance
  useEffect(() => {
    if (!isAuthReady || !user) return;
    const docRef = doc(db, 'cashBalanceData', currentMonth);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setCashBalanceData(docSnap.data() as any);
      } else {
        // Initialize if not exists
        const initial = generateInitialCashData(currentMonth);
        setDoc(docRef, initial).catch(e => handleFirestoreError(e, OperationType.CREATE, `cashBalanceData/${currentMonth}`));
        setCashBalanceData(initial);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, `cashBalanceData/${currentMonth}`));
    return () => unsubscribe();
  }, [isAuthReady, user, currentMonth]);

  // Real-time Sync: Salary State
  useEffect(() => {
    if (!isAuthReady || !user) return;
    const docRef = doc(db, 'salaryState', currentMonth);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setSalaryState(docSnap.data() as SalaryState);
      } else {
        // Initialize if not exists
        const initial = generateInitialSalaryState(currentMonth);
        setDoc(docRef, initial).catch(e => handleFirestoreError(e, OperationType.CREATE, `salaryState/${currentMonth}`));
        setSalaryState(initial);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, `salaryState/${currentMonth}`));
    return () => unsubscribe();
  }, [isAuthReady, user, currentMonth]);

  // Real-time Sync: Archives
  useEffect(() => {
    if (!isAuthReady || !user) return;
    const q = query(collection(db, 'archives'), orderBy('month', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data() } as MonthlyArchive));
      setArchives(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'archives'));
    return () => unsubscribe();
  }, [isAuthReady, user]);

  // Real-time Sync: Settings
  useEffect(() => {
    if (!isAuthReady || !user) return;
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
      await setDoc(doc(db, 'salaryState', currentMonth), newData);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `salaryState/${currentMonth}`);
    }
  };

  // Persistence: Save to localStorage
  useEffect(() => {
    localStorage.setItem('pyeobanjib-current-month', currentMonth);
  }, [currentMonth]);

  useEffect(() => {
    localStorage.setItem('pyeobanjib-transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('pyeobanjib-cash-data', JSON.stringify(cashBalanceData));
  }, [cashBalanceData]);

  useEffect(() => {
    localStorage.setItem('pyeobanjib-salary-state', JSON.stringify(salaryState));
  }, [salaryState]);

  useEffect(() => {
    localStorage.setItem('pyeobanjib-archives', JSON.stringify(archives));
  }, [archives]);
  
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
  }, [currentMonth, isManualToday]);

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
    const partTimeTotal = salaryState.partTimeDays.reduce((sum, day) => sum + day.reduce((a, b) => a + b.amount, 0), 0);
    const dispatchTotal = salaryState.dispatchDays.reduce((sum, day) => sum + day.reduce((a, b) => a + b.amount, 0), 0);
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

      // Also update details if they exist
      const updatedDetails = cat.details?.map(detail => {
        let detailTransactions = [];
        if (cat.name === '매출원가') {
          // Map vendors to sub-categories based on user request
          const meatVendors = ['뼈(제일축산)', '우거지', '모자반(제주)', '참좋은식품', '프로축산(내장)', '곱창(CNK)', '오돌뼈(미트촌)'];
          const groceryVendors = ['우리과일야채(조병윤)', '모아상사(공산품)', '대형마트 & 부평시장', '편의점', '다이소', '쌀(병남형님)', '모노마트', '화미(다화에프앤비)', '웰빙나눔유통', '주유'];
          
          if (detail.name === '[육류 및 육수 재료]') {
            detailTransactions = allTransactions.filter(t => t.category === '매출원가' && meatVendors.includes(t.name));
          } else if (detail.name === '[식자재&공산품 소계]') {
            detailTransactions = allTransactions.filter(t => t.category === '매출원가' && groceryVendors.includes(t.name));
          } else {
            detailTransactions = allTransactions.filter(t => t.category === cat.name && t.name === detail.name);
          }
        } else {
          detailTransactions = allTransactions.filter(t => t.category === cat.name && t.name === detail.name);
        }
        const detailAdditionalAmount = detailTransactions.reduce((sum, t) => sum + t.amount, 0);
        return {
          ...detail,
          amount: detail.amount + detailAdditionalAmount
        };
      });

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
  }, [allTransactions, currentTotalSales, salaryBreakdown]);

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
    setIsClosingMonth(true);
  };

  const confirmCloseMonth = async () => {
    if (!user) return;
    try {
      const batch = writeBatch(db);
      
      // 1. Create Archive
      const archiveId = currentMonth;
      const archiveRef = doc(db, 'archives', archiveId);
      const archiveData: MonthlyArchive = {
        id: archiveId,
        month: currentMonth.replace('-', '.'),
        summary: {
          totalSales: currentSummary.totalSales,
          netProfit: currentSummary.netProfit,
          operatingProfit: currentSummary.operatingProfit,
          cogs: currentSummary.cogs,
          labor: currentSummary.labor,
          rent: currentSummary.rent,
          fixedCosts: currentSummary.fixedCosts,
          variableCosts: currentSummary.variableCosts,
          marketingCosts: currentSummary.marketingCosts,
          taxes: currentSummary.taxes,
          cardFees: currentSummary.cardFees,
        },
        timestamp: new Date().toISOString(),
        data: {
          transactions,
          cashBalanceData,
          salaryState
        }
      };
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
      
      // Initialize next month's cash balance
      const nextCashRef = doc(db, 'cashBalanceData', nextMonthStr);
      const nextCashData = generateInitialCashData(nextMonthStr);
      nextCashData.carryover = cashBalanceData.finalBalance;
      nextCashData.rows[0].prevBalance = cashBalanceData.finalBalance;
      nextCashData.rows[0].balance = cashBalanceData.finalBalance;
      nextCashData.finalBalance = cashBalanceData.finalBalance;
      batch.set(nextCashRef, nextCashData);

      // Initialize next month's salary state
      const nextSalaryRef = doc(db, 'salaryState', nextMonthStr);
      const nextSalaryData = generateInitialSalaryState(nextMonthStr);
      batch.set(nextSalaryRef, nextSalaryData);

      await batch.commit();

      setCurrentMonth(nextMonthStr);
      setIsClosingMonth(false);
      setActiveTab('archives');
      alert(`${currentMonth.replace('-', '년 ')}월 마감이 완료되었습니다. ${nextMonthStr.replace('-', '년 ')}월 업무를 시작합니다.`);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'batch/closeMonth');
    }
  };

  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleResetAllData = async () => {
    if (!user) return;
    try {
      const batch = writeBatch(db);
      
      // Delete all transactions
      const txDocs = await getDocs(collection(db, 'transactions'));
      txDocs.forEach(d => batch.delete(d.ref));
      
      // Delete all cashBalanceData
      const cbDocs = await getDocs(collection(db, 'cashBalanceData'));
      cbDocs.forEach(d => batch.delete(d.ref));
      
      // Delete all salaryState
      const ssDocs = await getDocs(collection(db, 'salaryState'));
      ssDocs.forEach(d => batch.delete(d.ref));
      
      // Delete all archives
      const arDocs = await getDocs(collection(db, 'archives'));
      arDocs.forEach(d => batch.delete(d.ref));
      
      // Delete settings
      batch.delete(doc(db, 'settings', 'global'));

      await batch.commit();

      localStorage.clear();
      setIsResetConfirmOpen(false);
      window.location.reload();
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'batch/resetAllData');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1C1E] font-sans selection:bg-emerald-100 pb-20">
      {isLoginModalOpen ? (
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
              <button 
                onClick={() => setActiveTab('archives')}
                className={cn(
                  "px-4 py-1.5 text-sm font-bold rounded-lg transition-all",
                  activeTab === 'archives' ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                보관함
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
                          handleCloseMonth();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Lock className="w-4 h-4" />
                        월 마감하기
                      </button>

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
            <div className="flex items-center justify-between bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center">
                  <ArchiveIcon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-indigo-900">{viewingArchive.month} 마감 데이터 조회 중</h2>
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

            {activeTab === 'cash' ? (
              <CashBalanceSheet data={viewingArchive.data.cashBalanceData} setData={() => {}} isReadOnly user={user} />
            ) : activeTab === 'pl' ? (
              <PLDashboard 
                user={user}
                currentMonth={viewingArchive.month.replace('.', '-')}
                currentSummary={viewingArchive.summary}
                currentExpenses={[]} // Simplified for archive view
                salaryBreakdown={{
                  employeesTotal: viewingArchive.data.salaryState.employees.reduce((sum: number, emp: any) => sum + emp.totalSalary, 0),
                  partTimeTotal: viewingArchive.data.salaryState.partTimeDays.reduce((sum: number, day: any[]) => sum + day.reduce((dSum, r) => dSum + r.amount, 0), 0),
                  dispatchTotal: viewingArchive.data.salaryState.dispatchDays.reduce((sum: number, day: any[]) => sum + day.reduce((dSum, r) => dSum + r.amount, 0), 0),
                  insuranceTotal: viewingArchive.data.salaryState.nationalHealth + viewingArchive.data.salaryState.nationalPension + viewingArchive.data.salaryState.employmentInsurance + viewingArchive.data.salaryState.industrialAccidentInsurance,
                  total: viewingArchive.summary.labor
                }}
                transactions={viewingArchive.data.transactions}
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
                isManualToday={isManualToday}
                setIsManualToday={setIsManualToday}
              />
            ) : activeTab === 'kpi' ? (
              <KPIDashboard 
                currentSummary={viewingArchive.summary}
                currentExpenses={[]}
                archives={archives}
                isReadOnly
              />
            ) : activeTab === 'salary' ? (
              <SalaryDashboard 
                user={user}
                currentMonth={viewingArchive.month.replace('.', '-')}
                salaryState={viewingArchive.data.salaryState}
                setSalaryState={() => {}}
                isReadOnly
              />
            ) : null}
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
            isManualToday={isManualToday}
            setIsManualToday={setIsManualToday}
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
        ) : (
          <ArchiveViewer 
            archives={archives} 
            onSelectArchive={(archive) => {
              setViewingArchive(archive);
              setActiveTab('pl');
            }} 
          />
        )}
      </main>

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
                  className="px-6 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 active:scale-95 transition-all"
                >
                  취소
                </button>
                <button 
                  onClick={handleResetAllData}
                  className="px-6 py-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 active:scale-95 shadow-lg shadow-red-200 transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-5 h-5" />
                  초기화하기
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
              <p className="text-sm text-gray-500 text-center mb-8">
                마감된 데이터는 보관함으로 이동하며,<br />
                현재 작업 중인 데이터는 초기화됩니다.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsClosingMonth(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-all"
                >
                  취소
                </button>
                <button 
                  onClick={confirmCloseMonth}
                  className="flex-1 px-4 py-3 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 shadow-lg shadow-rose-200 transition-all"
                >
                  마감하기
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
        <button 
          onClick={() => setActiveTab('archives')}
          className={cn(
            "flex flex-col items-center gap-1 transition-all",
            activeTab === 'archives' ? "text-emerald-600" : "text-gray-400"
          )}
        >
          <ArchiveIcon className={cn("w-6 h-6", activeTab === 'archives' ? "fill-emerald-50" : "")} />
          <span className="text-[10px] font-bold">보관함</span>
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
  );
}
