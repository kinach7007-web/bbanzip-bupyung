export interface Employee {
  id: string;
  name: string;
  position: string;
  monthlySalary: number;
  dailyWage: number;
  totalWorkDays: number;
  isAutoWorkDays: boolean;
  totalSalary: number;
  note: string;
}

export interface DispatchRecord {
  name: string;
  residentNumber?: string;
  amount: number;
  author?: string;
}

export interface PartTimeRecord {
  name: string;
  residentNumber?: string;
  hourlyWage: number;
  workHours: number;
  amount: number;
  author?: string;
}

export interface PartTimeWorker {
  id: string;
  name: string;
  residentNumber: string;
  defaultHourlyWage: number;
}

export interface DispatchWorker {
  id: string;
  name: string;
  residentNumber: string;
}

export interface SalaryState {
  employees: Employee[];
  partTimeWorkers: PartTimeWorker[];
  partTimeDays: PartTimeRecord[][];
  dispatchDays: DispatchRecord[][];
  dispatchWorkers: DispatchWorker[];
  nationalHealth: number;
  nationalPension: number;
  employmentInsurance: number;
  industrialAccidentInsurance: number;
}

export interface MonthlyArchive {
  id: string;
  month: string;
  summary: {
    totalSales: number;
    netProfit: number;
    operatingProfit: number;
    cogs: number;
    labor: number;
    rent: number;
    fixedCosts: number;
    variableCosts: number;
    marketingCosts: number;
    taxes: number;
    cardFees: number;
  };
  timestamp: string;
  data: {
    transactions: any[];
    cashBalanceData: any;
    salaryState: SalaryState;
  };
}
