"use client";

import { useState, useEffect } from "react";
import { FaCalendarAlt, FaChevronLeft, FaChevronRight, FaGift, FaPlane, FaStar } from "react-icons/fa";
import Link from "next/link";

export default function CalendarSection() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hoveredDay, setHoveredDay] = useState(null);

  // Fetch events when month changes
  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const month = currentDate.getMonth() + 1;
        const year = currentDate.getFullYear();

        const res = await fetch(`/api/calendar/events?month=${month}&year=${year}`, {
          credentials: "include",
        });

        if (res.ok) {
          const data = await res.json();
          setEvents(data.events || []);
        } else {
          console.error("Failed to fetch events");
          setEvents([]);
        }
      } catch (error) {
        console.error("Error fetching events:", error);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [currentDate]);

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) days.push(null);
    for (let day = 1; day <= daysInMonth; day++) days.push(day);
    return days;
  };

  const navigateMonth = (direction) => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const getEventsForDate = (year, month, day) => {
    const localDate = new Date(year, month, day);
    const dateStr = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, "0")}-${String(
      localDate.getDate()
    ).padStart(2, "0")}`;
    return Array.isArray(events) ? events.filter((e) => e.date === dateStr) : [];
  };

  const legendItems = [
    { type: "birthday", label: "Birthday" },
    { type: "leave", label: "Leave" },
    { type: "holiday", label: "Holiday" },
    { type: "event", label: "Event" },
    { type: "dayoff", label: "Day Off" },
  ];

  const getDotColor = (type) => {
    switch (type) {
      case "birthday":
        return "bg-indigo-400";
      case "leave":
        return "bg-orange-500";
      case "holiday":
        return "bg-purple-500";
      case "event":
        return "bg-green-500";
      case "dayoff":
        return "bg-gray-300";
      default:
        return "bg-gray-500";
    }
  };

  const getUniqueEventTypes = (dayEvents) => {
    const types = new Set();
    dayEvents.forEach((event) => types.add(event.type));
    return Array.from(types);
  };

  const isWeekend = (year, month, day) => {
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  };

  const days = getDaysInMonth(currentDate);
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex iflex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <FaCalendarAlt className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Calendar</h3>
          </div>

          <div className="flex items-center justify-center space-x-2 w-full sm:w-auto">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
              disabled={loading}
            >
              <FaChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <span className="text-gray-900 font-medium text-center text-sm sm:text-base flex-1">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
            <button
              onClick={() => navigateMonth(1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
              disabled={loading}
            >
              <FaChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-6">
        <div className="grid grid-cols-7 gap-1 mb-3">
          {dayNames.map((day, i) => (
            <div key={i} className="text-center text-xs font-semibold uppercase text-gray-500">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((day, idx) => {
            const isToday =
              day &&
              currentDate.getFullYear() === new Date().getFullYear() &&
              currentDate.getMonth() === new Date().getMonth() &&
              day === new Date().getDate();

            const dayEvents = day ? getEventsForDate(currentDate.getFullYear(), currentDate.getMonth(), day) : [];
            const uniqueEventTypes = getUniqueEventTypes(dayEvents);
            const isDayOff = day && isWeekend(currentDate.getFullYear(), currentDate.getMonth(), day);

            return (
              <div
                key={idx}
                className={`relative h-12 flex flex-col items-center justify-center text-sm rounded-lg transition-all duration-200
                  ${!day ? "" : isToday ? "bg-orange-100 text-gray-900 ring-2 ring-orange-300"
                    : isDayOff ? "bg-gray-100 text-gray-500"
                    : "hover:bg-gray-50 text-gray-700"}
                `}
                onMouseEnter={() => setHoveredDay(day)}
                onMouseLeave={() => setHoveredDay(null)}
              >
                {day && (
                  <>
                    <span>{day}</span>

                    {/* Event Dots */}
                    {uniqueEventTypes.length > 0 && (
                      <div className="flex space-x-1 mt-1">
                        {uniqueEventTypes.slice(0, 4).map((type, i) => (
                          <div key={i} className={`w-2 h-2 rounded-full ${getDotColor(type)}`}></div>
                        ))}
                      </div>
                    )}

                    {/* Tooltip */}
                    {hoveredDay === day && (dayEvents.length > 0 || isDayOff) && (
                      <div className="absolute z-50 bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
                        {isDayOff && <div className="flex items-center space-x-2"><div className="w-2 h-2 rounded-full bg-gray-400"></div><span>Weekend</span></div>}
                        {dayEvents.map((event, i) => (
                          <div key={i} className="flex items-center space-x-2 mt-1">
                            <div className={`w-2 h-2 rounded-full ${getDotColor(event.type)}`}></div>
                            <span>
                              {event.type === "birthday" && `${event.employee}'s Birthday`}
                              {event.type === "leave" && `${event.employee} - ${event.leave_type}`}
                              {event.type === "holiday" && event.title}
                              {event.type === "event" && event.title}
                            </span>
                          </div>
                        ))}
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div className="flex justify-center items-center mt-6">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent"></div>
            <span className="ml-2 text-sm text-gray-600">Loading events...</span>
          </div>
        )}

        {/* Legend + Link */}
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-wrap gap-2 sm:gap-4 text-xs">
            {legendItems.map((item) => (
              <div key={item.type} className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${getDotColor(item.type)}`}></div>
                <span className="text-gray-600">{item.label}</span>
              </div>
            ))}
          </div>

          <Link
            href="/employee/calendar"
            className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs sm:text-sm font-medium rounded-lg transition-colors text-center"
          >
            View Calendar
          </Link>
        </div>
      </div>
    </div>
  );
}
