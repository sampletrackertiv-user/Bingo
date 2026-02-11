import React from 'react';
import { BINGO_LETTERS } from '../constants';
import { Sparkles } from 'lucide-react';

interface NumberDisplayProps {
  currentNumber: number | null;
  phrase: string | null;
  previousNumbers: number[];
  language: 'vi' | 'en';
}

const getLetter = (num: number) => {
  if (num <= 15) return 'B';
  if (num <= 30) return 'I';
  if (num <= 45) return 'N';
  if (num <= 60) return 'G';
  return 'O';
};

const NumberDisplay: React.FC<NumberDisplayProps> = ({ currentNumber, phrase, previousNumbers, language }) => {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 mb-6">
      
      {/* Main Ball */}
      <div className="relative group perspective">
        <div className={`
          w-32 h-32 md:w-40 md:h-40 rounded-full flex items-center justify-center 
          bingo-ball active transition-all duration-500
          ${currentNumber ? 'scale-100 opacity-100' : 'scale-90 opacity-50'}
        `}>
          {currentNumber ? (
            <div className="text-center">
               <div className="text-xl font-bold text-gray-700 uppercase">{getLetter(currentNumber)}</div>
               <div className="text-6xl md:text-7xl font-black text-gray-900 leading-none">{currentNumber}</div>
            </div>
          ) : (
            <div className="text-4xl text-gray-400 font-bold">?</div>
          )}
        </div>
        
        {/* Confetti/Sparkles decorative elements */}
        {currentNumber && (
           <>
            <Sparkles className="absolute top-0 right-0 text-yellow-300 w-8 h-8 animate-bounce" />
            <Sparkles className="absolute bottom-2 left-2 text-yellow-300 w-6 h-6 animate-pulse" />
           </>
        )}
      </div>

      {/* AI Phrase / Description */}
      <div className="h-8 flex items-center justify-center">
        {phrase ? (
          <p className="text-yellow-400 font-medium italic text-lg text-center animate-pop px-4">
            "{phrase}"
          </p>
        ) : currentNumber ? (
           <p className="text-gray-500 text-sm animate-pulse">{language === 'vi' ? 'Đang tạo câu thoại...' : 'Generating phrase...'}</p>
        ) : null}
      </div>

      {/* Previous Numbers */}
      <div className="flex space-x-2 overflow-x-auto max-w-full p-2 bg-gray-800 rounded-full bg-opacity-50 backdrop-blur-sm">
        <span className="text-xs text-gray-400 self-center uppercase font-bold px-2 whitespace-nowrap">
           {language === 'vi' ? 'Đã gọi:' : 'History:'}
        </span>
        {previousNumbers.slice(0, 8).map((num, idx) => (
          <div key={idx} className="w-8 h-8 min-w-[2rem] rounded-full bg-gray-700 flex items-center justify-center text-sm font-bold border border-gray-600">
            {num}
          </div>
        ))}
      </div>
    </div>
  );
};

export default NumberDisplay;
