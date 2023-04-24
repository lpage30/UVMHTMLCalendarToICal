import { writeFile } from 'fs'
import { promisify } from 'util'
import { loadCalendarPage } from './src/parseUVMCalendar.js'
import { toNamedICalendarEvents, toICalendar } from './src/generateical.js'

const writeFileAsync = promisify(writeFile)

function help() {
    console.log('USAGE npm run ConvertToICal -- <UVM-CALENDAR-URL1> ... <UVM-CALENDAR-URLN>');
    console.log('Converts UVM Calendars depicted on webpages into ICal format.');
    console.log('Combines calendars into 1 single ical named based on the 1st calendar loaded.')
    console.log('ie: npm run ConvertToICal -- https://www.uvm.edu/registrar/uvm-academic-calendar-2023-2024');
    console.log('creates uvm-academic-calendar-2023-2024.ical');
}

async function main(uvmCalendarURLs) {
    if (uvmCalendarURLs.length === 0) {
        help();
        return;
    }
    const results = []
    for(const uvmCalendarURL of uvmCalendarURLs) {
        const calendarPageName = uvmCalendarURL.split('/').slice(-1)[0].trim()
        console.log(`Loading ${uvmCalendarURL} as calendar ${calendarPageName}`)
        const loadedCalendarPage = await loadCalendarPage(uvmCalendarURL, calendarPageName);
        if (loadedCalendarPage) {
            results.push({ 
                url: uvmCalendarURL,
                namedICalendarEvents: toNamedICalendarEvents(loadedCalendarPage)
            });
        } else {
            results.push({
                url: uvmCalendarURL,
                namedICalendarEvents: undefined
            })
        }
    }
    const icalendar = toICalendar(results
        .filter(({namedICalendarEvents}) => namedICalendarEvents)
        .reduce((namedCalendarEvents, {namedICalendarEvents: {name, events}}) => ({
            name: (namedCalendarEvents.name ?? name),
            events: [
                ...(namedCalendarEvents.events ?? []),
                ...events
            ]
        }), {}))
    if (icalendar) {
        const filename = `${icalendar.name().replaceAll(/[ \t]+/ig, '-')}.ical`
        await writeFileAsync(filename, icalendar.toString())
        console.log('Completed creation of calendar',
            filename,
            ' from urls [',
            results
                .filter(({_url, namedICalendarEvents}) => namedICalendarEvents)
                .map(({url}) => url)
                .join(', '),
            ']'
        );
    }
    const failedUrls = results
     .filter(({_url, namedICalendarEvents}) => namedICalendarEvents === undefined)
     .map(({url}) => url)
     .join(', ');
     if (failedUrls.length > 0) {
        console.error('Failed to load urls: [', failedUrls, ']')
     }
}

main(process.argv.slice(2));