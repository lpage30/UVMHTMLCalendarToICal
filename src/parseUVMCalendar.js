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
    ['september', 'sept.', 'sept', 'sep'],
    ['october', 'oct.', 'oct'],
    ['november', 'nov.', 'nov'],
    ['december', 'dec.', 'dec'],
]
function toMonthNumber(monthName) {
    const searchMonth = monthName.toLowerCase()
    const index = months.findIndex((monthNames => monthNames.includes(searchMonth)))
    return index >= 0 ? index + 1 : undefined
}
function toYear(month, days, startYear, endYear) {
    if (startYear === endYear) {
        return startYear
    }
    if (month === 8) {
        const oldestDay = days.slice(-1)[0]
        return oldestDay > 15 ?  startYear : endYear
    }
    return month > 8 ? startYear : endYear
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
    const month = toMonthNumber(spaceDelimValues[0].trim())
    const days = toDays(spaceDelimValues.slice(1).join(' ').trim())
    const year = toYear(month, days, startYear, endYear)
    return {
        month,
        days,
        year
    }
}

function parseYears(title) {
    if (!title || title.length === 0) {
        return undefined
    }
    const years = title.split(/[-, ]/)
        .map(value => value.trim())
        .filter(value => !isNaN(parseInt(value)))
        .map(value => parseInt(value))
    const result = years.reduce((result, year) => {
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
    return result.startYear ? result : undefined
}
function toUpdatedRecord(currentRecord, dataLabel, dataValue, years, cellIndex) {
    const dataType = (dataLabel.length === 0 || dataLabel.startsWith('Registration'))
        ? cellIndex === 0 ? 'Event' : 'Date'
        : dataLabel
    switch(dataType) {
        case 'Event':
            return {
                ...currentRecord,
                event: [ ...(currentRecord.event ?? []), ...dataValue]
            }
        case 'Date':
            const other = dataValue.length > 1
                ? {
                    dateDetails: dataValue.slice(1).join('\n')
                }
                : {};
            return {
                ...currentRecord,
                date: toMonthDaysYear(dataValue[0], years.startYear, years.endYear),
                other: {
                    ...(currentRecord.other ?? {}),
                    ...other
                }                
            }
        case 'Day of Week':
            return {
                ...currentRecord,
                dow: dataValue.join('\n'),
            }
        default:
            return {
                ...currentRecord,
                other: {
                    ...(currentRecord.other ?? {}),
                    [dataType]: dataValue.join('/n')
                }
            }
    }
}
function getTextsFromElement(element) {
    if (element.type === 'text') {
        return [element.data];
    }
    return element.children.flatMap(getTextsFromElement)
}
function getElementsOfHTMLTag(element, htmlTag) {
    if (element.name === htmlTag) {
        return [element]
    }
    return element.children.filter(child => child.name === htmlTag)
}

function parseTableToCalendarRecords(tableElement, calendarYears) {
    const captions = getElementsOfHTMLTag(tableElement, 'caption')
    const tbodies = getElementsOfHTMLTag(tableElement, 'tbody')
        .filter(body => body.children.length > 0)
    const rows = tbodies.length === 0
        ? [] 
        : getElementsOfHTMLTag(tbodies[0], 'tr')
    
    const title = captions.length > 0
        ? getTextsFromElement(captions[0]).join(' ')
        : undefined
    const years = calendarYears || parseYears(title)
    const records = rows
        .map(row => getElementsOfHTMLTag(row, 'td'))
        .filter(cells => cells.length > 0)
        .map(cells => cells.reduce((record, cell, index) => {
            const dataLabel = (cell.attribs['data-label'] ?? '').trim()
            const value = getTextsFromElement(cell)
            return toUpdatedRecord(record, dataLabel, value, years, index);
        }, {}))
        return {
            title,
            records
        }



}

export async function loadCalendarPage(url, calendarPageName) {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);
    const pageTitle = $('#page-title');
    const fieldIntroduction = $('.field-introduction');
    const fieldBody = $('.field-body');
    if (fieldBody.length === 1) {
        const fieldTitle = (fieldIntroduction.length === 1
            ? fieldIntroduction.first().children().first().text()
            : pageTitle.text()).trim();
        const title = fieldTitle && fieldTitle.length > 0 ? fieldTitle : calendarPageName
        const years = parseYears(title)
        const calendars = Array.from(fieldBody.first().find('table'))
            .map(tableElement => parseTableToCalendarRecords(tableElement, years));
        return {
            title,
            calendars
        };
    }
    return undefined;
}