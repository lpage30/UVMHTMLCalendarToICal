import fetch from 'node-fetch';
import cheerio from 'cheerio';

const months = [
    ['january', 'jan.', 'jan'],
    ['february', 'feb.', 'feb'],
    ['march', 'mar.', 'mar'],
    ['april', 'apr.', 'apr'],
    ['may'],
    ['june', 'jun.', 'jun'],
    ['july', 'jul.', 'jul'],
    ['august', 'aug.', 'aug'],
    ['september', 'sept.', 'sept'],
    ['october', 'oct.', 'oct'],
    ['november', 'nov.', 'nov'],
    ['december', 'dec.', 'dec'],
]
function toYear(month, days, startYear, endYear) {
    if (startYear === endYear) {
        return startYear
    }
    const searchMonth = month.toLowerCase()
    const monthNo = months.findIndex((monthNames => monthNames.includes(searchMonth)))
    if (monthNo === 7) {
        const oldestDay = days.slice(-1)[0]
        return oldestDay > 15 ?  startYear : endYear
    }
    return monthNo > 7 ? startYear : endYear
}

function toDays(daysExpression) {
   return daysExpression.split(',')
    .reduce((result, dayString) => ([
        ...result,
        ...dayString
            .split('-')
            .map(dayStr => parseInt(dayStr))
            .reduce((days, day)=> {
                if(days.length > 0) {
                    const startDay = days.slice(-1)[0]
                    return [
                        ...days,
                        ...Array.from(Array(day - startDay).keys()).map(index => startDay + index + 1)
                    ];
                }
                return [day];
            },[])
    ]), []);
}

function toMonthDaysYear(monthDay, startYear, endYear) {
    const spaceDelimValues = monthDay.trim().split(' ')
    const month = spaceDelimValues[0].trim()
    const days = toDays(spaceDelimValues.slice(1).join(' ').trim())
    const year = toYear(month, days, startYear, endYear)
    return {
        month,
        days,
        year
    }
}

function parseYears(title) {
    if (!title) {
        return undefined
    }
    const years = title.split(/[-, ]/)
        .map(value => value.trim())
        .filter(value => !isNaN(parseInt(value)))
        .map(value => parseInt(value))
    return years.reduce((result, year) => {
        if (!result.startYear) {
            if (year > 2000) {
                return {
                    startYear: year,
                    endYear: year
                }
            }
        } else {
            if (year < 2000) {
                return {
                    ...result,
                    endYear: 2000 + year
                }
            }
            return {
                ...result,
                endYear: year
            }
        }
    }, {})
}

function parseTableToCalendarRecords(tableElement, startYear, endYear) {
    const captions = tableElement.children.filter(child => child.name === 'caption')
    const tbodies = tableElement.children.filter(child => child.name === 'tbody' && child.children.length > 0)
    const rows = tbodies.length === 0 ? [] : tbodies[0].children.filter(child => child.name === 'tr')
    
    const title = captions.length > 0 ? captions[0].children.filter(child => child.type === 'text').map(child => child.data).join(' ') : undefined
    const years = { startYear, endYear }
    const records = rows
        .map(row => row.children.filter(child => child.name === 'td'))
        .filter(cells => cells.length > 0)
        .map(cells => cells.reduce((record, cell) => {
            const dataLabel = cell.attribs['data-label']
            const value = cell.data ?? cell.children.filter(child => child.type === 'text').map(child => child.data).join(' ')
            switch(dataLabel) {
                case 'Event':
                    return {
                        ...record,
                        event: value
                    }
                case 'Date':
                    return {
                        ...record,
                        date: toMonthDaysYear(value, years.startYear, years.endYear),
                    }
                case 'Day of Week':
                    return {
                        ...record,
                        dow: value,
                    }
                default:
                    return {
                        ...record,
                        other: {
                            ...(record.other ?? {}),
                            [dataLabel]: value
                        }
                    }
            }
        }, {}))
        return {
            title,
            records
        }



}

export async function loadCalendarPage(url) {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);
    const pageTitle = $('#page-title');
    const fieldIntroduction = $('.field-introduction');
    const fieldBody = $('.field-body');
    if (fieldBody.length === 1) {
        const title = fieldIntroduction.length === 1
            ? fieldIntroduction.first().children().first().text()
            : pageTitle.text();
        const years = parseYears(title)
        const calendars = Array.from(fieldBody.first().find('table'))
            .map(tableElement => parseTableToCalendarRecords(tableElement, years.startYear, years.endYear));
        return {
            title,
            calendars
        };
    }
    return undefined;
}