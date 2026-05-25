"use client";

function toDisplay(iso?: string) {
  if (!iso) return "";
  const p = iso.split("-");
  if (p.length === 3 && p[0].length === 4) return `${p[2]}-${p[1]}-${p[0]}`;
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

/**
 * Displays a date as DD-MM-YYYY while using the native browser date picker.
 * value / onChange use YYYY-MM-DD format (same as <input type="date">).
 */
export function DateInput({ value, onChange, className, wrapperClassName, required, id, placeholder = "DD-MM-YYYY" }: DateInputProps) {
  return (
    <div className={`relative${wrapperClassName ? ` ${wrapperClassName}` : ""}`}>
      <input
        type="text"
        readOnly
        value={toDisplay(value)}
        placeholder={placeholder}
        id={id}
        className={className}
      />
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        tabIndex={-1}
        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
      />
    </div>
  );
}
