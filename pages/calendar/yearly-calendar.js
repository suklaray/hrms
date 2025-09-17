import { useState, useEffect } from 'react';
import Head from 'next/head';
import SideBar from '@/Components/SideBar';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

export default function YearlyCalendar() {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [events, setEvents] = useState({});
  const [loading, setLoading] = useState(true);
  const [hoveredDate, setHoveredDate] = useState(null);
  const [tooltipEvents, setTooltipEvents] = useState([]);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    fetchYearEvents();
  }, [currentYear]);

const fetchYearEvents = async () => {
  setLoading(true);
  
  try {
    // Make all 12 API calls in parallel instead of sequential
    const promises = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      return fetch(`/api/calendar/events?month=${month}&year=${currentYear}`)
        .then(res => res.ok ? res.json() : { events: [] })
        .then(data => ({ month, events: data.events || [] }));
    });

    const results = await Promise.all(promises);
    
    const yearEvents = {};
    results.forEach(({ month, events }) => {
      yearEvents[month] = events;
    });
    
    setEvents(yearEvents);
  } catch (error) {
    console.error('Error fetching events:', error);
  } finally {
    setLoading(false);
  }
};


  const getDaysInMonth = (month, year) => {
    return new Date(year, month, 0).getDate();
  };

  const getFirstDayOfMonth = (month, year) => {
    return new Date(year, month - 1, 1).getDay();
  };

  const isWeekend = (date, month, year) => {
    const day = new Date(year, month - 1, date).getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  };

  const getDateEvents = (date, month) => {
  const dateStr = `${currentYear}-${String(month).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
  return events[month]?.filter(event => event.date === dateStr) || [];
}
 
  const handleMouseEnter = (date, month) => {
  const dateEvents = getDateEvents(date, month);
  setHoveredDate(`${month}-${date}`);
  setTooltipEvents(dateEvents);
};

const handleMouseLeave = () => {
  setHoveredDate(null);
  setTooltipEvents([]);
};

const renderMonth = (monthIndex) => {
  const month = monthIndex + 1;
  const daysInMonth = getDaysInMonth(month, currentYear);
  const firstDay = getFirstDayOfMonth(month, currentYear);
  const days = [];

  // Empty cells for days before month starts
  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`empty-${i}`} className="h-8"></div>);
  }

  // Days of the month
  for (let date = 1; date <= daysInMonth; date++) {
    const dateEvents = getDateEvents(date, month);
    const isWeekendDay = isWeekend(date, month, currentYear);
    const hasEvents = dateEvents.length > 0;
    
    days.push(
      <div
        key={date}
        className={`h-8 flex items-center justify-center text-xs relative cursor-pointer transition-colors ${
          isWeekendDay ? 'bg-red-50 text-red-600' : 'hover:bg-gray-100'
        }`}
        onMouseEnter={() => handleMouseEnter(date, month)}
        onMouseLeave={handleMouseLeave}
      >
        <span className={`${hasEvents ? 'font-semibold' : ''}`}>{date}</span>
        {hasEvents && (
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 flex space-x-0.5">
            {[...new Set(dateEvents.map(e => e.type))].map(type => (
              <div
                key={type}
                className={`w-1 h-1 rounded-full ${
                  type === 'birthday' ? 'bg-yellow-500' :
                  type === 'leave' ? 'bg-red-500' :
                  type === 'holiday' ? 'bg-green-500' : 'bg-blue-500'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div key={monthIndex} className="bg-white rounded-lg shadow-sm border p-3">
      <h3 className="font-semibold text-sm text-gray-900 mb-2 text-center">
        {months[monthIndex]}
      </h3>
      <div className="grid grid-cols-7 gap-1 text-xs">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
          <div key={day} className="h-6 flex items-center justify-center font-medium text-gray-500">
            {day}
          </div>
        ))}
        {days}
      </div>
    </div>
  );
};

const handleLogout = () => {
  // Add logout logic
};

return (
  <>
    <Head>
      <title>Yearly Calendar - HRMS</title>
    </Head>
    <div className="flex min-h-screen bg-gray-50">
      <SideBar handleLogout={handleLogout} />
      
      <div className="flex-1 overflow-auto">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="w-6 h-6 text-indigo-600" />
                Yearly Calendar {currentYear}
              </h1>
              <p className="text-gray-600">View all events, holidays, birthdays and leaves</p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentYear(prev => prev - 1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="px-4 py-2 bg-indigo-100 text-indigo-800 rounded-lg font-medium">
                {currentYear}
              </span>
              <button
                onClick={() => setCurrentYear(prev => prev + 1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Legend */}
          <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
            <h3 className="font-medium text-gray-900 mb-3">Legend</h3>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span>Birthdays</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span>Leaves</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>Holidays</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-50 border border-red-200"></div>
                <span>Weekends</span>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {months.map((_, index) => renderMonth(index))}
            </div>
          )}

          {/* Tooltip */}
          {hoveredDate && tooltipEvents.length > 0 && (
            <div className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-3 max-w-xs pointer-events-none"
                 style={{
                   left: '50%',
                   top: '50%',
                   transform: 'translate(-50%, -50%)'
                 }}>
              <div className="space-y-2">
                {tooltipEvents.map((event, index) => (
                  <div key={index} className="text-sm">
                    <div className="font-medium text-gray-900">{event.title}</div>
                    {event.employee && (
                      <div className="text-gray-600">Employee: {event.employee}</div>
                    )}
                    {event.leave_type && (
                      <div className="text-gray-600">Type: {event.leave_type}</div>
                    )}
                    {event.reason && (
                      <div className="text-gray-600">Reason: {event.reason}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  </>
);
}