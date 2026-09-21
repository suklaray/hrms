// Holiday Management System for IT Industry
export const holidays2024 = [
  { date: "2024-01-01", name: "New Year's Day", type: "National" },
  { date: "2024-01-26", name: "Republic Day", type: "National" },
  { date: "2024-03-08", name: "Holi", type: "Festival" },
  { date: "2024-03-29", name: "Good Friday", type: "Religious" },
  { date: "2024-04-11", name: "Eid ul-Fitr", type: "Religious" },
  { date: "2024-04-14", name: "Baisakhi", type: "Festival" },
  { date: "2024-05-01", name: "Labour Day", type: "National" },
  { date: "2024-08-15", name: "Independence Day", type: "National" },
  { date: "2024-08-19", name: "Raksha Bandhan", type: "Festival" },
  { date: "2024-08-26", name: "Janmashtami", type: "Religious" },
  { date: "2024-09-07", name: "Ganesh Chaturthi", type: "Religious" },
  { date: "2024-10-02", name: "Gandhi Jayanti", type: "National" },
  { date: "2024-10-12", name: "Dussehra", type: "Festival" },
  { date: "2024-11-01", name: "Diwali", type: "Festival" },
  { date: "2024-11-15", name: "Guru Nanak Jayanti", type: "Religious" },
  { date: "2024-12-25", name: "Christmas Day", type: "Religious" }
];

export const holidays2025 = [
  { date: "2025-01-01", name: "New Year's Day", type: "National" },
  { date: "2025-01-26", name: "Republic Day", type: "National" },
  { date: "2025-03-14", name: "Holi", type: "Festival" },
  { date: "2025-04-18", name: "Good Friday", type: "Religious" },
  { date: "2025-03-31", name: "Eid ul-Fitr", type: "Religious" },
  { date: "2025-04-13", name: "Baisakhi", type: "Festival" },
  { date: "2025-05-01", name: "Labour Day", type: "National" },
  { date: "2025-08-15", name: "Independence Day", type: "National" },
  { date: "2025-08-09", name: "Raksha Bandhan", type: "Festival" },
  { date: "2025-08-16", name: "Janmashtami", type: "Religious" },
  { date: "2025-08-27", name: "Ganesh Chaturthi", type: "Religious" },
  { date: "2025-10-02", name: "Gandhi Jayanti", type: "National" },
  { date: "2025-10-02", name: "Dussehra", type: "Festival" },
  { date: "2025-10-20", name: "Diwali", type: "Festival" },
  { date: "2025-11-05", name: "Guru Nanak Jayanti", type: "Religious" },
  { date: "2025-12-25", name: "Christmas Day", type: "Religious" }
];

export function getAllHolidays() {
  return [...holidays2024, ...holidays2025];
}

export function getHolidaysByYear(year) {
  if (year === 2024) return holidays2024;
  if (year === 2025) return holidays2025;
  return [];
}

export function getHolidaysByMonth(year, month) {
  const yearHolidays = getHolidaysByYear(year);
  return yearHolidays.filter(holiday => {
    const holidayDate = new Date(holiday.date);
    return holidayDate.getMonth() + 1 === month;
  });
}

export function isHoliday(date) {
  const dateStr = date.toISOString().split('T')[0];
  const allHolidays = getAllHolidays();
  return allHolidays.find(holiday => holiday.date === dateStr);
}

export function getNextHoliday() {
  const today = new Date();
  const allHolidays = getAllHolidays();
  
  const upcomingHolidays = allHolidays.filter(holiday => {
    const holidayDate = new Date(holiday.date);
    return holidayDate > today;
  });
  
  return upcomingHolidays.length > 0 ? upcomingHolidays[0] : null;
}

export function getHolidaysInRange(startDate, endDate) {
  const allHolidays = getAllHolidays();
  return allHolidays.filter(holiday => {
    const holidayDate = new Date(holiday.date);
    return holidayDate >= startDate && holidayDate <= endDate;
  });
}

export function searchHolidays(query) {
  const allHolidays = getAllHolidays();
  const lowerQuery = query.toLowerCase();
  
  return allHolidays.filter(holiday => 
    holiday.name.toLowerCase().includes(lowerQuery) ||
    holiday.type.toLowerCase().includes(lowerQuery)
  );
}