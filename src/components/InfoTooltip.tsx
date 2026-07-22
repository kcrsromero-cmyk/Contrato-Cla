import React, { useState, useRef } from 'react';
import { Info, HelpCircle } from 'lucide-react';

interface InfoTooltipProps {
  content: string;
  calculation?: string;
  icon?: 'info' | 'help';
  position?: 'top' | 'bottom' | 'auto';
  className?: string;
}

export function InfoTooltip({ 
  content, 
  calculation, 
  icon = 'info', 
  position = 'auto', 
  className = '' 
}: InfoTooltipProps) {
  const [show, setShow] = useState(false);
  const [placement, setPlacement] = useState<'top' | 'bottom'>('top');
  const [horizontalAlign, setHorizontalAlign] = useState<'center' | 'left' | 'right'>('center');
  const triggerRef = useRef<HTMLSpanElement>(null);

  const handleOpen = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;

      // Vertical placement determination
      if (position === 'bottom') {
        setPlacement('bottom');
      } else if (position === 'top') {
        setPlacement('top');
      } else {
        // If the icon is within 180px from top of viewport, position tooltip BELOW
        if (rect.top < 180) {
          setPlacement('bottom');
        } else {
          setPlacement('top');
        }
      }

      // Horizontal alignment determination
      if (rect.left < 140) {
        setHorizontalAlign('left');
      } else if (viewportWidth - rect.right < 140) {
        setHorizontalAlign('right');
      } else {
        setHorizontalAlign('center');
      }
    }
    setShow(true);
  };

  const handleClose = () => {
    setShow(false);
  };

  const IconComponent = icon === 'help' ? HelpCircle : Info;

  // Horizontal position classes for tooltip box
  let alignClasses = 'left-1/2 -translate-x-1/2';
  let arrowAlignClasses = 'left-1/2 -translate-x-1/2';

  if (horizontalAlign === 'left') {
    alignClasses = 'left-0 translate-x-0';
    arrowAlignClasses = 'left-3';
  } else if (horizontalAlign === 'right') {
    alignClasses = 'right-0 left-auto translate-x-0';
    arrowAlignClasses = 'right-3';
  }

  return (
    <span 
      ref={triggerRef}
      onMouseEnter={handleOpen}
      onMouseLeave={handleClose}
      onFocus={handleOpen}
      onBlur={handleClose}
      className={`relative inline-flex items-center ml-1.5 align-middle cursor-help text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors z-30 ${className}`}
      aria-label="Información descriptiva sobre este indicador"
    >
      <IconComponent className="w-3.5 h-3.5 shrink-0" />
      {show && (
        <span 
          className={`absolute ${alignClasses} w-64 p-3 bg-slate-950 dark:bg-slate-900 text-white dark:text-slate-100 text-[11px] leading-relaxed rounded-xl shadow-2xl border border-slate-800 dark:border-slate-750 pointer-events-none text-left font-normal normal-case whitespace-normal z-50 transition-all ${
            placement === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2'
          }`}
        >
          <span className="block font-sans text-slate-200 dark:text-slate-200 font-medium">
            {content}
          </span>
          {calculation && (
            <span className="block mt-1.5 pt-1.5 border-t border-slate-800 dark:border-slate-800 text-[10px] font-mono text-indigo-300 dark:text-indigo-300">
              <strong className="text-indigo-200 font-semibold">¿Cómo se calcula?</strong> {calculation}
            </span>
          )}
          {placement === 'bottom' ? (
            <span className={`absolute bottom-full ${arrowAlignClasses} border-4 border-transparent border-b-slate-950 dark:border-b-slate-900`}></span>
          ) : (
            <span className={`absolute top-full ${arrowAlignClasses} border-4 border-transparent border-t-slate-950 dark:border-t-slate-900`}></span>
          )}
        </span>
      )}
    </span>
  );
}

export default InfoTooltip;
