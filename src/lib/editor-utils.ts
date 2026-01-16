import { type Project } from './types'

export interface EventItem {
  id: string
  title: string
  date: string
  time: string
  webSaleDate: string
  counterSaleDate: string
  ticketLink: string
  detailLink: string
}

export interface ScheduleItem {
  id: string
  title: string
  date: string
  time: string
  isClosed: boolean
}

// Helper to generate unique IDs
const generateId = () => Math.random().toString(36).substring(2, 9)

export function parseEvents(html: string): EventItem[] {
  const events: EventItem[] = []
  
  // Create a temporary DOM parser
  // Since we are server-side or generic, we might need regex if DOM isn't available, 
  // but looking at the task, we are in a Next.js Client Component so we can use DOMParser in browser.
  // However, for safety in this utility file which might be imported purely, regex is often safer/easier for simple scraping unless we use a library like cheerio.
  // Given the constraints and typical Next.js usage, I'll stick to robust Regex or string manipulation for this specific strict format.
  
  // Strategy: Split by <div class="event-in">
  // NOTE: This relies on the specific formatting provided by the user.
  
  // Strategy: Split by <div class="event-in">
  // NOTE: This relies on the specific formatting provided by the user.
  
  const eventRegex = new RegExp('<div class="event-in">\\s*<h3>(.*?)<\\/h3>\\s*<div class="event-in-flex">\\s*<div>(.*?)<\\/div>\\s*<div class="event_btns">(.*?)<\\/div>\\s*<\\/div>\\s*<\\/div>', 'gs')
  
  // We'll use a safer approach: DOMParser if window is defined (browser), else simple regex fallback?
  // Since this is for the Editor (Client Component), we can assume browser environment or pass it to a parsing function.
  // Let's use Regex for portability in this file.
  
  // Extract all event-in blocks (excluding the first check-only "event-in" which had different structure in the example?
  // The example first "event-in" had a different structure (pdf link).
  // The user asked for "Event Info" which looks like the 2nd and 3rd blocks in the example.
  // "新春にしきの亭" structure.
  
  // Regex to match the standard event structure
  const blockRegex = new RegExp('<div class="event-in">\\s*<h3>(.*?)<\\/h3>\\s*<div class="event-in-flex">\\s*<div>\\s*(.*?)\\s*<\\/div>\\s*<div class="event_btns">\\s*(.*?)\\s*<\\/div>\\s*<\\/div>\\s*<\\/div>', 'gs')
  
  let match
  while ((match = blockRegex.exec(html)) !== null) {
    const [fullMatch, titleHtml, infoHtml, btnsHtml] = match
    
    // Clean title (remove brs or handle them)
    // The user example has <br> in title.
    const title = titleHtml.replace(/<br>/g, '\n').trim()
    
    // Parse info (dates)
    // <p>日時：２０２６年１月１８日（日）</p>
    const dateMatch = infoHtml.match(/<p>日時：(.*?)<\/p>/)
    const timeMatch = infoHtml.match(/<p>([^日]*?開演.*?開場.*?)<\/p>/) // Try to match the time line
    const webSaleMatch = infoHtml.match(/<p>ＷＥＢ販売：(.*?)<\/p>/)
    const counterSaleMatch = infoHtml.match(/<p>窓口発売日：(.*?)<\/p>/)
    
    // Parse buttons
    const ticketMatch = btnsHtml.match(/<a href="(.*?)">チケットを買う/)
    const detailMatch = btnsHtml.match(/<a href="(.*?)">詳しく見る/)
    
    events.push({
      id: generateId(),
      title,
      date: dateMatch ? dateMatch[1] : '',
      time: timeMatch ? timeMatch[1] : '',
      webSaleDate: webSaleMatch ? webSaleMatch[1] : '',
      counterSaleDate: counterSaleMatch ? counterSaleMatch[1] : '',
      ticketLink: ticketMatch ? ticketMatch[1] : '',
      detailLink: detailMatch ? detailMatch[1] : ''
    })
  }
  
  return events
}

export function generateEventsHtml(originalHtml: string, events: EventItem[]): string {
  // We need to verify where to insert the generated HTML.
  // We should replace the EXISTING event blocks with the NEW ones.
  // But there might be other content (like the "Goalden Week" notice or the top "Stop Ticket Sending" block).
  // Strategy: Find the section marked `<!--　イベント情報　内容　ここからdivごとに増やす　-->` 
  // and `<!--　イベント情報　ここまで　-->`.
  
  const startMarker = '<!--　イベント情報　内容　ここからdivごとに増やす　-->'
  const endMarker = '<!--　イベント情報　ここまで　-->'
  
  const startIndex = originalHtml.indexOf(startMarker)
  const endIndex = originalHtml.indexOf(endMarker)
  
  if (startIndex === -1 || endIndex === -1) return originalHtml
  
  const newHtmlParts = events.map(e => {
    return `
                    <div class="event-in">
                        <h3>${e.title.replace(/\n/g, '<br>')}</h3>
                        <div class="event-in-flex">
                            <div>
                                <p>日時：${e.date}</p>
                                <p>${e.time}</p>
                                <p>ＷＥＢ販売：${e.webSaleDate}</p>
                                <p>窓口発売日：${e.counterSaleDate}</p>
                            </div>
                            <div class="event_btns">
                                <div class="btn btn_bottom">
                                    <a href="${e.ticketLink}">チケットを買う<span></span></a>
                                </div>
                                <div class="btn" style="margin-bottom: 25px;">
                                    <a href="${e.detailLink}">詳しく見る<span></span></a>
                                </div>
                            </div>
                        </div>
                    </div>`
  })
  
  // Join with newlines for readability
  const newContent = '\n\n' + newHtmlParts.join('\n') + '\n\n                    '
  
  return originalHtml.substring(0, startIndex + startMarker.length) + 
         newContent + 
         originalHtml.substring(endIndex)
}

export function parseSchedule(html: string): ScheduleItem[] {
  const items: ScheduleItem[] = []
  
  // Regex for year-event-text
  // <div class="year-event-text">
  //     <h5>「ピアノ公開試弾会」</h5>
  //     <p>２０２５年４月５日（土）・６日（日）<br>
  //         ９：００～１７：００
  //     </p>
  //     <p class="close">終了しました</p>
  // </div>
  
  const blockRegex = new RegExp('<div class="year-event-text">\\s*<h5>(.*?)<\\/h5>\\s*<p>(.*?)<\\/p>(\\s*<p class="close">終了しました<\\/p>)?\\s*<\\/div>', 'gs')
  
  let match
  while ((match = blockRegex.exec(html)) !== null) {
    const [_, title, dateTimeHtml, closeHtml] = match
    
    // Split date and time by <br> or just take simple text
    // dateTimeHtml usually: "Date<br>\nTime"
    const parts = dateTimeHtml.split('<br>')
    const date = parts[0] ? parts[0].trim() : ''
    const time = parts.length > 1 ? parts.slice(1).join(' ').trim() : ''
    
    items.push({
      id: generateId(),
      title: title.trim(),
      date,
      time: time.replace(/\n/g, ''),
      isClosed: !!closeHtml
    })
  }
  
  return items
}

export function generateScheduleHtml(originalHtml: string, items: ScheduleItem[]): string {
    const startMarker = '<!--　年間イベント　内容　ここからdivごとに増やす　-->'
    const endMarker = '<!--　年間イベント　内容　ここまでdivごとに増やす　-->'
    
    const startIndex = originalHtml.indexOf(startMarker)
    const endIndex = originalHtml.indexOf(endMarker)
    
    if (startIndex === -1 || endIndex === -1) return originalHtml
    
    const newHtmlParts = items.map(item => {
        const closeTag = item.isClosed ? '\n                        <p class="close">終了しました</p>' : ''
        return `                    <div class="year-event-text">
                        <h5>${item.title}</h5>
                        <p>${item.date}<br>
                            ${item.time}
                        </p>${closeTag}
                    </div>`
    })
    
    const newContent = '\n' + newHtmlParts.join('\n') + '\n                    '
    
    return originalHtml.substring(0, startIndex + startMarker.length) + 
           newContent + 
           originalHtml.substring(endIndex)
}
