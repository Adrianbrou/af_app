export function Button({ children, onClick, className = "", ...props }) {
    return (
        <button
            onClick={onClick}
            className={`px-3 py-2 rounded-md font-medium ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}
