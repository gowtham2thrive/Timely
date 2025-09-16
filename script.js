document.addEventListener('DOMContentLoaded', () => {
    // =================================================================================
    // ============================= DOM ELEMENT REFERENCES ============================
    // =================================================================================
    const themeToggleBtn = document.getElementById('theme-toggle');
    const clearAllBtn = document.getElementById('clear-all-btn');
    const periodsSlider = document.getElementById('periods-per-day');
    const periodsValue = document.getElementById('periods-per-day-value');
    const startTimeSlider = document.getElementById('start-time');
    const startTimeValue = document.getElementById('start-time-value');
    const durationSlider = document.getElementById('period-duration');
    const durationValue = document.getElementById('period-duration-value');
    const lunchSlider = document.getElementById('lunch-break-at');
    const lunchValue = document.getElementById('lunch-break-at-value');
    const facultyNameInput = document.getElementById('faculty-name-input');
    const addFacultyBtn = document.getElementById('add-faculty-btn');
    const facultyListContainer = document.getElementById('faculty-list-container');
    const sectionNameInput = document.getElementById('section-name-input');
    const addSectionBtn = document.getElementById('add-section-btn');
    const sectionTagsContainer = document.getElementById('section-tags-container');
    const coursesContainer = document.getElementById('courses-container');
    const generateBtn = document.getElementById('generate-btn');
    const timetablesContainer = document.getElementById('timetables-container');
    const outputPlaceholder = document.getElementById('output-placeholder');
    const modal = document.getElementById('summary-modal');
    const modalClose = document.querySelector('.modal-close');

    // =================================================================================
    // ================================ STATE MANAGEMENT ===============================
    // =================================================================================
    let state = {
        theme: 'light',
        config: { periodsPerDay: 8, startTime: 8, periodDuration: 45, lunchBreakAt: 4 },
        faculty: [],
        sections: [],
        assignments: {},
    };

    let lastGenerationResults = null;

    function saveState() {
        localStorage.setItem('timetableGeneratorState_vFinal', JSON.stringify(state));
    }

    function loadState() {
        const savedState = localStorage.getItem('timetableGeneratorState_vFinal');
        if (savedState) {
            try {
                state = JSON.parse(savedState);
            } catch (e) {
                console.error("Failed to parse state from localStorage, resetting state.", e);
                localStorage.removeItem('timetableGeneratorState_vFinal');
            }
        }
    }

    // =================================================================================
    // ================================== UI RENDERING =================================
    // =================================================================================
    function renderAll() {
        applyTheme();
        updateConfigUI();
        renderFaculty();
        renderSections();
        renderOutputArea(); // Replaces direct calls to timetable rendering
        saveState();
    }
    
    function applyTheme() { document.body.setAttribute('data-theme', state.theme); }

    function updateConfigUI() {
        periodsSlider.value = state.config.periodsPerDay;
        periodsValue.textContent = state.config.periodsPerDay;
        lunchSlider.max = state.config.periodsPerDay;
        lunchSlider.value = state.config.lunchBreakAt;
        lunchValue.textContent = state.config.lunchBreakAt == 0 ? 'None' : state.config.lunchBreakAt;
        startTimeSlider.value = state.config.startTime;
        startTimeValue.textContent = formatTime(state.config.startTime);
        durationSlider.value = state.config.periodDuration;
        durationValue.textContent = state.config.periodDuration;
    }
    
    function renderFaculty() {
        facultyListContainer.innerHTML = '';
        state.faculty.forEach(fac => {
            const card = document.createElement('div');
            card.className = 'faculty-card';
            card.innerHTML = `
                <button class="icon-btn danger-btn card-delete-btn" onclick="removeFaculty('${fac.id}')"><span class="material-symbols-outlined">close</span></button>
                <div class="faculty-header">
                    <h4>${fac.name}</h4>
                </div>
                <div class="subjects-list">
                    ${fac.subjects.map(sub => `
                        <div class="subject-tag">
                            <span>${sub.name} (${sub.type})</span>
                            <span class="remove-subject-btn material-symbols-outlined" onclick="removeSubjectFromFaculty('${fac.id}', '${sub.id}')">close</span>
                        </div>
                    `).join('')}
                </div>
                <div class="add-subject-form">
                    <input type="text" id="subject-name-${fac.id}" placeholder="Subject/Lab Name">
                    <select id="subject-type-${fac.id}">
                        <option value="subject">Subject</option>
                        <option value="lab">Lab</option>
                        <option value="activity">Activity</option>
                    </select>
                    <button onclick="addSubjectToFaculty('${fac.id}')"><span class="material-symbols-outlined">add</span></button>
                </div>`;
            facultyListContainer.appendChild(card);
        });
    }

    function renderSections() {
        sectionTagsContainer.innerHTML = '';
        coursesContainer.innerHTML = '';
        state.sections.forEach(section => {
            const tag = document.createElement('div');
            tag.className = 'section-tag';
            tag.textContent = section.name;
            tag.innerHTML += `<span class="remove-tag material-symbols-outlined" onclick="removeSection('${section.id}')">close</span>`;
            sectionTagsContainer.appendChild(tag);
            renderSectionAssignmentBlock(section);
        });
    }

    function renderSectionAssignmentBlock(section) {
        if (!state.assignments[section.id]) state.assignments[section.id] = [];
        const block = document.createElement('div');
        block.className = 'section-block';
        const facultyOptions = state.faculty.map(f => `<option value="${f.id}">${f.name}</option>`).join('');
        block.innerHTML = `
            <h3>${section.name} - Course Assignments</h3>
            <div id="assignments-list-${section.id}"></div>
            <div class="add-form">
                <select id="faculty-select-${section.id}" onchange="updateSubjectSelect('${section.id}')">
                    <option value="">-- Select Faculty --</option>${facultyOptions}
                </select>
                <select id="subject-select-${section.id}" disabled><option value="">-- Select Subject --</option></select>
                <button onclick="addAssignment('${section.id}')"><span class="material-symbols-outlined">add_task</span>Assign</button>
            </div>`;
        coursesContainer.appendChild(block);
        renderAssignmentsForSection(section.id);
    }
    
    function renderAssignmentsForSection(sectionId) {
        const container = document.getElementById(`assignments-list-${sectionId}`);
        container.innerHTML = '';
        state.assignments[sectionId].forEach(assign => {
            const fac = state.faculty.find(f => f.id === assign.facultyId);
            const sub = fac?.subjects.find(s => s.id === assign.subjectId);
            if (!fac || !sub) return;
            const card = document.createElement('div');
            card.className = `course-assignment-card ${sub.type}`;
            let hoursOrInstances = 0;
            let headerHTML = `<div class="assignment-details"><strong>${sub.name}</strong> <span>by ${fac.name}</span></div>`;
            let gridHTML = '';
            if (sub.type === 'lab') {
                hoursOrInstances = assign.instances || 1;
                gridHTML += `<label>Periods/Instance</label><input type="number" value="${assign.periods || 2}" min="1" onchange="updateAssignment('${assign.id}', 'periods', this.value)">
                             <label>Instances/Week</label><input type="number" value="${assign.instances || 1}" min="1" onchange="updateAssignment('${assign.id}', 'instances', this.value)">`;
            } else {
                hoursOrInstances = assign.hours || 1;
                gridHTML += `<label>Hours/Week</label><input type="number" value="${assign.hours || 1}" min="1" onchange="updateAssignment('${assign.id}', 'hours', this.value)">`;
            }
            card.innerHTML = `<button class="icon-btn danger-btn card-delete-btn" onclick="removeAssignment('${assign.id}')"><span class="material-symbols-outlined">close</span></button>
                ${headerHTML}
                <div class="assignment-grid">${gridHTML}</div>
                <details><summary>Set Period Preferences</summary><div class="preferences-container">${generatePreferencesHTML(assign, hoursOrInstances)}</div></details>`;
            container.appendChild(card);
        });
    }

    function generatePreferencesHTML(assignment, count) {
        let html = '';
        const days = ["Any Day", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const periods = ['Any Period', ...Array.from({ length: state.config.periodsPerDay }, (_, i) => `Period ${i + 1}`)];
        if (!assignment.preferences) assignment.preferences = [];
        for (let i = 0; i < count; i++) {
            const pref = assignment.preferences[i] || { day: 'Any Day', period: 'Any Period' };
            html += `<div class="preference-row">
                <select onchange="updatePreference('${assignment.id}', ${i}, 'day', this.value)">${days.map(d => `<option value="${d}" ${pref.day === d ? 'selected' : ''}>${d}</option>`).join('')}</select>
                <select onchange="updatePreference('${assignment.id}', ${i}, 'period', this.value)">${periods.map(p => `<option value="${p}" ${pref.period === p ? 'selected' : ''}>${p}</option>`).join('')}</select>
                </div>`;
        }
        return html;
    }
    
    // =================================================================================
    // ============================ EVENT HANDLERS & ACTIONS ===========================
    // =================================================================================
    themeToggleBtn.addEventListener('click', () => { state.theme = state.theme === 'light' ? 'dark' : 'light'; renderAll(); });
    clearAllBtn.addEventListener('click', () => { 
        if (confirm('Are you sure you want to clear all data? This cannot be undone.')) { 
            localStorage.removeItem('timetableGeneratorState_vFinal'); 
            location.reload(); 
        } 
    });
    [periodsSlider, startTimeSlider, durationSlider, lunchSlider].forEach(slider => slider.addEventListener('input', handleConfigChange));
    function handleConfigChange(e) {
        const keyMap = { 'periods-per-day': 'periodsPerDay', 'start-time': 'startTime', 'period-duration': 'periodDuration', 'lunch-break-at': 'lunchBreakAt' };
        state.config[keyMap[e.target.id]] = parseInt(e.target.value);
        lastGenerationResults = null; // Invalidate old results on config change
        renderAll();
    }
    
    addFacultyBtn.addEventListener('click', () => {
        const name = facultyNameInput.value.trim();
        if (name && !state.faculty.find(f => f.name === name)) {
            state.faculty.push({ id: `fac-${Date.now()}`, name, subjects: [] });
            facultyNameInput.value = '';
            renderAll();
        }
    });
    window.removeFaculty = (facId) => {
        state.faculty = state.faculty.filter(f => f.id !== facId);
        for(const secId in state.assignments) { state.assignments[secId] = state.assignments[secId].filter(a => a.facultyId !== facId); }
        lastGenerationResults = null;
        renderAll();
    };
    window.addSubjectToFaculty = (facId) => {
        const nameInput = document.getElementById(`subject-name-${facId}`);
        const name = nameInput.value.trim();
        const type = document.getElementById(`subject-type-${facId}`).value;
        const fac = state.faculty.find(f => f.id === facId);
        if (name && fac && !fac.subjects.find(s => s.name === name)) {
            fac.subjects.push({ id: `sub-${Date.now()}`, name, type });
            nameInput.value = '';
            renderAll();
        }
    };
    window.removeSubjectFromFaculty = (facId, subId) => {
        const fac = state.faculty.find(f => f.id === facId);
        if(fac) fac.subjects = fac.subjects.filter(s => s.id !== subId);
        for(const secId in state.assignments) { state.assignments[secId] = state.assignments[secId].filter(a => a.subjectId !== subId); }
        lastGenerationResults = null;
        renderAll();
    };
    addSectionBtn.addEventListener('click', () => {
        const name = sectionNameInput.value.trim();
        if (name && !state.sections.find(s => s.name === name)) {
            const newSection = { id: `sec-${Date.now()}`, name };
            state.sections.push(newSection);
            state.assignments[newSection.id] = [];
            sectionNameInput.value = '';
            lastGenerationResults = null;
            renderAll();
        }
    });
    window.removeSection = (secId) => {
        state.sections = state.sections.filter(s => s.id !== secId);
        delete state.assignments[secId];
        lastGenerationResults = null;
        renderAll();
    };
    window.updateSubjectSelect = (sectionId) => {
        const facultyId = document.getElementById(`faculty-select-${sectionId}`).value;
        const subjectSelect = document.getElementById(`subject-select-${sectionId}`);
        subjectSelect.innerHTML = '<option value="">-- Select Subject --</option>';
        if (!facultyId) { subjectSelect.disabled = true; return; }
        const fac = state.faculty.find(f => f.id === facultyId);
        if (fac) {
            subjectSelect.innerHTML += fac.subjects.map(s => `<option value="${s.id}">${s.name} (${s.type})</option>`).join('');
            subjectSelect.disabled = false;
        }
    };
    window.addAssignment = (sectionId) => {
        const facultyId = document.getElementById(`faculty-select-${sectionId}`).value;
        const subjectId = document.getElementById(`subject-select-${sectionId}`).value;
        if (facultyId && subjectId) {
            const newAssign = { id: `assign-${Date.now()}`, sectionId, facultyId, subjectId, preferences: [] };
            const sub = state.faculty.find(f => f.id === facultyId)?.subjects.find(s => s.id === subjectId);
            if (sub.type === 'lab') { newAssign.periods = 2; newAssign.instances = 1; }
            else { newAssign.hours = 3; }
            state.assignments[sectionId].push(newAssign);
            renderAssignmentsForSection(sectionId);
            saveState();
        }
    };
    window.removeAssignment = (assignId) => {
        for(const secId in state.assignments) { state.assignments[secId] = state.assignments[secId].filter(a => a.id !== assignId); }
        lastGenerationResults = null;
        renderAll();
    };
    window.updateAssignment = (assignId, field, value) => {
        for(const secId in state.assignments) {
            const assign = state.assignments[secId].find(a => a.id === assignId);
            if (assign) {
                if ((field === 'hours' || field === 'instances') && assign[field] !== parseInt(value, 10)) {
                    assign[field] = parseInt(value, 10);
                    renderAssignmentsForSection(secId);
                } else {
                    assign[field] = parseInt(value, 10);
                }
                saveState();
                break;
            }
        }
    };
    window.updatePreference = (assignId, index, field, value) => {
        for (const secId in state.assignments) {
            const assign = state.assignments[secId].find(a => a.id === assignId);
            if (assign) {
                if (!assign.preferences) assign.preferences = [];
                if (!assign.preferences[index]) assign.preferences[index] = {};
                assign.preferences[index][field] = value;
                saveState();
                break;
            }
        }
    };
    modalClose.addEventListener('click', () => modal.style.display = 'none');
    window.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
    
    // --- Enter Key Submission ---
    function setupEnterKeySubmission(inputId, buttonId) {
        const input = document.getElementById(inputId);
        const button = document.getElementById(buttonId);
        if (input && button) {
            input.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    button.click();
                }
            });
        }
    }
    setupEnterKeySubmission('faculty-name-input', 'add-faculty-btn');
    setupEnterKeySubmission('section-name-input', 'add-section-btn');

    facultyListContainer.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && event.target.matches('input[id^="subject-name-"]')) {
            event.preventDefault();
            const form = event.target.closest('.add-subject-form');
            if (form) form.querySelector('button')?.click();
        }
    });
    
    coursesContainer.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && event.target.matches('.add-form select')) {
            event.preventDefault();
            const form = event.target.closest('.add-form');
            if (form) form.querySelector('button')?.click();
        }
    });

    // =================================================================================
    // =================== TIMETABLE GENERATION & RENDERING LOGIC ======================
    // =================================================================================
    generateBtn.addEventListener('click', () => {
        const btnText = generateBtn.querySelector('.btn-text');
        const spinner = generateBtn.querySelector('.spinner');
        btnText.textContent = 'Generating...';
        spinner.style.display = 'inline-block';
        generateBtn.disabled = true;
        setTimeout(() => {
            try {
                lastGenerationResults = generateAllTimetables();
                renderAllTimetables(lastGenerationResults);
            } catch (error) {
                console.error("Timetable generation failed:", error);
                alert("An error occurred during generation. Check console for details.");
            } finally {
                btnText.textContent = 'Generate Timetables';
                spinner.style.display = 'none';
                generateBtn.disabled = false;
            }
        }, 50);
    });

    function generateAllTimetables() {
        let timetables = {}, facultySchedules = {}, allUnassigned = {};
        const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        state.sections.forEach(sec => {
            timetables[sec.id] = {};
            days.forEach(day => {
                timetables[sec.id][day] = new Array(state.config.periodsPerDay).fill(null).map(() => []);
            });
            allUnassigned[sec.id] = [];
        });
        let coursesToPlace = [];
        for (const secId in state.assignments) {
            state.assignments[secId].forEach(assign => {
                const fac = state.faculty.find(f => f.id === assign.facultyId);
                const sub = fac?.subjects.find(s => s.id === assign.subjectId);
                if (!fac || !sub) return;
                const baseCourse = { ...assign, name: sub.name, type: sub.type, faculty: fac.name };
                const count = sub.type === 'lab' ? (assign.instances || 0) : (assign.hours || 0);
                for (let i = 0; i < count; i++) {
                    coursesToPlace.push({ ...baseCourse, instanceNum: i, totalDuration: sub.type === 'lab' ? (assign.periods || 1) : 1 });
                }
            });
        }
        coursesToPlace.sort((a,b) => {
            const aPref = a.preferences?.[a.instanceNum];
            const bPref = b.preferences?.[b.instanceNum];
            const aHasPref = aPref && (aPref.day !== 'Any Day' || aPref.period !== 'Any Period');
            const bHasPref = bPref && (bPref.day !== 'Any Day' || bPref.period !== 'Any Period');
            if (aHasPref && !bHasPref) return -1;
            if (!aHasPref && bHasPref) return 1;
            if (a.totalDuration > b.totalDuration) return -1;
            if (a.totalDuration < b.totalDuration) return 1;
            return 0;
        });

        function isSlotAvailable(course, secId, day, period, isPreferred = false) {
            const facultyName = course.faculty;
            if (!facultySchedules[facultyName]) {
                facultySchedules[facultyName] = {};
                days.forEach(d => facultySchedules[facultyName][d] = new Array(state.config.periodsPerDay).fill(false));
            }

            for (let i = 0; i < course.totalDuration; i++) {
                const currentPeriod = period + i;
                if (currentPeriod > state.config.periodsPerDay || (state.config.lunchBreakAt > 0 && currentPeriod === state.config.lunchBreakAt + 1)) return false;
                
                const slot = timetables[secId][day][currentPeriod - 1];
                if (facultySchedules[facultyName][day][currentPeriod - 1]) return false;

                if (slot.length > 0) {
                    if (course.type !== 'lab' || slot[0].type !== 'lab' || slot.length >= 2) {
                        return false;
                    }
                }
            }
            
            if (!isPreferred) {
                const daySchedule = timetables[secId][day].flat();
                if (course.type === 'lab' && daySchedule.some(p => p.type === 'lab')) return false;
                if (course.type === 'activity' && daySchedule.filter(p => p.type === 'activity').length >= 2) return false;
                if (course.type === 'subject' && daySchedule.filter(p => p.name === course.name).length >= 2) return false;
            }

            if (course.totalDuration === 1) {
                const prevPeriodSlot = timetables[secId][day][period - 2] || [];
                if (prevPeriodSlot.some(p => p.name === course.name)) return false;
            }

            return true;
        }

        function placeCourse(course, secId, day, period) {
            for (let i = 0; i < course.totalDuration; i++) {
                timetables[secId][day][period - 1 + i].push({ ...course, isContinuation: i > 0 });
                if (course.faculty) facultySchedules[course.faculty][day][period - 1 + i] = true;
            }
        }

        coursesToPlace.forEach(course => {
            let placed = false;
            const pref = course.preferences?.[course.instanceNum];
            const periods = Array.from({ length: state.config.periodsPerDay }, (_, i) => i + 1);

            if (pref && pref.day !== 'Any Day' && pref.period !== 'Any Period') {
                const targetPeriod = parseInt(pref.period.split(' ')[1]);
                if (isSlotAvailable(course, course.sectionId, pref.day, targetPeriod, true)) {
                    placeCourse(course, course.sectionId, pref.day, targetPeriod);
                    placed = true;
                }
            }

            if (!placed) {
                const processingDays = course.type === 'activity' ? [...days].reverse() : days;
                const processingPeriods = course.type === 'activity' ? [...periods].reverse() : periods;
                for (const day of processingDays) {
                    for (const period of processingPeriods) {
                        if (isSlotAvailable(course, course.sectionId, day, period, false)) {
                            placeCourse(course, course.sectionId, day, period);
                            placed = true;
                            break;
                        }
                    }
                    if (placed) break;
                }
            }
            if (!placed) allUnassigned[course.sectionId].push(course);
        });
        return { timetables, unassigned: allUnassigned };
    }

    function renderOutputArea() {
        if (lastGenerationResults) {
            renderAllTimetables(lastGenerationResults);
        } else if (state.sections.length > 0) {
            renderInitialTimetables();
        } else {
            timetablesContainer.innerHTML = '';
            outputPlaceholder.style.display = 'block';
        }
    }

    function renderInitialTimetables() {
        timetablesContainer.innerHTML = '';
        outputPlaceholder.style.display = 'none';
        state.sections.forEach(section => {
            const card = document.createElement('div');
            card.className = 'timetable-card';
            const timeSlots = [];
            let currentTime = 7 * 60 + state.config.startTime * 15;
            for (let i = 1; i <= state.config.periodsPerDay; i++) {
                const start = currentTime;
                const end = start + state.config.periodDuration;
                timeSlots.push(`${formatMinutes(start)} - ${formatMinutes(end)}`);
                currentTime = end;
            }
            card.innerHTML = `<div class="timetable-header"><h3>${section.name}</h3></div>
                <div class="timetable-table-container"><table class="timetable-table" id="table-${section.id}">
                <thead><tr><th class="day-header">Day</th>${Array.from({ length: state.config.periodsPerDay }, (_, i) => `<th>Period ${i + 1}<span class="time-slot">${timeSlots[i]}</span></th>`).join('')}</tr></thead><tbody>
                ${["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map(day => {
                    let rowHTML = `<tr><td class="day-header">${day}</td>`;
                    for (let period = 1; period <= state.config.periodsPerDay; period++) {
                        if (state.config.lunchBreakAt > 0 && period === state.config.lunchBreakAt + 1) {
                            rowHTML += `<td class="lunch-break">Lunch</td>`;
                        } else {
                            rowHTML += `<td>-</td>`;
                        }
                    }
                    return rowHTML + `</tr>`;
                }).join('')}</tbody></table></div>`;
            timetablesContainer.appendChild(card);
        });
    }

    function renderAllTimetables(results) {
        timetablesContainer.innerHTML = '';
        outputPlaceholder.style.display = 'none';
        if (state.sections.length === 0) {
            outputPlaceholder.style.display = 'block';
            return;
        }
        state.sections.forEach(section => {
            const timetable = results.timetables[section.id];
            const unassigned = results.unassigned[section.id];
            const card = document.createElement('div');
            card.className = 'timetable-card';
            const timeSlots = [];
            let currentTime = 7 * 60 + state.config.startTime * 15;
            for (let i = 1; i <= state.config.periodsPerDay; i++) {
                const start = currentTime;
                const end = start + state.config.periodDuration;
                timeSlots.push(`${formatMinutes(start)} - ${formatMinutes(end)}`);
                currentTime = end;
            }
            card.innerHTML = `<div class="timetable-header"><h3>${section.name}</h3><div class="actions">
                <button class="summary-btn" data-section-id="${section.id}"><span class="material-symbols-outlined">summarize</span>Summary</button>
                <button class="download-pdf-btn" data-section-id="${section.id}"><span class="material-symbols-outlined">download</span>PDF</button>
                </div></div><div class="timetable-table-container"><table class="timetable-table" id="table-${section.id}">
                <thead><tr><th class="day-header">Day</th>${Array.from({ length: state.config.periodsPerDay }, (_, i) => `<th>Period ${i + 1}<span class="time-slot">${timeSlots[i]}</span></th>`).join('')}</tr></thead><tbody>
                ${["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map(day => {
                    let rowHTML = `<tr><td class="day-header">${day}</td>`;
                    let period = 1;
                    while (period <= state.config.periodsPerDay) {
                        if (state.config.lunchBreakAt > 0 && period === state.config.lunchBreakAt + 1) {
                            rowHTML += `<td class="lunch-break" colspan="1">Lunch</td>`;
                            period++;
                            continue;
                        }
                        const coursesInSlot = timetable[day]?.[period - 1];
                        if (coursesInSlot && coursesInSlot.length > 0 && !coursesInSlot[0].isContinuation) {
                            const duration = coursesInSlot[0].totalDuration || 1;
                            const cellClass = coursesInSlot.length > 1 ? 'split-lab-cell' : coursesInSlot[0].type;
                            const cellContent = coursesInSlot.map(c => `<div class="course-item"><strong>${c.name}</strong></div>`).join('');
                            rowHTML += `<td class="${cellClass}" colspan="${duration}">${cellContent}</td>`;
                            period += duration;
                        } else if (!coursesInSlot || coursesInSlot.length === 0) {
                            rowHTML += `<td>-</td>`;
                            period++;
                        } else {
                            period++;
                        }
                    }
                    return rowHTML + `</tr>`;
                }).join('')}</tbody></table></div>`;
            const facultyMap = {};
            state.assignments[section.id].forEach(assign => {
                const fac = state.faculty.find(f => f.id === assign.facultyId);
                const sub = fac?.subjects.find(s => s.id === assign.subjectId);
                if (fac && sub) {
                    if (!facultyMap[fac.name]) facultyMap[fac.name] = new Set();
                    facultyMap[fac.name].add(sub.name);
                }
            });
            let facultyHTML = `<div class="faculty-list"><h4>Faculty & Coordinators</h4><ul>${Object.entries(facultyMap).map(([name, subs]) => `<li><strong>${name}:</strong> ${Array.from(subs).join(', ')}</li>`).join('')}</ul></div>`;
            let unassignedHTML = '';
            if (unassigned.length > 0) {
                const unassignedCounts = unassigned.reduce((acc, c) => {
                    const key = `${c.name} (${c.faculty})`;
                    acc[key] = (acc[key] || 0) + 1;
                    return acc;
                }, {});
                unassignedHTML = `<div class="unassigned-list"><h4><span class="material-symbols-outlined">warning</span>Unassigned Courses</h4><ul>${Object.entries(unassignedCounts).map(([name, count]) => `<li><strong>${name}</strong> (${count}x unassigned)</li>`).join('')}</ul></div>`;
            }
            const infoContainer = document.createElement('div');
            infoContainer.className = 'timetable-info';
            infoContainer.innerHTML = facultyHTML + unassignedHTML;
            card.appendChild(infoContainer);
            timetablesContainer.appendChild(card);
        });
        document.querySelectorAll('.summary-btn').forEach(btn => btn.addEventListener('click', showSummaryModal));
        document.querySelectorAll('.download-pdf-btn').forEach(btn => btn.addEventListener('click', downloadPDF));
    }
    
    function showSummaryModal(e) {
        const sectionId = e.currentTarget.dataset.sectionId;
        const section = state.sections.find(s => s.id === sectionId);
        document.getElementById('modal-title').textContent = `${section.name} - Summary`;
        const modalBody = document.getElementById('modal-body');
        modalBody.innerHTML = '';
        ['subject', 'lab', 'activity'].forEach(type => {
            const filteredAssignments = state.assignments[sectionId]?.filter(a => state.faculty.find(f => f.id === a.facultyId)?.subjects.find(s => s.id === a.subjectId)?.type === type) || [];
            if (filteredAssignments.length > 0) {
                modalBody.innerHTML += `<h4>${type.charAt(0).toUpperCase() + type.slice(1)}s</h4><ul>`;
                filteredAssignments.forEach(a => {
                    const fac = state.faculty.find(f => f.id === a.facultyId);
                    const sub = fac.subjects.find(s => s.id === a.subjectId);
                    let details = `(${fac.name})`;
                    if(type === 'lab') details = `(${a.instances}x/week, ${a.periods} periods each, ${fac.name})`;
                    else details = `(${a.hours} hrs/week, ${fac.name})`;
                    modalBody.innerHTML += `<li><strong>${sub.name}</strong> ${details}</li>`;
                });
                modalBody.innerHTML += `</ul>`;
            }
        });
        modal.style.display = 'flex';
    }

    async function downloadPDF(e) {
        if (!lastGenerationResults) { alert("Please generate a timetable first."); return; }
        const sectionId = e.currentTarget.dataset.sectionId;
        const section = state.sections.find(s => s.id === sectionId);
        const { PDFDocument, rgb, StandardFonts } = PDFLib;
        const pdfDoc = await PDFDocument.create();
        let page = pdfDoc.addPage([841.89, 595.28]);
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const colors = { title: rgb(0.05, 0.58, 0.53), headerBg: rgb(0.94, 1, 0.98), border: rgb(0.8, 0.8, 0.8), text: rgb(0.1, 0.1, 0.1), muted: rgb(0.4, 0.4, 0.4), lunch: rgb(0.97, 0.98, 0.99) };
        const margin = 40;
        const { width, height } = page.getSize();
        let currentY = height - margin;
        
        page.drawText(`${section.name} - Weekly Timetable`, { x: margin, y: currentY, font: boldFont, size: 22, color: colors.title });
        currentY -= 40;
        const tableElement = document.getElementById(`table-${section.id}`);
        const tableHeader = Array.from(tableElement.querySelectorAll(`thead th`));
        const tableRows = Array.from(tableElement.querySelectorAll(`tbody tr`));
        const colWidth = (width - 2 * margin) / (tableHeader.length);
        const rowHeight = 28;

        let currentX = margin;
        tableHeader.forEach((cell) => {
             page.drawRectangle({ x: currentX, y: currentY - rowHeight, width: colWidth, height: rowHeight, color: colors.headerBg, borderColor: colors.border, borderWidth: 0.5 });
            const [period, time] = cell.innerText.split('\n');
            page.drawText(period, { x: currentX + 5, y: currentY - 14, font: boldFont, size: 9, color: colors.text });
            if (time) page.drawText(time, { x: currentX + 5, y: currentY - 24, font: font, size: 7, color: colors.muted });
            currentX += colWidth;
        });

        currentY -= rowHeight;

        tableRows.forEach(row => {
            currentX = margin;
            Array.from(row.children).forEach(cell => {
                const cellWidth = colWidth * (cell.colSpan || 1);
                page.drawRectangle({ x: currentX, y: currentY - rowHeight, width: cellWidth, height: rowHeight, color: cell.classList.contains('lunch-break') ? colors.lunch : rgb(1, 1, 1), borderColor: colors.border, borderWidth: 0.5 });
                
                const text = cell.innerText.replace(/\n/g, ' / ');
                const textWidth = font.widthOfTextAtSize(text, 9);
                page.drawText(text, { x: currentX + (cellWidth - textWidth) / 2, y: currentY - rowHeight / 2 - 4, font: font, size: 9, color: colors.text });
                currentX += cellWidth;
            });
            currentY -= rowHeight;
        });

        currentY -= 20;
        
        const facultyMap = {};
        state.assignments[sectionId]?.forEach(a => { 
            const fac = state.faculty.find(f => f.id === a.facultyId); 
            const sub = fac?.subjects.find(s => s.id === a.subjectId); 
            if(fac && sub) { 
                if(!facultyMap[fac.name]) facultyMap[fac.name] = new Set();
                facultyMap[fac.name].add(sub.name);
            }
        });

        if (Object.keys(facultyMap).length > 0) {
            if (currentY < 100) { 
                page = pdfDoc.addPage([841.89, 595.28]);
                currentY = height - margin;
            }
            
            page.drawText('Faculty & Subject Assignments', { x: margin, y: currentY, font: boldFont, size: 14, color: colors.title });
            currentY -= 25;

            const facultyColWidth = 150;
            const subjectColWidth = width - (2 * margin) - facultyColWidth;
            
            page.drawRectangle({ x: margin, y: currentY - 22, width: facultyColWidth, height: 22, color: colors.headerBg });
            page.drawRectangle({ x: margin + facultyColWidth, y: currentY - 22, width: subjectColWidth, height: 22, color: colors.headerBg });
            page.drawText('Faculty', { x: margin + 5, y: currentY - 15, font: boldFont, size: 10 });
            page.drawText('Subjects', { x: margin + facultyColWidth + 5, y: currentY - 15, font: boldFont, size: 10 });
            currentY -= 22;

            Object.entries(facultyMap).forEach(([name, subs]) => {
                const subjectsText = Array.from(subs).join(', ');
                const wrappedSubs = getWrappedText(subjectsText, font, 9, subjectColWidth - 10);
                const requiredHeight = Math.max(22, wrappedSubs.length * 12 + 10);

                if (currentY - requiredHeight < margin) {
                    page = pdfDoc.addPage([841.89, 595.28]);
                    currentY = height - margin;
                }
                
                let lineY = currentY - (requiredHeight / 2) + ((wrappedSubs.length - 1) * 6) - 2;
                wrappedSubs.forEach(line => {
                    page.drawText(line, { x: margin + facultyColWidth + 5, y: lineY, font: font, size: 9 });
                    lineY -= 12;
                });
                
                page.drawText(name, { x: margin + 5, y: currentY - requiredHeight / 2 - 4, font: font, size: 9 });

                page.drawRectangle({ x: margin, y: currentY - requiredHeight, width: facultyColWidth, height: requiredHeight, borderColor: colors.border, borderWidth: 0.5 });
                page.drawRectangle({ x: margin + facultyColWidth, y: currentY - requiredHeight, width: subjectColWidth, height: requiredHeight, borderColor: colors.border, borderWidth: 0.5 });
                
                currentY -= requiredHeight;
            });
        }

        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${section.name}_Timetable.pdf`;
        link.click();
    }

    function getWrappedText(text, font, size, maxWidth) {
        const words = text.split(' ');
        if (words.length === 0) return [];
        let lines = [];
        let currentLine = words[0];
        for (let i = 1; i < words.length; i++) {
            const word = words[i];
            const width = font.widthOfTextAtSize(currentLine + " " + word, size);
            if (width < maxWidth) {
                currentLine += " " + word;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
        lines.push(currentLine);
        return lines;
    }

    function formatMinutes(m) { const h = Math.floor(m / 60); const min = m % 60; return `${h % 12 === 0 ? 12 : h % 12}:${min.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`; }
    function formatTime(v) { return formatMinutes(7 * 60 + v * 15); }
    
    // =================================================================================
    // ================================ INITIALIZATION =================================
    // =================================================================================
    function init() {
        loadState();
        renderAll();
    }
    init();
});