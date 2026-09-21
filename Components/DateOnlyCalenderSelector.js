import { useState, useRef, useEffect } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";

const days = Array.from({ length: 31 }, (_, i) => i + 1);

export default function OnlyPaymentDayPicker({
    name,
    field,
    value,
    formData,
    onChange,
    form,
    setForm,
    headerText = "Select Day",
    footerText = "Select the day of every month",
    placeholder,
}) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef(null);

    // Resolve current selected value dynamically
    const targetField = name || field;
    const selectedDay =
        value !== undefined
            ? value
            : formData !== undefined
                ? formData
                : form && targetField
                    ? form[targetField]
                    : "";

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const inferField = () => {
        if (targetField) return targetField;
        if (headerText) {
            const lower = headerText.toLowerCase();
            if (lower.includes("effective")) return "payroll_effective_date";
            if (lower.includes("payment")) return "salary_payment_date";
        }
        return null;
    };

    const handleSelectDay = (day) => {
        const dayNumber = Number(day);

        if (typeof onChange === "function") {
            onChange(dayNumber);
        }

        if (typeof setForm === "function") {
            const keyToUpdate = inferField();
            if (keyToUpdate) {
                setForm((prev) => ({
                    ...prev,
                    [keyToUpdate]: dayNumber,
                }));
            }
        }

        setOpen(false);
    };

    const placeholderText =
        placeholder || (headerText ? `Select ${headerText.toLowerCase()}` : "Select day");

    return (
        <div className="relative" ref={containerRef}>
            {/* Selector */}
            <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                className="
                    w-full flex items-center justify-between
                    rounded-xl border border-gray-200
                    bg-white px-4 py-2
                    text-sm
                    shadow-sm
                    transition-all duration-200
                    hover:border-indigo-300
                    hover:shadow-md
                    focus:outline-none
                    focus:ring-4 focus:ring-indigo-100
                    cursor-pointer
                "
            >
                <div className="flex items-center gap-3 truncate">
                    <CalendarDays className="w-5 h-5 text-indigo-500 flex-shrink-0" />

                    <span
                        className={`truncate ${selectedDay
                            ? "text-gray-800 font-medium"
                            : "text-gray-400"
                            }`}
                    >
                        {selectedDay
                            ? `Every month on the ${selectedDay}${getOrdinalSuffix(
                                selectedDay
                            )}`
                            : placeholderText}
                    </span>
                </div>

                <ChevronDown
                    className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""
                        }`}
                />
            </button>

            {/* Calendar */}
            <div
                className={`
                    absolute z-50 mt-2 w-full
                    rounded-2xl border border-gray-200
                    bg-white p-4
                    shadow-xl
                    origin-top
                    transition-all duration-200 ease-out
                    ${open
                        ? "opacity-100 scale-100 translate-y-0"
                        : "pointer-events-none opacity-0 scale-95 -translate-y-2"
                    }
                `}
            >
                {/* Header */}
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-semibold text-gray-800">
                            {headerText}
                        </p>
                        <p className="text-xs text-gray-400">
                            Select the day of every month
                        </p>
                    </div>

                    <CalendarDays className="w-5 h-5 text-indigo-500" />
                </div>

                {/* Days */}
                <div className="grid grid-cols-7 gap-1">
                    {days.map((day) => {
                        const isSelected = String(selectedDay) === String(day);

                        return (
                            <button
                                key={day}
                                type="button"
                                onClick={() => handleSelectDay(day)}
                                className={`
                                    aspect-square
                                    rounded-lg
                                    text-sm
                                    font-medium
                                    cursor-pointer
                                    transition-all duration-150
                                    ${isSelected
                                        ? "bg-indigo-600 text-white shadow-md scale-105 font-bold"
                                        : "text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 hover:scale-105"
                                    }
                                `}
                            >
                                {day}
                            </button>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="mt-4 border-t border-gray-100 pt-3">
                    <p className="text-xs text-gray-400 text-center">
                        {footerText}
                    </p>
                </div>
            </div>
        </div>
    );
}

function getOrdinalSuffix(day) {
    const number = Number(day);
    if (!number) return "";

    if (number >= 11 && number <= 13) return "th";

    switch (number % 10) {
        case 1:
            return "st";
        case 2:
            return "nd";
        case 3:
            return "rd";
        default:
            return "th";
    }
}