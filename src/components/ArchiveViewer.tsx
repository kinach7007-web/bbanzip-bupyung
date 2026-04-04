import React from 'react';
import { Archive, Calendar, ArrowRight, TrendingUp, DollarSign, Download } from 'lucide-react';
import { formatCurrency } from '../App';

interface MonthlyArchive {
  id: string;
  month: string; // e.g., "2026.03"
  summary: {
    totalSales: number;
    netProfit: number;
    operatingProfit: number;
    cogs: number;
    labor: number;
  };
  timestamp: string;
}

interface ArchiveViewerProps {
  archives: MonthlyArchive[];
  onSelectArchive: (archive: MonthlyArchive) => void;
  onDownloadExcel: (archive: MonthlyArchive) => void;
}

export function ArchiveViewer({ archives, onSelectArchive, onDownloadExcel }: ArchiveViewerProps) {
  if (archives.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
        <div className="w-16 h-16 bg-gray-50 text-gray-300 rounded-2xl flex items-center justify-center mb-4">
          <Archive className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">아직 마감된 기록이 없습니다</h3>
        <p className="text-sm text-gray-500 mt-1">한 달 정산이 완료된 후 '월 마감하기'를 눌러보세요.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
            <Archive className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">과거 기록 보관함</h2>
            <p className="text-sm text-gray-500">마감된 월별 손익 데이터</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {archives.map((archive) => (
          <div 
            key={archive.id}
            className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all group cursor-pointer"
            onClick={() => onSelectArchive(archive)}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-lg text-xs font-bold text-gray-500">
                <Calendar className="w-3 h-3" />
                {archive.month}
              </div>
              <div className="w-8 h-8 bg-gray-50 text-gray-400 rounded-lg flex items-center justify-center group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">총 매출액</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(archive.summary.totalSales)}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">순이익</p>
                  <p className={cn(
                    "text-sm font-bold",
                    archive.summary.netProfit >= 0 ? "text-emerald-600" : "text-rose-600"
                  )}>
                    {formatCurrency(archive.summary.netProfit)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">영업이익</p>
                  <p className="text-sm font-bold text-gray-700">
                    {formatCurrency(archive.summary.operatingProfit)}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between">
              <span className="text-[10px] text-gray-400">마감일: {new Date(archive.timestamp).toLocaleDateString()}</span>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onDownloadExcel(archive);
                }}
                className="p-2 hover:bg-gray-50 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
                title="엑셀 다운로드"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
