// Todo App - 모든 기능을 포함한 완전한 구현

// 전역 변수
let todos = [];
let currentFilter = 'all'; // 'all', 'active', 'completed'

// 캘린더 관련 전역 변수
let currentDate = new Date();
let selectedDate = null;
let selectedTime = null;
let calendarModal = null;
let editingTodoId = null; // 편집 중인 할 일 ID

// 중요도 관련 전역 변수
let selectedPriority = 'medium'; // 기본값: 보통

// 캘린더 뷰 관련 전역 변수
let calendarViewModal = null;
let currentCalendarView = 'month'; // 'month', 'week', 'day', 'week-time', 'day-time'
let currentCalendarDate = new Date();

// DOM이 로드되면 초기화
document.addEventListener('DOMContentLoaded', function() {
    loadTodos();
    renderTodos();
    updateStats();
    setupEventListeners();
    initializeCalendar();
    initializePriority();
    initializeCalendarView();
});

// 이벤트 리스너 설정
function setupEventListeners() {
    // Enter 키로 할 일 추가
    const todoInput = document.getElementById('todo');
    if (todoInput) {
        todoInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                addTodo();
            }
        });
    }
}

// 할 일 추가 - 강화된 로직
function addTodo() {
    const todoInput = document.getElementById('todo');
    const todo = todoInput.value.trim();

    if (!todo) {
        alert('할 일을 입력해주세요.');
        todoInput.focus();
        return;
    }

    // 마감일 정보 확인 및 정리
    let dueDate = null;
    let dueTime = null;
    
    if (selectedDate && selectedDate.trim() !== '') {
        dueDate = selectedDate.trim();
    }
    
    if (selectedTime && selectedTime.trim() !== '') {
        dueTime = selectedTime.trim();
    }

    // 새 할 일 객체 생성
    const newTodo = {
        id: Date.now(),
        text: todo,
        completed: false,
        createdAt: new Date().toISOString(),
        dueDate: dueDate,
        dueTime: dueTime,
        priority: selectedPriority || 'medium'
    };

    todos.push(newTodo);
    saveTodos();
    renderTodos();
    updateStats();
    todoInput.value = '';
    
    // 할 일 추가 후 마감일 정보 초기화
    clearSelectedDateTime();
    resetPriority();
    todoInput.focus();
}

// 할 일 완료/미완료 토글
function toggleTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (todo) {
        todo.completed = !todo.completed;
        saveTodos();
        renderTodos();
        updateStats();
    }
}

// 할 일 삭제
function deleteTodo(id) {
    if (confirm('정말 삭제하시겠습니까?')) {
        todos = todos.filter(t => t.id !== id);
        saveTodos();
        renderTodos();
        updateStats();
    }
}

// 할 일 편집
function editTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    const newText = prompt('할 일을 수정하세요:', todo.text);
    if (newText !== null && newText.trim() !== '') {
        todo.text = newText.trim();
        saveTodos();
        renderTodos();
    }
}

// 마감일 편집
function editDueDate(id) {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    // 편집 모드 설정
    editingTodoId = id;
    
    // 기존 마감일 정보 로드
    if (todo.dueDate) {
        selectedDate = todo.dueDate;
        const date = new Date(todo.dueDate);
        currentDate = new Date(date.getFullYear(), date.getMonth(), 1);
    } else {
        selectedDate = null;
    }
    
    if (todo.dueTime) {
        selectedTime = todo.dueTime;
        const [hour, minute] = todo.dueTime.split(':');
        document.getElementById('hourSelect').value = hour;
        document.getElementById('minuteSelect').value = minute;
        } else {
        selectedTime = null;
        document.getElementById('hourSelect').value = '09';
        document.getElementById('minuteSelect').value = '00';
    }
    
    // 캘린더 렌더링 및 팝업 열기
    renderCalendar();
    updateMonthDisplay();
    openCalendarPopup();
}

// 중요도 편집
function editPriority(id) {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    // 현재 중요도 가져오기
    const currentPriority = todo.priority || 'medium';
    
    // 중요도 선택 옵션 생성
    const priorities = [
        { value: 'high', text: '🔴 높음', color: '#e74c3c' },
        { value: 'medium', text: '🟡 보통', color: '#f39c12' },
        { value: 'low', text: '🟢 낮음', color: '#27ae60' }
    ];
    
    // 현재 중요도 제외한 옵션들
    const otherPriorities = priorities.filter(p => p.value !== currentPriority);
    
    // 선택 옵션 텍스트 생성
    const options = otherPriorities.map(p => `${p.text}`).join('\n');
    
    // 사용자에게 선택 옵션 제공
    const choice = prompt(`현재 중요도: ${getPriorityText(currentPriority)}\n\n변경할 중요도를 선택하세요:\n1. ${otherPriorities[0].text}\n2. ${otherPriorities[1].text}\n\n번호를 입력하세요 (1 또는 2):`);
    
    if (choice === '1') {
        todo.priority = otherPriorities[0].value;
        saveTodos();
        renderTodos();
        updateStats();
        showPriorityChangeNotification(todo.text, otherPriorities[0].text);
    } else if (choice === '2') {
        todo.priority = otherPriorities[1].value;
        saveTodos();
        renderTodos();
        updateStats();
        showPriorityChangeNotification(todo.text, otherPriorities[1].text);
    }
}

// 할 일 목록 렌더링
function renderTodos() {
    const todoList = document.getElementById('todoList');
    if (!todoList) return;

    // 필터링된 할 일 목록
    const filteredTodos = getFilteredTodos();

    if (filteredTodos.length === 0) {
        todoList.innerHTML = '<li class="empty-message">할 일이 없습니다.</li>';
        return;
    }

    todoList.innerHTML = filteredTodos.map(todo => {
        // 마감일 표시 - 강화된 로직
        let dueDateDisplay = '';
        if (todo.dueDate && todo.dueDate.trim() !== '') {
            const dueDateInfo = getDueDateInfo(todo.dueDate);
            const dueDateClass = dueDateInfo.class;
            let displayText = dueDateInfo.text;
            
            // 시간이 있으면 추가
            if (todo.dueTime && todo.dueTime.trim() !== '') {
                displayText += ` ${todo.dueTime}`;
            }
            
            // 마감일이 있으면 반드시 표시
            if (displayText && displayText.trim() !== '') {
                dueDateDisplay = `<span class="todo-due-date ${dueDateClass}" onclick="editDueDate(${todo.id})" title="마감일 클릭하여 수정">${displayText}</span>`;
            }
        }
        
        // 중요도 표시
        const priority = todo.priority || 'medium';
        const priorityText = getPriorityText(priority);
        const priorityClass = priority;
        
        return `
            <li class="todo-item ${todo.completed ? 'completed' : ''}" data-id="${todo.id}">
                <div class="todo-content">
                    <input type="checkbox" ${todo.completed ? 'checked' : ''} 
                           onchange="toggleTodo(${todo.id})" class="todo-checkbox">
                    <span class="todo-text" ondblclick="editTodo(${todo.id})">${escapeHtml(todo.text)}</span>
                    <span class="todo-date">${formatDate(todo.createdAt)}</span>
                    <span class="todo-priority ${priorityClass}" onclick="editPriority(${todo.id})" title="중요도 클릭하여 수정">${priorityText}</span>
                    ${dueDateDisplay}
                </div>
                <div class="todo-actions">
                    <button onclick="editTodo(${todo.id})" class="edit-btn" title="편집">✏️</button>
                    <button onclick="editDueDate(${todo.id})" class="edit-btn" title="마감일 편집">📅</button>
                    <button onclick="deleteTodo(${todo.id})" class="delete-btn" title="삭제">🗑️</button>
                </div>
            </li>
        `;
    }).join('');
}

// 필터링된 할 일 목록 반환
function getFilteredTodos() {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const nextWeekEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const monthFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    switch (currentFilter) {
        case 'active':
            return todos.filter(todo => !todo.completed);
        case 'completed':
            return todos.filter(todo => todo.completed);
        case 'overdue':
            return todos.filter(todo => !todo.completed && todo.dueDate && todo.dueDate < today);
        case 'today':
            return todos.filter(todo => !todo.completed && todo.dueDate === today);
        case 'week':
            return todos.filter(todo => !todo.completed && todo.dueDate && todo.dueDate <= weekFromNow && todo.dueDate >= today);
        case 'tomorrow':
            return todos.filter(todo => !todo.completed && todo.dueDate === tomorrow);
        case 'nextweek':
            return todos.filter(todo => !todo.completed && todo.dueDate && todo.dueDate > weekFromNow && todo.dueDate <= nextWeekEnd);
        case 'thismonth':
            return todos.filter(todo => !todo.completed && todo.dueDate && todo.dueDate <= monthFromNow && todo.dueDate >= today);
        case 'nodate':
            return todos.filter(todo => !todo.dueDate);
        case 'withdate':
            return todos.filter(todo => todo.dueDate);
        case 'priority-high':
            return todos.filter(todo => (todo.priority || 'medium') === 'high');
        case 'priority-medium':
            return todos.filter(todo => (todo.priority || 'medium') === 'medium');
        case 'priority-low':
            return todos.filter(todo => (todo.priority || 'medium') === 'low');
        default:
            return todos;
    }
}

// 필터 변경
function setFilter(filter) {
    currentFilter = filter;
    updateFilterButtons();
    renderTodos();
    updateStats();
}

// 필터 버튼 상태 업데이트
function updateFilterButtons() {
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === currentFilter) {
            btn.classList.add('active');
        }
    });
}

// 통계 업데이트
function updateStats() {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const monthFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const totalCount = todos.length;
    const completedCount = todos.filter(t => t.completed).length;
    const activeCount = totalCount - completedCount;
    const overdueCount = todos.filter(t => !t.completed && t.dueDate && t.dueDate < today).length;
    const todayCount = todos.filter(t => !t.completed && t.dueDate === today).length;
    const tomorrowCount = todos.filter(t => !t.completed && t.dueDate === tomorrow).length;
    const weekCount = todos.filter(t => !t.completed && t.dueDate && t.dueDate <= weekFromNow && t.dueDate >= today).length;
    const monthCount = todos.filter(t => !t.completed && t.dueDate && t.dueDate <= monthFromNow && t.dueDate >= today).length;
    const noDateCount = todos.filter(t => !t.dueDate).length;
    const withDateCount = todos.filter(t => t.dueDate).length;
    const highPriorityCount = todos.filter(t => (t.priority || 'medium') === 'high').length;
    const mediumPriorityCount = todos.filter(t => (t.priority || 'medium') === 'medium').length;
    const lowPriorityCount = todos.filter(t => (t.priority || 'medium') === 'low').length;

    const statsElement = document.getElementById('stats');
    if (statsElement) {
        statsElement.innerHTML = `
            <span>전체: ${totalCount}</span>
            <span>완료: ${completedCount}</span>
            <span>미완료: ${activeCount}</span>
            <span>지연: ${overdueCount}</span>
            <span>오늘: ${todayCount}</span>
            <span>내일: ${tomorrowCount}</span>
            <span>이번주: ${weekCount}</span>
            <span>이번달: ${monthCount}</span>
            <span>마감일없음: ${noDateCount}</span>
            <span>마감일있음: ${withDateCount}</span>
            <span>🔴 높음: ${highPriorityCount}</span>
            <span>🟡 보통: ${mediumPriorityCount}</span>
            <span>🟢 낮음: ${lowPriorityCount}</span>
        `;
    }
}

// 모든 할 일 완료 처리
function toggleAllTodos() {
    const allCompleted = todos.every(todo => todo.completed);
    todos.forEach(todo => {
        todo.completed = !allCompleted;
    });
    saveTodos();
    renderTodos();
    updateStats();
}

// 완료된 할 일 모두 삭제
function clearCompleted() {
    const completedCount = todos.filter(t => t.completed).length;
    if (completedCount === 0) {
        alert('완료된 할 일이 없습니다.');
        return;
    }

    if (confirm(`완료된 ${completedCount}개의 할 일을 모두 삭제하시겠습니까?`)) {
        todos = todos.filter(todo => !todo.completed);
        saveTodos();
        renderTodos();
        updateStats();
    }
}

// 로컬 스토리지에 저장
function saveTodos() {
    localStorage.setItem('todos', JSON.stringify(todos));
}

// 로컬 스토리지에서 로드
function loadTodos() {
    const savedTodos = localStorage.getItem('todos');
    if (savedTodos) {
        try {
            todos = JSON.parse(savedTodos);
            // 기존 할 일들에 중요도가 없는 경우 기본값 설정
            todos.forEach(todo => {
                if (!todo.priority) {
                    todo.priority = 'medium';
                }
            });
        } catch (e) {
            console.error('할 일 데이터를 불러오는데 실패했습니다:', e);
            todos = [];
        }
    }
}

// HTML 이스케이프 처리
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 날짜 포맷팅
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
        return '오늘';
    } else if (diffDays === 2) {
        return '어제';
    } else if (diffDays <= 7) {
        return `${diffDays - 1}일 전`;
    } else {
        return date.toLocaleDateString('ko-KR');
    }
}

// 할 일 검색
function searchTodos() {
    const searchInput = document.getElementById('search');
    const searchDateInput = document.getElementById('searchDate');
    const searchType = document.querySelector('input[name="searchType"]:checked').value;
    
    if (!searchInput && !searchDateInput) return;

    const todoItems = document.querySelectorAll('.todo-item');

    todoItems.forEach(item => {
        let shouldShow = false;
        
        if (searchType === 'text') {
            const searchTerm = searchInput.value.toLowerCase().trim();
            const todoText = item.querySelector('.todo-text').textContent.toLowerCase();
            shouldShow = todoText.includes(searchTerm);
        } else if (searchType === 'date') {
            const searchDate = searchDateInput.value;
            const todoId = parseInt(item.dataset.id);
            const todo = todos.find(t => t.id === todoId);
            shouldShow = todo && todo.dueDate === searchDate;
        }
        
        item.style.display = shouldShow ? 'flex' : 'none';
    });
}

// 할 일 정렬
function sortTodos(sortBy) {
    switch (sortBy) {
        case 'date':
            todos.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            break;
        case 'dueDate':
            todos.sort((a, b) => {
                if (!a.dueDate && !b.dueDate) return 0;
                if (!a.dueDate) return 1;
                if (!b.dueDate) return -1;
                return new Date(a.dueDate) - new Date(b.dueDate);
            });
            break;
        case 'alphabetical':
            todos.sort((a, b) => a.text.localeCompare(b.text));
            break;
        case 'status':
            todos.sort((a, b) => a.completed - b.completed);
            break;
    }
    saveTodos();
    renderTodos();
}

// 데이터 내보내기 (JSON)
function exportTodos() {
    const dataStr = JSON.stringify(todos, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'todos.json';
    link.click();
    URL.revokeObjectURL(url);
}

// 데이터 가져오기 (JSON)
function importTodos() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const importedTodos = JSON.parse(e.target.result);
                    if (confirm(`가져온 ${importedTodos.length}개의 할 일을 기존 데이터에 추가하시겠습니까?`)) {
                        todos = [...todos, ...importedTodos];
                        saveTodos();
                        renderTodos();
                        updateStats();
                        alert('할 일을 성공적으로 가져왔습니다.');
                    }
                } catch (error) {
                    alert('파일을 읽는데 실패했습니다. 올바른 JSON 파일인지 확인해주세요.');
                }
            };
            reader.readAsText(file);
        }
    };
    input.click();
}

// 모든 데이터 삭제
function clearAllTodos() {
    if (todos.length === 0) {
        alert('삭제할 할 일이 없습니다.');
        return;
    }

    if (confirm(`모든 할 일(${todos.length}개)을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
        todos = [];
        saveTodos();
        renderTodos();
        updateStats();
        alert('모든 할 일이 삭제되었습니다.');
    }
}

// 마감일 정보 가져오기 - 강화된 로직
function getDueDateInfo(dueDate) {
    if (!dueDate || dueDate.trim() === '') {
        return { class: '', text: '' };
    }

    try {
        const today = new Date();
        const due = new Date(dueDate);
        
        // 날짜가 유효하지 않은 경우
        if (isNaN(due.getTime())) {
            return { class: 'normal', text: dueDate };
        }
        
        const diffTime = due - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            return { 
                class: 'overdue', 
                text: `${Math.abs(diffDays)}일 지연` 
            };
        } else if (diffDays === 0) {
            return { 
                class: 'due-today', 
                text: '오늘' 
            };
        } else if (diffDays === 1) {
            return { 
                class: 'due-soon', 
                text: '내일' 
            };
        } else if (diffDays <= 7) {
            return { 
                class: 'due-soon', 
                text: `${diffDays}일 후` 
            };
        } else {
            return { 
                class: 'normal', 
                text: due.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
            };
        }
    } catch (e) {
        // 오류 발생 시 원본 날짜 문자열 반환
        return { class: 'normal', text: dueDate };
    }
}

// 마감일 포맷팅 (새로운 간단한 방식)
function formatDueDate(dateString) {
    if (!dateString) {
        return '';
    }
    
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
        return dateString;
    }
    
    return date.toLocaleDateString('ko-KR', { 
        month: 'short', 
        day: 'numeric' 
    });
}

// 마감일 알림 체크
function checkDueDateAlerts() {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const overdueTodos = todos.filter(todo => 
        !todo.completed && todo.dueDate && todo.dueDate < today
    );
    
    const todayTodos = todos.filter(todo => 
        !todo.completed && todo.dueDate === today
    );
    
    const tomorrowTodos = todos.filter(todo => 
        !todo.completed && todo.dueDate === tomorrow
    );

    let alertMessage = '';
    
    if (overdueTodos.length > 0) {
        alertMessage += `⚠️ 지연된 할 일: ${overdueTodos.length}개\n`;
    }
    
    if (todayTodos.length > 0) {
        alertMessage += `🔥 오늘 마감: ${todayTodos.length}개\n`;
    }
    
    if (tomorrowTodos.length > 0) {
        alertMessage += `⏰ 내일 마감: ${tomorrowTodos.length}개\n`;
    }

    if (alertMessage) {
        alert(alertMessage.trim());
    }
}

// 페이지 로드 시 마감일 알림 체크
document.addEventListener('DOMContentLoaded', function() {
    // 기존 초기화 코드는 이미 있으므로 여기서는 알림만 추가
    setTimeout(checkDueDateAlerts, 1000); // 1초 후 알림 표시
});

// 캘린더 초기화
function initializeCalendar() {
    calendarModal = document.getElementById('calendarModal');
    generateTimeOptions();
    renderCalendar();
    updateMonthDisplay();
}

// 시간 옵션 생성
function generateTimeOptions() {
    const hourSelect = document.getElementById('hourSelect');
    const minuteSelect = document.getElementById('minuteSelect');
    
    // 시간 옵션 (0-23)
    for (let i = 0; i < 24; i++) {
        const option = document.createElement('option');
        option.value = i.toString().padStart(2, '0');
        option.textContent = `${i}시`;
        hourSelect.appendChild(option);
    }
    
    // 분 옵션 (0, 15, 30, 45)
    const minutes = ['00', '15', '30', '45'];
    minutes.forEach(minute => {
        const option = document.createElement('option');
        option.value = minute;
        option.textContent = `${minute}분`;
        minuteSelect.appendChild(option);
    });
}

// 캘린더 렌더링
function renderCalendar() {
    const calendarDays = document.getElementById('calendarDays');
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // 현재 월의 첫 번째 날과 마지막 날
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    
    // 이전 달의 마지막 날들
    const prevMonth = new Date(year, month, 0);
    const daysInPrevMonth = prevMonth.getDate();
    
    calendarDays.innerHTML = '';
    
    // 이전 달의 날들
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        const dayElement = createDayElement(day, true);
        calendarDays.appendChild(dayElement);
    }
    
    // 현재 달의 날들
    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = createDayElement(day, false);
        calendarDays.appendChild(dayElement);
    }
    
    // 다음 달의 날들 (캘린더를 42칸으로 채우기 위해)
    const totalCells = calendarDays.children.length;
    const remainingCells = 42 - totalCells;
    for (let day = 1; day <= remainingCells; day++) {
        const dayElement = createDayElement(day, true);
        calendarDays.appendChild(dayElement);
    }
}

// 날짜 요소 생성
function createDayElement(day, isOtherMonth) {
    const dayElement = document.createElement('div');
    dayElement.className = 'calendar-day';
    dayElement.textContent = day;
    
    if (isOtherMonth) {
        dayElement.classList.add('other-month');
    } else {
        // 오늘 날짜 표시
        const today = new Date();
        if (currentDate.getFullYear() === today.getFullYear() &&
            currentDate.getMonth() === today.getMonth() &&
            day === today.getDate()) {
            dayElement.classList.add('today');
        }
        
        // 선택된 날짜 표시
        if (selectedDate) {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            const date = new Date(year, month, day);
            const expectedDate = date.toISOString().split('T')[0];
            
            if (selectedDate === expectedDate) {
                dayElement.classList.add('selected');
            }
        }
        
        // 클릭 이벤트
        dayElement.addEventListener('click', () => selectDate(day));
    }
    
    return dayElement;
}

// 날짜 선택
function selectDate(day) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const date = new Date(year, month, day);
    selectedDate = date.toISOString().split('T')[0];
    
    renderCalendar();
    
    if (!editingTodoId) {
        updateDueDateButton();
    }
}

// 월 변경
function changeMonth(direction) {
    currentDate.setMonth(currentDate.getMonth() + direction);
    renderCalendar();
    updateMonthDisplay();
}

// 월 표시 업데이트
function updateMonthDisplay() {
    const monthNames = [
        '1월', '2월', '3월', '4월', '5월', '6월',
        '7월', '8월', '9월', '10월', '11월', '12월'
    ];
    const year = currentDate.getFullYear();
    const month = monthNames[currentDate.getMonth()];
    document.getElementById('currentMonth').textContent = `${year}년 ${month}`;
}

// 캘린더 팝업 열기
function openCalendarPopup() {
    calendarModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    // 편집 모드인지에 따라 제목 변경
    const modalTitle = document.querySelector('.modal-header h2');
    if (editingTodoId) {
        modalTitle.textContent = '📅 마감일 수정';
    } else {
        modalTitle.textContent = '📅 마감일 및 시간 설정';
    }
    
    // 현재 선택된 날짜/시간이 있으면 표시
    if (selectedDate) {
        const date = new Date(selectedDate);
        currentDate = new Date(date.getFullYear(), date.getMonth(), 1);
        renderCalendar();
        updateMonthDisplay();
    }
    
    if (selectedTime) {
        const [hour, minute] = selectedTime.split(':');
        document.getElementById('hourSelect').value = hour;
        document.getElementById('minuteSelect').value = minute;
    } else {
        document.getElementById('hourSelect').value = '09';
        document.getElementById('minuteSelect').value = '00';
    }
}

// 캘린더 팝업 닫기
function closeCalendarPopup() {
    calendarModal.style.display = 'none';
    document.body.style.overflow = 'auto';
    
    // 편집 모드인 경우에만 선택된 날짜/시간 초기화
    // 새 할 일 모드에서는 selectedDate와 selectedTime을 유지
    if (editingTodoId) {
        selectedDate = null;
        selectedTime = null;
        updateDueDateButton();
    }
}

// 날짜/시간 확인
function confirmDateTime() {
    const hour = document.getElementById('hourSelect').value;
    const minute = document.getElementById('minuteSelect').value;
    
    // 시간 설정 로직 수정
    if (selectedDate) {
        if (hour && minute) {
            selectedTime = `${hour}:${minute}`;
        } else {
            selectedTime = null;
        }
    } else {
        // selectedDate가 없으면 selectedTime도 null로 설정
        selectedTime = null;
    }
    
    if (editingTodoId) {
        const todo = todos.find(t => t.id === editingTodoId);
        if (todo) {
            todo.dueDate = selectedDate;
            todo.dueTime = selectedTime;
            saveTodos();
            renderTodos();
            updateStats();
        }
        editingTodoId = null;
    } else {
        // 새 할 일 모드에서는 항상 마감일 버튼 업데이트
        updateDueDateButton();
    }
    
    // 팝업 닫기
    closeCalendarPopup();
}

// 빠른 시간 설정
function setQuickTime(period, time) {
    const today = new Date();
    let targetDate;
    
    switch (period) {
        case 'today':
            targetDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            break;
        case 'tomorrow':
            targetDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
            break;
        case 'week':
            targetDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7);
            break;
    }
    
    selectedDate = targetDate.toISOString().split('T')[0];
    selectedTime = time;
    
    const [hour, minute] = time.split(':');
    document.getElementById('hourSelect').value = hour;
    document.getElementById('minuteSelect').value = minute;
    
    if (!editingTodoId) {
        updateDueDateButton();
    }
    
    renderCalendar();
    updateMonthDisplay();
}

// 날짜/시간 초기화
function clearDateTime() {
    selectedDate = null;
    selectedTime = null;
    document.getElementById('hourSelect').value = '';
    document.getElementById('minuteSelect').value = '';
    renderCalendar();
    
    // 편집 모드가 아닌 경우에만 마감일 버튼 업데이트
    if (!editingTodoId) {
        updateDueDateButton();
    }
}

// 선택된 날짜/시간 초기화
function clearSelectedDateTime() {
    selectedDate = null;
    selectedTime = null;
    updateDueDateButton();
}

// 마감일 버튼 업데이트
function updateDueDateButton() {
    const dueDateBtn = document.getElementById('dueDateBtn');
    const dueDateText = document.getElementById('dueDateText');
    
    if (!dueDateBtn || !dueDateText) {
        return;
    }
    
    if (selectedDate) {
        const date = new Date(selectedDate);
        const dateStr = date.toLocaleDateString('ko-KR', { 
            month: 'short', 
            day: 'numeric'
        });
        
        if (selectedTime) {
            dueDateText.textContent = `📅 ${dateStr} ${selectedTime}`;
        } else {
            dueDateText.textContent = `📅 ${dateStr}`;
        }
        
        dueDateBtn.classList.add('has-date');
    } else {
        dueDateText.textContent = '📅 마감일';
        dueDateBtn.classList.remove('has-date');
    }
}

// 모달 외부 클릭 시 닫기
window.addEventListener('click', function(event) {
    if (event.target === calendarModal) {
        closeCalendarPopup();
    }
    if (event.target === calendarViewModal) {
        closeCalendarView();
    }
});

// 중요도 초기화
function initializePriority() {
    // 기본값으로 보통 선택
    selectPriority('medium');
}

// 중요도 선택
function selectPriority(priority) {
    selectedPriority = priority;
    
    // 모든 중요도 버튼에서 selected 클래스 제거
    document.querySelectorAll('.priority-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    // 선택된 중요도 버튼에 selected 클래스 추가
    const selectedBtn = document.querySelector(`[data-priority="${priority}"]`);
    if (selectedBtn) {
        selectedBtn.classList.add('selected');
    }
}

// 중요도 초기화
function resetPriority() {
    selectPriority('medium');
}

// 중요도 텍스트 반환
function getPriorityText(priority) {
    switch (priority) {
        case 'high':
            return '높음';
        case 'medium':
            return '보통';
        case 'low':
            return '낮음';
        default:
            return '보통';
    }
}

// 검색 타입 변경 시 플레이스홀더 업데이트
function updateSearchPlaceholder() {
    const searchInput = document.getElementById('search');
    const searchDateInput = document.getElementById('searchDate');
    const searchType = document.querySelector('input[name="searchType"]:checked').value;
    
    if (searchType === 'text') {
        searchInput.style.display = 'block';
        searchDateInput.style.display = 'none';
        searchInput.placeholder = '할 일 제목을 입력하세요...';
    } else if (searchType === 'date') {
        searchInput.style.display = 'none';
        searchDateInput.style.display = 'block';
    }
}

// 중요도 변경 알림
function showPriorityChangeNotification(todoText, newPriority) {
    // 간단한 알림 표시
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-size: 14px;
        max-width: 300px;
        animation: slideInRight 0.3s ease-out;
    `;
    
    notification.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 5px;">✅ 중요도 변경됨</div>
        <div style="font-size: 12px; opacity: 0.9;">"${todoText}"</div>
        <div style="font-size: 12px; margin-top: 5px;">→ ${newPriority}</div>
    `;
    
    document.body.appendChild(notification);
    
    // 3초 후 자동 제거
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// 캘린더 뷰 초기화
function initializeCalendarView() {
    calendarViewModal = document.getElementById('calendarViewModal');
}

// 캘린더 뷰 열기
function openCalendarView() {
    calendarViewModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    renderCalendarView();
}

// 캘린더 뷰 닫기
function closeCalendarView() {
    calendarViewModal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// 캘린더 뷰 타입 설정
function setCalendarView(viewType) {
    currentCalendarView = viewType;
    
    // 버튼 상태 업데이트
    document.querySelectorAll('.view-type-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-view="${viewType}"]`).classList.add('active');
    
    renderCalendarView();
}

// 캘린더 기간 변경
function changeCalendarPeriod(direction) {
    switch (currentCalendarView) {
        case 'month':
            currentCalendarDate.setMonth(currentCalendarDate.getMonth() + direction);
            break;
        case 'week':
        case 'week-time':
            currentCalendarDate.setDate(currentCalendarDate.getDate() + (direction * 7));
            break;
        case 'day':
        case 'day-time':
            currentCalendarDate.setDate(currentCalendarDate.getDate() + direction);
            break;
    }
    renderCalendarView();
}

// 캘린더 뷰 렌더링
function renderCalendarView() {
    const content = document.getElementById('calendarViewContent');
    const title = document.getElementById('calendarViewTitle');
    
    switch (currentCalendarView) {
        case 'month':
            title.textContent = formatCalendarTitle('month');
            content.innerHTML = renderMonthCalendar();
            break;
        case 'week':
            title.textContent = formatCalendarTitle('week');
            content.innerHTML = renderWeekCalendar();
            break;
        case 'day':
            title.textContent = formatCalendarTitle('day');
            content.innerHTML = renderDayCalendar();
            break;
        case 'week-time':
            title.textContent = formatCalendarTitle('week');
            content.innerHTML = renderWeekTimeCalendar();
            break;
        case 'day-time':
            title.textContent = formatCalendarTitle('day');
            content.innerHTML = renderDayTimeCalendar();
            break;
    }
}

// 캘린더 제목 포맷팅
function formatCalendarTitle(viewType) {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth() + 1;
    const date = currentCalendarDate.getDate();
    
    switch (viewType) {
        case 'month':
            return `${year}년 ${month}월`;
        case 'week':
            const weekStart = getWeekStart(currentCalendarDate);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            return `${weekStart.getMonth() + 1}/${weekStart.getDate()} - ${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`;
        case 'day':
            return `${year}년 ${month}월 ${date}일`;
        default:
            return '';
    }
}

// 주 시작일 구하기
function getWeekStart(date) {
    const start = new Date(date);
    const day = start.getDay();
    start.setDate(start.getDate() - day);
    return start;
}

// 월별 캘린더 렌더링
function renderMonthCalendar() {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    
    const prevMonth = new Date(year, month, 0);
    const daysInPrevMonth = prevMonth.getDate();
    
    let html = `
        <div class="month-calendar-header">
            <div>일</div>
            <div>월</div>
            <div>화</div>
            <div>수</div>
            <div>목</div>
            <div>금</div>
            <div>토</div>
        </div>
        <div class="month-calendar">
    `;
    
    // 이전 달의 날들
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        html += `<div class="month-calendar-day other-month">
            <div class="day-number">${day}</div>
        </div>`;
    }
    
    // 현재 달의 날들
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateStr = date.toISOString().split('T')[0];
        const dayTodos = todos.filter(todo => todo.dueDate === dateStr);
        
        const isToday = isSameDay(date, new Date());
        
        html += `<div class="month-calendar-day ${isToday ? 'today' : ''}">
            <div class="day-number">${day}</div>
            <div class="day-todos">`;
        
        dayTodos.slice(0, 3).forEach(todo => {
            const priority = todo.priority || 'medium';
            const completed = todo.completed ? 'completed' : '';
            html += `<div class="day-todo-item ${priority} ${completed}" onclick="showTodoDetails(${todo.id})" title="${todo.text}">
                ${todo.text.length > 15 ? todo.text.substring(0, 15) + '...' : todo.text}
            </div>`;
        });
        
        if (dayTodos.length > 3) {
            html += `<div class="day-todo-item" style="background: #95a5a6; color: white;">
                +${dayTodos.length - 3}개 더
            </div>`;
        }
        
        html += `</div></div>`;
    }
    
    // 다음 달의 날들
    const totalCells = firstDayOfWeek + daysInMonth;
    const remainingCells = 42 - totalCells;
    for (let day = 1; day <= remainingCells; day++) {
        html += `<div class="month-calendar-day other-month">
            <div class="day-number">${day}</div>
        </div>`;
    }
    
    html += '</div>';
    return html;
}

// 주별 캘린더 렌더링
function renderWeekCalendar() {
    const weekStart = getWeekStart(currentCalendarDate);
    const weekDays = ['일', '월', '화', '수', '목', '금', '토'];
    
    let html = `
        <div class="week-calendar-header">
            ${weekDays.map(day => `<div>${day}</div>`).join('')}
        </div>
        <div class="week-calendar">
    `;
    
    for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        const dayTodos = todos.filter(todo => todo.dueDate === dateStr);
        
        const isToday = isSameDay(date, new Date());
        
        html += `<div class="week-calendar-day ${isToday ? 'today' : ''}">
            <div class="day-number">${date.getDate()}</div>
            <div class="day-todos">`;
        
        dayTodos.forEach(todo => {
            const priority = todo.priority || 'medium';
            const completed = todo.completed ? 'completed' : '';
            html += `<div class="week-todo-item ${priority} ${completed}" onclick="showTodoDetails(${todo.id})">
                ${todo.text}
            </div>`;
        });
        
        html += `</div></div>`;
    }
    
    html += '</div>';
    return html;
}

// 일별 캘린더 렌더링
function renderDayCalendar() {
    const dateStr = currentCalendarDate.toISOString().split('T')[0];
    const dayTodos = todos.filter(todo => todo.dueDate === dateStr);
    
    let html = `
        <div class="day-calendar">
            <div class="day-calendar-header">
                <h3>${formatCalendarTitle('day')}</h3>
                <p>${dayTodos.length}개의 할 일</p>
            </div>
            <div class="day-todo-list">
    `;
    
    if (dayTodos.length === 0) {
        html += '<div style="text-align: center; color: #999; padding: 40px;">이 날에는 할 일이 없습니다.</div>';
    } else {
        dayTodos.forEach(todo => {
            const priority = todo.priority || 'medium';
            const completed = todo.completed ? 'completed' : '';
            const priorityText = getPriorityText(priority);
            
            html += `
                <div class="day-todo-list-item ${completed}" onclick="showTodoDetails(${todo.id})">
                    <div class="day-todo-info">
                        <div class="day-todo-text">${todo.text}</div>
                        <div class="day-todo-meta">
                            중요도: ${priorityText} | 
                            ${todo.dueTime ? `시간: ${todo.dueTime}` : '시간 미설정'}
                        </div>
                    </div>
                    <div class="day-todo-priority ${priority}">${priorityText}</div>
                </div>
            `;
        });
    }
    
    html += '</div></div>';
    return html;
}

// 날짜 비교 함수
function isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

// 할 일 상세 정보 표시
function showTodoDetails(todoId) {
    const todo = todos.find(t => t.id === todoId);
    if (!todo) return;
    
    const priorityText = getPriorityText(todo.priority);
    const dueDateText = todo.dueDate ? new Date(todo.dueDate).toLocaleDateString('ko-KR') : '미설정';
    const dueTimeText = todo.dueTime || '미설정';
    const statusText = todo.completed ? '완료' : '미완료';
    
    alert(`할 일 상세 정보
    
제목: ${todo.text}
상태: ${statusText}
중요도: ${priorityText}
마감일: ${dueDateText}
마감시간: ${dueTimeText}
생성일: ${new Date(todo.createdAt).toLocaleDateString('ko-KR')}`);
}

// 주별 시간 캘린더 렌더링
function renderWeekTimeCalendar() {
    const weekStart = getWeekStart(currentCalendarDate);
    const weekDays = ['일', '월', '화', '수', '목', '금', '토'];
    
    let html = `
        <div class="time-calendar">
            <div class="time-axis">
                ${generateTimeSlots()}
            </div>
            <div class="calendar-grid">
    `;
    
    // 각 요일별 컬럼 생성
    for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        const dayTodos = todos.filter(todo => todo.dueDate === dateStr);
        
        const isToday = isSameDay(date, new Date());
        
        html += `
            <div class="calendar-day-column">
                <div class="day-header ${isToday ? 'today' : ''}">
                    <div class="day-number">${date.getDate()}</div>
                    <div class="day-name">${weekDays[i]}</div>
                </div>
                <div class="time-grid">
                    ${generateHourLines()}
                    ${generateTodoTimeBlocks(dayTodos)}
                </div>
            </div>
        `;
    }
    
    html += '</div></div>';
    return html;
}

// 일별 시간 캘린더 렌더링
function renderDayTimeCalendar() {
    const dateStr = currentCalendarDate.toISOString().split('T')[0];
    const dayTodos = todos.filter(todo => todo.dueDate === dateStr);
    
    let html = `
        <div class="day-time-calendar">
            <div class="time-axis">
                ${generateTimeSlots()}
            </div>
            <div class="day-time-grid">
                ${generateHourLines()}
                ${generateCurrentTimeLine()}
                ${generateTodoTimeBlocks(dayTodos)}
            </div>
        </div>
    `;
    
    return html;
}

// 시간 슬롯 생성
function generateTimeSlots() {
    let html = '';
    for (let hour = 0; hour < 24; hour++) {
        html += `<div class="time-slot">${hour.toString().padStart(2, '0')}:00</div>`;
    }
    return html;
}

// 시간선 생성
function generateHourLines() {
    let html = '';
    for (let hour = 0; hour < 24; hour++) {
        const top = hour * 60; // 60px per hour
        html += `<div class="hour-line" style="top: ${top}px;"></div>`;
    }
    return html;
}

// 현재 시간선 생성
function generateCurrentTimeLine() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const top = (currentHour * 60) + currentMinute;
    
    return `<div class="current-time-line" style="top: ${top}px;"></div>`;
}

// 시간별 할 일 블록 생성
function generateTodoTimeBlocks(dayTodos) {
    let html = '';
    
    dayTodos.forEach(todo => {
        if (todo.dueTime) {
            const [hour, minute] = todo.dueTime.split(':');
            const top = (parseInt(hour) * 60) + parseInt(minute);
            const priority = todo.priority || 'medium';
            const completed = todo.completed ? 'completed' : '';
            
            html += `
                <div class="todo-time-block ${priority} ${completed}" 
                     style="top: ${top}px; height: 30px;" 
                     onclick="showTodoDetails(${todo.id})" 
                     title="${todo.text}">
                    ${todo.text.length > 20 ? todo.text.substring(0, 20) + '...' : todo.text}
                </div>
            `;
        }
    });
    
    return html;
}   