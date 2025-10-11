export function Textarea({ className = "", ...props }) {
    return (
        <textarea
            className={`w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-600 ${className}`}
            {...props}
        />
    );
}
