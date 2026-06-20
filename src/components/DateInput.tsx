
"use client";

import { Calendar } from "lucide-react";
import { useRef } from "react";

function toDisplay(iso?: string) {
  if (!iso) return "";
  const p = iso.split("-");
  if (p.length === 3 && p[0].length === 4) {
    return `${p[2]}-${p[1]}-${p[0]}`;
  }
  return iso;
}

interface DateInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  wrapperClassName?: string;
  required?: boolean;
  id?: string;
  placeholder?: string;
}

export function DateInput({
  value,
  onChange,
  className,
  wrapperClassName,
  required,
  id,
  placeholder = "DD-MM-YYYY",
}: DateInputProps) {
  const dateRef = useRef<HTMLInputElement>(null);

  const openPicker = () => {
    dateRef.current?.showPicker?.();
  };

  return (
    <div
      className={`relative ${wrapperClassName || ""}`}
      onClick={openPicker}
      style={{ cursor: "pointer" }}
    >
      {/* Visible display input */}
      <input
        type="text"
        readOnly
        tabIndex={-1}
        value={toDisplay(value)}
        placeholder={placeholder}
        id={id}
        className={className}
        style={{ paddingRight: "2rem", cursor: "pointer", pointerEvents: "none" }}
      />

      {/* Calendar icon */}
      <Calendar className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />

      {/* Native date input — opacity-0 but still receives focus/change events */}
      <input
        ref={dateRef}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        tabIndex={-1}
        className="absolute inset-0 opacity-0 w-full h-full"
        style={{ pointerEvents: "none" }}
      />
    </div>
  );
}
