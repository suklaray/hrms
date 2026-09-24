import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Loader2 } from "lucide-react";

const statusOptions = [
    {
        value: "ACTIVE",
        label: "Active",
        dot: "bg-emerald-500",
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        border: "border-emerald-200",
    },
    {
        value: "DRAFT",
        label: "Draft",
        dot: "bg-amber-500",
        bg: "bg-amber-50",
        text: "text-amber-700",
        border: "border-amber-200",
    },
    {
        value: "CLOSED",
        label: "Closed",
        dot: "bg-slate-500",
        bg: "bg-slate-100",
        text: "text-slate-700",
        border: "border-slate-200",
    },
];

interface StatusSelectorProps {
    value?: string;
    onChange?: (value: string) => void;
    disabled?: boolean;
}

export default function StatusPill({
    value = "DRAFT",
    onChange,
    disabled = false,
}: StatusSelectorProps) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selected =
        statusOptions.find((status) => status.value === value) ||
        statusOptions[1];

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: any) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target)
            ) {
                setOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            document.removeEventListener(
                "mousedown",
                handleClickOutside
            );
        };
    }, []);

    return (
        <div
            ref={containerRef}
            className="relative inline-block"
        >
            {/* Status Pill */}
            <button
                type="button"
                disabled={disabled}
                onClick={() => {
                    if (!disabled) {
                        setOpen((prev) => !prev);
                    }
                }}
                className={`
                    inline-flex items-center gap-2
                    rounded-full border
                    px-3 py-1.5
                    text-xs font-semibold
                    transition-all duration-200
                    ${selected.bg}
                    ${selected.text}
                    ${selected.border}
                    ${disabled ? "opacity-60 cursor-not-allowed" : "hover:shadow-sm cursor-pointer"}
                `}
            >
                {/* Dot / Loader */}
                {disabled ? (
                    <Loader2 size={10} className="animate-spin" />
                ) : (
                    <span
                        className={`h-2 w-2 rounded-full ${selected.dot}`}
                    />
                )}

                <span>{selected.label}</span>

                <ChevronDown
                    size={13}
                    strokeWidth={2.5}
                    className={`
                        transition-transform duration-200
                        ${open ? "rotate-180" : ""}
                    `}
                />
            </button>

            {/* Dropdown */}
            {open && !disabled && (
                <div
                    className="
                        absolute left-0 top-full z-50 mt-2
                        min-w-[150px]
                        rounded-xl
                        border border-gray-200
                        bg-white
                        p-1.5
                        shadow-[0_10px_30px_rgba(0,0,0,0.10)]
                    "
                >
                    {statusOptions.map((status) => {
                        const isSelected = status.value === value;

                        return (
                            <button
                                key={status.value}
                                type="button"
                                onClick={() => {
                                    onChange?.(status.value);
                                    setOpen(false);
                                }}
                                className="
                                    flex w-full items-center
                                    justify-between
                                    rounded-lg
                                    px-3 py-2
                                    text-left
                                    transition-colors
                                    hover:bg-gray-50
                                "
                            >
                                <div className="flex items-center gap-2">
                                    <span
                                        className={`
                                            h-2 w-2 rounded-full
                                            ${status.dot}
                                        `}
                                    />

                                    <span
                                        className={`
                                            text-xs font-medium
                                            ${status.text}
                                        `}
                                    >
                                        {status.label}
                                    </span>
                                </div>

                                {isSelected && (
                                    <Check
                                        size={14}
                                        className="text-gray-500"
                                        strokeWidth={2.5}
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}