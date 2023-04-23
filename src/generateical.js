import ical from 'ical-generator'
import * as uuid from 'uuid'
const UUID_NAMESPACE = Array.from('uvm__________edu').map(s => s.charCodeAt(0));
const sortDateAsc = (l, r) => l < r ? -1 : l > r ? 1 : 0

function toDates(calendarRecordDate) {
    const { month, days, year } = calendarRecordDate;
    const dayRanges = days.sort(sortDateAsc).reduce((startEnds, day) => {
        const lastStartEnd = startEnds.slice(-1)[0];
        if (lastStartEnd && (lastStartEnd.end + 1) === day) {
            return [
                ...startEnds.slice(0, startEnds.length - 1),
                {
                    ...lastStartEnd,
                    end: day
                }
            ];

        }
        return [
            ...startEnds,
            {
                start: day,
                end: day
            }
        ];
    }, []);
    return dayRanges.map(({ start, end }) => ({
        start: new Date(year, month - 1, start),
        end: new Date(year, month - 1, end)
    }));
}

function toDescription(title, dow, other) {
    return [ 
        title || '',
        dow || '',
        ...Object.entries(other || {}).map(([key, value]) => `${key}: ${value}`)
    ].map(item => item.trim()).filter(item => item.length > 0).join('\n');
}

function toICalEvents(calendarRecord, title) {
    const { date, event, dow, other } = calendarRecord;
    return toDates(date).map(({start, end}) => {
        const uniqueName = `${start.getMonth()}${start.getDay()}${start.getFullYear()}${event}`;
        const uid = uuid.v5(uniqueName, UUID_NAMESPACE);
        return {
            start,
            end,
            uid,
            allDay: true,
            summary: event,
            description: toDescription(title, dow, other),
        };
    });
}

export function toICalendar(loadedCalendarPage) {
    const { title: iCalendarName, calendars } = loadedCalendarPage
    const result = ical({
        name: iCalendarName
    });
    calendars
        .flatMap(({title, records}) => records.flatMap(record => toICalEvents(record, title)))
        .sort((l, r) => sortDateAsc(l.start, r.start))
        .forEach(event => result.createEvent(event));
    return result;
}