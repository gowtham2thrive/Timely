document.addEventListener('DOMContentLoaded', () => {
    // DOM ELEMENT REFERENCES
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
    const maxSubjectsSlider = document.getElementById('max-subjects-per-day');
    const maxSubjectsValue = document.getElementById('max-subjects-per-day-value');
    const maxLabsSlider = document.getElementById('max-labs-per-day');
    const maxLabsValue = document.getElementById('max-labs-per-day-value');
    const maxActivitiesSlider = document.getElementById('max-activities-per-day');
    const maxActivitiesValue = document.getElementById('max-activities-per-day-value');
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

    const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    let timetableWorker;

    // STATE MANAGEMENT
    let state = {
        theme: 'light',
        config: {
            periodsPerDay: 8,
            startTime: 8,
            periodDuration: 45,
            lunchBreakAt: 4,
            maxSubjectsPerDay: 2,
            maxLabsPerDay: 1,
            maxActivitiesPerDay: 2
        },
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
                const loaded = JSON.parse(savedState);
                state.config = { ...state.config, ...loaded.config };
                state = {
                    ...state,
                    ...loaded,
                    sections: loaded.sections || [],
                    faculty: loaded.faculty || []
                };
                 state.sections.forEach(s => { if (s.inCharge === undefined) s.inCharge = null; });
                state.faculty.forEach(f => {
                    if (!f.availability || !f.availability.Monday || f.availability.Monday.length !== state.config.periodsPerDay) {
                       f.availability = {};
                       DAYS.forEach(day => {
                           f.availability[day] = new Array(state.config.periodsPerDay).fill(true);
                       });
                    }
                });

            } catch (e) {
                console.error("Failed to parse state from localStorage, resetting state.", e);
                localStorage.removeItem('timetableGeneratorState_vFinal');
            }
        }
    }

    // UI RENDERING
    function renderAll() {
        applyTheme();
        updateConfigUI();
        renderFaculty();
        renderSections();
        renderOutputArea();
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
        maxSubjectsSlider.value = state.config.maxSubjectsPerDay;
        maxSubjectsValue.textContent = state.config.maxSubjectsPerDay;
        maxLabsSlider.value = state.config.maxLabsPerDay;
        maxLabsValue.textContent = state.config.maxLabsPerDay;
        maxActivitiesSlider.value = state.config.maxActivitiesPerDay;
        maxActivitiesValue.textContent = state.config.maxActivitiesPerDay;
    }
    
    function renderFaculty() {
        facultyListContainer.innerHTML = '';
        state.faculty.forEach(fac => {
            const card = document.createElement('div');
            card.className = 'faculty-card';
            const gridCols = `30px repeat(${state.config.periodsPerDay}, 1fr)`;

            card.innerHTML = `
                <button class="icon-btn danger-btn card-delete-btn" onclick="removeFaculty('${fac.id}')"><span class="material-symbols-outlined">close</span></button>
                <div class="faculty-header"><h4>${fac.name}</h4></div>
                <div class="subjects-list">
                    ${fac.subjects.map(sub => `<div class="subject-tag"><span>${sub.name} (${sub.type})</span><span class="remove-subject-btn material-symbols-outlined" onclick="removeSubjectFromFaculty('${fac.id}', '${sub.id}')">close</span></div>`).join('')}
                </div>
                <div class="add-subject-form">
                    <input type="text" id="subject-name-${fac.id}" placeholder="Subject/Lab Name">
                    <select id="subject-type-${fac.id}"><option value="subject">Subject</option><option value="lab">Lab</option><option value="activity">Activity</option></select>
                    <button onclick="addSubjectToFaculty('${fac.id}')"><span class="material-symbols-outlined">add</span></button>
                </div>
                <details class="availability-details">
                    <summary>Set Availability</summary>
                    <div class="availability-grid" style="grid-template-columns: ${gridCols};">
                        <div class="header"></div> ${Array.from({ length: state.config.periodsPerDay }, (_, i) => `<div class="header">P${i + 1}</div>`).join('')}
                        ${DAYS.map(day => `
                            <div class="header">${day.substring(0, 3)}</div>
                            ${Array.from({ length: state.config.periodsPerDay }, (_, p) => `
                                <input type="checkbox" id="avail-${fac.id}-${day}-${p}" ${(fac.availability?.[day]?.[p] ?? true) ? 'checked' : ''} onchange="updateAvailability('${fac.id}', '${day}', ${p}, this.checked)">
                            `).join('')}
                        `).join('')}
                    </div>
                </details>
            `;
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

        const assignedFacultyIds = new Set(state.assignments[section.id].map(a => a.facultyId));
        const inChargeOptions = state.faculty
            .filter(f => assignedFacultyIds.has(f.id))
            .map(f => `<option value="${f.id}" ${section.inCharge === f.id ? 'selected' : ''}>${f.name}</option>`).join('');

        const facultyOptions = state.faculty.map(f => `<option value="${f.id}">${f.name}</option>`).join('');
        
        block.innerHTML = `
            <h3>${section.name} - Course Assignments</h3>
            <div class="in-charge-selector">
                <label for="in-charge-select-${section.id}">In-Charge:</label>
                <select id="in-charge-select-${section.id}" onchange="updateInCharge('${section.id}', this.value)" ${!inChargeOptions ? 'disabled' : ''}>
                    ${inChargeOptions || '<option>-- No staff assigned --</option>'}
                </select>
            </div>
            <div id="assignments-list-${section.id}"></div>
            <div class="add-form">
                <select id="faculty-select-${section.id}" onchange="updateSubjectSelect('${section.id}')"><option value="">-- Select Faculty --</option>${facultyOptions}</select>
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
            const hoursOrInstances = (sub.type === 'lab') ? (assign.instances || 1) : (assign.hours || 1);
            card.innerHTML = `
                <button class="icon-btn danger-btn card-delete-btn" onclick="removeAssignment('${assign.id}')"><span class="material-symbols-outlined">close</span></button>
                <div class="assignment-details"><strong>${sub.name}</strong> <span>by ${fac.name}</span></div>
                <div class="assignment-grid">
                    ${sub.type === 'lab' ? 
                        `<label>Periods/Instance</label><input type="number" value="${assign.periods || 2}" min="1" onchange="updateAssignment('${assign.id}', 'periods', this.value)">
                         <label>Instances/Week</label><input type="number" value="${assign.instances || 1}" min="1" onchange="updateAssignment('${assign.id}', 'instances', this.value)">` :
                        `<label>Hours/Week</label><input type="number" value="${assign.hours || 1}" min="1" onchange="updateAssignment('${assign.id}', 'hours', this.value)">`
                    }
                </div>
                <details><summary>Set Period Preferences</summary><div class="preferences-container">${generatePreferencesHTML(assign, hoursOrInstances)}</div></details>`;
            container.appendChild(card);
        });
    }

    function generatePreferencesHTML(assignment, count) {
        let html = '';
        const periods = ['Any Period', ...Array.from({ length: state.config.periodsPerDay }, (_, i) => `Period ${i + 1}`)];
        if (!assignment.preferences) assignment.preferences = [];
        for (let i = 0; i < count; i++) {
            const pref = assignment.preferences[i] || { day: 'Any Day', period: 'Any Period' };
            const dayOptions = ['Any Day', ...DAYS].map(d => `<option value="${d}" ${pref.day === d ? 'selected' : ''}>${d}</option>`).join('');
            html += `<div class="preference-row">
                <select onchange="updatePreference('${assignment.id}', ${i}, 'day', this.value)">${dayOptions}</select>
                <select onchange="updatePreference('${assignment.id}', ${i}, 'period', this.value)">${periods.map(p => `<option value="${p}" ${pref.period === p ? 'selected' : ''}>${p}</option>`).join('')}</select>
                </div>`;
        }
        return html;
    }
    
    // EVENT HANDLERS & ACTIONS
    themeToggleBtn.addEventListener('click', () => { state.theme = state.theme === 'light' ? 'dark' : 'light'; renderAll(); });
    clearAllBtn.addEventListener('click', () => { 
        if (confirm('Are you sure you want to clear all data? This cannot be undone.')) { 
            localStorage.removeItem('timetableGeneratorState_vFinal'); 
            location.reload(); 
        } 
    });
    
    [periodsSlider, startTimeSlider, durationSlider, lunchSlider, maxSubjectsSlider, maxLabsSlider, maxActivitiesSlider].forEach(slider => slider.addEventListener('input', handleConfigChange));
    
    function handleConfigChange(e) {
        const keyMap = { 
            'periods-per-day': 'periodsPerDay', 'start-time': 'startTime', 'period-duration': 'periodDuration', 
            'lunch-break-at': 'lunchBreakAt', 'max-subjects-per-day': 'maxSubjectsPerDay', 
            'max-labs-per-day': 'maxLabsPerDay', 'max-activities-per-day': 'maxActivitiesPerDay'
        };
        const oldValue = state.config[keyMap[e.target.id]];
        const newValue = parseInt(e.target.value);

        if (oldValue !== newValue) {
            state.config[keyMap[e.target.id]] = newValue;
            if (keyMap[e.target.id] === 'periodsPerDay') {
                state.faculty.forEach(f => {
                    DAYS.forEach(day => {
                        const oldAvail = f.availability[day] || [];
                        const newAvail = new Array(newValue).fill(true);
                        for(let i = 0; i < Math.min(oldAvail.length, newValue); i++){
                            newAvail[i] = oldAvail[i];
                        }
                        f.availability[day] = newAvail;
                    });
                });
            }
            lastGenerationResults = null;
            renderAll();
        }
    }
    
    addFacultyBtn.addEventListener('click', () => {
        const name = facultyNameInput.value.trim();
        if (name && !state.faculty.find(f => f.name === name)) {
            const availability = {};
            DAYS.forEach(day => {
                availability[day] = new Array(state.config.periodsPerDay).fill(true);
            });
            state.faculty.push({ id: `fac-${Date.now()}`, name, subjects: [], availability });
            facultyNameInput.value = '';
            renderAll();
        }
    });

    addSectionBtn.addEventListener('click', () => {
        const name = sectionNameInput.value.trim();
        if (name && !state.sections.find(s => s.name === name)) {
            state.sections.push({ id: `sec-${Date.now()}`, name, inCharge: null });
            sectionNameInput.value = '';
            renderAll();
        }
    });

    window.updateAvailability = (facId, day, period, isAvailable) => {
        const fac = state.faculty.find(f => f.id === facId);
        if (fac) {
            fac.availability[day][period] = isAvailable;
            saveState();
        }
    };

    window.updateInCharge = (sectionId, facultyId) => {
        const section = state.sections.find(s => s.id === sectionId);
        if (section) {
            section.inCharge = facultyId;
            saveState();
        }
    };
    
    window.addAssignment = (sectionId) => {
        const facultyId = document.getElementById(`faculty-select-${sectionId}`).value;
        const subjectId = document.getElementById(`subject-select-${sectionId}`).value;
        const section = state.sections.find(s => s.id === sectionId);
        if (facultyId && subjectId && section) {
            
            const isAlreadyInCharge = state.sections.some(s => s.inCharge === facultyId);
            if (!section.inCharge && !isAlreadyInCharge) {
                section.inCharge = facultyId;
            }
            
            const newAssign = { id: `assign-${Date.now()}`, sectionId, facultyId, subjectId, preferences: [] };
            const sub = state.faculty.find(f => f.id === facultyId)?.subjects.find(s => s.id === subjectId);
            if (sub.type === 'lab') { newAssign.periods = 2; newAssign.instances = 1; }
            else { newAssign.hours = 3; }
            state.assignments[sectionId].push(newAssign);
            renderAll();
        }
    };
     window.removeFaculty = (facId) => {
        state.faculty = state.faculty.filter(f => f.id !== facId);
        state.sections.forEach(s => { 
            if (s.inCharge === facId) {
                s.inCharge = null; 
            }
        });
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
    window.removeAssignment = (assignId) => {
        for(const secId in state.assignments) { state.assignments[secId] = state.assignments[secId].filter(a => a.id !== assignId); }
        lastGenerationResults = null;
        renderAll();
    };
    window.updateAssignment = (assignId, field, value) => {
        for(const secId in state.assignments) {
            const assign = state.assignments[secId].find(a => a.id === assignId);
            if (assign) {
                const parsedValue = parseInt(value, 10);
                if (assign[field] !== parsedValue) {
                    assign[field] = parsedValue;
                    lastGenerationResults = null;
                    renderAll();
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

    // GENERATION (using Web Worker)
    generateBtn.addEventListener('click', () => {
        const btnText = generateBtn.querySelector('.btn-text');
        const spinner = generateBtn.querySelector('.spinner');
        
        try {
            if (timetableWorker) {
                timetableWorker.terminate();
            }
            timetableWorker = new Worker('worker.js');

            btnText.textContent = 'Generating...';
            spinner.style.display = 'inline-block';
            generateBtn.disabled = true;
            
            timetableWorker.postMessage(JSON.parse(JSON.stringify(state)));

            timetableWorker.onmessage = (event) => {
                lastGenerationResults = event.data;
                renderAllTimetables(lastGenerationResults);
                
                btnText.textContent = 'Generate Timetables';
                spinner.style.display = 'none';
                generateBtn.disabled = false;
                if(timetableWorker) timetableWorker.terminate();
            };

            timetableWorker.onerror = (error) => {
                console.error("Worker error:", error);
                alert("An error occurred during generation. This can happen if you are running the file directly from your computer. Please use a local server (like VS Code's 'Live Server' extension).");
                btnText.textContent = 'Generate Timetables';
                spinner.style.display = 'none';
                generateBtn.disabled = false;
                if(timetableWorker) timetableWorker.terminate();
            };
        } catch (error) {
            console.error("Failed to construct Worker:", error);
            alert("Could not start the generation process due to a browser security policy. Please run this page from a local web server, not by opening the file directly.");
            btnText.textContent = 'Generate Timetables';
            spinner.style.display = 'none';
            generateBtn.disabled = false;
        }
    });

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
            card.innerHTML = `<div class="timetable-header"><div class="header-info"><h3>${section.name}</h3></div></div>
                <div class="timetable-table-container"><table class="timetable-table" id="table-${section.id}">
                <thead><tr><th class="day-header">Day</th>${Array.from({ length: state.config.periodsPerDay }, (_, i) => `<th>Period ${i + 1}<span class="time-slot">${timeSlots[i]}</span></th>`).join('')}</tr></thead><tbody>
                ${DAYS.map(day => {
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
        if (!results || !results.timetables || state.sections.length === 0) {
            renderInitialTimetables();
            return;
        }
        state.sections.forEach(section => {
            const timetable = results.timetables[section.id];
            const unassigned = results.unassigned[section.id] || [];
            const inCharge = state.faculty.find(f => f.id === section.inCharge);
            const inChargeHTML = inCharge ? `<span class="in-charge-badge">In-Charge: ${inCharge.name}</span>` : '';
            
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
            card.innerHTML = `
                <div class="timetable-header">
                    <div class="header-info">
                        <h3>${section.name}</h3>
                        ${inChargeHTML}
                    </div>
                    <div class="actions">
                        <button class="summary-btn" data-section-id="${section.id}"><span class="material-symbols-outlined">summarize</span>Summary</button>
                        <button class="download-pdf-btn" data-section-id="${section.id}"><span class="material-symbols-outlined">download</span>PDF</button>
                    </div>
                </div>
                <div class="timetable-table-container">
                    <table class="timetable-table" id="table-${section.id}">
                        <thead><tr><th class="day-header">Day</th>${Array.from({ length: state.config.periodsPerDay }, (_, i) => `<th>Period ${i + 1}<span class="time-slot">${timeSlots[i]}</span></th>`).join('')}</tr></thead>
                        <tbody>
                            ${DAYS.map(day => {
                                let rowHTML = `<tr><td class="day-header">${day}</td>`;
                                let period = 1;
                                while (period <= state.config.periodsPerDay) {
                                    if (state.config.lunchBreakAt > 0 && period === state.config.lunchBreakAt + 1) {
                                        rowHTML += `<td class="lunch-break" colspan="1">Lunch</td>`;
                                        period++;
                                        continue;
                                    }
                                    const coursesInSlot = timetable?.[day]?.[period - 1];
                                    if (coursesInSlot && coursesInSlot.length > 0 && !coursesInSlot[0].isContinuation) {
                                        const duration = coursesInSlot[0].totalDuration || 1;
                                        const cellClass = coursesInSlot.length > 1 ? 'split-lab-cell' : coursesInSlot[0].type;
                                        const cellContent = coursesInSlot.map(c => `<div class="course-item"><strong>${c.name}</strong><br><small>${c.faculty}</small></div>`).join('');
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
                            }).join('')}
                        </tbody>
                    </table>
                </div>`;
            
            const unassignedCounts = unassigned.reduce((acc, c) => {
                    const key = `${c.name} (${c.faculty})`;
                    acc[key] = (acc[key] || 0) + 1;
                    return acc;
                }, {});
            const unassignedHTML = unassigned.length > 0 ? `<div class="unassigned-list"><h4><span class="material-symbols-outlined">warning</span>Unassigned Courses</h4><ul>${Object.entries(unassignedCounts).map(([name, count]) => `<li><strong>${name}</strong> (${count}x unassigned)</li>`).join('')}</ul></div>` : '';
            
            const infoContainer = document.createElement('div');
            infoContainer.className = 'timetable-info';
            infoContainer.innerHTML = unassignedHTML;
            if (unassignedHTML) {
                card.appendChild(infoContainer);
            }

            timetablesContainer.appendChild(card);
        });
        document.querySelectorAll('.summary-btn').forEach(btn => btn.addEventListener('click', showSummaryModal));
        document.querySelectorAll('.download-pdf-btn').forEach(btn => btn.addEventListener('click', downloadPDF));
    }

    function showSummaryModal(e) {
        const sectionId = e.currentTarget.dataset.sectionId;
        const section = state.sections.find(s => s.id === sectionId);
        if (!section) return;
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
        const sectionId = e.currentTarget.dataset.sectionId;
        const section = state.sections.find(s => s.id === sectionId);
        const inCharge = state.faculty.find(f => f.id === section.inCharge);

        if (!lastGenerationResults || !section) { alert("Please generate a timetable first."); return; }
        
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
        
        if (inCharge) {
            const inChargeText = `In-Charge: ${inCharge.name}`;
            const inChargeWidth = boldFont.widthOfTextAtSize(inChargeText, 10);
            page.drawText(inChargeText, { x: width - margin - inChargeWidth, y: currentY + 5, font: boldFont, size: 10, color: colors.muted });
        }

        currentY -= 40;
        const tableElement = document.getElementById(`table-${section.id}`);
        if (!tableElement) {
            alert('Could not find timetable table to generate PDF.');
            return;
        }
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
                
                const text = cell.innerText.replace(/\n\n/g, ' / ').replace(/\n/g, ', ');
                const textWidth = font.widthOfTextAtSize(text, 9);
                page.drawText(text, { x: currentX + (cellWidth - textWidth) / 2, y: currentY - rowHeight / 2 - 4, font: font, size: 9, color: colors.text });
                currentX += cellWidth;
            });
            currentY -= rowHeight;
        });

        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${section.name}_Timetable.pdf`;
        link.click();
    }
    
    modalClose.addEventListener('click', () => modal.style.display = 'none');
    window.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

    function formatMinutes(m) { const h = Math.floor(m / 60); const min = m % 60; return `${h % 12 === 0 ? 12 : h % 12}:${min.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`; }
    function formatTime(v) { return formatMinutes(7 * 60 + v * 15); }

    // --- Enter Key Submission Logic ---
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
        if (event.key === 'Enter' && (event.target.matches('.add-form select') || event.target.matches('.add-form input'))) {
            event.preventDefault();
            const form = event.target.closest('.add-form');
            if (form) form.querySelector('button')?.click();
        }
    });
    
    function init() {
        loadState();
        renderAll();
    }
    init();
});