export interface DailyData {
  day: number;
  sales: number;
}

export interface ExpenseItem {
  name: string;
  amount: number;
  ratio: number;
}

export interface LedgerRow {
  id: string;
  category: string;
  total: number;
  ratio: number;
  remarks?: string;
  daily: (number | null)[];
  isHeader?: boolean;
  isSubtotal?: boolean;
  level: number;
}

export const PL_DATA = {
  title: "뼈반집 손익계산서",
  period: "2026.03.01 - 2026.03.31",
  summary: {
    totalSales: 0,
    cogs: 0,
    grossProfit: 0,
    labor: 0,
    rent: 0,
    fixedCosts: 0,
    variableCosts: 0,
    operatingProfit: 0,
    taxes: 0,
    netProfit: 0,
  },
  dailySales: Array.from({ length: 31 }, (_, i) => ({ day: i + 1, sales: 0 })),
  expenses: [
    { 
      name: "매출원가", 
      amount: 0, 
      ratio: 0,
      details: [
        { name: "2-1. 원자재(육류)", amount: 0, ratio: 0 },
        { name: "2-2. 식자재&공산품", amount: 0, ratio: 0 },
        { name: "주류 원가", amount: 0, ratio: 0 },
        { name: "음료 원가", amount: 0, ratio: 0 },
      ]
    },
    { 
      name: "인건비", 
      amount: 0, 
      ratio: 0,
      details: [
        { name: "직원급여", amount: 0, ratio: 0 },
        { name: "알바급여", amount: 0, ratio: 0 },
        { name: "파출급여", amount: 0, ratio: 0 },
        { name: "4대보험", amount: 0, ratio: 0 },
      ]
    },
    { 
      name: "변동비", 
      amount: 0, 
      ratio: 0,
      details: [
        { name: "가스비", amount: 0, ratio: 0 },
        { name: "전기세", amount: 0, ratio: 0 },
        { name: "상하수도", amount: 0, ratio: 0 },
        { name: "기타 변동비", amount: 0, ratio: 0 },
      ]
    },
    { 
      name: "마케팅", 
      amount: 0, 
      ratio: 0,
      details: []
    },
    { 
      name: "카드수수료(1.9%)", 
      amount: 0, 
      ratio: 0,
      details: []
    },
    { 
      name: "고정비", 
      amount: 0, 
      ratio: 0,
      details: [
        { name: "임대료", amount: 0, ratio: 0 },
        { name: "보험료", amount: 0, ratio: 0 },
        { name: "보안(캡스)", amount: 0, ratio: 0 },
        { name: "통신비", amount: 0, ratio: 0 },
        { name: "수수료", amount: 0, ratio: 0 },
        { name: "정수기", amount: 0, ratio: 0 },
      ]
    },
    { 
      name: "세금 예수금", 
      amount: 0, 
      ratio: 0,
      details: [
        { name: "부가세 예수금", amount: 0, ratio: 0 },
        { name: "종소세 예수금", amount: 0, ratio: 0 },
      ]
    },
  ],
  vendors: {
    '매출': ['현금', '카드', '배달 정산 금액'],
    '매출원가': [],
    '인건비': ['직원급여', '알바급여', '파출급여', '4대보험'],
    '변동비': [],
    '마케팅': [],
    '카드수수료(1.9%)': [],
    '고정비': []
  }
};

export const DAILY_LEDGER_DATA: LedgerRow[] = [
  {
    id: '1',
    category: '1. 매출액',
    total: 0,
    ratio: 0,
    remarks: '',
    daily: Array(31).fill(0),
    isHeader: true,
    level: 0
  },
  {
    id: '1-sub-1',
    category: '배달 정산금액',
    total: 0,
    ratio: 0,
    remarks: '',
    daily: Array(31).fill(0),
    level: 1
  },
  {
    id: '1-1',
    category: '1-1. 현금',
    total: 0,
    ratio: 0,
    remarks: '',
    daily: Array(31).fill(0),
    level: 1
  },
  {
    id: '1-2',
    category: '1-2. 카드',
    total: 0,
    ratio: 0,
    remarks: '',
    daily: Array(31).fill(0),
    level: 1
  },
  {
    id: '2',
    category: '2. 매출원가',
    total: 0,
    ratio: 0,
    remarks: '',
    daily: Array(31).fill(0),
    isHeader: true,
    level: 0
  },
  {
    id: '2-1',
    category: '2-1. 원자재(육류)',
    total: 0,
    ratio: 0,
    remarks: '',
    daily: Array(31).fill(0),
    isSubtotal: true,
    level: 1
  },
  {
    id: '2-2',
    category: '2-2. 식자재&공산품',
    total: 0,
    ratio: 0,
    remarks: '',
    daily: Array(31).fill(0),
    isSubtotal: true,
    level: 1
  },
  {
    id: '2-3',
    category: '주류 원가',
    total: 0,
    ratio: 0,
    remarks: '',
    daily: Array(31).fill(0),
    isSubtotal: true,
    level: 1
  },
  {
    id: '2-4',
    category: '음료 원가',
    total: 0,
    ratio: 0,
    remarks: '',
    daily: Array(31).fill(0),
    isSubtotal: true,
    level: 1
  },
  {
    id: '3',
    category: '3. 매출이익',
    total: 0,
    ratio: 0,
    remarks: '',
    daily: Array(31).fill(0),
    isHeader: true,
    level: 0
  },
  {
    id: '4',
    category: '4. 인건비',
    total: 0,
    ratio: 0,
    remarks: '',
    daily: Array(31).fill(0),
    isHeader: true,
    level: 0
  },
  {
    id: '4-1',
    category: '직원급여',
    total: 0,
    ratio: 0,
    remarks: '',
    daily: Array(31).fill(0),
    level: 1
  },
  {
    id: '4-2',
    category: '알바급여',
    total: 0,
    ratio: 0,
    remarks: '',
    daily: Array(31).fill(0),
    level: 1
  },
  {
    id: '4-3',
    category: '파출급여',
    total: 0,
    ratio: 0,
    remarks: '',
    daily: Array(31).fill(0),
    level: 1
  },
  {
    id: '4-4',
    category: '4대보험',
    total: 0,
    ratio: 0,
    remarks: '',
    daily: Array(31).fill(0),
    level: 1
  },
  {
    id: '5',
    category: '5. 고정비',
    total: 0,
    ratio: 0,
    remarks: '',
    daily: Array(31).fill(0),
    isHeader: true,
    level: 0
  },
  {
    id: '6',
    category: '6. 변동비',
    total: 0,
    ratio: 0,
    remarks: '',
    daily: Array(31).fill(0),
    isHeader: true,
    level: 0
  },
  {
    id: '7',
    category: '7. 마케팅',
    total: 0,
    ratio: 0,
    remarks: '',
    daily: Array(31).fill(0),
    level: 0
  },
  {
    id: '8',
    category: '8. 영업이익',
    total: 0,
    ratio: 0,
    remarks: '',
    daily: Array(31).fill(0),
    isHeader: true,
    level: 0
  },
  {
    id: '9',
    category: '9. 카드수수료(1.9%)',
    total: 0,
    ratio: 0,
    remarks: '',
    daily: Array(31).fill(0),
    isHeader: true,
    level: 0
  },
  {
    id: '10',
    category: '10. 세금 예수금',
    total: 0,
    ratio: 0,
    remarks: '',
    daily: Array(31).fill(0),
    isHeader: true,
    level: 0
  },
  {
    id: '10-1',
    category: '부가세 예수금',
    total: 0,
    ratio: 0,
    remarks: '',
    daily: Array(31).fill(0),
    isSubtotal: true,
    level: 1
  },
  {
    id: '10-2',
    category: '종소세 예수금',
    total: 0,
    ratio: 0,
    remarks: '',
    daily: Array(31).fill(0),
    isSubtotal: true,
    level: 1
  },
  {
    id: '11',
    category: '11. 점포 순이익',
    total: 0,
    ratio: 0,
    remarks: '',
    daily: Array(31).fill(0),
    isHeader: true,
    level: 0
  }
];

export const KPI_DATA = {
  summary: [
    { category: '1. 점포 순이익', targetAmount: 0, targetRatio: 18.0, actualAmount: 0, actualRatio: 0, diff: 0 },
    { category: '2. 총 매출액', targetAmount: 0, targetRatio: 100, actualAmount: 0, actualRatio: 0, diff: 0 },
    { category: '3. 매출원가', targetAmount: 0, targetRatio: 32.0, actualAmount: 0, actualRatio: 0, diff: 0 },
    { category: '4. 인건비', targetAmount: 0, targetRatio: 25.0, actualAmount: 0, actualRatio: 0, diff: 0 },
    { category: '5. 관리비', targetAmount: 0, targetRatio: 18.0, actualAmount: 0, actualRatio: 0, diff: 0 },
    { category: '6. 세금 예수금', targetAmount: 0, targetRatio: 7.0, actualAmount: 0, actualRatio: 0, diff: 0 },
    { category: '비용 합계', targetAmount: 0, targetRatio: 82.0, actualAmount: 0, actualRatio: 0, diff: 0 },
  ],
  details: [
    { item: "[육류 및 육수 재료]", targetAmount: 0, targetRatio: 19.5, actualAmount: 0, actualRatio: 0, diff: 0 },
    { item: "[식자재&공산품 소계]", targetAmount: 0, targetRatio: 9.5, actualAmount: 0, actualRatio: 0, diff: 0 },
    { item: "주류 & 음료", targetAmount: 0, targetRatio: 3.0, actualAmount: 0, actualRatio: 0, diff: 0 },
    { item: "직원급여", targetAmount: 0, targetRatio: 15.0, actualAmount: 0, actualRatio: 0, diff: 0 },
    { item: "알바급여", targetAmount: 0, targetRatio: 5.0, actualAmount: 0, actualRatio: 0, diff: 0 },
    { item: "파출급여", targetAmount: 0, targetRatio: 5.0, actualAmount: 0, actualRatio: 0, diff: 0 },
    { item: "4대보험", targetAmount: 0, targetRatio: 3.0, actualAmount: 0, actualRatio: 0, diff: 0 },
    { item: "임대료", targetAmount: 0, targetRatio: 6.0, actualAmount: 0, actualRatio: 0, diff: 0 },
    { item: "고정비", targetAmount: 0, targetRatio: 0.9, actualAmount: 0, actualRatio: 0, diff: 0 },
    { item: "변동비", targetAmount: 0, targetRatio: 8.0, actualAmount: 0, actualRatio: 0, diff: 0 },
    { item: "마케팅비", targetAmount: 0, targetRatio: 3.1, actualAmount: 0, actualRatio: 0, diff: 0 },
  ]
};

export interface CashBalanceRow {
  day: string;
  weekday: string;
  prevBalance: number;
  income: number;
  transferOut: number;
  otherExpense: number;
  details: string;
  balance: number;
  remarks: string;
  isVerified?: boolean;
  author?: string;
}

export const CASH_BALANCE_DATA = {
  title: "▣ 현금 시재 현황 : 입금/지출 내역표",
  carryover: 0,
  isCarryoverFixed: false,
  rows: [
    { day: "1일", weekday: "목", prevBalance: 0, income: 0, transferOut: 0, otherExpense: 0, details: "", balance: 0, remarks: "" },
    { day: "2일", weekday: "월", prevBalance: 0, income: 0, transferOut: 0, otherExpense: 0, details: "", balance: 0, remarks: "" },
    { day: "3일", weekday: "화", prevBalance: 0, income: 0, transferOut: 0, otherExpense: 0, details: "", balance: 0, remarks: "" },
    { day: "4일", weekday: "수", prevBalance: 0, income: 0, transferOut: 0, otherExpense: 0, details: "", balance: 0, remarks: "" },
    { day: "5일", weekday: "목", prevBalance: 0, income: 0, transferOut: 0, otherExpense: 0, details: "", balance: 0, remarks: "" },
    { day: "6일", weekday: "금", prevBalance: 0, income: 0, transferOut: 0, otherExpense: 0, details: "", balance: 0, remarks: "" },
    { day: "7일", weekday: "토", prevBalance: 0, income: 0, transferOut: 0, otherExpense: 0, details: "", balance: 0, remarks: "" },
    { day: "8일", weekday: "일", prevBalance: 0, income: 0, transferOut: 0, otherExpense: 0, details: "", balance: 0, remarks: "" },
    { day: "9일", weekday: "월", prevBalance: 0, income: 0, transferOut: 0, otherExpense: 0, details: "", balance: 0, remarks: "" },
    { day: "10일", weekday: "화", prevBalance: 0, income: 0, transferOut: 0, otherExpense: 0, details: "", balance: 0, remarks: "" },
    { day: "11일", weekday: "수", prevBalance: 0, income: 0, transferOut: 0, otherExpense: 0, details: "", balance: 0, remarks: "" },
    { day: "12일", weekday: "목", prevBalance: 0, income: 0, transferOut: 0, otherExpense: 0, details: "", balance: 0, remarks: "" },
    { day: "13일", weekday: "금", prevBalance: 0, income: 0, transferOut: 0, otherExpense: 0, details: "", balance: 0, remarks: "" },
    { day: "14일", weekday: "토", prevBalance: 0, income: 0, transferOut: 0, otherExpense: 0, details: "", balance: 0, remarks: "" },
    { day: "15일", weekday: "일", prevBalance: 0, income: 0, transferOut: 0, otherExpense: 0, details: "", balance: 0, remarks: "" },
    { day: "16일", weekday: "월", prevBalance: 0, income: 0, transferOut: 0, otherExpense: 0, details: "", balance: 0, remarks: "" },
    { day: "17일", weekday: "화", prevBalance: 0, income: 0, transferOut: 0, otherExpense: 0, details: "", balance: 0, remarks: "" },
    { day: "18일", weekday: "수", prevBalance: 0, income: 0, transferOut: 0, otherExpense: 0, details: "", balance: 0, remarks: "" },
    { day: "19일", weekday: "목", prevBalance: 0, income: 0, transferOut: 0, otherExpense: 0, details: "", balance: 0, remarks: "" },
    { day: "20일", weekday: "금", prevBalance: 0, income: 0, transferOut: 0, otherExpense: 0, details: "", balance: 0, remarks: "" },
    { day: "21일", weekday: "토", prevBalance: 0, income: 0, transferOut: 0, otherExpense: 0, details: "", balance: 0, remarks: "" },
    { day: "22일", weekday: "일", prevBalance: 0, income: 0, transferOut: 0, otherExpense: 0, details: "", balance: 0, remarks: "" },
    { day: "23일", weekday: "월", prevBalance: 0, income: 0, transferOut: 0, otherExpense: 0, details: "", balance: 0, remarks: "" },
    { day: "24일", weekday: "화", prevBalance: 0, income: 0, transferOut: 0, otherExpense: 0, details: "", balance: 0, remarks: "" },
    { day: "25일", weekday: "수", prevBalance: 0, income: 0, transferOut: 0, otherExpense: 0, details: "", balance: 0, remarks: "" },
    { day: "26일", weekday: "목", prevBalance: 0, income: 0, transferOut: 0, otherExpense: 0, details: "", balance: 0, remarks: "" },
    { day: "27일", weekday: "금", prevBalance: 0, income: 0, transferOut: 0, otherExpense: 0, details: "", balance: 0, remarks: "" },
    { day: "28일", weekday: "토", prevBalance: 0, income: 0, transferOut: 0, otherExpense: 0, details: "", balance: 0, remarks: "" },
    { day: "29일", weekday: "일", prevBalance: 0, income: 0, transferOut: 0, otherExpense: 0, details: "", balance: 0, remarks: "" },
    { day: "30일", weekday: "월", prevBalance: 0, income: 0, transferOut: 0, otherExpense: 0, details: "", balance: 0, remarks: "" },
    { day: "31일", weekday: "", prevBalance: 0, income: 0, transferOut: 0, otherExpense: 0, details: "", balance: 0, remarks: "" },
  ],
  totalIncome: 0,
  totalExpense: 0,
  netChange: 0,
  finalBalance: 0
};
