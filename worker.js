// worker.js - Handles heavy lifting of timetable generation

self.onmessage = function(event) {
    const state = event.data;
    const results = generateAllTimetables(state);
    self.postMessage(results);
};

function generateAllTimetables(state) {
    let timetables = {}, facultySchedules = {}, allUnassigned = {};
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    
    // Initialize timetables and schedules
    state.sections.forEach(sec => {
        timetables[sec.id] = {};
        days.forEach(day => {
            timetables[sec.id][day] = new Array(state.config.periodsPerDay).fill(null).map(() => []);
        });
        allUnassigned[sec.id] = [];
    });
    state.faculty.forEach(fac => {
        facultySchedules[fac.name] = {};
        days.forEach(d => facultySchedules[fac.name][d] = new Array(state.config.periodsPerDay).fill(false));
    });

    const allCourses = [];
    for (const secId in state.assignments) {
        state.assignments[secId].forEach(assign => {
            const fac = state.faculty.find(f => f.id === assign.facultyId);
            const sub = fac?.subjects.find(s => s.id === assign.subjectId);
            if (fac && sub) {
                const baseCourse = { ...assign, name: sub.name, type: sub.type, faculty: fac.name };
                const count = sub.type === 'lab' ? (assign.instances || 0) : (assign.hours || 0);
                for (let i = 0; i < count; i++) {
                    allCourses.push({ ...baseCourse, instanceNum: i, totalDuration: sub.type === 'lab' ? (assign.periods || 1) : 1 });
                }
            }
        });
    }
    
    const labCourses = allCourses.filter(c => c.type === 'lab');
    const pairedLabIds = new Set();
    const pairedLabsToPlace = [];

    for (let i = 0; i < labCourses.length; i++) {
        for (let j = i + 1; j < labCourses.length; j++) {
            const lab1 = labCourses[i];
            const lab2 = labCourses[j];
            const pref1 = lab1.preferences?.[lab1.instanceNum];
            const pref2 = lab2.preferences?.[lab2.instanceNum];

            if (lab1.sectionId === lab2.sectionId && pref1 && pref2 &&
                pref1.day !== 'Any Day' && pref1.period !== 'Any Period' &&
                pref1.day === pref2.day && pref1.period === pref2.period &&
                !pairedLabIds.has(lab1.id) && !pairedLabIds.has(lab2.id)) {
                
                pairedLabsToPlace.push({ lab1, lab2, pref: pref1 });
                pairedLabIds.add(lab1.id);
                pairedLabIds.add(lab2.id);
            }
        }
    }

    pairedLabsToPlace.forEach(pair => {
        const { lab1, lab2, pref } = pair;
        const targetDay = pref.day;
        const targetPeriod = parseInt(pref.period.split(' ')[1]);
        const duration = Math.max(lab1.totalDuration, lab2.totalDuration);
        const faculty1 = state.faculty.find(f => f.id === lab1.facultyId);
        const faculty2 = state.faculty.find(f => f.id === lab2.facultyId);

        let canPlacePair = true;
        if (!faculty1 || !faculty2) {
            canPlacePair = false;
        } else {
            for (let i = 0; i < duration; i++) {
                const p_1_indexed = targetPeriod + i;
                const p_0_indexed = p_1_indexed - 1;
                
                if (p_0_indexed >= state.config.periodsPerDay ||
                    (state.config.lunchBreakAt > 0 && p_1_indexed === state.config.lunchBreakAt + 1) ||
                    !timetables[lab1.sectionId]?.[targetDay]?.[p_0_indexed] ||
                    timetables[lab1.sectionId][targetDay][p_0_indexed].length > 0 ||
                    facultySchedules[lab1.faculty][targetDay][p_0_indexed] ||
                    facultySchedules[lab2.faculty][targetDay][p_0_indexed] ||
                    !faculty1.availability?.[targetDay]?.[p_0_indexed] || 
                    !faculty2.availability?.[targetDay]?.[p_0_indexed]) {
                    canPlacePair = false;
                    break;
                }
            }
        }

        if (canPlacePair) {
            for (let i = 0; i < duration; i++) {
                const p = targetPeriod + i - 1;
                timetables[lab1.sectionId][targetDay][p].push({ ...lab1, isContinuation: i > 0 });
                timetables[lab1.sectionId][targetDay][p].push({ ...lab2, isContinuation: i > 0 });
                facultySchedules[lab1.faculty][targetDay][p] = true;
                facultySchedules[lab2.faculty][targetDay][p] = true;
            }
        } else {
            allUnassigned[lab1.sectionId].push(lab1);
            allUnassigned[lab2.sectionId].push(lab2);
        }
    });
    
    let coursesToPlace = allCourses.filter(c => !pairedLabIds.has(c.id));
    
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

    function isSlotAvailable(course, secId, day, period) {
        const facultyName = course.faculty;
        const faculty = state.faculty.find(f => f.id === course.facultyId);

        if (!faculty) return false;

        for (let i = 0; i < course.totalDuration; i++) {
            const currentPeriod = period + i;
            const periodIndex = currentPeriod - 1;
            if (currentPeriod > state.config.periodsPerDay || (state.config.lunchBreakAt > 0 && currentPeriod === state.config.lunchBreakAt + 1)) {
                return false;
            }
             if (!faculty.availability?.[day]?.[periodIndex]) {
                return false;
            }
            const slot = timetables[secId]?.[day]?.[periodIndex];
            if (!slot || slot.length > 0) {
                return false; 
            }
            if (facultySchedules[facultyName]?.[day]?.[periodIndex]) {
                return false;
            }
        }
        
        const daySchedule = timetables[secId][day].flat();
        const labSessionsOnDay = daySchedule.filter(c => c.type === 'lab' && !c.isContinuation).length;
        if (course.type === 'lab' && labSessionsOnDay >= state.config.maxLabsPerDay) return false;
        
        if (course.type === 'activity' && daySchedule.filter(c => c.type === 'activity').length >= state.config.maxActivitiesPerDay) return false;
        if (course.type === 'subject' && daySchedule.filter(c => c.name === course.name).length >= state.config.maxSubjectsPerDay) return false;
        
        if (course.totalDuration === 1) {
            const prevPeriodSlot = timetables[secId][day][period - 2] || [];
            if (prevPeriodSlot.some(p => p.name === course.name)) return false;
        }
        return true;
    }

    function placeCourse(course, secId, day, period) {
        for (let i = 0; i < course.totalDuration; i++) {
            timetables[secId][day][period - 1 + i].push({ ...course, isContinuation: i > 0 });
            facultySchedules[course.faculty][day][period - 1 + i] = true;
        }
    }
    
    coursesToPlace.forEach(course => {
        let placed = false;
        const pref = course.preferences?.[course.instanceNum];
        if (pref && pref.day !== 'Any Day' && pref.period !== 'Any Period') {
            const targetPeriod = parseInt(pref.period.split(' ')[1]);
            if (isSlotAvailable(course, course.sectionId, pref.day, targetPeriod)) {
                placeCourse(course, course.sectionId, pref.day, targetPeriod);
                placed = true;
            }
        }

        if (!placed) {
            const periods = Array.from({ length: state.config.periodsPerDay }, (_, i) => i + 1);
            const processingDays = course.type === 'activity' ? [...days].reverse() : days;
            const processingPeriods = course.type === 'activity' ? [...periods].reverse() : periods;
            for (const day of processingDays) {
                for (const period of processingPeriods) {
                    if (isSlotAvailable(course, course.sectionId, day, period)) {
                        placeCourse(course, course.sectionId, day, period);
                        placed = true;
                        break;
                    }
                }
                if (placed) break;
            }
        }
        if (!placed) {
            allUnassigned[course.sectionId].push(course);
        }
    });

    return { timetables, unassigned: allUnassigned };
}