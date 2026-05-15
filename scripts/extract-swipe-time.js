// const fs = require('fs');

// async function fetchData(month, date) {
//     const formattedMonth = String(month).padStart(2, '0');
//     const formattedDate = String(date).padStart(2, '0');
//     const fromDate = `${formattedMonth}/${formattedDate}/2026`;

//     try {
//         const response = await fetch('https://myaclservice.acldigital.com/ServiceHost/EmployeeService.svc/DailyAttendance', {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json'
//             },
//             body: JSON.stringify(
//                 {
//                     "EmployeeId": "E12350",
//                     "FromDate": fromDate,
//                     "LocationId": "L128",
//                     "ReportType": "DAILY",
//                     "token": "beceb3a4-0b78-4ac4-981a-3041a5668b0e"
//                 }
//             )
//         }
//         );

//         if (!response.ok) {
//             throw new Error('Network response was not ok');
//         }
//         const data = await response.json();

//         // console.log(" Data received:", data.Data);

//         const swipeTimes = data.Data
//             .map(item => item.SwipeTimings)
//             .filter(t => t && t.trim() !== "");

//         console.log(` Swipe Timings  ${fromDate}  `, swipeTimes[0], " end ", swipeTimes[swipeTimes.length - 1]);
//     }
//     catch (error) {
//         console.error('There was a problem with the fetch operation:', error);
//     }
// };


// async function getMonthlySwipe(month, year = 2026) {
//     const daysInMonth = new Date(year, month, 0).getDate();
//     const results = [];

//     for (let day = 1; day <= daysInMonth; day++) {
//         const data = await fetchData(month, day);
//         if (data) results.push(data);
//     }

//     return results;
// }


// (async () => {
//     await getMonthlySwipe(3);
// })();





// fs.writeFileSync('swipeData.json', JSON.stringify(data, null, 2));

// console.log("File written successfully!");



// attendance_monthly.js
const fs = require('fs');

// ----------------------
// Function to fetch daily swipe data
// ----------------------
async function fetchData(month, day, year = 2026) {
    const formattedMonth = String(month).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');
    const fromDate = `${formattedMonth}/${formattedDay}/${year}`;

    try {
        const response = await fetch(
            'https://myaclservice.acldigital.com/ServiceHost/EmployeeService.svc/DailyAttendance',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    EmployeeId: "E12350",
                    FromDate: fromDate,
                    LocationId: "L128",
                    ReportType: "DAILY",
                    token: "beceb3a4-0b78-4ac4-981a-3041a5668b0e"
                })
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP Error ${response.status}`);
        }

        const res = await response.json();
        const attendance = res.Data || [];

        const swipeTimes = attendance
            .map(item => item.SwipeTimings)
            .filter(t => t && t.trim() !== "");

        return {
            date: fromDate,
            firstSwipe: swipeTimes[0] || "NO DATA",
            lastSwipe: swipeTimes[swipeTimes.length - 1] || "NO DATA"
        };

    } catch (error) {
        console.error(`Error fetching data for ${fromDate}:`, error.message);
        return {
            date: fromDate,
            firstSwipe: "NO DATA",
            lastSwipe: "NO DATA"
        };
    }
}

// ----------------------
// Function to generate monthly attendance
// ----------------------
async function getMonthlySwipe(month, year = 2026) {
    const daysInMonth = new Date(year, month, 0).getDate();
    const results = [];

    for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(year, month - 1, day);
        const dayOfWeek = dateObj.getDay(); // 0=Sunday, 6=Saturday

        let record;

        if (dayOfWeek === 0 || dayOfWeek === 6) {
            // Weekend
            const formattedMonth = String(month).padStart(2, '0');
            const formattedDay = String(day).padStart(2, '0');
            record = {
                date: `${formattedMonth}/${formattedDay}/${year}`,
                firstSwipe: "WEEKEND",
                lastSwipe: "WEEKEND"
            };
        } else {
            // Weekday
            record = await fetchData(month, day, year);
        }

        results.push(record);
    }

    // ----------------------
    // Write JSON file
    // ----------------------
    fs.writeFileSync(`swipe_${month}_${year}.json`, JSON.stringify(results, null, 2));
    console.log(`JSON file created: swipe_${month}_${year}.json`);

    // ----------------------
    // Write CSV file
    // ----------------------
    const csv = [
        "Date,First Swipe,Last Swipe",
        ...results.map(r => `${r.date},${r.firstSwipe},${r.lastSwipe}`)
    ].join("\n");

    fs.writeFileSync(`swipe_${month}_${year}.csv`, csv);
    console.log(`CSV file created: swipe_${month}_${year}.csv`);

    return results;
}

// ----------------------
// Run the script
// ----------------------
(async () => {
    const month = 3; // March
    const year = 2026;

    const monthlyData = await getMonthlySwipe(month, year);
    console.log("Monthly attendance data processed successfully!");
})();