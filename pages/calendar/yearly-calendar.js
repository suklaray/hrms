import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import SideBar from '@/Components/SideBar';
import { FaCalendarAlt, FaChevronLeft, FaChevronRight, FaGift, FaPlane, FaStar } from 'react-icons/fa';
import Link from 'next/link';

export default function YearlyCalendar() {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [events, setEvents] = useState({});
  const [loading, setLoading] = useState(true);
  const [hoveredDay, setHoveredDay] = useState(null);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const fetchYearEvents = useCallback(async () => {
    setLoading(true);
    
    try {
      const response = await fetch(`/api/calendar/yearly-events?year=${currentYear}`);
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || {});
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  }, [currentYear]);

  useEffect(() => {
    fetchYearEvents();
  }, [fetchYearEvents]);

  const getDaysInMonth = (month, year) => {
    return new Date(year, month, 0).getDate();
  };

  const getFirstDayOfMonth = (month, year) => {
    return new Date(year, month - 1, 1).getDay();
  };

  const isWeekend = (date, month, year) => {
    const day = new Date(year, month - 1, date).getDay();
    return day === 0 || day === 6;
  };

  const getEventsForDate = (year, month, day) => {
    const dateStr = new Date(year, month - 1, day).toISOString().split("T")[0];
    return Array.isArray(events[month]) ? events[month].filter((e) => e.date === dateStr) : [];
  };

    const getEventIcon = (type) => {
    switch (type) {
      case 'birthday': return <FaGift className="w-3 h-3" />;
      case 'leave': return <FaPlane className="w-3 h-3" />;
      case 'holiday': return <FaStar className="w-3 h-3" />;
      default: return null;
    }
  };

  const getUniqueEventTypes = (dayEvents) => {
    const types = new Set();
    dayEvents.forEach(event => types.add(event.type));
    return Array.from(types);
  };

  const getDotColor = (type) => {
    switch (type) {
      case 'birthday': return 'bg-indigo-400';
      case 'leave': return 'bg-orange-500';
      case 'holiday': return 'bg-purple-500';
      case 'dayoff': return 'bg-gray-300';
      default: return 'bg-gray-500';
    }
  };

  const renderMonth = (monthIndex) => {
    const month = monthIndex + 1;
    const year = currentYear;
    const firstDay = new Date(year, monthIndex, 1);
    const lastDay = new Date(year, monthIndex + 1, 0);
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

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    return (
      <div key={monthIndex} className="bg-white rounded-lg shadow">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-3">
              <FaCalendarAlt className="w-4 h-4 text-gray-600" />
              <h3 className="text-sm font-medium text-gray-900">{months[monthIndex]} {currentYear}</h3>
            </div>
          </div>
        </div>
        
        <div className="p-4">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map((day, index) => (
              <div key={day} className="h-6 flex items-center justify-center">
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
                currentYear === new Date().getFullYear() &&
                monthIndex === new Date().getMonth() &&
                day === new Date().getDate();
              
              const dayEvents = day ? getEventsForDate(currentYear, monthIndex, day) : [];
              const uniqueEventTypes = getUniqueEventTypes(dayEvents);
              const isDayOff = day && isWeekend(day, monthIndex + 1, currentYear);
              
              return (
                <div
                  key={index}
                  className={`
                    relative h-8 w-full flex flex-col items-center justify-center text-xs font-medium rounded-lg transition-all duration-200 cursor-pointer group
                    ${!day ? '' : 
                      isToday ? 'bg-orange-100 text-gray-600 shadow-lg ring-2 ring-orange-300' :
                      isDayOff ? 'bg-gray-100 text-gray-500' :
                      'text-gray-700 hover:bg-gray-50'
                    }
                  `}
                  onMouseEnter={() => setHoveredDay(day ? `${currentYear}-${monthIndex}-${day}` : null)}
                  onMouseLeave={() => setHoveredDay(null)}
                >
                  {day && (
                    <>
                      <span className={`text-xs ${isToday ? 'text-gray-800' : ''}`}>{day}</span>
                      
                      {/* Event Dots */}
                      {uniqueEventTypes.length > 0 && (
                        <div className="flex space-x-0.5 mt-0.5">
                          {uniqueEventTypes.slice(0, 4).map((type, i) => (
                            <div
                              key={i}
                              className={`w-1.5 h-1.5 rounded-full ${getDotColor(type)}`}
                            />
                          ))}
                        </div>
                      )}
                      
                      {/* Hover Tooltip */}
                      {hoveredDay === `${currentYear}-${monthIndex}-${day}` && (
                        <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg min-w-max max-w-xs">
                          {isDayOff ? (
                            <div>Day Off (Weekend)</div>
                          ) : dayEvents.length > 0 ? (
                            <div className="space-y-1">
                              {dayEvents.map((event, i) => (
                                <div key={i} className="flex items-center space-x-2">
                                  {getEventIcon(event.type)}
                                  <span>
                                    {event.type === 'birthday' && `${event.employee}'s Birthday`}
                                    {event.type === 'leave' && `${event.employee} - ${event.leave_type}${event.reason ? ` (${event.reason})` : ''}`}
                                    {event.type === 'holiday' && `${event.name}`}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : null}
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <Head>
        <title>Yearly Calendar - HRMS</title>
      </Head>
      <div className="flex min-h-screen bg-gray-50">
        <SideBar />
        
        <div className="flex-1 overflow-auto">
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className=" items-center space-x-6 ">
                <Link
                  href="/dashboard"
                  className=" px-3 py-2 pb-6 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
                >
                  ← Back to Dashboard
                </Link>
                <div>
                  <h1 className="pt-6 text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <FaCalendarAlt className="w-6 h-6 text-indigo-600" />
                    Yearly Calendar {currentYear}
                  </h1>
                  <p className="text-gray-600">View all events, holidays, birthdays and leaves</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentYear(prev => prev - 1)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <FaChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-4 py-2 bg-indigo-100 text-indigo-800 rounded-lg font-medium">
                  {currentYear}
                </span>
                <button
                  onClick={() => setCurrentYear(prev => prev + 1)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <FaChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Legend */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-4 text-xs">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-indigo-400"></div>
                    <span className="text-gray-600">Birthday</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                    <span className="text-gray-600">Leave</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                    <span className="text-gray-600">Holiday</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                    <span className="text-gray-600">Day Off</span>
                  </div>
                </div>
                <Link
                  href="/calendar/add-events"
                  className="px-4 py-2 bg-indigo-100 hover:bg-indigo-300 text-indigo-800 text-sm font-medium rounded-lg transition-colors"
                >
                  + Add Events
                </Link>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center mt-6">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent"></div>
                <span className="ml-2 text-sm text-gray-600">Loading events...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {months.map((_, index) => renderMonth(index))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}




//---------------------------------------------------------
