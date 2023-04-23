import { writeFile } from 'fs'
import { promisify } from 'util'
import { loadCalendarPage } from './src/parseUVMCalendar.js'
import { toICalendar } from './src/generateical.js'

const writeFileAsync = promisify(writeFile)

function help() {
    console.log('USAGE npm run ConvertToICal -- <UVM-CALENDAR-URL>');
    console.log('Converts UVM Calendar depicted on webpage into ICal format');
    console.log('ie: npm run ConvertToICal -- https://www.uvm.edu/registrar/uvm-academic-calendar-2023-2024');
    console.log('creates uvm-academic-calendar-2023-2024.ical');
}

async function main(uvmCalendarURL) {
    if (!uvmCalendarURL) {
        help();
        return;
    }
    const calendarPageName = uvmCalendarURL.split('/').slice(-1)[0].trim()
    const loadedCalendarPage = await loadCalendarPage(uvmCalendarURL, calendarPageName);
    if (loadedCalendarPage) {
        const icalendarFilename = `${calendarPageName.replaceAll(/[ \t]+/ig, '-')}.ical`
        const icalendar = toICalendar(loadedCalendarPage);
        await writeFileAsync(icalendarFilename, icalendar.toString())
        console.info('Conversion complete.', icalendarFilename)
    } else {
        console.error('Failed loading and parsing Calendar', uvmCalendarURL)
    }
}

main(process.argv.slice(2)[0]);