//import { Link } from 'lucide-react';
import { useState, useEffect } from 'react';
import { FaCalendarAlt, FaChevronLeft, FaChevronRight, FaGift, FaPlane, FaStar } from 'react-icons/fa';
import Link from 'next/link';
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
          credentials: 'include'
        });
        
        if (res.ok) {
          const data = await res.json();
          setEvents(data.events || []);
        } else {
          console.error('Failed to fetch events');
          setEvents([]);
        }
      } catch (error) {
        console.error('Error fetching events:', error);
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
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    
    return days;
  };

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const getEventsForDate = (year, month, day) => {
    const localDate = new Date(year, month, day);
    const dateStr = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`;
    return Array.isArray(events) ? events.filter((e) => e.date === dateStr) : [];
  };


  const getEventIcon = (type) => {
    switch (type) {
      case 'birthday': return <FaGift className="w-3 h-3" />;
      case 'leave': return <FaPlane className="w-3 h-3" />;
      case 'holiday': return <FaStar className="w-3 h-3" />;
      case 'event': return <FaCalendarAlt className="w-3 h-3" />;
      default: return null;
    }
  };

  // Get unique event types for a day (no duplicates)
  const getUniqueEventTypes = (dayEvents) => {
    const types = new Set();
    dayEvents.forEach(event => types.add(event.type));
    return Array.from(types);
  };

  // Get dot color for event type
const legendItems = [
  { type: 'birthday', label: 'Birthday' },
  { type: 'leave', label: 'Leave' },
  { type: 'holiday', label: 'Holiday' },
  { type: 'event', label: 'Event' },
  { type: 'dayoff', label: 'Day Off' },
];

const getDotColor = (type) => {
  switch (type) {
    case 'birthday': return 'bg-indigo-400';
    case 'leave': return 'bg-orange-500';
    case 'holiday': return 'bg-purple-500';
    case 'event': return 'bg-green-500'; 
    case 'dayoff': return 'bg-gray-300';
    default: return 'bg-gray-500';
  }
};

  // Check if a day is weekend (Saturday = 6, Sunday = 0)
  const isWeekend = (year, month, day) => {
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
  };

  const days = getDaysInMonth(currentDate);
  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FaCalendarAlt className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-medium text-gray-900">Calendar</h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
              disabled={loading}
            >
              <FaChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <span className="text-gray-900 font-medium min-w-[140px] text-center text-sm sm:text-base">
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
      
      <div className="p-6">
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-4">
          {dayNames.map((day, index) => (
            <div key={day} className="h-8 flex items-center justify-center">
              <span className={`text-xs font-semibold uppercase ${
                index === 0 || index === 6 ? 'text-red-500' : 'text-gray-500'
              }`}>
                {day.slice(0, 3)}
              </span>
            </div>
          ))}
        </div>
        
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 relative">
          {days.map((day, index) => {
            const isToday = day && 
              currentDate.getFullYear() === new Date().getFullYear() &&
              currentDate.getMonth() === new Date().getMonth() &&
              day === new Date().getDate();
            
            const dayEvents = day ? getEventsForDate(currentDate.getFullYear(), currentDate.getMonth(), day) : [];
            const uniqueEventTypes = getUniqueEventTypes(dayEvents);
            const isDayOff = day && isWeekend(currentDate.getFullYear(), currentDate.getMonth(), day);
            
            return (
              <div
                key={index}
                className={`
                  relative h-10 sm:h-12 w-full flex flex-col items-center justify-center text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer group
                  ${!day ? '' : 
                    isToday ? 'bg-orange-100 text-gray-600 shadow-lg ring-2 ring-orange-300' :
                    isDayOff ? 'bg-gray-100 text-gray-500' :
                    'text-gray-700 hover:bg-gray-50'
                  }
                `}
                onMouseEnter={() => day && setHoveredDay(`${currentDate.getFullYear()}-${currentDate.getMonth()}-${day}`)}
                onMouseLeave={() => day && setHoveredDay(null)}
              >
                {day && (
                  <>
                    <span className={`text-xs sm:text-sm ${isToday ? 'text-gray-800' : ''}`}>{day}</span>
                    
                    {/* Event Dots */}
                    {uniqueEventTypes.length > 0 && (
                      <div className="flex space-x-1 mt-1">
                        {uniqueEventTypes.slice(0, 4).map((type, i) => (
                          <div
                            key={i}
                            className={`w-2 h-2 rounded-full ${getDotColor(type)}`}
                          />
                        ))}
                      </div>
                    )}
                    
                    {/* Hover Tooltip */}
                      {hoveredDay === `${currentDate.getFullYear()}-${currentDate.getMonth()}-${day}` && (dayEvents.length > 0 || isDayOff) && (
                        <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg min-w-max max-w-xs">
                        
                        {/* Show Day Off if weekend */}
                                {isDayOff && (
                                  <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 rounded-full bg-gray-400" />
                                    <span>Day Off (Weekend)</span>
                                  </div>
                                )}

                            
                                {dayEvents.length > 0 && (
                                  <div className="space-y-1 mt-1">
                                    {dayEvents.map((event, i) => (
                                      <div key={i} className="flex items-center space-x-2">
                                        <div className={`w-2 h-2 rounded-full ${getDotColor(event.type)}`} />
                                        <span>
                                          {event.type === 'birthday' && `${event.employee}'s Birthday`}
                                          {event.type === 'leave' && `${event.employee} - ${event.leave_type}${event.reason ? ` (${event.reason})` : ''}`}
                                          {event.type === 'holiday' && `${event.title.replace('🎉 ', '')}`}
                                          {event.type === 'event' && `${event.title.replace('📅 ', '')}`}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Tooltip arrow */}
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                              </div>

                        )}
                     </>
                  )}
              </div>
            );
          })}
        </div>
        
        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center mt-6">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent"></div>
            <span className="ml-2 text-sm text-gray-600">Loading events...</span>
          </div>
        )}

        <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-wrap gap-2 sm:gap-4 text-xs">
            {legendItems.map((item) => (
              <div key={item.type} className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${getDotColor(item.type)}`}></div>
                <span className="text-gray-600">{item.label}</span>
              </div>
            ))}
          </div>
          {/* Link Button */}
          <Link
            href="/calendar/yearly-calendar"
            className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs sm:text-sm font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap flex-shrink-0"
          >
            View Calendar
          </Link>
        </div>
      </div>
    </div>
  );
}
