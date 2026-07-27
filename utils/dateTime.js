const IST_TIMEZONE = "Asia/Kolkata";

const isValidDate = (date) => {
    const parsedDate = new Date(date);
    return !isNaN(parsedDate.getTime());
};
export const formatLongDate = (date = new Date()) => {
    const d = new Date(date);

    if (isNaN(d.getTime())) return "--";

    return new Intl.DateTimeFormat("en-IN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: IST_TIMEZONE,
    }).format(d);
};
export const formatMonthShort = (date) => {
    if (!date) return "--";

    const d = new Date(date);

    if (isNaN(d.getTime())) return "--";

    return new Intl.DateTimeFormat("en-IN", {
        month: "short",
        timeZone: IST_TIMEZONE,
    }).format(d);
};
export const formatDate = (date) => {
    if (!date || !isValidDate(date)) return "--";

    return new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: IST_TIMEZONE,
    }).format(new Date(date));
};

export const formatTime = (date) => {
    if (!date || !isValidDate(date)) return "--";

    return new Intl.DateTimeFormat("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: IST_TIMEZONE,
    })
        .format(new Date(date))
        .replace(/am/gi, "AM")
        .replace(/pm/gi, "PM");
};

export const formatDateTime = (date) => {
    if (!date || !isValidDate(date)) return "--";

    return new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: IST_TIMEZONE,
    })
        .format(new Date(date))
        .replace(/am/gi, "AM")
        .replace(/pm/gi, "PM");
};
export const formatHHMMToAMPM = (time) => {
  if (!time || time === "--") return "--";

  const [hours, minutes] = time.split(":");

  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0, 0);

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: IST_TIMEZONE,
  });
};
export const formatDayMonthDate = (date) => {
  if (!date || !isValidDate(date)) return "--";

  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: IST_TIMEZONE,
  }).format(new Date(date));
};
export const formatMediumDate = (date) => {
  if (!date || !isValidDate(date)) return "--";

  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: IST_TIMEZONE,
  }).format(new Date(date));
};
export const formatMonthYear = (date = new Date()) => {
  if (!date || !isValidDate(date)) return "--";

  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: IST_TIMEZONE,
  }).format(new Date(date));
};
export const formatShortMonthYear = (date) => {
  if (!date || !isValidDate(date)) return "--";

  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    year: "numeric",
    timeZone: IST_TIMEZONE,
  }).format(new Date(date));
};
export const formatMonthName = (date) => {
  if (!date || !isValidDate(date)) return "--";

  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    timeZone: IST_TIMEZONE,
  }).format(new Date(date));
};
export const formatTimeWithSeconds = (date) => {
  if (!date || !isValidDate(date)) return "--";

  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: IST_TIMEZONE,
  })
    .format(new Date(date))
    .replace(/am/gi, "AM")
    .replace(/pm/gi, "PM");
};
export const formatShortDateTime = (date) => {
  if (!date || !isValidDate(date)) return "--";

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: IST_TIMEZONE,
  })
    .format(new Date(date))
    .replace(/am/gi, "AM")
    .replace(/pm/gi, "PM");
};
export const formatTimeUTC = (time) => {
    if (!time) return "--";
    // Handles plain HH:mm strings from API (no timezone conversion needed)
    const str = typeof time === 'string' ? time : '';
    const timePart = str.includes('T') ? str.split('T')[1].slice(0, 5) : str.slice(0, 5);
    if (!timePart || !timePart.includes(':')) return "--";
    const [h, m] = timePart.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return "--";
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${String(hour12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
};