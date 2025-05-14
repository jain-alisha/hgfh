document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    const tasksContainer = document.getElementById('tasks');
    const featuredTaskContainer = document.getElementById('featured-task');
    const tabButtons = document.querySelectorAll('.tab-btn');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const notesOverlay = document.querySelector('.notes-overlay');
    const notesTextarea = document.getElementById('task-notes');
    const saveNotesBtn = document.querySelector('.save-notes-btn');
    const selectNewTaskBtn = document.getElementById('selectNewTask');
    const clearCheckboxesBtn = document.getElementById('clearCheckboxes');
    const progressBar = document.querySelector('.progress-fill');
    const progressText = document.querySelector('.progress-text');
    const addTaskBtn = document.getElementById('addTaskBtn');
    const taskModal = document.getElementById('taskModal');
    const taskForm = document.getElementById('taskForm');

    // Initialize state
    let currentCategory = 'elementary';
    let currentFilter = 'all';
    let currentTasks = {};
    let completedTasks = new Set(JSON.parse(localStorage.getItem('completedTasks') || '[]'));
    let taskNotes = JSON.parse(localStorage.getItem('taskNotes') || '{}');
    let currentEditingTaskId = null;

    // Fetch tasks from backend
    const fetchTasks = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/tasks');
            currentTasks = await response.json();
            filterTasks();
            selectRandomTask();
        } catch (error) {
            console.error('Error fetching tasks:', error);
        }
    };

    // Filter tasks
    const filterTasks = () => {
        const tasks = currentTasks[currentCategory] || [];
        let filteredTasks = tasks;

        if (currentFilter === 'completed') {
            filteredTasks = tasks.filter(task => completedTasks.has(task.id));
        } else if (currentFilter === 'uncompleted') {
            filteredTasks = tasks.filter(task => !completedTasks.has(task.id));
        }

        displayTasks(filteredTasks);
    };

    // Display tasks
    const displayTasks = (tasks) => {
        tasksContainer.innerHTML = '';
        
        tasks.forEach((task, index) => {
            const taskCard = document.createElement('div');
            taskCard.className = 'task-card';
            taskCard.style.animationDelay = `${index * 0.1}s`;
            
            const taskId = task.id;
            const notes = taskNotes[taskId];
            const notesPreview = notes ? 
                `<div class="task-notes-preview">📝 ${notes.split('\n')[0]}</div>` : '';
            
            taskCard.innerHTML = `
                <button class="delete-btn" data-task-id="${taskId}">Delete</button>
                <input type="checkbox" class="task-checkbox" 
                       id="task-${taskId}" 
                       ${completedTasks.has(taskId) ? 'checked' : ''}>
                <h3 class="task-title">${task.title}</h3>
                <p class="task-description">${task.description}</p>
                ${task.extension ? `
                    <div class="task-extension">
                        <strong>Extension</strong>
                        <p>${task.extension}</p>
                        ${notesPreview}
                    </div>
                ` : notesPreview}
                <div class="task-id${task.teacher_submitted ? ' teacher-submitted' : ''}">${taskId}</div>
                <div class="badge-container">
                    <div class="grade-level ${currentCategory}">
                        ${currentCategory.charAt(0).toUpperCase() + currentCategory.slice(1)} School
                    </div>
                    ${task.teacher_submitted ? '<div class="teacher-badge">Teacher Submitted</div>' : ''}
                </div>
            `;
            
            // Add click handler for notes
            taskCard.addEventListener('click', (e) => {
                // Ignore clicks on buttons and checkboxes
                if (!e.target.closest('.delete-btn') && 
                    !e.target.closest('.task-checkbox')) {
                    showNotesModal(task.id);
                }
            });

            const checkbox = taskCard.querySelector('.task-checkbox');
            checkbox.addEventListener('change', () => {
                handleTaskCompletion(task.id, checkbox);
            });

            const deleteBtn = taskCard.querySelector('.delete-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    // TODO: Add delete confirmation
                });
            }
            
            tasksContainer.appendChild(taskCard);
        });
        
        updateProgress();
    };

    // Select random featured task
    const selectRandomTask = () => {
        const tasks = currentTasks[currentCategory] || [];
        if (tasks.length > 0) {
            const randomTask = tasks[Math.floor(Math.random() * tasks.length)];
            displayFeaturedTask(randomTask);
        }
    };

    // Display featured task
    const displayFeaturedTask = (task) => {
        if (!task) return;
        
        const taskId = task.id;
        const notes = taskNotes[taskId];
        const notesPreview = notes ? 
            `<div class="task-notes-preview">📝 ${notes.split('\n')[0]}</div>` : '';
        
        featuredTaskContainer.innerHTML = `
            <div class="featured-task">
                <input type="checkbox" class="task-checkbox" 
                       id="featured-${taskId}" 
                       ${completedTasks.has(taskId) ? 'checked' : ''}>
                <h3 class="task-title">${task.title}</h3>
                <p class="task-description">${task.description}</p>
                ${task.extension ? `
                    <div class="task-extension">
                        <strong>Extension</strong>
                        <p>${task.extension}</p>
                        ${notesPreview}
                    </div>
                ` : notesPreview}
                <div class="task-id${task.teacher_submitted ? ' teacher-submitted' : ''}">${taskId}</div>
                <div class="badge-container">
                    <div class="grade-level ${currentCategory}">
                        ${currentCategory.charAt(0).toUpperCase() + currentCategory.slice(1)} School
                    </div>
                    ${task.teacher_submitted ? '<div class="teacher-badge">Teacher Submitted</div>' : ''}
                </div>
            </div>
        `;

        const checkbox = featuredTaskContainer.querySelector('.task-checkbox');
        if (checkbox) {
            checkbox.addEventListener('change', () => {
                handleTaskCompletion(task.id, checkbox);
            });
        }

        featuredTaskContainer.querySelector('.featured-task').addEventListener('click', (e) => {
            if (!e.target.closest('.task-checkbox')) {
                showNotesModal(task.id);
            }
        });
    };

    // Handle task completion
    const handleTaskCompletion = (taskId, checkbox) => {
        if (checkbox.checked) {
            completedTasks.add(taskId);
        } else {
            completedTasks.delete(taskId);
        }
        
        localStorage.setItem('completedTasks', JSON.stringify([...completedTasks]));
        updateProgress();
        
        // Update any other instances of the same task
        document.querySelectorAll(`[id$="-${taskId}"]`).forEach(cb => {
            if (cb !== checkbox) {
                cb.checked = checkbox.checked;
            }
        });
    };

    // Clear all checkboxes
    clearCheckboxesBtn.addEventListener('click', () => {
        completedTasks.clear();
        localStorage.setItem('completedTasks', '[]');
        document.querySelectorAll('.task-checkbox').forEach(cb => {
            cb.checked = false;
        });
        updateProgress();
    });

    // Select new featured task
    selectNewTaskBtn.addEventListener('click', selectRandomTask);

    // Handle filter clicks
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            currentFilter = button.dataset.filter;
            filterTasks();
        });
    });

    // Handle tab clicks
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            currentCategory = button.dataset.category;
            filterTasks();
            selectRandomTask();
        });
    });

    // Update progress bar
    const updateProgress = () => {
        const tasks = currentTasks[currentCategory] || [];
        const completed = tasks.filter(task => completedTasks.has(task.id)).length;
        const total = tasks.length;
        const percentage = total ? (completed / total) * 100 : 0;
        
        progressBar.style.width = `${percentage}%`;
        progressText.textContent = `${completed}/${total} tasks completed`;
    };

    // Notes functionality
    const showNotesModal = (taskId) => {
        currentEditingTaskId = taskId;
        notesTextarea.value = taskNotes[taskId] || '';
        notesOverlay.style.display = 'flex';
    };

    saveNotesBtn.addEventListener('click', () => {
        const notes = notesTextarea.value.trim();
        if (currentEditingTaskId) {
            if (notes) {
                taskNotes[currentEditingTaskId] = notes;
            } else {
                delete taskNotes[currentEditingTaskId];
            }
            localStorage.setItem('taskNotes', JSON.stringify(taskNotes));
            filterTasks();
            selectRandomTask();
        }
        notesOverlay.style.display = 'none';
    });

    // Close modal on overlay click or X button
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.style.display = 'none';
            }
        });
    });

    document.querySelectorAll('.modal-close').forEach(button => {
        button.addEventListener('click', () => {
            button.closest('.modal-overlay').style.display = 'none';
        });
    });

    // Add task functionality
    addTaskBtn.addEventListener('click', () => {
        taskModal.style.display = 'flex';
    });

    taskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const newTask = {
            title: document.getElementById('taskTitle').value,
            description: document.getElementById('taskDescription').value,
            extension: document.getElementById('taskExtension').value,
            category: document.getElementById('taskCategory').value,
            teacher_submitted: true
        };
        
        try {
            const response = await fetch('http://localhost:5000/api/tasks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newTask)
            });
            
            if (response.ok) {
                // Clear form
                taskForm.reset();
                taskModal.style.display = 'none';
                
                // Refresh tasks
                await fetchTasks();
                
                // Switch to the new task's category
                currentCategory = newTask.category;
                tabButtons.forEach(btn => {
                    btn.classList.remove('active');
                    if (btn.dataset.category === currentCategory) {
                        btn.classList.add('active');
                    }
                });
                filterTasks();
            } else {
                console.error('Failed to add task');
            }
        } catch (error) {
            console.error('Error adding task:', error);
        }
    });

    // Initial load
    fetchTasks();
});
