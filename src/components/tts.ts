async function fetchTTS(text: string, voiceId: string): Promise<string> {
    const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            text: text,
            voiceId: voiceId,
        }),
    });

    const data = await response.json();
    if (!response.ok || !data.url) {
        throw new Error('Failed to fetch TTS audio');
    }

    return data.url;
}

export async function playTextToSpeech(text: string, voiceId: string) {
    try {
        const audioUrl = await fetchTTS(text, voiceId);
        const audio = new Audio(audioUrl);
        audio.play();
    } catch (error) {
        console.error('Error playing TTS:', error);
    }
}
