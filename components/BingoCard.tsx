import React from 'react';
import { BingoCardState, BingoCell } from '../types';
import { Check, Star } from 'lucide-react';

interface BingoCardProps {
  card: BingoCardState;
  onCellClick: (cell: BingoCell) => void;
  lastCalledNumber: number | null;
  disabled: boolean;
}

const BingoCard: React.FC<BingoCardProps> = ({ card, onCellClick, lastCalledNumber, disabled }) => {
  return (
    <div className="bg-white p-2 rounded-xl shadow-2xl border-4 border-indigo-600 max-w-md mx-auto aspect-square flex flex-col">
      <div className="grid grid-cols-5 mb-2">
        {['B', 'I', 'N', 'G', 'O'].map((letter, i) => (
          <div key={i} className="text-center font-black text-2xl md:text-4xl text-indigo-900 drop-shadow-sm">
            {letter}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-5 gap-1 md:gap-2 flex-grow">
        {card.flat().map((cell, idx) => {
          const isFree = cell.value === 'FREE';
          const isDaubed = cell.daubed;
          const isLastCalled = typeof cell.value === 'number' && cell.value === lastCalledNumber;

          return (
            <button
              key={`${cell.colIndex}-${cell.rowIndex}`}
              disabled={disabled && !isFree}
              onClick={() => onCellClick(cell)}
              className={`
                relative flex items-center justify-center rounded-lg text-lg md:text-2xl font-bold transition-all duration-200
                aspect-square shadow-inner border-2
                ${isFree 
                  ? 'bg-yellow-400 border-yellow-500 text-yellow-900' 
                  : isDaubed
                    ? 'bg-red-500 border-red-600 text-white scale-95'
                    : 'bg-indigo-50 border-indigo-100 text-indigo-800 hover:bg-indigo-100'
                }
                ${isLastCalled && !isDaubed ? 'ring-4 ring-yellow-400 ring-opacity-70 animate-pulse' : ''}
              `}
            >
              {isFree ? (
                <Star className="w-8 h-8 fill-yellow-100 text-yellow-800" />
              ) : (
                <>
                  {cell.value}
                  {isDaubed && (
                    <div className="absolute inset-0 flex items-center justify-center">
                       <div className="w-8 h-8 md:w-12 md:h-12 rounded-full bg-red-600 opacity-80 animate-pop"></div>
                       <Check className="absolute w-6 h-6 md:w-8 md:h-8 text-white animate-pop" strokeWidth={4} />
                    </div>
                  )}
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BingoCard;
