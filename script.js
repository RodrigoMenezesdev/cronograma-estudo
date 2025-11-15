document.addEventListener('DOMContentLoaded', () => {
    // 1. Variáveis de Escopo e Cronômetro
    const materias = document.querySelectorAll('.materia');
    const dropzones = document.querySelectorAll('.dropzone');
    const limparBotao = document.getElementById('limpar-cronograma');
    const sairBotao = document.getElementById('btn-sair');
    let draggedMateria = null;

    // Variáveis do Cronômetro
    const timerDisplay = document.getElementById('timer-display');
    const startBtn = document.getElementById('start-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const resetBtn = document.getElementById('reset-btn');
    let timeInSeconds = 6 * 3600; // 6 horas em segundos
    let timerInterval;

    // Funções do Cronômetro
    function formatTime(seconds) {
        const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
        const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
        const s = String(seconds % 60).padStart(2, '0');
        return `${h}:${m}:${s}`;
    }

    function updateTimer() {
        if (timeInSeconds <= 0) {
            clearInterval(timerInterval);
            timerDisplay.textContent = "00:00:00";
            alert("Tempo de estudo de 6 horas concluído!");
            startBtn.disabled = true;
            pauseBtn.disabled = true;
            return;
        }
        timeInSeconds--;
        timerDisplay.textContent = formatTime(timeInSeconds);
    }

    function startTimer() {
        if (!timerInterval) {
            timerInterval = setInterval(updateTimer, 1000);
            startBtn.disabled = true;
            pauseBtn.disabled = false;
        }
    }

    function pauseTimer() {
        clearInterval(timerInterval);
        timerInterval = null;
        startBtn.disabled = false;
        pauseBtn.disabled = true;
    }

    function resetTimer() {
        pauseTimer();
        timeInSeconds = 6 * 3600; // Reseta para 6 horas
        timerDisplay.textContent = formatTime(timeInSeconds);
        startBtn.disabled = false;
    }

    // Listeners do Cronômetro
    startBtn.addEventListener('click', startTimer);
    pauseBtn.addEventListener('click', pauseTimer);
    resetBtn.addEventListener('click', resetTimer);
    timerDisplay.textContent = formatTime(timeInSeconds); // Inicializa o display

    // 2. Função principal para atualizar o total de horas do dia e o status (Mantida)
    function updateDay(dropzone) {
        const row = dropzone.closest('tr');
        if (!row) return; 
        
        const totalHorasElement = row.querySelector('.horas-total');
        const statusElement = row.querySelector('.status');
        const materiasDoDia = dropzone.querySelectorAll('.materia');
        let totalHoras = 0;

        materiasDoDia.forEach(materia => {
            totalHoras += parseFloat(materia.dataset.horas || 0);
        });

        totalHorasElement.textContent = totalHoras.toFixed(1) + 'h';

        statusElement.className = 'status'; 
        
        if (totalHoras > 6.0) {
            statusElement.classList.add('status-erro');
            statusElement.textContent = 'EXCEDEU';
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

    // 3. Função para adicionar os event listeners de clique (edição e exclusão) (Mantida)
    function addClickListeners(materiaElement) {
        if (!materiaElement.querySelector('.delete-btn')) {
             const deleteBtn = document.createElement('span');
            deleteBtn.className = 'delete-btn';
            deleteBtn.innerHTML = '&times;'; 
            
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation(); 
                const dropzoneDeOrigem = materiaElement.closest('.dropzone');
                materiaElement.remove();
                
                if (dropzoneDeOrigem) {
                    updateDay(dropzoneDeOrigem);
                }
            });
            materiaElement.appendChild(deleteBtn);
        }

        materiaElement.addEventListener('click', (e) => {
            if (e.target.closest('.dropzone') && !e.target.classList.contains('delete-btn')) {
                let currentHours = parseFloat(materiaElement.dataset.horas);
                let newHours = prompt(`Edite as horas para ${materiaElement.dataset.materia}: (Valor atual: ${currentHours.toFixed(1)}h)`, currentHours.toFixed(1));

                if (newHours !== null) {
                    newHours = parseFloat(newHours.replace(',', '.'));
                    if (!isNaN(newHours) && newHours >= 0.0) {
                        
                        const dropzone = materiaElement.closest('.dropzone');
                        let totalHorasSemEstaMateria = 0;
                        dropzone.querySelectorAll('.materia').forEach(m => {
                            if (m !== materiaElement) {
                                totalHorasSemEstaMateria += parseFloat(m.dataset.horas || 0);
                            }
                        });
                        
                        if (totalHorasSemEstaMateria + newHours > 6.0) {
                             alert("Edição não permitida! O total de horas excederia o limite diário de 6.0h.");
                             return; 
                        }

                        materiaElement.dataset.horas = newHours.toFixed(1);
                        
                        const materiaText = materiaElement.textContent.replace(/\s\(\d\.\d+h\)\s*$/, '').replace(/x$/, '');
                        materiaElement.innerHTML = `${materiaText} (${newHours.toFixed(1)}h)`;
                        addClickListeners(materiaElement); 

                        updateDay(dropzone);
                    } else {
                        alert('Valor de hora inválido. Por favor, insira um número.');
                    }
                }
            }
        });
    }


    // 4. Lógica Drag and Drop (Mantida)
    materias.forEach(materia => {
        materia.addEventListener('dragstart', (e) => {
            draggedMateria = materia.closest('.dropzone') ? materia : materia.cloneNode(true);
            e.dataTransfer.setData('text/plain', draggedMateria.dataset.materia);
            materia.classList.add('is-dragging');
        });

        materia.addEventListener('dragend', (e) => {
            e.target.classList.remove('is-dragging');
            if (e.target.closest('.dropzone')) {
                updateDay(e.target.closest('.dropzone'));
            }
        });
    });

    dropzones.forEach(dropzone => {
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault(); 
        });

        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            
            const materiasDoDia = dropzone.querySelectorAll('.materia');
            let currentTotalHours = 0;
            materiasDoDia.forEach(materia => {
                currentTotalHours += parseFloat(materia.dataset.horas || 0);
            });

            const newMateriaHours = parseFloat(draggedMateria.dataset.horas || 0);
            const potentialTotal = currentTotalHours + newMateriaHours;

            if (potentialTotal > 6.0) {
                alert("Hora Atingida! O limite diário de 6.0 horas de estudo será excedido com esta matéria. Edite uma matéria existente ou remova uma para adicionar.");
                draggedMateria = null; 
                return; 
            }
            
            const isMovingFromAnotherDropzone = draggedMateria.closest('.dropzone');
            
            dropzone.appendChild(draggedMateria);
            
            addClickListeners(draggedMateria);
            
            if (isMovingFromAnotherDropzone && isMovingFromAnotherDropzone !== dropzone) {
                 updateDay(isMovingFromAnotherDropzone);
            }

            updateDay(dropzone);
            
            draggedMateria = null; 
        });
    });
    
    // 5. Função para Limpar o Cronograma (Mantida)
    function limparCronograma() {
        if (confirm("Tem certeza que deseja limpar **todo** o cronograma semanal?")) {
            dropzones.forEach(dropzone => {
                while (dropzone.firstChild) {
                    dropzone.removeChild(dropzone.firstChild);
                }
                updateDay(dropzone);
            });
            alert("Cronograma limpo com sucesso!");
        }
    }
    
    // 6. Listener para o botão de limpar (Mantido)
    limparBotao.addEventListener('click', limparCronograma);

    // 7. Listener para o botão de SAIR (Mantido com confirmação)
    if (sairBotao) {
        sairBotao.addEventListener('click', () => {
            const confirmarSaida = confirm("Você realmente quer sair do programa? O cronograma atual não será salvo.");
            
            if (confirmarSaida) {
                window.location.href = 'about:blank';
            }
        });
    }

    // 8. Inicializa
    dropzones.forEach(dropzone => {
        dropzone.querySelectorAll('.materia').forEach(materia => {
             addClickListeners(materia);
        });
        updateDay(dropzone);
    });
});
