document.addEventListener('DOMContentLoaded', () => {
    // --- Variáveis Globais ---
    const dropzones = document.querySelectorAll('.dropzone');
    const materiasContainer = document.getElementById('materias-container');
    const limparBtn = document.getElementById('limpar-cronograma');
    const sairBtn = document.getElementById('btn-sair'); 
    
    // Estado do Cronômetro
    let timerInterval;
    let time = 0; 
    let isRunning = false;
    const timerDisplay = document.getElementById('timer-display');
    const startBtn = document.getElementById('start-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const resetBtn = document.getElementById('reset-btn');

    // Modal de Edição de Matérias
    const materiaModal = document.getElementById('materiaModal');
    const addMateriaBtn = document.getElementById('add-materia-btn');
    const closeBtn = document.querySelector('.modal-content .close-btn');
    const addMateriaForm = document.getElementById('add-materia-form');
    const materiaEditor = document.getElementById('materia-editor');

    // Modal de Seleção Rápida
    const quickSelectModal = document.getElementById('quickSelectModal');
    const closeBtnQuick = document.querySelector('.close-btn-quick');
    const quickSelectMateriasContainer = document.getElementById('quick-select-materias-container');
    const quickSelectTitle = document.getElementById('quickSelectTitle');
    let currentQuickSelectDropzone = null; 
    
    let customMaterias = []; 
    let draggedMateria = null;

    // Matérias Padrão (Fallback)
    const DEFAULT_MATERIAS = [
        { nome: "Matemática", horas: 2.0, cor: "#e74c3c" },
        { nome: "Português", horas: 2.0, cor: "#3498db" },
        { nome: "História", horas: 2.0, cor: "#2ecc71" },
        { nome: "Geografia", horas: 2.0, cor: "#f39c12" },
        { nome: "Física", horas: 2.0, cor: "#9b59b6" },
        { nome: "Química", horas: 2.0, cor: "#1abc9c" },
        { nome: "Biologia", horas: 2.0, cor: "#f1c40f" },
        { nome: "Redação", horas: 1.0, cor: "#7f8c8d" },
        { nome: "LAZER (Dia Livre)", horas: 4.0, cor: "#8e44ad" },
    ];


    // --- FUNÇÕES DE PERSISTÊNCIA E MATÉRIAS CUSTOMIZADAS ---

    function saveCustomMaterias() {
        localStorage.setItem('customMaterias', JSON.stringify(customMaterias));
        renderMateriasSidebar();
        renderMateriaEditor();
    }

    function loadCustomMaterias() {
        const savedMaterias = localStorage.getItem('customMaterias');
        if (savedMaterias) {
            customMaterias = JSON.parse(savedMaterias);
        } else {
            customMaterias = DEFAULT_MATERIAS;
            saveCustomMaterias();
        }
        renderMateriasSidebar();
    }

    function saveSchedule() {
        const scheduleData = {};
        dropzones.forEach(dropzone => {
            const row = dropzone.closest('tr');
            if (!row) return; 
            
            const dayKey = row.dataset.dia;
            scheduleData[dayKey] = [];
            
            dropzone.querySelectorAll('.materia-agendada').forEach(materiaElement => {
                scheduleData[dayKey].push({
                    materia: materiaElement.dataset.materia,
                    horas: materiaElement.dataset.horas,
                    cor: materiaElement.dataset.cor 
                });
            });
        });
        localStorage.setItem('studySchedule', JSON.stringify(scheduleData));
        updateAllDays(); 
    }

    function loadSchedule() {
        const savedSchedule = localStorage.getItem('studySchedule');
        if (!savedSchedule) return;

        const scheduleData = JSON.parse(savedSchedule);

        dropzones.forEach(dropzone => {
            const row = dropzone.closest('tr');
            if (!row) return;

            const dayKey = row.dataset.dia;
            const daySchedule = scheduleData[dayKey];

            dropzone.querySelectorAll('.materia-agendada').forEach(el => {
                if (!el.classList.contains('add-materia-btn-dia')) {
                    el.remove();
                }
            });

            if (daySchedule && daySchedule.length > 0) {
                daySchedule.forEach(materiaData => {
                    const newMateria = createMateriaElement(materiaData.materia, parseFloat(materiaData.horas), materiaData.cor, true);
                    dropzone.appendChild(newMateria);
                });
            }
        });
        addClickListeners();
        updateAllDays();
    }


    // --- FUNÇÕES DE LÓGICA DO CRONOGRAMA ---

    function createMateriaElement(nome, horas, cor, isAgendada = false) {
        const element = document.createElement('div');
        element.textContent = `${nome} (${hoursToTime(horas)})`; 
        element.style.backgroundColor = cor;
        element.dataset.materia = nome;
        element.dataset.horas = horas.toFixed(1);
        element.dataset.cor = cor;

        if (isAgendada) {
            element.classList.add('materia-agendada');
            element.draggable = true; 
            element.addEventListener('dragstart', handleDragStart);
            element.addEventListener('dragend', handleDragEnd);

            const deleteBtn = document.createElement('span');
            deleteBtn.classList.add('delete-btn');
            deleteBtn.textContent = 'x';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation(); 
                const dropzoneDeOrigem = element.closest('.dropzone');
                element.remove();
                if (dropzoneDeOrigem) updateDay(dropzoneDeOrigem);
                saveSchedule(); 
            });
            element.appendChild(deleteBtn);

        } else {
            element.classList.add('materia');
            element.draggable = true;
            element.addEventListener('dragstart', handleDragStart);
        }
        
        return element;
    }

    function renderMateriasSidebar() {
        materiasContainer.innerHTML = '';
        customMaterias.forEach(m => {
            const element = createMateriaElement(m.nome, m.horas, m.cor, false);
            materiasContainer.appendChild(element);
        });
    }

    function hoursToTime(hours) {
        const totalMinutes = Math.round(hours * 60);
        const h = Math.floor(totalMinutes / 3600);
        const m = totalMinutes % 60;
        
        if (m === 0) return `${h}.0h`; 
        return `${h}h ${m}m`; 
    }


    function updateDay(dropzone) {
        const row = dropzone.closest('tr');
        if (!row) return; 
        
        const totalHorasElement = row.querySelector('.horas-total');
        const statusElement = row.querySelector('.status');
        const materiasDoDia = dropzone.querySelectorAll('.materia-agendada');
        let totalHoras = 0;

        materiasDoDia.forEach(materia => {
            totalHoras += parseFloat(materia.dataset.horas || 0);
        });

        totalHorasElement.textContent = totalHoras.toFixed(1) + 'h';

        statusElement.className = 'status'; 
        
        if (totalHoras > 6.0) {
            statusElement.classList.add('status-erro');
            statusElement.textContent = `EXCEDEU (${totalHoras.toFixed(1)}h)`;
        } else if (totalHoras >= 2.0 && totalHoras <= 6.0) {
            statusElement.classList.add('status-ok');
            statusElement.textContent = `${totalHoras.toFixed(1)}h de estudo`;
        } else if (totalHoras > 0.0 && totalHoras < 2.0) {
            statusElement.classList.add('status-alerta');
            statusElement.textContent = `${totalHoras.toFixed(1)}h (POUCO)`;
        } else {
            statusElement.textContent = '';
        }
    }

    function updateAllDays() {
        dropzones.forEach(updateDay);
    }

    function addClickListeners() {
        document.querySelectorAll('.materia-agendada').forEach(materia => {
            materia.removeEventListener('click', handleMateriaClick); 
            materia.addEventListener('click', handleMateriaClick);
        });
    }

    function handleMateriaClick(e) {
        if (e.target.classList.contains('delete-btn')) return; 

        const materiaElement = e.currentTarget;
        const currentHours = parseFloat(materiaElement.dataset.horas);
        const dropzone = materiaElement.closest('.dropzone');

        let newHoursPrompt = prompt(`Edite as horas para ${materiaElement.dataset.materia}: (Valor atual: ${currentHours.toFixed(1)}h)\n\nDigite 0 para remover a matéria.`, currentHours.toFixed(1));

        if (newHoursPrompt !== null) {
            let newHours = parseFloat(newHoursPrompt.replace(',', '.'));
            
            if (isNaN(newHours) || newHours < 0) {
                alert('Valor de hora inválido. Por favor, insira um número não negativo.');
                return;
            }

            if (newHours === 0) {
                materiaElement.remove();
            } else {
                let totalHorasSemEstaMateria = 0;
                dropzone.querySelectorAll('.materia-agendada').forEach(m => {
                    if (m !== materiaElement) {
                        totalHorasSemEstaMateria += parseFloat(m.dataset.horas || 0);
                    }
                });
                
                if (totalHorasSemEstaMateria + newHours > 6.0) {
                     alert("Edição não permitida! O total de horas excederia o limite diário de 6.0h.");
                     return; 
                }
                
                materiaElement.dataset.horas = newHours.toFixed(1);
                materiaElement.firstChild.textContent = `${materiaElement.dataset.materia} (${hoursToTime(newHours)})`; 
            }

            updateDay(dropzone);
            saveSchedule();
        }
    }


    // --- LÓGICA DRAG AND DROP ---

    function handleDragStart(e) {
        if (e.target.classList.contains('materia')) {
            const { materia, horas, cor } = e.target.dataset;
            draggedMateria = createMateriaElement(materia, parseFloat(horas), cor, true);
        } else if (e.target.classList.contains('materia-agendada')) {
            draggedMateria = e.target;
            draggedMateria.classList.add('is-dragging');
        }
        e.dataTransfer.effectAllowed = 'copyMove';
    }
    
    function handleDragEnd(e) {
        if (draggedMateria) draggedMateria.classList.remove('is-dragging');
        draggedMateria = null;
        updateAllDays(); 
        saveSchedule(); 
    }

    dropzones.forEach(dropzone => {
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault(); 
        });

        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            
            const originDropzone = draggedMateria ? draggedMateria.closest('.dropzone') : null;
            const dropzoneDestino = e.currentTarget;
            
            if (!draggedMateria) return; 

            const newMateriaHours = parseFloat(draggedMateria.dataset.horas || 0);
            
            const materiasDoDia = dropzoneDestino.querySelectorAll('.materia-agendada'); 
            let currentTotalHours = 0;
            materiasDoDia.forEach(materia => {
                if (materia !== draggedMateria) { 
                    currentTotalHours += parseFloat(materia.dataset.horas || 0);
                }
            });

            const potentialTotal = currentTotalHours + newMateriaHours;
            
            if (potentialTotal > 6.0 && originDropzone !== dropzoneDestino) {
                alert("Hora Atingida! O limite diário de 6.0 horas de estudo será excedido com esta matéria. Edite uma matéria existente ou remova uma para adicionar.");
                return; 
            }
            
            if (originDropzone && originDropzone !== dropzoneDestino) {
                 if (!draggedMateria.closest('.materia-list')) {
                     draggedMateria.remove();
                     updateDay(originDropzone); 
                 }
            }
            
            dropzoneDestino.appendChild(draggedMateria);
            addClickListeners();
            updateDay(dropzoneDestino);
            saveSchedule();
            draggedMateria = null; 
        });
    });

    // --- LÓGICA DE SELEÇÃO RÁPIDA (Botão +) ---

    // 1. Abre o modal e carrega as matérias
    document.querySelectorAll('.add-materia-btn-dia').forEach(button => {
        button.addEventListener('click', (e) => {
            const row = e.target.closest('tr');
            currentQuickSelectDropzone = row.querySelector('.dropzone');
            
            quickSelectTitle.textContent = `Adicionar Matéria para ${row.querySelector('td:first-child').textContent}`;
            renderQuickSelectMaterias();
            quickSelectModal.style.display = 'block';
        });
    });

    // 2. Renderiza as matérias dentro do novo modal
    function renderQuickSelectMaterias() {
        if (!quickSelectMateriasContainer) {
            console.error("Elemento 'quick-select-materias-container' não encontrado.");
            return;
        }

        quickSelectMateriasContainer.innerHTML = ''; 

        if (customMaterias.length === 0) {
             quickSelectMateriasContainer.innerHTML = '<p style="text-align:center; color:#e74c3c;">Nenhuma matéria cadastrada. Por favor, adicione matérias primeiro através do botão "Adicionar / Editar Matérias".</p>';
             return;
        }
        
        customMaterias.forEach(materia => {
            const item = document.createElement('div');
            item.classList.add('quick-materia-item');
            item.textContent = `${materia.nome} (${hoursToTime(materia.horas)})`;
            item.style.backgroundColor = materia.cor;
            item.dataset.nome = materia.nome;
            item.dataset.horas = materia.horas.toFixed(1);
            item.dataset.cor = materia.cor;
            
            item.addEventListener('click', handleQuickSelectAdd);
            quickSelectMateriasContainer.appendChild(item);
        });
    }

    // 3. Adiciona a matéria ao dia
    function handleQuickSelectAdd(e) {
        if (!currentQuickSelectDropzone) return;

        const nome = e.target.dataset.nome;
        const horas = parseFloat(e.target.dataset.horas);
        const cor = e.target.dataset.cor;

        const materiasDoDia = currentQuickSelectDropzone.querySelectorAll('.materia-agendada');
        let currentTotalHours = 0;
        materiasDoDia.forEach(m => currentTotalHours += parseFloat(m.dataset.horas || 0));

        const potentialTotal = currentTotalHours + horas;

        if (potentialTotal > 6.0) {
            alert(`Limite de 6.0 horas excedido. Total potencial: ${potentialTotal.toFixed(1)}h. Edite uma matéria existente ou remova uma antes de adicionar.`);
            return;
        }

        const newMateriaElement = createMateriaElement(nome, horas, cor, true);
        currentQuickSelectDropzone.appendChild(newMateriaElement);

        addClickListeners();
        updateDay(currentQuickSelectDropzone);
        saveSchedule();
        
        closeQuickSelectModal();
    }

    // 4. Fechamento do Modal Rápido
    function closeQuickSelectModal() {
        quickSelectModal.style.display = 'none';
        currentQuickSelectDropzone = null;
    }
    
    // Listeners do Modal Rápido
    closeBtnQuick.addEventListener('click', closeQuickSelectModal);
    quickSelectModal.addEventListener('click', (e) => {
        if (e.target === quickSelectModal) {
            closeQuickSelectModal();
        }
    });

    // --- FUNÇÕES DO MODAL DE EDIÇÃO ---

    function openModal() {
        materiaModal.style.display = 'block';
        renderMateriaEditor();
    }

    function closeModal() {
        materiaModal.style.display = 'none';
    }

    addMateriaForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const nome = document.getElementById('materia-nome').value.trim();
        const horas = parseFloat(document.getElementById('materia-horas').value);
        const cor = document.getElementById('materia-cor').value;

        if (nome && !isNaN(horas) && horas >= 0.5 && cor) {
            const exists = customMaterias.some(m => m.nome.toLowerCase() === nome.toLowerCase());
            if (exists) {
                alert(`A matéria "${nome}" já existe. Exclua a antiga se quiser mudar os dados.`);
                return;
            }

            customMaterias.push({ nome, horas, cor });
            saveCustomMaterias();
            
            addMateriaForm.reset();
            alert(`Matéria "${nome}" adicionada com sucesso!`);
            renderMateriaEditor(); 
        } else {
            alert('Por favor, preencha todos os campos corretamente (horas mínimas de 0.5h).');
        }
    });

    function renderMateriaEditor() {
        materiaEditor.innerHTML = '';
        customMaterias.forEach(m => {
            const item = document.createElement('div');
            item.classList.add('edit-list-item');
            item.style.borderLeft = `5px solid ${m.cor}`;
            item.innerHTML = `
                <span>${m.nome} (${hoursToTime(m.horas)})</span>
                <button data-materia="${m.nome}">Excluir</button>
            `;
            
            item.querySelector('button').addEventListener('click', deleteCustomMateria);
            materiaEditor.appendChild(item);
        });
    }

    function deleteCustomMateria(e) {
        const nomeToDelete = e.target.dataset.materia;
        if (!confirm(`Tem certeza de que deseja excluir a matéria "${nomeToDelete}"? Isso a removerá de todos os agendamentos.`)) return;

        customMaterias = customMaterias.filter(m => m.nome !== nomeToDelete);
        saveCustomMaterias();

        dropzones.forEach(dropzone => {
            dropzone.querySelectorAll('.materia-agendada').forEach(materiaElement => {
                if (materiaElement.dataset.materia === nomeToDelete) {
                    materiaElement.remove();
                }
            });
        });

        saveSchedule(); 
        renderMateriaEditor();
    }


    // --- FUNÇÕES DO CRONÔMETRO ---
    function formatTime(totalSeconds) {
        const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
        const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
        const s = String(totalSeconds % 60).padStart(2, '0');
        return `${h}:${m}:${s}`;
    }

    function updateTimer() {
        time++;
        timerDisplay.textContent = formatTime(time);
    }

    function startTimer() {
        if (!isRunning) {
            isRunning = true;
            startBtn.disabled = true;
            pauseBtn.disabled = false;
            timerInterval = setInterval(updateTimer, 1000);
        }
    }

    function pauseTimer() {
        if (isRunning) {
            isRunning = false;
            startBtn.disabled = false;
            pauseBtn.disabled = true;
            clearInterval(timerInterval);
        }
    }

    function resetTimer() {
        pauseTimer();
        time = 0;
        timerDisplay.textContent = formatTime(time);
    }

    // --- FUNÇÕES DE CONTROLE GERAL ---
    
    function clearSchedule() {
        if (!confirm("Tem certeza que deseja limpar **todo** o cronograma semanal? Esta ação não pode ser desfeita.")) {
            return;
        }
        dropzones.forEach(dropzone => {
             dropzone.querySelectorAll('.materia-agendada').forEach(el => el.remove());
        });
        localStorage.removeItem('studySchedule');
        updateAllDays(); 
        alert("Cronograma limpo com sucesso!");
    }


    // --- INICIALIZAÇÃO ---
    
    // Listeners do Cronômetro
    startBtn.addEventListener('click', startTimer);
    pauseBtn.addEventListener('click', pauseTimer);
    resetBtn.addEventListener('click', resetTimer);

    // Listeners da Aplicação
    limparBtn.addEventListener('click', clearSchedule);
    
    // ** CORREÇÃO FINAL: Apenas salva e informa o usuário sobre o fechamento manual **
    if (sairBtn) {
        sairBtn.addEventListener('click', () => {
            saveSchedule(); 
            // Mensagem clara pedindo para fechar manualmente
            alert('Cronograma salvo com sucesso! Por favor, feche a janela ou aba manualmente.'); 
        });
    } else {
        console.error("Erro: O botão 'Salvar e Sair' com ID 'btn-sair' não foi encontrado na inicialização.");
    }

    // Listeners do Modal de Edição
    addMateriaBtn.addEventListener('click', openModal);
    closeBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        if (e.target === materiaModal) {
            closeModal();
        }
    });
    
    // Inicialização da Aplicação
    loadCustomMaterias();
    loadSchedule(); 
});
