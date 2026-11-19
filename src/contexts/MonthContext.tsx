'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface MonthContextType {
  year: number;
  month: number; // 1 to 12
  formattedMonth: string;
  isCurrentMonth: boolean;
  goToNextMonth: () => void;
  goToPrevMonth: () => void;
  goToCurrentMonth: () => void;
  setMonthYear: (year: number, month: number) => void;
}

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const MonthContext = createContext<MonthContextType | undefined>(undefined);

export function MonthProvider({ children }: { children: ReactNode }) {
  const [year, setYear] = useState<number>(() => new Date().getFullYear());
  const [month, setMonth] = useState<number>(() => new Date().getMonth() + 1);

  const today = new Date();
  const isCurrentMonth =
    year === today.getFullYear() && month === (today.getMonth() + 1);

  const formattedMonth = `${MONTH_NAMES[month - 1]} de ${year}`;

  const goToNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear((prev) => prev + 1);
    } else {
      setMonth((prev) => prev + 1);
    }
  };

  const goToPrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear((prev) => prev - 1);
    } else {
      setMonth((prev) => prev - 1);
    }
  };

  const goToCurrentMonth = () => {
    const current = new Date();
    setYear(current.getFullYear());
    setMonth(current.getMonth() + 1);
  };

  const setMonthYear = (newYear: number, newMonth: number) => {
    setYear(newYear);
    setMonth(Math.max(1, Math.min(12, newMonth)));
  };

  return (
    <MonthContext.Provider
      value={{
        year,
        month,
        formattedMonth,
        isCurrentMonth,
        goToNextMonth,
        goToPrevMonth,
        goToCurrentMonth,
        setMonthYear,
      }}
    >
      {children}
    </MonthContext.Provider>
  );
}

export function useMonth(): MonthContextType {
  const context = useContext(MonthContext);
  if (!context) {
    throw new Error('useMonth must be used within a MonthProvider');
  }
  return context;
}
