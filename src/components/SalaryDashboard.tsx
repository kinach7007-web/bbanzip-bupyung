import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Trash2, Users, X, Shield } from 'lucide-react';
import { type Employee, type PartTimeWorker, type PartTimeRecord, type DispatchRecord, type DispatchWorker, type SalaryState } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { type User } from './Login';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function SalaryDashboard({
  user,
  currentMonth,
  salaryState,
  setSalaryState,
  isReadOnly = false
}: {
  user?: User | null;
  currentMonth: string;
  salaryState: SalaryState;
  setSalaryState: React.Dispatch<React.SetStateAction<SalaryState>>;
  isReadOnly?: boolean;
}) {
  const [year, month] = currentMonth.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  
  const now = new Date();
  const isCurrentMonth = now.getFullYear() === year && (now.getMonth() + 1) === month;
  const currentDay = isCurrentMonth ? now.getDate() : daysInMonth;
  const {
    employees,
    partTimeWorkers,
    partTimeDays,
    dispatchDays,
    dispatchWorkers,
    nationalHealth,
    nationalPension,
    employmentInsurance,
    industrialAccidentInsurance
  } = salaryState;
  
  const setEmployees = (employees: Employee[] | ((prev: Employee[]) => Employee[])) => 
    setSalaryState(prev => ({ ...prev, employees: typeof employees === 'function' ? employees(prev.employees) : employees }));
  const setPartTimeWorkers = (partTimeWorkers: PartTimeWorker[] | ((prev: PartTimeWorker[]) => PartTimeWorker[])) => 
    setSalaryState(prev => ({ ...prev, partTimeWorkers: typeof partTimeWorkers === 'function' ? partTimeWorkers(prev.partTimeWorkers) : partTimeWorkers }));
  const setPartTimeDays = (partTimeDays: PartTimeRecord[][] | ((prev: PartTimeRecord[][]) => PartTimeRecord[][])) => 
    setSalaryState(prev => ({ ...prev, partTimeDays: typeof partTimeDays === 'function' ? partTimeDays(prev.partTimeDays) : partTimeDays }));
  const setDispatchDays = (dispatchDays: DispatchRecord[][] | ((prev: DispatchRecord[][]) => DispatchRecord[][])) => 
    setSalaryState(prev => ({ ...prev, dispatchDays: typeof dispatchDays === 'function' ? dispatchDays(prev.dispatchDays) : dispatchDays }));
  const setDispatchWorkers = (dispatchWorkers: DispatchWorker[] | ((prev: DispatchWorker[]) => DispatchWorker[])) => 
    setSalaryState(prev => ({ ...prev, dispatchWorkers: typeof dispatchWorkers === 'function' ? dispatchWorkers(prev.dispatchWorkers) : dispatchWorkers }));
  const setNationalHealth = (nationalHealth: number | ((prev: number) => number)) => 
    setSalaryState(prev => ({ ...prev, nationalHealth: typeof nationalHealth === 'function' ? nationalHealth(prev.nationalHealth) : nationalHealth }));
  const setNationalPension = (nationalPension: number | ((prev: number) => number)) => 
    setSalaryState(prev => ({ ...prev, nationalPension: typeof nationalPension === 'function' ? nationalPension(prev.nationalPension) : nationalPension }));
  const setEmploymentInsurance = (employmentInsurance: number | ((prev: number) => number)) => 
    setSalaryState(prev => ({ ...prev, employmentInsurance: typeof employmentInsurance === 'function' ? employmentInsurance(prev.employmentInsurance) : employmentInsurance }));
  const setIndustrialAccidentInsurance = (industrialAccidentInsurance: number | ((prev: number) => number)) => 
    setSalaryState(prev => ({ ...prev, industrialAccidentInsurance: typeof industrialAccidentInsurance === 'function' ? industrialAccidentInsurance(prev.industrialAccidentInsurance) : industrialAccidentInsurance }));
  const [selectedDispatchDay, setSelectedDispatchDay] = useState<number>(currentDay);
  const [isDispatchWorkerModalOpen, setIsDispatchWorkerModalOpen] = useState(false);
  const [newDispatchWorkerName, setNewDispatchWorkerName] = useState('');
  const [newDispatchWorkerResidentNumber, setNewDispatchWorkerResidentNumber] = useState('');
  const [dispatchInputWorkerId, setDispatchInputWorkerId] = useState<string>('');
  const [dispatchInputAmount, setDispatchInputAmount] = useState<number>(0);
  
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    message: '',
    onConfirm: () => {},
  });

  const triggerConfirm = (message: string, onConfirm: () => void) => {
    setConfirmModal({
      isOpen: true,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const [selectedPartTimeDay, setSelectedPartTimeDay] = useState<number>(currentDay);
  const [partTimeInputWorkerId, setPartTimeInputWorkerId] = useState<string>('');
  const [partTimeInputHourlyWage, setPartTimeInputHourlyWage] = useState<number>(0);
  const [partTimeInputWorkHours, setPartTimeInputWorkHours] = useState<number>(0);

  const [isWorkerModalOpen, setIsWorkerModalOpen] = useState(false);
  const [newWorkerName, setNewWorkerName] = useState('');
  const [newWorkerResidentNumber, setNewWorkerResidentNumber] = useState('');
  const [newWorkerWage, setNewWorkerWage] = useState(0);

  useEffect(() => {
    const worker = partTimeWorkers.find(w => w.id === partTimeInputWorkerId);
    if (worker) {
      setPartTimeInputHourlyWage(worker.defaultHourlyWage);
    } else {
      setPartTimeInputHourlyWage(0);
    }
  }, [partTimeInputWorkerId, partTimeWorkers]);

  const [insuranceInputType, setInsuranceInputType] = useState<string>('국민건강');
  const [insuranceInputAmount, setInsuranceInputAmount] = useState<string>('');

  const totalDispatch = useMemo(() => dispatchDays.reduce((sum, dayRecords) => sum + dayRecords.reduce((a, b) => a + b.amount, 0), 0), [dispatchDays]);
  const totalPartTime = useMemo(() => partTimeDays.reduce((sum, dayRecords) => sum + dayRecords.reduce((a, b) => a + b.amount, 0), 0), [partTimeDays]);

  const handleAddDispatch = () => {
    const worker = dispatchWorkers.find(w => w.id === dispatchInputWorkerId);
    if (worker && dispatchInputAmount > 0) {
      const newDays = [...dispatchDays];
      newDays[selectedDispatchDay - 1] = [
        ...newDays[selectedDispatchDay - 1], 
        { 
          name: worker.name, 
          residentNumber: worker.residentNumber,
          amount: dispatchInputAmount,
          author: user?.name
        }
      ];
      setDispatchDays(newDays);
      setDispatchInputAmount(0);
    }
  };

  const handleAddPartTime = () => {
    const worker = partTimeWorkers.find(w => w.id === partTimeInputWorkerId);
    if (worker && partTimeInputHourlyWage > 0 && partTimeInputWorkHours > 0) {
      const newDays = [...partTimeDays];
      newDays[selectedPartTimeDay - 1] = [
        ...newDays[selectedPartTimeDay - 1], 
        { 
          name: worker.name, 
          residentNumber: worker.residentNumber,
          hourlyWage: partTimeInputHourlyWage,
          workHours: partTimeInputWorkHours,
          amount: partTimeInputHourlyWage * partTimeInputWorkHours,
          author: user?.name
        }
      ];
      setPartTimeDays(newDays);
      setPartTimeInputWorkHours(0);
    }
  };

  const handleAddWorker = () => {
    if (newWorkerName.trim() && newWorkerWage > 0) {
      setPartTimeWorkers(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          name: newWorkerName.trim(),
          residentNumber: newWorkerResidentNumber.trim(),
          defaultHourlyWage: newWorkerWage
        }
      ]);
      setNewWorkerName('');
      setNewWorkerResidentNumber('');
      setNewWorkerWage(0);
    }
  };

  const handleDeleteWorker = (id: string) => {
    triggerConfirm('정말 삭제하시겠습니까?', () => {
      setPartTimeWorkers(prev => prev.filter(w => w.id !== id));
      if (partTimeInputWorkerId === id) {
        setPartTimeInputWorkerId('');
      }
    });
  };

  const handleAddDispatchWorker = () => {
    if (newDispatchWorkerName.trim()) {
      setDispatchWorkers(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          name: newDispatchWorkerName.trim(),
          residentNumber: newDispatchWorkerResidentNumber.trim(),
        }
      ]);
      setNewDispatchWorkerName('');
      setNewDispatchWorkerResidentNumber('');
    }
  };

  const handleDeleteDispatchWorker = (id: string) => {
    triggerConfirm('정말 삭제하시겠습니까?', () => {
      setDispatchWorkers(prev => prev.filter(w => w.id !== id));
      if (dispatchInputWorkerId === id) {
        setDispatchInputWorkerId('');
      }
    });
  };

  const handleEmployeeChange = (empId: string, field: keyof Employee, value: string | number | boolean) => {
    setEmployees(prev => prev.map(emp => {
      if (emp.id !== empId) return emp;
      
      const updatedEmp = { ...emp, [field]: value };
      
      if (field === 'monthlySalary') {
        updatedEmp.dailyWage = Math.round(Number(value) / daysInMonth);
        updatedEmp.totalSalary = updatedEmp.dailyWage * updatedEmp.totalWorkDays;
      } else if (field === 'dailyWage') {
        updatedEmp.totalSalary = Number(value) * updatedEmp.totalWorkDays;
      } else if (field === 'totalWorkDays') {
        updatedEmp.totalSalary = updatedEmp.dailyWage * Number(value);
      } else if (field === 'isAutoWorkDays') {
        if (value === true) {
          updatedEmp.totalWorkDays = currentDay;
          updatedEmp.totalSalary = updatedEmp.dailyWage * currentDay;
        }
      }
      
      return updatedEmp;
    }));
  };

  const addEmployee = () => {
    const newEmp: Employee = {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      position: '',
      monthlySalary: 0,
      dailyWage: 0,
      totalWorkDays: currentDay,
      isAutoWorkDays: true,
      totalSalary: 0,
      note: ''
    };
    setEmployees([...employees, newEmp]);
  };

  const removeEmployee = (id: string) => {
    triggerConfirm('정말 삭제하시겠습니까?', () => {
      setEmployees(prev => prev.filter(emp => emp.id !== id));
    });
  };

  const summary = useMemo(() => {
    const totalMonthlySalary = employees.reduce((sum, emp) => sum + emp.monthlySalary, 0);
    const totalDailyWage = employees.reduce((sum, emp) => sum + emp.dailyWage, 0);
    const totalWorkDays = employees.reduce((sum, emp) => sum + emp.totalWorkDays, 0);
    const totalSalary = employees.reduce((sum, emp) => sum + emp.totalSalary, 0);
    
    const totalInsurance = nationalHealth + nationalPension + employmentInsurance + industrialAccidentInsurance;
    const grandTotal = totalSalary + totalPartTime + totalDispatch + totalInsurance;

    return {
      totalMonthlySalary,
      totalDailyWage,
      totalWorkDays,
      totalSalary,
      totalInsurance,
      grandTotal
    };
  }, [employees, totalPartTime, totalDispatch, nationalHealth, nationalPension, employmentInsurance, industrialAccidentInsurance]);

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('ko-KR');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 md:p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              직원급여 현황표
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              ▶ 매일 출근 기준: 오늘 날짜({currentDay}일) 기준으로 근무일수와 급여가 자동 계산됩니다.
            </p>
          </div>
          {!isReadOnly && (
            <button
              onClick={addEmployee}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              직원 추가
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-xs text-gray-700 bg-gray-50 border-b border-gray-200">
              <tr>
                <th rowSpan={2} className="px-3 py-3 font-semibold text-center border-r border-gray-200 sticky left-0 bg-gray-50 z-10">성명</th>
                <th rowSpan={2} className="px-3 py-3 font-semibold text-center border-r border-gray-200">직급</th>
                <th colSpan={3} className="px-3 py-2 font-semibold text-center border-r border-gray-200 border-b border-gray-200">지급내용</th>
                <th rowSpan={2} className="px-3 py-3 font-semibold text-center border-r border-gray-200">급여</th>
                <th rowSpan={2} className="px-3 py-3 font-semibold text-center border-l border-gray-200">비고</th>
                {!isReadOnly && <th rowSpan={2} className="px-3 py-3 font-semibold text-center">관리</th>}
              </tr>
              <tr>
                <th className="px-3 py-1 font-semibold text-center border-r border-gray-200">월급</th>
                <th className="px-3 py-1 font-semibold text-center border-r border-gray-200">일당</th>
                <th className="px-3 py-1 font-semibold text-center border-r border-gray-200">근무일수</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-2 py-2 border-r border-gray-200 sticky left-0 bg-white z-10">
                    <input
                      type="text"
                      value={emp.name}
                      onChange={(e) => handleEmployeeChange(emp.id, 'name', e.target.value)}
                      disabled={isReadOnly}
                      className={cn(
                        "w-20 px-2 py-1 text-center border border-transparent rounded outline-none transition-colors",
                        !isReadOnly && "hover:border-gray-300 focus:border-emerald-500",
                        isReadOnly && "bg-transparent cursor-default"
                      )}
                      placeholder="이름"
                    />
                  </td>
                  <td className="px-2 py-2 border-r border-gray-200">
                    <input
                      type="text"
                      value={emp.position}
                      onChange={(e) => handleEmployeeChange(emp.id, 'position', e.target.value)}
                      disabled={isReadOnly}
                      className={cn(
                        "w-16 px-2 py-1 text-center border border-transparent rounded outline-none transition-colors",
                        !isReadOnly && "hover:border-gray-300 focus:border-emerald-500",
                        isReadOnly && "bg-transparent cursor-default"
                      )}
                      placeholder="직급"
                    />
                  </td>
                  <td className="px-2 py-2 border-r border-gray-200">
                    <input
                      type="text"
                      value={emp.monthlySalary === 0 ? '' : emp.monthlySalary.toLocaleString()}
                      onChange={(e) => handleEmployeeChange(emp.id, 'monthlySalary', Number(e.target.value.replace(/,/g, '')))}
                      disabled={isReadOnly}
                      className={cn(
                        "w-24 px-2 py-1 text-right border border-transparent rounded outline-none transition-colors",
                        !isReadOnly && "hover:border-gray-300 focus:border-emerald-500",
                        isReadOnly && "bg-transparent cursor-default"
                      )}
                      placeholder="0"
                    />
                  </td>
                  <td className="px-2 py-2 border-r border-gray-200">
                    <input
                      type="text"
                      value={emp.dailyWage === 0 ? '' : emp.dailyWage.toLocaleString()}
                      onChange={(e) => handleEmployeeChange(emp.id, 'dailyWage', Number(e.target.value.replace(/,/g, '')))}
                      disabled={isReadOnly}
                      className={cn(
                        "w-20 px-2 py-1 text-right border border-transparent rounded outline-none transition-colors",
                        !isReadOnly && "hover:border-gray-300 focus:border-emerald-500",
                        isReadOnly && "bg-transparent cursor-default"
                      )}
                      placeholder="0"
                    />
                  </td>
                  <td className="px-2 py-2 border-r border-gray-200 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {!isReadOnly && (
                        <label className="flex items-center gap-1 text-[10px] text-gray-500 cursor-pointer bg-gray-50 px-1.5 py-1 rounded border border-gray-200 hover:bg-gray-100 transition-colors" title="오늘 날짜 기준으로 자동 계산">
                          <input
                            type="checkbox"
                            checked={emp.isAutoWorkDays}
                            onChange={(e) => handleEmployeeChange(emp.id, 'isAutoWorkDays', e.target.checked)}
                            className="w-3 h-3 rounded text-emerald-600 focus:ring-emerald-500 border-gray-300 cursor-pointer"
                          />
                          자동
                        </label>
                      )}
                      <input
                        type="number"
                        value={emp.totalWorkDays === 0 ? '' : emp.totalWorkDays}
                        onChange={(e) => handleEmployeeChange(emp.id, 'totalWorkDays', Number(e.target.value))}
                        disabled={emp.isAutoWorkDays || isReadOnly}
                        className={cn(
                          "w-14 px-2 py-1 text-center border rounded outline-none transition-colors font-medium",
                          (emp.isAutoWorkDays || isReadOnly)
                            ? 'bg-gray-100 text-gray-500 border-transparent cursor-not-allowed' 
                            : 'bg-white text-gray-900 border-gray-300 hover:border-gray-400 focus:border-emerald-500'
                        )}
                        placeholder="0"
                      />
                    </div>
                  </td>
                  <td className="px-2 py-2 border-r border-gray-200 text-right font-bold text-gray-900 bg-gray-50/50">
                    {formatCurrency(emp.totalSalary)}
                  </td>
                  <td className="px-2 py-2 border-l border-gray-200">
                    <input
                      type="text"
                      value={emp.note}
                      onChange={(e) => handleEmployeeChange(emp.id, 'note', e.target.value)}
                      disabled={isReadOnly}
                      className={cn(
                        "w-32 px-2 py-1 border border-transparent rounded outline-none transition-colors",
                        !isReadOnly && "hover:border-gray-300 focus:border-emerald-500",
                        isReadOnly && "bg-transparent cursor-default"
                      )}
                      placeholder="비고"
                    />
                  </td>
                  {!isReadOnly && (
                    <td className="px-2 py-2 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeEmployee(emp.id);
                        }}
                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors flex items-center justify-center mx-auto cursor-pointer"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              
              {/* Summary Row */}
              <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                <td className="px-3 py-3 text-center border-r border-gray-200 sticky left-0 bg-gray-100 z-10">합계</td>
                <td className="px-3 py-3 text-center border-r border-gray-200 text-gray-500 text-xs">{employees.length}명</td>
                <td className="px-3 py-3 text-right border-r border-gray-200">{formatCurrency(summary.totalMonthlySalary)}</td>
                <td className="px-3 py-3 text-right border-r border-gray-200">{formatCurrency(summary.totalDailyWage)}</td>
                <td className="px-3 py-3 text-center border-r border-gray-200">{summary.totalWorkDays}</td>
                <td className="px-3 py-3 text-right border-r border-gray-200 text-emerald-700">{formatCurrency(summary.totalSalary)}</td>
                <td colSpan={isReadOnly ? 1 : 2} className="px-3 py-3"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Part-Time and Dispatch Grid */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {/* Part-Time Daily Tracking */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 md:p-6 border-b border-gray-200 bg-gray-50/50 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                알바급여
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                ▶ 날짜와 알바생을 선택하고 근무시간을 입력하세요.
              </p>
            </div>
            {!isReadOnly && (
              <button
                onClick={() => setIsWorkerModalOpen(true)}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors text-sm shadow-sm"
              >
                알바정보입력
              </button>
            )}
          </div>
          <div className="p-4 md:p-6">
            {/* Input Form */}
            {!isReadOnly && (
              <div className="flex flex-row gap-2 mb-4 items-end">
                <div className="w-16">
                  <label className="block text-xs font-medium text-gray-700 mb-1">날짜</label>
                  <select 
                    value={selectedPartTimeDay}
                    onChange={(e) => setSelectedPartTimeDay(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                  >
                    {Array.from({length: daysInMonth}, (_, i) => i + 1).map(day => (
                      <option key={day} value={day}>{day}일</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">이름</label>
                  <select
                    value={partTimeInputWorkerId}
                    onChange={(e) => setPartTimeInputWorkerId(e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                  >
                    <option value="">선택</option>
                    {partTimeWorkers.map(worker => (
                      <option key={worker.id} value={worker.id}>{worker.name}</option>
                    ))}
                  </select>
                </div>
                <div className="w-20">
                  <label className="block text-xs font-medium text-gray-700 mb-1">근무시간</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={partTimeInputWorkHours === 0 ? '' : partTimeInputWorkHours}
                      onChange={(e) => {
                        const val = Number(e.target.value.replace(/[^0-9.]/g, ''));
                        if (!isNaN(val)) setPartTimeInputWorkHours(val);
                      }}
                      className="w-full border border-gray-300 rounded px-2 py-1.5 pr-6 text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-right font-medium"
                      placeholder="0"
                    />
                    <span className="absolute right-2 top-1.5 text-gray-500 text-xs">H</span>
                  </div>
                </div>
                <button
                  onClick={handleAddPartTime}
                  disabled={!partTimeInputWorkerId || partTimeInputWorkHours <= 0}
                  className="px-3 py-1.5 bg-emerald-600 text-white text-sm font-medium rounded hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  입력
                </button>
              </div>
            )}

            {/* Status List */}
            {partTimeDays.some(records => records.length > 0) ? (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50/50">
                  <h3 className="text-sm font-bold text-gray-700">출근 현황</h3>
                  <span className="text-xs text-gray-500 font-medium bg-white px-2.5 py-1 rounded-full border border-gray-200">
                    총 {partTimeDays.filter(r => r.length > 0).length}일 ({partTimeDays.reduce((sum, r) => sum + r.length, 0)}건)
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="text-[11px] text-gray-700 bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-2 py-2 font-semibold text-center border-r border-gray-200 w-12">날짜</th>
                        <th className="px-2 py-2 font-semibold text-center border-r border-gray-200">이름</th>
                        <th className="px-2 py-2 font-semibold text-center border-r border-gray-200 w-16">시간</th>
                        <th className="px-2 py-2 font-semibold text-center border-r border-gray-200 w-20">금액</th>
                        {!isReadOnly && <th className="px-2 py-2 font-semibold text-center w-10">관리</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {partTimeDays.map((dayRecords, dayIdx) => {
                        if (dayRecords.length === 0) return null;
                        return dayRecords.map((record, recordIdx) => (
                          <tr key={`${dayIdx}-${recordIdx}`} className="hover:bg-gray-50/50 transition-colors">
                            {recordIdx === 0 && (
                              <td rowSpan={dayRecords.length} className="px-2 py-1.5 text-center border-r border-b border-gray-200 font-medium text-gray-700 bg-gray-50/30 align-middle">
                                <div className="flex flex-col items-center justify-center gap-1">
                                  <span className="text-xs">{dayIdx + 1}일</span>
                                  {!isReadOnly && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        triggerConfirm('정말 삭제하시겠습니까?', () => {
                                          const newDays = [...partTimeDays];
                                          newDays[dayIdx] = [];
                                          setPartTimeDays(newDays);
                                        });
                                      }}
                                      className="text-[10px] px-1.5 py-0.5 bg-white border border-gray-200 text-gray-500 hover:text-red-500 hover:border-red-200 rounded transition-colors shadow-sm cursor-pointer"
                                      title="해당 일자 전체 삭제"
                                    >
                                      삭제
                                    </button>
                                  )}
                                </div>
                              </td>
                            )}
                            <td className="px-2 py-1.5 text-center border-r border-gray-200 text-gray-600">
                              {record.name}
                              {record.author && <span className="ml-1 text-[9px] bg-gray-100 text-gray-500 px-1 py-0.5 rounded">{record.author}</span>}
                            </td>
                            <td className="px-2 py-1.5 text-right border-r border-gray-200 font-medium text-gray-600">{record.workHours}H</td>
                            <td className="px-2 py-1.5 text-right border-r border-gray-200 font-medium text-gray-900">{record.amount.toLocaleString()}원</td>
                            {!isReadOnly && (
                              <td className="px-2 py-1.5 text-center">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    triggerConfirm('이 기록을 삭제하시겠습니까?', () => {
                                      const newDays = [...partTimeDays];
                                      newDays[dayIdx] = newDays[dayIdx].filter((_, i) => i !== recordIdx);
                                      setPartTimeDays(newDays);
                                    });
                                  }}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors flex items-center justify-center mx-auto cursor-pointer"
                                  title="삭제"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ));
                      })}
                      <tr className="bg-gray-50 font-bold border-t-2 border-gray-300">
                        <td colSpan={3} className="px-2 py-2 text-center border-r border-gray-200 text-gray-700">총 합계</td>
                        <td className="px-2 py-2 text-right border-r border-gray-200 text-emerald-700 text-sm">{totalPartTime.toLocaleString()}원</td>
                        {!isReadOnly && <td></td>}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-xl border border-gray-200 border-dashed">
                <p className="text-gray-500 text-sm">입력된 알바급여 내역이 없습니다.</p>
              </div>
            )}
          </div>
        </div>

        {/* Dispatch Daily Tracking */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 md:p-6 border-b border-gray-200 bg-gray-50/50 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                파출급여
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                ▶ 날짜와 파출을 선택하고 금액을 입력하세요.
              </p>
            </div>
            {!isReadOnly && (
              <button
                onClick={() => setIsDispatchWorkerModalOpen(true)}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors text-sm shadow-sm"
              >
                파출정보입력
              </button>
            )}
          </div>
          <div className="p-4 md:p-6">
            {/* Input Form */}
            {!isReadOnly && (
              <div className="flex flex-row gap-2 mb-4 items-end">
                <div className="w-16">
                  <label className="block text-xs font-medium text-gray-700 mb-1">날짜</label>
                  <select 
                    value={selectedDispatchDay}
                    onChange={(e) => setSelectedDispatchDay(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                  >
                    {Array.from({length: daysInMonth}, (_, i) => i + 1).map(day => (
                      <option key={day} value={day}>{day}일</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">이름</label>
                  <select
                    value={dispatchInputWorkerId}
                    onChange={(e) => setDispatchInputWorkerId(e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                  >
                    <option value="">선택</option>
                    {dispatchWorkers.map(worker => (
                      <option key={worker.id} value={worker.id}>{worker.name}</option>
                    ))}
                  </select>
                </div>
                <div className="w-24">
                  <label className="block text-xs font-medium text-gray-700 mb-1">금액</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={dispatchInputAmount === 0 ? '' : dispatchInputAmount.toLocaleString()}
                      onChange={(e) => {
                        const val = Number(e.target.value.replace(/,/g, ''));
                        if (!isNaN(val)) setDispatchInputAmount(val);
                      }}
                      className="w-full border border-gray-300 rounded px-2 py-1.5 pr-5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-right font-medium"
                      placeholder="0"
                    />
                    <span className="absolute right-1.5 top-1.5 text-gray-500 text-xs">원</span>
                  </div>
                </div>
                <button
                  onClick={handleAddDispatch}
                  disabled={!dispatchInputWorkerId || dispatchInputAmount <= 0}
                  className="px-3 py-1.5 bg-emerald-600 text-white text-sm font-medium rounded hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  입력
                </button>
              </div>
            )}

            {/* Status List */}
            {dispatchDays.some(records => records.length > 0) ? (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50/50">
                  <h3 className="text-sm font-bold text-gray-700">출근 현황</h3>
                  <span className="text-xs text-gray-500 font-medium bg-white px-2.5 py-1 rounded-full border border-gray-200">
                    총 {dispatchDays.filter(r => r.length > 0).length}일 ({dispatchDays.reduce((sum, r) => sum + r.length, 0)}건)
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="text-[11px] text-gray-700 bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-2 py-2 font-semibold text-center border-r border-gray-200 w-12">날짜</th>
                        <th className="px-2 py-2 font-semibold text-center border-r border-gray-200">이름</th>
                        <th className="px-2 py-2 font-semibold text-center border-r border-gray-200 w-24">금액</th>
                        {!isReadOnly && <th className="px-2 py-2 font-semibold text-center w-10">관리</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {dispatchDays.map((dayRecords, dayIdx) => {
                        if (dayRecords.length === 0) return null;
                        return dayRecords.map((record, recordIdx) => (
                          <tr key={`${dayIdx}-${recordIdx}`} className="hover:bg-gray-50/50 transition-colors">
                            {recordIdx === 0 && (
                              <td rowSpan={dayRecords.length} className="px-2 py-1.5 text-center border-r border-b border-gray-200 font-medium text-gray-700 bg-gray-50/30 align-middle">
                                <div className="flex flex-col items-center justify-center gap-1">
                                  <span className="text-xs">{dayIdx + 1}일</span>
                                  {!isReadOnly && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        triggerConfirm('해당 일자의 모든 기록을 삭제하시겠습니까?', () => {
                                          const newDays = [...dispatchDays];
                                          newDays[dayIdx] = [];
                                          setDispatchDays(newDays);
                                        });
                                      }}
                                      className="text-[10px] px-1.5 py-0.5 bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 rounded transition-colors shadow-sm cursor-pointer"
                                      title="해당 일자 전체 삭제"
                                    >
                                      삭제
                                    </button>
                                  )}
                                </div>
                              </td>
                            )}
                            <td className="px-2 py-1.5 text-center border-r border-gray-200 text-gray-600">
                              {record.name}
                              {record.author && <span className="ml-1 text-[9px] bg-gray-100 text-gray-500 px-1 py-0.5 rounded">{record.author}</span>}
                            </td>
                            <td className="px-2 py-1.5 text-right border-r border-gray-200 font-medium text-gray-900">{record.amount.toLocaleString()}원</td>
                            {!isReadOnly && (
                              <td className="px-2 py-1.5 text-center">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    triggerConfirm('이 기록을 삭제하시겠습니까?', () => {
                                      const newDays = [...dispatchDays];
                                      newDays[dayIdx] = newDays[dayIdx].filter((_, i) => i !== recordIdx);
                                      setDispatchDays(newDays);
                                    });
                                  }}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors flex items-center justify-center mx-auto cursor-pointer"
                                  title="삭제"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ));
                      })}
                      <tr className="bg-gray-50 font-bold border-t-2 border-gray-300">
                        <td colSpan={2} className="px-2 py-2 text-center border-r border-gray-200 text-gray-700">총 합계</td>
                        <td className="px-2 py-2 text-right border-r border-gray-200 text-emerald-700 text-sm">{totalDispatch.toLocaleString()}원</td>
                        {!isReadOnly && <td></td>}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-xl border border-gray-200 border-dashed">
                <p className="text-gray-500 text-sm">입력된 파출 출근 내역이 없습니다.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Additional Expenses Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 사대보험 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          <div className="p-4 md:p-6 border-b border-gray-200 bg-gray-50/50 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                4대보험
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                ▶ 보험 종류를 선택하고 금액을 입력하세요.
              </p>
            </div>
            <span className="text-xs text-blue-600 font-medium bg-blue-100 px-2.5 py-1 rounded-full border border-blue-200">월 1회</span>
          </div>
          <div className="p-4 md:p-6 flex-1 flex flex-col">
            {/* Input Form */}
            {!isReadOnly && (
              <div className="flex flex-row gap-2 mb-4 items-end">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">보험 종류</label>
                  <select
                    value={insuranceInputType}
                    onChange={(e) => setInsuranceInputType(e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    {['국민건강', '국민연금', '고용보험', '산재보험'].map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-[1.5]">
                  <label className="block text-xs font-medium text-gray-700 mb-1">금액</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={insuranceInputAmount}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setInsuranceInputAmount(val ? Number(val).toLocaleString() : '');
                      }}
                      className="w-full border border-gray-300 rounded px-2 py-1.5 pr-5 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-right font-medium"
                      placeholder="0"
                    />
                    <span className="absolute right-1.5 top-1.5 text-gray-500 text-xs">원</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const amount = Number(insuranceInputAmount.replace(/,/g, ''));
                    if (insuranceInputType === '국민건강') setNationalHealth(amount);
                    else if (insuranceInputType === '국민연금') setNationalPension(amount);
                    else if (insuranceInputType === '고용보험') setEmploymentInsurance(amount);
                    else if (insuranceInputType === '산재보험') setIndustrialAccidentInsurance(amount);
                    setInsuranceInputAmount('');
                  }}
                  disabled={!insuranceInputAmount || Number(insuranceInputAmount.replace(/,/g, '')) <= 0}
                  className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  입력
                </button>
              </div>
            )}

            {/* Status List */}
            <div className="overflow-x-auto mt-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-[11px] text-gray-700 bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-2 py-2 font-semibold text-center border-r border-gray-200">보험 종류</th>
                    <th className="px-2 py-2 font-semibold text-center border-r border-gray-200 w-24">금액</th>
                    {!isReadOnly && <th className="px-2 py-2 font-semibold text-center w-10">관리</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {[
                    { label: '국민건강', value: nationalHealth, setter: setNationalHealth },
                    { label: '국민연금', value: nationalPension, setter: setNationalPension },
                    { label: '고용보험', value: employmentInsurance, setter: setEmploymentInsurance },
                    { label: '산재보험', value: industrialAccidentInsurance, setter: setIndustrialAccidentInsurance },
                  ].map((item) => (
                    <tr key={item.label} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-2 py-1.5 text-center border-r border-gray-200 text-gray-600">{item.label}</td>
                      <td className="px-2 py-1.5 text-right border-r border-gray-200 font-medium text-gray-900">
                        {item.value === 0 ? '-' : item.value.toLocaleString() + '원'}
                      </td>
                      {!isReadOnly && (
                        <td className="px-2 py-1.5 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerConfirm('이 항목을 삭제하시겠습니까?', () => {
                                item.setter(0);
                              });
                            }}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors flex items-center justify-center mx-auto cursor-pointer"
                            title="삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-bold border-t-2 border-gray-300">
                    <td className="px-2 py-2 text-center border-r border-gray-200 text-gray-700">총 합계</td>
                    <td className="px-2 py-2 text-right border-r border-gray-200 text-blue-700 text-sm">{summary.totalInsurance.toLocaleString()}원</td>
                    {!isReadOnly && <td></td>}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 인건비 총합계 */}
        <div className="bg-emerald-50 rounded-2xl shadow-sm border border-emerald-100 p-5 flex flex-col justify-center">
          <h3 className="text-base font-bold text-emerald-900 mb-4">인건비 총합계</h3>
          
          <div className="space-y-2 text-xs text-emerald-800 bg-emerald-100/50 p-4 rounded-lg mb-4">
            <div className="flex justify-between">
              <span>직원급여 :</span>
              <span className="font-medium">{formatCurrency(summary.totalSalary)}원</span>
            </div>
            <div className="flex justify-between">
              <span>알바급여 :</span>
              <span className="font-medium">{formatCurrency(totalPartTime)}원</span>
            </div>
            <div className="flex justify-between">
              <span>파출급여 :</span>
              <span className="font-medium">{formatCurrency(totalDispatch)}원</span>
            </div>
            <div className="flex justify-between">
              <span>4대보험 :</span>
              <span className="font-medium">{formatCurrency(summary.totalInsurance)}원</span>
            </div>
            <div className="flex justify-between font-bold border-t border-emerald-200 pt-2 mt-2 text-emerald-900">
              <span>총 합계 :</span>
              <span>{formatCurrency(summary.grandTotal)}원</span>
            </div>
          </div>

          <div className="text-3xl font-black text-emerald-600 tracking-tight text-right mt-auto">
            {formatCurrency(summary.grandTotal)} <span className="text-xl font-bold text-emerald-500">원</span>
          </div>
        </div>
      </div>



      {/* Worker Management Modal */}
      {isWorkerModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">알바정보입력</h3>
              <button onClick={() => setIsWorkerModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 md:p-6 space-y-6">
              {/* Add New Worker Form */}
              {!isReadOnly && (
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4">
                  <h4 className="text-sm font-bold text-gray-700">새 알바생 등록</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">이름</label>
                      <input
                        type="text"
                        value={newWorkerName}
                        onChange={(e) => setNewWorkerName(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="이름"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">주민번호</label>
                      <input
                        type="text"
                        value={newWorkerResidentNumber}
                        onChange={(e) => {
                          let val = e.target.value.replace(/[^0-9]/g, '');
                          if (val.length > 6) {
                            val = `${val.slice(0, 6)}-${val.slice(6, 13)}`;
                          }
                          setNewWorkerResidentNumber(val);
                        }}
                        maxLength={14}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="900101-1234567"
                      />
                    </div>
                    <div className="sm:col-span-2 flex gap-3 items-end">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-600 mb-1">기본 시급</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={newWorkerWage === 0 ? '' : newWorkerWage.toLocaleString()}
                            onChange={(e) => {
                              const val = Number(e.target.value.replace(/,/g, ''));
                              if (!isNaN(val)) setNewWorkerWage(val);
                            }}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-right"
                            placeholder="0"
                          />
                          <span className="absolute right-3 top-2 text-gray-500 text-sm">원</span>
                        </div>
                      </div>
                      <button
                        onClick={handleAddWorker}
                        disabled={!newWorkerName.trim() || newWorkerWage <= 0}
                        className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        등록
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Worker List */}
              <div>
                <h4 className="text-sm font-bold text-gray-700 mb-3">등록된 알바생 목록</h4>
                {partTimeWorkers.length > 0 ? (
                  <div className="border border-gray-200 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 font-medium">이름</th>
                          <th className="px-3 py-2 font-medium">주민번호</th>
                          <th className="px-3 py-2 font-medium text-right">기본 시급</th>
                          <th className="px-3 py-2 font-medium text-center w-16">관리</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {partTimeWorkers.map(worker => (
                          <tr key={worker.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 font-medium text-gray-900">{worker.name}</td>
                            <td className="px-3 py-2 text-gray-500">{worker.residentNumber || '-'}</td>
                            <td className="px-3 py-2 text-right text-gray-700">{worker.defaultHourlyWage.toLocaleString()}원</td>
                            {!isReadOnly && (
                              <td className="px-3 py-2 text-center">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteWorker(worker.id);
                                  }}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors flex items-center justify-center mx-auto cursor-pointer"
                                  title="삭제"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4 border border-gray-200 rounded-lg border-dashed">
                    등록된 알바생이 없습니다.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dispatch Worker Management Modal */}
      {isDispatchWorkerModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">파출정보입력</h3>
              <button onClick={() => setIsDispatchWorkerModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 md:p-6 space-y-6">
              {/* Add New Worker Form */}
              {!isReadOnly && (
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4">
                  <h4 className="text-sm font-bold text-gray-700">새 파출 등록</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">이름</label>
                      <input
                        type="text"
                        value={newDispatchWorkerName}
                        onChange={(e) => setNewDispatchWorkerName(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="이름"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">주민번호</label>
                      <input
                        type="text"
                        value={newDispatchWorkerResidentNumber}
                        onChange={(e) => {
                          let val = e.target.value.replace(/[^0-9]/g, '');
                          if (val.length > 6) {
                            val = `${val.slice(0, 6)}-${val.slice(6, 13)}`;
                          }
                          setNewDispatchWorkerResidentNumber(val);
                        }}
                        maxLength={14}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="900101-1234567"
                      />
                    </div>
                    <div className="sm:col-span-2 flex justify-end mt-2">
                      <button
                        onClick={handleAddDispatchWorker}
                        disabled={!newDispatchWorkerName.trim()}
                        className="px-6 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        등록
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Worker List */}
              <div>
                <h4 className="text-sm font-bold text-gray-700 mb-3">등록된 파출 목록</h4>
                {dispatchWorkers.length > 0 ? (
                  <div className="border border-gray-200 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 font-medium">이름</th>
                          <th className="px-3 py-2 font-medium">주민번호</th>
                          <th className="px-3 py-2 font-medium text-center w-16">관리</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {dispatchWorkers.map(worker => (
                          <tr key={worker.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 font-medium text-gray-900">{worker.name}</td>
                            <td className="px-3 py-2 text-gray-500">{worker.residentNumber || '-'}</td>
                            {!isReadOnly && (
                              <td className="px-3 py-2 text-center">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteDispatchWorker(worker.id);
                                  }}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors flex items-center justify-center mx-auto cursor-pointer"
                                  title="삭제"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4 border border-gray-200 rounded-lg border-dashed">
                    등록된 파출이 없습니다.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">삭제 확인</h3>
              <p className="text-gray-600 mb-6">{confirmModal.message}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                >
                  취소
                </button>
                <button
                  onClick={confirmModal.onConfirm}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium"
                >
                  삭제하기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
