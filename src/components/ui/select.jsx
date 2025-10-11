import React, { useState } from "react";

export function Select({ value, onValueChange, children }) {
    const [open, setOpen] = useState(false);

    return (
        <div className="relative">
            {React.Children.map(children, (child) => {
                if (child.type.name === "SelectTrigger") {
                    return React.cloneElement(child, { onClick: () => setOpen(!open) });
                } else if (child.type.name === "SelectContent") {
                    return open
                        ? React.cloneElement(child, { onValueChange, setOpen })
                        : null;
                }
                return null;
            })}
        </div>
    );
}

export function SelectTrigger({ children, onClick, className = "" }) {
    return (
        <div
            className={`border border-neutral-700 bg-neutral-800 rounded-md px-3 py-2 cursor-pointer ${className}`}
            onClick={onClick}
        >
            {children}
        </div>
    );
}

export function SelectValue({ placeholder }) {
    return <span className="text-neutral-200">{placeholder}</span>;
}

export function SelectContent({ children, onValueChange, setOpen }) {
    return (
        <div className="absolute z-10 mt-1 w-full rounded-md border border-neutral-700 bg-neutral-900">
            {React.Children.map(children, (child) =>
                React.cloneElement(child, {
                    onSelect: (v) => {
                        onValueChange(v);
                        setOpen(false);
                    },
                })
            )}
        </div>
    );
}

export function SelectItem({ value, children, onSelect }) {
    return (
        <div
            className="px-3 py-2 hover:bg-red-600 hover:text-white cursor-pointer"
            onClick={() => onSelect(value)}
        >
            {children}
        </div>
    );
}
