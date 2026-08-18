document.addEventListener('DOMContentLoaded', () => {
    let timeLeft = 5; // default 5 seconds
    let timerId = null;
    let isRunning = false;
    let audioContext = null;
    let isRinging = false;

    const timeDisplay = document.getElementById('timeDisplay');
    const startBtn = document.getElementById('startBtn');
    const decreaseBtn = document.getElementById('decreaseBtn');
    const increaseBtn = document.getElementById('increaseBtn');
    const statusMsg = document.getElementById('statusMsg');
    const glassPanel = document.querySelector('.glass-panel');

    function updateDisplay() {
        const minutes = Math.floor(timeLeft / 60).toString().padStart(2, '0');
        const seconds = (timeLeft % 60).toString().padStart(2, '0');
        timeDisplay.textContent = `${minutes}:${seconds}`;
    }

    // Audio Synthesis for reliable sound without needing mp3 files
    function playAlarmSound() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        const playBeep = () => {
            if (!isRinging) return;
            
            const osc = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, audioContext.currentTime); // A5
            osc.frequency.exponentialRampToValueAtTime(1760, audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(1, audioContext.currentTime + 0.05);
            gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.5);
            
            osc.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            osc.start(audioContext.currentTime);
            osc.stop(audioContext.currentTime + 0.5);
            
            setTimeout(playBeep, 1000);
        };
        
        isRinging = true;
        playBeep();
    }

    function stopAlarmSound() {
        isRinging = false;
    }

    function ringAlarm() {
        glassPanel.classList.add('ringing');
        startBtn.textContent = 'Stop Alarm';
        startBtn.classList.add('stop');
        statusMsg.textContent = '⏰ Time is up!';
        statusMsg.style.color = '#ff453a';
        playAlarmSound();
    }

    function stopAlarm() {
        clearInterval(timerId);
        timerId = null;
        isRunning = false;
        isRinging = false;
        
        glassPanel.classList.remove('ringing');
        startBtn.textContent = 'Start Alarm';
        startBtn.classList.remove('stop');
        statusMsg.textContent = 'Ready to start';
        statusMsg.style.color = '#9ca3af';
        
        stopAlarmSound();
        
        if (timeLeft === 0) {
            timeLeft = 5; // Reset to default if stopped after ringing
            updateDisplay();
        }
    }

    startBtn.addEventListener('click', () => {
        // Initialize AudioContext on first user interaction to comply with iOS policies
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        if (isRinging) {
            stopAlarm();
            return;
        }

        if (isRunning) {
            stopAlarm();
            return;
        }

        if (timeLeft <= 0) return;

        isRunning = true;
        startBtn.textContent = 'Cancel';
        statusMsg.textContent = 'Alarm is set...';
        
        timerId = setInterval(() => {
            timeLeft--;
            updateDisplay();
            
            if (timeLeft <= 0) {
                clearInterval(timerId);
                ringAlarm();
            }
        }, 1000);
    });

    decreaseBtn.addEventListener('click', () => {
        if (isRunning || isRinging) return;
        if (timeLeft > 5) {
            timeLeft -= 5;
            updateDisplay();
        }
    });

    increaseBtn.addEventListener('click', () => {
        if (isRunning || isRinging) return;
        timeLeft += 5;
        updateDisplay();
    });

    updateDisplay();
});
