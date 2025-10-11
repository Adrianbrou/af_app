export function Card({ children, className = "" }) {
    return <div className={`rounded-xl p-4 ${className}`}>{children}</div>;
}

export function CardHeader({ children, className = "" }) {
    return <div className={`mb-2 ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = "" }) {
    return <h2 className={`text-lg font-bold mb-1 ${className}`}>{children}</h2>;
}

export function CardContent({ children, className = "" }) {
    return <div className={className}>{children}</div>;
}
