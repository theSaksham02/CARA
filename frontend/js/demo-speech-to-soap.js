document.addEventListener('DOMContentLoaded', () => {
    const micButton = document.querySelector('button[title="Voice Add Prescription"]');
    const fabMicButton = document.querySelector('.fixed.bottom-10.right-10'); // The FAB mic
    const planSection = document.querySelector('.p-8.rounded-xl.bg-surface-container-lowest:nth-of-type(4) .space-y-4') || document.querySelector('.space-y-4');

    // Speech Recognition Setup
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        console.warn("Speech Recognition API is not supported in this browser.");
        if (micButton) micButton.style.display = 'none';
        if (fabMicButton) fabMicButton.style.display = 'none';
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    let isRecording = false;

    function toggleRecording(btn) {
        if (isRecording) {
            recognition.stop();
            btn.classList.remove('animate-pulse', 'bg-error-container');
            isRecording = false;
        } else {
            recognition.start();
            btn.classList.add('animate-pulse', 'bg-error-container');
            isRecording = true;
        }
    }

    if (micButton) {
        micButton.addEventListener('click', (e) => {
            e.preventDefault();
            toggleRecording(micButton);
        });
    }

    if (fabMicButton) {
        fabMicButton.addEventListener('click', (e) => {
            e.preventDefault();
            toggleRecording(fabMicButton);
        });
    }

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        
        // Ensure planSection exists
        if (planSection) {
            // Create a new note block
            const noteDiv = document.createElement('div');
            noteDiv.className = 'flex items-center gap-3 p-3 bg-surface-container-high rounded-lg mt-2 border-l-4 border-primary';
            noteDiv.innerHTML = `
                <span class="material-symbols-outlined text-primary">mic</span>
                <span class="text-sm font-medium"><strong>Voice Note:</strong> ${transcript}</span>
            `;
            planSection.appendChild(noteDiv);
        } else {
            alert("Voice Note Captured: " + transcript);
        }
    };

    recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        if (micButton) micButton.classList.remove('animate-pulse', 'bg-error-container');
        if (fabMicButton) fabMicButton.classList.remove('animate-pulse', 'bg-error-container');
        isRecording = false;
    };

    recognition.onend = () => {
        if (micButton) micButton.classList.remove('animate-pulse', 'bg-error-container');
        if (fabMicButton) fabMicButton.classList.remove('animate-pulse', 'bg-error-container');
        isRecording = false;
    };
});
