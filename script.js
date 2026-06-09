// Стилизиране за Светла и Тъмна тема в едно чрез Tailwind класове
const seriesStyles = {
    "Formula 1": "bg-red-500 text-white border-red-600 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30",
    "Formula 2": "bg-blue-600 text-white border-blue-700 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30",
    "Formula 3": "bg-emerald-600 text-white border-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30",
    "Formula E": "bg-cyan-500 text-white border-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/30",
    "WRC": "bg-amber-500 text-slate-950 border-amber-600 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30",
    "MotoGP": "bg-pink-600 text-white border-pink-700 dark:bg-pink-600/10 dark:text-pink-400 dark:border-pink-500/30",
    "Moto2": "bg-purple-600 text-white border-purple-700 dark:bg-purple-600/10 dark:text-purple-400 dark:border-purple-500/30",
    "Moto3": "bg-indigo-600 text-white border-indigo-700 dark:bg-indigo-600/10 dark:text-indigo-400 dark:border-indigo-500/30"
};

let allEvents = [];
let activeFilters = new Set();
let searchQuery = "";
let selectedDateStr = null; // За филтриране от мини календара
let countdownInterval;

// ПРОМЕНЛИВИ ЗА СЕДМИЧНО ФИЛТРИРАНЕ
let currentWeekMonday = null;       // Понеделникът на седмицата, която гледаме в момента
let realCurrentWeekMonday = null;   // Реалният текущ понеделник (за да крием минали седмици)

document.addEventListener("DOMContentLoaded", () => {
    // Инициализация на Тъмна/Светла тема
    setupTheme();

    fetch('events.json')
        .then(res => res.json())
        .then(data => {
            allEvents = data;
            
            // Инициализиране на текущата седмица спрямо системното време
            realCurrentWeekMonday = getMonday(new Date());
            currentWeekMonday = new Date(realCurrentWeekMonday);

            const uniqueSeries = [...new Set(data.map(e => e.series))];
            uniqueSeries.forEach(series => activeFilters.add(series));
            
            renderFilters(uniqueSeries);
            calculateNextSession(data);
            renderMiniCalendar(data);
            updateDashboard();

            // Слушатели за седмичната навигация (Стрелки)
            document.getElementById('prev-week-btn').addEventListener('click', () => {
                const prevMonday = new Date(currentWeekMonday);
                prevMonday.setDate(prevMonday.getDate() - 7);
                // Позволява връщане назад само до текущата седмица (миналите изчезват)
                if (prevMonday >= realCurrentWeekMonday) {
                    currentWeekMonday = prevMonday;
                    updateDashboard();
                }
            });

            document.getElementById('next-week-btn').addEventListener('click', () => {
                currentWeekMonday.setDate(currentWeekMonday.getDate() + 7);
                updateDashboard();
            });

            // Търсачка слушател
            document.getElementById('search-input').addEventListener('input', (e) => {
                searchQuery = e.target.value.toLowerCase();
                updateDashboard();
            });

            // Изчистване на филтъра по дата
            document.getElementById('reset-date-filter').addEventListener('click', () => {
                selectedDateStr = null;
                document.getElementById('reset-date-filter').classList.add('hidden');
                document.getElementById('active-day-indicator').classList.add('hidden');
                document.querySelectorAll('.calendar-day-btn').forEach(b => b.classList.remove('bg-red-500', 'text-white'));
                updateDashboard();
            });
        })
        .catch(err => {
            document.getElementById('calendar-container').innerHTML = `<div class="text-red-500 text-center font-bold py-8">Грешка: ${err.message}</div>`;
        });
});

// ================= БУТОН ЗА ТЕМА (DARK MODE TOGGLE) =================
function setupTheme() {
    const toggleBtn = document.getElementById('theme-toggle');
    toggleBtn.addEventListener('click', () => {
        if (document.documentElement.classList.contains('dark')) {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        } else {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        }
    });
}

// ================= ЖИВ ТАЙМЕР ЗА ОБРАТНО БРОЕНЕ =================
function calculateNextSession(events) {
    const now = new Date();
    const nextEvent = events.find(e => new Date(e.start) > now);

    if (nextEvent) {
        const targetDate = new Date(nextEvent.start);
        document.getElementById('next-title').textContent = nextEvent.title;
        document.getElementById('next-series-badge').textContent = nextEvent.series;
        document.getElementById('next-location').textContent = `📍 ${nextEvent.location}`;
        document.getElementById('next-time').textContent = targetDate.toLocaleDateString('bg-BG', {weekday: 'long', day: 'numeric', month: 'short'}) + ` в ${targetDate.toLocaleTimeString('bg-BG', {hour: '2-digit', minute: '2-digit'})} ч.`;
        
        if (countdownInterval) clearInterval(countdownInterval);
        startCountdown(targetDate);
    } else {
        document.getElementById('next-title').textContent = "Няма предстоящи състезания";
        document.getElementById('countdown-box').style.display = 'none';
    }
}

function startCountdown(targetDate) {
    function updateTimer() {
        const now = new Date().getTime();
        const difference = targetDate.getTime() - now;

        if (difference < 0) {
            clearInterval(countdownInterval);
            document.getElementById('countdown-box').innerHTML = "<span class='text-xs font-bold text-emerald-500 p-2 animate-pulse'>🏁 СЕСИЯТА СТАРТИРА!</span>";
            return;
        }

        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        document.getElementById('cd-days').textContent = days.toString().padStart(2, '0');
        document.getElementById('cd-hours').textContent = hours.toString().padStart(2, '0');
        document.getElementById('cd-mins').textContent = minutes.toString().padStart(2, '0');
        document.getElementById('cd-secs').textContent = seconds.toString().padStart(2, '0');
    }
    updateTimer();
    countdownInterval = setInterval(updateTimer, 1000);
}

// ================= ГЕНЕРИРАНЕ НА МИНИ МЕСЕЧЕН КАЛЕНДАР =================
function renderMiniCalendar(events) {
    const calendarDaysContainer = document.getElementById('mini-calendar-days');
    if(!calendarDaysContainer) return;
    calendarDaysContainer.innerHTML = '';

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); 

    const monthNames = ["Януари", "Февруари", "Март", "Април", "Май", "Юни", "Юли", "Август", "Септември", "Октомври", "Ноември", "Декември"];
    const monthLabel = document.getElementById('calendar-month-label');
    if (monthLabel) {
        monthLabel.textContent = `${monthNames[month]} ${year}`;
    }

    const firstDay = new Date(year, month, 1).getDay();
    const blanks = firstDay === 0 ? 6 : firstDay - 1; 

    // Запълване на празните квадратчета до Понеделник
    for (let i = 0; i < blanks; i++) {
        const blankDiv = document.createElement('div');
        calendarDaysContainer.appendChild(blankDiv);
    }

    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
        const currentLoopDate = new Date(year, month, day);
        const currentLoopDateStr = currentLoopDate.toDateString();
        const hasRace = events.some(e => new Date(e.start).toDateString() === currentLoopDateStr);

        const dayBtn = document.createElement('button');
        dayBtn.textContent = day;
        dayBtn.className = `calendar-day-btn p-2 rounded-lg font-semibold relative text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition text-center flex flex-col items-center justify-center gap-0.5`;

        // Ако седмицата на този ден е отминала, той "изчезва" (става некликам)
        const loopWeekMonday = getMonday(currentLoopDate);
        if (loopWeekMonday < realCurrentWeekMonday) {
            dayBtn.classList.add('opacity-20', 'pointer-events-none');
        }

        if (hasRace) {
            const dot = document.createElement('span');
            dot.className = "w-1 h-1 bg-red-500 rounded-full block";
            dayBtn.appendChild(dot);
        }

        dayBtn.addEventListener('click', () => {
            document.querySelectorAll('.calendar-day-btn').forEach(b => b.classList.remove('bg-red-500', 'text-white'));
            dayBtn.classList.add('bg-red-500', 'text-white');
            selectedDateStr = currentLoopDateStr;
            
            // Автоматично синхронизира и превключва на седмицата на кликнатия ден
            currentWeekMonday = loopWeekMonday;
            
            document.getElementById('reset-date-filter').classList.remove('hidden');
            document.getElementById('active-day-indicator').classList.remove('hidden');
            updateDashboard();
        });

        calendarDaysContainer.appendChild(dayBtn);
    }
}

// ================= БУТОНИ ЗА КАНАЛИ =================
function renderFilters(seriesList) {
    const filterContainer = document.getElementById('filter-buttons');
    filterContainer.innerHTML = '';
    seriesList.forEach(series => {
        const btn = document.createElement('button');
        btn.textContent = series;
        btn.className = `px-4 py-2 rounded-xl text-xs font-bold border transition duration-150`;
        updateButtonState(btn, series);
        btn.addEventListener('click', () => {
            if (activeFilters.has(series)) activeFilters.delete(series)
            else activeFilters.add(series);
            updateButtonState(btn, series);
            updateDashboard();
        });
        filterContainer.appendChild(btn);
    });
}

function updateButtonState(button, series) {
    if (activeFilters.has(series)) {
        button.className = `px-4 py-2 rounded-xl text-xs font-bold border bg-slate-950 dark:bg-white border-slate-950 dark:border-white text-white dark:text-zinc-950 shadow-sm`;
    } else {
        button.className = `px-4 py-2 rounded-xl text-xs font-bold border bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800`;
    }
}

// ================= ОБНОВЯВАНЕ И СИНХРОНИЗАЦИЯ НА ТАБЛОТО =================
function updateDashboard() {
    // 1. Обновяване на състоянието на бутоните за седмична навигация и заглавието им
    if (currentWeekMonday && realCurrentWeekMonday) {
        const sunday = new Date(currentWeekMonday);
        sunday.setDate(currentWeekMonday.getDate() + 6);
        
        document.getElementById('current-week-label').textContent = 
            `Седмица: ${currentWeekMonday.toLocaleDateString('bg-BG', {day: 'numeric', month: 'short'})} – ${sunday.toLocaleDateString('bg-BG', {day: 'numeric', month: 'short'})}`;
        
        // Деактивира стрелката назад, ако сме в текущата седмица (миналото изчезва)
        document.getElementById('prev-week-btn').disabled = 
            (currentWeekMonday.toDateString() === realCurrentWeekMonday.toDateString());
    }

    // 2. Филтриране на събитията по общите критерии + критерия за ТЕКУЩАТА ИЗБРАНА СЕДМИЦА
    const filteredEvents = allEvents.filter(e => {
        const eventDate = new Date(e.start);
        
        const matchesFilter = activeFilters.has(e.series);
        const matchesSearch = e.title.toLowerCase().includes(searchQuery) || 
                              e.location.toLowerCase().includes(searchQuery) || 
                              e.series.toLowerCase().includes(searchQuery);
        const matchesCalendarClick = selectedDateStr ? eventDate.toDateString() === selectedDateStr : true;

        // Валидация дали събитието попада в избрания 7-дневен прозорец
        const startOfWeek = new Date(currentWeekMonday);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 7);

        const matchesWeek = eventDate >= startOfWeek && eventDate < endOfWeek;

        return matchesFilter && matchesSearch && matchesCalendarClick && matchesWeek;
    });

    // ХРОНОЛОГИЧНО СОРТИРАНЕ: От най-ранен час към най-късен час независимо от сесията
    filteredEvents.sort((a, b) => new Date(a.start) - new Date(b.start));
    
    const todayStr = new Date().toDateString();
    const todayCount = allEvents.filter(e => new Date(e.start).toDateString() === todayStr).length;
    document.getElementById('stats-today').textContent = `${todayCount} СЕСИИ ДНЕС`;

    const groupedByWeek = groupEventsByWeek(filteredEvents);
    renderCalendar(groupedByWeek);
}

function getMonday(d) {
    d = new Date(d);
    d.setHours(0,0,0,0); // Изчистване на часовете за точно сравнение
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    monday.setHours(0,0,0,0);
    return monday;
}

function groupEventsByWeek(events) {
    const weeks = {};
    events.forEach(event => {
        const eventDate = new Date(event.start);
        const monday = getMonday(eventDate);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        
        const weekLabel = `Седмица: ${monday.toLocaleDateString('bg-BG', {day: 'numeric', month: 'short'})} – ${sunday.toLocaleDateString('bg-BG', {day: 'numeric', month: 'short'})}`;

        if (!weeks[weekLabel]) weeks[weekLabel] = [];
        weeks[weekLabel].push(event);
    });
    return weeks;
}

// ================= ГЕНЕРИРАНЕ НА ПЛОЧКИТЕ =================
function renderCalendar(weeks) {
    const container = document.getElementById('calendar-container');
    container.innerHTML = '';

    const keys = Object.keys(weeks);
    if (keys.length === 0) {
        container.innerHTML = '<div class="text-center text-slate-400 dark:text-zinc-500 py-12 font-medium">Няма намерени сесии за тази седмица по избраните критерии.</div>';
        return;
    }

    keys.forEach(weekLabel => {
        const weekSection = document.createElement('div');
        weekSection.className = 'space-y-4';
        
        weekSection.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
        `;

        const gridContainer = weekSection.querySelector('div');

        weeks[weekLabel].forEach(event => {
            const date = new Date(event.start);
            const now = new Date();
            
            const eventDuration = 2 * 60 * 60 * 1000; 
            const isLive = now >= date && now < (date.getTime() + eventDuration);

            const dayName = date.toLocaleDateString('bg-BG', { weekday: 'long' });
            const dateStr = date.toLocaleDateString('bg-BG', { day: 'numeric', month: 'short' });
            const timeStr = date.toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit' });
            const badgeColor = seriesStyles[event.series] || "bg-slate-500 text-white";

            let statusBadgeHtml = `<span class="text-xl font-mono font-extrabold text-red-500 dark:text-red-400">${timeStr} ч.</span>`;
            let liveCardBorderClass = "border-slate-200/70 dark:border-zinc-800/80";
            
            if (isLive) {
                statusBadgeHtml = `
                    <span class="flex items-center gap-1.5 text-xs font-black text-red-600 dark:text-red-400 animate-pulse bg-red-50 dark:bg-red-500/10 px-2 py-1 rounded-md border border-red-200 dark:border-red-500/20">
                        <span class="w-2 h-2 bg-red-600 dark:bg-red-400 rounded-full"></span> НА ЖИВО В МОМЕНТА
                    </span>
                `;
                liveCardBorderClass = "border-red-500 dark:border-red-500 ring-2 ring-red-500/20";
            }

            const tile = `
                <div class="bg-white dark:bg-zinc-900 p-6 rounded-2xl border ${liveCardBorderClass} shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-zinc-700 transition duration-200 flex flex-col justify-between min-h-[200px]">
                    
                    <div class="flex justify-between items-start gap-2">
                        <span class="px-2.5 py-0.5 rounded text-[10px] font-extrabold tracking-wider uppercase border ${badgeColor}">
                            ${event.series}
                        </span>
                        <div class="text-right text-xs font-bold text-slate-400 dark:text-zinc-500 capitalize">
                            ${dayName}, ${dateStr}
                        </div>
                    </div>

                    <div class="my-4">
                        <h5 class="text-lg font-extrabold text-slate-950 dark:text-white tracking-tight leading-snug">${event.title}</h5>
                        <p class="text-xs text-slate-400 dark:text-zinc-500 font-medium mt-1">📍 ${event.location}</p>
                    </div>

                    <div class="border-t border-slate-50 dark:border-zinc-800/60 pt-3 flex justify-between items-center">
                        <span class="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">СТАРТ</span>
                        ${statusBadgeHtml}
                    </div>
                </div>
            `;
            gridContainer.innerHTML += tile;
        });

        container.appendChild(weekSection);
    });
}