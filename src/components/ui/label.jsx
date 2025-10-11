export function Label({ children, className = "", ...props }) {
    return (
        <label
            className={`block text-sm font-medium text-neutral-300 mb-1 ${className}`}
            {...props}
        >
            {children}
        </label>
    );
}
