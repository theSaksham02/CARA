document.addEventListener('DOMContentLoaded', () => {
    // Find all buttons containing the volume_up icon
    const ttsButtons = Array.from(document.querySelectorAll('button')).filter(btn => 
        btn.innerHTML.includes('volume_up')
    );

    let isSpeaking = false;
    let utterance = null;

    ttsButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (isSpeaking) {
                window.speechSynthesis.cancel();
                isSpeaking = false;
                return;
            }

            // Try to find the closest logical container to read its text
            let container = btn.closest('section') || btn.closest('.bg-surface-container-high') || btn.closest('.bg-surface-container-lowest') || btn.closest('div');
            
            if (container) {
                // Get text, clean it up
                let textToRead = container.innerText;
                // Remove button text itself (like 'volume_up' if it's text)
                textToRead = textToRead.replace(/volume_up/g, '').trim();

                if (textToRead) {
                    utterance = new SpeechSynthesisUtterance(textToRead);
                    
                    // Check if current language is Arabic or Hindi
                    const langSelect = document.querySelector('select');
                    if (langSelect && langSelect.value === 'ar') {
                        utterance.lang = 'ar-SA';
                    } else if (langSelect && langSelect.value === 'hi') {
                        utterance.lang = 'hi-IN';
                    } else {
                        utterance.lang = 'en-US';
                    }

                    utterance.onend = () => {
                        isSpeaking = false;
                    };
                    
                    window.speechSynthesis.speak(utterance);
                    isSpeaking = true;
                }
            }
        });
    });
});
