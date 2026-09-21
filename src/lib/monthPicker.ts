// get month name from month number
export default function getMonthName(monthNumber) {
    let year = '';
    if (monthNumber) {
        year = monthNumber.split('-')[0];
        monthNumber = monthNumber.split('-')[1];
    }
    const months = [
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
        "December"
    ];

    return year + ' ' + months[Number(monthNumber) - 1] || "-";
}