import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

// Stable type markers — survive minification (unlike .name which gets mangled)
const TRIGGER = "SelectTrigger";
const VALUE = "SelectValue";
const CONTENT = "SelectContent";
const ITEM = "SelectItem";

export function Select({ value, onValueChange, children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Find the label for the current value by scanning SelectContent's children
  let selectedLabel = null;
  React.Children.forEach(children, (child) => {
    if (!child || child.type?.__selectType !== CONTENT) return;
    React.Children.forEach(child.props.children, (item) => {
      if (item?.props?.value === value) selectedLabel = item.props.children;
    });
  });

  return (
    <div className="relative" ref={ref}>
      {React.Children.map(children, (child) => {
        if (!child) return null;
        if (child.type?.__selectType === TRIGGER) {
          return React.cloneElement(child, { onClick: () => setOpen((v) => !v), selectedLabel, open });
        }
        if (child.type?.__selectType === CONTENT) {
          return open ? React.cloneElement(child, { onValueChange, setOpen }) : null;
        }
        return null;
      })}
    </div>
  );
}

export function SelectTrigger({ children, onClick, className = "", selectedLabel, open }) {
  return (
    <div
      className={`border border-neutral-700 bg-neutral-800 rounded-md px-3 py-2.5 cursor-pointer flex items-center justify-between gap-2 min-h-[42px] ${className}`}
      onClick={onClick}
    >
      <span className="flex-1 truncate">
        {React.Children.map(children, (child) =>
          child?.type?.__selectType === VALUE
            ? React.cloneElement(child, { selectedLabel })
            : child
        )}
      </span>
      <ChevronDown className={`h-4 w-4 text-neutral-400 shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
    </div>
  );
}
SelectTrigger.__selectType = TRIGGER;

export function SelectValue({ placeholder, selectedLabel }) {
  return (
    <span className={selectedLabel ? "text-neutral-100" : "text-neutral-500 text-sm"}>
      {selectedLabel ?? placeholder ?? "Select…"}
    </span>
  );
}
SelectValue.__selectType = VALUE;

export function SelectContent({ children, onValueChange, setOpen }) {
  return (
    <div className="absolute z-50 mt-1 w-full rounded-md border border-neutral-700 bg-neutral-900 shadow-2xl max-h-60 overflow-y-auto">
      {React.Children.map(children, (child) =>
        child
          ? React.cloneElement(child, {
              onSelect: (v) => { onValueChange(v); setOpen(false); },
            })
          : null
      )}
    </div>
  );
}
SelectContent.__selectType = CONTENT;

export function SelectItem({ value, children, onSelect }) {
  return (
    <div
      className="px-3 py-2.5 hover:bg-red-600 hover:text-white cursor-pointer text-neutral-200 text-sm"
      onClick={() => onSelect(value)}
    >
      {children}
    </div>
  );
}
SelectItem.__selectType = ITEM;
