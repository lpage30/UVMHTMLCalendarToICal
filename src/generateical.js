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

function toDescription(remainingEvent, title, dow, other) {
    let description = {}
    if (remainingEvent && remainingEvent.trim().length > 0) {
        description = {
            ...description,
            details: remainingEvent
        }
    }
    if (title && title.trim().length > 0) {
        description = {
            ...description,
            title
        }
    }
    if (dow && dow.trim().length > 0) {
        description = {
            ...description,
            dow
        }
    }
    description = {
        ...description,
        ...(other || {})
    }
    return Object.entries(description)
        .map(([key, value]) => ([(key || '').trim(), (value || '').trim()]))
        .filter(([key, value]) => (key.length + value.length) > 0)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');
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
            summary: event[0],
            description: toDescription(event.slice(1).join('\n'), title, dow, other),
        };
    });
}
export function toNamedICalendarEvents(loadedCalendarPage) {
    const { title: iCalendarName, calendars } = loadedCalendarPage
    return {
        name: iCalendarName,
        events: calendars
        .flatMap(({title, records}) => records.flatMap(record => toICalEvents(record, title)))
    }
}

export function toICalendar(namedICalendarEvents) {
    const { name, events } = namedICalendarEvents;
    if (!name || !events) {
        return undefined
    }

    const result = ical({
        name
    });
    events
    .sort((l, r) => sortDateAsc(l.start, r.start))
    .forEach(event => result.createEvent(event));

    return result;
}

