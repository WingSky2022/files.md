const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'web', 'chat.js');
let content = fs.readFileSync(filePath, 'utf-8');

const startMarker = '    // add own class every other message\r\n';
const endMarker = '    `).join(\'\');\r\n\r\n    attachEventListeners();';

const startIdx = content.indexOf(startMarker);
if (startIdx === -1) {
    console.error('Start marker not found');
    process.exit(1);
}
const endIdx = content.indexOf(endMarker, startIdx);
if (endIdx === -1) {
    console.error('End marker not found');
    process.exit(1);
}

const replacement = `    // Reuse existing DOM nodes to avoid slideIn flash on existing messages
    const fragment = document.createDocumentFragment();
    const existingMap = new Map();
    chat.querySelectorAll('.message').forEach(msg => {
        const key = msg.dataset.timestamp + '::' + msg.dataset.text;
        existingMap.set(key, msg);
    });

    sorted.forEach((message, i) => {
        const key = message.timestamp + '::' + message.text;
        let msg = existingMap.get(key);
        const cls = \`message \${i % 2 === 1 ? 'own' : ''}\${message.done ? ' completed' : ''}\`;
        const html = \`
            <button class="complete-btn" title="Mark as done">
                <svg width="22" height="22" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6.5 17l6 6 13-13"/>
                </svg>
            </button>
            <button class="copy-btn" title="Copy">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 4v12a2 2 0 002 2h8a2 2 0 002-2V7.242a2 2 0 00-.602-1.43L16.083 2.57A2 2 0 0014.685 2H10a2 2 0 00-2 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M16 18v2a2 2 0 01-2 2H6a2 2 0 01-2-2V9a2 2 0 012-2h2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </button>
            <div class="message-content"
                 data-text="\${escapeHtml(message.text)}"
                 spellcheck="false">\${escapeHtml(message.text)}</div>
            <div class="message-footer">
                <span class="message-time">\${message.timestamp}</span>
                <div class="message-actions">
                    \${recentFilesButtons}
                    <div class="btn-wrapper">
                        <button class="action-btn to-file-btn" data-text="\${escapeHtml(message.text)}">
                            <?xml version="1.0" encoding="utf-8"?>
                            <svg width="32px" height="32px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M13 3H8.2C7.0799 3 6.51984 3 6.09202 3.21799C5.71569 3.40973 5.40973 3.71569 5.21799 4.09202C5 4.51984 5 5.0799 5 6.2V17.8C5 18.9201 5 19.4802 5.21799 19.908C5.40973 20.2843 5.71569 20.5903 6.09202 20.782C6.51984 21 7.0799 21 8.2 21H12M13 3L19 9M13 3V7.4C13 7.96005 13 8.24008 13.109 8.45399C13.2049 8.64215 13.3578 8.79513 13.546 8.89101C13.7599 9 14.0399 9 14.6 9H19M19 9V12M17 19H21M19 17V21" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                            </svg>
                        </button>
                    <span class="btn-label">To File</span>
                    </div>
                    
                    <div class="btn-wrapper">
                        <button class="action-btn to-journal-btn" data-text="\${escapeHtml(message.text)}">
                            <svg width="32px" height="32px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path fill-rule="evenodd" clip-rule="evenodd" d="M12 6.00019C10.2006 3.90317 7.19377 3.2551 
                                4.93923 5.17534C2.68468 7.09558 2.36727 10.3061 4.13778 12.5772C5.60984 14.4654 10.0648 
                                18.4479 11.5249 19.7369C11.6882 19.8811 11.7699 19.9532 11.8652 19.9815C11.9483 20.0062 
                                12.0393 20.0062 12.1225 19.9815C12.2178 19.9532 12.2994 19.8811 12.4628 19.7369C13.9229 
                                18.4479 18.3778 14.4654 19.8499 12.5772C21.6204 10.3061 21.3417 7.07538 19.0484 
                                5.17534C16.7551 3.2753 13.7994 3.90317 12 6.00019Z" 
                                stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                            </svg>
                        </button>
                        <span class="btn-label">To Journal</span>
                    </div>
 
                    <div class="btn-wrapper">
                        <button class="action-btn to-checklist-btn" data-checklist="Later.md">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 32 32">
                                <circle cx="16" cy="16" r="13" stroke-width="2" style="fill: none !important;"/>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 8v8l4 4"/>
                            </svg>
                        </button>
                        <span class="btn-label">To Later</span>
                    </div>

                    <div class="btn-wrapper">
                        <button class="action-btn to-checklist-btn" data-checklist="Read.md">
                            <?xml version="1.0" encoding="utf-8"?>
                            <svg width="32px" height="32px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M4 19V6.2C4 5.0799 4 4.51984 4.21799 4.09202C4.40973 3.71569 4.71569 3.40973 5.09202 3.21799C5.51984 3 6.0799 3 7.2 3H16.8C17.9201 3 18.4802 3 18.908 3.21799C19.2843 3.40973 19.5903 3.71569 19.782 4.09202C20 4.51984 20 5.0799 20 6.2V17H6C4.89543 17 4 17.8954 4 19ZM4 19C4 20.1046 4.89543 21 6 21H20M9 7H15M9 11H15M19 17V21"  stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                            </svg>
                        </button>
                        <span class="btn-label">To Read</span>
                    </div>
                    
                    <div class="btn-wrapper">
                        <button class="action-btn to-checklist-btn" data-checklist="Shop.md">
                            <?xml version="1.0" encoding="utf-8"?>
                            <svg width="32px" height="32px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path clip-rule="evenodd" d="M2 1C1.44772 1 1 1.44772 1 2C1 2.55228 1.44772 3 2 3H3.21922L6.78345 17.2569C5.73276 17.7236 5 18.7762 5 20C5 21.6569 6.34315 23 8 23C9.65685 23 11 21.6569 11 20C11 19.6494 10.9398 19.3128 10.8293 19H15.1707C15.0602 19.3128 15 19.6494 15 20C15 21.6569 16.3431 23 18 23C19.6569 23 21 21.6569 21 20C21 18.3431 19.6569 17 18 17H8.78078L8.28078 15H18C20.0642 15 21.3019 13.6959 21.9887 12.2559C22.6599 10.8487 22.8935 9.16692 22.975 7.94368C23.0884 6.24014 21.6803 5 20.1211 5H5.78078L5.15951 2.51493C4.93692 1.62459 4.13696 1 3.21922 1H2ZM18 13H7.78078L6.28078 7H20.1211C20.6742 7 21.0063 7.40675 20.9794 7.81078C20.9034 8.9522 20.6906 10.3318 20.1836 11.3949C19.6922 12.4251 19.0201 13 18 13ZM18 20.9938C17.4511 20.9938 17.0062 20.5489 17.0062 20C17.0062 19.4511 17.4511 19.0062 18 19.0062C18.5489 19.0062 18.9938 19.4511 18.9938 20C18.9938 20.5489 18.5489 20.9938 18 20.9938ZM7.00617 20C7.00617 20.5489 7.45112 20.9938 8 20.9938C8.54888 20.9938 8.99383 20.5489 8.99383 20C8.99383 19.4511 8.54888 19.0062 8 19.0062C7.45112 19.0062 7.00617 19.4511 7.00617 20Z" stroke="none"/>
                            </svg>
                        </button>
                    <span class="btn-label">To Shop</span>
                    </div>
                    
                    <div class="btn-wrapper">
                    <button class="action-btn to-checklist-btn" data-index="\${message.index}" data-checklist="Watch.md">
                        <?xml version="1.0" encoding="utf-8"?>
                        <svg fill="var(--col-link)" stroke="none" width="32px" height="32px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M18,6H14.41l2.3-2.29a1,1,0,1,0-1.42-1.42L12,5.54l-1.17-2a1,1,0,1,0-1.74,1L10,6H6A3,3,0,0,0,3,9v8a3,3,0,0,0,3,3v1a1,1,0,0,0,2,0V20h8v1a1,1,0,0,0,2,0V20a3,3,0,0,0,3-3V9A3,3,0,0,0,18,6Zm1,11a1,1,0,0,1-1,1H6a1,1,0,0,1-1-1V9A1,1,0,0,1,6,8H18a1,1,0,0,1,1,1Z" stroke="none"/></svg>
                    </button>                    
                        <span class="btn-label">To Watch</span>
                    </div>
                   
                    <div class="btn-wrapper">
                        <button class="action-btn to-archive-btn" data-dir="archive">
                            <?xml version="1.0" encoding="utf-8"?>
                            <svg width="32px" height="32px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M21 8V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                                <path d="M23 5H1V8H23V5Z" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                                <path d="M10 12H14" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                            </svg>
                        </button>
                        <span class="btn-label">To Archive</span>
                    </div>

                    <div class="btn-wrapper">
                        <button class="action-btn delete-btn">
                            <?xml version="1.0" encoding="utf-8"?>
                            <svg width="32px" height="32px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M20.5001 7H3.5" stroke-width="1.5" stroke-linecap="round" fill="none"/>
                                <path d="M18.8332 8.5L18.3732 15.3991C18.1962 18.054 18.1077 19.3815 17.2427 20.1907C16.3777 21 15.0473 21 12.3865 21H11.6132C8.95235 21 7.62195 21 6.75694 20.1907C5.89194 19.3815 5.80344 18.054 5.62644 15.3991L5.1665 8.5" stroke-width="1.5" stroke-linecap="round" fill="none"/>
                                <path d="M6.5 6C6.55588 6 6.58382 6 6.60915 5.99936C7.43259 5.97849 8.15902 5.45491 8.43922 4.68032C8.44784 4.65649 8.45667 4.62999 8.47434 4.57697L8.57143 4.28571C8.65431 4.03708 8.69575 3.91276 8.75071 3.8072C8.97001 3.38607 9.37574 3.09364 9.84461 3.01877C9.96213 3 10.0932 3 10.3553 3H13.6447C13.9068 3 14.0379 3 14.1554 3.01877C14.6243 3.09364 15.03 3.38607 15.2493 3.8072C15.3043 3.91276 15.3457 4.03708 15.4286 4.28571L15.5257 4.57697C15.5433 4.62992 15.5522 4.65651 15.5608 4.68032C15.841 5.45491 16.5674 5.97849 17.3909 5.99936C17.4162 6 17.4441 6 17.5 6" stroke-width="1.5" fill="none"/>
                            </svg>
                        </button>
                        <span class="btn-label">Delete</span>
                    </div>
                </div>
            </div>
        \`;

        if (msg) {
            existingMap.delete(key);
            msg.className = cls;
            msg.style.animation = '';
            msg.style.transform = '';
            msg.style.transition = '';
        } else {
            msg = document.createElement('div');
            msg.className = cls;
            msg.dataset.text = message.text;
            msg.dataset.timestamp = message.timestamp;
        }
        msg.innerHTML = html;
        fragment.appendChild(msg);
    });

    // Remove stale messages that are no longer in the list
    existingMap.forEach(msg => msg.remove());

    if (chat.querySelector('.empty-state')) {
        chat.innerHTML = '';
    }
    chat.appendChild(fragment);
`;

const newContent = content.slice(0, startIdx) + replacement + content.slice(endIdx + endMarker.length);
fs.writeFileSync(filePath, newContent);
console.log('renderMessages replaced');
