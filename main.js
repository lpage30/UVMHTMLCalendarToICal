import { loadCalendarPage } from './src/parseUVMCalendar.js'
function help() {
    console.log('USAGE npm run ConvertToICal -- <UVM-CALENDAR-URL>');
    console.log('Converts UVM Calendar depicted on webpage into ICal format');
    console.log('ie: npm run ConvertToICal -- https://www.uvm.edu/registrar/uvm-academic-calendar-2023-2024');
    console.log('creates uvm-academic-calendar-2023-2024.ics')
}

async function main(uvmCalendarURL) {
    if (!uvmCalendarURL) {
        help()
        return
    }
    const calendar = await loadCalendarPage(uvmCalendarURL)

    console.log('CALENDAR', JSON.stringify(calendar, null, 2))

}

main(process.argv.slice(2)[0]);